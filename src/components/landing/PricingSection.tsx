import { Check, X, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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

const PricingSection = () => {
  const { isPremium, startCheckout, isCheckingOut } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="section-padding">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-serif text-3xl md:text-4xl text-center mb-3">Simple, Transparent Pricing</h2>
        <p className="text-muted-foreground text-center max-w-lg mx-auto mb-12">
          Start free with core analysis, or unlock your full healing journey with Premium.
        </p>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
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
                <p className="text-xs text-muted-foreground pt-1">Core skin analysis and scoring</p>
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
                      {user ? "Go to Dashboard" : "Get Started Free"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
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
                <p className="text-xs text-muted-foreground pt-1">Full personalized healing guidance</p>
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
                          navigate("/auth");
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

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Cancel anytime. No long-term commitment required.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
