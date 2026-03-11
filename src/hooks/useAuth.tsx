import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, invokeEdgeFunction } from "@/lib/supabase";
import { supabase as lovableSupabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthDebug] runtime_config", {
      origin: window.location.origin,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
      hasAnonKey: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthDebug] auth_callback", {
        event,
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        provider: session?.user?.app_metadata?.provider ?? null,
      });

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Send welcome email on first sign-in (DB flag prevents duplicates)
      // Deferred to avoid deadlock with onAuthStateChange
      if (event === "SIGNED_IN" && session?.user) {
        const userId = session.user.id;
        const email = session.user.email;
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email?.split("@")[0] || "there";
        setTimeout(async () => {
          // Re-read session to get the most up-to-date user info (avoids stale closure)
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          const freshEmail = freshSession?.user?.email || email;
          const freshName = freshSession?.user?.user_metadata?.full_name || freshSession?.user?.user_metadata?.name || name;

          if (!freshEmail) {
            console.warn("[AuthDebug] welcome_email skipped — email is still undefined after session refresh");
            return;
          }

          console.log("[AuthDebug] SIGNED_IN, checking welcome email flag", { userId, email: freshEmail });
          try {
            // Check flag on custom project DB (client-side dedup)
            const { data: profile } = await supabase
              .from("profiles" as any)
              .select("welcome_email_sent")
              .eq("user_id", userId)
              .maybeSingle();
            const alreadySent = (profile as any)?.welcome_email_sent === true;
            if (alreadySent) {
              console.log("[AuthDebug] welcome_email already sent, skipping");
              return;
            }

            // Send email with retry
            let result = await invokeEdgeFunction("send-welcome-email", { type: "welcome", email: freshEmail, name: freshName });
            if (result.error) {
              console.warn("[AuthDebug] welcome_email first attempt failed, retrying in 3s", { error: result.error?.message });
              await new Promise(r => setTimeout(r, 3000));
              result = await invokeEdgeFunction("send-welcome-email", { type: "welcome", email: freshEmail, name: freshName });
            }

            console.log("[AuthDebug] welcome_email_result", { data: result.data, error: result.error?.message ?? null });
            if (!result.error) {
              await supabase
                .from("profiles" as any)
                .update({ welcome_email_sent: true } as any)
                .eq("user_id", userId);
            }
          } catch (err: any) {
            console.error("[AuthDebug] welcome_email_failed", { error: err?.message });
          }
        }, 2000);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[AuthDebug] getSession_result", {
        userId: session?.user?.id ?? null,
        hasSession: Boolean(session),
      });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Bridge: Mirror Lovable Cloud OAuth sessions to the custom supabase client.
    // lovable.auth.signInWithOAuth sets the session on the Lovable Cloud client,
    // but the app uses a separate custom client. This listener syncs them.
    const { data: { subscription: lovableSub } } = lovableSupabase.auth.onAuthStateChange(async (event, cloudSession) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && cloudSession) {
        console.log("[AuthDebug] lovable_cloud_auth_event", { event, email: cloudSession.user?.email });
        // Check if our custom client already has a session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!existingSession || existingSession.user?.id !== cloudSession.user?.id) {
          console.log("[AuthDebug] mirroring_cloud_session_to_custom_client");
          await supabase.auth.setSession({
            access_token: cloudSession.access_token,
            refresh_token: cloudSession.refresh_token,
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      lovableSub.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
