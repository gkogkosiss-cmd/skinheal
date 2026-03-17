import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREEM-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function decodeJwtPayload(token: string): { sub: string; email: string } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const payload = JSON.parse(atob(padded));
  const email = payload.email || payload.user_metadata?.email || "";
  const sub = payload.sub || "";
  if (!sub) throw new Error("JWT missing 'sub' claim");
  if (!email) throw new Error("JWT missing email");
  return { sub, email };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const creemKey = Deno.env.get("CREEM_API_KEY");
    if (!creemKey) throw new Error("CREEM_API_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { sub: userId, email } = decodeJwtPayload(token);
    logStep("User authenticated", { userId, email });

    const body = await req.json().catch(() => ({}));
    const plan = body.plan || "monthly";

    const productId = plan === "yearly"
      ? "prod_xbxHLpbUgREYQFvdX9vuo"
      : "prod_4YQvNIghdUL6mqusDvVEHQ";

    const origin = req.headers.get("origin") || "https://skinheal.lovable.app";

    logStep("Creating Creem checkout", { plan, productId });

    const response = await fetch("https://api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": creemKey,
      },
      body: JSON.stringify({
        product_id: productId,
        success_url: `${origin}/profile?checkout=success`,
        metadata: {
          user_id: userId,
          plan,
        },
      }),
    });

    const data = await response.json();
    logStep("Creem response", { status: response.status, data });

    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Creem API error: ${response.status}`);
    }

    const checkoutUrl = data.checkout_url || data.url;
    if (!checkoutUrl) throw new Error("No checkout URL received from Creem");

    return new Response(JSON.stringify({ url: checkoutUrl }), {
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
