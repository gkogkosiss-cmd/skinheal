import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ScanFace, HeartPulse, Apple, MessageCircle, ArrowRight, Shield,
  Upload, Sparkles, ClipboardCheck, TrendingUp, Lock, Brain, Eye,
  ChevronRight, CheckCircle2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SkinScoreDemo from "@/components/landing/SkinScoreDemo";
import skinhealLogo from "@/assets/skinheal_logo.png";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

const steps = [
  { icon: Upload, title: "Upload Your Photo", desc: "Take a clear photo of your skin concern — face, back, arms, or any area." },
  { icon: Sparkles, title: "AI Analyzes Your Skin", desc: "Our AI identifies conditions, root causes, and visual patterns in seconds." },
  { icon: ClipboardCheck, title: "Get Your Healing Plan", desc: "Receive a personalized protocol covering skincare, nutrition, and lifestyle." },
];

const features = [
  { icon: ScanFace, title: "AI Skin Analysis", desc: "Probability-based condition identification with root cause explanations for any body area." },
  { icon: HeartPulse, title: "Healing Protocols", desc: "Complete morning & evening routines, weekly treatments, and personalized timelines." },
  { icon: Apple, title: "Nutrition & Gut Health", desc: "Evidence-based dietary guidance targeting inflammation, microbiome, and skin healing." },
  { icon: MessageCircle, title: "AI Skin Coach", desc: "Ask anything about your skin, diet, or healing journey and get evidence-based answers." },
  { icon: TrendingUp, title: "Progress Tracking", desc: "Weekly photo comparisons with stable scoring that reflects real improvement over time." },
  { icon: Brain, title: "Root Cause Insights", desc: "Understand what's happening beneath the surface — hormones, gut, stress, and more." },
];

const benefits = [
  "Understand what's really happening in your skin",
  "Discover possible root causes — not just surface symptoms",
  "Get a complete skincare + nutrition + lifestyle plan",
  "Track weekly progress with stable, trustworthy scoring",
  "Works for face, back, arms, scalp, and more",
];

const trustPoints = [
  { icon: Shield, title: "Private & Secure", desc: "Your photos are analyzed securely and never shared with third parties." },
  { icon: Brain, title: "Science-Based", desc: "AI trained on dermatology knowledge with evidence-based recommendations." },
  { icon: Eye, title: "Transparent Results", desc: "Probability scores and cautious language — no false promises or exaggerated claims." },
];

