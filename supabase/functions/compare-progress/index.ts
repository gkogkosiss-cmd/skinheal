import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { newImageBase64, baselineContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!newImageBase64) throw new Error("New progress photo is required");

    const systemPrompt = `You are a skin progress evaluator for "The Skin Guy AI". You compare a new progress photo against a baseline analysis context to assess changes.

CRITICAL RULES:
- NEVER diagnose. Use cautious language: "appears", "seems", "may show".
- Be encouraging but honest.
- Never use the asterisk symbol (*).
- Focus on visible changes only.

Given a new skin photo and the baseline analysis context, evaluate changes in:
1. Redness
2. Inflammation
3. Breakout activity
4. Flaking/dryness
5. Skin texture
6. Overall appearance

Respond with a JSON object:
{
  "changes": [
    {"area": "Redness", "status": "improved" | "similar" | "worsened", "note": "Brief observation"},
    {"area": "Inflammation", "status": "improved" | "similar" | "worsened", "note": "Brief observation"},
    {"area": "Breakout Activity", "status": "improved" | "similar" | "worsened", "note": "Brief observation"},
    {"area": "Flaking", "status": "improved" | "similar" | "worsened", "note": "Brief observation"},
    {"area": "Skin Texture", "status": "improved" | "similar" | "worsened", "note": "Brief observation"},
    {"area": "Overall", "status": "improved" | "similar" | "worsened", "note": "Brief observation"}
  ],
  "summary": "2-3 sentence overall progress summary using cautious language.",
  "scoreAdjustment": number between -10 and +10 (positive = improvement, 0 = no change),
  "encouragement": "One motivating sentence about their progress."
}

Be realistic. Small visible improvements deserve +2 to +5. Clear improvement +5 to +10. Worsening -2 to -10. No visible change = 0.`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Compare this new progress photo against the baseline analysis context below. Evaluate visible changes.

Baseline context:
${baselineContext || "No baseline analysis available. Evaluate the photo on its own and note general skin observations."}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${newImageBase64}` },
          },
        ],
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Progress comparison failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        changes: [],
        summary: "Unable to parse comparison results.",
        scoreAdjustment: 0,
        encouragement: "Keep following your healing plan consistently.",
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compare-progress error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
