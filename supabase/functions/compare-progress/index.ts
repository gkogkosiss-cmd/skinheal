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
};

function extractJSON(text: string): any | null {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {}

  // Try extracting from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Try finding first { to last }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  return null;
}

function validateAndRepair(parsed: any): any {
  const result = { ...DEFAULT_RESULT };

  if (parsed.summary && typeof parsed.summary === "string") {
    result.summary = parsed.summary;
  }
  if (parsed.encouragement && typeof parsed.encouragement === "string") {
    result.encouragement = parsed.encouragement;
  }
  if (typeof parsed.confidence === "string" && ["high", "medium", "low"].includes(parsed.confidence)) {
    result.confidence = parsed.confidence;
  }

  // Score adjustment — enforce hard cap
  if (typeof parsed.scoreAdjustment === "number") {
    result.scoreAdjustment = Math.max(-6, Math.min(6, Math.round(parsed.scoreAdjustment)));
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

    // Ensure we have at least the 6 standard areas
    const existingAreas = new Set(result.changes.map((c: any) => c.area));
    for (const defaultChange of DEFAULT_RESULT.changes) {
      if (!existingAreas.has(defaultChange.area)) {
        result.changes.push(defaultChange);
      }
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
    if (response.status === 429) {
      return { _error: "rate_limit", status: 429 };
    }
    if (response.status === 402) {
      return { _error: "usage_limit", status: 402 };
    }
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

You MUST respond with ONLY a valid JSON object (no markdown, no extra text):
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
  "scoreAdjustment": number between -6 and +6,
  "encouragement": "One motivating sentence.",
  "confidence": "high" | "medium" | "low"
}

If the photo is blurry or poorly lit, set confidence to "low", scoreAdjustment to 0, and mention photo quality in the summary.

REMEMBER: Most weekly checks should show scoreAdjustment of 0 to 2. Large swings are rare.`;

    // Build image content - support multiple images
    const imageContent: any[] = [];
    
    // Handle both single base64 string and array of base64 strings
    const images = Array.isArray(newImageBase64) ? newImageBase64 : [newImageBase64];
    
    for (const img of images) {
      if (typeof img === "string" && img.length > 0) {
        imageContent.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${img}` },
        });
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Compare ${images.length > 1 ? "these " + images.length + " progress photos" : "this new progress photo"} against the baseline analysis context below. The user's previous score was ${prevScore}/100. Evaluate visible CHANGES only.

Baseline context:
${baselineContext || "No baseline analysis available. Evaluate the photo on its own and note general skin observations. Keep scoreAdjustment at 0."}${answersBlock}`,
          },
          ...imageContent,
        ],
      },
    ];

    // Attempt 1
    let parsed = await callAI(messages, LOVABLE_API_KEY);

    // Handle rate/usage errors
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

    // If first attempt failed to parse, retry once
    if (!parsed || parsed._error) {
      console.log("First attempt failed, retrying...");
      parsed = await callAI(messages, LOVABLE_API_KEY);
      
      if (parsed?._error) {
        console.error("Retry also failed, using fallback");
        parsed = null;
      }
    }

    // Validate and repair whatever we got (or use defaults)
    const result = validateAndRepair(parsed || {});

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compare-progress error:", e);
    // Even on error, return a valid fallback instead of an error
    return new Response(JSON.stringify(DEFAULT_RESULT), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
