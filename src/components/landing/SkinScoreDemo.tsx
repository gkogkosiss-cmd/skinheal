import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, BarChart3 } from "lucide-react";

const weeks = [
  { week: 1, score: 62, redness: 72, inflammation: 68, breakouts: 65 },
  { week: 2, score: 67, redness: 60, inflammation: 55, breakouts: 58 },
  { week: 3, score: 73, redness: 48, inflammation: 42, breakouts: 45 },
  { week: 4, score: 79, redness: 35, inflammation: 30, breakouts: 32 },
];

const indicators = [
  { label: "Redness", key: "redness" as const },
  { label: "Inflammation", key: "inflammation" as const },
  { label: "Breakouts", key: "breakouts" as const },
];

const SkinScoreDemo = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % weeks.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const current = weeks[activeIndex];
  const prev = activeIndex > 0 ? weeks[activeIndex - 1] : null;

  return (
    <div className="card-elevated max-w-md mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h3 className="font-serif text-lg text-foreground">Skin Health Score</h3>
          <p className="text-xs text-muted-foreground">Week {current.week} of 4</p>
        </div>
      </div>

      {/* Score display */}
      <div className="text-center mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.score}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
          >
            <span className="font-serif text-5xl text-primary">{current.score}</span>
            <span className="text-lg text-muted-foreground ml-1">/ 100</span>
          </motion.div>
        </AnimatePresence>
        {prev && (
          <motion.p
            key={`delta-${activeIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-primary mt-1 font-medium"
          >
            +{current.score - prev.score} from last week
          </motion.p>
        )}
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-1.5 h-20 mb-2 px-2">
        {weeks.map((w, i) => (
          <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              className="w-full rounded-t-md relative overflow-hidden"
              style={{ height: `${w.score}%` }}
              initial={false}
            >
              <div
                className={`absolute inset-0 rounded-t-md transition-colors duration-500 ${
                  i <= activeIndex ? "bg-primary" : "bg-primary/20"
                }`}
              />
            </motion.div>
          </div>
        ))}
      </div>
      <div className="flex justify-between px-2 mb-6">
        {weeks.map((w, i) => (
          <span
            key={w.week}
            className={`text-[10px] flex-1 text-center font-medium transition-colors duration-300 ${
              i === activeIndex ? "text-primary" : "text-muted-foreground/60"
            }`}
          >
            Wk {w.week}
          </span>
        ))}
      </div>

      {/* Indicators */}
      <div className="space-y-3 border-t border-border pt-5">
        {indicators.map((ind) => {
          const value = current[ind.key];
          const prevValue = prev ? prev[ind.key] : value;
          const improved = value < prevValue;
          return (
            <div key={ind.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground">{ind.label}</span>
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  {improved && <TrendingDown className="w-3 h-3" />}
                  {improved ? "Improving" : "Stable"}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary/60"
                  initial={false}
                  animate={{ width: `${100 - value}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-5">
        Example: Track gradual, measurable skin improvement over time.
      </p>
    </div>
  );
};

export default SkinScoreDemo;
