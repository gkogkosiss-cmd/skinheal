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
- Explain complex biology in clear, human language — educate, don't overwhelm.
- Minimize product recommendations. Prioritize nutrition, gut health, sleep, and lifestyle first.
- Never use the asterisk symbol (*) anywhere in output.
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

HOLISTIC ROOT-CAUSE FRAMEWORK — Always deeply investigate:

1. GUT-SKIN AXIS: intestinal permeability, dysbiosis, SIBO, food sensitivities, microbiome diversity loss
2. INFLAMMATORY CASCADE: systemic inflammation, NF-kB pathway triggers, cytokine patterns, oxidative stress
3. HORMONAL FACTORS: androgen sensitivity, cortisol dysregulation, insulin/IGF-1 spikes, thyroid function
4. NUTRITIONAL DEFICIENCIES: zinc, vitamin D, vitamin A, omega-3:omega-6 ratio, B vitamins, iron, antioxidants
5. BARRIER DYSFUNCTION: ceramide depletion, pH disruption, over-cleansing, moisture barrier compromise
6. MICROBIOME IMBALANCE: C. acnes overgrowth, malassezia, demodex, loss of bacterial diversity
7. LIFESTYLE TRIGGERS: sleep deprivation, chronic stress, environmental toxins, medication effects, exercise habits

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

OUTPUT JSON STRUCTURE:

{
  "bodyArea": "string",
  "visualFeatures": ["specific clinical observation 1", "specific clinical observation 2", ...],
  "dynamicQuestions": [
    {"id": "q1", "question": "Targeted, medically relevant question?", "options": ["Option A", "Option B", "Option C"]}
  ],
  "conditions": [
    {"condition": "Name", "probability": 74, "explanation": "Detailed clinical reasoning with specific visual evidence..."}
  ],
  "rootCauses": [
    {"title": "Root Cause Category", "description": "Mechanism explanation with why it matters for this specific case..."}
  ],
  "biologicalExplanation": "Expert-level 3-4 sentence explanation of what is happening at a biological level — inflammation pathways, barrier function, microbiome state, gut-skin axis. Reference the specific body area and actual observations.",
  "skinScore": {
    "overall": 62,
    "factors": {
      "inflammation": {"score": 72, "explanation": "Specific observation-based explanation referencing actual photos..."},
      "gut_health": {"score": 58, "explanation": "Assessment tied to dietary and digestive answers..."},
      "diet_quality": {"score": 65, "explanation": "Evaluation of reported eating patterns..."},
      "lifestyle": {"score": 70, "explanation": "Assessment of sleep, stress, habits — referencing answers..."},
      "skin_barrier": {"score": 60, "explanation": "Barrier integrity evaluation from visual observations..."}
    }
  },
  "healingProtocol": {
    "whatIsHappening": "4-5 sentence expert summary that makes the user feel truly understood — specific, insightful, empowering",
    "morningRoutine": ["Step 1: ...", "Step 2: ..."],
    "eveningRoutine": ["Step 1: ...", "Step 2: ..."],
    "weeklyTreatments": ["Weekly care steps with clear reasoning"],
    "triggersToAvoid": ["Specific trigger — explanation of exact biological mechanism of WHY it worsens skin"],
    "safetyGuidance": "Clear, specific red flags and when to seek professional help",
    "timeline": "Realistic, biologically grounded timeline with healing milestones — encouraging but honest",
    "foodPriorities": ["Specific nutrition principle tied directly to the detected condition"],
    "foodsToEat": [{"food": "Wild Salmon", "reason": "EPA/DHA omega-3s directly suppress inflammatory cytokines IL-1b and TNF-a, reducing visible inflammation within 4-6 weeks of consistent intake"}],
    "foodsToAvoid": [{"food": "Refined Sugar", "reason": "Spikes insulin and IGF-1, directly upregulating sebum production and androgen activity in sebaceous glands"}],
    "mealTemplate": {
      "breakfast": "Anti-inflammatory, gut-supportive breakfast with specific ingredients",
      "lunch": "Nutrient-dense, omega-3 rich lunch",
      "dinner": "Balanced, microbiome-supportive dinner",
      "snack": "Skin-healing snack with mechanism explanation"
    },
    "sevenDayMealPlan": [
      {"day": "Day 1", "breakfast": "...", "lunch": "...", "dinner": "...", "snack": "..."}
    ],
    "mealPlanPrinciples": ["5 specific, evidence-based nutrition principles for this exact condition"],
    "commonTriggerFoods": [{"food": "Dairy", "approach": "Dairy proteins spike IGF-1 and stimulate mTORC1 pathway — try eliminating for 4 weeks to assess impact"}],
    "hydrationGuidance": "Specific, science-backed hydration strategy for this skin condition",
    "gutExplanation": "4-5 sentence expert explanation of the gut-skin axis as it applies to this specific case — make it feel revelatory",
    "sevenDayGutPlan": [
      {"day": "Days 1-2", "focus": "..."},
      {"day": "Days 3-4", "focus": "..."},
      {"day": "Days 5-6", "focus": "..."},
      {"day": "Day 7", "focus": "..."}
    ],
    "digestiveSupport": ["Evidence-based digestive optimization strategies specific to skin health"],
    "gutCautions": "Important cautions about gut health changes — when to slow down or seek help",
    "sleepPlan": ["Specific, actionable sleep optimization strategies with skin healing reasoning"],
    "stressPlan": ["Practical 2-5 minute stress reduction techniques with cortisol/skin connection explained"],
    "exerciseGuidance": ["Movement recommendations tailored to the skin condition — including what to avoid"],
    "sunlightGuidance": ["Evidence-based sun exposure guidance for this specific condition"],
    "dailyChecklist": ["5-8 non-negotiable daily habits — specific, actionable, ordered by priority"],
    "thisWeekFocus": "One powerful, specific, motivating focus for the next 7 days that addresses the single highest-impact change"
  }
}

