import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  ScanFace, HeartPulse, Apple, MessageCircle, ArrowRight,
  AlertCircle, AlertTriangle, Target, TrendingUp
} from "lucide-react";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";
import { useAllAnalyses } from "@/hooks/useAnalysis";
import { SkinScoreCard } from "@/components/dashboard/SkinScoreCard";
import { ConditionsList } from "@/components/dashboard/ConditionsList";
import { BiologicalExplanation } from "@/components/dashboard/BiologicalExplanation";
import { RootCausesList } from "@/components/dashboard/RootCausesList";
import { WeeklyCheckReminder } from "@/components/dashboard/WeeklyCheckReminder";
import { DailyHealingChecklist } from "@/components/dashboard/DailyHealingChecklist";
import { DailyProgressIndicator } from "@/components/dashboard/DailyProgressIndicator";

const quickActions = [
  { path: "/analysis", label: "Skin Analysis", icon: ScanFace, color: "bg-accent" },
  { path: "/protocol", label: "Healing Protocol", icon: HeartPulse, color: "bg-secondary" },
  { path: "/nutrition", label: "Nutrition", icon: Apple, color: "bg-accent" },
  { path: "/coach", label: "AI Coach", icon: MessageCircle, color: "bg-secondary" },
];

const Dashboard = () => {
  const { currentAnalysis: analysis, isLoading } = useCurrentAnalysis();
  const { data: allAnalyses } = useAllAnalyses();
  const hasAnalysis = !!analysis;

  const topCondition = analysis?.conditions?.[0];
  const protocol = analysis?.healing_protocol;
  const skinScore = analysis?.skin_score;

  // Find previous analysis for score comparison
  const previousAnalysis = allAnalyses && allAnalyses.length >= 2
    ? allAnalyses.find((a) => a.id !== analysis?.id)
    : null;
  const previousScore = previousAnalysis?.skin_score?.overall;
  const currentScore = skinScore?.overall;
  const scoreDelta = currentScore && currentScore > 0 && previousScore && previousScore > 0
    ? currentScore - previousScore
    : null;

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Welcome back</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Your Skin Dashboard</h1>
        <p className="text-muted-foreground mb-8">Track your healing journey and stay on protocol.</p>

        {/* Status Card */}
        <div className="card-elevated gradient-sage mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
                {hasAnalysis ? "Current Assessment" : "Get Started"}
              </p>
              {hasAnalysis && topCondition ? (
                <>
                  <h2 className="font-serif text-2xl mb-1">{topCondition.condition}</h2>
                  <p className="text-sm text-muted-foreground">
                    {topCondition.probability}% likelihood — {topCondition.explanation?.slice(0, 120)}…
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-serif text-2xl mb-1">Start your skin analysis</h2>
                  <p className="text-sm text-muted-foreground">Upload a photo to receive your personalized assessment and healing protocol.</p>
                </>
              )}
            </div>
            <Link to="/analysis" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0">
              {hasAnalysis ? "New Analysis" : "Analyze Now"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Daily Progress Indicator */}
        {hasAnalysis && (
          <div className="mb-6">
            <DailyProgressIndicator />
          </div>
        )}

        {/* Skin Score + Weekly Check (side by side on desktop) */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {hasAnalysis && skinScore && skinScore.overall > 0 ? (
            <div>
              <SkinScoreCard score={skinScore} />
              {scoreDelta !== null && (
                <div className="mt-3 p-3 rounded-xl bg-muted/50 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Previous: {previousScore}/100</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium">Current: {currentScore}/100</span>
                  <span className={`text-xs font-semibold ml-auto ${scoreDelta > 0 ? "text-primary" : scoreDelta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                  </span>
                </div>
              )}
              {scoreDelta !== null && (
                <p className="text-xs text-muted-foreground mt-2 px-1">
                  {scoreDelta > 0 ? "Your skin appears to be improving based on your latest analysis." : scoreDelta < 0 ? "Your skin may need more attention based on recent changes." : "Little visible change since your last analysis."}
                </p>
              )}
            </div>
          ) : (
            <div className="card-elevated flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-serif text-lg mb-1">Skin Health Score</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">Complete an analysis to get your personalized score</p>
            </div>
          )}
          <WeeklyCheckReminder lastAnalysisDate={analysis?.created_at} />
        </div>

        {/* Detected Conditions - Visual probability bars */}
        {hasAnalysis && analysis.conditions?.length > 0 && (
          <div className="mb-6">
            <ConditionsList conditions={analysis.conditions} />
          </div>
        )}

        {/* What's Happening - Engaging biological story */}
        {hasAnalysis && (protocol?.whatIsHappening || analysis.biological_explanation) && (
          <div className="mb-6">
            <BiologicalExplanation text={protocol?.whatIsHappening || analysis.biological_explanation || ""} />
          </div>
        )}

        {/* Root Causes */}
        {hasAnalysis && analysis.root_causes?.length > 0 && (
          <div className="mb-6">
            <RootCausesList rootCauses={analysis.root_causes} />
          </div>
        )}

        {/* This Week Focus */}
        {hasAnalysis && protocol?.thisWeekFocus && (
          <div className="card-elevated gradient-warm mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-serif text-xl">This Week's Focus</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{protocol.thisWeekFocus}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {quickActions.map((action, i) => (
            <motion.div key={action.path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Link to={action.path} className="card-elevated-hover flex flex-col items-center text-center py-6 gap-3">
                <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Daily Healing Checklist */}
        <div className="mb-6">
          <DailyHealingChecklist />
        </div>

        {/* Progress Snapshot */}
        <div className="card-elevated mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl">Your Progress</h3>
            <Link to="/progress" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {hasAnalysis ? (
            <p className="text-sm text-muted-foreground">
              {analysis.conditions?.length > 0
                ? `Tracking ${analysis.conditions.length} condition${analysis.conditions.length > 1 ? "s" : ""}. Follow your protocol consistently for the best results.`
                : "Complete your first analysis to start tracking progress."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Complete your first analysis to start tracking progress.</p>
          )}
        </div>

        {/* Safety / Red Flags */}
        {hasAnalysis && protocol?.safetyGuidance && (
          <div className="p-5 rounded-2xl border border-destructive/20 bg-destructive/5 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="font-serif text-lg text-destructive">When to See a Doctor</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{protocol.safetyGuidance}</p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>This platform provides educational skin wellness insights and is not medical advice.</p>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Dashboard;
