import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, answers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages: any[] = [
      {
        role: "system",
        content: `You are an evidence-based skin wellness educator for "The Skin Guy AI". You analyze skin photos and user responses to provide educational wellness insights.

CRITICAL RULES:
- NEVER diagnose. Use "possible", "likely", "may suggest" — never "you have" or "this is definitely".
- Present probabilities as ranges of likelihood, not certainties.
- All guidance must be cautious, evidence-informed, and practical.
- Keep language simple, clear, and human. Avoid medical jargon.
- Focus on actionable daily habits over product recommendations.
- Only suggest skincare products when truly necessary (cleanser, moisturizer, specific treatment if relevant). Keep it minimal.
- Never use the asterisk symbol (*) in any text output.

When given a skin photo and questionnaire answers, respond with a JSON object using this exact structure:
{
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
  "biologicalExplanation": "A simple, human explanation of what may be happening in the skin. No jargon. 2-3 sentences max.",
  "healingProtocol": {
    "whatIsHappening": "A 2-3 sentence plain-language summary of what seems to be going on. Use cautious language like 'Your skin appears to show...' or 'Based on what we can see...'",
    "morningRoutine": ["Step 1: Rinse with lukewarm water", "Step 2: Apply gentle moisturizer", ...],
    "eveningRoutine": ["Step 1: Gentle cleanser", "Step 2: Apply treatment if needed", ...],
    "weeklyTreatments": ["Specific weekly care steps relevant to the condition"],
    "triggersToAvoid": ["Specific irritants or behaviors to avoid based on the condition"],
    "safetyGuidance": "Clear guidance on when to see a dermatologist. Include red flags: fever, pus, severe swelling, spreading rash, eye involvement, intense pain.",
    "timeline": "Realistic timeline with ranges. Example: 'Many people notice initial changes within 7-14 days. More significant improvement often takes 4-8 weeks of consistent daily care.'",
    "foodPriorities": ["Rule 1: Focus on anti-inflammatory whole foods", "Rule 2: ...", ...],
    "foodsToEat": [{"food": "Wild Salmon", "reason": "Rich in omega-3s which often help reduce skin inflammation"}],
    "foodsToAvoid": [{"food": "Refined Sugar", "reason": "Commonly linked to increased inflammation and sebum production in many people"}],
    "mealTemplate": {
      "breakfast": "Overnight oats with berries, chia seeds, and a drizzle of honey",
      "lunch": "Grilled salmon salad with leafy greens, avocado, and olive oil dressing",
      "dinner": "Baked sweet potato with steamed vegetables and a small portion of lean protein",
      "snack": "Handful of walnuts with an apple, or plain yogurt with blueberries"
    },
    "commonTriggerFoods": [{"food": "Dairy", "approach": "Try reducing for 2-3 weeks and observe if skin changes. Reintroduce slowly."}],
    "hydrationGuidance": "Aim for 2-3 liters of water daily. Herbal teas count. Avoid excessive caffeine and alcohol which can dehydrate skin.",
    "gutExplanation": "A simple 2-3 sentence explanation of how gut health connects to this specific skin presentation. No jargon.",
    "sevenDayGutPlan": [
      {"day": "Days 1-2", "focus": "Add one serving of fermented food (yogurt, kimchi, or sauerkraut). Increase water intake to 2L."},
      {"day": "Days 3-4", "focus": "Add a high-fiber vegetable to each meal. Continue fermented foods daily."},
      {"day": "Days 5-6", "focus": "Reduce ultra-processed snacks. Replace with whole food alternatives like nuts, fruit, or hummus with vegetables."},
      {"day": "Day 7", "focus": "Review how you feel. Many people notice less bloating and more energy by now. Continue this pattern."}
    ],
    "digestiveSupport": ["Eat slowly and chew thoroughly", "Include protein and fiber at each meal", ...],
    "gutCautions": "If you have IBS, reflux, or known food intolerances, adjust this plan carefully. Consider working with a nutritionist for personalized guidance.",
    "sleepPlan": ["Keep a consistent bedtime within 30 minutes each night", "Make your room dark and cool (18-20C / 65-68F)", "Avoid screens 30-60 minutes before bed"],
    "stressPlan": ["Try 2-minute breathing exercises: breathe in for 4 counts, hold for 4, out for 6", "Take a 10-minute walk outside daily", "Write down 3 things that went well today before bed"],
    "exerciseGuidance": ["Aim for 20-30 minutes of moderate movement most days", "Walking, yoga, and swimming are gentle on inflamed skin", "Shower soon after sweating to prevent irritation"],
    "sunlightGuidance": ["Get 10-15 minutes of morning sunlight for vitamin D and circadian rhythm", "Use mineral SPF 30+ on affected areas if spending extended time outdoors", "Avoid prolonged midday sun on compromised skin"],
    "dailyChecklist": ["Gentle morning cleanse", "Apply moisturizer", "Drink 2L+ water", "Eat one serving of vegetables at each meal", "10-minute walk or movement", "Evening cleanse", "Apply any treatment", "Wind down 30 min before sleep"],
    "thisWeekFocus": "A specific, encouraging 1-2 sentence focus for this week based on the condition. Example: 'This week, focus on keeping your routine simple and consistent. Your skin barrier needs time and gentleness to recover.'",
    "gutHealth": ["Detailed gut health recommendations specific to the condition"],
    "lifestyle": ["Detailed lifestyle recommendations specific to the condition"]
  }
}

Provide 2-4 possible conditions ranked by probability. Use cautious language throughout.`
      },
    ];

    // Step 1: Image only - generate dynamic questions
    if (imageBase64 && !answers) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this skin photo. Identify visual features and generate 4-5 highly relevant diagnostic questions based on what you see. Return ONLY the visualFeatures and dynamicQuestions fields as JSON."
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
          }
        ]
      });
    }

    // Step 2: Full analysis with answers
    if (imageBase64 && answers) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this skin photo along with the user's questionnaire answers. Provide a complete, thorough analysis.

User's answers: ${JSON.stringify(answers)}

IMPORTANT GUIDELINES FOR YOUR RESPONSE:
- Use cautious, educational language. Say "may", "often", "commonly" instead of definitive claims.
- Make the healing protocol highly detailed and practical.
- The meal template should be realistic and easy to follow.
- The 7-day gut plan should be progressive and gentle.
- Daily checklist should be 5-8 items max.
- Keep routines minimal — focus on behavior and consistency over products.
- Include specific safety guidance and red flags.
- Never use the asterisk symbol in any text.

Return the FULL JSON response with ALL fields including the expanded healingProtocol.`
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
          }
        ]
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
    } catch {
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
