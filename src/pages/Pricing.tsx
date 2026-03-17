import { useState } from "react";
import { Check, X, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const features = [
  { name: "Skin Photo Analysis", free: true, premium: true },
  { name: "Skin Score Breakdown", free: true, premium: true },
  { name: "Basic Condition Detection", free: true, premium: true },
  { name: "Healing Protocol", free: false, premium: true },
  { name: "7-Day Nutrition Plan", free: false, premium: true },
  { name: "Gut Health Program", free: false, premium: true },
  { name: "Lifestyle Guidance", free: false, premium: true },
  { name: "AI Coach Chat", free: false, premium: true },
  { name: "Progress Tracking", free: false, premium: true },
  { name: "Weekly Photo Comparisons", free: false, premium: true },
  { name: "Daily Healing Checklist", free: false, premium: true },
];

const Pricing = () => {
  const { isPremium, startCheckout, isCheckingOut } = useSubscription();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");

  const handleUpgrade = () => {
    if (!user) { window.location.href = "/auth"; return; }
    startCheckout(billingPeriod);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-2">
        <Link
          to={user ? "/dashboard" : "/"}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Start free with core analysis, or unlock your full personalized healing journey with Premium.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex items-center rounded-full bg-muted p-1 gap-0.5">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                billingPeriod === "monthly"
                  ? "bg-[#528164] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                billingPeriod === "yearly"
                  ? "bg-[#528164] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                billingPeriod === "yearly"
                  ? "bg-white/20 text-white"
                  : "bg-[#528164]/10 text-[#528164]"
              }`}>
                -33%
              </span>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full border-border">
              <CardHeader className="pb-4">
                <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Free</CardDescription>
                <CardTitle className="font-serif text-2xl">$0<span className="text-sm font-normal text-muted-foreground ml-1">/month</span></CardTitle>
                <p className="text-xs text-muted-foreground pt-1">Core skin analysis and scoring</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {features.map((f) => (
                  <div key={f.name} className="flex items-center gap-2.5 text-sm">
                    {f.free ? <Check className="w-4 h-4 text-[#528164] shrink-0" /> : <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                    <span className={f.free ? "text-foreground" : "text-muted-foreground/50"}>{f.name}</span>
                  </div>
                ))}
                <div className="pt-4">
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={user ? "/dashboard" : "/auth"}>{user ? "Go to Dashboard" : "Get Started"}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium Plan */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full border-[#528164]/30 ring-2 ring-[#528164]/10 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-[#528164]" />
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <CardDescription className="text-xs uppercase tracking-wider font-semibold text-[#528164]">Premium</CardDescription>
                  {billingPeriod === "yearly" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#528164]/10 text-[#528164] text-[10px] font-semibold">
                      Save 33%
                    </span>
                  )}
                </div>
                {billingPeriod === "yearly" ? (
                  <>
                    <CardTitle className="font-serif text-2xl">$79.99<span className="text-sm font-normal text-muted-foreground ml-1">/year</span></CardTitle>
                    <p className="text-xs text-[#528164] font-medium pt-1">Just $6.67/month</p>
                  </>
                ) : (
                  <>
                    <CardTitle className="font-serif text-2xl">$9.99<span className="text-sm font-normal text-muted-foreground ml-1">/month</span></CardTitle>
                    <p className="text-xs text-muted-foreground pt-1">Full personalized healing guidance</p>
                  </>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {features.map((f) => (
                  <div key={f.name} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-[#528164] shrink-0" />
                    <span className="text-foreground">{f.name}</span>
                  </div>
                ))}
                <div className="pt-4">
                  {isPremium ? (
                    <Button className="w-full" disabled>Current Plan</Button>
                  ) : (
                    <Button
                      className="w-full gap-2 bg-[#528164] hover:bg-[#528164]/90 text-white"
                      onClick={handleUpgrade}
                      disabled={isCheckingOut}
                    >
                      <Sparkles className="w-4 h-4" />
                      {isCheckingOut ? "Loading..." : "Get Premium"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-8">Cancel anytime. No long-term commitment required.</p>
      </div>
    </div>
  );
};

export default Pricing;