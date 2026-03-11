import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ScanFace, Search, HeartPulse, Apple, Leaf, CheckCircle2 } from "lucide-react";

const steps = [
  { icon: ScanFace, label: "Scanning your photos", detail: "Detecting visual patterns and features" },
  { icon: Search, label: "Identifying conditions", detail: "Matching against known skin conditions" },
  { icon: HeartPulse, label: "Finding root causes", detail: "Analyzing inflammation markers and triggers" },
  { icon: Apple, label: "Building nutrition plan", detail: "Crafting your anti-inflammatory meal plan" },
  { icon: Leaf, label: "Creating healing protocol", detail: "Designing your personalized daily routine" },
  { icon: CheckCircle2, label: "Finalizing your report", detail: "Putting everything together for you" },
];

interface Props {
  imageCount: number;
  imagePreviews: string[];
}

export const AnalysisLoadingScreen = ({ imageCount, imagePreviews }: Props) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const intervals = [3500, 5000, 6500, 8500, 11000, 14000];
    const timers: ReturnType<typeof setTimeout>[] = [];

    intervals.forEach((ms, i) => {
      if (i > 0) {
        timers.push(setTimeout(() => setActiveStep(i), ms));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="card-elevated">
      <div className="flex flex-col items-center pt-6 pb-4 sm:pt-8 sm:pb-6 gap-5 sm:gap-6">
        {/* Animated logo */}
        <div className="relative">
          <motion.div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-primary/15"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-transparent border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </motion.div>
          </div>
        </div>

        {/* Photo thumbnails */}
        {imagePreviews.length > 0 && (
          <div className="flex gap-2">
            {imagePreviews.slice(0, 3).map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.7, scale: 1 }}
                transition={{ delay: i * 0.15 }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-border"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
            {imageCount > 3 && (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border border-border flex items-center justify-center bg-muted">
                <span className="text-xs font-medium text-muted-foreground">+{imageCount - 3}</span>
              </div>
            )}
          </div>
        )}

        {/* Active step label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-center px-4"
          >
            <p className="font-serif text-xl sm:text-2xl mb-1">{steps[activeStep].label}…</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{steps[activeStep].detail}</p>
          </motion.div>
        </AnimatePresence>

        {/* Step indicators */}
        <div className="w-full max-w-xs sm:max-w-sm space-y-2 px-2">
          {steps.map((s, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            const Icon = s.icon;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-500 ${
                  isActive ? "bg-accent" : isDone ? "bg-accent/40" : "bg-transparent"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-500 ${
                  isDone ? "bg-primary/15" : isActive ? "bg-primary/10" : "bg-muted/50"
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Icon className={`w-3.5 h-3.5 transition-colors duration-500 ${isActive ? "text-primary" : "text-muted-foreground/40"}`} />
                  )}
                </div>
                <span className={`text-xs font-medium transition-colors duration-500 truncate ${
                  isDone ? "text-primary" : isActive ? "text-foreground" : "text-muted-foreground/50"
                }`}>
                  {s.label}
                </span>
                {isActive && (
                  <motion.div
                    className="ml-auto flex gap-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((d) => (
                      <motion.div
                        key={d}
                        className="w-1 h-1 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Estimated time */}
        <p className="text-[11px] text-muted-foreground/60 mt-2">
          This usually takes 15–30 seconds
        </p>
      </div>
    </div>
  );
};
