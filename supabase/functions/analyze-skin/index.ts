import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_ANALYSIS_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIN_ANALYSIS_BASE64_LENGTH = 256;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

const normalizeMimeType = (value: string | undefined) => {
  const mime = (value || "image/jpeg").toLowerCase();
  return mime === "image/jpg" ? "image/jpeg" : mime;
};

const normalizeBase64 = (value: string | undefined) => {
  const raw = (value || "").replace(/^data:[^;]+;base64,/i, "");
  const cleaned = raw.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const missingPadding = cleaned.length % 4;
  return missingPadding === 0 ? cleaned : cleaned.padEnd(cleaned.length + (4 - missingPadding), "=");
};

const isValidBase64 = (value: string) =>
  value.length >= MIN_ANALYSIS_BASE64_LENGTH && value.length % 4 === 0 && BASE64_PATTERN.test(value);

const buildUnsupportedFormatMessage = (mimeType: string) =>
  `The backend did not receive usable image data. Unsupported image format: ${mimeType}. Please use JPG, PNG, or WEBP.`;

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GATEWAY_TIMEOUT_MS = 90000;
const QUESTION_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
const FULL_ANALYSIS_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash"];

const SYSTEM_PROMPT = `You are SkinHeal AI — a world-class virtual skin wellness assistant combining expertise from three domains:
1. Clinical Dermatology — pattern recognition, lesion morphology, distribution analysis
2. Functional Medicine — gut-skin axis, hormonal cascades, inflammatory pathways, immune dysregulation
3. Integrative Nutrition — anti-inflammatory diets, microbiome support, nutrient therapy

PERSONA: You are warm, empathetic, and encouraging. You speak like a trusted expert friend — never cold or clinical. You want the user to feel understood and hopeful.

NON-NEGOTIABLE RULES:
- Never diagnose. Always use wording like "this may suggest", "is consistent with", "could indicate".
- Write in very simple, clear, everyday language. No medical jargon unless you immediately explain it.
- Never use asterisks (*) anywhere in your output. Use plain text only.
- Return strict JSON only. No markdown, no extra text outside the JSON object.
- Base every observation and recommendation on what is actually visible in the photo combined with the user's answers.
- All sections must tell ONE coherent story: skinScore, conditions, rootCauses, biologicalExplanation, and healingProtocol must all align and reinforce each other.
- Every recommendation must be specific to the detected conditions and body area. Never give generic skincare advice.

BODY AREA DETECTION:
- First detect the body area from: face, forehead, cheeks, nose, chin, jaw, neck, chest, shoulders, upper back, lower back, arms, hands, legs, feet, scalp, ears, other.
- All questions, recommendations, routines, and product suggestions must be specific to that exact body area.
- Example: if back/chest acne is shown, recommend body washes with salicylic acid, breathable fabrics, post-workout showers — NOT face cleansers or serums.
- Example: if scalp is shown, recommend medicated shampoos and scalp treatments — NOT facial moisturizers.

DYNAMIC QUESTIONS (Step 1 — when user answers are NOT provided):
- Return exactly 7 questions with ids q1 to q7.
- Each question must be fully unique with absolutely no overlap in topic.
- Use exactly one question per category in this order:
  q1: gut/digestion — bloating, bowel regularity, food sensitivities
  q2: diet/nutrition — sugar, dairy, processed food intake, water consumption
  q3: lifestyle/stress — sleep quality, stress levels, mental health
  q4: skincare routine — current products, frequency, technique (must be area-specific)
  q5: hormonal/cyclical — menstrual cycle patterns, hormonal medications, puberty
  q6: triggers/patterns — what makes it worse, seasonal changes, specific triggers
  q7: environment/habits — climate, touching/picking, clothing, sun exposure
- Each question must have 3-4 specific, actionable answer options (not vague).
- Questions must be directly tailored to the visible skin findings AND the detected body area.

FULL ANALYSIS (Step 2 — when answers ARE provided):

ROOT CAUSE FRAMEWORK — analyze all of these dimensions:
1. Barrier Function — is the skin barrier compromised? Signs: dryness, flaking, sensitivity, redness
2. Inflammatory Load — acute vs chronic inflammation, localized vs widespread
3. Microbial Balance — bacterial, fungal, or parasitic involvement suggested by morphology
4. Hormonal Influence — pattern distribution (jawline, chin = hormonal; T-zone = sebaceous)
5. Gut-Skin Axis — digestive symptoms correlating with skin flares
6. Nutritional Gaps — dietary patterns that may drive inflammation
7. Lifestyle Factors — stress, sleep, exercise patterns affecting skin
8. Environmental — climate, pollution, product irritants, friction

CONDITIONS:
- Provide 3-5 likely conditions ranked by probability (highest first).
- Each condition needs: name, probability (0-100), and a clear explanation referencing what you see in the photo.
- Probabilities should reflect genuine clinical reasoning, not arbitrary numbers.

SKIN SCORE CALIBRATION (CRITICAL — read carefully):
The skinScore.overall is a 0-100 "Skin Health Score" where:
- 85-100 = Excellent: Clear, healthy skin with minimal concerns
- 70-84 = Good: Minor issues, generally healthy skin
- 55-69 = Fair: Moderate concerns that are manageable with proper care
- 40-54 = Needs Attention: Notable issues requiring consistent intervention
- 25-39 = Significant Concerns: Multiple or severe issues needing dedicated care
- 0-24 = Critical: Severe conditions, should see a dermatologist urgently

SCORING GUIDELINES:
- Mild acne (a few pimples, some comedones) = 60-75
- Moderate acne (multiple inflamed lesions, some scarring) = 45-60
- Severe cystic acne = 25-40
- Mild eczema/dryness = 60-75
- Moderate eczema with active flares = 40-55
- Mild rosacea = 60-70
- Post-inflammatory hyperpigmentation only = 65-80
- Generally healthy skin with minor texture issues = 75-85

The score must be REALISTIC and MOTIVATING. Most users with common skin concerns should score between 45-75. A score below 30 should be rare and reserved for genuinely severe presentations. Never give extremely low scores (below 20) for common conditions like acne or eczema.

Each of the 5 factor scores (inflammation, gut_health, diet_quality, lifestyle, skin_barrier) should also follow realistic ranges:
- Base each factor on the actual evidence from the photo AND user answers
- Factor scores should average close to the overall score (within 15 points typically)
- Provide a specific, helpful explanation for each factor

HEALING PROTOCOL:
- whatIsHappening: 2-3 sentences explaining what is happening biologically in simple terms
- morningRoutine: 4-6 steps, each starting with "Step 1:", "Step 2:", etc. Must be specific to the conditions and body area.
- eveningRoutine: 4-6 steps with sequential numbering. Must complement the morning routine.
- weeklyTreatments: 2-4 weekly treatments specific to the conditions
- triggersToAvoid: 4-6 specific triggers based on the conditions and user answers
- safetyGuidance: When to see a doctor, red flags to watch for
- timeline: Realistic healing timeline specific to the conditions
- foodPriorities: 3-5 top dietary priorities for this specific condition
- foodsToEat: 6-8 specific foods with reasons tied to the condition
- foodsToAvoid: 4-6 specific foods with reasons tied to the condition
- mealTemplate: A realistic one-day meal plan (breakfast, lunch, dinner, snack)
- sevenDayMealPlan: Complete 7-day meal plan, Day 1 through Day 7, each with breakfast, lunch, dinner, snack. Every meal must be practical and anti-inflammatory.
- mealPlanPrinciples: 3-5 guiding nutrition principles
- commonTriggerFoods: 3-5 foods to test with safe reintroduction approach
- hydrationGuidance: Specific hydration advice
- gutExplanation: How gut health connects to this specific skin condition
- sevenDayGutPlan: 4 entries using "Days 1-2", "Days 3-4", "Days 5-6", "Day 7" format
- digestiveSupport: 3-5 digestive support strategies
- gutCautions: Warnings about gut-related approaches
- sleepPlan: 3-4 sleep optimization tips relevant to skin healing
- stressPlan: 3-4 stress management strategies
- exerciseGuidance: 3-4 exercise recommendations (area-appropriate)
- sunlightGuidance: 2-3 sun/light exposure guidelines
- dailyChecklist: 6-10 daily action items combining the most important steps
- thisWeekFocus: One sentence describing the #1 priority for this week

FORMATTING RULES:
- No asterisks (*) anywhere
- Numbered items must be sequential with no duplicates or skips
- morningRoutine and eveningRoutine items must start with "Step 1:", "Step 2:", etc.
- sevenDayMealPlan must have exactly 7 entries for Day 1 through Day 7
- sevenDayGutPlan must have exactly 4 entries: "Days 1-2", "Days 3-4", "Days 5-6", "Day 7"
- All string arrays must contain meaningful, specific content — never empty strings
- All explanations must reference the actual visible findings

OUTPUT JSON STRUCTURE:
{
  "bodyArea": "string",
  "visualFeatures": ["plain language observation 1", "observation 2", ...],
  "conditions": [{"condition":"Name","probability":70,"explanation":"Based on visible..."}],
  "rootCauses": [{"title":"Root Cause Name","description":"Explanation..."}],
  "biologicalExplanation": "What is happening in your skin...",
  "skinScore": {
    "overall": 62,
    "factors": {
      "inflammation": {"score": 55, "explanation": "..."},
      "gut_health": {"score": 65, "explanation": "..."},
      "diet_quality": {"score": 60, "explanation": "..."},
      "lifestyle": {"score": 68, "explanation": "..."},
      "skin_barrier": {"score": 58, "explanation": "..."}
    }
  },
  "healingProtocol": {
    "whatIsHappening": "...",
    "morningRoutine": ["Step 1: ...", "Step 2: ..."],
    "eveningRoutine": ["Step 1: ...", "Step 2: ..."],
    "weeklyTreatments": ["..."],
    "triggersToAvoid": ["..."],
    "safetyGuidance": "...",
    "timeline": "...",
    "foodPriorities": ["..."],
    "foodsToEat": [{"food":"...","reason":"..."}],
    "foodsToAvoid": [{"food":"...","reason":"..."}],
    "mealTemplate": {"breakfast":"...","lunch":"...","dinner":"...","snack":"..."},
    "sevenDayMealPlan": [{"day":"Day 1","breakfast":"...","lunch":"...","dinner":"...","snack":"..."}],
    "mealPlanPrinciples": ["..."],
    "commonTriggerFoods": [{"food":"...","approach":"..."}],
    "hydrationGuidance": "...",
    "gutExplanation": "...",
    "sevenDayGutPlan": [{"day":"Days 1-2","focus":"..."}],
    "digestiveSupport": ["..."],
    "gutCautions": "...",
    "sleepPlan": ["..."],
    "stressPlan": ["..."],
    "exerciseGuidance": ["..."],
    "sunlightGuidance": ["..."],
    "dailyChecklist": ["..."],
    "thisWeekFocus": "..."
  }
}`;

