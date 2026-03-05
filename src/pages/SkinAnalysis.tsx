import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Upload, Camera, ChevronRight, AlertCircle, Sparkles } from "lucide-react";

const diagnosticQuestions = [
  { id: "itchy", question: "Is the affected area itchy?" },
  { id: "flaking", question: "Is there flaking or scaling?" },
  { id: "burning", question: "Does it burn or sting?" },
  { id: "oily", question: "Is the area oily or dry?" },
  { id: "duration", question: "How long has it existed?", options: ["Less than 1 week", "1–4 weeks", "1–6 months", "6+ months"] },
  { id: "food", question: "Does it worsen after certain foods?" },
  { id: "stress", question: "Does stress affect it?" },
];

const mockResults = [
  { condition: "Seborrheic Dermatitis", probability: 74, explanation: "Your symptoms — flaking, oiliness, and itchiness — strongly correlate with seborrheic dermatitis, a condition caused by yeast overgrowth (Malassezia) on the skin. The yeast feeds on sebum and triggers an inflammatory immune response, leading to redness and scaling." },
  { condition: "Fungal Acne", probability: 22, explanation: "Small uniform bumps in oily areas can indicate Malassezia folliculitis. This occurs when the same yeast overgrows in hair follicles, causing pustules that look like acne." },
  { condition: "Contact Dermatitis", probability: 4, explanation: "A lower likelihood, but irritation from products could contribute to barrier damage and redness." },
];

const SkinAnalysis = () => {
  const [step, setStep] = useState<"upload" | "questions" | "results">("upload");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);

  const handleUpload = () => {
    setStep("questions");
  };

  const handleAnswer = (answer: string) => {
    const q = diagnosticQuestions[currentQ];
    setAnswers((prev) => ({ ...prev, [q.id]: answer }));
    if (currentQ < diagnosticQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setStep("results");
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm text-primary font-medium mb-1">AI Skin Analysis</p>
        <h1 className="font-serif text-3xl md:text-4xl mb-2">Identify your condition</h1>
        <p className="text-muted-foreground mb-8">Upload a clear photo and answer a few questions for an AI-powered analysis.</p>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                onClick={handleUpload}
                className="card-elevated cursor-pointer hover:border-primary/30 transition-colors group"
              >
                <div className="flex flex-col items-center py-16 gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-lg mb-1">Upload a skin photo</p>
                    <p className="text-sm text-muted-foreground">Clear, well-lit photo of the affected area</p>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Take photo</span>
                    <span>or drag & drop</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 mt-4 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Your photos are analyzed locally and never stored. This is educational guidance, not a medical diagnosis.</p>
              </div>
            </motion.div>
          )}

          {step === "questions" && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="card-elevated">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs text-muted-foreground">Question {currentQ + 1} of {diagnosticQuestions.length}</span>
                  <div className="flex gap-1">
                    {diagnosticQuestions.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i <= currentQ ? "bg-primary" : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <h2 className="font-serif text-2xl mb-6">{diagnosticQuestions[currentQ].question}</h2>

                <div className="space-y-3">
                  {diagnosticQuestions[currentQ].options ? (
                    diagnosticQuestions[currentQ].options!.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(opt)}
                        className="w-full text-left px-5 py-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-sm font-medium flex items-center justify-between group"
                      >
                        {opt}
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    ))
                  ) : (
                    <>
                      <button onClick={() => handleAnswer("Yes")} className="w-full text-left px-5 py-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-sm font-medium">
                        Yes
                      </button>
                      <button onClick={() => handleAnswer("No")} className="w-full text-left px-5 py-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-sm font-medium">
                        No
                      </button>
                      <button onClick={() => handleAnswer("Sometimes")} className="w-full text-left px-5 py-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-sm font-medium">
                        Sometimes
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="card-elevated gradient-sage">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="font-serif text-2xl">Analysis Results</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Based on your photo and responses, here is our AI assessment:</p>

                <div className="space-y-4">
                  {mockResults.map((result, i) => (
                    <motion.div
                      key={result.condition}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="rounded-xl border border-border bg-background p-5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-serif text-lg">{result.condition}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          result.probability > 50
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}>
                          {result.probability}% likelihood
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mb-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.probability}%` }}
                          transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }}
                          className="bg-primary h-2 rounded-full"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{result.explanation}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Root Cause Section */}
              <div className="card-elevated">
                <h3 className="font-serif text-xl mb-4">What's happening in your skin</h3>
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p><strong className="text-foreground">Inflammation:</strong> Your immune system is reacting to yeast overgrowth on the skin surface, causing redness and irritation.</p>
                  <p><strong className="text-foreground">Microbiome imbalance:</strong> Malassezia yeast has disrupted your skin's natural microbial balance, outcompeting beneficial bacteria.</p>
                  <p><strong className="text-foreground">Skin barrier damage:</strong> Chronic inflammation weakens your moisture barrier, leading to transepidermal water loss and sensitivity.</p>
                  <p><strong className="text-foreground">Possible gut connection:</strong> Gut inflammation and dysbiosis can amplify systemic inflammation, worsening skin conditions.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-4 rounded-xl bg-secondary text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                This is educational guidance, not a medical diagnosis. Consult a dermatologist for professional assessment.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
};

export default SkinAnalysis;
