import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Upload, ChevronRight, AlertCircle, Sparkles, Loader2, X, ImagePlus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { allAnalysesQueryKey, latestAnalysisQueryKey, setLatestAnalysisId } from "@/hooks/useAnalysis";
import { normalizeAnalysisRecordPayload } from "@/lib/analysisRecord";
import { MAX_IMAGE_COUNT, prepareImageForAnalysis, validateImageFile, getFileFingerprint } from "@/lib/imageUpload";

type Step = "upload" | "analyzing-photo" | "questions" | "health-questions" | "loading" | "results";

interface DynamicQuestion {
  id: string;
  question: string;
  options: string[];
}

interface Condition {
  condition: string;
  probability: number;
  explanation: string;
}

interface FoodItem {
  food: string;
  reason: string;
}

interface RootCause {
  title: string;
  description: string;
}

interface HealingProtocol {
  morningRoutine: string[];
  eveningRoutine: string[];
  weeklyTreatments: string[];
  foodsToEat: FoodItem[];
  foodsToAvoid: FoodItem[];
  gutHealth: string[];
  lifestyle: string[];
  timeline: string;
}

interface AnalysisResult {
  conditions: Condition[];
  rootCauses: RootCause[];
  biologicalExplanation: string;
  healingProtocol: HealingProtocol;
}

const MAX_IMAGES = MAX_IMAGE_COUNT;
const ANALYSIS_READY_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIN_ANALYSIS_BASE64_LENGTH = 256;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

type ImageSource = "camera" | "gallery";

type SelectedImage = {
  id: string;
  file: File;
  preview: string;
  previewUrl: string;
  base64: string;
  mimeType: string;
  fingerprint: string;
  source: ImageSource;
  uploadedPath?: string;
};

const healthQuestions = [
  { id: "sugar", question: "Do you frequently consume sugary foods or drinks?", options: ["Yes", "No", "Sometimes"] },
  { id: "digestion", question: "Do you experience digestive issues (bloating, gas, irregular bowels)?", options: ["Yes", "No", "Sometimes"] },
  { id: "stress", question: "How would you rate your daily stress levels?", options: ["Low", "Moderate", "High", "Very High"] },
  { id: "sleep", question: "Do you regularly sleep less than 7 hours per night?", options: ["Yes", "No", "Sometimes"] },
  { id: "water", question: "Do you drink at least 2 liters of water daily?", options: ["Yes", "No", "Sometimes"] },
];

