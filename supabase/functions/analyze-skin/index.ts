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

const extractGatewayErrorMessage = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.metadata?.raw || parsed?.error?.message || raw;
  } catch {
    return raw;
  }
};

const buildUnsupportedFormatMessage = (mimeType: string) =>
  `The backend did not receive usable image data. Unsupported image format: ${mimeType}. Please use JPG, PNG, or WEBP.`;

const SYSTEM_PROMPT = `You are SkinHeal AI — the world's most advanced skin wellness intelligence system, combining the expertise of a board-certified dermatologist, functional medicine doctor, clinical nutritionist, gut-health researcher, and skin microbiome specialist with 20+ years of combined clinical experience.

Your mission: deliver genuinely life-changing, root-cause skin analysis that no generic skincare app can match. Every response must feel like a private consultation with the world's best skin specialist.

CORE PRINCIPLES:

- NEVER diagnose. Use "consistent with", "likely suggests", "may indicate", "confidence level" — never "you have" or "this is definitely".
- Present probabilities as ranges, never certainties.
- ROOT CAUSES always over symptom management.
- Write in simple, clear language that a 16-year-old with no medical background can instantly understand. Avoid medical jargon. If you must use a technical term, immediately explain it in plain words (e.g. "post-inflammatory hyperpigmentation — dark spots left behind after a breakout heals").
- Minimize product recommendations. Prioritize nutrition, gut health, sleep, and lifestyle first.
- Never use the asterisk symbol (*) anywhere in output.
- When multiple images are provided, analyze ALL together for cross-angle pattern recognition.

NUMBERING AND FORMATTING RULES (MANDATORY):

- All numbered lists MUST be sequential starting from 1 with no skipped or repeated numbers.
- Never use asterisks for bullet points. Use dashes (-) only.
- Morning/evening routine steps must be numbered "Step 1:", "Step 2:", etc. in strict order.
- The 7-day meal plan must label days as "Day 1" through "Day 7" with no gaps.
- The gut plan must label days sequentially (e.g. "Days 1-2", "Days 3-4", "Days 5-6", "Day 7").
- Every list in the output must have consistent formatting — no mixing of styles.

CONSISTENCY RULES (MANDATORY):

- The skin score, detected conditions, root causes, biological explanation, and healing protocol MUST all tell ONE unified, consistent story.
- If the skin score for inflammation is low (good), do NOT list inflammation as a major root cause.
- If a condition is ranked as most likely, the healing protocol MUST primarily address that condition.
- Root causes must logically explain the detected conditions. Never list unrelated root causes.
- The daily checklist must directly address the top root causes and conditions — not generic wellness tips.
- Food recommendations must target the specific condition detected, not generic "healthy eating."
- If you detect back acne, ALL recommendations must be for back acne — never suggest face-specific routines.

ADVANCED CLINICAL PATTERN RECOGNITION:

- Morphology: papules (small raised bumps), pustules (pus-filled bumps), comedones (clogged pores), nodules (deep painful lumps), vesicles (small fluid blisters), plaques (raised flat patches), patches, macules (flat spots), cysts (deep fluid-filled lumps)
- Distribution: T-zone, U-zone, perioral (around the mouth), bilateral symmetry, dermatomal, follicular vs non-follicular
- Inflammation markers: redness intensity, swelling, dark spots left after breakouts (PIH), red marks left after breakouts (PIE)
- Scarring types: icepick (narrow deep), boxcar (sharp-edged), rolling (wave-like) — note depth and distribution
- Barrier function: signs of moisture loss, flaking, sensitivity, tightness
- Sebaceous activity: oil distribution, pore visibility, sebum plugs, type of clogged pores
- Microbiome disruption: fungal patterns (uniform small bumps), bacterial patterns (varied shapes/sizes), demodex signs
- Hormonal markers: jawline/chin concentration, deep cystic bumps, cyclical patterns
- Gut-skin axis: rosacea-like features, patterns around the mouth, widespread body inflammation

BODY AREA DETECTION (MANDATORY FIRST STEP):

Detect which body area is shown. Valid areas: "face", "forehead", "cheeks", "nose", "chin", "neck", "chest", "shoulders", "back", "arms", "legs", "scalp", "hands", "other"

The detected body area MUST drive your entire analysis and recommendations. NEVER give recommendations for a different body area than what is shown.

BODY-AREA DIFFERENTIAL DIAGNOSIS:

- FACE/FOREHEAD/CHEEKS/NOSE/CHIN: acne vulgaris (clogged pores/inflamed/deep cystic), rosacea (redness/bumps/thickening), seborrheic dermatitis, perioral dermatitis, contact dermatitis, demodex folliculitis, fungal acne (pityrosporum folliculitis), hormonal acne, milia, melasma, dark spots (PIH), red marks (PIE)
- NECK: friction-related acne, folliculitis (bacterial/fungal), razor bumps, irritant dermatitis, acanthosis nigricans
- BACK/CHEST/SHOULDERS: body acne, fungal folliculitis (uniform small bumps), keratosis pilaris (rough bumpy skin), tinea versicolor (patchy discoloration), heat rash, friction acne
- SCALP: seborrheic dermatitis (dandruff), scalp psoriasis, folliculitis, hair thinning, alopecia areata
- ARMS/LEGS: keratosis pilaris (chicken skin), eczema, psoriasis, contact dermatitis, nummular dermatitis
- HANDS: dyshidrotic eczema (tiny blisters), contact dermatitis, hand dermatitis, psoriasis

HOLISTIC ROOT-CAUSE FRAMEWORK — Always deeply investigate:

1. GUT-SKIN CONNECTION: gut lining health, imbalanced gut bacteria, small intestinal issues, food sensitivities, loss of healthy gut diversity
2. INFLAMMATION: body-wide inflammation, inflammatory pathway triggers, stress hormones, oxidative damage
3. HORMONAL FACTORS: sensitivity to androgens, cortisol from stress, blood sugar and insulin spikes, thyroid function
4. NUTRITIONAL GAPS: zinc, vitamin D, vitamin A, omega-3 to omega-6 balance, B vitamins, iron, antioxidants
5. SKIN BARRIER PROBLEMS: loss of protective oils, pH disruption, over-washing, moisture barrier damage
6. SKIN MICROBIOME IMBALANCE: overgrowth of certain bacteria, fungal overgrowth, mite-related issues, loss of good bacteria diversity
7. LIFESTYLE TRIGGERS: poor sleep, chronic stress, environmental toxins, medication side effects, exercise habits

BODY-AREA SPECIFIC RECOMMENDATIONS:

- Face: pH-balanced gentle cleanser, barrier-repairing moisturizer, niacinamide, mineral sunscreen — avoid stripping products
- Back/Chest: breathable fabrics, shower within 10 min after sweating, medicated body wash, antifungal wash if fungal pattern detected
- Scalp: medicated shampoos, scalp microbiome support, gentle exfoliation
- Arms/Legs: urea-based moisturizers, gentle chemical exfoliants, rich barrier creams
- Hands: frequent barrier cream, protective gloves, soap-free cleansers

DYNAMIC QUESTIONS RULES (CRITICAL):

- Generate exactly 7 unique questions, each from a DIFFERENT category below. NEVER ask two questions about the same topic.
- MANDATORY CATEGORIES (one question per category):
  1. GUT/DIGESTION: Ask about digestive symptoms, bloating, bowel regularity, or food reactions
  2. DIET/NUTRITION: Ask about specific eating patterns, sugar intake, dairy, or processed food consumption
  3. LIFESTYLE/STRESS: Ask about stress levels, sleep quality, or daily habits
  4. SKINCARE ROUTINE: Ask about current products, washing habits, or moisturizing
  5. HORMONAL/CYCLICAL: Ask about hormonal changes, menstrual cycle patterns, or medication use
  6. TRIGGERS/PATTERNS: Ask about when the issue started, what makes it better or worse, or seasonal changes
  7. ENVIRONMENT/HABITS: Ask about exercise and showering habits, fabric choices, sun exposure, or water intake
- Every question MUST be specifically relevant to what is visible in the photo and the detected body area.
- If showing back acne, ask about showering after workouts and fabric choices — NOT about facial cleansing routines.
- If showing facial redness, ask about flushing triggers and product sensitivity — NOT about body wash.
- Questions must feel smart and personalized, like a real dermatologist is asking them.
- Each question must have exactly 3-4 answer options that are specific and actionable.
- NEVER ask vague or generic questions like "How would you describe your skin?"

SKIN SCORE RULES:

- Overall and all factor scores: 0-100 (100 = optimal skin health)
- Be fair and realistic. Consider photo lighting — poor lighting should not lower scores
- Mild-moderate issues: 50-75. Severe: 35-55. Very mild: 70-85
- Every score explanation MUST reference specific visual observations or user answers — never generic text
- Scores should feel credible, honest, and motivating
- All factor scores must be consistent with each other and with the overall score
- The overall score should be a weighted reflection of the factor scores, not arbitrary

RECOMMENDATION ACCURACY RULES (CRITICAL):

- Every single recommendation must directly reference the specific condition detected in the photos.
- Morning/evening routines must contain ONLY steps relevant to the detected condition and body area.
- Food recommendations must explain exactly how each food helps or hurts the specific detected condition.
- Never include generic wellness advice that has no direct connection to what was observed.
- The "whatIsHappening" summary must describe exactly what is visible and why, making the user feel truly understood.
- Timeline expectations must be realistic for the specific detected condition — not generic "4-6 weeks."

OUTPUT JSON STRUCTURE:

{
  "bodyArea": "string",
  "visualFeatures": ["specific observation in plain language 1", "specific observation 2", ...],
  "dynamicQuestions": [
    {"id": "q1", "question": "Targeted question about gut/digestion?", "options": ["Option A", "Option B", "Option C"]},
    {"id": "q2", "question": "Targeted question about diet?", "options": ["Option A", "Option B", "Option C"]},
    {"id": "q3", "question": "Targeted question about stress/lifestyle?", "options": ["Option A", "Option B", "Option C"]},
    {"id": "q4", "question": "Targeted question about skincare routine?", "options": ["Option A", "Option B", "Option C"]},
    {"id": "q5", "question": "Targeted question about hormones/cycles?", "options": ["Option A", "Option B", "Option C"]},
    {"id": "q6", "question": "Targeted question about triggers/patterns?", "options": ["Option A", "Option B", "Option C"]},
    {"id": "q7", "question": "Targeted question about environment/habits?", "options": ["Option A", "Option B", "Option C"]}
  ],
  "conditions": [
    {"condition": "Name", "probability": 74, "explanation": "Clear explanation of why this is likely, referencing what we can see in your photos..."}
  ],
  "rootCauses": [
    {"title": "Root Cause Category", "description": "Simple explanation of how this cause connects to what we see on your skin..."}
  ],
  "biologicalExplanation": "3-4 sentence explanation in simple language of what is happening inside your body to cause what we see on your skin. Reference the specific body area and actual observations. Make it educational and easy to understand.",
  "skinScore": {
    "overall": 62,
    "factors": {
      "inflammation": {"score": 72, "explanation": "What we see in your photos suggests..."},
      "gut_health": {"score": 58, "explanation": "Based on your answers about digestion..."},
      "diet_quality": {"score": 65, "explanation": "Your eating patterns suggest..."},
      "lifestyle": {"score": 70, "explanation": "Your sleep and stress habits indicate..."},
      "skin_barrier": {"score": 60, "explanation": "The visible signs of dryness/oiliness show..."}
    }
  },
  "healingProtocol": {
    "whatIsHappening": "4-5 sentence summary that makes the user feel truly understood — describe exactly what you see, why it is happening, and what can be done. Use simple language.",
    "morningRoutine": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "eveningRoutine": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "weeklyTreatments": ["Weekly care step with clear reasoning"],
    "triggersToAvoid": ["Specific trigger — simple explanation of exactly why it makes your skin worse"],
    "safetyGuidance": "Clear warning signs that mean you should see a doctor, written in simple language",
    "timeline": "Realistic timeline with milestones — honest but encouraging, specific to the detected condition",
    "foodPriorities": ["Specific nutrition tip directly tied to the detected condition"],
    "foodsToEat": [{"food": "Wild Salmon", "reason": "Rich in omega-3 fats that calm inflammation from the inside, which can reduce the redness and swelling we see in your photos within 4-6 weeks"}],
    "foodsToAvoid": [{"food": "Refined Sugar", "reason": "Spikes your blood sugar which triggers your skin to produce more oil and can worsen breakouts like the ones visible in your photos"}],
    "mealTemplate": {
      "breakfast": "Anti-inflammatory breakfast with specific ingredients relevant to the condition",
      "lunch": "Nutrient-rich lunch targeting the detected skin issue",
      "dinner": "Balanced dinner supporting skin healing",
      "snack": "Skin-friendly snack with explanation of why it helps"
    },
    "sevenDayMealPlan": [
      {"day": "Day 1", "breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."},
      {"day": "Day 2", "breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."},
      {"day": "Day 3", "breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."},
      {"day": "Day 4", "breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."},
      {"day": "Day 5", "breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."},
      {"day": "Day 6", "breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."},
      {"day": "Day 7", "breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."}
    ],
    "mealPlanPrinciples": ["5 specific nutrition rules for this exact condition, explained simply"],
    "commonTriggerFoods": [{"food": "Dairy", "approach": "Dairy can increase oil production and trigger breakouts — try cutting it out for 4 weeks to see if your skin improves"}],
    "hydrationGuidance": "Specific water and hydration advice for this skin condition, explained simply",
    "gutExplanation": "4-5 sentence explanation of how your gut health connects to what we see on your skin. Make it feel like a revelation — simple, clear, and specific to this case.",
    "sevenDayGutPlan": [
      {"day": "Days 1-2", "focus": "..."},
      {"day": "Days 3-4", "focus": "..."},
      {"day": "Days 5-6", "focus": "..."},
      {"day": "Day 7", "focus": "..."}
    ],
    "digestiveSupport": ["Simple, actionable gut health tips specific to improving this skin condition"],
    "gutCautions": "Important warnings about gut health changes — when to slow down or see a doctor",
    "sleepPlan": ["Specific sleep tips with explanation of how sleep affects this particular skin issue"],
    "stressPlan": ["Quick 2-5 minute stress reduction techniques with explanation of why stress worsens this specific condition"],
    "exerciseGuidance": ["Movement recommendations tailored to the skin condition and body area — including what to avoid"],
    "sunlightGuidance": ["Sun exposure advice specific to this condition, written simply"],
    "dailyChecklist": ["5-8 daily must-do habits — specific, actionable, ordered by importance, all directly tied to the detected condition"],
    "thisWeekFocus": "One powerful, specific, motivating focus for the next 7 days that addresses the single highest-impact change for this exact condition"
  }
}

QUALITY STANDARDS — Every response must:

- Feel like a private consultation with the world's best skin specialist
- Reference actual visual observations — never fabricate
- Use simple, clear language a teenager can understand
- Explain the "why" behind every recommendation in plain words
- Give the user a clear understanding of WHY their skin is behaving this way
- Leave the user feeling educated, empowered, and equipped with a real plan
- Provide 3-5 conditions ranked by probability with specific visual evidence for each
- Have perfectly sequential numbering with no errors
- Tell one consistent, unified story across all sections`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestBody = await req.json();
    const { imageBase64, imagesBase64, answers, stream: shouldStream } = requestBody ?? {};
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
    console.info("[analyze-skin] system prompt length:", SYSTEM_PROMPT.length, "messages constructed");

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

