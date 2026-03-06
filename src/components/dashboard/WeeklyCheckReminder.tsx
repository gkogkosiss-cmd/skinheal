import { Link } from "react-router-dom";
import { Camera, ArrowRight, TrendingUp } from "lucide-react";

export const WeeklyCheckReminder = ({ lastAnalysisDate }: { lastAnalysisDate?: string }) => {
  const daysSinceLast = lastAnalysisDate
    ? Math.floor((Date.now() - new Date(lastAnalysisDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isDue = daysSinceLast !== null && daysSinceLast >= 7;
  const daysUntilNext = daysSinceLast !== null ? Math.max(0, 7 - daysSinceLast) : null;

  return (
    <div className={`card-elevated ${isDue ? "gradient-sage" : ""}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDue ? "bg-primary/10" : "bg-accent"}`}>
          <Camera className={`w-5 h-5 ${isDue ? "text-primary" : "text-accent-foreground"}`} />
        </div>
        <div>
          <h3 className="font-medium text-sm">Weekly Skin Check</h3>
          {isDue ? (
            <p className="text-xs text-primary font-medium">Upload your weekly photos to track changes</p>
          ) : daysUntilNext !== null ? (
            <p className="text-xs text-muted-foreground">Next check in {daysUntilNext} day{daysUntilNext !== 1 ? "s" : ""}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Take your first photos to start tracking</p>
          )}
        </div>
      </div>

      {isDue && (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            Upload new photos so the AI can compare with your previous scan and assess visible changes in redness, flaking, breakouts, and overall skin health.
          </p>
          <Link
            to="/analysis"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <TrendingUp className="w-4 h-4" />
            Upload Weekly Photos <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}

      {!isDue && daysSinceLast !== null && (
        <>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Keep following your healing plan. Your next comparison scan will help track visible changes.
          </p>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (daysSinceLast / 7) * 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
};