type GeminiInvokeResult =
  | { ok: true; response: Response; model: string }
  | { ok: false; status: number; providerMessage: string; model: string };

/**
 * Build a Gemini API request body from the OpenAI-style messages array.
 * Converts system message to systemInstruction and user messages to contents with parts.
 */
const buildGeminiPayload = (messages: any[]) => {
  let systemInstruction: any = undefined;
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: msg.content }] };
      continue;
    }

    // User message — can be string or array of parts
    if (typeof msg.content === "string") {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    } else if (Array.isArray(msg.content)) {
      const parts: any[] = [];
      for (const part of msg.content) {
        if (part.type === "text") {
          parts.push({ text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url) {
          // Extract base64 data from data URI
          const dataMatch = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
          if (dataMatch) {
            parts.push({
              inlineData: {
                mimeType: dataMatch[1],
                data: dataMatch[2],
              },
            });
          }
        }
      }
      contents.push({ role: "user", parts });
    }
  }

  const payload: any = {
    contents,
    generationConfig: {
      responseMimeType: "application/json",
    },
  };
  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }
  return payload;
};

const createGeminiRequest = async (
  apiKey: string,
  model: string,
  payload: any,
  stream: boolean
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  const action = stream ? "streamGenerateContent" : "generateContent";
  const url = `${GEMINI_API_BASE}/${model}:${action}?${stream ? "alt=sse&" : ""}key=${apiKey}`;

  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const invokeGeminiWithFallback = async (
  apiKey: string,
  messages: any[],
  models: string[],
  stream: boolean = false
): Promise<GeminiInvokeResult> => {
  const safeModels = models.filter(Boolean);
  const payload = buildGeminiPayload(messages);

  for (const [index, model] of safeModels.entries()) {
    let response: Response;

    try {
      response = await createGeminiRequest(apiKey, model, payload, stream);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }

      const canRetry = index < safeModels.length - 1;
      if (canRetry) {
        console.warn("[analyze-skin] Gemini request failed, trying fallback model", {
          failedModel: model,
          nextModel: safeModels[index + 1],
          reason: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      return {
        ok: false,
        status: 500,
        providerMessage: error instanceof Error ? error.message : "Gemini request failed",
        model,
      };
    }

    if (response.ok) {
      if (index > 0) {
        console.info("[analyze-skin] fallback model selected", { model });
      }
      return { ok: true, response, model };
    }

    const rawError = await response.text();
    const canRetry = index < safeModels.length - 1 && (response.status === 429 || response.status >= 500);

    if (canRetry) {
      console.warn("[analyze-skin] model attempt failed, trying fallback", {
        model,
        status: response.status,
        rawError: rawError.substring(0, 300),
        nextModel: safeModels[index + 1],
      });
      continue;
    }

    return {
      ok: false,
      status: response.status,
      providerMessage: rawError,
      model,
    };
  }

  return {
    ok: false,
    status: 500,
    providerMessage: "Gemini request failed after trying all fallback models.",
    model: safeModels[safeModels.length - 1] || "unknown",
  };
};

const buildGatewayFailureResponse = (status: number, providerMessage: string) => {
  if (status === 429) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (status === 400 && /unable to process input image|invalid_argument|unsupported/i.test(providerMessage)) {
    return new Response(
      JSON.stringify({ error: "The backend did not receive usable image data. Please retake or re-upload in JPG/PNG format.", details: providerMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Analysis could not be completed due to an internal processing issue.", details: providerMessage }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
};

const safeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const extractJsonCandidate = (content: unknown): Record<string, any> | null => {
  if (content && typeof content === "object") return content as Record<string, any>;
  if (typeof content !== "string") return null;

  const direct = content.trim();
  if (!direct) return null;

  try {
    return JSON.parse(direct);
  } catch {
    // Continue to fallback extractors
  }

  const fenced = direct.match(/```json\s*([\s\S]*?)```/i) || direct.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // Continue
    }
  }

  const firstBrace = direct.indexOf("{");
  const lastBrace = direct.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = direct.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sliced);
    } catch {
      return null;
    }
  }

  return null;
};

const fallbackQuestionsByArea = (bodyArea: string) => {
  const isTruncal = ["back", "chest", "shoulders"].includes(bodyArea);
  const areaLabel = bodyArea && bodyArea !== "other" ? bodyArea : "this skin area";

  return [
    {
      id: "q1",
      question: `Do you notice bloating, constipation, or loose stools when your ${areaLabel} flares up?`,
      options: ["Often", "Sometimes", "Rarely", "Never"],
    },
    {
      id: "q2",
      question: `How often do you eat sugary foods or dairy in a typical week?`,
      options: ["Daily", "3-5 times/week", "1-2 times/week", "Rarely"],
    },
    {
      id: "q3",
      question: `How are your stress and sleep lately?`,
      options: ["High stress + poor sleep", "High stress but okay sleep", "Low stress but poor sleep", "Low stress + good sleep"],
    },
    {
      id: "q4",
      question: isTruncal
        ? "After sweating, how quickly do you shower and change into clean clothing?"
        : "How gentle and consistent is your current skincare routine?",
      options: isTruncal
        ? ["Within 15 minutes", "Within 1 hour", "After several hours", "I often stay in sweaty clothes"]
        : ["Very gentle and consistent", "Mostly consistent", "Inconsistent", "Harsh or many active products"],
    },
    {
      id: "q5",
      question: "Do your breakouts or irritation change with your cycle, hormones, or new medications?",
      options: ["Yes, clear pattern", "Sometimes", "Not sure", "No"],
    },
    {
      id: "q6",
      question: "Which trigger most clearly makes this worse?",
      options: ["Stress", "Certain foods", "Sweat/friction", "No clear trigger yet"],
    },
    {
      id: "q7",
      question: isTruncal
        ? "What type of clothing usually touches the affected area during the day?"
        : "How often do you touch, pick, or rub the affected area?",
      options: isTruncal
        ? ["Breathable loose fabrics", "Mixed fabrics", "Mostly tight synthetic fabrics", "Not sure"]
        : ["Very often", "Sometimes", "Rarely", "Never"],
    },
  ];
};

const normalizeDynamicQuestions = (rawQuestions: unknown, bodyArea: string) => {
  const list = Array.isArray(rawQuestions) ? rawQuestions : [];
  const unique: Array<{ id: string; question: string; options: string[] }> = [];
  const seen = new Set<string>();

  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const question = safeString((entry as any).question);
    if (!question) continue;

    const key = question.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);

    const options = Array.isArray((entry as any).options)
      ? (entry as any).options.map((option: unknown) => safeString(option)).filter(Boolean).slice(0, 4)
      : [];

    if (options.length < 3) continue;

    unique.push({
      id: `q${unique.length + 1}`,
      question,
      options,
    });

    if (unique.length === 7) break;
  }

  if (unique.length < 7) {
    const fallback = fallbackQuestionsByArea(bodyArea);
    for (const item of fallback) {
      const key = item.question.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      unique.push({ ...item, id: `q${unique.length + 1}` });
      if (unique.length === 7) break;
    }
  }

  return unique.slice(0, 7).map((q, index) => ({ ...q, id: `q${index + 1}` }));
};

