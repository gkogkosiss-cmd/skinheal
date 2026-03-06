import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_RESULT = {
  changes: [
    { area: "Redness", status: "similar", note: "Unable to detect significant change." },
    { area: "Inflammation", status: "similar", note: "Unable to detect significant change." },
    { area: "Breakout Activity", status: "similar", note: "Unable to detect significant change." },
    { area: "Flaking", status: "similar", note: "Unable to detect significant change." },
    { area: "Skin Texture", status: "similar", note: "Unable to detect significant change." },
    { area: "Overall", status: "similar", note: "Unable to detect significant change." },
  ],
  summary: "Your skin appears similar to your previous check. Keep following your healing plan consistently.",
  scoreAdjustment: 0,
  encouragement: "Consistency is key — keep going with your routine!",
  confidence: "medium",
  photoQualityIssue: false,
};

function extractJSON(text: string): any | null {
  try { return JSON.parse(text); } catch {}
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) { try { return JSON.parse(codeBlockMatch[1].trim()); } catch {} }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch {}
  }
  return null;
}

function validateAndRepair(parsed: any): any {
  const result = { ...DEFAULT_RESULT };

  if (parsed.summary && typeof parsed.summary === "string") result.summary = parsed.summary;
  if (parsed.encouragement && typeof parsed.encouragement === "string") result.encouragement = parsed.encouragement;
  if (typeof parsed.confidence === "string" && ["high", "medium", "low"].includes(parsed.confidence)) result.confidence = parsed.confidence;
  if (typeof parsed.photoQualityIssue === "boolean") result.photoQualityIssue = parsed.photoQualityIssue;

  // Score adjustment — enforce hard cap
  if (typeof parsed.scoreAdjustment === "number") {
    result.scoreAdjustment = Math.max(-6, Math.min(6, Math.round(parsed.scoreAdjustment)));
  }

  // Extra stability: if confidence is low, clamp harder
  if (result.confidence === "low") {
    result.scoreAdjustment = Math.max(-1, Math.min(1, result.scoreAdjustment));
  }

  // Changes array
  if (Array.isArray(parsed.changes) && parsed.changes.length > 0) {
    const validStatuses = ["improved", "similar", "worsened"];
    result.changes = parsed.changes
      .filter((c: any) => c && typeof c.area === "string")
      .map((c: any) => ({
        area: c.area,
        status: validStatuses.includes(c.status) ? c.status : "similar",
        note: typeof c.note === "string" ? c.note : "No significant change detected.",
      }));

    const existingAreas = new Set(result.changes.map((c: any) => c.area));
    for (const defaultChange of DEFAULT_RESULT.changes) {
      if (!existingAreas.has(defaultChange.area)) result.changes.push(defaultChange);
    }
  }

  return result;
}

