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
  bodyArea: "face",
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
  if (typeof parsed.bodyArea === "string") result.bodyArea = parsed.bodyArea;

  if (typeof parsed.scoreAdjustment === "number") {
    result.scoreAdjustment = Math.max(-6, Math.min(6, Math.round(parsed.scoreAdjustment)));
  }

  if (result.confidence === "low") {
    result.scoreAdjustment = Math.max(-1, Math.min(1, result.scoreAdjustment));
  }

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

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

function buildGeminiPayload(messages: any[]) {
  let systemInstruction: any = undefined;
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: msg.content }] };
      continue;
    }
    if (typeof msg.content === "string") {
      contents.push({ role: "user", parts: [{ text: msg.content }] });
    } else if (Array.isArray(msg.content)) {
      const parts: any[] = [];
      for (const part of msg.content) {
        if (part.type === "text") {
          parts.push({ text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url) {
          const dataMatch = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
          if (dataMatch) {
            parts.push({ inlineData: { mimeType: dataMatch[1], data: dataMatch[2] } });
          }
        }
      }
      contents.push({ role: "user", parts });
    }
  }

  const payload: any = { contents, generationConfig: { temperature: 0.4, topP: 0.95 } };
  if (systemInstruction) payload.systemInstruction = systemInstruction;
  return payload;
}

