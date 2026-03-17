import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { supabase, EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_KEY, invokeEdgeFunction } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionState {
  subscribed: boolean;
  plan: string;
  subscriptionEnd: string | null;
  isLoading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  isPremium: boolean;
  refreshSubscription: () => Promise<void>;
  startCheckout: (plan?: "monthly" | "yearly") => Promise<void>;
  openPricingModal: () => void;
  closePricingModal: () => void;
  pricingModalOpen: boolean;
  isCheckingOut: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscribed: false,
  plan: "free",
  subscriptionEnd: null,
  isLoading: true,
  isPremium: false,
  refreshSubscription: async () => {},
  startCheckout: async () => {},
  openPricingModal: () => {},
  closePricingModal: () => {},
  pricingModalOpen: false,
  isCheckingOut: false,
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    plan: "free",
    subscriptionEnd: null,
    isLoading: true,
  });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const hasShownWelcomeRef = useRef(false);

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setState({ subscribed: false, plan: "free", subscriptionEnd: null, isLoading: false });
      return;
    }

    try {
      console.log("[Subscription] Refreshing subscription for user:", user.id);

      // Use the verify-subscription edge function which reads from the correct database
      let stillValid = false;
      let subscriptionEnd: string | null = null;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const response = await fetch(`${EDGE_FUNCTIONS_URL}/verify-subscription`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
              "apikey": EDGE_FUNCTIONS_KEY,
            },
          });
          const verifyData = await response.json();
          console.log("[Subscription] verify-subscription response:", verifyData);

          if (verifyData.isPremium) {
            stillValid = true;
            subscriptionEnd = verifyData.currentPeriodEnd || null;
          }
        }
      } catch (verifyErr: any) {
        console.error("[Subscription] verify-subscription failed:", verifyErr?.message);
      }

      const newState: SubscriptionState = {
        subscribed: stillValid,
        plan: stillValid ? "premium" : "free",
        subscriptionEnd,
        isLoading: false,
      };

      // Send premium welcome email if user just became premium
      const wasPremium = state.subscribed;
      if (!wasPremium && stillValid) {
        try {
          const { data: profile } = await supabase
            .from("profiles" as any)
            .select("premium_email_sent")
            .eq("user_id", user.id)
            .maybeSingle();
          const alreadySent = (profile as any)?.premium_email_sent === true;
          if (!alreadySent) {
            const email = user.email || "";
            const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0] || "there";
            const { error: emailError } = await invokeEdgeFunction("send-welcome-email", { type: "premium", email, name });
            if (!emailError) {
              await supabase
                .from("profiles" as any)
                .update({ premium_email_sent: true } as any)
                .eq("user_id", user.id);
            }
          }
        } catch (err: any) {
          console.error("[Subscription] premium_email_failed", err?.message);
        }
      }

      setState(newState);
    } catch (err) {
      console.error("[Subscription] Error checking subscription:", err);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // Auto-refresh on focus and every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshSubscription, 30000);
    const handleFocus = () => refreshSubscription();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, refreshSubscription]);

  // Show welcome toast when premium activates after checkout redirect
  useEffect(() => {
    if (state.subscribed && !hasShownWelcomeRef.current) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "success") {
        hasShownWelcomeRef.current = true;
        toast({
          title: "Welcome to Premium! 🎉",
          description: "Your full healing plan is now unlocked.",
        });
      }
    }
  }, [state.subscribed, toast]);

  const startCheckout = useCallback(async (plan: "monthly" | "yearly" = "monthly") => {
    setIsCheckingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated. Please sign in first.");

      const response = await fetch(`${EDGE_FUNCTIONS_URL}/creem-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": EDGE_FUNCTIONS_KEY,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create checkout");
      }
      if (data.url) {
        setPricingModalOpen(false);
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({
        title: "Checkout failed",
        description: err?.message || "Could not start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  }, [toast]);

  const isPremium = state.subscribed;

  return (
    <SubscriptionContext.Provider value={{
      ...state,
      isPremium,
      refreshSubscription,
      startCheckout,
      openPricingModal: () => setPricingModalOpen(true),
      closePricingModal: () => setPricingModalOpen(false),
      pricingModalOpen,
      isCheckingOut,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
