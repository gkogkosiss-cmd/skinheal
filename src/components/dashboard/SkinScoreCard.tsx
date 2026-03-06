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

const getScoreColor = (score: number) => {
  if (score >= 75) return "text-primary";
  if (score >= 50) return "text-foreground";
  return "text-destructive";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Critical";
};

export const SkinScoreCard = ({ score }: { score: SkinScore }) => {
  if (!score || !score.overall) return null;

  const factors = Object.entries(score.factors || {});

  return (
    <div className="card-elevated">
      <p className="text-xs font-medium text-primary uppercase tracking-wide mb-4">Skin Health Score</p>

      {/* Main Score Circle */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score.overall / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className={`text-2xl font-bold ${getScoreColor(score.overall)}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {score.overall}
            </motion.span>
            <span className="text-[10px] text-muted-foreground">/100</span>
          </div>
        </div>
        <div>
          <h3 className="font-serif text-xl mb-1">{getScoreLabel(score.overall)}</h3>
          <p className="text-xs text-muted-foreground">Based on your skin photo, lifestyle, and diet factors.</p>
        </div>
      </div>

      {/* Factor Breakdown */}
      {factors.length > 0 && (
        <div className="space-y-3">
          {factors.map(([key, factor], i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{factorLabels[key] || key}</span>
                <span className={`text-xs font-semibold ${getScoreColor(factor.score)}`}>{factor.score}/100</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                <motion.div
                  className="bg-primary h-1.5 rounded-full"
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
