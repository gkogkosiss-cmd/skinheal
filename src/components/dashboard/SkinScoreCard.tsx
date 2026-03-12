import { motion } from "framer-motion";

export interface SkinScoreFactor {
  score: number;
  explanation: string;
}

export interface SkinScore {
  overall: number;
  factors: Record<string, SkinScoreFactor>;
}

const factorLabels: Record<string, string> = {
  inflammation: "Inflammation Impact",
  gut_health: "Gut Health Influence",
  diet_quality: "Nutrition Influence",
  lifestyle: "Lifestyle Impact",
  skin_barrier: "Barrier Health",
};

const factorIcons: Record<string, string> = {
  inflammation: "🔥",
  gut_health: "🦠",
  diet_quality: "🥗",
  lifestyle: "🧘",
  skin_barrier: "🛡️",
};

const getScoreColor = (score: number) => {
  if (score >= 75) return "text-primary";
  if (score >= 50) return "text-foreground";
  return "text-destructive";
};

const getBarColor = (score: number) => {
  if (score >= 75) return "bg-primary";
  if (score >= 50) return "bg-foreground/40";
  return "bg-destructive";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Critical";
};

const getScoreDescription = (score: number) => {
  if (score >= 80) return "Your skin is in great shape. Keep up your current routine.";
  if (score >= 65) return "Solid foundation with room for targeted improvement.";
  if (score >= 50) return "There are clear areas to focus on for better results.";
  if (score >= 35) return "Your skin needs attention — follow the protocol closely.";
  return "Priority areas identified. Consistent care will make a difference.";
};

export const SkinScoreCard = ({ score }: { score: SkinScore }) => {
  if (!score || !score.overall) return null;

  const factors = Object.entries(score.factors || {});
  const sortedFactors = [...factors].sort((a, b) => a[1].score - b[1].score);

  return (
    <div className="card-elevated">
      <p className="text-xs font-medium text-primary uppercase tracking-wide mb-5">Skin Health Score</p>

      {/* Main Score - Large and Prominent */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score.overall / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className={`text-3xl font-bold ${getScoreColor(score.overall)}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              {score.overall}
            </motion.span>
            <span className="text-[10px] text-muted-foreground">/100</span>
          </div>
        </div>
        <div>
          <h3 className="font-serif text-2xl mb-1">{getScoreLabel(score.overall)}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
            {getScoreDescription(score.overall)}
          </p>
        </div>
      </div>

      {/* Factor Breakdown */}
      {sortedFactors.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Factor Breakdown</p>
          {sortedFactors.map(([key, factor], i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="text-sm">{factorIcons[key] || "📊"}</span>
                  {factorLabels[key] || key}
                </span>
                <span className={`text-sm font-bold tabular-nums ${getScoreColor(factor.score)}`}>
                  {factor.score}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-1.5">
                <motion.div
                  className={`h-2 rounded-full ${getBarColor(factor.score)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${factor.score}%` }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                />
              </div>
              {factor.explanation && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">{factor.explanation}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
