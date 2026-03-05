import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Send, Bot, User, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const suggestedQuestions = [
  "Can dairy worsen my acne?",
  "Is honey good for seborrheic dermatitis?",
  "What foods heal the gut?",
  "How does stress affect my skin?",
  "What's the best probiotic for skin?",
  "Should I avoid gluten for eczema?",
];

const mockResponses: Record<string, string> = {
  default:
    "That's a great question! Based on current evidence, skin health is deeply connected to your gut, nutrition, and lifestyle. I'd recommend focusing on an anti-inflammatory diet rich in omega-3s and fermented foods, reducing refined sugar, and supporting your skin barrier with gentle, pH-balanced products. Would you like more specific guidance?",
  dairy:
    "**Yes, dairy can worsen acne for many people.** Here's why:\n\n• Dairy contains **IGF-1 (insulin-like growth factor)**, which stimulates sebum production and skin cell growth\n• Skim milk has the strongest association with acne — the processing concentrates whey proteins\n• Dairy proteins can trigger **inflammatory cascades** that worsen existing breakouts\n\n**What to try:** Eliminate dairy for 4–6 weeks and monitor your skin. Replace with unsweetened almond, oat, or coconut milk. Many people see noticeable improvement within 3 weeks.",
  honey:
    "**Raw honey can be beneficial for seborrheic dermatitis.** Here's the science:\n\n• Honey has **natural antimicrobial and antifungal properties** that may help control Malassezia yeast\n• It's a natural **humectant**, drawing moisture into the skin\n• A clinical study showed **90% improvement** in patients who applied diluted raw honey to affected areas\n\n**How to use:** Mix raw honey with a small amount of warm water, apply to affected areas, leave for 3 hours, then rinse. Do this every other day for 4 weeks.",
  gut: "**The gut is the foundation of skin health.** Here's how to heal it:\n\n1. **Remove** irritants: processed food, excess sugar, alcohol\n2. **Replace** with whole foods: bone broth, leafy greens, wild fish\n3. **Reinoculate** with probiotics: fermented foods daily\n4. **Repair** with L-glutamine (3–5g/day) and zinc\n\n**Key foods:** Kimchi, sauerkraut, kefir, bone broth, garlic, onions, and polyphenol-rich berries. Aim for 30+ different plants per week for microbiome diversity.",
};

const AICoach = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const getResponse = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes("dairy")) return mockResponses.dairy;
    if (lower.includes("honey")) return mockResponses.honey;
    if (lower.includes("gut") || lower.includes("food")) return mockResponses.gut;
    return mockResponses.default;
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getResponse(text);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
        <div className="mb-4">
          <p className="text-sm text-primary font-medium mb-1">AI Skin Coach</p>
          <h1 className="font-serif text-3xl md:text-4xl mb-1">Ask anything</h1>
          <p className="text-muted-foreground text-sm">Evidence-based guidance on skin, nutrition, and gut health.</p>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm text-center max-w-sm">
                Ask me about skin conditions, nutrition, gut health, or your healing journey.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="px-4 py-2 rounded-full bg-card border border-border text-xs font-medium hover:bg-accent transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-accent-foreground" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
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
          <button
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="px-4 py-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default AICoach;
