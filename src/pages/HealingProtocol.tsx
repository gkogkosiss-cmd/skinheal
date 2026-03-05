import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Sun, Moon, Calendar, AlertTriangle, Clock, Shield, Sparkles, ArrowRight, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { useLatestAnalysis } from "@/hooks/useAnalysis";

const defaultMorning = [
  { step: 1, action: "Rinse face with lukewarm water only", note: "No cleanser in the morning to preserve natural oils" },
  { step: 2, action: "Apply a gentle ceramide moisturizer", note: "Look for ceramides, niacinamide, and hyaluronic acid" },
  { step: 3, action: "Apply SPF 30+ mineral sunscreen", note: "Zinc oxide based — least irritating for compromised skin" },
];

const defaultEvening = [
  { step: 1, action: "Double cleanse with oil-based cleanser", note: "Removes sunscreen and sebum gently" },
  { step: 2, action: "Follow with a gentle, pH-balanced cleanser", note: "pH 5.0–5.5 to support the acid mantle" },
  { step: 3, action: "Apply targeted treatment (if prescribed)", note: "Antifungal cream or calming serum" },
  { step: 4, action: "Seal with ceramide moisturizer", note: "Rebuilds the skin barrier overnight" },
];

const HealingProtocol = () => {
  const { data: analysis } = useLatestAnalysis();
  const protocol = analysis?.healing_protocol;
  const hasAnalysis = !!analysis;

  const morningSteps = protocol?.morningRoutine?.length
    ? protocol.morningRoutine.map((a: string, i: number) => ({ step: i + 1, action: a, note: "" }))
    : defaultMorning;

  const eveningSteps = protocol?.eveningRoutine?.length
    ? protocol.eveningRoutine.map((a: string, i: number) => ({ step: i + 1, action: a, note: "" }))
    : defaultEvening;

  const weeklyTreatments = protocol?.weeklyTreatments?.length
    ? protocol.weeklyTreatments
    : ["Zinc pyrithione or ketoconazole wash — leave on 5 min (2–3x/week)", "Colloidal oat mask for soothing (1x/week)"];

  const timeline = protocol?.timeline || "Most users begin seeing improvement within 7–14 days. Full results typically take 4–8 weeks of consistent protocol adherence.";

  // Build daily checklist
  const dailyChecklist = [
    ...(morningSteps.map((s: any) => ({ label: s.action, period: "Morning" }))),
    ...(eveningSteps.map((s: any) => ({ label: s.action, period: "Evening" }))),
    ...(weeklyTreatments.slice(0, 1).map((t: string) => ({ label: t, period: "Weekly" }))),
  ];

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Healing Protocol</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">
          {hasAnalysis ? "Your Personalized Healing Plan" : "Your Complete Healing Plan"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {hasAnalysis
            ? `Based on your analysis from ${new Date(analysis.created_at).toLocaleDateString()}`
            : "A structured approach to skin healing — routines, treatments, and timelines."}
        </p>

        {!hasAnalysis && (
          <div className="card-elevated gradient-sage mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl mb-1">Get a personalized protocol</h2>
                <p className="text-sm text-muted-foreground">Complete a skin analysis to receive customized healing recommendations.</p>
              </div>
              <Link to="/analysis" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Daily Checklist Card */}
          <div className="card-elevated">
            <h3 className="font-serif text-xl mb-4">Daily Healing Checklist</h3>
            <div className="space-y-3">
              {dailyChecklist.map((item: any, i: number) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <Circle className="w-5 h-5 text-border group-hover:text-primary/50 transition-colors shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{item.period}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Morning Routine */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Sun className="w-5 h-5 text-accent-foreground" />
              </div>
              <h2 className="font-serif text-xl">Morning Routine</h2>
            </div>
            <div className="space-y-4">
              {morningSteps.map((s: any) => (
                <div key={s.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.action}</p>
                    {s.note && <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evening Routine */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Moon className="w-5 h-5 text-secondary-foreground" />
              </div>
              <h2 className="font-serif text-xl">Evening Routine</h2>
            </div>
            <div className="space-y-4">
              {eveningSteps.map((s: any) => (
                <div key={s.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.action}</p>
                    {s.note && <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent-foreground" />
              </div>
              <h2 className="font-serif text-xl">Weekly Treatments</h2>
            </div>
            <ul className="space-y-3">
              {weeklyTreatments.map((t: string) => (
                <li key={t} className="flex items-start gap-3 text-sm">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline */}
          <div className="card-elevated gradient-warm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Clock className="w-5 h-5 text-secondary-foreground" />
              </div>
              <h2 className="font-serif text-xl">Expected Timeline</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{timeline}</p>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>This platform provides educational skin wellness insights and is not medical advice.</p>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default HealingProtocol;
