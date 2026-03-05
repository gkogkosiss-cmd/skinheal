import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Moon, Sun, Droplets, Dumbbell, Brain, Heart, ArrowRight, AlertCircle, Circle, CheckSquare } from "lucide-react";
import { useLatestAnalysis } from "@/hooks/useAnalysis";

const Lifestyle = () => {
  const { data: analysis } = useLatestAnalysis();
  const protocol = analysis?.healing_protocol;
  const hasAnalysis = !!analysis;

  const personalizedTips = protocol?.lifestyle || [];
  const sleepPlan = protocol?.sleepPlan || [
    "Keep a consistent bedtime within 30 minutes each night",
    "Make your room dark and cool (18-20°C / 65-68°F)",
    "Avoid screens 30-60 minutes before bed",
  ];
  const stressPlan = protocol?.stressPlan || [
    "Try 2-minute breathing: breathe in for 4 counts, hold for 4, out for 6",
    "Take a 10-minute walk outside daily",
    "Write down 3 things that went well today before bed",
  ];
  const exerciseGuidance = protocol?.exerciseGuidance || [
    "Aim for 20-30 minutes of moderate movement most days",
    "Walking, yoga, and swimming are gentle on inflamed skin",
    "Shower soon after sweating to prevent irritation",
  ];
  const sunlightGuidance = protocol?.sunlightGuidance || [
    "Get 10-15 minutes of morning sunlight for vitamin D and circadian rhythm",
    "Use mineral SPF 30+ on affected areas if spending extended time outdoors",
    "Avoid prolonged midday sun on compromised skin",
  ];
  const dailyChecklist = protocol?.dailyChecklist || [
    "Gentle morning cleanse",
    "Apply moisturizer",
    "Drink 2L+ water",
    "Eat vegetables at each meal",
    "10-minute walk or movement",
    "Evening cleanse",
    "Wind down 30 min before sleep",
  ];

  const sections = [
    {
      icon: Moon, title: "Sleep", subtitle: "Quality rest for skin repair",
      points: sleepPlan,
    },
    {
      icon: Brain, title: "Stress Management", subtitle: "Quick techniques that help",
      points: stressPlan,
    },
    {
      icon: Dumbbell, title: "Exercise", subtitle: "Simple, realistic movement",
      points: exerciseGuidance,
    },
    {
      icon: Sun, title: "Sunlight", subtitle: "Balanced and safe",
      points: sunlightGuidance,
    },
  ];

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Lifestyle</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Lifestyle Factors</h1>
        <p className="text-muted-foreground mb-8">Your daily habits have a meaningful impact on skin healing and overall wellness.</p>

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

        {/* Daily Checklist */}
        <div className="card-elevated mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-accent-foreground" />
            </div>
            <h2 className="font-serif text-xl">Do This Daily</h2>
          </div>
          <div className="space-y-3">
            {dailyChecklist.map((item: string, i: number) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group">
                <Circle className="w-5 h-5 text-border group-hover:text-primary/50 transition-colors shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((f, i) => (
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

        <div className="flex items-start gap-2 mt-8 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>This is educational information, not medical advice. If symptoms are severe, spreading, painful, infected, or persistent, consult a dermatologist.</p>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Lifestyle;
