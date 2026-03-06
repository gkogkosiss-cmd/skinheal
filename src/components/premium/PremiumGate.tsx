import { Lock, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";

interface PremiumGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export const PremiumGate = ({ children, featureName }: PremiumGateProps) => {
  const { isPremium, isLoading, startCheckout, isCheckingOut } = useSubscription();

  // Developer mode bypass — unlocks all premium sections in dev environment
  const isDevMode = import.meta.env.DEV;

  if (isLoading) return <>{children}</>;
  if (isPremium || isDevMode) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-20 blur-[2px] select-none">
        {children}
      </div>
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="card-elevated text-center max-w-sm mx-4 p-8 pointer-events-auto shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-serif text-xl mb-2">
            {featureName ? `Unlock ${featureName}` : "Premium Feature"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Unlock full personalized skin guidance with Premium.
          </p>
          <Button onClick={startCheckout} disabled={isCheckingOut} className="w-full gap-2 h-12 text-base">
            <Sparkles className="w-5 h-5" />
            {isCheckingOut ? "Loading..." : "Upgrade to Premium — $9.99/mo"}
          </Button>
        </div>
      </div>
    </div>
  );
};
