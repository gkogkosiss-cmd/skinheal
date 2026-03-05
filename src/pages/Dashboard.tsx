import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import {
  ScanFace, HeartPulse, Apple, Salad, Activity,
  TrendingUp, MessageCircle, CheckCircle2, Circle, ArrowRight
} from "lucide-react";

const quickActions = [
  { path: "/analysis", label: "Skin Analysis", icon: ScanFace, color: "bg-accent" },
  { path: "/protocol", label: "Healing Protocol", icon: HeartPulse, color: "bg-secondary" },
  { path: "/nutrition", label: "Nutrition", icon: Apple, color: "bg-accent" },
  { path: "/coach", label: "AI Coach", icon: MessageCircle, color: "bg-secondary" },
];

const dailyChecklist = [
  { label: "Gentle cleanser — morning", done: false },
  { label: "Apply moisturizer with ceramides", done: false },
  { label: "SPF 30+ sunscreen", done: false },
  { label: "Drink 2L water", done: false },
  { label: "Take probiotic supplement", done: false },
  { label: "Evening cleanse — double cleanse", done: false },
];

const Dashboard = () => {
  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm text-primary font-medium mb-1">Welcome back</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Your Skin Dashboard</h1>
        <p className="text-muted-foreground mb-8">Track your healing journey and stay on protocol.</p>

        {/* Status Card */}
        <div className="card-elevated gradient-sage mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Current Condition</p>
              <h2 className="font-serif text-2xl mb-1">Start your skin analysis</h2>
              <p className="text-sm text-muted-foreground">Upload a photo to receive your personalized diagnosis and healing protocol.</p>
            </div>
            <Link
              to="/analysis"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
            >
              Analyze Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
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
          {/* Daily Routine Checklist */}
          <div className="card-elevated">
            <h3 className="font-serif text-xl mb-4">Daily Routine</h3>
            <div className="space-y-3">
              {dailyChecklist.map((item) => (
                <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-border group-hover:text-primary/50 transition-colors shrink-0" />
                  )}
                  <span className="text-sm text-foreground">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Weekly Insights */}
          <div className="card-elevated">
            <h3 className="font-serif text-xl mb-4">Weekly Insights</h3>
            <div className="space-y-4">
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
            </div>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Dashboard;
