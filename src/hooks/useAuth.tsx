import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
      anonKeyPrefix: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.slice(0, 16),
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthDebug] auth_callback", {
        event,
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
        hasSession: Boolean(session),
        provider: session?.user?.app_metadata?.provider ?? null,
      });

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Send welcome email for new users (Google OAuth signs in immediately)
      if (event === "SIGNED_IN" && session?.user) {
        const createdAt = new Date(session.user.created_at).getTime();
        const isNewUser = Date.now() - createdAt < 60_000; // created within last 60s
        if (isNewUser) {
          console.log("[AuthDebug] new_user_detected, sending welcome email", {
            userId: session.user.id,
            email: session.user.email,
            provider: session.user.app_metadata?.provider,
          });
          try {
            const { data, error } = await supabase.functions.invoke("send-welcome-email");
            console.log("[AuthDebug] welcome_email_result", { data, error: error?.message ?? null });
          } catch (err: any) {
            console.error("[AuthDebug] welcome_email_failed", { error: err?.message });
          }
        }
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
