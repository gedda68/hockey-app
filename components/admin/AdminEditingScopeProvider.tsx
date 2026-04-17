"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { parseAdminPathResource } from "@/lib/admin/parseAdminPathResource";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBrand } from "@/lib/contexts/BrandContext";

export type AdminEditingScopeValue = {
  loading: boolean;
  hasPathResource: boolean;
  serverAllowsEdit: boolean;
  /** Resolved display name for the URL resource, else brand / super-admin label */
  editingLabel: string | null;
  /** True when this URL targets another org the session cannot edit */
  savesBlocked: boolean;
  blockReason: string | null;
};

const defaultValue: AdminEditingScopeValue = {
  loading: false,
  hasPathResource: false,
  serverAllowsEdit: true,
  editingLabel: null,
  savesBlocked: false,
  blockReason: null,
};

const AdminEditingScopeContext = createContext<AdminEditingScopeValue>(defaultValue);

export function AdminEditingScopeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { brand, isLoading: brandLoading } = useBrand();
  const parsed = useMemo(() => parseAdminPathResource(pathname), [pathname]);

  const [scope, setScope] = useState({
    loading: true,
    hasPathResource: false,
    serverAllowsEdit: true,
    displayName: null as string | null,
    savesBlocked: false,
    blockReason: null as string | null,
  });

  useEffect(() => {
    if (!user) {
      setScope({
        loading: false,
        hasPathResource: false,
        serverAllowsEdit: true,
        displayName: null,
        savesBlocked: false,
        blockReason: null,
      });
      return;
    }

    if (!parsed) {
      setScope({
        loading: false,
        hasPathResource: false,
        serverAllowsEdit: true,
        displayName: null,
        savesBlocked: false,
        blockReason: null,
      });
      return;
    }

    const q =
      parsed.kind === "club"
        ? `clubKey=${encodeURIComponent(parsed.key)}`
        : `associationId=${encodeURIComponent(parsed.id)}`;

    let cancelled = false;
    setScope((s) => ({ ...s, loading: true }));

    void fetch(`/api/auth/admin-editing-scope?${q}`, { credentials: "include" })
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as {
          allowed?: boolean;
          displayName?: string | null;
          kind?: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!r.ok) {
          setScope({
            loading: false,
            hasPathResource: true,
            serverAllowsEdit: false,
            displayName: null,
            savesBlocked: true,
            blockReason:
              data.error || "Could not verify edit permissions for this page.",
          });
          return;
        }
        const allowed = data.allowed !== false;
        setScope({
          loading: false,
          hasPathResource: true,
          serverAllowsEdit: allowed,
          displayName: data.displayName ?? null,
          savesBlocked: !allowed,
          blockReason: allowed
            ? null
            : "This page targets another organisation. Switch persona or navigate to your admin area before saving.",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setScope({
          loading: false,
          hasPathResource: true,
          serverAllowsEdit: false,
          displayName: null,
          savesBlocked: true,
          blockReason: "Could not verify edit permissions for this page.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [user, parsed]);

  const editingLabel = useMemo(() => {
    if (scope.hasPathResource && scope.displayName) {
      return scope.displayName;
    }
    if (brand?.name) return brand.name;
    if (user?.role === "super-admin") return "All organisations";
    return null;
  }, [
    scope.hasPathResource,
    scope.displayName,
    brand?.name,
    user?.role,
  ]);

  const value: AdminEditingScopeValue = useMemo(
    () => ({
      loading: scope.loading || brandLoading,
      hasPathResource: scope.hasPathResource,
      serverAllowsEdit: scope.serverAllowsEdit,
      editingLabel,
      savesBlocked: scope.savesBlocked,
      blockReason: scope.blockReason,
    }),
    [
      scope.loading,
      scope.hasPathResource,
      scope.serverAllowsEdit,
      scope.savesBlocked,
      scope.blockReason,
      brandLoading,
      editingLabel,
    ],
  );

  return (
    <AdminEditingScopeContext.Provider value={value}>
      {children}
    </AdminEditingScopeContext.Provider>
  );
}

export function useAdminEditingScope(): AdminEditingScopeValue {
  return useContext(AdminEditingScopeContext);
}

export function AdminScopeMismatchBanner() {
  const { savesBlocked, blockReason } = useAdminEditingScope();
  if (!savesBlocked || !blockReason) return null;
  return (
    <div
      role="alert"
      className="w-full bg-red-600 text-white text-center text-sm font-bold py-2 px-4 shadow-md shrink-0"
    >
      {blockReason}
    </div>
  );
}
