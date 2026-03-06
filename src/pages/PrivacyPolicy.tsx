import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-5 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl">Privacy Policy</h1>
        </div>

        <p className="text-xs text-muted-foreground mb-8">Last updated: March 6, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="font-serif text-xl mb-3">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you create an account, we collect your email address, name (optional), and age range (optional). When you use our skin analysis features, we collect photos you upload and your responses to diagnostic questions. We also store AI Coach chat history to provide continuity in your conversations.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">2. How Photos Are Used</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Photos you upload are used exclusively for skin analysis purposes. They are processed by our AI system to identify potential skin conditions and generate personalized wellness guidance. Photos are stored securely and are only accessible to you. We do not share, sell, or use your photos for any purpose other than providing you with skin analysis results.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">3. Data Storage and Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your data is stored securely using industry-standard encryption and access controls. All data transfers use HTTPS encryption. Photos are stored in secure, private storage buckets accessible only through authenticated requests. Your account data, analysis results, and chat history are protected by row-level security policies ensuring only you can access your own data.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">4. Chat History</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Conversations with the AI Coach are stored to maintain context and continuity across sessions. You can delete your chat history at any time from within the AI Coach interface. Chat history is used solely to improve your experience and is not shared with third parties.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">5. AI-Generated Guidance</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All guidance provided by The Skin Guy AI is generated using artificial intelligence and is intended for educational and informational purposes only. It does not constitute medical advice, diagnosis, or treatment. The AI system provides wellness insights based on visual analysis and general dermatological knowledge.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">6. Account Deletion</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can request account deletion at any time through the Profile page. When you delete your account, all associated data is permanently removed, including your profile information, skin analyses, progress photos, AI Coach chat history, and daily task history. This action cannot be undone.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">7. Third-Party Services</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use Stripe for payment processing. When you subscribe to Premium, Stripe collects and processes your payment information. We do not store your credit card details. Please refer to Stripe's privacy policy for details on how they handle your payment data.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl mb-3">8. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or your data, you can reach us through the feedback form in the Profile section of the app.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  </div>
);

export default PrivacyPolicy;
