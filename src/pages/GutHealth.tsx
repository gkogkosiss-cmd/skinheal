import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Heart, Microscope, ShieldCheck, Pill, Utensils, ArrowRight, AlertCircle, AlertTriangle, Calendar } from "lucide-react";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";

const gutSkinConnections = [
  { title: "Microbiome Balance", desc: "Your gut hosts trillions of bacteria. When the balance shifts, inflammation often increases throughout the body — including the skin." },
  { title: "Gut Permeability", desc: "A disrupted gut lining may allow irritants into the bloodstream, which can trigger immune responses that show up as skin inflammation." },
  { title: "Inflammation Pathways", desc: "The gut and skin communicate through shared inflammatory signals. Gut imbalances are commonly associated with conditions like acne, eczema, and dermatitis." },
  { title: "Nutrient Absorption", desc: "A compromised gut may absorb fewer skin-essential nutrients like zinc, vitamin A, and omega-3s — all important for skin repair." },
];

const defaultGutHealingFoods = [
  { category: "Probiotic Foods", items: ["Kimchi", "Sauerkraut", "Kefir", "Miso", "Plain yogurt"], note: "Introduce beneficial bacteria to support microbiome diversity" },
  { category: "Prebiotic Fiber", items: ["Garlic", "Onions", "Leeks", "Asparagus", "Bananas"], note: "Feed the beneficial bacteria already in your gut" },
  { category: "Gut-Soothing Foods", items: ["Bone broth", "Ginger tea", "Cooked vegetables", "Oatmeal"], note: "Gentle on digestion and may help soothe the gut lining" },
  { category: "Polyphenol-Rich Foods", items: ["Blueberries", "Green tea", "Dark chocolate (85%+)", "Olive oil"], note: "Often associated with reduced inflammation and microbiome support" },
];

const supplements = [
  { name: "Zinc (15-30 mg/day)", benefit: "Often supports skin repair and may help regulate inflammation" },
  { name: "Omega-3 (1-2g EPA+DHA/day)", benefit: "Commonly linked to reduced systemic inflammation" },
  { name: "Vitamin D (1000-2000 IU/day)", benefit: "Many people are deficient — may support immune and barrier function" },
  { name: "Probiotics (multi-strain)", benefit: "Lactobacillus and Bifidobacterium strains often support gut balance" },
];

const GutHealth = () => {
  const { currentAnalysis: analysis } = useCurrentAnalysis();
  const protocol = analysis?.healing_protocol;
  const hasAnalysis = !!analysis;

  const personalizedGutTips = protocol?.gutHealth || [];
  const gutExplanation = protocol?.gutExplanation;
  const sevenDayPlan = protocol?.sevenDayGutPlan || [];
  const digestiveSupport = protocol?.digestiveSupport || [];
  const gutCautions = protocol?.gutCautions;

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Gut Health</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">The Gut-Skin Connection</h1>
        <p className="text-muted-foreground mb-8">Your gut health directly influences your skin. Healing often starts from within.</p>

        {!hasAnalysis && (
          <div className="card-elevated gradient-sage mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl mb-1">Get personalized gut health guidance</h2>
                <p className="text-sm text-muted-foreground">Complete a skin analysis for recommendations tailored to your condition.</p>
              </div>
              <Link to="/analysis" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Personalized gut explanation */}
          {gutExplanation && (
            <div className="card-elevated gradient-sage">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl">Your Gut-Skin Connection</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{gutExplanation}</p>
            </div>
          )}

          {/* Personalized tips */}
          {personalizedGutTips.length > 0 && (
            <div className="card-elevated">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl">Your Gut Health Recommendations</h2>
              </div>
              <div className="space-y-3">
                {personalizedGutTips.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <p className="text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-Day Gut Support Plan */}
          {sevenDayPlan.length > 0 && (
            <div className="card-elevated">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent-foreground" />
                </div>
                <h2 className="font-serif text-xl">7-Day Gut Support Plan</h2>
              </div>
              <div className="space-y-4">
                {sevenDayPlan.map((day: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-muted/50">
                    <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">{day.day}</p>
                    <p className="text-sm text-muted-foreground">{day.focus}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How Gut Affects Skin */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Microscope className="w-5 h-5 text-accent-foreground" />
              </div>
              <h2 className="font-serif text-xl">How Your Gut Affects Your Skin</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {gutSkinConnections.map((c, i) => (
                <motion.div key={c.title} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="p-4 rounded-xl bg-muted/50">
                  <h3 className="font-medium text-sm mb-1.5">{c.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Digestion Support */}
          {digestiveSupport.length > 0 && (
            <div className="card-elevated">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-secondary-foreground" />
                </div>
                <h2 className="font-serif text-xl">Digestion Support Basics</h2>
              </div>
              <div className="space-y-3">
                {digestiveSupport.map((tip: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <p className="text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gut Healing Foods */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Utensils className="w-5 h-5 text-accent-foreground" />
              </div>
              <h2 className="font-serif text-xl">Gut-Supporting Foods</h2>
            </div>
            <div className="space-y-6">
              {defaultGutHealingFoods.map((g) => (
                <div key={g.category}>
                  <h3 className="font-medium text-sm mb-2">{g.category}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{g.note}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((item) => (
                      <span key={item} className="px-3 py-1.5 rounded-full bg-accent text-xs font-medium text-accent-foreground">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supplements */}
          <div className="card-elevated gradient-warm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Pill className="w-5 h-5 text-secondary-foreground" />
              </div>
              <h2 className="font-serif text-xl">Optional Supplements</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">These may support healing for some people. Always check with a healthcare provider before starting supplements.</p>
            <div className="space-y-3">
              {supplements.map((s) => (
                <div key={s.name} className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gut Cautions */}
          {gutCautions && (
            <div className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h3 className="font-serif text-lg text-destructive">When to Be Careful</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{gutCautions}</p>
            </div>
          )}

          <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>This is educational information, not medical advice. If symptoms are severe, spreading, painful, infected, or persistent, consult a dermatologist.</p>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default GutHealth;
