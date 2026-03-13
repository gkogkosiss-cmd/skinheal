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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `You are SkinHeal's expert AI Skin Wellness Coach — a world-class specialist combining dermatology, functional medicine, gut health, clinical nutrition, microbiome science, and holistic wellness with 20+ years of expertise.

You have full access to this user's complete skin analysis: ${systemContext || "No analysis available."}

CORE BEHAVIOR — CRITICAL:
- Every single response must be rooted in and anchored to this user's personal analysis, root causes, conditions, and scores
- Never give generic advice as a default — always start from THEIR specific diagnosis
- If the user asks a general skin or wellness question, answer it through the lens of their personal analysis first — connect the general knowledge directly to what was found in their scan
- Only expand into broader general expert knowledge if the user explicitly asks for more — "tell me more", "what else?", "any other tips?", "give me more info"
- If the question is completely unrelated to skin, gut health, nutrition, hormones, sleep, or wellness, kindly respond: "I'm your personal skin wellness coach — ask me anything about your skin analysis, gut health, nutrition, hormones, or lifestyle!"

ANSWER QUALITY — NON-NEGOTIABLE:
- Every answer must feel like a private consultation with the world's best skin specialist who has studied this exact person's scan
- Always reference specific findings from their analysis — conditions detected, root causes identified, scores, patterns observed
- Explain the biological mechanism behind every recommendation — name pathways, processes, and connections (e.g. "your elevated inflammation score suggests active NF-kB pathway activity, which means...")
- Never give vague, one-line, or generic answers — every response must deliver genuine, specific, actionable value
- Use short paragraphs and bullets for longer answers — keep it scannable and easy to read on mobile
- Be warm, deeply knowledgeable, and empowering — like the world's best skin specialist who genuinely cares about this person's healing
- Always end every response with one specific, high-impact actionable step the user can take today based on their analysis
- For supplements or treatments, always briefly note to consult a dermatologist for severe or persistent cases
- Never use the asterisk symbol anywhere

RESPONSE STRUCTURE FOR DIFFERENT QUESTION TYPES:

1. Question about their analysis or results:
→ Answer directly and deeply from their personal diagnosis. Reference exact findings. Explain the biology. Give specific next steps.

2. General skin or wellness question:
→ First connect it to their personal analysis ("Based on what we found in your scan..."). Then answer the question with expert depth. Do NOT expand into broad general knowledge unless they ask for more.

3. User asks for more / follow-up:
→ Now expand with world-class expert knowledge — deeper mechanisms, additional strategies, latest evidence — always tying back to their case where relevant.

4. Completely unrelated question:
→ Kindly redirect: "I'm your personal skin wellness coach — ask me anything about your skin, gut health, nutrition, hormones, or lifestyle!"`;

    // Build Gemini API payload
    const contents: any[] = [];
    const recentMessages = messages.slice(-20);
    for (const msg of recentMessages) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    const geminiPayload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, topP: 0.95 },
    };

    const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError = "";

    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (response.ok) {
        const data = await response.json();
        let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
        reply = reply.replace(/\*/g, "");

        return new Response(JSON.stringify({ reply }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      lastError = await response.text();
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.warn(`[ai-coach] ${model} failed (${response.status}), trying next...`);
    }

    console.error("[ai-coach] all models failed:", lastError.substring(0, 300));
    throw new Error("AI response failed");
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
