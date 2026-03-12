import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface Condition {
  condition: string;
  probability: number;
  explanation: string;
}

const getSeverityColor = (probability: number) => {
  if (probability >= 75) return { bar: "bg-destructive", text: "text-destructive", bg: "bg-destructive/10" };
  if (probability >= 50) return { bar: "bg-primary", text: "text-primary", bg: "bg-primary/10" };
  return { bar: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" };
};

const getSeverityLabel = (probability: number) => {
  if (probability >= 80) return "Very Likely";
  if (probability >= 60) return "Likely";
  if (probability >= 40) return "Possible";
  return "Less Likely";
};

export const ConditionsList = ({ conditions }: { conditions: Condition[] }) => {
  if (!conditions || conditions.length === 0) return null;

  const sorted = [...conditions].sort((a, b) => b.probability - a.probability);

  return (
    <div className="card-elevated">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-serif text-xl">Detected Conditions</h2>
          <p className="text-xs text-muted-foreground">Ranked by likelihood based on your photos and answers</p>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map((condition, i) => {
          const colors = getSeverityColor(condition.probability);
          return (
            <motion.div
              key={condition.condition}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="p-4 rounded-xl bg-muted/30 border border-border/50"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {getSeverityLabel(condition.probability)}
                  </span>
                  <h3 className="font-medium text-sm truncate">{condition.condition}</h3>
                </div>
                <span className={`text-lg font-bold tabular-nums shrink-0 ${colors.text}`}>
                  {condition.probability}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 mb-2.5">
                <motion.div
                  className={`h-2 rounded-full ${colors.bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${condition.probability}%` }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                />
              </div>

              {condition.explanation && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {condition.explanation}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
