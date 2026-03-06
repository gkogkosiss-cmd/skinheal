import { Sparkles } from "lucide-react";

interface PremiumBadgeProps {
  label?: string;
}

export const PremiumBadge = ({ label = "Premium" }: PremiumBadgeProps) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide">
    <Sparkles className="w-3 h-3" />
    {label}
  </span>
);

export const PremiumUpgradeHint = () => (
  <div className="card-elevated gradient-sage text-center py-8">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
      <Sparkles className="w-6 h-6 text-primary" />
    </div>
    <h3 className="font-serif text-lg mb-1">Advanced Guidance</h3>
    <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
      Unlock detailed meal plans, gut health programs, weekly tracking, and advanced AI coaching.
    </p>
    <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
      Coming Soon
    </button>
  </div>
);