const SkinAnalysis = () => {
  const [step, setStep] = useState<Step>("upload");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [visualFeatures, setVisualFeatures] = useState<string[]>([]);
  const [bodyArea, setBodyArea] = useState<string>("face");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [healthQ, setHealthQ] = useState(0);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    previewUrlsRef.current = images.map((img) => img.preview);
  }, [images]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    console.info("[SkinAnalysis] selectedImages updated", {
      selectedCount: images.length,
      analyzeEnabled: images.length >= 1 && !isSelecting,
      sources: images.map((img) => img.source),
      analysisReadyCount: images.filter((img) => Boolean(img.base64 && img.mimeType)).length,
    });
  }, [images, isSelecting]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
    setSelectionError(null);
  }, []);

  // Use a ref to always have current images without stale closures
  const imagesRef = useRef<SelectedImage[]>([]);
  imagesRef.current = images;

  const createImageId = useCallback(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  const openInputPicker = useCallback((input: HTMLInputElement | null) => {
    if (!input) {
      console.error("[SkinAnalysis] input ref is null");
      setSelectionError("Photo upload failed. Please try again.");
      return;
    }

    setSelectionError(null);
    input.value = "";

    // Gallery/replace picker
    try {
      const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
      if (typeof pickerInput.showPicker === "function") {
        pickerInput.showPicker();
      } else {
        input.click();
      }
    } catch (error) {
      console.warn("[SkinAnalysis] showPicker failed, falling back to click", error);
      input.click();
    }
  }, []);


  const summarizeSelectedImages = useCallback((selected: SelectedImage[]) => {
    return selected.map((img) => ({
      id: img.id,
      source: img.source,
      hasFile: img.file instanceof File,
      fileName: img.file?.name,
      fileType: img.file?.type,
      fileSize: img.file?.size,
      hasBase64: typeof img.base64 === "string" && img.base64.length > 0,
      base64Length: img.base64?.length ?? 0,
      mimeType: img.mimeType,
      hasUploadedPath: Boolean(img.uploadedPath),
      previewUrl: img.previewUrl,
    }));
  }, []);

  const buildAnalysisImagePayload = useCallback(async (selected: SelectedImage[]) => {
    const normalizeBase64 = (value: string) => {
      const withoutPrefix = value.replace(/^data:[^;]+;base64,/i, "");
      const normalized = withoutPrefix.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
      const missingPadding = normalized.length % 4;
      return missingPadding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - missingPadding), "=");
    };

    const normalizeMime = (value: string) => {
      const mime = (value || "image/jpeg").toLowerCase();
      return mime === "image/jpg" ? "image/jpeg" : mime;
    };

    const isReadyBase64 = (value: string) =>
      value.length >= MIN_ANALYSIS_BASE64_LENGTH && value.length % 4 === 0 && BASE64_PATTERN.test(value);

    const repairedImages: SelectedImage[] = [];

    const payload = await Promise.all(
      selected.map(async (img, index) => {
        let nextFile = img.file;
        let nextMimeType = normalizeMime(img.mimeType || img.file?.type || "image/jpeg");
        let nextBase64 = normalizeBase64(typeof img.base64 === "string" ? img.base64 : "");

        const needsRebuild = !isReadyBase64(nextBase64) || !ANALYSIS_READY_MIME_TYPES.has(nextMimeType);

        if (needsRebuild && img.file instanceof File) {
          console.warn("[SkinAnalysis] rebuilding invalid image payload from file", {
            index,
            source: img.source,
            previousMimeType: nextMimeType,
            previousBase64Length: nextBase64.length,
          });

          const rebuilt = await prepareImageForAnalysis(img.file);
          URL.revokeObjectURL(rebuilt.previewUrl);

          nextFile = rebuilt.file;
          nextMimeType = normalizeMime(rebuilt.mimeType);
          nextBase64 = normalizeBase64(rebuilt.base64);
        }

        if (!ANALYSIS_READY_MIME_TYPES.has(nextMimeType)) {
          throw new Error(`Image ${index + 1} is not in a supported format. Please use JPG or PNG.`);
        }

        if (!isReadyBase64(nextBase64)) {
          throw new Error(`Image ${index + 1} is corrupted or incomplete. Please retake or re-upload it.`);
        }

        repairedImages[index] = {
          ...img,
          file: nextFile,
          base64: nextBase64,
          mimeType: nextMimeType,
        };

        return { base64: nextBase64, mimeType: nextMimeType };
      })
    );

    setImages((prev) =>
      prev.map((img, index) => {
        const repaired = repairedImages[index];
        return repaired ? { ...img, file: repaired.file, base64: repaired.base64, mimeType: repaired.mimeType } : img;
      })
    );

    return payload;
  }, []);

  const getErrorMessage = useCallback((error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;

    if (/unable to process input image|invalid_argument|unsupported image format/i.test(message)) {
      return "The backend did not receive usable image data. Please retake or re-upload the photo.";
    }

    if (/images were selected, but no valid images/i.test(message)) {
      return "Images were selected, but no valid images were sent for analysis.";
    }

    if (/upload/i.test(message) && /failed/i.test(message)) {
      return "Image upload completed, but the analysis request failed.";
    }

    return message || fallback;
  }, []);

  const processIncomingFiles = useCallback(
    async (
      incomingFiles: File[],
      source: ImageSource,
      mode: "add" | "replace" = "add",
      targetIndex?: number
    ) => {
      if (incomingFiles.length === 0) {
        setSelectionError(source === "camera" ? "No photo was returned from the camera. Please try again." : "Photo upload failed. Please try again.");
        return;
      }

      console.info("[SkinAnalysis] processIncomingFiles", {
        count: incomingFiles.length,
        source,
        mode,
        names: incomingFiles.map((f) => f.name),
      });

      setIsSelecting(true);
      setSelectionError(null);

      try {
        if (mode === "replace" && typeof targetIndex === "number") {
          const file = incomingFiles[0];
          const validationError = validateImageFile(file);
          if (validationError) {
            setSelectionError(validationError);
            toast({ title: "Invalid image", description: validationError, variant: "destructive" });
            return;
          }

          const prepared = await prepareImageForAnalysis(file);
          const rawFingerprint = getFileFingerprint(file);

          setImages((prev) => {
            if (!prev[targetIndex]) {
              URL.revokeObjectURL(prepared.previewUrl);
              return prev;
            }

            URL.revokeObjectURL(prev[targetIndex].preview);
            const next = [...prev];
            next[targetIndex] = {
              id: prev[targetIndex].id,
              file: prepared.file,
              preview: prepared.previewUrl,
              previewUrl: prepared.previewUrl,
              base64: prepared.base64,
              mimeType: prepared.mimeType,
              fingerprint: rawFingerprint,
              source,
              uploadedPath: undefined,
            };
            return next;
          });
          return;
        }

        const currentImages = imagesRef.current;
        const remainingSlots = Math.max(0, MAX_IMAGES - currentImages.length);

        if (remainingSlots <= 0) {
          setSelectionError(`Maximum ${MAX_IMAGES} photos allowed.`);
          return;
        }

        const filesToProcess = incomingFiles.slice(0, remainingSlots);
        const droppedByLimit = incomingFiles.length - filesToProcess.length;

        const existingFingerprints = new Set(currentImages.map((img) => img.fingerprint));
        const preparedImages: SelectedImage[] = [];
        const errors: string[] = [];

        for (const file of filesToProcess) {
          const validationError = validateImageFile(file);
          if (validationError) {
            errors.push(validationError);
            continue;
          }

          const rawFingerprint = getFileFingerprint(file);
          if (existingFingerprints.has(rawFingerprint)) {
            continue;
          }

          try {
            const prepared = await prepareImageForAnalysis(file);
            preparedImages.push({
              id: createImageId(),
              file: prepared.file,
              preview: prepared.previewUrl,
              previewUrl: prepared.previewUrl,
              base64: prepared.base64,
              mimeType: prepared.mimeType,
              fingerprint: rawFingerprint,
              source,
              uploadedPath: undefined,
            });
            existingFingerprints.add(rawFingerprint);
          } catch (error) {
            console.error("[SkinAnalysis] image processing failed", error);
            errors.push(error instanceof Error ? error.message : "We couldn't process that photo. Please retake it.");
          }
        }

        if (preparedImages.length > 0) {
          setImages((prev) => [...prev, ...preparedImages].slice(0, MAX_IMAGES));
          console.info("[SkinAnalysis] preview created", {
            source,
            added: preparedImages.length,
            totalAfterAdd: Math.min(MAX_IMAGES, currentImages.length + preparedImages.length),
          });
        }

        if (droppedByLimit > 0) {
          setSelectionError(`Maximum ${MAX_IMAGES} photos allowed.`);
        } else if (errors.length > 0) {
          const message = errors[0];
          setSelectionError(message);
          toast({ title: "Some photos were not added", description: message, variant: "destructive" });
        }
      } finally {
        setIsSelecting(false);
      }
    },
    [createImageId, toast]
  );

  const openGalleryPicker = useCallback(() => {
    openInputPicker(fileInputRef.current);
  }, [openInputPicker]);


  const handleGallerySelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";

      if (files.length === 0) {
        console.info("[SkinAnalysis] gallery picker cancelled");
        return;
      }

      console.info("[SkinAnalysis] gallery onChange fired", { fileCount: files.length, names: files.map((f) => f.name) });
      await processIncomingFiles(files, "gallery", "add");
    },
    [processIncomingFiles]
  );


  const handleReplaceSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";

      if (replaceIndex === null) return;

      const source = imagesRef.current[replaceIndex]?.source ?? "gallery";
      await processIncomingFiles(files, source, "replace", replaceIndex);
      setReplaceIndex(null);
    },
    [processIncomingFiles, replaceIndex]
  );

  const openReplacePicker = useCallback((index: number) => {
    setSelectionError(null);
    setReplaceIndex(index);
    openInputPicker(replaceInputRef.current);
  }, [openInputPicker]);

  const startAnalysis = async () => {
    const selectedImages = imagesRef.current;
    if (selectedImages.length === 0 || isSelecting) return;

    console.info("[SkinAnalysis] Analyze button clicked", {
      selectedImagesLength: selectedImages.length,
      selectedImages: summarizeSelectedImages(selectedImages),
      analyzeEnabled: selectedImages.length >= 1 && !isSelecting,
    });

    setStep("analyzing-photo");

    try {
      const imagesBase64 = await buildAnalysisImagePayload(selectedImages);
      console.info("[SkinAnalysis] request started", {
        stage: "dynamic-questions",
        imageCount: imagesBase64.length,
      });

      const { data, error } = await supabase.functions.invoke("analyze-skin", {
        body: { imagesBase64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      console.info("[SkinAnalysis] request completed", {
        stage: "dynamic-questions",
        hasBodyArea: Boolean(data?.bodyArea),
        hasDynamicQuestions: Array.isArray(data?.dynamicQuestions),
      });

      const nextQuestions = Array.isArray(data?.dynamicQuestions) ? data.dynamicQuestions : [];
      setDynamicQuestions(nextQuestions);
      setVisualFeatures(Array.isArray(data?.visualFeatures) ? data.visualFeatures : []);

      if (data?.bodyArea) setBodyArea(data.bodyArea);
      setCurrentQ(0);

      if (nextQuestions.length === 0) {
        console.warn("[SkinAnalysis] dynamic question generation returned no questions; continuing to health questions");
        setStep("health-questions");
        return;
      }

      setStep("questions");
    } catch (err: any) {
      console.error("[SkinAnalysis] request failed", { stage: "dynamic-questions", error: err });
      const message = getErrorMessage(err, "Could not start analysis. Please retry.");
      toast({ title: "Analysis failed", description: message, variant: "destructive" });
      setStep("upload");
    }
  };

  const handleDynamicAnswer = (answer: string) => {
    const q = dynamicQuestions[currentQ];
    if (!q) {
      setStep("health-questions");
      return;
    }

    setAnswers((prev) => ({ ...prev, [q.id]: answer }));
    if (currentQ < dynamicQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setCurrentQ(0);
      setStep("health-questions");
    }
  };

  const handleHealthAnswer = (answer: string) => {
    const q = healthQuestions[healthQ];
    if (!q) {
      runFullAnalysis();
      return;
    }

    setAnswers((prev) => ({ ...prev, [q.id]: answer }));
    if (healthQ < healthQuestions.length - 1) {
      setHealthQ(healthQ + 1);
    } else {
      runFullAnalysis();
    }
  };

  const saveAnalysis = async (analysisData: AnalysisResult) => {
    if (!user) throw new Error("Please log in before running an analysis.");

    const selectedImages = imagesRef.current;
    if (selectedImages.length === 0) throw new Error("Please add at least one photo before analysis.");

    const photoUrls: string[] = [];

    try {
      console.info("[SkinAnalysis] upload started", {
        imageCount: selectedImages.length,
        selectedImages: summarizeSelectedImages(selectedImages),
      });

      for (const [index, img] of selectedImages.entries()) {
        const path = `${user.id}/${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("skin-photos")
          .upload(path, img.file, { contentType: img.file.type || "image/jpeg" });

        if (uploadError) {
          console.error("[SkinAnalysis] upload failed", { index, fileName: img.file.name, error: uploadError });
          throw new Error("Image upload completed, but the analysis request failed.");
        }

        photoUrls.push(path);
        console.info("[SkinAnalysis] upload success", { index, path });
      }

      if (photoUrls.length === 0) {
        throw new Error("No image was uploaded. Please select images and retry.");
      }

      setImages((prev) =>
        prev.map((img, index) => ({
          ...img,
          uploadedPath: photoUrls[index] ?? img.uploadedPath,
        }))
      );

      const normalized = normalizeAnalysisRecordPayload({
        analysis: analysisData,
        answers,
        visualFeatures,
      });

      console.info("[SkinAnalysis] payload built", {
        uploadedImageCount: photoUrls.length,
        hasResults: Array.isArray(normalized.results),
      });

      const insertResponse = await supabase
        .from("analysis_records" as any)
        .insert({
          user_id: user.id,
          photo_url: photoUrls[0] || null,
          photo_urls: photoUrls,
          image_observations: normalized.image_observations,
          answers: normalized.answers,
          results: normalized.results,
          root_causes: normalized.root_causes,
          healing_protocol: normalized.healing_protocol,
          nutrition_plan: normalized.nutrition_plan,
          gut_health_plan: normalized.gut_health_plan,
          lifestyle_plan: normalized.lifestyle_plan,
          daily_plan: normalized.daily_plan,
          safety_flags: normalized.safety_flags,
          skin_score: normalized.skin_score,
          body_area: bodyArea,
        } as any)
        .select("id")
        .single();

      const inserted = insertResponse.data as unknown as { id: string } | null;
      const insertError = insertResponse.error;

      if (insertError || !inserted?.id) {
        throw new Error("Failed to save your analysis. Please retry.");
      }

      const { error: stateError } = await setLatestAnalysisId(user.id, inserted.id);
      if (stateError) {
        throw new Error("Saved analysis, but failed to set it as current. Please retry.");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: latestAnalysisQueryKey(user.id) }),
        queryClient.invalidateQueries({ queryKey: allAnalysesQueryKey(user.id) }),
      ]);

      console.info("[SkinAnalysis] analysis saved", { analysisId: inserted.id, uploadedImages: photoUrls.length });
    } catch (error) {
      if (photoUrls.length > 0) {
        await supabase.storage.from("skin-photos").remove(photoUrls);
      }

      console.error("[SkinAnalysis] save analysis failed", error);
      throw error;
    }
  };

  const runFullAnalysis = async () => {
    const selectedImages = imagesRef.current;
    if (selectedImages.length === 0 || isSelecting) {
      toast({ title: "Add photos first", description: "Please add at least one clear photo before analysis." });
      setStep("upload");
      return;
    }

    setStep("loading");

    try {
      const imagesBase64 = await buildAnalysisImagePayload(selectedImages);
      console.info("[SkinAnalysis] request started", {
        stage: "full-analysis",
        selectedImagesLength: selectedImages.length,
        selectedImages: summarizeSelectedImages(selectedImages),
        payloadImageCount: imagesBase64.length,
        answerCount: Object.keys(answers).length,
      });

      const { data, error } = await supabase.functions.invoke("analyze-skin", {
        body: { imagesBase64, answers },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      console.info("[SkinAnalysis] request completed", {
        stage: "full-analysis",
        hasBodyArea: Boolean(data?.bodyArea),
        hasConditions: Array.isArray(data?.conditions),
      });

      const generated = data as AnalysisResult;
      if (data?.bodyArea) setBodyArea(data.bodyArea);

      await saveAnalysis(generated);

      setResults(generated);
      setStep("results");
      console.info("[SkinAnalysis] full analysis completed");
      navigate("/dashboard");
    } catch (err: any) {
      console.error("[SkinAnalysis] request failed", { stage: "full-analysis", error: err });
      const message = getErrorMessage(err, "Analysis could not be completed due to an internal processing issue.");
      toast({ title: "Analysis failed", description: message, variant: "destructive" });
      setStep("upload");
    }
  };

  const totalQuestions = dynamicQuestions.length + healthQuestions.length;
  const currentTotal = step === "questions" ? currentQ : step === "health-questions" ? dynamicQuestions.length + healthQ : 0;

  const easeSmooth = [0.22, 1, 0.36, 1] as const;

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm text-primary font-medium mb-1">AI Skin Analysis</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Analyze your skin</h1>
        <p className="text-muted-foreground mb-8">Upload up to 5 clear photos for a better analysis.</p>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleGallerySelect} />
        <input ref={replaceInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleReplaceSelect} />

        <AnimatePresence mode="wait">
          {/* STEP 1: Upload */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <div className="card-elevated">
                {isSelecting && (
                  <div className="mb-4 p-3 rounded-xl bg-secondary text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing your images...
                  </div>
                )}

                {selectionError && (
                  <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                    {selectionError}
                  </div>
                )}

                {/* Image previews */}
                {images.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">Photos selected: {images.length} / {MAX_IMAGES}</p>
                      <div className="w-24 bg-muted rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${(images.length / MAX_IMAGES) * 100}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                      {images.map((img, i) => (
                        <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                          <img src={img.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute top-1 right-1 flex gap-1">
                            <button
                              onClick={() => openReplacePicker(i)}
                              className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                              aria-label={`Replace photo ${i + 1}`}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeImage(i)}
                              className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
                              aria-label={`Remove photo ${i + 1}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-background/80 text-[10px] font-medium">{i + 1}</span>
                        </div>
                      ))}

                      {images.length < MAX_IMAGES && (
                        <button
                          onClick={openGalleryPicker}
                          disabled={isSelecting}
                          className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/30 transition-colors disabled:opacity-40"
                        >
                          <ImagePlus className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload area */}
                {images.length === 0 && (
                  <div className="flex flex-col items-center py-12 gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-serif text-xl mb-1">Upload clear photos of your skin</p>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Upload up to 5 clear photos for a better analysis.
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm mt-2">
                        For best results, take your photos first in good lighting, then upload them here.
                      </p>
                    </div>
                    <button
                      onClick={openGalleryPicker}
                      disabled={isSelecting}
                      className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:opacity-80 transition-opacity min-h-[48px] disabled:opacity-40 w-full max-w-xs"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Images
                    </button>
                  </div>
                )}

                {/* Action buttons when images selected */}
                {images.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={startAnalysis}
                      disabled={isSelecting || images.length === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:opacity-80 transition-opacity min-h-[48px] disabled:opacity-40"
                    >
                      <Sparkles className="w-4 h-4" />
                      Analyze {images.length} Photo{images.length > 1 ? "s" : ""}
                    </button>
                    {images.length < MAX_IMAGES && (
                      <button
                        onClick={openGalleryPicker}
                        disabled={isSelecting}
                        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-border text-sm font-medium active:bg-muted transition-colors disabled:opacity-40 min-h-[48px]"
                        aria-label="Add more photos"
                      >
                        <ImagePlus className="w-5 h-5" />
                        <span className="sm:hidden">Add More</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="mt-4 p-4 rounded-xl bg-secondary text-xs text-muted-foreground space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-1">Tips for better results</p>
                    <ul className="space-y-1">
                      <li>- Use natural lighting, avoid flash</li>
                      <li>- Capture close-up and wider views</li>
                      <li>- Show the affected area from different angles</li>
                      <li>- Keep the camera steady and focused</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 mt-3 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>This platform provides educational skin wellness insights and is not medical advice. If symptoms are severe, worsening, painful, infected, spreading, or persistent, consult a dermatologist.</p>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Analyzing photo */}
          {step === "analyzing-photo" && (
            <motion.div key="analyzing-photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card-elevated">
              <div className="flex flex-col items-center py-16 gap-6">
                <div className="flex gap-2">
                  {images.slice(0, 3).map((img, i) => (
                    <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-border">
                      <img src={img.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {images.length > 3 && (
                    <div className="w-20 h-20 rounded-xl border border-border flex items-center justify-center bg-muted">
                      <span className="text-sm font-medium text-muted-foreground">+{images.length - 3}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="font-serif text-xl">Scanning your {images.length > 1 ? `${images.length} photos` : "photo"}…</p>
                  <p className="text-sm text-muted-foreground">Detecting visual features and preparing questions</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Dynamic questions */}
          {step === "questions" && dynamicQuestions.length > 0 && (
            <motion.div key="questions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4, ease: easeSmooth }}>
              <div className="card-elevated">
                {visualFeatures.length > 0 && currentQ === 0 && (
                  <div className="mb-6">
                    <p className="text-xs text-muted-foreground mb-2">Detected features:</p>
                    <div className="flex flex-wrap gap-2">
                      {visualFeatures.map((f) => (
                        <span key={f} className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium capitalize">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs text-muted-foreground">Question {currentTotal + 1} of {totalQuestions}</span>
                  <div className="flex-1 mx-4 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentTotal + 1) / totalQuestions) * 100}%` }}
                      transition={{ duration: 0.4, ease: easeSmooth }}
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={currentQ} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
                    <h2 className="font-serif text-2xl mb-6">{dynamicQuestions[currentQ].question}</h2>
                    <div className="space-y-3">
                      {dynamicQuestions[currentQ].options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleDynamicAnswer(opt)}
                          className="w-full text-left px-5 py-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-sm font-medium flex items-center justify-between group"
                        >
                          {opt}
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Health questions */}
          {step === "health-questions" && (
            <motion.div key="health" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4, ease: easeSmooth }}>
              <div className="card-elevated">
                <p className="text-xs text-primary font-medium mb-4">Root Cause Assessment</p>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs text-muted-foreground">Question {currentTotal + 1} of {totalQuestions}</span>
                  <div className="flex-1 mx-4 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: `${(currentTotal / totalQuestions) * 100}%` }}
                      animate={{ width: `${((currentTotal + 1) / totalQuestions) * 100}%` }}
                      transition={{ duration: 0.4, ease: easeSmooth }}
                    />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={healthQ} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3 }}>
                    <h2 className="font-serif text-2xl mb-6">{healthQuestions[healthQ].question}</h2>
                    <div className="space-y-3">
                      {healthQuestions[healthQ].options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleHealthAnswer(opt)}
                          className="w-full text-left px-5 py-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-sm font-medium flex items-center justify-between group"
                        >
                          {opt}
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Loading */}
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card-elevated">
              <div className="flex flex-col items-center py-20 gap-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <p className="font-serif text-2xl mb-2">Analyzing your skin…</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Reviewing {images.length > 1 ? `all ${images.length} photos` : "your photo"}, identifying patterns, inflammation markers, and potential root causes.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Results — user is redirected to dashboard so this rarely shows */}
          {step === "results" && results && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="card-elevated gradient-sage">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="font-serif text-2xl">Analysis Complete</h2>
                </div>
                <p className="text-sm text-muted-foreground">Your analysis has been saved. Redirecting to your dashboard…</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
};

export default SkinAnalysis;