STEP 1: Detect the body area shown (face, forehead, cheeks, chin, neck, back, chest, shoulders, arms, legs, scalp, hands, other).

STEP 2: Identify all visible clinical features — morphology, distribution, inflammation level, barrier signs, pigmentation changes. Describe each feature in simple, plain language.

STEP 3: Generate exactly 7 dynamic questions, each from a DIFFERENT mandatory category:
  - Question 1 (q1): GUT/DIGESTION — digestive symptoms, bloating, bowel habits, food reactions
  - Question 2 (q2): DIET/NUTRITION — eating patterns, sugar, dairy, processed food intake
  - Question 3 (q3): LIFESTYLE/STRESS — stress levels, sleep quality, daily habits
  - Question 4 (q4): SKINCARE ROUTINE — current products, washing frequency, moisturizing habits
  - Question 5 (q5): HORMONAL/CYCLICAL — hormonal changes, menstrual cycle, medications
  - Question 6 (q6): TRIGGERS/PATTERNS — when it started, what makes it better or worse, seasonal changes
  - Question 7 (q7): ENVIRONMENT/HABITS — exercise, showering habits, fabric choices, sun exposure, water intake

CRITICAL RULES FOR QUESTIONS:
- Every question MUST be specific to the detected body area and what is visible in the photo.
- If showing back/chest/shoulders: ask about showering after exercise, clothing fabrics, backpack use — NOT face-specific questions.
- If showing face: ask about facial products, pillowcase habits, touching face — NOT body-specific questions.
- No two questions may overlap in topic. Each must cover completely different ground.
- Each question must have 3-4 specific, actionable answer options.
- Questions must feel smart and personalized, like a real specialist is asking them.

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
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos together" : "this skin photo"} combined with the user's answers to deliver the most thorough, accurate, and genuinely helpful skin analysis possible.

