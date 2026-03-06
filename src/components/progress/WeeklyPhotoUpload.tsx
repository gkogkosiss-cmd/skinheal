import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Loader2, TrendingUp, TrendingDown, Minus, Sparkles, ChevronRight, Plus, X } from "lucide-react";
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
  {
    key: "breakouts",
    question: "Since your last check, do your breakouts seem:",
    options: ["Better", "About the same", "Worse"],
  },
  {
    key: "irritation",
    question: "Does your skin feel:",
    options: ["Less irritated", "About the same", "More irritated"],
  },
  {
    key: "plan_adherence",
    question: "Have you been following your daily healing plan this week?",
    options: ["Mostly yes", "Partly", "Not really"],
  },
  {
    key: "new_products",
    question: "Have you introduced any new skincare products or foods recently?",
    options: ["No", "Yes"],
  },
  {
    key: "affected_area",
    question: "Do you feel the affected area is:",
    options: ["Calmer", "Unchanged", "More inflamed"],
  },
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
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, MAX_PHOTOS - selectedFiles.length);
    if (newFiles.length === 0) return;

    const combined = [...selectedFiles, ...newFiles].slice(0, MAX_PHOTOS);
    setSelectedFiles(combined);

    // Generate previews
    const newPreviews = [...previews];
    for (const file of newFiles) {
      newPreviews.push(URL.createObjectURL(file));
    }
    setPreviews(newPreviews.slice(0, MAX_PHOTOS));
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    if (fileRef.current) fileRef.current.value = "";
  };

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
      {/* Upload area */}
      {step === "upload" && (
        <div className="card-elevated">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />

          {selectedFiles.length === 0 ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-dashed border-2 rounded-xl cursor-pointer hover:border-primary/30 transition-colors group"
            >
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm mb-1">Upload weekly progress photos</p>
                  <p className="text-xs text-muted-foreground">Upload up to 5 photos for a more accurate progress check</p>
                </div>
              </div>
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
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center active:bg-destructive active:text-destructive-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {selectedFiles.length < MAX_PHOTOS && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed flex items-center justify-center hover:border-primary/30 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>

              <button
                onClick={proceedToQuestions}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
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
                    className="w-full text-left px-4 py-3 rounded-xl bg-muted/50 hover:bg-accent transition-colors text-sm flex items-center justify-between group"
                  >
                    <span>{opt}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>

            <button onClick={reset} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
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
              <div className="text-center">
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

            <button onClick={reset} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
