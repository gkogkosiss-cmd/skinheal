import { forwardRef, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
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

const FILE_NAME = "skinheal-progress.png";
const MIN_VALID_BLOB_BYTES = 1024;

type ShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
};

const renderCardToBlob = async (cardEl: HTMLDivElement): Promise<Blob> => {
  const { default: html2canvas } = await import("html2canvas");

  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(cardEl, {
    backgroundColor: null,
    scale: Math.max(2, window.devicePixelRatio || 2),
    useCORS: true,
    logging: false,
  });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), "image/png", 1);
  });

  if (!blob || blob.size < MIN_VALID_BLOB_BYTES) {
    throw new Error("Generated image was empty");
  }

  return blob;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 1200);
};

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export const ShareableProgressCard = forwardRef<HTMLDivElement, ShareableProgressCardProps>(
  ({
    oldScore,
    newScore,
    oldDate,
    newDate,
    weekStart,
    weekEnd,
    onClose,
  }, forwardedRef) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);
    const [sharing, setSharing] = useState(false);

    const diff = newScore.overall - oldScore.overall;
    const improved = diff > 0;

    const factorDiffs = Object.keys(newScore.factors || {})
      .map((key) => {
        const oldVal = oldScore.factors?.[key]?.score || 0;
        const newVal = newScore.factors?.[key]?.score || 0;
        const change = newVal - oldVal;
        return { key, label: factorLabels[key] || key, change };
      })
      .filter((factor) => factor.change !== 0);

    const shareText = `My Skin Progress\n\n${formatDate(oldDate)} to ${formatDate(newDate)}\nSkin Health Score: ${oldScore.overall} -> ${newScore.overall}\n\n${factorDiffs
      .map((factor) => `${factor.label} ${factor.change > 0 ? "up" : "down"} ${Math.abs(factor.change)}%`)
      .join("\n")}\n\nAnalyzed with SkinHeal`;

    const handleDownload = async () => {
      if (!cardRef.current || downloading || sharing) return;

      setDownloading(true);
      try {
        const blob = await renderCardToBlob(cardRef.current);
        downloadBlob(blob, FILE_NAME);
        toast.success("Image saved successfully.");
      } catch (error) {
        console.error("Save image error:", error);
        toast.error("Could not save this image. Please try again.");
      } finally {
        setDownloading(false);
      }
    };

    const handleShare = async () => {
      if (!cardRef.current || downloading || sharing) return;

      setSharing(true);
      try {
        const blob = await renderCardToBlob(cardRef.current);
        const shareNavigator = navigator as ShareNavigator;

        if (typeof shareNavigator.share === "function") {
          const file = new File([blob], FILE_NAME, { type: "image/png" });
          const supportsFileShare =
            typeof shareNavigator.canShare === "function" && shareNavigator.canShare({ files: [file] });

          if (supportsFileShare) {
            await shareNavigator.share({
              title: "SkinHeal Progress",
              text: "My latest SkinHeal progress update",
              files: [file],
            });
            return;
          }

          await shareNavigator.share({
            title: "SkinHeal Progress",
            text: shareText,
          });
          toast.message("Image file sharing is not available here. Use Save Image to post it manually.");
          return;
        }

        downloadBlob(blob, FILE_NAME);
        toast.message("Sharing is not available on this device. The image was saved instead.");
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          toast.error("Sharing is not available on this device. You can save the image instead.");
        }
      } finally {
        setSharing(false);
      }
    };

    return (
      <div
        ref={forwardedRef}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="w-full max-w-sm min-w-0" onClick={(event) => event.stopPropagation()}>
          <div
            ref={cardRef}
            className="rounded-3xl overflow-hidden bg-primary text-primary-foreground p-6 sm:p-8 shadow-xl"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary-foreground/70 mb-1">My Skin Progress</p>
            <p className="text-sm text-primary-foreground/80 mb-5">
              Week {weekStart} to Week {weekEnd}
            </p>

            <div className="flex items-end gap-2 sm:gap-3 mb-5 flex-wrap min-w-0">
              <span className="text-4xl sm:text-5xl font-bold leading-none">{oldScore.overall}</span>
              <span className="text-lg text-primary-foreground/70 leading-none">to</span>
              <span className="text-4xl sm:text-5xl font-bold leading-none">{newScore.overall}</span>
              {improved && (
                <span className="text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-full bg-primary-foreground/20 break-words">
                  +{diff}
                </span>
              )}
            </div>

            {factorDiffs.length > 0 && (
              <div className="border-t border-primary-foreground/20 pt-4 space-y-2">
                {factorDiffs.map((factor) => (
                  <div key={factor.key} className="flex items-center justify-between gap-3 text-sm min-w-0">
                    <span className="text-primary-foreground/85 break-words min-w-0">{factor.label}</span>
                    <span className="font-semibold shrink-0">
                      {factor.change > 0 ? "↑" : "↓"} {Math.abs(factor.change)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-primary-foreground/60 mt-5 text-center">Analyzed with SkinHeal</p>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleDownload}
              disabled={downloading || sharing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:opacity-80 transition-opacity min-h-[48px] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Saving..." : "Save Image"}
            </button>
            <button
              onClick={handleShare}
              disabled={sharing || downloading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-card text-card-foreground text-sm font-medium hover:bg-muted active:bg-muted transition-colors min-h-[48px] disabled:opacity-50"
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
  },
);

ShareableProgressCard.displayName = "ShareableProgressCard";
