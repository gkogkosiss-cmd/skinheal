import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase, EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_KEY, invokeEdgeFunction } from "@/lib/supabase";
import { useAuth } from "./useAuth";

const PREMIUM_PRODUCT_ID = "prod_U69eH6djMBf4gA";

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  isLoading: boolean;
}

interface SubscriptionContextType extends SubscriptionState {
  isPremium: boolean;
  refreshSubscription: () => Promise<void>;
  startCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  isCheckingOut: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscribed: false,
  productId: null,
  subscriptionEnd: null,
  isLoading: true,
  isPremium: false,
  refreshSubscription: async () => {},
  startCheckout: async () => {},
  openCustomerPortal: async () => {},
  isCheckingOut: false,
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    isLoading: true,
  });
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setState({ subscribed: false, productId: null, subscriptionEnd: null, isLoading: false });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(s => ({ ...s, isLoading: false }));
        return;
      }

      const response = await fetch(`${EDGE_FUNCTIONS_URL}/check-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": EDGE_FUNCTIONS_KEY,
        },
      });

      if (!response.ok) throw new Error("Failed to check subscription");
      const data = await response.json();

      const newState = {
        subscribed: data.subscribed || false,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        isLoading: false,
      };

      // Persist subscription status to the subscriptions table
      try {
        const upsertPayload: Record<string, unknown> = {
          user_id: user.id,
          status: newState.subscribed ? "active" : "inactive",
          plan: newState.subscribed ? "premium" : "free",
          updated_at: new Date().toISOString(),
        };
        if (newState.subscriptionEnd) {
          upsertPayload.current_period_end = newState.subscriptionEnd;
        }
        await supabase
          .from("subscriptions" as any)
          .upsert(upsertPayload as any, { onConflict: "user_id" });
      } catch (persistErr: any) {
        console.warn("[Subscription] failed to persist to subscriptions table", persistErr?.message);
      }

      // Send premium welcome email if user just became premium
      const wasPremium = state.subscribed && state.productId === PREMIUM_PRODUCT_ID;
      const isNowPremium = newState.subscribed && newState.productId === PREMIUM_PRODUCT_ID;
      if (!wasPremium && isNowPremium) {
        console.log("[Subscription] User became premium, checking premium email flag");
        try {
          // Client-side dedup: check flag on custom project DB
          const { data: profile } = await supabase
            .from("profiles" as any)
            .select("premium_email_sent")
            .eq("user_id", user.id)
            .maybeSingle();
          const alreadySent = (profile as any)?.premium_email_sent === true;
          if (!alreadySent) {
            const email = user.email || "";
            const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0] || "there";
            const { data: emailData, error: emailError } = await invokeEdgeFunction("send-welcome-email", { type: "premium", email, name });
            console.log("[Subscription] premium_email_result", { data: emailData, error: emailError?.message ?? null });
            if (!emailError) {
              await supabase
                .from("profiles" as any)
                .update({ premium_email_sent: true } as any)
                .eq("user_id", user.id);
            }
          } else {
            console.log("[Subscription] premium_email already sent, skipping");
          }
        } catch (err: any) {
          console.error("[Subscription] premium_email_failed", { error: err?.message });
        }
      }

      setState(newState);
    } catch (err) {
      console.error("Error checking subscription:", err);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // Auto-refresh every 60 seconds and on window focus (e.g. returning from checkout tab)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshSubscription, 60000);
    const handleFocus = () => refreshSubscription();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, refreshSubscription]);

  const startCheckout = useCallback(async () => {
    setIsCheckingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${EDGE_FUNCTIONS_URL}/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": EDGE_FUNCTIONS_KEY,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || "Failed to create checkout");
      }
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsCheckingOut(false);
    }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${EDGE_FUNCTIONS_URL}/customer-portal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": EDGE_FUNCTIONS_KEY,
        },
      });

      if (!response.ok) throw new Error("Failed to open portal");
      const data = await response.json();
      if (data.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Portal error:", err);
    }
  }, []);

  const isPremium = state.subscribed && state.productId === PREMIUM_PRODUCT_ID;

  return (
    <SubscriptionContext.Provider value={{
      ...state,
      isPremium,
      refreshSubscription,
      startCheckout,
      openCustomerPortal,
      isCheckingOut,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