const normalizeRoutineSteps = (steps: unknown) => {
  const list = Array.isArray(steps) ? steps : [];
  return list
    .map((step) => safeString(step))
    .filter(Boolean)
    .slice(0, 8)
    .map((step, index) => `Step ${index + 1}: ${step.replace(/^step\s*\d+\s*:\s*/i, "").trim()}`);
};

const normalizeFullAnalysisFormatting = (parsed: Record<string, any>) => {
  if (!parsed || typeof parsed !== "object") return parsed;

  const healingProtocol = parsed.healingProtocol && typeof parsed.healingProtocol === "object"
    ? { ...parsed.healingProtocol }
    : {};

  healingProtocol.morningRoutine = normalizeRoutineSteps(healingProtocol.morningRoutine);
  healingProtocol.eveningRoutine = normalizeRoutineSteps(healingProtocol.eveningRoutine);

  const mealPlan = Array.isArray(healingProtocol.sevenDayMealPlan) ? healingProtocol.sevenDayMealPlan : [];
  healingProtocol.sevenDayMealPlan = Array.from({ length: 7 }, (_, index) => {
    const source = mealPlan[index] && typeof mealPlan[index] === "object" ? mealPlan[index] : {};
    return {
      day: `Day ${index + 1}`,
      breakfast: safeString((source as any).breakfast),
      lunch: safeString((source as any).lunch),
      dinner: safeString((source as any).dinner),
      snack: safeString((source as any).snack),
    };
  });

  const gutPlan = Array.isArray(healingProtocol.sevenDayGutPlan) ? healingProtocol.sevenDayGutPlan : [];
  const gutLabels = ["Days 1-2", "Days 3-4", "Days 5-6", "Day 7"];
  healingProtocol.sevenDayGutPlan = gutLabels.map((label, index) => {
    const source = gutPlan[index] && typeof gutPlan[index] === "object" ? gutPlan[index] : {};
    return {
      day: label,
      focus: safeString((source as any).focus),
    };
  });

  return {
    ...parsed,
    healingProtocol,
  };
};

