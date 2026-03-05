import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Send, Bot, User, Sparkles, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";

type Message = { role: "user" | "assistant"; content: string };

const AICoach = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentAnalysis: analysis } = useCurrentAnalysis();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const suggestedQuestions = analysis
    ? [
        `What should I eat for ${(analysis.conditions as any[])?.[0]?.condition || "my skin condition"}?`,
        "What foods should I avoid?",
        "How can I improve my gut health?",
        "Is my routine correct?",
        "When will I see improvement?",
      ]
    : [
        "Can dairy worsen my acne?",
        "Is honey good for seborrheic dermatitis?",
        "What foods heal the gut?",
        "How does stress affect my skin?",
        "What's the best probiotic for skin?",
      ];

  const buildSystemContext = () => {
    if (!analysis) return "";

    const topCondition = (analysis.conditions as any[])?.[0];
    const nutrition = analysis.nutrition_plan;
    const gut = analysis.gut_health_plan;
    const lifestyle = analysis.lifestyle_plan;
    const daily = analysis.daily_plan;

    return `\n\nUser's current saved analysis context:
- Top condition: ${topCondition?.condition} (${topCondition?.probability}% likelihood)
- Possible conditions: ${(analysis.conditions as any[]).map((c: any) => `${c.condition} ${c.probability}%`).join(", ")}
- Root causes: ${(analysis.root_causes as any[]).map((r: any) => r.title).join(", ")}
- Food priorities: ${(nutrition?.priorities || []).join("; ")}
- Foods to focus: ${(nutrition?.foods_to_focus || []).map((f: any) => f.food).join(", ")}
- Foods to limit: ${(nutrition?.foods_to_limit || []).map((f: any) => f.food).join(", ")}
- Gut plan: ${(gut?.seven_day_plan || []).map((d: any) => `${d.day}: ${(d.actions || []).join(" ")}`).join(" | ")}
- Lifestyle plan: ${[...(lifestyle?.sleep || []), ...(lifestyle?.stress || []), ...(lifestyle?.exercise || []), ...(lifestyle?.habits || [])].join("; ")}
- Daily plan: ${[...(daily?.morning || []), ...(daily?.midday || []), ...(daily?.evening || []), ...(daily?.weekly || [])].join("; ")}

Always answer using this saved context. Keep language cautious and educational.`;
  };

  const send = async (text: string) => {
    if (!text.trim()) return;

    if (!analysis) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Run your first skin analysis first, then I can tailor your plan to your saved results." },
      ]);
      return;
    }

    const userMsg: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const systemContext = buildSystemContext();
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: {
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          systemContext,
        },
      });

      if (error) throw error;
      const reply = data?.reply || "I'm sorry, I couldn't process your question. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
        <div className="mb-4">
          <p className="text-sm text-primary font-medium mb-1">AI Skin Coach</p>
          <h1 className="font-serif text-3xl md:text-4xl mb-1">Ask anything</h1>
          <p className="text-muted-foreground text-sm">
            {analysis ? "Personalized guidance based on your skin analysis." : "Evidence-based guidance on skin, nutrition, and gut health."}
          </p>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm text-center max-w-sm">
                {analysis
                  ? `I have your skin analysis on file. Ask me anything about your ${(analysis.conditions as any[])?.[0]?.condition || "condition"}, diet, or healing journey.`
                  : "Ask me about skin conditions, nutrition, gut health, or your healing journey."}
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {suggestedQuestions.map((q) => (
                  <button key={q} onClick={() => send(q)} className="px-4 py-2 rounded-full bg-card border border-border text-xs font-medium hover:bg-accent transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-accent-foreground" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
              }`}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-5 py-3.5">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask about your skin, nutrition, or gut health..."
            className="flex-1 px-5 py-3.5 rounded-2xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button onClick={() => send(input)} disabled={!input.trim() || isTyping} className="px-4 py-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-2 mt-3 text-[10px] text-muted-foreground">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <p>Educational guidance only — not medical advice.</p>
        </div>
      </div>
    </Layout>
  );
};

export default AICoach;
