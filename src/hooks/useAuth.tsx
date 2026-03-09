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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] onAuthStateChange:", event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Send welcome email on first sign-in (covers both email confirm + OAuth)
      if (event === "SIGNED_IN" && session?.user) {
        const createdAt = new Date(session.user.created_at).getTime();
        const now = Date.now();
        // Only trigger for accounts created in the last 60 seconds
        if (now - createdAt < 60_000) {
          console.log("[Auth] New user detected, sending welcome email");
          supabase.functions.invoke("send-welcome-email").then(({ error }) => {
            if (error) console.error("[Auth] Welcome email error:", error);
            else console.log("[Auth] Welcome email sent");
          });
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
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
