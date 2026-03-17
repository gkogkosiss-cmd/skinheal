import { useState } from "react";
import { X, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (plan: "monthly" | "yearly") => void;
  isLoading: boolean;
}

export const PricingModal = ({ open, onClose, onSelectPlan, isLoading }: PricingModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#528164]/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-[#528164]" />
              </div>
              <h2 className="font-serif text-xl text-foreground">Upgrade to Premium</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Unlock your full personalized healing journey
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Yearly Plan */}
              <button
                onClick={() => setSelectedPlan("yearly")}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                  selectedPlan === "yearly"
                    ? "border-[#528164] bg-[#528164]/5"
                    : "border-border hover:border-[#528164]/30"
                }`}
              >
                <div className="absolute top-0 right-0">
                  <span className="inline-block bg-[#528164] text-white text-[10px] font-bold px-2.5 py-1 rounded-bl-lg">
                    BEST VALUE
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">Yearly</p>
                    <p className="text-2xl font-serif text-foreground mt-0.5">
                      $79.99
                      <span className="text-sm font-normal text-muted-foreground">/year</span>
                    </p>
                    <p className="text-xs text-[#528164] font-medium mt-1">
                      Just $6.67/month · Save 33%
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === "yearly" ? "border-[#528164] bg-[#528164]" : "border-muted-foreground/30"
                  }`}>
                    {selectedPlan === "yearly" && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </button>

              {/* Monthly Plan */}
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedPlan === "monthly"
                    ? "border-[#528164] bg-[#528164]/5"
                    : "border-border hover:border-[#528164]/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">Monthly</p>
                    <p className="text-2xl font-serif text-foreground mt-0.5">
                      $9.99
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === "monthly" ? "border-[#528164] bg-[#528164]" : "border-muted-foreground/30"
                  }`}>
                    {selectedPlan === "monthly" && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </button>
            </div>

            <Button
              onClick={() => onSelectPlan(selectedPlan)}
              disabled={isLoading}
              className="w-full h-12 gap-2 bg-[#528164] hover:bg-[#528164]/90 text-white"
            >
              <Sparkles className="w-4 h-4" />
              {isLoading ? "Loading..." : "Get Premium"}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground mt-4">
              Cancel anytime. No long-term commitment required.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
