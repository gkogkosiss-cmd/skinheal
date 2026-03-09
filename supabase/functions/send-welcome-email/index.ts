import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-welcome-email] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email;
    const name = user.user_metadata?.full_name || user.user_metadata?.name || email?.split("@")[0] || "there";

    console.log(`[send-welcome-email] Sending welcome email to: ${email}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SkinHeal AI <hello@skinheal.ai>",
        to: [email],
        subject: "Welcome to SkinHeal — Your Skin Healing Journey Starts Now",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;color:#2d3a2e;margin:0 0 8px;">Welcome to SkinHeal</h1>
      <p style="font-size:15px;color:#6b7280;margin:0;">Hi ${name}, we're glad you're here.</p>
    </div>
    <div style="background:#f7f6f3;border-radius:16px;padding:24px;margin-bottom:24px;">
      <h2 style="font-size:18px;color:#2d3a2e;margin:0 0 12px;">What's next?</h2>
      <ul style="font-size:14px;color:#4b5563;padding-left:20px;margin:0;line-height:1.8;">
        <li>Upload a photo for your first AI skin analysis</li>
        <li>Get your personalized healing protocol</li>
        <li>Track your progress over time</li>
      </ul>
    </div>
    <div style="text-align:center;">
      <a href="https://skinheal.lovable.app/analysis"
         style="display:inline-block;background:#4a7c59;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">
        Start Your Analysis
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
      SkinHeal AI — Personalized skin healing guidance.<br>
      This is an educational tool, not medical advice.
    </p>
  </div>
</body>
</html>`,
      }),
    });

    const resendResult = await res.json();
    console.log("[send-welcome-email] Resend response:", JSON.stringify(resendResult));

    if (!res.ok) {
      console.error("[send-welcome-email] Resend error:", resendResult);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendResult }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendResult.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-welcome-email] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
