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

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Aggressive timeouts: 15s per-model attempt, 120s overall
const PER_MODEL_TIMEOUT_MS = 15000;
const GATEWAY_TIMEOUT_MS = 120000;

// Flash-first model chains for speed
const QUESTION_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const FULL_ANALYSIS_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];

const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SYSTEM_PROMPT = `You are SkinHeal AI — an advanced skin wellness system combining dermatology, functional medicine, nutrition, and gut-health expertise.

CORE RULES:
- NEVER diagnose. Use "consistent with", "likely suggests", "may indicate".
- ROOT CAUSES over symptom management.
- Explain biology in clear language.
- Never use asterisks in output.
- PRODUCT RULE: Start with zero products. Only add ONE maximum in Evening Routine if nutrition/gut/sleep/stress cannot address the issue.

BODY AREA DETECTION (MANDATORY FIRST STEP):
Detect body area: "face", "forehead", "cheeks", "nose", "chin", "neck", "chest", "shoulders", "back", "arms", "legs", "scalp", "hands", "other"

CLINICAL PATTERN RECOGNITION:
Morphology, distribution, inflammation, scarring, barrier function, sebaceous activity, microbiome, hormonal markers, gut-skin axis.

ROOT-CAUSE FRAMEWORK (7 areas):
1. Gut-skin axis  2. Inflammatory cascade  3. Hormonal factors  4. Nutritional deficiencies  5. Barrier dysfunction  6. Microbiome imbalance  7. Lifestyle triggers

SKIN SCORE (0-100, 100=optimal):
Mild: 50-75, Moderate: 40-60, Severe: 25-45. Floor: 15. Common conditions minimum 35. Reference specific observations.

QUESTION RULES:
- Exactly 5 questions, each ONE sentence max
- Each answer option: 5-7 words max, clean and scannable
- Q1: gut/digestion  Q2: diet  Q3: hormones/stress  Q4: skincare routine  Q5: lifestyle trigger
- Each must feel triggered by what is visible in the photo

OUTPUT JSON — return exactly this structure:
{
  "bodyArea": "string",
  "visualFeatures": ["observation 1", "observation 2", "observation 3"],
  "dynamicQuestions": [
    {"id": "q1", "question": "One sentence gut question?", "options": ["5-7 words", "5-7 words", "5-7 words"]},
    {"id": "q2", "question": "One sentence diet question?", "options": ["5-7 words", "5-7 words", "5-7 words"]},
    {"id": "q3", "question": "One sentence hormonal/stress question?", "options": ["5-7 words", "5-7 words", "5-7 words"]},
    {"id": "q4", "question": "One sentence skincare question?", "options": ["5-7 words", "5-7 words", "5-7 words"]},
    {"id": "q5", "question": "One sentence lifestyle question?", "options": ["5-7 words", "5-7 words", "5-7 words"]}
  ],
  "conditions": [{"condition": "Name", "probability": 74, "explanation": "Clinical reasoning with visual evidence"}],
  "rootCauses": [{"title": "Root Cause", "description": "Mechanistic explanation"}],
  "biologicalExplanation": "3-4 sentence expert explanation of what is happening biologically.",
  "skinScore": {
    "overall": 62,
    "factors": {
      "inflammation": {"score": 72, "explanation": "Observation-based"},
      "gut_health": {"score": 58, "explanation": "Tied to answers"},
      "diet_quality": {"score": 65, "explanation": "Based on diet"},
      "lifestyle": {"score": 70, "explanation": "Based on habits"},
      "skin_barrier": {"score": 60, "explanation": "Visual assessment"}
    }
  },
  "healingProtocol": {
    "whatIsHappening": "3-4 sentence summary",
    "morningRoutine": ["Step with reason", "Step with reason", "Step with reason"],
    "eveningRoutine": ["Step with reason", "Step with reason", "Step with reason"],
    "weeklyTreatments": ["Treatment with reasoning"],
    "triggersToAvoid": ["Trigger with mechanism"],
    "safetyGuidance": "When to seek professional help",
    "timeline": "Realistic healing timeline",
    "foodPriorities": ["Nutrition principle"],
    "foodsToEat": [{"food": "Name", "reason": "Mechanism"}],
    "foodsToAvoid": [{"food": "Name", "reason": "Mechanism"}],
    "mealTemplate": {"breakfast": "meal", "lunch": "meal", "dinner": "meal", "snack": "snack"},
    "sevenDayMealPlan": [{"day": "Day 1", "breakfast": "meal", "lunch": "meal", "dinner": "meal", "snack": "snack"}],
    "mealPlanPrinciples": ["principle"],
    "commonTriggerFoods": [{"food": "Name", "approach": "Protocol"}],
    "hydrationGuidance": "Strategy",
    "gutExplanation": "3-4 sentence gut-skin connection",
    "sevenDayGutPlan": [{"day": "Days 1-2", "focus": "Actions"}],
    "digestiveSupport": ["Strategy"],
    "gutCautions": "Cautions",
    "sleepPlan": ["Action"],
    "stressPlan": ["Technique"],
    "exerciseGuidance": ["Recommendation"],
    "sunlightGuidance": ["Guidance"],
    "dailyChecklist": ["Habit 1", "Habit 2", "Habit 3", "Habit 4", "Habit 5"],
    "thisWeekFocus": "One specific focus for next 7 days"
  }
}`;

