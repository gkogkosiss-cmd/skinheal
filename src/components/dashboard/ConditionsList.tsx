import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ChevronDown } from "lucide-react";

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

const ConditionCard = ({ condition, index }: { condition: Condition; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const colors = getSeverityColor(condition.probability);
  const hasLongExplanation = condition.explanation && condition.explanation.length > 100;
  const preview = hasLongExplanation
    ? condition.explanation.slice(0, 100).replace(/\s+\S*$/, "") + "…"
    : condition.explanation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08 }}
      className="p-4 rounded-xl bg-muted/30 border border-border/50"
    >
      {/* Header: badge + condition name + percentage */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${colors.bg} ${colors.text}`}>
            {getSeverityLabel(condition.probability)}
          </span>
          <h3 className="font-medium text-sm break-words min-w-0 flex-1">{condition.condition}</h3>
          <span className={`text-lg font-bold tabular-nums shrink-0 ${colors.text}`}>
            {condition.probability}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 mb-2.5">
        <motion.div
          className={`h-2 rounded-full ${colors.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${condition.probability}%` }}
          transition={{ delay: 0.2 + index * 0.08, duration: 0.7, ease: "easeOut" }}
        />
      </div>

      {/* Explanation with expand/collapse */}
      {condition.explanation && (
        <>
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: expanded || !hasLongExplanation ? "500px" : "3em" }}
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              {expanded ? condition.explanation : preview}
            </p>
          </div>
          {hasLongExplanation && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {expanded ? "Show less" : "Show more"}
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform duration-300"
                style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
          )}
        </>
      )}
    </motion.div>
  );
};

export const ConditionsList = ({ conditions }: { conditions: Condition[] }) => {
  if (!conditions || conditions.length === 0) return null;

  const sorted = [...conditions].sort((a, b) => b.probability - a.probability);

  return (
    <div className="card-elevated">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-accent-foreground" />
        </div>
        <div className="min-w-0">
          <h2 className="font-serif text-xl">Detected Conditions</h2>
          <p className="text-xs text-muted-foreground">Ranked by likelihood based on your photos and answers</p>
        </div>
      </div>

      <div className="space-y-4">
        {sorted.map((condition, i) => (
          <ConditionCard key={condition.condition} condition={condition} index={i} />
        ))}
      </div>
    </div>
  );
};