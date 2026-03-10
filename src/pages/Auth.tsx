import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2, KeyRound } from "lucide-react";
import skinhealLogo from "@/assets/skinheal_logo.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "signup" | "signin" | "forgot";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("signup");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const redirectTo = searchParams.get("redirect") || "/analysis";

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  // Smooth scroll focused input into view when keyboard opens
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    };
    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const callbackError =
      search.get("error_description") ||
      search.get("error") ||
      hash.get("error_description") ||
      hash.get("error");

    if (callbackError) {
      console.error("[AuthDebug] oauth_callback_failed", { callbackError });
    }

    const hasAccessToken = hash.has("access_token");
    if (hasAccessToken) {
      console.log("[AuthDebug] oauth_callback_received_tokens", {
        hasAccessToken,
        hasRefreshToken: hash.has("refresh_token"),
      });
    }
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const action = mode === "signup" ? "signup" : mode === "signin" ? "login" : "password_reset";
    console.log(`[AuthDebug] ${action}_clicked`, { email });

    try {
      if (mode === "forgot") {
        console.log("[AuthDebug] resetPasswordForEmail_called", {
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          console.error("[AuthDebug] resetPasswordForEmail_failed", { email, error: error.message });
          throw error;
        }

        console.log("[AuthDebug] resetPasswordForEmail_success", { email });
        toast({
          title: "Check your email",
          description: "A password reset link has been sent to your email.",
        });
        return;
      }

      if (mode === "signup") {
        console.log("[AuthDebug] signUp_called", {
          email,
          emailRedirectTo: window.location.origin + redirectTo,
        });

        console.log("[AuthDebug] signUp_calling", { email, redirectTo: window.location.origin + redirectTo });
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + redirectTo,
          },
        });

        console.log("[AuthDebug] signUp_raw_response", {
          data: JSON.stringify(data),
          error: error ? { message: error.message, status: error.status, name: error.name } : null,
        });

        if (error) {
          console.error("[AuthDebug] signUp_failed", { email, error: error.message, status: error.status });
          throw error;
        }

        console.log("[AuthDebug] signUp_success", {
          userId: data?.user?.id ?? null,
          userEmail: data?.user?.email ?? null,
          hasSession: Boolean(data?.session),
          identities: data?.user?.identities?.length ?? 0,
          provider: data?.user?.app_metadata?.provider ?? null,
          confirmedAt: data?.user?.confirmed_at ?? null,
          createdAt: data?.user?.created_at ?? null,
        });

        // Check if the user already exists (identities will be empty)
        if (data?.user?.identities?.length === 0) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please sign in.",
            variant: "destructive",
          });
          setMode("signin");
          return;
        }

        if (data?.user && !data?.session) {
          toast({
            title: "Check your email",
            description: "A confirmation link has been sent to verify your email address.",
          });
        }
      } else {
        console.log("[AuthDebug] signInWithPassword_called", { email });

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("[AuthDebug] signInWithPassword_failed", { email, error: error.message });
          throw error;
        }

        console.log("[AuthDebug] signInWithPassword_success", {
          userId: data?.user?.id ?? null,
          userEmail: data?.user?.email ?? null,
          hasSession: Boolean(data?.session),
          provider: data?.user?.app_metadata?.provider ?? null,
        });
      }
    } catch (err: any) {
      console.error("[AuthDebug] auth_action_failed", {
        action,
        email,
        message: err?.message ?? "Unknown error",
      });
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);

    const oauthRedirectUri = window.location.origin + redirectTo;
    console.log("[AuthDebug] oauth_clicked", { provider, oauthRedirectUri });

    try {
      console.log("[AuthDebug] signInWithOAuth_called", { provider, oauthRedirectUri });
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: oauthRedirectUri,
      });

      console.log("[AuthDebug] signInWithOAuth_result", {
        provider,
        redirected: Boolean(result?.redirected),
        hasError: Boolean(result?.error),
        error: result?.error?.message ?? null,
      });

      if (result.error) throw result.error;
    } catch (err: any) {
      console.error("[AuthDebug] signInWithOAuth_failed", {
        provider,
        message: err?.message ?? "Unknown error",
      });
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const headingText = {
    signup: "Create your SkinHeal account",
    signin: "Welcome back to SkinHeal",
    forgot: "Reset your password",
  };

  const subtitleText = {
    signup: "Start your personalized skin healing journey",
    signin: "Sign in to continue your healing journey",
    forgot: "Enter your email and we'll send a reset link",
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-start justify-center px-4 sm:px-5 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md pt-20 sm:pt-24 md:pt-32 pb-8"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <img src={skinhealLogo} alt="SkinHeal" className="w-10 h-10 rounded-xl" />
          <span className="font-serif text-2xl text-foreground">SkinHeal</span>
        </div>

        <div className="card-elevated">
          <h1 className="font-serif text-2xl text-center mb-1">
            {headingText[mode]}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {subtitleText[mode]}
          </p>

          {/* OAuth Buttons (only show for signup/signin) */}
          {mode !== "forgot" && (
            <>
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleOAuth("google")}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-sm font-medium min-h-[48px]"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
                <button
                  onClick={() => handleOAuth("apple")}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-sm font-medium min-h-[48px]"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          {/* Email Form */}
          <form ref={formRef} onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px]"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px]"
                  />
                </div>
              </div>
            )}

            {mode === "signin" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "signup" && "Create Account"}
                  {mode === "signin" && "Sign In"}
                  {mode === "forgot" && "Send Reset Link"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground mt-6 space-y-1">
            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </p>
            )}
            {mode === "signin" && (
              <p>
                Don't have an account?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                  Sign up
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <p>
                Remember your password?{" "}
                <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed px-2">
          This platform provides educational skin wellness guidance and is not medical advice.
        </p>
        <div className="flex justify-center gap-4 mt-3">
          <a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
