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

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
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
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Start free with core analysis, or unlock your full personalized healing journey with Premium.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full border-border">
              <CardHeader className="pb-4">
                <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Free
                </CardDescription>
                <CardTitle className="font-serif text-2xl">
                  $0
                  <span className="text-sm font-normal text-muted-foreground ml-1">/month</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground pt-1">
                  Core skin analysis and scoring
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {features.map((f) => (
                  <div key={f.name} className="flex items-center gap-2.5 text-sm">
                    {f.free ? (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={f.free ? "text-foreground" : "text-muted-foreground/50"}>
                      {f.name}
                    </span>
                  </div>
                ))}
                <div className="pt-4">
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={user ? "/dashboard" : "/auth"}>
                      {user ? "Go to Dashboard" : "Get Started"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-primary/30 ring-2 ring-primary/10 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <CardDescription className="text-xs uppercase tracking-wider font-semibold text-primary">
                    Premium
                  </CardDescription>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    <Sparkles className="w-3 h-3" />
                    Recommended
                  </span>
                </div>
                <CardTitle className="font-serif text-2xl">
                  $9.99
                  <span className="text-sm font-normal text-muted-foreground ml-1">/month</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground pt-1">
                  Full personalized healing guidance
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {features.map((f) => (
                  <div key={f.name} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-foreground">{f.name}</span>
                  </div>
                ))}
                <div className="pt-4">
                  {isPremium ? (
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      onClick={() => {
                        if (!user) {
                          window.location.href = "/auth";
                          return;
                        }
                        startCheckout();
                      }}
                      disabled={isCheckingOut}
                    >
                      <Sparkles className="w-4 h-4" />
                      {isCheckingOut ? "Loading..." : "Upgrade to Premium"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-muted-foreground mt-8">
          Cancel anytime. No long-term commitment required.
        </p>
      </div>
    </div>
  );
};

export default Pricing;