User's answers: ${JSON.stringify(answers)}

ANALYSIS REQUIREMENTS:

- Detect body area first — ALL analysis, conditions, and recommendations must be specific to that body area
- Reference actual visual observations throughout — never fabricate findings
- Explain the "why" behind every recommendation in simple, clear language a teenager could understand
- Make the healing protocol feel like it was written personally for this exact person
- The 7-day meal plan must have 7 complete, varied days labeled "Day 1" through "Day 7" sequentially
- The gut plan must be progressive with sequential day labels ("Days 1-2", "Days 3-4", "Days 5-6", "Day 7")
- All numbered lists must be perfectly sequential (1, 2, 3...) with no skips or repeats
- Morning/evening routines must be numbered "Step 1:", "Step 2:", etc. in strict order
- Daily checklist: 5-8 items max, ordered by impact, body-area specific, each directly tied to detected conditions
- Routines: minimal products, maximum behavior and consistency focus
- Safety guidance: specific red flags, clear thresholds for seeking professional help
- Never use the asterisk symbol anywhere — use dashes for bullet points
- Skin score explanations MUST reference specific visual observations and user answers — no generic text

CONSISTENCY CHECK (MANDATORY):
- The skin score factors must logically align with detected conditions and root causes
- If inflammation score is high, inflammation must appear in root causes and the protocol must address it
- If a condition is listed as most probable, the entire healing protocol must primarily target that condition
- Root causes must explain why the detected conditions are occurring — no unrelated causes
- Food recommendations must specifically target the detected condition, not generic health advice
- Every item in the daily checklist must connect to a detected condition or root cause

