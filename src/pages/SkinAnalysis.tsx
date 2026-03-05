import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Upload, Camera, ChevronRight, AlertCircle, Sparkles, Loader2, ArrowLeft, Sun, Moon, Calendar, Utensils, Ban, Heart, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

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

const healthQuestions = [
  { id: "sugar", question: "Do you frequently consume sugary foods or drinks?", options: ["Yes", "No", "Sometimes"] },
  { id: "digestion", question: "Do you experience digestive issues (bloating, gas, irregular bowels)?", options: ["Yes", "No", "Sometimes"] },
  { id: "stress", question: "How would you rate your daily stress levels?", options: ["Low", "Moderate", "High", "Very High"] },
  { id: "sleep", question: "Do you regularly sleep less than 7 hours per night?", options: ["Yes", "No", "Sometimes"] },
  { id: "water", question: "Do you drink at least 2 liters of water daily?", options: ["Yes", "No", "Sometimes"] },
];

const SkinAnalysis = () => {
  const [step, setStep] = useState<Step>("upload");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [visualFeatures, setVisualFeatures] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [healthQ, setHealthQ] = useState(0);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const processImage = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      setStep("analyzing-photo");

      try {
        const { data, error } = await supabase.functions.invoke("analyze-skin", {
          body: { imageBase64: base64 },
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        setDynamicQuestions(data.dynamicQuestions || []);
        setVisualFeatures(data.visualFeatures || []);
        setStep("questions");
      } catch (err: any) {
        toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
        setStep("upload");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDynamicAnswer = (answer: string) => {
    const q = dynamicQuestions[currentQ];
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
    setAnswers((prev) => ({ ...prev, [q.id]: answer }));
    if (healthQ < healthQuestions.length - 1) {
      setHealthQ(healthQ + 1);
    } else {
      runFullAnalysis();
    }
  };

  const saveAnalysis = async (analysisData: AnalysisResult) => {
    if (!user) return;

    try {
      let imageUrl: string | null = null;

      // Upload photo to storage
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("skin-photos")
          .upload(path, imageFile);
        if (!uploadError) {
          imageUrl = path;
        }
      }

      // Save analysis record
      const { error } = await supabase.from("analyses").insert({
        user_id: user.id,
        image_url: imageUrl,
        visual_features: visualFeatures,
        diagnostic_answers: answers,
        conditions: analysisData.conditions,
        root_causes: analysisData.rootCauses,
        biological_explanation: analysisData.biologicalExplanation,
        healing_protocol: analysisData.healingProtocol,
      } as any);

      if (error) {
        console.error("Failed to save analysis:", error);
      } else {
        // Invalidate queries so other pages refresh
        queryClient.invalidateQueries({ queryKey: ["latest-analysis"] });
        queryClient.invalidateQueries({ queryKey: ["all-analyses"] });
      }
    } catch (err) {
      console.error("Save analysis error:", err);
    }
  };

  const runFullAnalysis = async () => {
    setStep("loading");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-skin", {
        body: { imageBase64, answers },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResults(data);
      setStep("results");

      // Save analysis and await it
      await saveAnalysis(data);
      toast({ title: "Analysis saved", description: "Your results are now available across all sections." });
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
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
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Identify your condition</h1>
        <p className="text-muted-foreground mb-8">Upload a clear photo and answer a few questions for an AI-powered analysis.</p>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

        <AnimatePresence mode="wait">
          {/* STEP 1: Upload */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <div className="card-elevated">
                <div className="flex flex-col items-center py-12 gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-serif text-xl mb-1">Upload a clear photo of your skin</p>
                    <p className="text-sm text-muted-foreground max-w-sm">Take a clear photo of the affected area in natural lighting for the most accurate analysis.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Camera className="w-4 h-4" />
                      Take Photo
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 mt-4 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Your photos are stored securely in your account. This is educational guidance, not a medical diagnosis.</p>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Analyzing photo */}
          {step === "analyzing-photo" && (
            <motion.div key="analyzing-photo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card-elevated">
              <div className="flex flex-col items-center py-16 gap-6">
                {imagePreview && (
                  <div className="w-32 h-32 rounded-2xl overflow-hidden border border-border">
                    <img src={imagePreview} alt="Uploaded skin" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="font-serif text-xl">Scanning your photo…</p>
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
                  <p className="text-sm text-muted-foreground max-w-sm">Identifying patterns, inflammation markers, and potential root causes.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: Results */}
          {step === "results" && results && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Conditions */}
              <div className="card-elevated gradient-sage">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="font-serif text-2xl">Analysis Results</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Based on your photo and responses, here is our AI assessment:</p>
                <div className="space-y-4">
                  {results.conditions.map((c, i) => (
                    <motion.div
                      key={c.condition}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="rounded-xl border border-border bg-background p-5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-serif text-lg">{c.condition}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${c.probability > 50 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                          {c.probability}% likelihood
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${c.probability}%` }}
                          transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }}
                          className="bg-primary h-2 rounded-full"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{c.explanation}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Biological explanation */}
              <div className="card-elevated">
                <h3 className="font-serif text-xl mb-4">What's happening in your skin</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{results.biologicalExplanation}</p>
              </div>

              {/* Root causes */}
              {results.rootCauses && results.rootCauses.length > 0 && (
                <div className="card-elevated">
                  <h3 className="font-serif text-xl mb-4">Root Causes</h3>
                  <div className="space-y-3">
                    {results.rootCauses.map((rc, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className="p-4 rounded-xl bg-accent/50">
                        <p className="font-medium text-sm mb-1">{rc.title}</p>
                        <p className="text-sm text-muted-foreground">{rc.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Healing Protocol */}
              {results.healingProtocol && (
                <>
                  <div className="card-elevated">
                    <div className="flex items-center gap-2 mb-4">
                      <Sun className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-xl">Morning Routine</h3>
                    </div>
                    <div className="space-y-2">
                      {results.healingProtocol.morningRoutine.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">{i + 1}</span>
                          <p className="text-muted-foreground pt-0.5">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card-elevated">
                    <div className="flex items-center gap-2 mb-4">
                      <Moon className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-xl">Evening Routine</h3>
                    </div>
                    <div className="space-y-2">
                      {results.healingProtocol.eveningRoutine.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">{i + 1}</span>
                          <p className="text-muted-foreground pt-0.5">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card-elevated">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-xl">Weekly Treatments</h3>
                    </div>
                    <div className="space-y-2">
                      {results.healingProtocol.weeklyTreatments.map((s, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span> {s}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="card-elevated">
                      <div className="flex items-center gap-2 mb-4">
                        <Utensils className="w-5 h-5 text-primary" />
                        <h3 className="font-serif text-lg">Foods That Help</h3>
                      </div>
                      <div className="space-y-3">
                        {results.healingProtocol.foodsToEat.map((f, i) => (
                          <div key={i}>
                            <p className="text-sm font-medium">{f.food}</p>
                            <p className="text-xs text-muted-foreground">{f.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="card-elevated">
                      <div className="flex items-center gap-2 mb-4">
                        <Ban className="w-5 h-5 text-destructive" />
                        <h3 className="font-serif text-lg">Foods to Avoid</h3>
                      </div>
                      <div className="space-y-3">
                        {results.healingProtocol.foodsToAvoid.map((f, i) => (
                          <div key={i}>
                            <p className="text-sm font-medium">{f.food}</p>
                            <p className="text-xs text-muted-foreground">{f.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card-elevated">
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-xl">Gut Health Support</h3>
                    </div>
                    <div className="space-y-2">
                      {results.healingProtocol.gutHealth.map((s, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span> {s}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="card-elevated">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-primary" />
                      <h3 className="font-serif text-xl">Lifestyle Recommendations</h3>
                    </div>
                    <div className="space-y-2">
                      {results.healingProtocol.lifestyle.map((s, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span> {s}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="card-elevated gradient-warm">
                    <h3 className="font-serif text-xl mb-3">Expected Timeline</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{results.healingProtocol.timeline}</p>
                  </div>
                </>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                This platform provides educational skin wellness insights and is not medical advice. Consult a dermatologist for professional assessment.
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  View Dashboard
                </button>
                <button
                  onClick={() => {
                    setStep("upload");
                    setAnswers({});
                    setCurrentQ(0);
                    setHealthQ(0);
                    setResults(null);
                    setImageBase64(null);
                    setImagePreview(null);
                    setImageFile(null);
                  }}
                  className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Start a new analysis
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
};

export default SkinAnalysis;