QUALITY STANDARDS — Every response must:

- Feel like a private consultation with the world's best skin specialist
- Reference actual visual observations — never fabricate
- Provide biological mechanisms, not just recommendations
- Give the user a clear understanding of WHY their skin is behaving this way
- Leave the user feeling educated, empowered, and equipped with a real plan
- Provide 3-5 conditions ranked by probability with specific visual evidence for each`;

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
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos" : "this skin photo"}. FIRST detect which body area is shown (face, neck, back, chest, arms, legs, scalp, hands, etc). Then identify visual features across all images and generate 4-5 highly relevant diagnostic questions based on what you see and the body area. Return ONLY the bodyArea, visualFeatures, and dynamicQuestions fields as JSON.`,
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
            text: `Analyze ${images.length > 1 ? "these " + images.length + " skin photos together" : "this skin photo"} along with the user's questionnaire answers. Provide a complete, thorough analysis.

IMPORTANT - BODY AREA DETECTION:
- First detect which body area is shown in the photos.
- Adapt ALL your analysis, conditions, and recommendations to that specific body area.
- Do NOT default to face-only conditions if the photos show another body part.

User's answers: ${JSON.stringify(answers)}

IMPORTANT GUIDELINES FOR YOUR RESPONSE:
- Use cautious, educational language. Say "may", "often", "commonly" instead of definitive claims.
- Reference what you actually see in the photos - do not fabricate observations.
- If multiple photos are provided, note consistency or differences across views.
- Make the healing protocol highly detailed and practical, adapted to the body area shown.
- The meal template should be realistic and easy to follow.
- IMPORTANT: Generate a complete sevenDayMealPlan array with 7 objects, each with day, breakfast, lunch, dinner, snack. Make meals anti-inflammatory, gut-supportive, and practical for everyday life. Each day should be different and varied.
- Also generate mealPlanPrinciples: 5 key nutrition principles specific to the user's skin condition.
- The 7-day gut plan should be progressive and gentle.
- Daily checklist should be 5-8 items max, adapted to the body area.
- Keep routines minimal - focus on behavior and consistency over products.
- Include specific safety guidance and red flags.
- Never use the asterisk symbol in any text.
- IMPORTANT: Include the skinScore field with overall score and all 5 factor scores with specific explanations that reference the actual images and answers.
- Skin score explanations MUST reference what you observe, not generic text.
- IMPORTANT: Include the bodyArea field indicating which body area you detected.

IMPORTANT OUTPUT ORDER: To provide the fastest user experience, output the JSON fields in this exact order:
1. bodyArea
2. skinScore
3. conditions
4. rootCauses
5. biologicalExplanation
6. healingProtocol (with all sub-fields)

Return the FULL JSON response with ALL fields including bodyArea, skinScore and the expanded healingProtocol.`,
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