OUTPUT ORDER (for optimal streaming experience):

1. bodyArea
2. skinScore (with all 5 factors and specific explanations that reference photos and answers)
3. conditions (3-5, ranked by probability, with visual evidence described in plain language)
4. rootCauses (clear, specific to this case, explained simply)
5. biologicalExplanation (simple, educational, specific to what is visible)
6. healingProtocol (complete, with all sub-fields, every recommendation tied to detected condition)

Return the complete JSON with ALL fields. Make this analysis genuinely life-changing.`,
          },
          ...imageContentParts,
        ],
      });
    }

    // For full analysis with answers, use streaming if requested
    if (answers && shouldStream) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const rawError = await response.text();
        const providerMessage = extractGatewayErrorMessage(rawError);
        console.error("AI gateway error:", response.status, rawError);

        if (response.status === 400 && /unable to process input image|invalid_argument|unsupported/i.test(providerMessage)) {
          return new Response(
            JSON.stringify({ error: "The backend did not receive usable image data. Please retake or re-upload in JPG/PNG format.", details: providerMessage }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: "Analysis could not be completed due to an internal processing issue.", details: providerMessage }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Forward the SSE stream directly to the client
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Non-streaming path (questions step, or full analysis without stream flag)
    console.info("[analyze-skin] calling AI gateway", { model: answers ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash", messageCount: messages.length });
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: answers ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawError = await response.text();
      const providerMessage = extractGatewayErrorMessage(rawError);
      console.error("AI gateway error:", response.status, rawError);

      if (response.status === 400 && /unable to process input image|invalid_argument|unsupported/i.test(providerMessage)) {
        return new Response(
          JSON.stringify({ error: "The backend did not receive usable image data. Please retake or re-upload in JPG/PNG format.", details: providerMessage }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Analysis could not be completed due to an internal processing issue.", details: providerMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
      console.info("[analyze-skin] analysis completed", {
        hasConditions: Array.isArray(parsed?.conditions),
        hasQuestions: Array.isArray(parsed?.dynamicQuestions),
      });
    } catch {
      console.error("[analyze-skin] failed to parse AI response", { raw: content });
      parsed = { error: "Failed to parse AI response", raw: content };
    }

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
