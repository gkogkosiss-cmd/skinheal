import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { AlertTriangle, Clock, Sparkles, ArrowRight, AlertCircle, Ban } from "lucide-react";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";
import { DailyHealingChecklist } from "@/components/dashboard/DailyHealingChecklist";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { PremiumGate } from "@/components/premium/PremiumGate";

const HealingProtocol = () => {
  const { currentAnalysis: analysis } = useCurrentAnalysis();
  const protocol = analysis?.healing_protocol;
  const hasAnalysis = !!analysis;

  const triggersToAvoid = protocol?.triggersToAvoid?.length
    ? protocol.triggersToAvoid
    : ["Harsh scrubs or exfoliants", "Fragranced products near affected areas", "Touching or picking at the skin", "Very hot water on the face"];

  const timeline = protocol?.timeline || "Many people notice changes within 7–14 days. More significant improvement often takes 4–8 weeks of consistent care.";

  return (
    <Layout>
      <PremiumGate featureName="Healing Protocol">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Healing Protocol</p>
        <h1 className="font-serif mb-2">
          {hasAnalysis ? "Your Personalized Healing Plan" : "Your Healing Plan"}
        </h1>
        <p className="text-muted-foreground mb-8 sm:mb-10">
          {hasAnalysis
            ? `Based on your analysis from ${new Date(analysis.created_at).toLocaleDateString()}`
            : "A structured approach to skin healing — daily actions and timelines."}
        </p>

        {!hasAnalysis && (
          <div className="card-elevated gradient-sage mb-8 sm:mb-10">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-serif mb-1">Get a personalized protocol</h2>
                <p className="text-sm text-muted-foreground">Complete a skin analysis for customized recommendations.</p>
              </div>
              <Link to="/analysis" className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px] sm:w-fit">
                Start Analysis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-6 sm:space-y-8">
          {/* What We Think Is Happening */}
          {hasAnalysis && (protocol?.whatIsHappening || analysis.biological_explanation) && (
            <div className="card-elevated gradient-sage">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
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

          {/* Triggers to Avoid */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="font-serif text-xl">What to Avoid</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {triggersToAvoid.map((t: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                  <span className="text-muted-foreground min-w-0">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="card-elevated">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-serif text-xl">Expected Timeline</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{timeline}</p>
          </div>

          {/* Safety Guidance */}
          <div className="p-4 sm:p-5 rounded-2xl border border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <h3 className="font-serif text-lg text-destructive">If Things Get Worse</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {protocol?.safetyGuidance || "If symptoms worsen, spread, become painful, or show signs of infection, consult a healthcare provider promptly."}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Red flags:</span> fever, pus, severe swelling, rapidly spreading rash, eye involvement, or intense pain.
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
            <p>Educational information, not medical advice. Consult a dermatologist for severe or persistent symptoms.</p>
          </div>
        </div>
      </motion.div>
      </PremiumGate>
    </Layout>
  );
};

export default HealingProtocol;