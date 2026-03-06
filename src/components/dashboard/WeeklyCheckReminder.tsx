import { Link } from "react-router-dom";
import { Camera, ArrowRight } from "lucide-react";

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
            <p className="text-xs text-primary font-medium">Your weekly check is due</p>
          ) : daysUntilNext !== null ? (
            <p className="text-xs text-muted-foreground">Next check in {daysUntilNext} day{daysUntilNext !== 1 ? "s" : ""}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Take your first photo to start tracking</p>
          )}
        </div>
      </div>
      {isDue && (
        <Link
          to="/analysis"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Upload Weekly Photo <ArrowRight className="w-4 h-4" />
        </Link>
      )}
      {!isDue && daysSinceLast !== null && (
        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(100, (daysSinceLast / 7) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};
