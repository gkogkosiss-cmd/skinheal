import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREEM-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const body = await req.json();
    logStep("Webhook payload", body);

    // Creem sends eventType at the top level
    const eventType = body.eventType || body.event_type || body.type || body.event;
    const obj = body.object || body.data || body;

    // Extract metadata & customer depending on event type
    // For checkout.completed: subscription info is nested in obj.subscription
    // For subscription.* events: obj IS the subscription
    let subscriptionData: any;
    let metadata: any;
    let customerEmail: string | undefined;
    let userId: string | undefined;

    if (eventType === "checkout.completed") {
      // checkout.completed has obj.subscription and obj.customer at top level
      subscriptionData = obj.subscription || {};
      metadata = obj.metadata || subscriptionData.metadata || {};
      customerEmail = obj.customer?.email;
      userId = metadata.user_id;
    } else {
      // subscription.* events: obj is the subscription itself
      subscriptionData = obj;
      metadata = obj.metadata || {};
      customerEmail = obj.customer?.email;
      userId = metadata.user_id;
    }

    logStep("Event parsed", { eventType, userId, customerEmail });

    if (!userId && !customerEmail) {
      logStep("No user identifier found, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Connect to the Supabase project where user data lives
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Determine the target user_id
    let targetUserId = userId;

    if (!targetUserId && customerEmail) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("user_id")
        .eq("email", customerEmail)
        .maybeSingle();
      targetUserId = profile?.user_id;
      logStep("Looked up user by email", { customerEmail, targetUserId });
    }

    if (!targetUserId) {
      logStep("Could not determine user, skipping");
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Extract period dates from Creem payload (they use _date suffix)
    const periodEnd = subscriptionData?.current_period_end_date
      || subscriptionData?.current_period_end
      || subscriptionData?.period_end;
    const periodStart = subscriptionData?.current_period_start_date
      || subscriptionData?.current_period_start
      || subscriptionData?.period_start;
    const creemSubId = subscriptionData?.id || subscriptionData?.subscription_id;
    const planType = metadata?.plan || "monthly";

    logStep("Subscription details", { creemSubId, periodStart, periodEnd, planType });

    // Events that activate premium
    const activateEvents = [
      "checkout.completed",
      "subscription.active",
      "subscription.paid",
      "subscription.renewed",
      "subscription.created",
    ];

    // Events that keep premium but mark as canceling (access until period end)
    const cancelingEvents = ["subscription.canceled", "subscription.cancelled"];

    // Events that immediately revoke premium
    const revokeEvents = [
      "subscription.expired",
      "subscription.unpaid",
      "subscription.past_due",
      "subscription.paused",
    ];

    if (activateEvents.includes(eventType)) {
      logStep("Activating premium for user", { targetUserId });

      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: targetUserId,
          status: "active",
          plan: "premium",
          stripe_subscription_id: creemSubId || null,
          stripe_customer_id: customerEmail || null,
          current_period_start: periodStart || new Date().toISOString(),
          current_period_end: periodEnd || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      logStep("Subscription activated successfully");

    } else if (cancelingEvents.includes(eventType)) {
      // User canceled but still has access until period end
      logStep("Subscription canceled, keeping access until period end", { targetUserId, periodEnd });

      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: targetUserId,
          status: "canceled",
          plan: "premium",
          stripe_subscription_id: creemSubId || null,
          current_period_end: periodEnd || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      logStep("Subscription marked as canceled (access continues until period end)");

    } else if (revokeEvents.includes(eventType)) {
      logStep("Revoking premium for user", { targetUserId });

      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: targetUserId,
          status: "inactive",
          plan: "free",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      logStep("Subscription deactivated successfully");

    } else {
      logStep("Unhandled event type, ignoring", { eventType });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
