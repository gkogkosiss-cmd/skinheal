import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Moon, Sun, Droplets, Dumbbell, Brain, ArrowRight, AlertCircle } from "lucide-react";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";
import { PremiumGate } from "@/components/premium/PremiumGate";

const Lifestyle = () => {
  const { currentAnalysis: analysis } = useCurrentAnalysis();
  const protocol = analysis?.healing_protocol;
  const hasAnalysis = !!analysis;

  const personalizedTips = protocol?.lifestyle || [];
  const sleepPlan = protocol?.sleepPlan || [
    "Consistent bedtime within 30 min each night",
    "Dark, cool room (18–20°C / 65–68°F)",
    "No screens 30–60 min before bed",
  ];
  const stressPlan = protocol?.stressPlan || [
    "Breathe in 4 counts, hold 4, out 6 — repeat for 2 min",
    "10-minute outdoor walk daily",
    "Write 3 wins before bed",
  ];
  const exerciseGuidance = protocol?.exerciseGuidance || [
    "20–30 min moderate movement most days",
    "Walking, yoga, swimming — gentle on skin",
    "Shower soon after sweating",
  ];
  const sunlightGuidance = protocol?.sunlightGuidance || [
    "10–15 min morning sunlight for vitamin D",
    "Mineral SPF 30+ on affected areas outdoors",
    "Avoid prolonged midday sun on compromised skin",
  ];

  const sections = [
    {
      icon: Moon, title: "Sleep", subtitle: "Quality rest for skin repair",
      points: sleepPlan, tint: "bg-accent",
    },
    {
      icon: Brain, title: "Stress Management", subtitle: "Quick calming techniques",
      points: stressPlan, tint: "bg-secondary",
    },
    {
      icon: Dumbbell, title: "Exercise", subtitle: "Simple, realistic movement",
      points: exerciseGuidance, tint: "bg-accent",
    },
    {
      icon: Sun, title: "Sunlight", subtitle: "Balanced and safe exposure",
      points: sunlightGuidance, tint: "bg-secondary",
    },
  ];

  return (
    <Layout>
      <PremiumGate featureName="Lifestyle Guidance">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Lifestyle</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Lifestyle Factors</h1>
        <p className="text-muted-foreground mb-10">Daily habits that support skin healing and overall wellness.</p>

        {!hasAnalysis && (
          <div className="card-elevated gradient-sage mb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl mb-1">Get personalized guidance</h2>
                <p className="text-sm text-muted-foreground">Complete a skin analysis for tailored lifestyle recommendations.</p>
              </div>
              <Link to="/analysis" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Personalized tips + lifestyle cards merged */}
        <div className="space-y-5">
          {hasAnalysis && personalizedTips.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mb-2">
              {personalizedTips.map((tip: string, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="card-elevated flex items-start gap-4"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Droplets className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Lifestyle pillar cards */}
          <div className="grid sm:grid-cols-2 gap-5">
            {sections.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="card-elevated"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${f.tint} flex items-center justify-center`}>
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg">{f.title}</h3>
                    <p className="text-xs text-muted-foreground">{f.subtitle}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {f.points.map((p: string, j: number) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 mt-10 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Educational information, not medical advice. Consult a dermatologist for severe or persistent symptoms.</p>
        </div>
      </motion.div>
      </PremiumGate>
    </Layout>
  );
};

export default Lifestyle;
