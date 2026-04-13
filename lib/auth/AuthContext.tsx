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
import type { ScopedRole } from "@/lib/auth/session";
import type { PersonaOption } from "@/lib/auth/sessionPersona";
import { syncBrowserToPortalSubdomain } from "@/lib/tenant/clientTenantHost";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export interface User {
  userId?: string;
  memberId?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  /** All role assignments from the session (for menu / feature checks). */
  scopedRoles?: ScopedRole[];
  /** Switchable personas when the user has more than one role scope. */
  personas?: PersonaOption[];
  /** Matches JWT active scope (from session cookie). */
  activePersonaKey?: string;
  associationId?: string | null;
  /**
   * Hierarchical tier of the user's primary association.
   * Populated at login from the association's numeric level field.
   *   "national"  = level 0  (e.g. Hockey Australia)
   *   "state"     = level 1  (e.g. Hockey QLD)
   *   "city"      = level 2  (e.g. Brisbane Hockey)
   *   "district"  = level 3+ (sub-regional bodies)
   * Absent for club-scoped users and super-admin.
   */
  associationLevel?: "national" | "state" | "city" | "district" | null;
  clubId?: string | null;
  clubSlug?: string | null;
  clubName?: string | null;
  forcePasswordChange?: boolean;
  status?: string;
  /** Host slug for {slug}.{PORTAL_ROOT_DOMAIN} — aligns browser with middleware. */
  portalSubdomain?: string | null;
}

function mapMePayload(raw: Record<string, unknown>): User {
  return {
    userId: raw.userId as string | undefined,
    memberId: raw.memberId ? String(raw.memberId) : undefined,
    username: (raw.username as string) || "",
    email: (raw.email as string) || "",
    firstName:
      (raw.firstName as string) ||
      String(raw.name || "").split(" ")[0] ||
      "",
    lastName:
      (raw.lastName as string) ||
      String(raw.name || "").split(" ").slice(1).join(" ") ||
      "",
    role: (raw.role as string) || "player",
    scopedRoles: Array.isArray(raw.scopedRoles)
      ? (raw.scopedRoles as ScopedRole[])
      : [],
    personas: Array.isArray(raw.personas)
      ? (raw.personas as PersonaOption[])
      : undefined,
    activePersonaKey: (raw.activePersonaKey as string) || undefined,
    associationId: (raw.associationId as string) ?? null,
    associationLevel:
      (raw.associationLevel as User["associationLevel"]) ?? null,
    clubId: (raw.clubId as string) ?? null,
    clubSlug: (raw.clubSlug as string) ?? null,
    clubName: (raw.clubName as string) ?? null,
    forcePasswordChange: raw.forcePasswordChange === true,
    portalSubdomain: (raw.portalSubdomain as string) ?? null,
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  switchPersona: (personaKey: string) => Promise<void>;
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
    "media-marketing",
    "club-admin",
    "club-committee",
    "registrar",
    "coach",
    "manager",
    "umpire",
    "technical-official",
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
    "manage:nominations":  ["super-admin", "association-admin", "assoc-selector", "assoc-coach", "club-admin", "team-selector", "coach"],
    "manage:media":        ["super-admin", "association-admin", "assoc-committee", "media-marketing", "club-admin"],
    "manage:finance":      ["super-admin", "association-admin", "assoc-committee", "assoc-registrar", "club-admin", "club-committee", "registrar"],
    "view:admin":          ADMIN_ROLES,
    "view:portal":         [...ADMIN_ROLES, "player", "member", "parent"],
  };

  return permissions[permission]?.includes(role) ?? false;
}

function effectiveRoles(user: User): string[] {
  const roles = new Set<string>([user.role]);
  for (const r of user.scopedRoles ?? []) {
    if (r?.role) roles.add(r.role);
  }
  return Array.from(roles);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const u = mapMePayload(data.user as Record<string, unknown>);
          setUserState(u);
          try {
            localStorage.setItem("user", JSON.stringify(u));
          } catch {
            /* ignore quota */
          }
          return;
        }
      }
      localStorage.removeItem("user");
      setUserState(null);
    } catch {
      try {
        const stored = localStorage.getItem("user");
        if (stored) setUserState(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Load user — verify against server session (authoritative), fall back to localStorage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const u = mapMePayload(data.user as Record<string, unknown>);
            setUserState(u);
            try {
              localStorage.setItem("user", JSON.stringify(u));
            } catch {
              /* ignore */
            }
            return;
          }
        }
        localStorage.removeItem("user");
        setUserState(null);
      } catch {
        try {
          const stored = localStorage.getItem("user");
          if (stored) setUserState(JSON.parse(stored));
        } catch {
          /* ignore */
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, []);

  const switchPersona = useCallback(
    async (personaKey: string) => {
      const res = await fetch("/api/auth/switch-persona", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaKey }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Switch failed");
      }
      const data = (await res.json().catch(() => ({}))) as {
        portalSubdomain?: string | null;
      };
      await refreshUser();
      syncBrowserToPortalSubdomain(data.portalSubdomain);
    },
    [refreshUser],
  );

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
      if (user.role === "super-admin") return true;
      return effectiveRoles(user).some((r) => roleHasPermission(r, permission));
    },
    [user],
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
        refreshUser,
        switchPersona,
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
