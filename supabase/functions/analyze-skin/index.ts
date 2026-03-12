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

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GATEWAY_TIMEOUT_MS = 90000;

const SYSTEM_PROMPT = `You are SkinHeal AI, an expert skin wellness assistant.

NON-NEGOTIABLE RULES:
- Never diagnose. Use wording like "may suggest" or "is consistent with".
- Write in very simple, clear language for everyday users.
- Never use asterisks in output.
- Return strict JSON only, with no markdown or extra text.
- Base every claim on what is visible in the photo and user answers.
- Keep all sections consistent: skin score, conditions, root causes, and protocol must tell one coherent story.

BODY AREA:
- First detect body area from: face, forehead, cheeks, nose, chin, neck, chest, shoulders, back, arms, legs, scalp, hands, other.
- All questions and recommendations must match that exact area.
- Example: if back/chest acne is shown, do not give face-only advice.

DYNAMIC QUESTIONS (when user answers are not provided):
- Return exactly 7 questions with ids q1 to q7.
- Each question must be fully unique with no overlap.
- Use exactly one question per category:
  q1 gut/digestion
  q2 diet/nutrition
  q3 lifestyle/stress
  q4 skincare routine (area-specific)
  q5 hormonal/cyclical
  q6 triggers/patterns
  q7 environment/habits
- Each question must have 3-4 actionable options.
- Questions must be tailored to visible findings and detected body area.

FULL ANALYSIS (when answers are provided):
- Provide 3-5 likely conditions ranked by probability with clear photo-based reasoning.
- Recommendations must be condition-specific and body-area-specific, never generic.
- Keep routines minimal and practical.
- Explain the "why" behind advice in plain language.

FORMATTING QUALITY:
- Numbered items must be sequential with no duplicates or skips.
- morningRoutine and eveningRoutine must use "Step 1:", "Step 2:", etc.
- sevenDayMealPlan must contain Day 1 through Day 7 in order.
- sevenDayGutPlan must use Days 1-2, Days 3-4, Days 5-6, Day 7.

OUTPUT SHAPE:
Always return this JSON structure:
{
  "bodyArea": "string",
  "visualFeatures": ["..."],
  "dynamicQuestions": [{"id":"q1","question":"...","options":["...","...","..."]}],
  "conditions": [{"condition":"...","probability":70,"explanation":"..."}],
  "rootCauses": [{"title":"...","description":"..."}],
  "biologicalExplanation": "...",
  "skinScore": {
    "overall": 0,
    "factors": {
      "inflammation": {"score": 0, "explanation": "..."},
      "gut_health": {"score": 0, "explanation": "..."},
      "diet_quality": {"score": 0, "explanation": "..."},
      "lifestyle": {"score": 0, "explanation": "..."},
      "skin_barrier": {"score": 0, "explanation": "..."}
    }
  },
  "healingProtocol": {
    "whatIsHappening": "...",
    "morningRoutine": ["Step 1: ..."],
    "eveningRoutine": ["Step 1: ..."],
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

const createGatewayRequest = async (
  LOVABLE_API_KEY: string,
  payload: Record<string, unknown>
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  try {
    return await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
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
      let response: Response;
      try {
        response = await createGatewayRequest(LOVABLE_API_KEY, {
          model: "google/gemini-2.5-pro",
          messages,
          stream: true,
        });
      } catch (gatewayError) {
        const timedOut = gatewayError instanceof DOMException && gatewayError.name === "AbortError";
        return new Response(
          JSON.stringify({
            error: timedOut
              ? "Analysis took too long to start. Please retry with 1-2 clear photos."
              : "Analysis could not be started due to a temporary backend issue.",
          }),
          { status: timedOut ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
    const selectedModel = answers ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";
    console.info("[analyze-skin] calling AI gateway", { model: selectedModel, messageCount: messages.length });

    let response: Response;
    try {
      response = await createGatewayRequest(LOVABLE_API_KEY, {
        model: selectedModel,
        messages,
      });
    } catch (gatewayError) {
      const timedOut = gatewayError instanceof DOMException && gatewayError.name === "AbortError";
      return new Response(
        JSON.stringify({
          error: timedOut
            ? "Analysis took too long to start. Please retry with 1-2 clear photos."
            : "Analysis could not be started due to a temporary backend issue.",
        }),
        { status: timedOut ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
      null;

    const parsedCandidate = extractJsonCandidate(content);

    if (!parsedCandidate) {
      console.error("[analyze-skin] failed to parse AI response", { raw: content });

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
