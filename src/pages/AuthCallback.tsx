import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const DEFAULT_REDIRECT = "/analysis";

const getSafeRedirect = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : DEFAULT_REDIRECT;

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Completing your sign-in...");

  useEffect(() => {
    let isActive = true;

    const completeOAuthSignIn = async () => {
      const redirectTo = getSafeRedirect(searchParams.get("redirect"));
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
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        setStatus("Finalizing sign-in...");

        const waitForSession = async (maxAttempts = 20, delayMs = 250) => {
          for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const {
              data: { session },
              error,
            } = await supabase.auth.getSession();

            if (error) throw error;
            if (session?.user) return session;

            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          return null;
        };

        const session = await waitForSession();
        if (!session?.user) throw new Error("No OAuth session returned after callback.");

        const { data: existingProfile, error: profileFetchError } = await supabase
          .from("profiles" as any)
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profileFetchError) throw profileFetchError;

        if (!existingProfile) {
          const displayName =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split("@")[0] ||
            null;

          const provider = typeof session.user.app_metadata?.provider === "string"
            ? session.user.app_metadata.provider
            : "google";

          const { error: insertError } = await supabase
            .from("profiles" as any)
            .insert({
              user_id: session.user.id,
              name: displayName,
              email: session.user.email ?? null,
              provider,
            } as any);

          if (insertError) throw insertError;
        }

        if (!isActive) return;
        setStatus("Sign-in successful. Redirecting...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (!isActive) return;
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

    return () => {
      isActive = false;
    };
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
