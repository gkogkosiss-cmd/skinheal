import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { newImageBase64, baselineContext, previousScore, progressAnswers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!newImageBase64) throw new Error("New progress photo is required");

    const prevScore = typeof previousScore === "number" ? previousScore : 50;

    const answersBlock = progressAnswers && typeof progressAnswers === "object"
      ? `\n\nUser's self-reported progress answers:\n${Object.entries(progressAnswers).map(([q, a]) => `- ${q}: ${a}`).join("\n")}`
      : "";

    const systemPrompt = `You are a conservative skin progress evaluator for "The Skin Guy AI". You compare a new progress photo against a baseline analysis context to assess CHANGES ONLY.

CRITICAL STABILITY RULES:
- The user's PREVIOUS Skin Health Score was ${prevScore}/100. This is your anchor.
- If the photo looks very similar to what was described in the baseline, the score MUST stay within 0-1 points of ${prevScore}.
- Small visible improvements: adjust by +1 to +3 points maximum.
- Moderate clear improvements: adjust by +3 to +5 points maximum.
- Small visible worsening: adjust by -1 to -3 points maximum.
- Moderate clear worsening: adjust by -3 to -5 points maximum.
- NEVER adjust by more than 6 points in either direction.
- When uncertain, default to 0 change. Stability > precision.
- Do NOT re-diagnose. Only evaluate CHANGE from baseline.

LANGUAGE RULES:
- NEVER diagnose. Use cautious language: "appears", "seems", "may show".
- Be encouraging but honest.
- Never use the asterisk symbol (*).
- Focus on visible changes only.

Given a new skin photo, the baseline context, and the user's self-reported answers, evaluate CHANGES in:
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
  "summary": "2-3 sentence overall progress summary using cautious language. Reference that previous score was ${prevScore}.",
  "scoreAdjustment": number between -6 and +6 (positive = improvement, 0 = no change),
  "encouragement": "One motivating sentence about their progress.",
  "confidence": "high" | "medium" | "low"
}

If the photo is blurry, poorly lit, or hard to evaluate, set confidence to "low", scoreAdjustment to 0, and mention photo quality in the summary.

REMEMBER: Most weekly checks should show scoreAdjustment of 0 to 2. Large swings are rare and should only happen with clear visual evidence AND supporting user answers.`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Compare this new progress photo against the baseline analysis context below. The user's previous score was ${prevScore}/100. Evaluate visible CHANGES only.

Baseline context:
${baselineContext || "No baseline analysis available. Evaluate the photo on its own and note general skin observations. Keep scoreAdjustment at 0."}${answersBlock}`,
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
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        confidence: "low",
      };
    }

    // ENFORCE hard cap on score adjustment regardless of what the AI returns
    let adj = typeof parsed.scoreAdjustment === "number" ? parsed.scoreAdjustment : 0;
    adj = Math.max(-6, Math.min(6, adj));
    parsed.scoreAdjustment = adj;

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
