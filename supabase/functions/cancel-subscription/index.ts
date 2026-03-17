import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CANCEL-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function decodeJwtPayload(token: string): { sub: string; email: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const payload = JSON.parse(atob(padded));
  return {
    sub: payload.sub || "",
    email: payload.email || payload.user_metadata?.email || "",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Cancel subscription called");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { sub: userId } = decodeJwtPayload(token);
    logStep("User identified", { userId });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const creemKey = Deno.env.get("CREEM_API_KEY");

    if (!creemKey) throw new Error("CREEM_API_KEY is not configured");

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get the user's subscription
    const { data: sub, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) throw new Error(`Failed to fetch subscription: ${subError.message}`);
    if (!sub) throw new Error("No subscription found");
    if (sub.status !== "active" && sub.status !== "canceled") {
      throw new Error("No active subscription to cancel");
    }

    const subscriptionId = sub.stripe_subscription_id;
    if (!subscriptionId) throw new Error("No subscription ID stored — cannot cancel via API");

    logStep("Cancelling subscription with Creem", { subscriptionId });

    // Call Creem API to cancel at end of period
    const creemResponse = await fetch(`https://api.creem.io/v1/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": creemKey,
      },
      body: JSON.stringify({
        mode: "scheduled",
      }),
    });

    const creemData = await creemResponse.json().catch(() => ({}));
    logStep("Creem cancel response", { status: creemResponse.status, data: creemData });

    if (!creemResponse.ok && creemResponse.status !== 409) {
      // 409 might mean already canceled
      throw new Error(creemData?.message || creemData?.error || `Creem API error: ${creemResponse.status}`);
    }

    // Update subscription in database — mark as canceled but keep premium until period end
    const { error: updateError } = await supabaseClient
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      logStep("DB update error", { message: updateError.message });
    }

    logStep("Subscription canceled successfully", { userId, periodEnd: sub.current_period_end });

    return new Response(JSON.stringify({
      success: true,
      currentPeriodEnd: sub.current_period_end,
      message: "Subscription cancelled. You'll keep Premium access until the end of your billing period.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = (error as Error).message;
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
