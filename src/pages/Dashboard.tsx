import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  ScanFace, HeartPulse, Apple, Salad, Activity,
  TrendingUp, MessageCircle, ArrowRight, Sparkles, AlertCircle,
  Circle, AlertTriangle, Target
} from "lucide-react";
import { useCurrentAnalysis } from "@/hooks/useCurrentAnalysis";

const quickActions = [
  { path: "/analysis", label: "Skin Analysis", icon: ScanFace, color: "bg-accent" },
  { path: "/protocol", label: "Healing Protocol", icon: HeartPulse, color: "bg-secondary" },
  { path: "/nutrition", label: "Nutrition", icon: Apple, color: "bg-accent" },
  { path: "/coach", label: "AI Coach", icon: MessageCircle, color: "bg-secondary" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { data: analysis, isLoading } = useLatestAnalysis();
  const hasAnalysis = !!analysis;

  const topCondition = analysis?.conditions?.[0];
  const protocol = analysis?.healing_protocol;

  const dailyChecklist = protocol?.dailyChecklist?.length
    ? protocol.dailyChecklist
    : protocol
      ? [
          ...(protocol.morningRoutine?.slice(0, 2) || []),
          ...(protocol.eveningRoutine?.slice(0, 2) || []),
          ...(protocol.gutHealth?.slice(0, 1) || []),
        ]
      : [
          "Gentle cleanser — morning",
          "Apply moisturizer",
          "SPF 30+ sunscreen",
          "Drink 2L water",
          "Evening cleanse",
          "Take probiotic supplement",
        ];

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">Welcome back</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Your Skin Dashboard</h1>
        <p className="text-muted-foreground mb-8">Track your healing journey and stay on protocol.</p>

        {/* Status Card */}
        <div className="card-elevated gradient-sage mb-8">
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

        {/* What's Happening */}
        {hasAnalysis && (protocol?.whatIsHappening || analysis.biological_explanation) && (
          <div className="card-elevated mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-serif text-xl">What We Think Is Happening</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {protocol?.whatIsHappening || analysis.biological_explanation}
            </p>
          </div>
        )}

        {/* Condition Probabilities */}
        {hasAnalysis && analysis.conditions?.length > 1 && (
          <div className="card-elevated mb-8">
            <h3 className="font-serif text-xl mb-4">Suspected Conditions</h3>
            <div className="space-y-3">
              {analysis.conditions.map((c: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{c.condition}</span>
                    <span className="text-muted-foreground">{c.probability}% likelihood</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.probability}%` }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                      className="bg-primary h-1.5 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* This Week Focus */}
        {hasAnalysis && protocol?.thisWeekFocus && (
          <div className="card-elevated gradient-warm mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="font-serif text-xl">This Week's Focus</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{protocol.thisWeekFocus}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily Checklist */}
          <div className="card-elevated">
            <h3 className="font-serif text-xl mb-4">
              {hasAnalysis ? "Your Daily Healing Plan" : "Daily Routine"}
            </h3>
            <div className="space-y-3">
              {dailyChecklist.map((item: string, i: number) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <Circle className="w-5 h-5 text-border group-hover:text-primary/50 transition-colors shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Actions Today */}
          <div className="card-elevated">
            <h3 className="font-serif text-xl mb-4">
              {hasAnalysis ? "Quick Actions Today" : "Weekly Insights"}
            </h3>
            <div className="space-y-4">
              {hasAnalysis && protocol ? (
                <>
                  {protocol.weeklyTreatments?.slice(0, 2).map((t: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-accent/50">
                      <Activity className="w-5 h-5 text-primary shrink-0" />
                      <p className="text-sm">{t}</p>
                    </div>
                  ))}
                  {protocol.lifestyle?.slice(0, 2).map((l: string, i: number) => (
                    <div key={`l-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                      <p className="text-sm">{l}</p>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50">
                    <Salad className="w-5 h-5 text-primary" />
                    <p className="text-sm">Increase fermented foods this week for gut diversity</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <Activity className="w-5 h-5 text-primary" />
                    <p className="text-sm">Aim for 7+ hours sleep for skin barrier repair</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <p className="text-sm">Track progress — upload a new photo this week</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Safety / Red Flags */}
        {hasAnalysis && protocol?.safetyGuidance && (
          <div className="mt-8 p-5 rounded-2xl border border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="font-serif text-lg text-destructive">When to See a Doctor</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{protocol.safetyGuidance}</p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 mt-8 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>This is educational information, not medical advice. If symptoms are severe, spreading, painful, infected, or persistent, consult a dermatologist.</p>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Dashboard;
