
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type UserRole = "admin" | "analyst" | "viewer";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const validRoles: UserRole[] = ["admin", "analyst", "viewer"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let authVersion = 0;
    let pendingTimer: ReturnType<typeof setTimeout> | undefined;

    const loadRole = async (
      currentSession: Session,
      version: number,
    ) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (error) throw error;

        if (!active || version !== authVersion) return;

        const fetchedRole = data?.role;

        setRole(
          validRoles.includes(fetchedRole as UserRole)
            ? (fetchedRole as UserRole)
            : "viewer",
        );
      } catch (error) {
        console.error("User role fetch error:", error);

        if (active && version === authVersion) {
          setRole("viewer");
        }
      } finally {
        if (active && version === authVersion) {
          setLoading(false);
        }
      }
    };

    const applySession = (currentSession: Session | null) => {
      const version = ++authVersion;

      if (pendingTimer) {
        clearTimeout(pendingTimer);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setRole(null);

      if (!currentSession) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Defer the profile request until after the auth callback.
      pendingTimer = setTimeout(() => {
        void loadRole(currentSession, version);
      }, 0);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      applySession(currentSession);
    });

    // Bootstrap the initial session.
    const initialVersion = authVersion;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authVersion !== initialVersion) return;

        if (error) {
          console.error("Session error:", error);
          setLoading(false);
          return;
        }

        applySession(data.session);
      })
      .catch((error) => {
        if (!active || authVersion !== initialVersion) return;

        console.error("Session error:", error);
        setLoading(false);
      });

    return () => {
      active = false;

      if (pendingTimer) {
        clearTimeout(pendingTimer);
      }

      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) throw error;
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
