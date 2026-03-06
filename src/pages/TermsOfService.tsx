import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TermsOfService = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const backTo = user ? "/profile" : "/";
  const backLabel = user ? "Back to Profile" : "Back to Home";

  return (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-5 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <button onClick={() => navigate(backTo)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl">Terms of Service</h1>
        </div>

        <p className="text-xs text-muted-foreground mb-8">Last updated: March 6, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-serif text-xl mb-3">1. Service Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SkinHeal provides educational skin wellness insights using artificial intelligence. Our service analyzes skin photos and generates personalized guidance including healing protocols, nutrition recommendations, gut health suggestions, and lifestyle adjustments. All content is designed to educate and inform — it is not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">2. Not Medical Advice</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SkinHeal does not provide medical advice, medical diagnosis, or treatment recommendations. The guidance provided is educational and informational in nature. You should always consult with a qualified dermatologist or healthcare provider for serious skin conditions, symptoms that are severe, spreading, painful, infected, or persistent, or any condition that concerns you.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">3. Professional Consultation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Users must seek professional dermatological care for: symptoms that are severe or worsening rapidly, signs of infection (pus, warmth, spreading redness), conditions involving the eyes, persistent symptoms that do not respond to general care, and any skin changes that cause concern. Never delay seeking professional medical advice because of information provided by this service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">4. Subscription Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Skin Guy AI offers a Free plan and a Premium plan. The Premium plan is billed monthly at $9.99 USD. Your subscription automatically renews each month unless cancelled before the renewal date. You can access basic skin analysis and your Skin Health Score on the Free plan. The Premium plan includes access to personalized healing protocols, nutrition plans, gut health guidance, lifestyle recommendations, AI coaching, and progress tracking insights.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">5. Billing and Payment</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Payment is processed securely through Stripe. By subscribing, you authorize us to charge your payment method on a recurring monthly basis. You will be charged at the beginning of each billing period. All charges are in USD.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">6. Cancellation Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can cancel your Premium subscription at any time through the Manage Subscription option in your Profile. After cancellation, you will retain access to Premium features until the end of your current billing period. No refunds are provided for partial billing periods. After your subscription expires, your account will revert to the Free plan.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">7. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Skin Guy AI is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of our service, including but not limited to decisions made based on AI-generated guidance. Our total liability shall not exceed the amount paid by you in the twelve months preceding any claim. We are not responsible for the accuracy of AI-generated analysis results.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">8. User Responsibilities</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are responsible for maintaining the security of your account credentials. You agree to provide accurate information and to use the service only for personal, non-commercial purposes. You must be at least 13 years old to use this service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">9. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update these Terms of Service from time to time. Continued use of the service after changes are posted constitutes acceptance of the revised terms.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  </div>
  );
};

export default TermsOfService;
