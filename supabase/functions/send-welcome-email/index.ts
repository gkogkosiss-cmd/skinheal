import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Template config — uses Resend dashboard templates (edit content there)
const TEMPLATES: Record<string, {
  resendTemplateId: string;
  fallbackSubject: string;
}> = {
  welcome: {
    resendTemplateId: "welcome-to-skinheal",
    fallbackSubject: "Welcome to SkinHeal AI 🌿",
  },
  premium: {
    resendTemplateId: "premium-welcome",
    fallbackSubject: "You're now a SkinHeal Premium member 🌿",
  },
};

// Inline HTML fallback for premium
const PREMIUM_FALLBACK_HTML = (name: string) => `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <h1 style="font-size:24px;color:#2d3a2e;">Welcome to Premium, ${name}!</h1>
    <p style="font-size:15px;color:#6b7280;">You now have full access to everything SkinHeal offers.</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://skinheal.lovable.app/dashboard"
         style="display:inline-block;background:#4a7c59;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">
        Go to Dashboard
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
      SkinHeal AI — Personalized skin healing guidance.<br>This is an educational tool, not medical advice.
    </p>
  </div>
</body></html>`;

// Inline HTML fallback for welcome
const WELCOME_FALLBACK_HTML = (name: string) => `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <h1 style="font-size:24px;color:#2d3a2e;">Welcome to SkinHeal, ${name}!</h1>
    <p style="font-size:15px;color:#6b7280;">Your personalized skin healing journey starts now.</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="https://skinheal.lovable.app/analysis"
         style="display:inline-block;background:#4a7c59;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">
        Start Your Skin Analysis
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
      SkinHeal AI — Personalized skin healing guidance.<br>This is an educational tool, not medical advice.
    </p>
  </div>
</body></html>`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body — client now sends user info directly
    let emailType = "welcome";
    let email = "";
    let name = "";

    try {
      const body = await req.json();
      if (body?.type) emailType = body.type;
      if (body?.email) email = body.email;
      if (body?.name) name = body.name;
    } catch { /* default to welcome */ }

    if (!email) {
      console.error("[send-welcome-email] No email provided in request body");
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!name) {
      name = email.split("@")[0] || "there";
    }

    const template = TEMPLATES[emailType];
    if (!template) {
      console.error(`[send-welcome-email] Unknown email type: ${emailType}`);
      return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-welcome-email] TRIGGER | type=${emailType} | email=${email} | name=${name}`);

    // Send via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-welcome-email] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try Resend template first
    const emailPayload: Record<string, unknown> = {
      from: "SkinHeal AI <hello@skinheal.ai>",
      to: [email],
      template: {
        id: template.resendTemplateId,
        variables: { name, email },
      },
    };

    console.log(`[send-welcome-email] TEMPLATE: ${template.resendTemplateId} | recipient: ${email}`);

    let res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    let resendResult = await res.json();
    console.log(`[send-welcome-email] RESEND RESPONSE (${emailType}):`, JSON.stringify(resendResult));

    // If template fails, fall back to inline HTML
    if (!res.ok) {
      console.warn(`[send-welcome-email] Template failed for ${emailType}, falling back to inline HTML`);
      const fallbackHtml = emailType === "premium" ? PREMIUM_FALLBACK_HTML(name) : WELCOME_FALLBACK_HTML(name);
      const fallbackPayload = {
        from: "SkinHeal AI <hello@skinheal.ai>",
        to: [email],
        subject: template.fallbackSubject,
        html: fallbackHtml,
      };
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fallbackPayload),
      });
      resendResult = await res.json();
      console.log("[send-welcome-email] Fallback RESEND RESPONSE:", JSON.stringify(resendResult));
    }

    if (!res.ok) {
      console.error(`[send-welcome-email] SEND FAILED (${emailType}):`, resendResult);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendResult }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendResult.id, type: emailType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-welcome-email] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});