type GeminiInvokeResult =
  | { ok: true; response: Response; model: string }
  | { ok: false; status: number; providerMessage: string; model: string };

const buildGeminiPayload = (messages: any[]) => {
  let systemInstruction: any = undefined;
  const contents: any[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: msg.content }] };
      continue;
    }

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
      temperature: 0.7,
      topP: 0.95,
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
  stream: boolean,
  timeoutMs: number = PER_MODEL_TIMEOUT_MS
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
  stream: boolean = false,
  perModelTimeout: number = PER_MODEL_TIMEOUT_MS
): Promise<GeminiInvokeResult> => {
  const safeModels = models.filter(Boolean);
  const payload = buildGeminiPayload(messages);
  let lastResult: GeminiInvokeResult | null = null;

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    if (retry > 0) {
      const delay = RETRY_DELAYS[retry - 1] || 2000;
      console.info("[analyze-skin] retry attempt", { retry, delayMs: delay });
      await sleep(delay);
    }

    for (const [index, model] of safeModels.entries()) {
      let response: Response;

      try {
        response = await createGeminiRequest(apiKey, model, payload, stream, perModelTimeout);
      } catch (error) {
        const isTimeoutAbort = error instanceof DOMException && error.name === "AbortError";
        const reason = isTimeoutAbort
          ? `Timed out after ${perModelTimeout}ms`
          : error instanceof Error ? error.message : String(error);

        console.warn("[analyze-skin] model timed out or failed, trying next", {
          failedModel: model,
          reason,
          nextModel: safeModels[index + 1] || "none",
        });

        const canFallback = index < safeModels.length - 1;
        if (canFallback) continue;

        lastResult = {
          ok: false,
          status: isTimeoutAbort ? 504 : 500,
          providerMessage: reason,
          model,
        };
        break;
      }

      if (response.ok) {
        if (index > 0 || retry > 0) {
          console.info("[analyze-skin] model selected after fallback", { model, retry, attemptIndex: index });
        }
        return { ok: true, response, model };
      }

      const rawError = await response.text();
      const isRetryable = response.status === 429 || response.status >= 500;
      const canFallback = index < safeModels.length - 1;

      if (canFallback) {
        console.warn("[analyze-skin] model failed, trying fallback", {
          model,
          status: response.status,
          nextModel: safeModels[index + 1],
        });
        continue;
      }

      lastResult = {
        ok: false,
        status: response.status,
        providerMessage: rawError,
        model,
      };

      if (isRetryable) break;
      return lastResult;
    }
  }

  return lastResult || {
    ok: false,
    status: 500,
    providerMessage: "All models failed after retries.",
    model: safeModels[safeModels.length - 1] || "unknown",
  };
};

