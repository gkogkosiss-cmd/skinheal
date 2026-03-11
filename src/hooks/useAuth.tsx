import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, invokeEdgeFunction } from "@/lib/supabase";

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
          console.log("[AuthDebug] SIGNED_IN, checking welcome email flag", { userId, email });
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
            // Send email — pass user info directly so edge function doesn't need DB access
            const { data, error } = await invokeEdgeFunction("send-welcome-email", { type: "welcome", email, name });
            console.log("[AuthDebug] welcome_email_result", { data, error: error?.message ?? null });
            if (!error) {
              // Mark as sent on custom project DB
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

    return () => subscription.unsubscribe();
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