/**
 * Convert Gemini SSE stream to OpenAI-compatible SSE stream.
 * The frontend expects OpenAI format: data: {"choices":[{"delta":{"content":"..."}}]}
 */
const convertGeminiStreamToOpenAIStream = (geminiBody: ReadableStream<Uint8Array>) => {
  const reader = geminiBody.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Flush remaining buffer
          if (buffer.trim()) {
            processBufferedLines(buffer, controller, encoder);
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const geminiChunk = JSON.parse(jsonStr);
            const text = geminiChunk?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const openAIChunk = {
                choices: [{ delta: { content: text } }],
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
            }
          } catch {
            // Partial JSON, ignore
          }
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
};

const processBufferedLines = (
  buffer: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) => {
  for (const raw of buffer.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
    const jsonStr = line.slice(6).trim();
    if (!jsonStr || jsonStr === "[DONE]") continue;
    try {
      const geminiChunk = JSON.parse(jsonStr);
      const text = geminiChunk?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const openAIChunk = { choices: [{ delta: { content: text } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
      }
    } catch { /* ignore */ }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestBody = await req.json();
    const { imageBase64, imagesBase64, answers, stream: shouldStream } = requestBody ?? {};
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const images: Array<{ base64: string; mimeType: string }> = [];

    const normalizeImage = (input: unknown, index: number) => {
      if (typeof input === "string") {
        const cleanedBase64 = normalizeBase64(input);
        if (!cleanedBase64) return;
        images.push({ base64: cleanedBase64, mimeType: "image/jpeg" });
        return;
      }

      if (
        input &&
        typeof input === "object" &&
        typeof (input as { base64?: unknown }).base64 === "string"
      ) {
        const candidate = input as { base64: string; mimeType?: string };
        const cleanedBase64 = normalizeBase64(candidate.base64);
        if (!cleanedBase64) return;
        images.push({
          base64: cleanedBase64,
          mimeType: normalizeMimeType(candidate.mimeType),
        });
        return;
      }

      console.warn("[analyze-skin] ignored invalid image input", { index, inputType: typeof input });
    };

    if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
      imagesBase64.forEach((entry, index) => normalizeImage(entry, index));
    } else if (imageBase64) {
      normalizeImage(imageBase64, 0);
    }

    if (images.length === 0) {
      return new Response(JSON.stringify({ error: "Images were selected, but no valid images were sent for analysis." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unusableImageIndex = images.findIndex((img) => !isValidBase64(img.base64));
    if (unusableImageIndex >= 0) {
      const unusableImage = images[unusableImageIndex];
      console.error("[analyze-skin] unusable image payload", {
        imageCount: images.length,
        imageIndex: unusableImageIndex,
        mimeType: unusableImage.mimeType,
        base64Length: unusableImage.base64?.length ?? 0,
      });
      return new Response(
        JSON.stringify({
          error: `The backend did not receive usable image data (image ${unusableImageIndex + 1}). Please retake or re-upload in JPG/PNG format.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const unsupportedImage = images.find((img) => !SUPPORTED_ANALYSIS_MIME_TYPES.has(img.mimeType));
    if (unsupportedImage) {
      const message = buildUnsupportedFormatMessage(unsupportedImage.mimeType);
      console.error("[analyze-skin] unsupported mime type", { mimeType: unsupportedImage.mimeType, imageCount: images.length });
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.info("[analyze-skin] request received", {
      imageCount: images.length,
      hasAnswers: !!answers,
      shouldStream: !!shouldStream,
      imageMeta: images.map((img, index) => ({ index, mimeType: img.mimeType, base64Length: img.base64.length })),
    });

    // Build messages in OpenAI-style format (will be converted to Gemini format by buildGeminiPayload)
    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

    const imageContentParts = images.map((img) => ({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    }));

    // Step 1: Image only - generate dynamic questions + detect body area
    if (!answers) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos together" : "this skin photo"}.

Return JSON only with exactly these fields:
- bodyArea
- visualFeatures
- dynamicQuestions

Rules:
- Detect body area first.
- Write visual features in plain language.
- Generate exactly 7 unique dynamic questions with ids q1-q7.
- Use one category per question, in this order:
  q1 gut/digestion
  q2 diet/nutrition
  q3 lifestyle/stress
  q4 skincare routine (area-specific)
  q5 hormonal/cyclical
  q6 triggers/patterns
  q7 environment/habits
- No overlapping topics.
- Each question must have 3-4 answer options.
- Questions must match what is visible and the detected body area.

Do not include any extra keys or text outside JSON.`,
          },
          ...imageContentParts,
        ],
      });
    }

    // Step 2: Full analysis with answers
    if (answers) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos together" : "this skin photo"} combined with the user's diagnostic answers below.

User's answers to diagnostic questions: ${JSON.stringify(answers)}

INSTRUCTIONS — follow every single one carefully:

1. BODY AREA: Detect the body area from the photo. All advice must be specific to that area.

2. VISUAL FEATURES: List 4-8 specific observations you can see in the photo (e.g., "scattered red papules on both cheeks", "mild post-inflammatory dark spots on chin"). Be precise and descriptive.

3. CONDITIONS: Provide 3-5 likely conditions ranked by probability (highest first). Each must include:
   - condition: the condition name
   - probability: a realistic percentage (the top condition should typically be 60-85%)
   - explanation: 2-3 sentences explaining WHY based on what you see in the photo AND the user's answers

4. ROOT CAUSES: Provide 3-5 root causes explaining WHY this is happening. Consider:
   - Barrier function, inflammation, microbial balance, hormonal patterns
   - Gut-skin connection (based on q1 answer)
   - Dietary factors (based on q2 answer)
   - Lifestyle/stress factors (based on q3 answer)
   - Skincare routine issues (based on q4 answer)
   - Hormonal factors (based on q5 answer)

5. BIOLOGICAL EXPLANATION: 2-3 sentences in plain language explaining what is happening biologically.

6. SKIN SCORE — THIS IS CRITICAL:
   - The overall score must be REALISTIC and FAIR based on what you see.
   - Mild issues (few pimples, minor dryness) = 60-75
   - Moderate issues (multiple inflamed spots, active breakouts) = 45-60
   - Severe issues (cystic acne, widespread inflammation) = 25-40
   - Do NOT give scores below 20 for common conditions like acne or eczema.
   - Each of the 5 factors (inflammation, gut_health, diet_quality, lifestyle, skin_barrier) must have a realistic score AND a specific explanation.
   - Factor scores should be based on BOTH the photo AND the user's answers to related questions.
   - Example: if user reports good sleep and low stress, lifestyle score should be 65-80.
   - Example: if user reports daily sugar and dairy, diet_quality score should be 35-50.

7. HEALING PROTOCOL: Generate the COMPLETE healingProtocol object with ALL of these fields filled with specific, actionable content:
   - whatIsHappening, morningRoutine (4-6 steps), eveningRoutine (4-6 steps)
   - weeklyTreatments, triggersToAvoid, safetyGuidance, timeline
   - foodPriorities, foodsToEat (6-8 items), foodsToAvoid (4-6 items)
   - mealTemplate, sevenDayMealPlan (exactly 7 days), mealPlanPrinciples
   - commonTriggerFoods, hydrationGuidance
   - gutExplanation, sevenDayGutPlan (4 entries: "Days 1-2", "Days 3-4", "Days 5-6", "Day 7")
   - digestiveSupport, gutCautions
   - sleepPlan, stressPlan, exerciseGuidance, sunlightGuidance
   - dailyChecklist (6-10 items), thisWeekFocus

8. FORMATTING: No asterisks. Sequential numbering. morningRoutine/eveningRoutine use "Step 1:", "Step 2:", etc.

Return the complete JSON object with ALL fields populated. Do not skip or leave any field empty.`,
          },
          ...imageContentParts,
        ],
      });
    }

    // For full analysis with answers, use streaming if requested
    if (answers && shouldStream) {
      let geminiResult: GeminiInvokeResult;
      try {
        geminiResult = await invokeGeminiWithFallback(
          GEMINI_API_KEY,
          messages,
          FULL_ANALYSIS_MODELS,
          true
        );
      } catch (geminiError) {
        const timedOut = geminiError instanceof DOMException && geminiError.name === "AbortError";
        return new Response(
          JSON.stringify({
            error: timedOut
              ? "Analysis took too long to start. Please retry with 1-2 clear photos."
              : "Analysis could not be started due to a temporary backend issue.",
          }),
          { status: timedOut ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!geminiResult.ok) {
        return buildGatewayFailureResponse(geminiResult.status, geminiResult.providerMessage);
      }

      const response = geminiResult.response;
      console.info("[analyze-skin] streaming via model", { model: geminiResult.model, messageCount: messages.length });

      if (!response.body) {
        return new Response(
          JSON.stringify({ error: "Analysis stream could not be opened. Please retry." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Convert Gemini SSE stream to OpenAI-compatible SSE stream for the frontend
      const openAIStream = convertGeminiStreamToOpenAIStream(response.body);

      return new Response(openAIStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Non-streaming path (questions step, or full analysis without stream flag)
    const selectedModels = answers ? FULL_ANALYSIS_MODELS : QUESTION_MODELS;
    console.info("[analyze-skin] calling Gemini API", { modelCandidates: selectedModels, messageCount: messages.length });

    let geminiResult: GeminiInvokeResult;
    try {
      geminiResult = await invokeGeminiWithFallback(
        GEMINI_API_KEY,
        messages,
        selectedModels,
        false
      );
    } catch (geminiError) {
      const timedOut = geminiError instanceof DOMException && geminiError.name === "AbortError";
      return new Response(
        JSON.stringify({
          error: timedOut
            ? "Analysis took too long to start. Please retry with 1-2 clear photos."
            : "Analysis could not be started due to a temporary backend issue.",
        }),
        { status: timedOut ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!geminiResult.ok) {
      if (!answers && (geminiResult.status === 429 || geminiResult.status === 403)) {
        const fallbackBodyArea = "other";
        return new Response(
          JSON.stringify({
            bodyArea: fallbackBodyArea,
            visualFeatures: [],
            dynamicQuestions: normalizeDynamicQuestions([], fallbackBodyArea),
            warning: "Question fallback mode was used because Gemini API is temporarily unavailable.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return buildGatewayFailureResponse(geminiResult.status, geminiResult.providerMessage);
    }

    console.info("[analyze-skin] model selected", { model: geminiResult.model });
    const data = await geminiResult.response.json();

    // Extract content from Gemini response format
    const content =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

    const parsedCandidate = extractJsonCandidate(content);

    if (!parsedCandidate) {
      console.error("[analyze-skin] failed to parse AI response", { raw: typeof content === "string" ? content.substring(0, 500) : content });

      if (!answers) {
        const fallbackBodyArea = "other";
        return new Response(
          JSON.stringify({
            bodyArea: fallbackBodyArea,
            visualFeatures: [],
            dynamicQuestions: normalizeDynamicQuestions([], fallbackBodyArea),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Analysis response format was invalid. Please retry with clearer photos." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: Record<string, any> = parsedCandidate;

    if (!answers) {
      const normalizedBodyArea = safeString(parsed.bodyArea || "other").toLowerCase() || "other";
      parsed = {
        bodyArea: normalizedBodyArea,
        visualFeatures: Array.isArray(parsed.visualFeatures)
          ? parsed.visualFeatures.map((item: unknown) => safeString(item)).filter(Boolean)
          : [],
        dynamicQuestions: normalizeDynamicQuestions(parsed.dynamicQuestions, normalizedBodyArea),
      };
    } else {
      parsed = normalizeFullAnalysisFormatting(parsed);
    }

    console.info("[analyze-skin] analysis completed", {
      hasConditions: Array.isArray(parsed?.conditions),
      hasQuestions: Array.isArray(parsed?.dynamicQuestions),
      questionCount: Array.isArray(parsed?.dynamicQuestions) ? parsed.dynamicQuestions.length : 0,
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-skin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
