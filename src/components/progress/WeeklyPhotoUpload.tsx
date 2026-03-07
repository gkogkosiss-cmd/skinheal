import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, TrendingUp, TrendingDown, Minus, Sparkles, ChevronRight, Plus, X, ImagePlus, Upload } from "lucide-react";
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

const PROGRESS_QUESTIONS = [
  { key: "breakouts", question: "Since your last check, do your breakouts seem:", options: ["Better", "About the same", "Worse"] },
  { key: "irritation", question: "Does your skin feel:", options: ["Less irritated", "About the same", "More irritated"] },
  { key: "plan_adherence", question: "Have you been following your daily healing plan this week?", options: ["Mostly yes", "Partly", "Not really"] },
  { key: "new_products", question: "Have you introduced any new skincare products or foods recently?", options: ["No", "Yes"] },
  { key: "affected_area", question: "Do you feel the affected area is:", options: ["Calmer", "Unchanged", "More inflamed"] },
];

const MAX_PHOTOS = 5;

type Step = "upload" | "questions" | "analyzing" | "result";

export const WeeklyPhotoUpload = () => {
  const { uploading, uploadProgressPhoto } = useProgressPhotos();
  const [step, setStep] = useState<Step>("upload");
  const [result, setResult] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const galleryRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, MAX_PHOTOS - selectedFiles.length);
    if (newFiles.length === 0) return;

    const combined = [...selectedFiles, ...newFiles].slice(0, MAX_PHOTOS);
    setSelectedFiles(combined);

    const newPreviews = [...previews];
    for (const file of newFiles) {
      newPreviews.push(URL.createObjectURL(file));
    }
    setPreviews(newPreviews.slice(0, MAX_PHOTOS));
  }, [selectedFiles, previews]);

  const removeFile = useCallback((index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }, [previews]);

  const handleFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  }, [addFiles]);

  const proceedToQuestions = () => {
    if (selectedFiles.length === 0) return;
    setAnswers({});
    setCurrentQ(0);
    setStep("questions");
  };

  const handleAnswer = (questionKey: string, answer: string) => {
    const newAnswers = { ...answers, [questionKey]: answer };
    setAnswers(newAnswers);

    if (currentQ < PROGRESS_QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      submitPhotos(newAnswers);
    }
  };

  const submitPhotos = async (finalAnswers: Record<string, string>) => {
    if (selectedFiles.length === 0) return;
    setStep("analyzing");
    try {
      const summary = await uploadProgressPhoto(selectedFiles, finalAnswers);
      setResult(summary);
      setStep("result");
      toast.success("Progress photo saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
      setStep("upload");
    }
  };

  const reset = () => {
    setStep("upload");
    setResult(null);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviews([]);
    setAnswers({});
    setCurrentQ(0);
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input — gallery only */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {/* Upload area */}
      {step === "upload" && (
        <div className="card-elevated">
          {selectedFiles.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-5">
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center px-4">
                <p className="font-medium text-sm mb-1">Upload weekly progress photos</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Upload up to 5 clear photos for a more accurate progress check.
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2">
                  For best results, take your photos first in good lighting, then upload them here.
                </p>
              </div>
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:opacity-80 transition-opacity min-h-[48px]"
              >
                <ImagePlus className="w-5 h-5" />
                Upload Images
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-lg">Progress Photos</h3>
                <span className="text-xs text-muted-foreground">{selectedFiles.length} / {MAX_PHOTOS}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {previews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center active:bg-destructive active:text-destructive-foreground transition-colors"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-background/80 text-[10px] font-medium">
                      {i + 1}
                    </span>
                  </div>
                ))}

                {selectedFiles.length < MAX_PHOTOS && (
                  <button
                    onClick={() => galleryRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 hover:border-primary/30 active:bg-muted transition-colors"
                  >
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Add</span>
                  </button>
                )}
              </div>

              {/* Add more button */}
              {selectedFiles.length < MAX_PHOTOS && (
                <div className="mb-4">
                  <button
                    onClick={() => galleryRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border text-xs font-medium active:bg-muted transition-colors min-h-[44px]"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Add More Photos
                  </button>
                </div>
              )}

              <button
                onClick={proceedToQuestions}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:opacity-80 transition-opacity min-h-[48px]"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Progress questions */}
      <AnimatePresence mode="wait">
        {step === "questions" && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="card-elevated"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg">Quick Progress Check</h3>
              <span className="text-xs text-muted-foreground">{currentQ + 1} / {PROGRESS_QUESTIONS.length}</span>
            </div>

            <div className="w-full h-1 rounded-full bg-muted mb-5">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQ + 1) / PROGRESS_QUESTIONS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <p className="text-sm font-medium mb-4">{PROGRESS_QUESTIONS[currentQ].question}</p>
              <div className="space-y-2">
                {PROGRESS_QUESTIONS[currentQ].options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(PROGRESS_QUESTIONS[currentQ].key, opt)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-muted/50 hover:bg-accent active:bg-accent transition-colors text-sm flex items-center justify-between min-h-[48px]"
                  >
                    <span>{opt}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>

            <button onClick={reset} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
              Cancel
            </button>
          </motion.div>
        )}

        {/* Analyzing */}
        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card-elevated"
          >
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-center px-2">
                <p className="font-medium text-sm mb-1">Analyzing your progress...</p>
                <p className="text-xs text-muted-foreground">Comparing with your baseline — this is a quick check, not a full analysis</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Result */}
        {step === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card-elevated gradient-sage"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-serif text-lg">Weekly Progress Update</h3>
            </div>

            {result.confidence === "low" && (
              <div className="p-3 rounded-xl bg-secondary/50 mb-4 text-xs text-muted-foreground">
                Photo quality may have affected this assessment. For best results, use bright, even lighting.
              </div>
            )}

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
                  Score adjustment:{" "}
                  <span className={result.scoreAdjustment > 0 ? "text-primary" : "text-destructive"}>
                    {result.scoreAdjustment > 0 ? "+" : ""}{result.scoreAdjustment} points
                  </span>
                </p>
              </div>
            )}

            {result.scoreAdjustment === 0 && (
              <div className="p-3 rounded-xl bg-card/60 mb-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Score stable — no significant visible change detected
                </p>
              </div>
            )}

            {result.encouragement && (
              <p className="text-sm text-primary font-medium">{result.encouragement}</p>
            )}

            <button onClick={reset} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
