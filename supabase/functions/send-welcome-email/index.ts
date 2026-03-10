import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Template config: use Resend named templates when available, fall back to inline HTML
const TEMPLATES: Record<string, {
  resendTemplateId?: string;        // Resend template slug/ID — preferred
  subject?: string;                 // only needed for inline fallback
  html?: (name: string) => string;  // only needed for inline fallback
}> = {
  welcome: {
    // Uses the Resend template you created — edit it in Resend dashboard
    resendTemplateId: "welcome-to-skinheal",
  },
  premium: {
    subject: "You're now a SkinHeal Premium member 🌿",
    html: (name: string) => `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:24px;color:#2d3a2e;margin:0 0 8px;">Welcome to Premium, ${name}!</h1>
      <p style="font-size:15px;color:#6b7280;margin:0;">You now have full access to everything SkinHeal offers.</p>
    </div>
    <div style="background:#f7f6f3;border-radius:16px;padding:24px;margin-bottom:24px;">
      <h2 style="font-size:18px;color:#2d3a2e;margin:0 0 12px;">Getting Started with Premium</h2>
      <ul style="font-size:14px;color:#4b5563;padding-left:20px;margin:0;line-height:1.8;">
        <li><strong>Healing Protocol</strong> — your full personalized skin repair plan</li>
        <li><strong>Nutrition & Gut Health</strong> — meal plans tailored to your skin</li>
        <li><strong>AI Coach</strong> — ask anything about your skin journey</li>
        <li><strong>Progress Insights</strong> — detailed tracking & comparisons</li>
      </ul>
    </div>
    <div style="text-align:center;">
      <a href="https://skinheal.lovable.app/dashboard"
         style="display:inline-block;background:#4a7c59;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600;">
        Go to Dashboard
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:32px;">
      SkinHeal AI — Personalized skin healing guidance.<br>This is an educational tool, not medical advice.
    </p>
  </div>
</body></html>`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-welcome-email] No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for email type
    let emailType = "welcome";
    try {
      const body = await req.json();
      if (body?.type) emailType = body.type;
    } catch { /* default to welcome */ }

    const template = TEMPLATES[emailType];
    if (!template) {
      console.error(`[send-welcome-email] Unknown email type: ${emailType}`);
      return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("[send-welcome-email] Auth failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-welcome-email] type=${emailType}, userId=${user.id}, email=${user.email}`);

    // Use service role client to check/update flags
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already sent
    const flagColumn = emailType === "premium" ? "premium_email_sent" : "welcome_email_sent";
    const { data: profile } = await adminClient
      .from("profiles")
      .select(flagColumn)
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile && (profile as any)[flagColumn] === true) {
      console.log(`[send-welcome-email] ${flagColumn} already true for ${user.id}, skipping`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-welcome-email] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "there";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SkinHeal AI <hello@skinheal.ai>",
        to: [user.email],
        subject: template.subject,
        html: template.html(name),
      }),
    });

    const resendResult = await res.json();
    console.log(`[send-welcome-email] Resend response (${emailType}):`, JSON.stringify(resendResult));

    if (!res.ok) {
      console.error(`[send-welcome-email] Resend error (${emailType}):`, resendResult);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendResult }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as sent
    await adminClient
      .from("profiles")
      .update({ [flagColumn]: true })
      .eq("user_id", user.id);

    console.log(`[send-welcome-email] ${flagColumn} set to true for ${user.id}`);

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