async function callAI(messages: any[], apiKey: string): Promise<any> {
  const payload = buildGeminiPayload(messages);

  for (const [index, model] of MODELS.entries()) {
    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const t = await response.text();
        console.error(`Gemini ${model} error:`, response.status, t.substring(0, 300));
        if (response.status === 429) return { _error: "rate_limit", status: 429 };
        if (index < MODELS.length - 1) continue;
        return { _error: "api_error", status: response.status };
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        if (index < MODELS.length - 1) continue;
        return null;
      }
      return extractJSON(content);
    } catch (err) {
      console.error(`Gemini ${model} request failed:`, err);
      if (index < MODELS.length - 1) continue;
      return { _error: "api_error", status: 500 };
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { newImageBase64, previousImageBase64, baselineContext, previousScore, progressAnswers, bodyArea } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
    if (!newImageBase64) throw new Error("New progress photo is required");

    const prevScore = typeof previousScore === "number" ? previousScore : 50;
    const hasPreviousImage = !!previousImageBase64;
    const detectedArea = bodyArea || "unknown";

    const answersBlock = progressAnswers && typeof progressAnswers === "object"
      ? `\n\nUser's self-reported progress answers:\n${Object.entries(progressAnswers).map(([q, a]) => `- ${q}: ${a}`).join("\n")}`
      : "";

    const systemPrompt = `You are an expert skin progress evaluator for "SkinHeal AI", combining dermatological assessment skills with holistic health understanding. You compare new progress photos against a previous reference to assess CHANGES with clinical precision.

BODY AREA CONTEXT:
- The photos are of the user's ${detectedArea} area. Confirm or correct the body area in the "bodyArea" field.
- Evaluate changes relevant to this specific body area using area-appropriate clinical markers.

CLINICAL CHANGE DETECTION FRAMEWORK:
Evaluate changes using these specific markers:
- Erythema/Redness: color intensity, distribution area, border definition
- Inflammation: swelling, raised lesions, warmth indicators
- Active lesions: count comparison, size changes, new vs resolving lesions
- Post-inflammatory marks: PIH darkening/lightening, PIE fading
- Texture: smoothness improvement, pore refinement, surface irregularities
- Barrier health: flaking reduction, moisture appearance, sensitivity signs
- Overall skin tone: evenness, clarity, radiance

CRITICAL STABILITY RULES:
- The user's PREVIOUS Skin Health Score was ${prevScore}/100. This is your anchor.
- You are given ${hasPreviousImage ? "the PREVIOUS photo AND " : ""}the NEW photo(s). Compare them visually.

VISUAL SIMILARITY ASSESSMENT:
- Before evaluating changes, assess overall visual similarity.
- If photos look very similar (same lighting, same appearance): scoreAdjustment MUST be 0 or +/-1.
- If photos appear identical or nearly identical: scoreAdjustment MUST be 0.
- Account for lighting/angle differences — do NOT penalize for photo-taking variation.

SCORE CHANGE GUIDELINES (strictly enforced):
- Nearly identical: 0 (most common outcome for weekly checks)
- Subtle visible improvement: +1 to +3
- Clear moderate improvement with multiple indicators: +4 to +6 (rare)
- Subtle visible worsening: -1 to -3
- Clear moderate worsening: -4 to -6 (rare)
- NEVER adjust by more than 6 points in either direction.
- When in doubt, default to 0. Stability > precision.
- Be FAIR — consider lighting differences and photo quality before assuming worsening.

PHOTO QUALITY CHECK:
- If photos are blurry, poorly lit, or taken from very different angles:
  Set photoQualityIssue to true, confidence to "low", scoreAdjustment to 0.
- If comparing different body areas: set photoQualityIssue to true, confidence to "low", scoreAdjustment to 0.

HOLISTIC PROGRESS INDICATORS (incorporate when user answers are available):
- Gut health improvements often precede visible skin improvements by 1-2 weeks
- Better sleep and stress management may show skin benefits within 2-4 weeks
- Dietary changes typically need 3-6 weeks for visible skin impact
- Note these timelines encouragingly in your summary when relevant

LANGUAGE RULES:
- Use cautious language: "appears", "seems to show", "may indicate"
- Be encouraging but honest. Celebrate small wins.
- Never use the asterisk symbol (*).
- Focus on visible changes. Do NOT re-diagnose conditions.
- Reference the specific body area in your summary.
- If improvement is detected, connect it to the user's reported efforts when possible.

Evaluate CHANGES in these areas:
1. Redness — erythema intensity and distribution
2. Inflammation — active swelling, raised lesion count
3. Breakout Activity — active lesion count and severity trend
4. Flaking — dryness and desquamation
5. Skin Texture — smoothness, pore visibility, surface quality
6. Overall — general appearance and progress trajectory

For each area use status:
- "improved" — only if clearly visible improvement
- "similar" — default when uncertain or no clear change
- "worsened" — only if clearly visible worsening

Respond with ONLY valid JSON:
{
  "bodyArea": "detected body area",
  "changes": [
    {"area": "Redness", "status": "improved"|"similar"|"worsened", "note": "Specific clinical observation"},
    {"area": "Inflammation", "status": "...", "note": "..."},
    {"area": "Breakout Activity", "status": "...", "note": "..."},
    {"area": "Flaking", "status": "...", "note": "..."},
    {"area": "Skin Texture", "status": "...", "note": "..."},
    {"area": "Overall", "status": "...", "note": "..."}
  ],
  "summary": "2-3 sentence expert progress summary. Reference the body area, specific improvements or stability, and connect to healing timeline expectations. Be encouraging about consistency.",
  "scoreAdjustment": number between -6 and +6 (most commonly 0),
  "encouragement": "One genuinely motivating sentence that acknowledges their effort and connects to the healing journey.",
  "confidence": "high"|"medium"|"low",
  "photoQualityIssue": true|false
}

REMEMBER: Real skin healing is gradual. Most weekly checks show scoreAdjustment of 0. Celebrate consistency. Only assign non-zero when you can clearly see a difference.`;

    const imageContent: any[] = [];

    if (previousImageBase64) {
      imageContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${previousImageBase64}` },
      });
    }

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
      ? `I'm providing ${1 + images.length} image(s) of the user's ${detectedArea}. The FIRST image is the PREVIOUS photo from the last check. The remaining ${images.length} image(s) are the NEW progress photo(s) taken now. Compare the new photos against the previous photo visually. Look at all new photos together to form an average assessment — do not evaluate any single photo in isolation.`
      : `I'm providing ${images.length} new progress photo(s) of the user's ${detectedArea}. No previous photo is available for visual comparison, so evaluate based on the baseline text context only. Be extra conservative — keep scoreAdjustment at 0 unless the text context clearly indicates a difference.`;

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

    let parsed = await callAI(messages, GEMINI_API_KEY);

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
