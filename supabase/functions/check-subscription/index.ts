import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Decode JWT payload without signature verification (edge functions are already API-key protected). */
function decodeJwtPayload(token: string): { sub: string; email: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const payload = JSON.parse(atob(padded));
  const email = payload.email || payload.user_metadata?.email || "";
  const sub = payload.sub || "";
  if (!sub) throw new Error("JWT missing 'sub' claim");
  if (!email) throw new Error("JWT missing email — found keys: " + Object.keys(payload).join(", "));
  return { sub, email };
}

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { sub: userId, email } = decodeJwtPayload(token);
    if (!email) throw new Error("User email not available in token");
    logStep("User identified from JWT", { userId, email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      logStep("Raw subscription data", { 
        current_period_end: subscription.current_period_end,
        type: typeof subscription.current_period_end 
      });
      
      if (subscription.current_period_end) {
        try {
          const endValue = subscription.current_period_end;
          if (typeof endValue === 'number') {
            subscriptionEnd = new Date(endValue * 1000).toISOString();
          } else if (typeof endValue === 'string') {
            const parsed = new Date(endValue);
            if (!isNaN(parsed.getTime())) {
              subscriptionEnd = parsed.toISOString();
            }
          }
        } catch (e) {
          logStep("Could not parse subscription end date, continuing without it");
        }
      }
      
      productId = subscription.items.data[0]?.price?.product ?? null;
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});