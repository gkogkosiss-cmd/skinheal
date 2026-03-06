import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Send, Bot, User, Sparkles, AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Message = { id?: string; role: "user" | "assistant"; content: string; created_at?: string };

const AICoach = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { currentAnalysis: analysis } = useCurrentAnalysis();
  const { user } = useAuth();

  // Load chat history on mount
  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      const { data, error } = await supabase
        .from("ai_coach_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data.map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.message_text,
          created_at: m.created_at,
        })));
      }
      setIsLoadingHistory(false);
    };
    loadHistory();
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const saveMessage = useCallback(async (role: "user" | "assistant", content: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_coach_messages")
      .insert({ user_id: user.id, analysis_id: analysis?.id || null, role, message_text: content })
      .select("id")
      .single();
    return data?.id;
  }, [user?.id, analysis?.id]);

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from("ai_coach_messages").delete().eq("user_id", user.id);
    setMessages([]);
    toast.success("Chat history cleared");
  };

  const suggestedQuestions = analysis
    ? [
        `What should I eat for ${(analysis.conditions as any[])?.[0]?.condition || "my skin condition"}?`,
        "What foods should I avoid?",
        "How can I improve my gut health?",
        "What's my daily healing plan?",
        "When will I see improvement?",
      ]
    : [
        "Can dairy worsen my acne?",
        "Is honey good for seborrheic dermatitis?",
        "What foods heal the gut?",
        "How does stress affect my skin?",
        "What's the best probiotic for skin?",
      ];

  const safeArray = (val: any): any[] => {
    if (Array.isArray(val)) return val;
    if (val && typeof val === "object") return Object.values(val);
    return [];
  };

  const buildSystemContext = () => {
    if (!analysis) return "\n\nNo saved skin analysis found. Provide general skin wellness guidance and suggest the user run an analysis for personalized help.";

    const conditions = safeArray(analysis.conditions);
    const topCondition = conditions[0];
    const rootCauses = safeArray(analysis.root_causes);
    const nutrition = (analysis.nutrition_plan || {}) as any;
    const gut = (analysis.gut_health_plan || {}) as any;
    const lifestyle = (analysis.lifestyle_plan || {}) as any;
    const daily = (analysis.daily_plan || {}) as any;
    const score = (analysis.skin_score || {}) as any;
    const mealPlan = safeArray(nutrition?.seven_day_meal_plan);

    const mealPlanText = mealPlan.length > 0
      ? mealPlan.map((d: any) =>
          `${d.day || "Day ?"}: Breakfast: ${d.breakfast || "N/A"} | Lunch: ${d.lunch || "N/A"} | Dinner: ${d.dinner || "N/A"} | Snack: ${d.snack || "N/A"}`
        ).join("\n")
      : "No meal plan available.";

    return `\n\nUser's current saved analysis context:
- Top condition: ${topCondition?.condition || "Unknown"} (${topCondition?.probability || "?"}% likelihood)
- Possible conditions: ${conditions.map((c: any) => `${c.condition || c} ${c.probability || "?"}%`).join(", ") || "None detected"}
- Root causes: ${rootCauses.map((r: any) => r.title || r.description || String(r)).join(", ") || "None identified"}
- Skin Health Score: ${score?.overall || "N/A"}/100
- Score factors: ${safeArray(score?.factors).map((f: any) => `${f.label}: ${f.score}/100`).join(", ") || "N/A"}
- Food priorities: ${safeArray(nutrition?.priorities).join("; ") || "N/A"}
- Foods to focus: ${safeArray(nutrition?.foods_to_focus).map((f: any) => f.food || f).join(", ") || "N/A"}
- Foods to limit: ${safeArray(nutrition?.foods_to_limit).map((f: any) => f.food || f).join(", ") || "N/A"}
- 7-Day Meal Plan:
${mealPlanText}
- Gut plan: ${safeArray(gut?.seven_day_plan).slice(0, 3).map((d: any) => `${d.day || "?"}: ${safeArray(d.actions).join(", ")}`).join(" | ") || "N/A"}
- Lifestyle: ${[...safeArray(lifestyle?.sleep), ...safeArray(lifestyle?.stress), ...safeArray(lifestyle?.exercise)].slice(0, 6).join("; ") || "N/A"}
- Daily plan: ${[...safeArray(daily?.morning), ...safeArray(daily?.evening)].slice(0, 6).join("; ") || "N/A"}

Always answer using this saved context. When the user asks about a specific day's meal, look up the exact meal from the 7-Day Meal Plan above and quote it directly.
Reference the user's specific conditions, foods, and plan when relevant.
If the user previously asked about something in this conversation, reference it naturally to show continuity.`;
  };

  const send = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    await saveMessage("user", userMsg.content);

    try {
      const systemContext = buildSystemContext();
      const recentMessages = [...messages.slice(-19), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Use fetch directly to avoid supabase client invoke parsing issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-coach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({ messages: recentMessages, systemContext }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("AI Coach error:", response.status, errorBody);
        if (response.status === 429) {
          throw new Error("Rate limit reached. Please wait a moment and try again.");
        }
        if (response.status === 402) {
          throw new Error("AI usage limit reached. Please try again later.");
        }
        throw new Error("Could not generate a reply. Please try again.");
      }

      const data = await response.json();
      const reply = data?.reply || "I'm sorry, I couldn't process your question. Please try again.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      await saveMessage("assistant", reply);
    } catch (err: any) {
      const errMsg = err?.message || "I couldn't generate a reply this time. Please try again in a moment.";
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm text-primary font-medium mb-1">AI Skin Coach</p>
            <h1 className="font-serif text-3xl md:text-4xl mb-1">Ask anything</h1>
            <p className="text-muted-foreground text-sm">
              {analysis
                ? "Personalized guidance based on your skin analysis."
                : "Evidence-based guidance on skin, nutrition, and gut health."}
            </p>
          </div>
          {messages.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Clear chat history">
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your AI Coach conversations. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear History
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : messages.length === 0 ? (
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
          ) : (
            <>
              {messages.map((msg, i) => (
                <motion.div key={msg.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
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
            </>
          )}

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
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder="Ask about your skin, nutrition, or gut health..."
            className="flex-1 px-5 py-3.5 rounded-2xl bg-card border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button onClick={() => send(input)} disabled={!input.trim() || isTyping} className="px-4 py-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-2 mt-3 text-[10px] text-muted-foreground">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <p>Educational guidance only — not medical advice. If symptoms worsen, consult a dermatologist.</p>
        </div>
      </div>
    </Layout>
  );
};

export default AICoach;
