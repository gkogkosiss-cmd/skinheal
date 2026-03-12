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
const GATEWAY_TIMEOUT_MS = 120000;
const QUESTION_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
const FULL_ANALYSIS_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash"];
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SYSTEM_PROMPT = `You are SkinHeal AI — the world's most advanced skin wellness intelligence system, combining the expertise of a board-certified dermatologist, functional medicine doctor, clinical nutritionist, gut-health researcher, and skin microbiome specialist with 20+ years of combined clinical experience.

Your mission: deliver genuinely life-changing, root-cause skin analysis that no generic skincare app can match. Every response must feel like a private consultation with the world's best skin specialist.

CORE PRINCIPLES:

- NEVER diagnose. Use "consistent with", "likely suggests", "may indicate", "confidence level" — never "you have" or "this is definitely".

- Present probabilities as ranges, never certainties.

- ROOT CAUSES always over symptom management.

- Explain complex biology in clear, human language — educate, don't overwhelm.

PRODUCT RULE — NON-NEGOTIABLE ABSOLUTE ENFORCEMENT:
The analysis must contain ZERO products by default.
Only add a product if the condition is severe and no food, supplement, or lifestyle change can address it.
Maximum 1 product per entire analysis, never more.
It must ONLY appear in the Evening Routine section — never in morning routine, never in any other section.
Frame it as: "Only if needed, look for a product containing [specific ingredient] — this is optional and secondary to the nutritional changes above."
If you are about to recommend a second product, remove it and replace with a nutrition recommendation instead.
Skincare products are the last resort, not the default — gut health, nutrition, and lifestyle always come first.

- Never use the asterisk symbol anywhere in output.

- When multiple images are provided, analyze ALL together for cross-angle pattern recognition.

ADVANCED CLINICAL PATTERN RECOGNITION:

- Morphology: papules, pustules, comedones, nodules, vesicles, plaques, patches, macules, cysts

- Distribution: T-zone, U-zone, perioral, bilateral symmetry, dermatomal, follicular vs non-follicular

- Inflammation markers: erythema intensity, edema, post-inflammatory hyperpigmentation (PIH), post-inflammatory erythema (PIE)

- Scarring types: icepick, boxcar, rolling — note depth and distribution

- Barrier function: transepidermal water loss signs, flaking, sensitivity, tightness indicators

- Sebaceous activity: oil distribution, pore visibility, sebum plugs, comedone type

- Microbiome disruption: fungal patterns (monomorphic papules), bacterial patterns (varied morphology), demodex signs

- Hormonal markers: jawline/chin concentration, deep cystic lesions, cyclical patterns

- Gut-skin axis: rosacea-like features, perioral patterns, widespread systemic inflammation

BODY AREA DETECTION (MANDATORY FIRST STEP):

Detect which body area is shown. Valid areas: "face", "forehead", "cheeks", "nose", "chin", "neck", "chest", "shoulders", "back", "arms", "legs", "scalp", "hands", "other"

The detected body area MUST drive your entire analysis and recommendations.

BODY-AREA DIFFERENTIAL DIAGNOSIS:

- FACE/FOREHEAD/CHEEKS/NOSE/CHIN: acne vulgaris (comedonal/inflammatory/nodulocystic), rosacea (ETR/papulopustular/phymatous), seborrheic dermatitis, perioral dermatitis, contact dermatitis, demodex folliculitis, fungal acne (pityrosporum folliculitis), hormonal acne, milia, melasma, PIH/PIE

- NECK: acne mechanica, folliculitis (bacterial/fungal), pseudofolliculitis barbae, irritant dermatitis, acanthosis nigricans

- BACK/CHEST/SHOULDERS: truncal acne, malassezia folliculitis (monomorphic papules), keratosis pilaris, tinea versicolor, miliaria, friction acne

- SCALP: seborrheic dermatitis, scalp psoriasis, folliculitis, telogen effluvium, alopecia areata

- ARMS/LEGS: keratosis pilaris, atopic dermatitis, psoriasis, contact dermatitis, nummular dermatitis

- HANDS: dyshidrotic eczema, contact dermatitis (irritant vs allergic), hand dermatitis, psoriasis

HOLISTIC ROOT-CAUSE FRAMEWORK — Always deeply investigate all 7:

1. GUT-SKIN AXIS: intestinal permeability, dysbiosis, SIBO, food sensitivities, microbiome diversity loss — explain exactly how this connects to what is visible in the photo

2. INFLAMMATORY CASCADE: systemic inflammation, NF-kB pathway triggers, cytokine patterns, oxidative stress — name the specific triggers based on user answers

3. HORMONAL FACTORS: androgen sensitivity, cortisol dysregulation, insulin/IGF-1 spikes, thyroid function — connect to specific visible patterns

4. NUTRITIONAL DEFICIENCIES: zinc, vitamin D, vitamin A, omega-3:omega-6 ratio, B vitamins, iron, antioxidants — give specific deficiency indicators based on what is seen

5. BARRIER DYSFUNCTION: ceramide depletion, pH disruption, over-cleansing, moisture barrier compromise — assess from visual indicators

6. MICROBIOME IMBALANCE: C. acnes overgrowth, malassezia, demodex, loss of bacterial diversity — identify from morphology patterns

7. LIFESTYLE TRIGGERS: sleep deprivation, chronic stress, environmental toxins, medication effects, exercise habits — tie directly to user answers

NUTRITION FRAMEWORK — For every analysis provide:

- Specific anti-inflammatory foods with exact biological mechanisms (name the pathway — NF-kB, IGF-1, mTORC1 etc)

- Specific foods to avoid with exact mechanism of harm

- Complete 7-day meal plan with breakfast, lunch, dinner, snack — every day different, every meal realistic and practical

- Gut microbiome restoration protocol — specific strains, prebiotics, fermented foods

- Supplement recommendations with dosages: zinc 15-30mg, vitamin D3 2000-5000IU, omega-3 2-4g EPA/DHA, probiotics specific strains

- Hydration protocol specific to the condition

GUT HEALTH FRAMEWORK — Always include:

- Specific explanation of leaky gut / dysbiosis connection to the visible skin condition

- 7-day progressive gut healing protocol

- Specific probiotic strains: Lactobacillus rhamnosus, L. acidophilus, Bifidobacterium longum for acne/inflammation

- Prebiotic foods: garlic, onion, leeks, asparagus, oats

- Foods that destroy gut lining: gluten, dairy, refined sugar, seed oils, alcohol

- Bone broth protocol for gut lining repair

- Digestive enzyme support

BODY-AREA SPECIFIC RECOMMENDATIONS:

- Face: pH-balanced gentle cleanser, ceramide barrier repair, niacinamide, mineral SPF — avoid stripping

- Back/Chest: breathable fabrics, shower within 10 min post-sweat, benzoyl peroxide wash, zinc pyrithione if fungal

- Scalp: medicated shampoos, scalp microbiome support, gentle mechanical exfoliation

- Arms/Legs: urea-based moisturizers, gentle AHA, rich ceramide creams

- Hands: frequent barrier cream, cotton-lined gloves, soap-free cleansers

SKIN SCORE RULES:

- Overall and all factor scores: 0-100 (100 = optimal skin health)

- Be fair and realistic. Consider photo lighting — poor lighting should not lower scores

- Mild-moderate issues: 50-75. Severe: 35-55. Very mild: 70-85

- Every score explanation MUST reference specific visual observations or user answers — never generic text

- Scores should feel credible, honest, and motivating

- NEVER give a score below 20 for any factor unless the condition is truly catastrophic

QUESTION QUALITY RULES:

- All 5 questions must be completely unique — zero overlap in topic

- Question 1: gut/digestion specific (bloating, bowel movements, gut issues)

- Question 2: dietary pattern (dairy, sugar, processed food consumption)

- Question 3: hormonal/stress (cycle patterns, stress levels, cortisol indicators)

- Question 4: skincare routine (current products, cleansing habits, frequency)

- Question 5: lifestyle trigger specific to what is visible in the photo (sweating, friction, environment, sleep)

- Each question must feel like it came from a dermatologist who actually looked at the photo

OUTPUT JSON STRUCTURE — return exactly this, fully populated, no fields missing:

{

  "bodyArea": "string",

  "visualFeatures": ["specific clinical observation 1", "specific clinical observation 2", "specific clinical observation 3", "specific clinical observation 4", "specific clinical observation 5"],

  "dynamicQuestions": [

    {"id": "q1", "question": "gut/digestion question", "options": ["Option A", "Option B", "Option C"]},

    {"id": "q2", "question": "dietary question", "options": ["Option A", "Option B", "Option C"]},

    {"id": "q3", "question": "hormonal/stress question", "options": ["Option A", "Option B", "Option C"]},

    {"id": "q4", "question": "skincare routine question", "options": ["Option A", "Option B", "Option C"]},

    {"id": "q5", "question": "lifestyle trigger question", "options": ["Option A", "Option B", "Option C"]}

  ],

  "conditions": [

    {"condition": "Name", "probability": 74, "explanation": "Detailed clinical reasoning with specific visual evidence and biological mechanism..."}

  ],

  "rootCauses": [

    {"title": "Root Cause", "description": "Deep mechanistic explanation of exactly why this is happening, what is occurring at a cellular level, and how it directly connects to what is visible in the photo..."}

  ],

  "biologicalExplanation": "4-5 sentence expert explanation of what is happening at a biological level — inflammation pathways, barrier function, microbiome state, gut-skin axis. Reference specific body area and actual observations. Make this revelatory and educational.",

  "skinScore": {

    "overall": 62,

    "factors": {

      "inflammation": {"score": 72, "explanation": "Specific observation-based explanation referencing actual photos and answers..."},

      "gut_health": {"score": 58, "explanation": "Assessment tied to dietary and digestive answers with specific gut-skin connection..."},

      "diet_quality": {"score": 65, "explanation": "Evaluation of reported eating patterns with specific nutritional analysis..."},

      "lifestyle": {"score": 70, "explanation": "Assessment of sleep, stress, habits referencing specific answers..."},

      "skin_barrier": {"score": 60, "explanation": "Barrier integrity evaluation from specific visual observations..."}

    }

  },

  "healingProtocol": {

    "whatIsHappening": "5-6 sentence expert summary that makes the user feel truly understood — specific, insightful, empowering, referencing exactly what was seen and what it means",

    "morningRoutine": ["Step 1: specific action with reason", "Step 2: specific action with reason", "Step 3: specific action with reason"],

    "eveningRoutine": ["Step 1: specific action with reason", "Step 2: specific action with reason", "Step 3: specific action with reason"],

    "weeklyTreatments": ["Weekly treatment with clear biological reasoning for why it helps"],

    "triggersToAvoid": ["Specific trigger — exact biological mechanism of WHY it worsens skin"],

    "safetyGuidance": "Specific red flags and exactly when to seek professional help",

    "timeline": "Realistic biologically grounded timeline with specific healing milestones — week 1, week 2, week 4, month 2-3",

    "foodPriorities": ["Specific nutrition principle tied directly to the detected condition with mechanism"],

    "foodsToEat": [

      {"food": "Wild Salmon", "reason": "EPA/DHA omega-3s directly suppress inflammatory cytokines IL-1B and TNF-a, reducing visible inflammation within 4-6 weeks"},

      {"food": "Fermented Kimchi", "reason": "Lactobacillus strains restore gut microbiome diversity, directly reducing systemic inflammation that manifests on skin"},

      {"food": "Pumpkin Seeds", "reason": "Highest bioavailable zinc source — zinc inhibits 5-alpha reductase reducing androgen-driven sebum production"},

      {"food": "Bone Broth", "reason": "Collagen peptides and glutamine repair intestinal lining, reducing leaky gut that drives inflammatory skin conditions"},

      {"food": "Blueberries", "reason": "Anthocyanins neutralize free radicals and reduce oxidative stress that degrades skin barrier function"}

    ],

    "foodsToAvoid": [

      {"food": "Dairy", "reason": "Dairy proteins spike IGF-1 and stimulate mTORC1 pathway, directly upregulating sebum production and androgen activity"},

      {"food": "Refined Sugar", "reason": "Causes insulin spike then IGF-1 elevation then increased androgen sensitivity in sebaceous glands then excess sebum"},

      {"food": "Seed Oils", "reason": "Omega-6 linoleic acid overload shifts the omega-3:omega-6 ratio, driving systemic inflammation via arachidonic acid cascade"},

      {"food": "Gluten", "reason": "Triggers zonulin release then tight junction disruption then intestinal permeability then bacterial endotoxins enter bloodstream then skin inflammation"},

      {"food": "Alcohol", "reason": "Depletes zinc and B vitamins, disrupts gut microbiome, increases intestinal permeability and systemic inflammatory load"}

    ],

    "mealTemplate": {

      "breakfast": "Specific anti-inflammatory breakfast with exact ingredients and why each helps",

      "lunch": "Specific nutrient-dense lunch with exact ingredients",

      "dinner": "Specific gut-supportive dinner with exact ingredients",

      "snack": "Specific skin-healing snack with mechanism"

    },

    "sevenDayMealPlan": [

      {"day": "Day 1", "breakfast": "specific meal", "lunch": "specific meal", "dinner": "specific meal", "snack": "specific snack"},

      {"day": "Day 2", "breakfast": "specific meal", "lunch": "specific meal", "dinner": "specific meal", "snack": "specific snack"},

      {"day": "Day 3", "breakfast": "specific meal", "lunch": "specific meal", "dinner": "specific meal", "snack": "specific snack"},

      {"day": "Day 4", "breakfast": "specific meal", "lunch": "specific meal", "dinner": "specific meal", "snack": "specific snack"},

      {"day": "Day 5", "breakfast": "specific meal", "lunch": "specific meal", "dinner": "specific meal", "snack": "specific snack"},

      {"day": "Day 6", "breakfast": "specific meal", "lunch": "specific meal", "dinner": "specific meal", "snack": "specific snack"},

      {"day": "Day 7", "breakfast": "specific meal", "lunch": "specific meal", "dinner": "specific meal", "snack": "specific snack"}

    ],

    "mealPlanPrinciples": ["5 specific evidence-based nutrition principles for this exact condition with mechanisms"],

    "commonTriggerFoods": [{"food": "Food name", "approach": "Specific elimination and reintroduction protocol with timeline"}],

    "hydrationGuidance": "Specific science-backed hydration strategy with exact amounts and timing for this skin condition",

    "gutExplanation": "5-6 sentence expert explanation of the gut-skin axis as it applies to this specific case — explain leaky gut, dysbiosis, the immune connection, and exactly how fixing the gut will change the skin. Make it revelatory.",

    "sevenDayGutPlan": [

      {"day": "Days 1-2", "focus": "Specific gut healing actions with rationale"},

      {"day": "Days 3-4", "focus": "Specific gut healing actions with rationale"},

      {"day": "Days 5-6", "focus": "Specific gut healing actions with rationale"},

      {"day": "Day 7", "focus": "Specific gut healing actions with rationale"}

    ],

    "digestiveSupport": ["Specific evidence-based digestive optimization strategy with mechanism"],

    "gutCautions": "Specific cautions about gut health changes — Herxheimer reactions, die-off symptoms, when to slow down",

    "sleepPlan": ["Specific actionable sleep optimization strategy with exact cortisol/skin healing mechanism explained"],

    "stressPlan": ["Specific 2-5 minute stress reduction technique with exact cortisol reduction mechanism"],

    "exerciseGuidance": ["Specific movement recommendation tailored to the skin condition — including what to avoid and why"],

    "sunlightGuidance": ["Specific evidence-based sun exposure guidance for this exact condition with vitamin D and circadian rhythm connection"],

    "dailyChecklist": ["Priority 1 habit", "Priority 2 habit", "Priority 3 habit", "Priority 4 habit", "Priority 5 habit", "Priority 6 habit", "Priority 7 habit"],

    "thisWeekFocus": "One powerful, specific, science-backed focus for the next 7 days that addresses the single highest-impact change this person can make right now"

  }

}

QUALITY STANDARDS — Every single response must:

- Feel like a private consultation with the world's best skin and gut health specialist

- Reference actual visual observations — never fabricate or generalize

- Provide specific biological mechanisms for every single recommendation

- Give the user a complete understanding of WHY their skin is behaving this way

- Deliver a nutrition and gut health plan so detailed and specific it could stand alone as a premium product

- Leave the user feeling educated, empowered, and equipped with the most complete skin healing plan they have ever seen

- Provide 3-5 conditions ranked by probability with specific visual evidence for each

- Never use generic advice — every sentence must be specific to this person's photos and answers

PRODUCT RULE — STRICTLY ENFORCE: Default to zero products per analysis. Maximum 2 products per entire analysis only if no nutritional or lifestyle alternative exists. Never list products in a dedicated section. Minimum ratio: 10 nutrition/lifestyle recommendations per 1 product mention. Frame any product as optional: "if you choose to use a topical, look for one containing X ingredient."`;

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
  let lastResult: GeminiInvokeResult | null = null;

  // Retry loop: try each model, and retry the full chain up to MAX_RETRIES times
  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    if (retry > 0) {
      const delay = RETRY_DELAYS[retry - 1] || 4000;
      console.info("[analyze-skin] retry attempt", { retry, delayMs: delay });
      await sleep(delay);
    }

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

        lastResult = {
          ok: false,
          status: 500,
          providerMessage: error instanceof Error ? error.message : "Gemini request failed",
          model,
        };
        break; // break inner loop, will retry
      }

      if (response.ok) {
        if (index > 0 || retry > 0) {
          console.info("[analyze-skin] model selected", { model, retry });
        }
        return { ok: true, response, model };
      }

      const rawError = await response.text();
      const isRetryable = response.status === 429 || response.status >= 500;
      const canFallback = index < safeModels.length - 1 && isRetryable;

      if (canFallback) {
        console.warn("[analyze-skin] model attempt failed, trying fallback", {
          model,
          status: response.status,
          rawError: rawError.substring(0, 300),
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

      // If it's retryable but no more fallback models, break to outer retry loop
      if (isRetryable) break;

      // Non-retryable error (400, 401, 403 etc) — stop immediately
      return lastResult;
    }
  }

  return lastResult || {
    ok: false,
    status: 500,
    providerMessage: "Gemini request failed after all retries and fallback models.",
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

const repairJson = (raw: string): string => {
  // Fix common LLM JSON issues
  let fixed = raw;
  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");
  // Fix unescaped newlines in strings (crude but effective)
  fixed = fixed.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
  return fixed;
};

const extractJsonCandidate = (content: unknown): Record<string, any> | null => {
  if (content && typeof content === "object") return content as Record<string, any>;
  if (typeof content !== "string") return null;

  const direct = content.trim();
  if (!direct) return null;

  // Attempt 1: Direct parse
  try {
    return JSON.parse(direct);
  } catch {
    // Continue to fallback extractors
  }

  // Attempt 2: Code fence extraction
  const fenced = direct.match(/```json\s*([\s\S]*?)```/i) || direct.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      try {
        return JSON.parse(repairJson(fenced[1].trim()));
      } catch { /* Continue */ }
    }
  }

  // Attempt 3: Brace matching
  const firstBrace = direct.indexOf("{");
  const lastBrace = direct.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = direct.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sliced);
    } catch {
      // Attempt 4: Repair then parse
      try {
        return JSON.parse(repairJson(sliced));
      } catch {
        return null;
      }
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

  const DEFAULT_MEALS: Record<string, { breakfast: string; lunch: string; dinner: string; snack: string }> = {
    "Day 1": {
      breakfast: "Anti-inflammatory smoothie bowl with frozen wild blueberries, spinach, ground flaxseed, walnuts, and unsweetened almond milk — rich in anthocyanins and omega-3s that calm NF-kB driven inflammation",
      lunch: "Grilled wild salmon over mixed greens with avocado, cucumber, cherry tomatoes, pumpkin seeds, and extra-virgin olive oil — EPA/DHA directly suppress pro-inflammatory cytokines",
      dinner: "Bone broth soup with turmeric, ginger, garlic, zucchini, and shredded organic chicken — glutamine and collagen peptides support intestinal barrier repair",
      snack: "Handful of raw almonds with a small green apple — vitamin E protects skin cell membranes from oxidative damage",
    },
    "Day 2": {
      breakfast: "Overnight oats with chia seeds, cinnamon, sliced banana, and a drizzle of raw honey — soluble fiber feeds beneficial Bifidobacterium strains",
      lunch: "Turkey and avocado lettuce wraps with shredded carrot, red cabbage, and tahini dressing — zinc from turkey supports immune regulation",
      dinner: "Baked cod with roasted sweet potato, steamed broccoli, and lemon-herb dressing — beta-carotene from sweet potato converts to retinol for skin cell turnover",
      snack: "Celery sticks with almond butter — prebiotic fiber supports gut microbiome diversity",
    },
    "Day 3": {
      breakfast: "Scrambled eggs with sauteed spinach, mushrooms, and a quarter avocado on gluten-free toast — choline from eggs supports liver detoxification pathways",
      lunch: "Quinoa bowl with roasted chickpeas, roasted red pepper, kale, and lemon-tahini dressing — complete amino acid profile for collagen synthesis",
      dinner: "Grass-fed beef stir-fry with bok choy, snap peas, ginger, garlic, and coconut aminos over cauliflower rice — bioavailable zinc and iron for skin repair",
      snack: "Fresh berries with a small handful of walnuts — ellagic acid from berries protects against UV-induced collagen breakdown",
    },
    "Day 4": {
      breakfast: "Green smoothie with kale, frozen mango, ginger, turmeric, coconut water, and a scoop of collagen peptides — curcumin inhibits NF-kB and reduces systemic inflammation",
      lunch: "Sardines on gluten-free crackers with arugula, cherry tomatoes, and olive oil — one of the richest sources of anti-inflammatory omega-3s",
      dinner: "Slow-cooked chicken thighs with roasted root vegetables (parsnips, carrots, beets) and fresh rosemary — diverse polyphenols support gut lining integrity",
      snack: "Sliced cucumber with hummus — silica from cucumber supports connective tissue and skin elasticity",
    },
    "Day 5": {
      breakfast: "Buckwheat pancakes topped with fresh strawberries, a drizzle of pure maple syrup, and hemp seeds — rutin from buckwheat strengthens capillaries and reduces redness",
      lunch: "Large mixed salad with grilled chicken, walnuts, dried cranberries, fennel, and apple cider vinegar dressing — ACV supports stomach acid production for better nutrient absorption",
      dinner: "Wild-caught shrimp with zucchini noodles, cherry tomatoes, basil, and garlic in olive oil — astaxanthin from shrimp is a potent antioxidant that reduces UV damage",
      snack: "A small portion of dark chocolate (85%+) with a few Brazil nuts — selenium from Brazil nuts supports glutathione production",
    },
    "Day 6": {
      breakfast: "Savory oatmeal bowl with a poached egg, sauteed kale, nutritional yeast, and pumpkin seeds — B vitamins from nutritional yeast support skin cell metabolism",
      lunch: "Lentil soup with carrots, celery, turmeric, and a side of fermented sauerkraut — prebiotic fiber from lentils feeds beneficial gut bacteria",
      dinner: "Baked salmon with asparagus, roasted garlic, and a side of kimchi — probiotic-rich fermented foods restore microbial diversity in the gut-skin axis",
      snack: "Frozen grapes with a small handful of macadamia nuts — resveratrol from grapes activates SIRT1 pathway for cellular repair",
    },
    "Day 7": {
      breakfast: "Coconut yogurt parfait with granola, mixed berries, ground flaxseed, and a drizzle of manuka honey — lauric acid from coconut has antimicrobial properties",
      lunch: "Mediterranean bowl with falafel, tabbouleh, hummus, cucumber, and olives over mixed greens — polyphenols from olive oil reduce oxidative stress markers",
      dinner: "Herb-crusted chicken breast with roasted Brussels sprouts, sweet potato mash, and bone broth gravy — sulforaphane from Brussels sprouts activates Nrf2 detoxification pathway",
      snack: "Rice cakes with mashed avocado and everything bagel seasoning — monounsaturated fats from avocado support skin barrier lipid production",
    },
  };

  const mealPlan = Array.isArray(healingProtocol.sevenDayMealPlan) ? healingProtocol.sevenDayMealPlan : [];
  healingProtocol.sevenDayMealPlan = Array.from({ length: 7 }, (_, index) => {
    const dayLabel = `Day ${index + 1}`;
    const source = mealPlan[index] && typeof mealPlan[index] === "object" ? mealPlan[index] : {};
    const defaults = DEFAULT_MEALS[dayLabel] || DEFAULT_MEALS["Day 1"];
    const breakfast = safeString((source as any).breakfast) || defaults.breakfast;
    const lunch = safeString((source as any).lunch) || defaults.lunch;
    const dinner = safeString((source as any).dinner) || defaults.dinner;
    const snack = safeString((source as any).snack) || defaults.snack;
    return { day: dayLabel, breakfast, lunch, dinner, snack };
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

  // Validate and fix skin scores to prevent unrealistically low values
  const skinScore = parsed.skinScore && typeof parsed.skinScore === "object" ? { ...parsed.skinScore } : {};
  
  if (typeof skinScore.overall === "number") {
    // Clamp overall score: minimum 15 for any real analysis, cap at 100
    skinScore.overall = Math.max(15, Math.min(100, Math.round(skinScore.overall)));
    
    // If score is suspiciously low (below 25) for what is likely common conditions, adjust up
    if (skinScore.overall < 25 && Array.isArray(parsed.conditions)) {
      const hasOnlyCommonConditions = parsed.conditions.every((c: any) => {
        const name = (c?.condition || "").toLowerCase();
        return name.includes("acne") || name.includes("eczema") || name.includes("dermatitis") || 
               name.includes("rosacea") || name.includes("dryness") || name.includes("hyperpigmentation") ||
               name.includes("folliculitis") || name.includes("keratosis") || name.includes("psoriasis");
      });
      if (hasOnlyCommonConditions) {
        skinScore.overall = Math.max(35, skinScore.overall);
      }
    }
  } else {
    skinScore.overall = 55; // Safe default
  }

  // Validate factor scores
  if (skinScore.factors && typeof skinScore.factors === "object") {
    const factorKeys = ["inflammation", "gut_health", "diet_quality", "lifestyle", "skin_barrier"];
    for (const key of factorKeys) {
      if (skinScore.factors[key] && typeof skinScore.factors[key] === "object") {
        const factor = skinScore.factors[key];
        if (typeof factor.score === "number") {
          factor.score = Math.max(15, Math.min(100, Math.round(factor.score)));
        } else {
          factor.score = skinScore.overall; // Default to overall if missing
        }
        if (!factor.explanation || typeof factor.explanation !== "string") {
          factor.explanation = "";
        }
      } else {
        skinScore.factors[key] = { score: skinScore.overall, explanation: "" };
      }
    }
  } else {
    skinScore.factors = {
      inflammation: { score: skinScore.overall, explanation: "" },
      gut_health: { score: skinScore.overall, explanation: "" },
      diet_quality: { score: skinScore.overall, explanation: "" },
      lifestyle: { score: skinScore.overall, explanation: "" },
      skin_barrier: { score: skinScore.overall, explanation: "" },
    };
  }

  return {
    ...parsed,
    healingProtocol,
    skinScore,
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

    // Gracefully skip bad images instead of failing the whole analysis
    const validImages = images.filter((img) => {
      if (!isValidBase64(img.base64)) {
        console.warn("[analyze-skin] skipping unusable image", { base64Length: img.base64?.length ?? 0, mimeType: img.mimeType });
        return false;
      }
      if (!SUPPORTED_ANALYSIS_MIME_TYPES.has(img.mimeType)) {
        console.warn("[analyze-skin] skipping unsupported mime type", { mimeType: img.mimeType });
        return false;
      }
      return true;
    });

    // Only fail if ALL images are bad
    if (validImages.length === 0) {
      return new Response(
        JSON.stringify({ error: "None of the uploaded images could be processed. Please retake or re-upload in JPG/PNG format." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace images with only valid ones
    images.length = 0;
    images.push(...validImages);

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
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos together" : "this skin photo"} with clinical precision.

STEP 1: Detect the exact body area shown (face, forehead, cheeks, chin, neck, back, chest, shoulders, arms, legs, scalp, hands, other).

STEP 2: Identify all visible clinical features — exact morphology type, distribution pattern, inflammation level, barrier integrity signs, pigmentation changes, sebaceous activity, scarring if present.

STEP 3: Generate exactly 5 diagnostic questions. Each must be HYPER-SPECIFIC to the visual findings in this exact photo. Follow these rules:

- Question 1 (Gut/Digestion): Ask about gut symptoms that are DIRECTLY linked to the specific condition pattern you see. If you see inflammatory papules, ask about post-meal bloating specifically. If you see widespread redness, ask about food-triggered flushing episodes.

- Question 2 (Diet): Ask about the specific dietary triggers most associated with the detected morphology. If you see comedonal acne, ask about dairy and high-glycemic food frequency. If you see eczema-like patches, ask about gluten and nightshade consumption.

- Question 3 (Hormonal/Stress): Tailor to the distribution pattern. Jawline/chin concentration — ask about menstrual cycle flare patterns and specific cycle days. Forehead — ask about stress-eating and sleep disruption. Widespread — ask about cortisol and anxiety levels.

- Question 4 (Skincare): Ask about behaviors that could CAUSE what you see. If barrier damage is visible (flaking, tightness, redness) — ask about hot shower temperature and foaming cleansers. If fungal-pattern bumps — ask about occlusive products. If PIH/PIE — ask about picking habits.

- Question 5 (Lifestyle): Ask about the ONE lifestyle factor most likely contributing to this specific presentation. Monomorphic bumps on trunk — ask about sweating in tight synthetic clothing. Perioral pattern — ask about fluoride toothpaste and mask wearing. Forehead comedones — ask about hat wearing and hair product use.

Each question MUST make the user think "how did it know to ask that?" — the question should reveal clinical insight about their specific photo. NEVER use generic phrasing like "how is your skin" or "do you have skin concerns".

Additionally, every question must be directly triggered by a specific visual observation from the photo. If jawline/chin lesions are visible → ask about hormonal cycle. If monomorphic small bumps → ask about sweating/gym/tight clothing. If flaking or dry skin → ask about shower temperature and cleanser type. If widespread inflammation → ask about dairy and sugar. If perioral lesions → ask about fluoride toothpaste. If back/chest acne → ask about post-workout showering. If hyperpigmentation → ask about SPF use. If redness/flushing → ask about alcohol and spicy food triggers. Never ask a question that could apply to anyone regardless of what the photo shows.

Return ONLY bodyArea, visualFeatures, and dynamicQuestions as JSON. No other text.`,
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
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos together" : "this skin photo"} combined with the user's answers to deliver the most thorough, accurate, and genuinely life-changing skin analysis ever created.

User's answers: ${JSON.stringify(answers)}

MANDATORY REQUIREMENTS:

- Detect body area first — every single recommendation must be specific to that body area

- Reference actual visual observations in every section — never fabricate or generalize

- Provide specific biological mechanisms for every recommendation — name the exact pathway (NF-kB, IGF-1, mTORC1, zonulin, cortisol cascade etc)

- The nutrition section must be extremely detailed — specific foods, specific mechanisms, complete 7-day meal plan with varied meals every day

- The gut health section must explain leaky gut, dysbiosis, and specific probiotic strains by name

- The healing protocol must feel personally written for this exact person based on their photos and answers

- Skin scores must be realistic — mild-moderate acne scores 50-75, never below 20 for any factor

- Every score explanation must reference specific visual observations and user answers

- All 7 root causes must be explored deeply with specific mechanisms

- The sevenDayMealPlan must have 7 complete different days — no repetition. Every single day must have breakfast, lunch, dinner AND snack fully populated with specific meals. Day 1 is especially important — never leave it empty.

- STRICT PRODUCT RULE: Maximum 1-2 products in the entire analysis. Only mention a product when NO nutritional or lifestyle change can achieve the same result. Every product must specify exact key ingredients (e.g. "a gentle cleanser with ceramides and no sulfates"). Products must always appear AFTER at least 3 nutrition/lifestyle recommendations. This must feel like a functional medicine consultation, not a skincare shopping list.

- Daily checklist must be 7 items ordered by highest impact first. Each item should be a clear one-line action.

- Never use the asterisk symbol anywhere

- Language must be clear and human — explain everything so a 16-year-old understands it

OUTPUT ORDER for optimal streaming:

1. bodyArea

2. skinScore (all 5 factors with specific explanations)

3. conditions (3-5 ranked by probability with visual evidence)

4. rootCauses (all 7 explored deeply)

5. biologicalExplanation (revelatory and specific)

6. healingProtocol (complete with every single sub-field fully populated)

Return the complete JSON with ALL fields fully populated. Make this the most valuable skin analysis this person has ever received. Leave nothing generic.`,
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
