import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Camera, TrendingUp, Calendar, Plus } from "lucide-react";

const mockProgress = [
  { week: "Week 1", date: "Feb 15", score: 35, note: "Started protocol — redness and flaking present" },
  { week: "Week 2", date: "Feb 22", score: 42, note: "Slight reduction in itching" },
  { week: "Week 3", date: "Mar 1", score: 55, note: "Flaking decreased, less redness" },
];

const Progress = () => (
  <Layout>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <p className="text-sm text-primary font-medium mb-1">Progress Tracker</p>
      <h1 className="font-serif text-3xl md:text-4xl mb-2">Track Your Healing</h1>
      <p className="text-muted-foreground mb-8">Upload weekly photos to visualize your improvement over time.</p>

      <div className="space-y-8">
        {/* Upload New */}
        <div className="card-elevated border-dashed border-2 cursor-pointer hover:border-primary/30 transition-colors group">
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium mb-1">Add this week's photo</p>
              <p className="text-xs text-muted-foreground">Take a clear photo in the same lighting as previous weeks</p>
            </div>
          </div>
        </div>

        {/* Progress Score */}
        <div className="card-elevated gradient-sage">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif text-xl">Healing Progress</h2>
              <p className="text-xs text-muted-foreground">Based on weekly assessments</p>
            </div>
          </div>

          <div className="flex items-end gap-3 h-32 mb-4">
            {mockProgress.map((p, i) => (
              <motion.div
                key={p.week}
                className="flex-1 flex flex-col items-center gap-2"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                style={{ transformOrigin: "bottom" }}
              >
                <span className="text-xs font-semibold text-primary">{p.score}%</span>
                <div
                  className="w-full rounded-xl bg-primary/20 relative"
                  style={{ height: `${p.score}%` }}
                >
                  <div
                    className="absolute inset-0 rounded-xl bg-primary"
                    style={{ opacity: 0.3 + (p.score / 100) * 0.7 }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{p.week}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="card-elevated">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-secondary-foreground" />
            </div>
            <h2 className="font-serif text-xl">Weekly Log</h2>
          </div>
          <div className="space-y-4">
            {mockProgress.map((p, i) => (
              <motion.div
                key={p.week}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 items-start"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{p.week}</p>
                    <span className="text-xs text-muted-foreground">{p.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${p.score}%` }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  </Layout>
);

export default Progress;
