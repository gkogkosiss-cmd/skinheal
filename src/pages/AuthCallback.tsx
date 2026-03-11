import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase as lovableSupabase } from "@/integrations/supabase/client";
import { supabase } from "@/lib/supabase";

const DEFAULT_REDIRECT = "/analysis";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Completing your sign-in...");

  useEffect(() => {
    const completeOAuthSignIn = async () => {
      const requestedRedirect = searchParams.get("redirect");
      const redirectTo =
        requestedRedirect && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
          ? requestedRedirect
          : DEFAULT_REDIRECT;

      const callbackError = searchParams.get("error_description") || searchParams.get("error");
      if (callbackError) {
        console.error("[AuthDebug] oauth_callback_error", { callbackError });
        setStatus("Sign-in failed. Returning to auth...");
        navigate("/auth", { replace: true });
        return;
      }

      const code = searchParams.get("code");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      try {
        if (code) {
          const { error } = await lovableSupabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await lovableSupabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const {
          data: { session: cloudSession },
        } = await lovableSupabase.auth.getSession();

        if (!cloudSession) {
          throw new Error("No OAuth session returned after callback.");
        }

        const { error: mirrorError } = await supabase.auth.setSession({
          access_token: cloudSession.access_token,
          refresh_token: cloudSession.refresh_token,
        });

        if (mirrorError) throw mirrorError;

        navigate(redirectTo, { replace: true });
      } catch (error: any) {
        console.error("[AuthDebug] oauth_callback_exchange_failed", {
          message: error?.message ?? "Unknown error",
        });
        setStatus("Could not complete sign-in. Returning to auth...");
        navigate("/auth", { replace: true });
      }
    };

    completeOAuthSignIn();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{status}</span>
      </div>
    </div>
  );
};

export default AuthCallback;
