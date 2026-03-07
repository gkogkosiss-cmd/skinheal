import { useRef, useState } from "react";
import { Download, Share2, X, Check, AlertCircle } from "lucide-react";
import type { SkinScore } from "@/components/dashboard/SkinScoreCard";
import { toast } from "sonner";

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

const renderCardToCanvas = async (cardEl: HTMLDivElement): Promise<Blob | null> => {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(cardEl, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
  });
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
  const [sharing, setSharing] = useState(false);

  const diff = newScore.overall - oldScore.overall;
  const improved = diff > 0;

  const factorDiffs = Object.keys(newScore.factors || {}).map((key) => {
    const oldVal = oldScore.factors?.[key]?.score || 0;
    const newVal = newScore.factors?.[key]?.score || 0;
    const change = newVal - oldVal;
    return { key, label: factorLabels[key] || key, change };
  }).filter(f => f.change !== 0);

  const shareText = `My Skin Progress 🌿\n\nWeek ${weekStart} → Week ${weekEnd}\nSkin Health Score: ${oldScore.overall} → ${newScore.overall}\n\n${factorDiffs.map(f => `${f.label} ${f.change > 0 ? "↑" : "↓"} ${Math.abs(f.change)}%`).join("\n")}\n\nAnalyzed with SkinHeal AI`;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const blob = await renderCardToCanvas(cardRef.current);
      if (!blob || blob.size < 100) {
        throw new Error("Generated image was empty");
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "skinheal-progress.png";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Image saved successfully!");
    } catch (err) {
      console.error("Save image error:", err);
      // Fallback: copy text
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Copied progress summary to clipboard instead.");
      } catch {
        toast.error("Could not save image on this device.");
      }
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      // Try sharing as image file first (native share with file)
      if (navigator.share && navigator.canShare) {
        const blob = await renderCardToCanvas(cardRef.current);
        if (blob && blob.size > 100) {
          const file = new File([blob], "skinheal-progress.png", { type: "image/png" });
          const shareData = { files: [file], text: shareText };
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            setSharing(false);
            return;
          }
        }
      }

      // Fallback: native share with text only
      if (navigator.share) {
        await navigator.share({ text: shareText });
        setSharing(false);
        return;
      }

      // Final fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      toast.success("Progress summary copied to clipboard!");
    } catch (err: any) {
      // User cancelled share is not an error
      if (err?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(shareText);
          toast.success("Progress summary copied to clipboard!");
        } catch {
          toast.error("Sharing is not available on this device. You can save the image instead.");
        }
      }
    }
    setSharing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* The Card */}
        <div
          ref={cardRef}
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, hsl(148, 25%, 38%), hsl(148, 30%, 28%))",
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

          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "48px", fontWeight: "bold" }}>{oldScore.overall}</span>
            <span style={{ fontSize: "20px", opacity: 0.6 }}>→</span>
            <span style={{ fontSize: "48px", fontWeight: "bold" }}>{newScore.overall}</span>
            {improved && (
              <span style={{ fontSize: "16px", background: "rgba(255,255,255,0.2)", borderRadius: "999px", padding: "4px 10px" }}>
                +{diff}
              </span>
            )}
          </div>

          {factorDiffs.length > 0 && (
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
          )}

          <p style={{ fontSize: "11px", opacity: 0.5, marginTop: "20px", textAlign: "center" }}>
            Analyzed with SkinHeal AI
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity min-h-[48px] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Saving..." : "Save Image"}
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted active:bg-muted transition-colors min-h-[48px] disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            {sharing ? "Sharing..." : "Share"}
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted active:bg-muted transition-colors min-h-[44px]"
        >
          <X className="w-4 h-4" /> Close
        </button>
      </div>
    </div>
  );
};
