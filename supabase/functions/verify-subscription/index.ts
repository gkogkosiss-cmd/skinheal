import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[VERIFY-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
    logStep("Verify subscription called");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { sub: userId, email } = decodeJwtPayload(token);
    logStep("User identified", { userId, email });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check current subscription status
    const { data: sub, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    logStep("Current subscription", { sub, error: subError?.message });

    if (sub && sub.status === "active" && sub.plan === "premium") {
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
      const isValid = periodEnd ? periodEnd > new Date() : true;

      return new Response(JSON.stringify({
        isPremium: isValid,
        status: sub.status,
        plan: sub.plan,
        currentPeriodEnd: sub.current_period_end,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no active subscription found, try to check with Creem API as fallback
    const creemKey = Deno.env.get("CREEM_API_KEY");
    if (creemKey && sub?.stripe_subscription_id) {
      logStep("Checking Creem API for subscription status", { subId: sub.stripe_subscription_id });
      
      try {
        const creemResponse = await fetch(`https://api.creem.io/v1/subscriptions/${sub.stripe_subscription_id}`, {
          headers: { "x-api-key": creemKey },
        });
        const creemData = await creemResponse.json();
        logStep("Creem API response", { status: creemResponse.status, data: creemData });

        if (creemData.status === "active") {
          const periodEnd = creemData.current_period_end_date || creemData.current_period_end;
          
          // Update local DB
          await supabaseClient
            .from("subscriptions")
            .upsert({
              user_id: userId,
              status: "active",
              plan: "premium",
              current_period_end: periodEnd || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

          logStep("Subscription re-activated from Creem API");

          return new Response(JSON.stringify({
            isPremium: true,
            status: "active",
            plan: "premium",
            currentPeriodEnd: periodEnd,
            source: "creem_api_fallback",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (creemErr: any) {
        logStep("Creem API check failed", { error: creemErr?.message });
      }
    }

    // No active subscription
    return new Response(JSON.stringify({
      isPremium: false,
      status: sub?.status || "none",
      plan: sub?.plan || "free",
      currentPeriodEnd: sub?.current_period_end || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = (error as Error).message;
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, isPremium: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