const buildGatewayFailureResponse = (status: number, providerMessage: string) => {
  console.error("[analyze-skin] gateway failure", { status, providerMessage: providerMessage?.substring(0, 500) });

  if (status === 429) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (status === 504) {
    return new Response(
      JSON.stringify({ error: "Analysis timed out. Please retry with 1-2 clear photos." }),
      { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (status === 400 && /unable to process input image|invalid_argument|unsupported/i.test(providerMessage)) {
    return new Response(
      JSON.stringify({ error: "Image could not be processed. Please retake in JPG/PNG format." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Analysis could not be completed. Please try again." }),
    { status: status >= 400 && status < 600 ? status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
};

const safeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const repairJson = (raw: string): string => {
  let fixed = raw;
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");
  fixed = fixed.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
  return fixed;
};

const extractJsonCandidate = (content: unknown): Record<string, any> | null => {
  if (content && typeof content === "object") return content as Record<string, any>;
  if (typeof content !== "string") return null;

  const direct = content.trim();
  if (!direct) return null;

  try { return JSON.parse(direct); } catch { /* continue */ }

  const fenced = direct.match(/```json\s*([\s\S]*?)```/i) || direct.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* continue */ }
    try { return JSON.parse(repairJson(fenced[1].trim())); } catch { /* continue */ }
  }

  const firstBrace = direct.indexOf("{");
  const lastBrace = direct.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = direct.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(sliced); } catch { /* continue */ }
    try { return JSON.parse(repairJson(sliced)); } catch { return null; }
  }

  return null;
};

const fallbackQuestionsByArea = (bodyArea: string) => {
  const isTruncal = ["back", "chest", "shoulders"].includes(bodyArea);
  const areaLabel = bodyArea && bodyArea !== "other" ? bodyArea : "skin";

  return [
    {
      id: "q1",
      question: `Do you notice bloating or gut issues when your ${areaLabel} flares up?`,
      options: ["Yes, often", "Sometimes", "Rarely or never"],
    },
    {
      id: "q2",
      question: "How often do you eat dairy or sugary foods?",
      options: ["Daily", "Few times a week", "Rarely"],
    },
    {
      id: "q3",
      question: "How are your stress and sleep levels?",
      options: ["High stress, poor sleep", "Moderate", "Low stress, good sleep"],
    },
    {
      id: "q4",
      question: isTruncal
        ? "How soon after sweating do you shower?"
        : "How would you describe your skincare routine?",
      options: isTruncal
        ? ["Within 15 minutes", "Within an hour", "Several hours later"]
        : ["Gentle and consistent", "Inconsistent", "Harsh or many products"],
    },
    {
      id: "q5",
      question: "Which trigger most clearly worsens this?",
      options: ["Stress or poor sleep", "Certain foods", "Sweat or friction"],
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

    unique.push({ id: `q${unique.length + 1}`, question, options });
    if (unique.length === 5) break;
  }

  if (unique.length < 5) {
    const fallback = fallbackQuestionsByArea(bodyArea);
    for (const item of fallback) {
      const key = item.question.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      unique.push({ ...item, id: `q${unique.length + 1}` });
      if (unique.length === 5) break;
    }
  }

  return unique.slice(0, 5).map((q, index) => ({ ...q, id: `q${index + 1}` }));
};

const normalizeRoutineSteps = (steps: unknown) => {
  const list = Array.isArray(steps) ? steps : [];
  return list
    .map((step) => safeString(step))
    .filter(Boolean)
    .slice(0, 5)
    .map((step, index) => `Step ${index + 1}: ${step.replace(/^step\s*\d+\s*:\s*/i, "").trim()}`);
};

const normalizeFullAnalysisFormatting = (parsed: Record<string, any>) => {
  if (!parsed || typeof parsed !== "object") return parsed;

  const healingProtocol = parsed.healingProtocol && typeof parsed.healingProtocol === "object"
    ? { ...parsed.healingProtocol }
    : {};

  healingProtocol.morningRoutine = normalizeRoutineSteps(healingProtocol.morningRoutine);
  healingProtocol.eveningRoutine = normalizeRoutineSteps(healingProtocol.eveningRoutine);

  const DEFAULT_MEALS: Record<string, { breakfast: string; lunch: string; dinner: string; snack: string }> = {
    "Day 1": {
      breakfast: "Anti-inflammatory smoothie with blueberries, spinach, flaxseed, walnuts, and almond milk",
      lunch: "Grilled wild salmon over greens with avocado, cucumber, pumpkin seeds, olive oil",
      dinner: "Bone broth soup with turmeric, ginger, garlic, zucchini, and chicken",
      snack: "Raw almonds with a green apple",
    },
    "Day 2": {
      breakfast: "Overnight oats with chia seeds, cinnamon, banana, raw honey",
      lunch: "Turkey avocado lettuce wraps with carrot, cabbage, tahini",
      dinner: "Baked cod with sweet potato, steamed broccoli, lemon dressing",
      snack: "Celery sticks with almond butter",
    },
    "Day 3": {
      breakfast: "Scrambled eggs with spinach, mushrooms, avocado on gluten-free toast",
      lunch: "Quinoa bowl with chickpeas, roasted pepper, kale, lemon-tahini",
      dinner: "Grass-fed beef stir-fry with bok choy, snap peas, ginger, cauliflower rice",
      snack: "Fresh berries with walnuts",
    },
    "Day 4": {
      breakfast: "Green smoothie with kale, mango, ginger, turmeric, collagen peptides",
      lunch: "Sardines on gluten-free crackers with arugula, tomatoes, olive oil",
      dinner: "Slow-cooked chicken with roasted root vegetables and rosemary",
      snack: "Cucumber slices with hummus",
    },
    "Day 5": {
      breakfast: "Buckwheat pancakes with strawberries, maple syrup, hemp seeds",
      lunch: "Grilled chicken salad with walnuts, cranberries, fennel, ACV dressing",
      dinner: "Wild shrimp with zucchini noodles, tomatoes, basil, garlic in olive oil",
      snack: "Dark chocolate (85%+) with Brazil nuts",
    },
    "Day 6": {
      breakfast: "Savory oatmeal with poached egg, kale, nutritional yeast, pumpkin seeds",
      lunch: "Lentil soup with carrots, celery, turmeric, side of sauerkraut",
      dinner: "Baked salmon with asparagus, roasted garlic, side of kimchi",
      snack: "Frozen grapes with macadamia nuts",
    },
    "Day 7": {
      breakfast: "Coconut yogurt parfait with granola, berries, flaxseed, manuka honey",
      lunch: "Mediterranean bowl with falafel, tabbouleh, hummus, cucumber, greens",
      dinner: "Herb-crusted chicken with Brussels sprouts, sweet potato mash",
      snack: "Rice cakes with avocado",
    },
  };

  const mealPlan = Array.isArray(healingProtocol.sevenDayMealPlan) ? healingProtocol.sevenDayMealPlan : [];
  healingProtocol.sevenDayMealPlan = Array.from({ length: 7 }, (_, index) => {
    const dayLabel = `Day ${index + 1}`;
    const source = mealPlan[index] && typeof mealPlan[index] === "object" ? mealPlan[index] : {};
    const defaults = DEFAULT_MEALS[dayLabel] || DEFAULT_MEALS["Day 1"];
    return {
      day: dayLabel,
      breakfast: safeString((source as any).breakfast) || defaults.breakfast,
      lunch: safeString((source as any).lunch) || defaults.lunch,
      dinner: safeString((source as any).dinner) || defaults.dinner,
      snack: safeString((source as any).snack) || defaults.snack,
    };
  });

  const gutPlan = Array.isArray(healingProtocol.sevenDayGutPlan) ? healingProtocol.sevenDayGutPlan : [];
  const gutLabels = ["Days 1-2", "Days 3-4", "Days 5-6", "Day 7"];
  healingProtocol.sevenDayGutPlan = gutLabels.map((label, index) => {
    const source = gutPlan[index] && typeof gutPlan[index] === "object" ? gutPlan[index] : {};
    return { day: label, focus: safeString((source as any).focus) };
  });

  // Validate skin scores
  const skinScore = parsed.skinScore && typeof parsed.skinScore === "object" ? { ...parsed.skinScore } : {};
  
  if (typeof skinScore.overall === "number") {
    skinScore.overall = Math.max(15, Math.min(100, Math.round(skinScore.overall)));
    if (skinScore.overall < 25 && Array.isArray(parsed.conditions)) {
      const hasOnlyCommonConditions = parsed.conditions.every((c: any) => {
        const name = (c?.condition || "").toLowerCase();
        return /acne|eczema|dermatitis|rosacea|dryness|hyperpigmentation|folliculitis|keratosis|psoriasis/.test(name);
      });
      if (hasOnlyCommonConditions) skinScore.overall = Math.max(35, skinScore.overall);
    }
  } else {
    skinScore.overall = 55;
  }

  if (skinScore.factors && typeof skinScore.factors === "object") {
    for (const key of ["inflammation", "gut_health", "diet_quality", "lifestyle", "skin_barrier"]) {
      if (skinScore.factors[key] && typeof skinScore.factors[key] === "object") {
        const factor = skinScore.factors[key];
        factor.score = typeof factor.score === "number" ? Math.max(15, Math.min(100, Math.round(factor.score))) : skinScore.overall;
        if (!factor.explanation || typeof factor.explanation !== "string") factor.explanation = "";
      } else {
        skinScore.factors[key] = { score: skinScore.overall, explanation: "" };
      }
    }
  } else {
    skinScore.factors = Object.fromEntries(
      ["inflammation", "gut_health", "diet_quality", "lifestyle", "skin_barrier"].map(k => [k, { score: skinScore.overall, explanation: "" }])
    );
  }

  return { ...parsed, healingProtocol, skinScore };
};

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
          if (buffer.trim()) processBufferedLines(buffer, controller, encoder);
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const geminiChunk = JSON.parse(jsonStr);
            const text = geminiChunk?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            }
          } catch { /* partial JSON, ignore */ }
        }
      }
    },
    cancel() { reader.cancel(); },
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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
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
      if (input && typeof input === "object" && typeof (input as { base64?: unknown }).base64 === "string") {
        const candidate = input as { base64: string; mimeType?: string };
        const cleanedBase64 = normalizeBase64(candidate.base64);
        if (!cleanedBase64) return;
        images.push({ base64: cleanedBase64, mimeType: normalizeMimeType(candidate.mimeType) });
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
      return new Response(JSON.stringify({ error: "No valid images were sent for analysis." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validImages = images.filter((img) => {
      if (!isValidBase64(img.base64)) return false;
      if (!SUPPORTED_ANALYSIS_MIME_TYPES.has(img.mimeType)) return false;
      return true;
    });

    if (validImages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Images could not be processed. Please retake in JPG/PNG format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    images.length = 0;
    images.push(...validImages);

    console.info("[analyze-skin] request received", {
      imageCount: images.length,
      hasAnswers: !!answers,
      shouldStream: !!shouldStream,
      imageMeta: images.map((img, index) => ({ index, mimeType: img.mimeType, base64Length: img.base64.length })),
    });

    // --- NSFW / Content Moderation Check ---
    if (!answers) {
      const moderationImageParts = images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      }));

      const moderationPayload = {
        contents: [{
          role: "user",
          parts: [
            { text: `Content moderation for skin health app. ACCEPT: skin photos, body parts with skin concerns. REJECT: explicit sexual content, non-skin images. Respond ONLY: {"appropriate": true} or {"appropriate": false, "reason": "brief reason"}` },
            ...moderationImageParts,
          ],
        }],
        generationConfig: { temperature: 0.1, topP: 0.8 },
      };

      try {
        const moderationResponse = await createGeminiRequest(GEMINI_API_KEY, QUESTION_MODELS[0], moderationPayload, false, 8000);
        if (moderationResponse.ok) {
          const moderationResult = await moderationResponse.json();
          const moderationText = moderationResult?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const moderationJson = extractJsonCandidate(moderationText);
          if (moderationJson && moderationJson.appropriate === false) {
            return new Response(
              JSON.stringify({ error: "Please upload a clear photo of your skin for analysis.", moderationRejected: true }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.warn("[analyze-skin] moderation check failed, proceeding");
        }
      } catch (moderationError) {
        console.warn("[analyze-skin] moderation error, proceeding", moderationError);
      }
    }

    // Build messages
    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

    const imageContentParts = images.map((img) => ({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    }));

    // Step 1: Generate questions
    if (!answers) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos" : "this skin photo"} with clinical precision.

1. Detect body area.
2. List key visual features (3-5 observations).
3. Generate exactly 5 diagnostic questions. Rules:
   - Each question: ONE sentence maximum
   - Each answer option: 5-7 words maximum, clean and tappable
   - Q1: gut/digestion linked to what you see
   - Q2: specific dietary triggers for this morphology
   - Q3: hormonal/stress based on distribution pattern
   - Q4: skincare habits that could cause what you see
   - Q5: lifestyle trigger most relevant to this presentation
   - Each question must feel photo-specific, not generic

Return ONLY JSON with bodyArea, visualFeatures, dynamicQuestions. No other text.`,
          },
          ...imageContentParts,
        ],
      });
    }

    // Step 2: Full analysis
    if (answers) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos" : "this skin photo"} with the user's answers for a complete skin analysis.

User's answers: ${JSON.stringify(answers)}

Requirements:
- Detect body area, all recommendations body-area specific
- Reference actual visual observations, never fabricate
- Provide biological mechanisms (NF-kB, IGF-1, mTORC1, zonulin etc)
- 3-5 conditions ranked by probability
- All 7 root causes explored
- Complete 7-day meal plan, all days different, all meals populated
- Gut health explanation and 7-day gut plan
- Skin scores realistic (mild 50-75, severe 25-45, floor 15, common conditions min 35)
- Daily checklist: 5 items, highest impact first
- PRODUCT RULE: Zero products default. ONE max in Evening Routine only if absolutely necessary
- Never use asterisks
- Keep explanations concise but specific

OUTPUT ORDER for streaming: bodyArea, skinScore, conditions, rootCauses, biologicalExplanation, healingProtocol

Return complete JSON with ALL fields populated.`,
          },
          ...imageContentParts,
        ],
      });
    }

    // Streaming path for full analysis
    if (answers && shouldStream) {
      let geminiResult: GeminiInvokeResult;
      try {
        geminiResult = await invokeGeminiWithFallback(GEMINI_API_KEY, messages, FULL_ANALYSIS_MODELS, true, PER_MODEL_TIMEOUT_MS);
      } catch (geminiError) {
        const timedOut = geminiError instanceof DOMException && geminiError.name === "AbortError";
        return new Response(
          JSON.stringify({ error: timedOut ? "Analysis timed out. Please retry." : "Analysis could not be started." }),
          { status: timedOut ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!geminiResult.ok) return buildGatewayFailureResponse(geminiResult.status, geminiResult.providerMessage);

      console.info("[analyze-skin] streaming via model", { model: geminiResult.model, messageCount: messages.length });

      if (!geminiResult.response.body) {
        return new Response(
          JSON.stringify({ error: "Stream could not be opened. Please retry." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const openAIStream = convertGeminiStreamToOpenAIStream(geminiResult.response.body);
      return new Response(openAIStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Non-streaming path (questions)
    const selectedModels = answers ? FULL_ANALYSIS_MODELS : QUESTION_MODELS;
    console.info("[analyze-skin] calling Gemini API", { modelCandidates: selectedModels, messageCount: messages.length });

    let geminiResult: GeminiInvokeResult;
    try {
      geminiResult = await invokeGeminiWithFallback(GEMINI_API_KEY, messages, selectedModels, false);
    } catch (geminiError) {
      const timedOut = geminiError instanceof DOMException && geminiError.name === "AbortError";
      return new Response(
        JSON.stringify({ error: timedOut ? "Analysis timed out. Please retry." : "Analysis could not be started." }),
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
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return buildGatewayFailureResponse(geminiResult.status, geminiResult.providerMessage);
    }

    console.info("[analyze-skin] model selected", { model: geminiResult.model });
    const data = await geminiResult.response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
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
        JSON.stringify({ error: "Analysis response was invalid. Please retry." }),
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
