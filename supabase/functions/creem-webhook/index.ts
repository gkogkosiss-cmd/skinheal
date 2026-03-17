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

    const eventType = body.event_type || body.type || body.event;
    const subscription = body.object || body.data || body;
    const metadata = subscription?.metadata || {};
    const userId = metadata.user_id;
    const customerEmail = subscription?.customer_email || subscription?.customer?.email || body.customer_email;

    logStep("Event parsed", { eventType, userId, customerEmail });

    if (!userId && !customerEmail) {
      logStep("No user identifier found, skipping");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Connect to the custom Supabase project where data lives
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Determine the target user_id
    let targetUserId = userId;

    // If we only have email, try to find user by email in profiles
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

    const activateEvents = ["subscription.created", "subscription.active", "subscription.renewed", "checkout.completed"];
    const deactivateEvents = ["subscription.cancelled", "subscription.expired", "subscription.canceled"];

    if (activateEvents.includes(eventType)) {
      logStep("Activating premium for user", { targetUserId });

      const periodEnd = subscription?.current_period_end || subscription?.period_end;
      const periodStart = subscription?.current_period_start || subscription?.period_start;
      const creemSubId = subscription?.id || subscription?.subscription_id;

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
    } else if (deactivateEvents.includes(eventType)) {
      logStep("Deactivating premium for user", { targetUserId });

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
