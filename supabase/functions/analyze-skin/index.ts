import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_ANALYSIS_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const normalizeMimeType = (value: string | undefined) => {
  const mime = (value || "image/jpeg").toLowerCase();
  return mime === "image/jpg" ? "image/jpeg" : mime;
};

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

const SYSTEM_PROMPT = `You are an evidence-based skin wellness educator for "SkinHeal AI". You analyze skin photos and user responses to provide educational wellness insights.

CRITICAL RULES:
- NEVER diagnose. Use "possible", "likely", "may suggest", "consistent with" — never "you have" or "this is definitely".
- Present probabilities as ranges of likelihood, not certainties.
- All guidance must be cautious, evidence-informed, and practical.
- Keep language simple, clear, and human. Avoid medical jargon.
- Focus on actionable daily habits over product recommendations.
- Only suggest skincare products when truly necessary (cleanser, moisturizer, specific treatment if relevant). Keep it minimal.
- Never use the asterisk symbol (*) in any text output.
- When multiple images are provided, use ALL of them together to improve confidence, detect patterns across angles, and check consistency.

BODY AREA DETECTION (CRITICAL):
- FIRST, detect which body area is shown in the photos. Output a "bodyArea" field.
- Valid areas: "face", "forehead", "cheeks", "nose", "chin", "neck", "chest", "shoulders", "back", "arms", "legs", "scalp", "hands", "other"
- The detected body area MUST guide your analysis. Different body areas have different common conditions and care recommendations.

BODY-AREA SPECIFIC FOCUS:
- FACE/FOREHEAD/CHEEKS/NOSE/CHIN: acne vulgaris, rosacea, seborrheic dermatitis, clogged pores, oil imbalance, perioral dermatitis, contact dermatitis
- NECK: acne mechanica, folliculitis, irritation from clothing/jewelry
- BACK/CHEST/SHOULDERS: back acne (bacne), fungal folliculitis (malassezia), sweat-related irritation, friction acne, keratosis pilaris
- SCALP: dandruff, seborrheic dermatitis, scalp psoriasis, folliculitis, dryness
- ARMS/LEGS: keratosis pilaris, eczema, psoriasis, contact dermatitis, dryness, insect bites
- HANDS: contact dermatitis, dryness, dyshidrotic eczema, irritant dermatitis

RECOMMENDATIONS MUST ADAPT TO BODY AREA:
- Face: gentle cleansers, barrier repair, SPF, avoid harsh scrubs
- Back/Chest: breathable clothing, shower after sweating, benzoyl peroxide wash, avoid tight fabrics
- Scalp: medicated shampoos, scalp hydration, gentle brushing, avoid excessive heat styling
- Arms/Legs: exfoliation with AHAs/urea, rich moisturizers, avoid hot showers
- Hands: frequent moisturizing, barrier creams, avoid irritants, use gloves for cleaning

When given skin photo(s) and questionnaire answers, respond with a JSON object using this exact structure:
{
  "bodyArea": "face|forehead|cheeks|nose|chin|neck|chest|shoulders|back|arms|legs|scalp|hands|other",
  "visualFeatures": ["redness", "flaking", ...],
  "dynamicQuestions": [
    {"id": "q1", "question": "Does the area itch?", "options": ["Yes, frequently", "Occasionally", "Rarely or never"]},
    ...
  ],
  "conditions": [
    {"condition": "Name", "probability": 74, "explanation": "Brief, cautious explanation using words like 'suggests' or 'consistent with'..."},
    ...
  ],
  "rootCauses": [
    {"title": "Possible Trigger", "description": "Clear, simple explanation..."},
    ...
  ],
  "biologicalExplanation": "A simple, human explanation of what may be happening in the skin. No jargon. 2-3 sentences max. Reference the specific body area.",
  "skinScore": {
    "overall": 62,
    "factors": {
      "inflammation": {"score": 72, "explanation": "Your images show visible redness and irritation that may reflect ongoing skin inflammation."},
      "gut_health": {"score": 58, "explanation": "Based on your dietary and digestive answers, gut health may be contributing to skin issues."},
      "diet_quality": {"score": 65, "explanation": "Your reported eating patterns suggest room for more anti-inflammatory foods."},
      "lifestyle": {"score": 70, "explanation": "Sleep and stress patterns you reported may be affecting skin recovery."},
      "skin_barrier": {"score": 60, "explanation": "Visible signs suggest the skin barrier may be compromised in the affected area."}
    }
  },
  "healingProtocol": {
    "whatIsHappening": "A 2-3 sentence plain-language summary of what seems to be going on based on photos and answers. Reference the body area.",
    "morningRoutine": ["Step 1: ...", "Step 2: ...", ...],
    "eveningRoutine": ["Step 1: ...", "Step 2: ...", ...],
    "weeklyTreatments": ["Specific weekly care steps relevant to the condition and body area"],
    "triggersToAvoid": ["Specific irritants or behaviors to avoid for this body area"],
    "safetyGuidance": "Clear guidance on when to see a dermatologist. Include red flags like spreading rash, severe pain, swelling, pus or infection, eye involvement, or worsening despite care.",
    "timeline": "Realistic timeline with ranges.",
    "foodPriorities": ["Rule 1: Focus on anti-inflammatory whole foods", ...],
    "foodsToEat": [{"food": "Wild Salmon", "reason": "Rich in omega-3s which often help reduce skin inflammation"}],
    "foodsToAvoid": [{"food": "Refined Sugar", "reason": "Commonly linked to increased inflammation"}],
    "mealTemplate": {
      "breakfast": "Overnight oats with berries, chia seeds, and honey",
      "lunch": "Grilled salmon salad with leafy greens and avocado",
      "dinner": "Baked sweet potato with steamed vegetables and lean protein",
      "snack": "Handful of walnuts with an apple"
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
    "mealPlanPrinciples": ["Focus on whole foods", "Reduce refined sugar", "Prioritize omega-3 fats", "Increase fiber diversity", "Support gut microbiome"],
    "commonTriggerFoods": [{"food": "Dairy", "approach": "Try reducing for 2-3 weeks and observe."}],
    "hydrationGuidance": "Aim for 2-3 liters of water daily.",
    "gutExplanation": "A simple 2-3 sentence explanation of how gut health may be connected to what is showing on the skin.",
    "sevenDayGutPlan": [
      {"day": "Days 1-2", "focus": "Add one serving of fermented food. Increase water to 2L."},
      {"day": "Days 3-4", "focus": "Add high-fiber vegetable to each meal."},
      {"day": "Days 5-6", "focus": "Reduce ultra-processed snacks."},
      {"day": "Day 7", "focus": "Review progress. Continue the pattern."}
    ],
    "digestiveSupport": ["Eat slowly and chew thoroughly", "Include protein and fiber at each meal"],
    "gutCautions": "If you have IBS or reflux, adjust carefully.",
    "sleepPlan": ["Keep a consistent bedtime", "Make room dark and cool", "Avoid screens before bed"],
    "stressPlan": ["2-minute breathing exercises", "10-minute walk outside daily", "Write 3 things that went well"],
    "exerciseGuidance": ["20-30 minutes moderate movement", "Walking, yoga, swimming", "Shower after sweating"],
    "sunlightGuidance": ["10-15 min morning sunlight", "Use mineral SPF 30+", "Avoid prolonged midday sun"],
    "dailyChecklist": ["Gentle morning cleanse", "Apply moisturizer", "Drink 2L+ water", "Eat vegetables at each meal", "10-minute walk", "Evening cleanse", "Wind down before sleep"],
    "thisWeekFocus": "A specific 1-2 sentence focus for this week.",
    "gutHealth": ["Detailed gut health recommendations"],
    "lifestyle": ["Detailed lifestyle recommendations"]
  }
}

SKIN SCORE RULES:
- The overall score ranges from 0-100 where 100 is optimal skin health.
- Calculate based on: visual severity from ALL photos provided, user answers about diet/stress/sleep/hydration.
- Each factor score should be 0-100.
- Be realistic but not discouraging. Most people with visible issues score 40-70.
- Provide clear, specific explanations for each factor referencing what you actually see.

MULTI-IMAGE ANALYSIS RULES:
- When multiple images are provided, analyze ALL of them collectively.
- Look for patterns visible across images - different angles reveal different information.
- Use multiple views to increase or decrease confidence in observations.
- Note if images show different areas or the same area from different angles.
- If any image is blurry or unclear, note it but still use whatever information is visible.

Provide 2-4 possible conditions ranked by probability. Use cautious language throughout.
Adapt ALL recommendations (routines, products, triggers) to the detected body area.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const requestBody = await req.json();
    const { imageBase64, imagesBase64, answers } = requestBody ?? {};
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const images: Array<{ base64: string; mimeType: string }> = [];

    const normalizeImage = (input: unknown) => {
      if (typeof input === "string" && input.length > 0) {
        images.push({ base64: input, mimeType: "image/jpeg" });
        return;
      }

      if (
        input &&
        typeof input === "object" &&
        typeof (input as { base64?: unknown }).base64 === "string"
      ) {
        const candidate = input as { base64: string; mimeType?: string };
        images.push({
          base64: candidate.base64,
          mimeType: typeof candidate.mimeType === "string" && candidate.mimeType.startsWith("image/")
            ? candidate.mimeType
            : "image/jpeg",
        });
      }
    };

    if (Array.isArray(imagesBase64) && imagesBase64.length > 0) {
      imagesBase64.forEach(normalizeImage);
    } else if (imageBase64) {
      normalizeImage(imageBase64);
    }

    if (images.length === 0) {
      throw new Error("At least one image is required");
    }

    console.info("[analyze-skin] request received", {
      imageCount: images.length,
      hasAnswers: !!answers,
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

Return the FULL JSON response with ALL fields including bodyArea, skinScore and the expanded healingProtocol.`,
          },
          ...imageContentParts,
        ],
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI analysis failed");
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
