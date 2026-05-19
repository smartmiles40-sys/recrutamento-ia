import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  signOut: async () => {},
});

const clearStaleAuthStorage = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // no-op
  }
};

const fetchUserRole = async (userId: string) => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role ?? null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRole = (userId: string) => {
      // Deferred to next tick — calling supabase.from(...) directly inside
      // onAuthStateChange triggers a deadlock with the auth navigator lock,
      // which leaves `loading` stuck on true and shows an infinite spinner.
      setTimeout(async () => {
        try {
          const fetchedRole = await fetchUserRole(userId);
          if (!cancelled) setRole(fetchedRole);
        } catch {
          if (!cancelled) setRole(null);
        }
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) loadRole(nextSession.user.id);
      else setRole(null);
      setLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data: { session: currentSession } }) => {
        if (cancelled) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) loadRole(currentSession.user.id);
        else setRole(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Auth session error:", err);
        clearStaleAuthStorage();
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
      });

    // Safety net: if anything stalls (network blocked, auth lock contention),
    // unblock the UI after 8s instead of showing the spinner forever.
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    clearStaleAuthStorage();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