async function callAI(messages: any[], apiKey: string): Promise<any> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    if (response.status === 429) return { _error: "rate_limit", status: 429 };
    if (response.status === 402) return { _error: "usage_limit", status: 402 };
    return { _error: "api_error", status: response.status };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  return extractJSON(content);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { newImageBase64, previousImageBase64, baselineContext, previousScore, progressAnswers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!newImageBase64) throw new Error("New progress photo is required");

    const prevScore = typeof previousScore === "number" ? previousScore : 50;
    const hasPreviousImage = !!previousImageBase64;

    const answersBlock = progressAnswers && typeof progressAnswers === "object"
      ? `\n\nUser's self-reported progress answers:\n${Object.entries(progressAnswers).map(([q, a]) => `- ${q}: ${a}`).join("\n")}`
      : "";

    const systemPrompt = `You are a conservative skin progress evaluator for "The Skin Guy AI". You compare new progress photos against a previous reference photo and baseline context to assess CHANGES ONLY.

CRITICAL STABILITY RULES — FOLLOW EXACTLY:
- The user's PREVIOUS Skin Health Score was ${prevScore}/100. This is your anchor.
- You are given ${hasPreviousImage ? "the PREVIOUS photo AND " : ""}the NEW photo(s). Compare them visually.

VISUAL SIMILARITY FIRST:
- Before evaluating changes, assess how visually similar the new photos are to the previous photo.
- If the photos look very similar (same lighting, same skin appearance, no obvious differences):
  scoreAdjustment MUST be 0 or at most ±1. This is the MOST COMMON outcome for weekly checks.
- If photos appear identical or nearly identical, scoreAdjustment MUST be 0.

SCORE CHANGE GUIDELINES (strictly enforced):
- Nearly identical photos: 0 (most common)
- Subtle/slight visible improvement: +1 to +3
- Moderate clear improvement with multiple indicators: +4 to +6 (rare)
- Subtle/slight visible worsening: -1 to -3
- Moderate clear worsening with multiple indicators: -4 to -6 (rare)
- NEVER adjust by more than 6 points in either direction.
- When in doubt, default to 0. Stability > precision. ALWAYS.

PHOTO QUALITY CHECK:
- If photos are blurry, poorly lit, too dark, or taken from very different angles:
  Set photoQualityIssue to true, confidence to "low", scoreAdjustment to 0.
  Mention the quality issue in the summary.

LANGUAGE RULES:
- NEVER diagnose. Use cautious language: "appears", "seems", "may show".
- Be encouraging but honest. Never exaggerate improvement or worsening.
- Never use the asterisk symbol (*).
- Focus on visible changes only. Do NOT re-diagnose conditions.

Evaluate CHANGES in these areas:
1. Redness
2. Inflammation
3. Breakout Activity (count/severity of active breakouts)
4. Flaking/dryness
5. Skin Texture (smoothness, pore visibility)
6. Overall appearance

For each area use status:
- "improved" — only if clearly visible improvement
- "similar" — default when uncertain or no clear change
- "worsened" — only if clearly visible worsening

Respond with ONLY valid JSON:
{
  "changes": [
    {"area": "Redness", "status": "improved"|"similar"|"worsened", "note": "Brief observation"},
    {"area": "Inflammation", "status": "...", "note": "..."},
    {"area": "Breakout Activity", "status": "...", "note": "..."},
    {"area": "Flaking", "status": "...", "note": "..."},
    {"area": "Skin Texture", "status": "...", "note": "..."},
    {"area": "Overall", "status": "...", "note": "..."}
  ],
  "summary": "2-3 sentence progress summary using cautious language. Mention specific areas if changed.",
  "scoreAdjustment": number between -6 and +6 (most commonly 0),
  "encouragement": "One motivating sentence.",
  "confidence": "high"|"medium"|"low",
  "photoQualityIssue": true|false
}

REMEMBER: The MAJORITY of weekly checks should result in scoreAdjustment of 0. Real skin change is slow. Only assign non-zero when you can clearly see a difference.`;

    // Build image content
    const imageContent: any[] = [];

    // Add PREVIOUS photo first if available (for visual comparison)
    if (previousImageBase64) {
      imageContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${previousImageBase64}` },
      });
    }

    // Add new photos
    const images = Array.isArray(newImageBase64) ? newImageBase64 : [newImageBase64];
    for (const img of images) {
      if (typeof img === "string" && img.length > 0) {
        imageContent.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${img}` },
        });
      }
    }

    const comparisonInstruction = hasPreviousImage
      ? `I'm providing ${1 + images.length} image(s). The FIRST image is the PREVIOUS photo from the last check. The remaining ${images.length} image(s) are the NEW progress photo(s) taken now. Compare the new photos against the previous photo visually. Look at all new photos together to form an average assessment — do not evaluate any single photo in isolation.`
      : `I'm providing ${images.length} new progress photo(s). No previous photo is available for visual comparison, so evaluate based on the baseline text context only. Be extra conservative — keep scoreAdjustment at 0 unless the text context clearly indicates a difference.`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${comparisonInstruction}

The user's previous score was ${prevScore}/100. Evaluate visible CHANGES only.

Baseline context:
${baselineContext || "No baseline analysis available. Evaluate conservatively. Keep scoreAdjustment at 0."}${answersBlock}`,
          },
          ...imageContent,
        ],
      },
    ];

    let parsed = await callAI(messages, LOVABLE_API_KEY);

    if (parsed?._error === "rate_limit") {
      return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (parsed?._error === "usage_limit") {
      return new Response(JSON.stringify({ error: "Usage limit reached." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsed || parsed._error) {
      console.log("First attempt failed, retrying...");
      parsed = await callAI(messages, LOVABLE_API_KEY);
      if (parsed?._error) { console.error("Retry also failed"); parsed = null; }
    }

    const result = validateAndRepair(parsed || {});

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compare-progress error:", e);
    return new Response(JSON.stringify(DEFAULT_RESULT), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
