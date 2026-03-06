import { useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import type { SkinScore } from "@/components/dashboard/SkinScoreCard";

interface ShareableProgressCardProps {
  oldScore: SkinScore;
  newScore: SkinScore;
  oldDate: string;
  newDate: string;
  weekStart: number;
  weekEnd: number;
  onClose: () => void;
}

const factorLabels: Record<string, string> = {
  inflammation: "Inflammation",
  gut_health: "Gut Health",
  diet_quality: "Diet Quality",
  lifestyle: "Lifestyle",
  skin_barrier: "Skin Barrier",
};

export const ShareableProgressCard = ({
  oldScore,
  newScore,
  oldDate,
  newDate,
  weekStart,
  weekEnd,
  onClose,
}: ShareableProgressCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const diff = newScore.overall - oldScore.overall;
  const improved = diff > 0;

  // Build factor diffs
  const factorDiffs = Object.keys(newScore.factors || {}).map((key) => {
    const oldVal = oldScore.factors?.[key]?.score || 0;
    const newVal = newScore.factors?.[key]?.score || 0;
    const change = newVal - oldVal;
    return { key, label: factorLabels[key] || key, change };
  }).filter(f => f.change !== 0);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = "skin-progress.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // Fallback: copy text
      const text = `My Skin Progress\nWeek ${weekStart} → Week ${weekEnd}\nScore: ${oldScore.overall} → ${newScore.overall}\nAnalyzed with SkinHeal AI`;
      await navigator.clipboard?.writeText(text);
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    const text = `My Skin Progress 🌿\n\nWeek ${weekStart} → Week ${weekEnd}\nSkin Health Score: ${oldScore.overall} → ${newScore.overall}\n\n${factorDiffs.map(f => `${f.label} ${f.change > 0 ? "↑" : "↓"} ${Math.abs(f.change)}%`).join("\n")}\n\nAnalyzed with SkinHeal AI`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard?.writeText(text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* The Card */}
        <div
          ref={cardRef}
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, hsl(148 25% 38%), hsl(148 30% 28%))",
            padding: "2rem",
            color: "white",
          }}
        >
          <p style={{ fontSize: "12px", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
            My Skin Progress
          </p>
          <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "24px" }}>
            Week {weekStart} → Week {weekEnd}
          </p>

          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "20px" }}>
            <span style={{ fontSize: "48px", fontWeight: "bold" }}>{oldScore.overall}</span>
            <span style={{ fontSize: "20px", opacity: 0.6 }}>→</span>
            <span style={{ fontSize: "48px", fontWeight: "bold" }}>{newScore.overall}</span>
            {improved && (
              <span style={{ fontSize: "16px", background: "rgba(255,255,255,0.2)", borderRadius: "999px", padding: "4px 10px" }}>
                +{diff}
              </span>
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "16px" }}>
            {factorDiffs.map((f) => (
              <div key={f.key} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "8px" }}>
                <span style={{ opacity: 0.8 }}>{f.label}</span>
                <span style={{ fontWeight: 600 }}>
                  {f.change > 0 ? "↑" : "↓"} {Math.abs(f.change)}%
                </span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "11px", opacity: 0.5, marginTop: "20px", textAlign: "center" }}>
            Analyzed with The Skin Guy AI
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Saving..." : "Save Image"}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" /> Close
        </button>
      </div>
    </div>
  );
};
