import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScanFace, HeartPulse, Apple, MessageCircle, ArrowRight, Leaf, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const features = [
  {
    icon: ScanFace,
    title: "AI Skin Analysis",
    desc: "Upload a photo and get probability-based condition identification with root cause explanations.",
  },
  {
    icon: HeartPulse,
    title: "Healing Protocols",
    desc: "Complete morning/evening routines, weekly treatments, and personalized timelines.",
  },
  {
    icon: Apple,
    title: "Nutrition & Gut Health",
    desc: "Evidence-based dietary guidance targeting inflammation, microbiome, and skin healing.",
  },
  {
    icon: MessageCircle,
    title: "AI Skin Coach",
    desc: "Ask anything about your skin, diet, or healing journey and get evidence-based answers.",
  },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAnalyze = () => {
    if (user) {
      navigate("/analysis");
    } else {
      navigate("/auth?redirect=/analysis");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-background/70 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-serif text-xl text-foreground">The Skin Guy AI</span>
        </div>
        <Link
          to="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-sm font-medium text-primary tracking-wide uppercase mb-4"
          >
            AI-Powered Skin Wellness
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-4xl md:text-6xl lg:text-7xl text-foreground leading-[1.1] mb-6"
          >
            Understand your skin.
            <br />
            <span className="text-primary">Heal from within.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
          >
            A premium AI platform that identifies your skin condition, explains the root cause, and gives you a complete healing protocol — from skincare to nutrition to gut health.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={handleAnalyze}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-medium text-base hover:opacity-90 transition-all duration-300"
            >
              Analyze My Skin
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-medium text-base hover:bg-muted transition-all duration-300"
            >
              Explore Dashboard
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="section-padding bg-card/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-4">How it works</h2>
          <p className="text-muted-foreground text-center max-w-lg mx-auto mb-14">
            A holistic approach to skin healing — addressing what's happening on the surface and underneath.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="card-elevated-hover flex gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-serif text-xl mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="section-padding">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-4">
            <Shield className="w-3.5 h-3.5" />
            Important Disclaimer
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This platform provides educational skin wellness guidance and is not medical advice. Always consult a dermatologist or healthcare professional for diagnosis and treatment of skin conditions.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border text-center text-xs text-muted-foreground">
        © 2026 The Skin Guy AI. Educational wellness platform.
      </footer>
    </div>
  );
};

export default Index;
