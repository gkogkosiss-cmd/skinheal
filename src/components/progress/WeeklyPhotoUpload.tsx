import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Loader2, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { useProgressPhotos, type ProgressChange } from "@/hooks/useProgressPhotos";
import { toast } from "sonner";

const statusIcon = (status: string) => {
  if (status === "improved") return <TrendingUp className="w-4 h-4 text-primary" />;
  if (status === "worsened") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const statusColor = (status: string) => {
  if (status === "improved") return "text-primary";
  if (status === "worsened") return "text-destructive";
  return "text-muted-foreground";
};

export const WeeklyPhotoUpload = () => {
  const { uploading, uploadProgressPhoto } = useProgressPhotos();
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const summary = await uploadProgressPhoto(file);
      setResult(summary);
      toast.success("Progress photo saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className="card-elevated border-dashed border-2 cursor-pointer hover:border-primary/30 transition-colors group"
      >
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
        <div className="flex flex-col items-center py-8 gap-4">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-medium text-sm mb-1">Analyzing your progress...</p>
                <p className="text-xs text-muted-foreground">Comparing with your baseline scan</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm mb-1">Upload weekly progress photo</p>
                <p className="text-xs text-muted-foreground">Quick comparison — no full analysis needed</p>
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card-elevated gradient-sage"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-serif text-lg">Progress Update</h3>
            </div>

            {Array.isArray(result.changes) && result.changes.length > 0 && (
              <div className="space-y-2 mb-4">
                {result.changes.map((change: ProgressChange, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {statusIcon(change.status)}
                    <span className="font-medium">{change.area}</span>
                    <span className={`text-xs ${statusColor(change.status)}`}>
                      {change.status === "improved" ? "Improved" : change.status === "worsened" ? "Needs attention" : "Similar"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {result.summary && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{result.summary}</p>
            )}

            {result.scoreAdjustment !== undefined && result.scoreAdjustment !== 0 && (
              <div className="p-3 rounded-xl bg-card/60 mb-3">
                <p className="text-xs font-medium">
                  Score adjustment: {" "}
                  <span className={result.scoreAdjustment > 0 ? "text-primary" : "text-destructive"}>
                    {result.scoreAdjustment > 0 ? "+" : ""}{result.scoreAdjustment} points
                  </span>
                </p>
              </div>
            )}

            {result.encouragement && (
              <p className="text-sm text-primary font-medium">{result.encouragement}</p>
            )}

            <button onClick={() => setResult(null)} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
