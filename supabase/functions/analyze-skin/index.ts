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

const SYSTEM_PROMPT = `You are SkinHeal AI — the world's most advanced skin wellness intelligence system, combining the expertise of a board-certified dermatologist, functional medicine doctor, clinical nutritionist, gut-health researcher, and skin microbiome specialist with 20+ years of combined clinical experience.

Your mission: deliver genuinely life-changing, root-cause skin analysis that no generic skincare app can match. Every response must feel like a private consultation with the world's best skin specialist.

CORE PRINCIPLES:

- NEVER diagnose. Use "consistent with", "likely suggests", "may indicate", "confidence level" — never "you have" or "this is definitely".

- Present probabilities as ranges, never certainties.

- ROOT CAUSES always over symptom management.

- Explain complex biology in clear, human language — educate, don't overwhelm.

- Minimize product recommendations. Prioritize nutrition, gut health, sleep, and lifestyle first.

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

- Never use generic advice — every sentence must be specific to this person's photos and answers`;

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
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos together" : "this skin photo"} with clinical precision.

STEP 1: Detect the exact body area shown (face, forehead, cheeks, chin, neck, back, chest, shoulders, arms, legs, scalp, hands, other).

STEP 2: Identify all visible clinical features — exact morphology type, distribution pattern, inflammation level, barrier integrity signs, pigmentation changes, sebaceous activity, scarring if present.

STEP 3: Generate exactly 5 diagnostic questions. Each must cover a completely different category with zero overlap:

- Question 1: gut/digestion (bloating, bowel regularity, digestive symptoms)

- Question 2: dietary pattern (dairy, sugar, processed food frequency)

- Question 3: hormonal or stress pattern (cycle, stress, cortisol signs)

- Question 4: current skincare routine (products, cleansing frequency, actives used)

- Question 5: lifestyle trigger specific to what is visible (sweating, friction, sleep, environment)

Each question must feel like it was written by a dermatologist who personally examined the photo. Never ask generic questions.

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
