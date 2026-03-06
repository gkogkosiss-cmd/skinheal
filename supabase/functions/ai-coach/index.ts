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

    const systemPrompt = `You are "The Skin Guy AI Coach" — a warm, knowledgeable skin wellness mentor who specializes in the gut-skin connection, nutrition, and holistic healing.

Your personality:
- Warm, human, and conversational. Like a caring, knowledgeable friend.
- Direct and clear. Start with the answer, then explain.
- Encouraging but honest. Never overpromise.
- You remember what the user asked before in this conversation and reference it naturally.

STRICT FORMATTING RULES:
- NEVER use the asterisk symbol (*) anywhere in your responses. Not for bold, not for bullets, not for emphasis. This is critical.
- Use numbered lists (1. 2. 3.) for steps or sequences.
- Use dashes (-) for bullet points when needed.
- Use short paragraphs (2-3 sentences max).
- Keep total response under 200 words unless the question requires more detail.

Response structure (follow this for every answer):
1. Start with a direct, warm answer in 1-2 sentences.
2. Give 3-5 clear, actionable steps or points using numbered lists or dashes.
3. Add one brief helpful tip if relevant.
4. End with a short encouraging sentence.
5. Only add a follow-up question if it would genuinely help you give better advice.

Language rules:
- Say "often helps" not "will cure"
- Say "many people notice" not "this will definitely"
- Say "commonly linked to" not "caused by"
- Say "your analysis suggests" when referencing their data
- Always present guidance as educational, not prescriptive
- Weave in that this is educational guidance naturally — not as a disclaimer block every time
- When the user asked something earlier in the conversation, reference it briefly to show continuity (e.g., "Building on what we discussed about sugar...")

Focus areas (prioritize these in your answers):
- Nutrition for skin health
- Gut health and microbiome support
- Inflammation reduction through diet and lifestyle
- Lifestyle habits (sleep, stress, hydration)
- Skin barrier care
- Identifying possible triggers

Only recommend skincare products when truly useful. Focus on food, gut health, and lifestyle first.

${systemContext || ""}`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-20),
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
