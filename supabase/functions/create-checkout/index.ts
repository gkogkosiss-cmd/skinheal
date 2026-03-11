import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

/** Decode JWT payload without signature verification (edge functions are already API-key protected). */
function decodeJwtPayload(token: string): { sub: string; email: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  if (!payload.sub || !payload.email) throw new Error("JWT missing required claims");
  return { sub: payload.sub, email: payload.email };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Auth header found");

    const token = authHeader.replace("Bearer ", "");
    const { email } = decodeJwtPayload(token);
    if (!email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      logStep("No existing customer, will create on checkout");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    logStep("Creating checkout session", { origin });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: "price_1T7xLWCYic08fhoyPBMCm5HH", quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/profile?checkout=success`,
      cancel_url: `${origin}/profile?checkout=cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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