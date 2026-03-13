import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Moon, Sun, Dumbbell, Brain, AlertCircle } from "lucide-react";
import { PremiumGate } from "@/components/premium/PremiumGate";

const sections = [
  {
    icon: Moon,
    title: "Sleep",
    subtitle: "Quality rest for skin repair",
    points: [
      "Keep a consistent bedtime each night — even weekends. It regulates melatonin and speeds skin repair.",
      "Dark, cool room — no screens 1hr before bed. Blue light disrupts deep sleep cycles.",
    ],
  },
  {
    icon: Brain,
    title: "Stress Management",
    subtitle: "Quick calming techniques",
    points: [
      "Box breathe: 4 in, 4 hold, 6 out. Do it for 2 minutes to instantly lower cortisol.",
      "10-minute outdoor walk daily — nature and movement together drop stress hormones fast.",
    ],
  },
  {
    icon: Dumbbell,
    title: "Exercise",
    subtitle: "Simple, realistic movement",
    points: [
      "20–30 min moderate movement most days. Boosts circulation, delivering nutrients directly to skin cells.",
      "Shower soon after sweating to prevent clogged pores and bacterial buildup on skin.",
    ],
  },
  {
    icon: Sun,
    title: "Sunlight",
    subtitle: "Balanced and safe exposure",
    points: [
      "10–15 min morning sun for vitamin D — essential for skin barrier repair and immune balance.",
      "Mineral SPF 30+ on affected areas daily. UV exposure worsens inflammation and post-acne marks.",
    ],
  },
];

const Lifestyle = () => {
  return (
    <Layout>
      <PremiumGate featureName="Lifestyle Guidance">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-sm text-primary font-medium mb-1">Lifestyle</p>
          <h1 className="font-serif text-3xl md:text-4xl mb-2">Lifestyle Factors</h1>
          <p className="text-muted-foreground mb-10">Daily habits that support skin healing.</p>

          <div className="grid sm:grid-cols-2 gap-5">
            {sections.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="card-elevated"
              >
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-serif text-lg mb-0.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{s.subtitle}</p>
                <ul className="space-y-2">
                  {s.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="flex items-start gap-2 mt-10 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Educational information, not medical advice.</p>
          </div>
        </motion.div>
      </PremiumGate>
    </Layout>
  );
};

export default Lifestyle;
