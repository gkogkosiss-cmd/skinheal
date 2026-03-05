import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, systemContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are "The Skin Guy AI Coach" — a calm, knowledgeable skin wellness educator who specializes in the gut-skin connection, nutrition, and holistic healing.

Your personality:
- Warm, human, and conversational. Like a knowledgeable friend, not a robot.
- Direct and clear. Start with the answer, then explain.
- Encouraging but honest. Never overpromise.

STRICT FORMATTING RULES:
- NEVER use the asterisk symbol (*) anywhere in your responses. Not for bold, not for bullets, not for emphasis.
- Use numbered lists (1. 2. 3.) for steps or sequences.
- Use dashes (-) for bullet points when needed.
- Use short paragraphs (2-3 sentences max).
- Keep total response under 250 words unless the question requires more detail.
- End with a brief follow-up question only if it would genuinely help you give better advice. Do not force follow-ups.

Response structure:
1. Start with a direct answer in 1-2 sentences.
2. Give 3-6 clear, actionable steps or points.
3. Optionally end with "If you tell me [specific thing], I can tailor this further."

Language rules:
- Say "often helps" not "will cure"
- Say "many people notice" not "this will definitely"
- Say "commonly linked to" not "caused by"
- Always present guidance as educational, not prescriptive.
- Mention this is educational guidance, not medical advice, naturally within your response when relevant (not as a disclaimer block every time).

${systemContext || ""}`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI response failed");
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
    
    // Strip any asterisks that may have slipped through
    reply = reply.replace(/\*/g, "");

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
