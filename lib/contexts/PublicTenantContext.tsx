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
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";

type PublicTenantContextValue = {
  tenant: PublicTenantPayload | null;
  portalSlug: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const PublicTenantContext = createContext<PublicTenantContextValue | null>(
  null,
);

export function PublicTenantProvider({
  children,
  initialTenant = null,
}: {
  children: ReactNode;
  /** From root layout (Host); avoids default BHA chrome until client fetch completes. */
  initialTenant?: PublicTenantPayload | null;
}) {
  const pathname = usePathname();
  const [tenant, setTenant] = useState<PublicTenantPayload | null>(
    () => initialTenant ?? null,
  );
  const [portalSlug, setPortalSlug] = useState<string | null>(
    () => initialTenant?.portalSlug ?? null,
  );
  const [isLoading, setIsLoading] = useState(() => initialTenant == null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/api/public/tenant";
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search).get("portal");
        if (p?.trim()) {
          url += `?portal=${encodeURIComponent(p.trim())}`;
        }
      }
      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setTenant(null);
        setPortalSlug(null);
        return;
      }
      const data = (await res.json()) as {
        tenant: PublicTenantPayload | null;
        portalSlug?: string | null;
      };
      setTenant(data.tenant ?? null);
      setPortalSlug(data.portalSlug ?? null);
    } catch {
      setTenant(null);
      setPortalSlug(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const root = document.documentElement;
    const keys = [
      "--portal-primary",
      "--portal-secondary",
      "--portal-tertiary",
      "--portal-accent",
    ] as const;
    if (!tenant) {
      for (const k of keys) root.style.removeProperty(k);
      return;
    }
    root.style.setProperty("--portal-primary", tenant.primaryColor);
    root.style.setProperty("--portal-secondary", tenant.secondaryColor);
    root.style.setProperty("--portal-tertiary", tenant.tertiaryColor);
    root.style.setProperty("--portal-accent", tenant.accentColor);
    return () => {
      for (const k of keys) root.style.removeProperty(k);
    };
  }, [tenant]);

  const value = useMemo(
    () => ({ tenant, portalSlug, isLoading, refresh }),
    [tenant, portalSlug, isLoading, refresh],
  );

  return (
    <PublicTenantContext.Provider value={value}>
      {children}
    </PublicTenantContext.Provider>
  );
}

export function usePublicTenant(): PublicTenantContextValue {
  const ctx = useContext(PublicTenantContext);
  if (!ctx) {
    return {
      tenant: null,
      portalSlug: null,
      isLoading: false,
      refresh: async () => {},
    };
  }
  return ctx;
}
