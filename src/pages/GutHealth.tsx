import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Heart, Microscope, ShieldCheck, Pill, Utensils, ArrowRight, AlertCircle } from "lucide-react";
import { useLatestAnalysis } from "@/hooks/useAnalysis";

const gutSkinConnections = [
  { title: "Microbiome Balance", desc: "Your gut hosts trillions of bacteria. When harmful bacteria outgrow beneficial ones (dysbiosis), inflammation increases systemically — including in your skin." },
  { title: "Gut Permeability", desc: "A damaged gut lining ('leaky gut') allows toxins and undigested proteins to enter your bloodstream, triggering immune responses that manifest as skin inflammation." },
  { title: "Inflammation Pathways", desc: "The gut-skin axis communicates through inflammatory cytokines. Gut inflammation directly amplifies skin conditions like acne, eczema, and dermatitis." },
  { title: "Nutrient Absorption", desc: "A compromised gut absorbs fewer skin-essential nutrients like zinc, vitamin A, and omega-3s — all critical for skin repair and barrier function." },
];

const defaultGutHealingFoods = [
  { category: "Probiotic Foods", items: ["Kimchi", "Sauerkraut", "Kefir", "Miso", "Yogurt (plain, unsweetened)"], note: "Introduce beneficial bacteria strains" },
  { category: "Prebiotic Fiber", items: ["Garlic", "Onions", "Leeks", "Asparagus", "Jerusalem artichokes"], note: "Feed existing beneficial bacteria" },
  { category: "Gut-Soothing Foods", items: ["Bone broth", "Slippery elm tea", "Aloe vera juice", "Marshmallow root"], note: "Heal and soothe the gut lining" },
  { category: "Polyphenol-Rich Foods", items: ["Blueberries", "Green tea", "Dark chocolate (85%+)", "Extra virgin olive oil"], note: "Anti-inflammatory and microbiome-supporting" },
];

const supplements = [
  { name: "Zinc (15–30 mg/day)", benefit: "Anti-inflammatory, supports skin repair, and helps regulate sebum" },
  { name: "Omega-3 (1–2g EPA+DHA/day)", benefit: "Reduces systemic inflammation and strengthens cell membranes" },
  { name: "Vitamin D (1000–4000 IU/day)", benefit: "Immune modulation and barrier function — most people are deficient" },
  { name: "Probiotics (multi-strain)", benefit: "Lactobacillus and Bifidobacterium strains improve gut balance" },
  { name: "L-Glutamine (3–5g/day)", benefit: "Primary fuel for gut lining cells — helps repair intestinal permeability" },
];

const GutHealth = () => {
  const { data: analysis } = useLatestAnalysis();
  const protocol = analysis?.healing_protocol;
  const hasAnalysis = !!analysis;

  const personalizedGutTips = protocol?.gutHealth || [];

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Gut Health</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">The Gut-Skin Connection</h1>
        <p className="text-muted-foreground mb-8">Your gut health directly influences your skin. Healing starts from within.</p>

        {!hasAnalysis && (
          <div className="card-elevated gradient-sage mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl mb-1">Get personalized gut health guidance</h2>
                <p className="text-sm text-muted-foreground">Complete a skin analysis to receive recommendations tailored to your condition.</p>
              </div>
              <Link to="/analysis" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Personalized gut tips from analysis */}
          {hasAnalysis && personalizedGutTips.length > 0 && (
            <div className="card-elevated gradient-sage">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl">Your Personalized Gut Recommendations</h2>
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

          {/* Connection */}
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

          {/* Gut Healing Protocol */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Utensils className="w-5 h-5 text-accent-foreground" />
              </div>
              <h2 className="font-serif text-xl">Gut Healing Protocol</h2>
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
              <h2 className="font-serif text-xl">Supportive Supplements</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Optional supplements that may support your healing. Always consult with a healthcare provider before starting.</p>
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

          <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>This platform provides educational skin wellness insights and is not medical advice.</p>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default GutHealth;
