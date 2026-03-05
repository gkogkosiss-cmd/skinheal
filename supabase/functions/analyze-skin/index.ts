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
        content: `You are an expert dermatologist AI assistant for "The Skin Guy AI" platform. You analyze skin photos and user responses to provide educational skin wellness insights.

IMPORTANT: You provide educational guidance only, not medical diagnoses.

When given a skin photo and questionnaire answers, respond with a JSON object using this exact structure:
{
  "visualFeatures": ["redness", "flaking", ...],
  "dynamicQuestions": [
    {"id": "q1", "question": "Does the area itch?", "options": ["Yes", "No", "Sometimes"]},
    ...
  ],
  "conditions": [
    {"condition": "Name", "probability": 74, "explanation": "Clear explanation..."},
    ...
  ],
  "rootCauses": [
    {"title": "Inflammation", "description": "..."},
    ...
  ],
  "biologicalExplanation": "What is happening in your skin...",
  "healingProtocol": {
    "morningRoutine": ["Step 1...", "Step 2..."],
    "eveningRoutine": ["Step 1...", "Step 2..."],
    "weeklyTreatments": ["Treatment 1..."],
    "foodsToEat": [{"food": "Wild Salmon", "reason": "Rich in omega-3..."}],
    "foodsToAvoid": [{"food": "Refined Sugar", "reason": "Spikes insulin..."}],
    "gutHealth": ["Eat fermented foods daily", "..."],
    "lifestyle": ["Sleep 7-9 hours", "..."],
    "timeline": "You should see initial improvement within 7-14 days..."
  }
}

Be specific, evidence-based, and educational. Provide 2-4 possible conditions ranked by probability.`
      },
    ];

    // Step 1: If we have an image but no answers yet, generate dynamic questions
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
            text: `Analyze this skin photo along with the user's questionnaire answers. Provide a complete analysis with conditions, root causes, biological explanation, and healing protocol.

User's answers: ${JSON.stringify(answers)}

Return the FULL JSON response with all fields: conditions, rootCauses, biologicalExplanation, and healingProtocol.`
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
