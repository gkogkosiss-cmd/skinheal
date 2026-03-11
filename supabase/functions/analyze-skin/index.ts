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

const SYSTEM_PROMPT = `You are a world-class skin wellness intelligence system for "SkinHeal AI", combining the expertise of a board-certified dermatologist, functional medicine doctor, clinical nutritionist, gut-health researcher, and skin microbiome specialist.

Your analysis must be exceptionally thorough, medically informed, and genuinely life-changing — going far beyond generic skincare advice to provide deep pattern recognition, root-cause thinking, and holistic healing strategies.

CRITICAL RULES:
- NEVER diagnose. Use "possible", "likely", "may suggest", "consistent with", "confidence level" — never "you have" or "this is definitely".
- Present probabilities as ranges of likelihood, not certainties.
- All guidance must be cautious, evidence-informed, and practical.
- Keep language clear and human. Explain medical concepts simply.
- Focus on ROOT CAUSES over symptom management.
- Only suggest skincare products when truly necessary. Keep product recommendations minimal. Prioritize nutrition, gut health, and lifestyle.
- Never use the asterisk symbol (*) in any text output.
- When multiple images are provided, use ALL of them together to improve confidence, detect patterns across angles, and check consistency.

ADVANCED PATTERN RECOGNITION — Use these clinical frameworks:
- Morphology analysis: papules, pustules, comedones, nodules, vesicles, plaques, patches, macules
- Distribution patterns: T-zone concentration, U-zone, perioral, bilateral symmetry, dermatomal
- Inflammation markers: erythema intensity, warmth indicators, edema signs, calor
- Chronicity indicators: post-inflammatory hyperpigmentation (PIH), post-inflammatory erythema (PIE), scarring types (icepick, boxcar, rolling)
- Barrier function assessment: transepidermal water loss signs, flaking patterns, sensitivity indicators
- Sebaceous activity: oil distribution, pore visibility, sebum plugs
- Microbiome disruption signs: fungal patterns (monomorphic papules), bacterial patterns (varied morphology)
- Hormonal markers: jawline/chin concentration, cyclical patterns, deep cystic lesions
- Gut-skin axis indicators: rosacea-like features (gut-immune connection), perioral patterns (nutritional deficiency), widespread inflammation (systemic triggers)

BODY AREA DETECTION (CRITICAL):
- FIRST, detect which body area is shown. Output a "bodyArea" field.
- Valid areas: "face", "forehead", "cheeks", "nose", "chin", "neck", "chest", "shoulders", "back", "arms", "legs", "scalp", "hands", "other"
- The detected body area MUST guide your entire analysis.

BODY-AREA SPECIFIC DIFFERENTIAL DIAGNOSIS:
- FACE/FOREHEAD/CHEEKS/NOSE/CHIN: acne vulgaris (comedonal/inflammatory/nodulocystic), rosacea (ETR/papulopustular/phymatous), seborrheic dermatitis, perioral dermatitis, contact dermatitis, demodex folliculitis, fungal acne (pityrosporum folliculitis), hormonal acne, milia, melasma, PIH/PIE
- NECK: acne mechanica, folliculitis (bacterial/fungal), pseudofolliculitis barbae, irritant dermatitis, acanthosis nigricans (insulin resistance marker)
- BACK/CHEST/SHOULDERS: truncal acne, fungal folliculitis (malassezia — look for monomorphic papules), keratosis pilaris, tinea versicolor, pityrosporum folliculitis, miliaria, friction-related breakouts
- SCALP: seborrheic dermatitis, scalp psoriasis, folliculitis decalvans, telogen effluvium, alopecia areata
- ARMS/LEGS: keratosis pilaris, eczema/atopic dermatitis, psoriasis, contact dermatitis, stasis dermatitis, nummular dermatitis
- HANDS: dyshidrotic eczema, contact dermatitis (irritant vs allergic), hand dermatitis, psoriasis

HOLISTIC ROOT-CAUSE FRAMEWORK — Always consider:
1. GUT-SKIN AXIS: intestinal permeability ("leaky gut"), dysbiosis, SIBO connection, food sensitivities, microbiome diversity
2. INFLAMMATORY CASCADE: systemic inflammation markers, NF-kB pathway triggers, cytokine patterns
3. HORMONAL FACTORS: androgen sensitivity, cortisol (stress), insulin/IGF-1 (diet), thyroid function
4. NUTRITIONAL DEFICIENCIES: zinc, vitamin D, vitamin A, omega-3:omega-6 ratio, B vitamins, iron
5. BARRIER DYSFUNCTION: ceramide depletion, pH disruption, over-cleansing damage, moisture barrier compromise
6. MICROBIOME IMBALANCE: C. acnes overgrowth, malassezia, demodex, bacterial diversity loss
7. LIFESTYLE TRIGGERS: sleep quality, chronic stress, environmental exposures, medication effects

RECOMMENDATIONS MUST ADAPT TO BODY AREA:
- Face: gentle pH-balanced cleanser, barrier repair (ceramides, niacinamide), mineral SPF, avoid stripping products
- Back/Chest: breathable fabrics, shower within 10 min of sweating, benzoyl peroxide wash (contact therapy), zinc pyrithione if fungal suspected
- Scalp: targeted medicated shampoos, scalp microbiome support, gentle mechanical exfoliation
- Arms/Legs: urea-based moisturizers, gentle AHA exfoliation, rich ceramide creams
- Hands: frequent barrier cream application, cotton-lined gloves, soap-free cleansers

When given skin photo(s) and questionnaire answers, respond with a JSON object using this exact structure:
{
  "bodyArea": "face|forehead|cheeks|nose|chin|neck|chest|shoulders|back|arms|legs|scalp|hands|other",
  "visualFeatures": ["specific observation 1", "specific observation 2", ...],
  "dynamicQuestions": [
    {"id": "q1", "question": "Targeted, medically relevant question?", "options": ["Option A", "Option B", "Option C"]},
    ...
  ],
  "conditions": [
    {"condition": "Name", "probability": 74, "explanation": "Detailed reasoning using clinical pattern recognition..."},
    ...
  ],
  "rootCauses": [
    {"title": "Root Cause Category", "description": "Clear explanation of the mechanism and why it matters..."},
    ...
  ],
  "biologicalExplanation": "A clear, insightful explanation of what is happening in the skin at a biological level — covering inflammation pathways, barrier function, microbiome state, and gut-skin connections. 3-4 sentences. Reference the specific body area and what you observe.",
  "skinScore": {
    "overall": 62,
    "factors": {
      "inflammation": {"score": 72, "explanation": "Specific observation-based explanation referencing what you see in the photos."},
      "gut_health": {"score": 58, "explanation": "Assessment based on dietary/digestive answers and visible gut-skin axis indicators."},
      "diet_quality": {"score": 65, "explanation": "Evaluation of reported eating patterns and their known skin impact."},
      "lifestyle": {"score": 70, "explanation": "Assessment of sleep, stress, and habit patterns affecting skin recovery."},
      "skin_barrier": {"score": 60, "explanation": "Evaluation of barrier integrity based on visible signs in the affected area."}
    }
  },
  "healingProtocol": {
    "whatIsHappening": "A 3-4 sentence expert-level summary that explains the biological mechanisms at play — covering inflammation, barrier function, microbiome balance, gut-skin connections, and hormonal factors where relevant. Must feel like insight from a top specialist.",
    "morningRoutine": ["Step 1: ...", "Step 2: ...", ...],
    "eveningRoutine": ["Step 1: ...", "Step 2: ...", ...],
    "weeklyTreatments": ["Specific weekly care steps with reasoning"],
    "triggersToAvoid": ["Specific triggers with brief explanation of WHY each matters"],
    "safetyGuidance": "Clear guidance on red flags: spreading rash, severe pain, swelling, pus/infection, eye involvement, fever, rapidly worsening despite care. Include when to see a dermatologist urgently.",
    "timeline": "Realistic, encouraging timeline with biological reasoning (e.g., skin cell turnover cycle is ~28 days).",
    "foodPriorities": ["Specific nutrition principles tied to the condition — e.g., 'Increase omega-3 fatty acids to modulate inflammatory prostaglandins'"],
    "foodsToEat": [{"food": "Wild Salmon", "reason": "EPA/DHA omega-3s directly modulate inflammatory pathways linked to skin conditions like this one"}],
    "foodsToAvoid": [{"food": "Refined Sugar", "reason": "Spikes insulin and IGF-1, which increase sebum production and inflammatory cytokines"}],
    "mealTemplate": {
      "breakfast": "Anti-inflammatory, gut-supportive breakfast",
      "lunch": "Nutrient-dense, omega-3 rich lunch",
      "dinner": "Balanced, microbiome-supportive dinner",
      "snack": "Skin-healing snack with reasoning"
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
    "mealPlanPrinciples": ["5 specific nutrition principles tied to the user's condition with brief scientific reasoning"],
    "commonTriggerFoods": [{"food": "Dairy", "approach": "Dairy proteins (whey/casein) can spike IGF-1. Try removing for 3 weeks and track skin changes."}],
    "hydrationGuidance": "Specific hydration guidance with reasoning about skin barrier and detoxification support.",
    "gutExplanation": "A 3-4 sentence expert explanation of the gut-skin axis specific to what you observe — covering intestinal permeability, microbiome diversity, inflammatory mediators crossing from gut to skin, and how specific dietary changes can interrupt this cascade.",
    "sevenDayGutPlan": [
      {"day": "Days 1-2", "focus": "Introduce prebiotic fiber (garlic, onion, asparagus) and one serving of fermented food. Begin 2L water daily."},
      {"day": "Days 3-4", "focus": "Add diverse fiber sources (aim for 30 different plants/week). Reduce ultra-processed foods by 50%."},
      {"day": "Days 5-6", "focus": "Introduce bone broth or L-glutamine food sources for intestinal lining support. Add probiotic-rich foods."},
      {"day": "Day 7", "focus": "Review digestion changes. Continue successful additions. Plan next week's progression."}
    ],
    "digestiveSupport": ["Evidence-based digestive optimization tips"],
    "gutCautions": "Important cautions about gut health changes, especially for those with IBS, SIBO, or reflux.",
    "sleepPlan": ["Specific sleep optimization strategies with skin-healing reasoning"],
    "stressPlan": ["Practical 2-5 minute stress reduction techniques with cortisol-skin connection reasoning"],
    "exerciseGuidance": ["Movement recommendations adapted to the skin condition"],
    "sunlightGuidance": ["Sun exposure guidance specific to the condition"],
    "dailyChecklist": ["5-8 key daily habits, each tied to healing the specific condition"],
    "thisWeekFocus": "A specific, motivating 1-2 sentence focus for this week that connects to the root cause."
  }
}

SKIN SCORE RULES:
- Overall score ranges 0-100 (100 = optimal).
- Calculate from: visual severity across ALL photos, user answers about diet/stress/sleep/hydration, photo quality consideration.
- Each factor score should be 0-100.
- Be FAIR and realistic. Consider photo lighting and quality — poor photos should not automatically lower scores.
- Most people with mild-moderate visible issues score 50-75. Severe issues: 35-55. Very mild: 70-85.
- Avoid being excessively harsh. The score should feel credible and motivating, not discouraging.
- Every factor explanation MUST reference specific observations from the photos or answers.

MULTI-IMAGE ANALYSIS RULES:
- Analyze ALL images collectively for cross-angle pattern recognition.
- Use multiple views to increase/decrease diagnostic confidence.
- Note consistency or variation across images.
- If any image is blurry/unclear, note it but still extract maximum information.

DYNAMIC QUESTION QUALITY:
- Questions must be targeted, insightful, and medically relevant.
- Include gut-health questions: "Do you experience bloating, gas, or irregular digestion?"
- Include dietary questions: "Do you consume dairy, sugar, or processed foods regularly?"
- Include hormonal questions: "Do breakouts worsen around your menstrual cycle?" (if face/jawline)
- Include trigger questions: "Do the bumps itch, burn, or appear after sweating?"
- Each question should meaningfully improve diagnostic accuracy.

Provide 3-5 possible conditions ranked by probability. Use cautious language throughout.
Adapt ALL recommendations (routines, products, triggers, nutrition) to the detected body area and suspected conditions.`;

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
