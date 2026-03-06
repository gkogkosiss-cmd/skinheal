import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Sun, Moon, Calendar, AlertTriangle, Clock, Shield, Sparkles, ArrowRight, AlertCircle, Ban } from "lucide-react";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";
import { DailyHealingChecklist } from "@/components/dashboard/DailyHealingChecklist";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";

const defaultMorning = [
  { step: 1, action: "Rinse face with lukewarm water", note: "Preserve natural oils — skip cleanser in the morning" },
  { step: 2, action: "Apply a gentle ceramide moisturizer", note: "Look for ceramides, niacinamide, or hyaluronic acid" },
  { step: 3, action: "Apply SPF 30+ mineral sunscreen", note: "Zinc oxide based — least irritating for sensitive skin" },
];

const defaultEvening = [
  { step: 1, action: "Gentle cleanser with lukewarm water", note: "pH 5.0-5.5 to support the skin barrier" },
  { step: 2, action: "Apply targeted treatment if recommended", note: "Only if specifically needed for your condition" },
  { step: 3, action: "Seal with ceramide moisturizer", note: "Helps rebuild the skin barrier overnight" },
];

const HealingProtocol = () => {
  const { currentAnalysis: analysis } = useCurrentAnalysis();
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
    : ["Gentle exfoliation with a soft cloth 1-2x per week", "Calming mask with oatmeal or aloe 1x per week"];

  const timeline = protocol?.timeline || "Many people notice initial changes within 7-14 days. More significant improvement often takes 4-8 weeks of consistent daily care.";

  const triggersToAvoid = protocol?.triggersToAvoid?.length
    ? protocol.triggersToAvoid
    : ["Harsh scrubs or exfoliants", "Fragranced products near affected areas", "Touching or picking at the skin", "Very hot water on the face"];

  const dailyChecklist = protocol?.dailyChecklist?.length
    ? protocol.dailyChecklist
    : [
        ...morningSteps.map((s: any) => s.action),
        ...eveningSteps.map((s: any) => s.action),
        ...(weeklyTreatments.length > 0 ? [weeklyTreatments[0]] : []),
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
          {/* What We Think Is Happening */}
          {hasAnalysis && (protocol?.whatIsHappening || analysis.biological_explanation) && (
            <div className="card-elevated gradient-sage">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl">What We Think Is Happening</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {protocol?.whatIsHappening || analysis.biological_explanation}
              </p>
            </div>
          )}

          {/* Interactive Daily Checklist */}
          <DailyHealingChecklist />

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
              <h2 className="font-serif text-xl">Weekly Support</h2>
            </div>
            <ul className="space-y-3">
              {weeklyTreatments.map((t: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Triggers to Avoid */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Ban className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="font-serif text-xl">What to Avoid</h2>
            </div>
            <ul className="space-y-3">
              {triggersToAvoid.map((t: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                  <span className="text-muted-foreground">{t}</span>
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

          {/* Safety Guidance */}
          <div className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="font-serif text-lg text-destructive">If Things Get Worse</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {protocol?.safetyGuidance || "If your symptoms worsen, spread rapidly, become very painful, or show signs of infection, please consult a dermatologist or healthcare provider promptly."}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Red flags to watch for:</span> fever, pus or discharge, severe swelling, rapidly spreading rash, eye involvement, or intense pain. These warrant prompt medical attention.
            </p>
          </div>

          {/* Feedback */}
          {hasAnalysis && (
            <div className="card-elevated">
              <FeedbackWidget context="healing-protocol" />
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>This is educational information, not medical advice. If symptoms are severe, spreading, painful, infected, or persistent, consult a dermatologist.</p>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default HealingProtocol;
