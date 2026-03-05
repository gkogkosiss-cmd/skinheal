import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Moon, Sun, Droplets, Dumbbell, Brain, Heart, ArrowRight, AlertCircle } from "lucide-react";
import { useLatestAnalysis } from "@/hooks/useAnalysis";

const factors = [
  {
    icon: Moon, title: "Sleep", subtitle: "7–9 hours of quality sleep",
    points: [
      "Growth hormone peaks during deep sleep — essential for skin cell repair",
      "Poor sleep elevates cortisol, increasing inflammation and sebum production",
      "Create a dark, cool sleep environment (65–68°F / 18–20°C)",
      "Avoid screens 1 hour before bed — blue light disrupts melatonin",
    ],
  },
  {
    icon: Sun, title: "Sunlight", subtitle: "10–20 minutes of morning sun",
    points: [
      "Morning light resets circadian rhythm and boosts vitamin D synthesis",
      "Vitamin D modulates immune function and reduces skin inflammation",
      "Avoid excessive midday sun on compromised skin — use mineral SPF",
    ],
  },
  {
    icon: Droplets, title: "Hydration", subtitle: "2–3 liters of water daily",
    points: [
      "Dehydrated skin has impaired barrier function and increased sensitivity",
      "Add electrolytes (sodium, potassium, magnesium) for better cellular absorption",
      "Herbal teas provide hydration plus anti-inflammatory polyphenols",
    ],
  },
  {
    icon: Dumbbell, title: "Exercise", subtitle: "150 minutes/week moderate activity",
    points: [
      "Movement increases blood flow, delivering nutrients and oxygen to skin",
      "Walking, yoga, and swimming are ideal for skin healing phases",
      "Shower immediately after exercise to prevent sweat-related irritation",
    ],
  },
  {
    icon: Brain, title: "Stress & Nervous System", subtitle: "Daily regulation practices",
    points: [
      "Chronic stress elevates cortisol, directly worsening inflammatory skin conditions",
      "Practice diaphragmatic breathing: 4-7-8 technique activates parasympathetic nervous system",
      "Meditation, even 10 minutes daily, measurably reduces inflammatory markers",
    ],
  },
];

const Lifestyle = () => {
  const { data: analysis } = useLatestAnalysis();
  const protocol = analysis?.healing_protocol;
  const hasAnalysis = !!analysis;

  const personalizedTips = protocol?.lifestyle || [];

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Lifestyle</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Lifestyle Factors</h1>
        <p className="text-muted-foreground mb-8">Your daily habits have a profound impact on skin healing and overall wellness.</p>

        {!hasAnalysis && (
          <div className="card-elevated gradient-sage mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl mb-1">Get personalized lifestyle guidance</h2>
                <p className="text-sm text-muted-foreground">Complete a skin analysis for tailored recommendations.</p>
              </div>
              <Link to="/analysis" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Personalized lifestyle tips */}
        {hasAnalysis && personalizedTips.length > 0 && (
          <div className="card-elevated gradient-sage mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-serif text-xl">Your Personalized Recommendations</h2>
            </div>
            <div className="space-y-3">
              {personalizedTips.map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <p className="text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {factors.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="card-elevated">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="font-serif text-xl">{f.title}</h2>
                  <p className="text-xs text-muted-foreground">{f.subtitle}</p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {f.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="flex items-start gap-2 mt-8 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>This platform provides educational skin wellness insights and is not medical advice.</p>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Lifestyle;
