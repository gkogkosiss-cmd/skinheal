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
    logStep("Headers", Object.fromEntries(req.headers.entries()));

    const body = await req.json();
    logStep("Full webhook payload", body);

    // Creem sends eventType at the top level
    const eventType = body.eventType || body.event_type || body.type || body.event;
    const obj = body.object || body.data || body;

    logStep("Event type detected", { eventType });

    // Extract subscription data depending on event type
    let subscriptionData: any;
    let metadata: any;
    let customerEmail: string | undefined;
    let userId: string | undefined;

    if (eventType === "checkout.completed") {
      // checkout.completed: subscription is nested inside obj
      subscriptionData = obj.subscription || obj;
      metadata = obj.metadata || subscriptionData?.metadata || {};
      customerEmail = obj.customer?.email;
      userId = metadata.user_id;
    } else {
      // All subscription.* events: obj IS the subscription
      subscriptionData = obj;
      metadata = obj.metadata || {};
      customerEmail = obj.customer?.email;
      userId = metadata.user_id;
    }

    logStep("Extracted identifiers", { eventType, userId, customerEmail });

    if (!userId && !customerEmail) {
      logStep("No user identifier found in payload, skipping");
      return new Response(JSON.stringify({ received: true, skipped: true, reason: "no_user_identifier" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Connect to the Supabase project where user data lives
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    logStep("Connecting to Supabase", { url: supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "NOT SET" });
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Determine the target user_id
    let targetUserId = userId;

    if (!targetUserId && customerEmail) {
      const { data: profile, error: lookupError } = await supabaseClient
        .from("profiles")
        .select("user_id")
        .eq("email", customerEmail)
        .maybeSingle();
      
      if (lookupError) {
        logStep("Error looking up user by email", { error: lookupError.message });
      }
      
      targetUserId = profile?.user_id;
      logStep("Looked up user by email", { customerEmail, targetUserId, found: !!profile });
    }

    if (!targetUserId) {
      logStep("Could not determine user after all lookups, skipping");
      return new Response(JSON.stringify({ received: true, skipped: true, reason: "user_not_found" }), {
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
    const subscriptionStatus = subscriptionData?.status;

    logStep("Subscription details", { creemSubId, periodStart, periodEnd, planType, subscriptionStatus });

    // Events that activate premium
    const activateEvents = [
      "checkout.completed",
      "subscription.active",
      "subscription.paid",
      "subscription.renewed",
      "subscription.created",
    ];

    // subscription.update: activate if the subscription status is active
    const isUpdateWithActiveStatus = eventType === "subscription.update" && subscriptionStatus === "active";

    // Events that keep premium but mark as canceling (access until period end)
    const cancelingEvents = ["subscription.canceled", "subscription.cancelled"];

    // Events that immediately revoke premium
    const revokeEvents = [
      "subscription.expired",
      "subscription.unpaid",
      "subscription.past_due",
      "subscription.paused",
    ];

    if (activateEvents.includes(eventType) || isUpdateWithActiveStatus) {
      logStep("ACTIVATING premium for user", { targetUserId, eventType });

      const upsertData = {
        user_id: targetUserId,
        status: "active",
        plan: "premium",
        stripe_subscription_id: creemSubId || null,
        stripe_customer_id: customerEmail || null,
        current_period_start: periodStart || new Date().toISOString(),
        current_period_end: periodEnd || null,
        updated_at: new Date().toISOString(),
      };
      
      logStep("Upserting subscription data", upsertData);

      const { data: upsertResult, error: upsertError } = await supabaseClient
        .from("subscriptions")
        .upsert(upsertData, { onConflict: "user_id" })
        .select();

      if (upsertError) {
        logStep("UPSERT ERROR", { message: upsertError.message, details: upsertError.details, hint: upsertError.hint, code: upsertError.code });
      } else {
        logStep("Subscription activated successfully", { result: upsertResult });
      }

    } else if (cancelingEvents.includes(eventType)) {
      logStep("Subscription CANCELED, keeping access until period end", { targetUserId, periodEnd });

      const { error: upsertError } = await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: targetUserId,
          status: "canceled",
          plan: "premium",
          stripe_subscription_id: creemSubId || null,
          current_period_end: periodEnd || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertError) {
        logStep("UPSERT ERROR on cancel", { message: upsertError.message });
      } else {
        logStep("Subscription marked as canceled");
      }

    } else if (revokeEvents.includes(eventType)) {
      logStep("REVOKING premium for user", { targetUserId, eventType });

      const { error: upsertError } = await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: targetUserId,
          status: "inactive",
          plan: "free",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertError) {
        logStep("UPSERT ERROR on revoke", { message: upsertError.message });
      } else {
        logStep("Subscription deactivated successfully");
      }

    } else {
      logStep("Unhandled event type, ignoring", { eventType });
    }

    // Verify: read back the subscription to confirm it was written
    const { data: verifyData, error: verifyError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();
    
    logStep("Verification read-back", { data: verifyData, error: verifyError?.message });

    return new Response(JSON.stringify({ received: true, processed: eventType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    logStep("FATAL ERROR", { message: errorMessage, stack: (error as Error).stack });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
