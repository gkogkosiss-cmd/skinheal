import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import skinhealLogo from "@/assets/skinheal_logo.png";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log("[ResetPassword] Auth event:", event);
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check hash for recovery type
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      console.log("[ResetPassword] Updating password...");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      console.log("[ResetPassword] Password updated successfully");
      setSuccess(true);
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      setTimeout(() => navigate("/auth", { replace: true }), 2000);
    } catch (err: any) {
      console.error("[ResetPassword] Error:", err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-start justify-center px-4 sm:px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md pt-20 sm:pt-24 md:pt-32 pb-8"
      >
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <img src={skinhealLogo} alt="SkinHeal" className="w-10 h-10 rounded-xl" />
          <span className="font-serif text-2xl text-foreground">SkinHeal</span>
        </div>

        <div className="card-elevated">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
              <h1 className="font-serif text-2xl mb-2">Password Updated</h1>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-center mb-1">Set new password</h1>
              <p className="text-sm text-muted-foreground text-center mb-8">
                Choose a strong password for your SkinHeal account
              </p>

              {!isRecovery && (
                <p className="text-sm text-muted-foreground text-center mb-6 p-3 bg-muted rounded-xl">
                  If you arrived here from an email link, please wait a moment for the session to load.
                </p>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Update Password
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
