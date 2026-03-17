import { PricingModal } from "./PricingModal";
import { useSubscription } from "@/hooks/useSubscription";

export const PricingModalWrapper = () => {
  const { pricingModalOpen, closePricingModal, startCheckout, isCheckingOut } = useSubscription();

  return (
    <PricingModal
      open={pricingModalOpen}
      onClose={closePricingModal}
      onSelectPlan={(plan) => startCheckout(plan)}
      isLoading={isCheckingOut}
    />
  );
};