const faqs = [
  { q: "Is this a medical diagnosis?", a: "No. SkinHeal provides educational skin wellness insights, not medical diagnoses. Always consult a dermatologist for medical concerns." },
  { q: "Is my photo secure?", a: "Yes. Your photos are encrypted, analyzed privately, and never shared. We take your privacy seriously." },
  { q: "How accurate is the analysis?", a: "Our AI identifies common skin conditions with probability scores. It's designed to be helpful and transparent, not to replace professional advice." },
  { q: "What body areas can I analyze?", a: "You can upload photos of your face, back, chest, arms, legs, scalp, hands, and more. The AI adapts its analysis to each body area." },
  { q: "What do I get with Premium?", a: "Premium unlocks full healing protocols, personalized nutrition plans, gut health guidance, AI coaching, and weekly progress tracking." },
  { q: "How does progress tracking work?", a: "Upload weekly photos and the AI compares them against your baseline, tracking changes in redness, texture, and overall skin health with a stable scoring system." },
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
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 sm:py-4 bg-background/70 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2.5">
          <img src={skinhealLogo} alt="SkinHeal" className="w-9 h-9 rounded-xl" />
          <span className="font-serif text-xl text-foreground">SkinHeal</span>
        </div>
        <button
          onClick={handleAnalyze}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Get Started
        </button>
      </nav>

      {/* HERO */}
      <section className="relative pt-28 pb-12 sm:pt-32 sm:pb-16 md:pt-44 md:pb-28 overflow-hidden">
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-sm font-medium text-primary tracking-wide uppercase mb-4"
          >
            AI-Powered Skin Wellness
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            className="font-serif text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-foreground leading-[1.1] mb-5 sm:mb-6"
          >
            Understand your skin.
            <br />
            <span className="text-primary">Heal from within.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease }}
            className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2"
          >
            Upload a photo and receive personalized skin insights, healing guidance, and nutrition recommendations — powered by AI.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={handleAnalyze}
              className="flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-primary text-primary-foreground font-medium text-sm sm:text-base active:opacity-80 transition-all duration-300 shadow-lg min-h-[48px]"
            >
              Analyze My Skin
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-secondary text-secondary-foreground font-medium text-base hover:bg-muted transition-all duration-300"
            >
              See How It Works
            </a>
          </motion.div>
        </div>

        {/* Visual flow indicator */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease }}
          className="max-w-2xl mx-auto mt-16 px-6"
        >
          <div className="flex items-center justify-center gap-3 md:gap-6">
            {[
              { icon: Upload, label: "Upload" },
              { icon: Sparkles, label: "Analyze" },
              { icon: ClipboardCheck, label: "Heal" },
            ].map((item, i) => (
              <div key={item.label} className="flex items-center gap-3 md:gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-accent flex items-center justify-center">
                    <item.icon className="w-6 h-6 md:w-7 md:h-7 text-accent-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </div>
                {i < 2 && <ChevronRight className="w-5 h-5 text-muted-foreground/50 mt-[-1rem]" />}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="section-padding bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-3">How It Works</h2>
          <p className="text-muted-foreground text-center max-w-lg mx-auto mb-14">
            Three simple steps to understand and improve your skin health.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5">
                  <s.icon className="w-7 h-7 text-accent-foreground" />
                </div>
                <div className="text-sm font-medium text-primary mb-2">Step {i + 1}</div>
                <h3 className="font-serif text-xl mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES / VALUE PROP */}
      <section className="section-padding">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-3">Everything You Need for Healthier Skin</h2>
          <p className="text-muted-foreground text-center max-w-lg mx-auto mb-14">
            A holistic approach — addressing what's happening on the surface and underneath.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="card-elevated-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="font-serif text-lg mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST & CREDIBILITY */}
      <section className="section-padding bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-3">Built on Trust</h2>
          <p className="text-muted-foreground text-center max-w-lg mx-auto mb-14">
            Your privacy and safety come first — always.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {trustPoints.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="card-elevated text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
                  <t.icon className="w-7 h-7 text-accent-foreground" />
                </div>
                <h3 className="font-serif text-lg mb-1.5">{t.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="section-padding">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-3">Real Results, Real Value</h2>
          <p className="text-muted-foreground text-center max-w-lg mx-auto mb-12">
            See what changes when you understand your skin from the inside out.
          </p>
          <div className="space-y-4 max-w-xl mx-auto">
            {benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-start gap-3.5"
              >
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-foreground">{b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRESS TRACKING — Interactive Demo */}
      <section className="section-padding bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-3">Track Your Progress</h2>
          <p className="text-muted-foreground text-center max-w-lg mx-auto mb-14">
            Watch your skin health improve week by week with stable, trustworthy scoring.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <SkinScoreDemo />
          </motion.div>
        </div>
      </section>

      {/* MID-PAGE CTA */}
      <section className="section-padding">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl mb-4">Start Understanding Your Skin Today</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Upload your photo and get personalized skin insights in minutes. No commitment required.
          </p>
          <button
            onClick={handleAnalyze}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-medium text-base hover:opacity-90 transition-all duration-300 shadow-lg"
          >
            Analyze My Skin
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-card/50">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center mb-3">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-center mb-10">Everything you need to know before getting started.</p>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="card-elevated border-none">
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4 px-2">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground px-2 pb-2">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* DISCLAIMER */}
      <section className="px-6 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-3">
            <Shield className="w-3.5 h-3.5" />
            Important Disclaimer
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This platform provides educational skin wellness guidance and is not medical advice. Always consult a dermatologist or healthcare professional for diagnosis and treatment of skin conditions.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section-padding gradient-sage">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl mb-4 text-accent-foreground">
            Take the First Step Toward Healthier Skin
          </h2>
          <p className="text-accent-foreground/70 mb-8 max-w-md mx-auto">
            Join thousands of people using AI to understand and improve their skin health.
          </p>
          <button
            onClick={handleAnalyze}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-medium text-base hover:opacity-90 transition-all duration-300 shadow-lg"
          >
            Analyze My Skin
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={skinhealLogo} alt="SkinHeal" className="w-7 h-7 rounded-lg" />
            <span className="font-serif text-foreground">SkinHeal</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 SkinHeal</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
