import { Lock, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";

interface PremiumGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export const PremiumGate = ({ children, featureName }: PremiumGateProps) => {
  const { isPremium, isLoading, openPricingModal } = useSubscription();

  const isDevMode = import.meta.env.DEV;

  if (isLoading) return <>{children}</>;
  if (isPremium || isDevMode) return <>{children}</>;

  return (
    <div className="relative min-h-[60vh]">
      <div className="pointer-events-none opacity-20 blur-[2px] select-none overflow-hidden" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 z-30 flex items-center justify-center px-3 sm:px-4">
        <div className="card-elevated text-center max-w-sm w-full p-5 sm:p-8 shadow-2xl">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#528164]/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-[#528164]" />
          </div>
          <h3 className="font-serif text-lg sm:text-xl mb-2">
            {featureName ? `Unlock ${featureName}` : "Premium Feature"}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-6">
            Unlock full personalized skin guidance with Premium.
          </p>
          <Button
            onClick={openPricingModal}
            className="w-full gap-2 h-11 sm:h-12 text-xs sm:text-sm active:opacity-80 bg-[#528164] hover:bg-[#528164]/90 text-white"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">Upgrade to Premium</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
