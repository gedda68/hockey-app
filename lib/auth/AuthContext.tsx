// lib/auth/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface User {
  userId?: string;
  memberId?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  associationId?: string | null;
  clubId?: string | null;
  clubName?: string | null;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccessResource: (type: "association" | "club", id: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple permission check based on role — mirrors middleware logic
function roleHasPermission(role: string, permission: string): boolean {
  const ADMIN_ROLES = [
    "super-admin",
    "association-admin",
    "assoc-committee",
    "assoc-coach",
    "assoc-selector",
    "assoc-registrar",
    "club-admin",
    "club-committee",
    "registrar",
    "coach",
    "manager",
    "umpire",
    "volunteer",
    "team-selector",
  ];

  const permissions: Record<string, string[]> = {
    "manage:all":          ["super-admin"],
    "manage:association":  ["super-admin", "association-admin"],
    "manage:club":         ["super-admin", "association-admin", "club-admin"],
    "manage:members":      ["super-admin", "association-admin", "club-admin", "club-committee", "registrar"],
    "manage:players":      ["super-admin", "association-admin", "club-admin", "club-committee", "registrar", "coach", "manager"],
    "manage:teams":        ["super-admin", "association-admin", "club-admin", "coach", "manager"],
    "manage:nominations":  ["super-admin", "association-admin", "assoc-selector", "club-admin", "team-selector", "coach"],
    "view:admin":          ADMIN_ROLES,
    "view:portal":         [...ADMIN_ROLES, "player", "member", "parent"],
  };

  return permissions[permission]?.includes(role) ?? false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user — verify against server session (authoritative), fall back to localStorage
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Try server session first
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const u: User = {
              userId:        data.user.userId,
              memberId:      data.user.memberId,
              username:      data.user.username || "",
              email:         data.user.email    || "",
              firstName:     data.user.firstName || data.user.name?.split(" ")[0] || "",
              lastName:      data.user.lastName  || data.user.name?.split(" ").slice(1).join(" ") || "",
              role:          data.user.role      || "player",
              associationId: data.user.associationId || null,
              clubId:        data.user.clubId        || null,
              clubName:      data.user.clubName       || null,
            };
            setUserState(u);
            localStorage.setItem("user", JSON.stringify(u));
            return;
          }
        }

        // Session gone — clear localStorage too
        localStorage.removeItem("user");
        setUserState(null);
      } catch {
        // Network failure — try localStorage as offline fallback
        try {
          const stored = localStorage.getItem("user");
          if (stored) setUserState(JSON.parse(stored));
        } catch {
          // ignore
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
    } else {
      localStorage.removeItem("user");
    }
  }, []);

  const logout = useCallback(async () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors
    }
    setUserState(null);
    localStorage.removeItem("user");
    router.push("/login");
  }, [router]);

  // ── 30-minute inactivity timer ───────────────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // Auto-logout on 30 min idle
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      setUserState(null);
      localStorage.removeItem("user");
      router.push("/login?reason=idle");
    }, IDLE_TIMEOUT_MS);
  }, [router]);

  // Attach / detach activity listeners when user is logged in
  useEffect(() => {
    if (!user) {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      return;
    }

    const EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    const handleActivity = () => resetIdleTimer();

    resetIdleTimer(); // start timer on login
    EVENTS.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      EVENTS.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [user, resetIdleTimer]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      return roleHasPermission(user.role, permission);
    },
    [user]
  );

  const canAccessResource = useCallback(
    (type: "association" | "club", id: string): boolean => {
      if (!user) return false;
      if (user.role === "super-admin") return true;
      if (type === "association") {
        if (user.role === "association-admin") return user.associationId === id;
        // assoc staff roles
        const assocStaff = ["assoc-committee","assoc-coach","assoc-selector","assoc-registrar"];
        if (assocStaff.includes(user.role)) return user.associationId === id;
        return false;
      }
      if (type === "club") {
        if (user.role === "association-admin") return true; // can see all clubs in their assoc
        const clubRoles = ["club-admin","club-committee","registrar","coach","manager","team-selector","player","member","parent","volunteer","umpire"];
        if (clubRoles.includes(user.role)) return user.clubId === id;
      }
      return false;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        setUser,
        logout,
        hasPermission,
        canAccessResource,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
