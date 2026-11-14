// components/admin/AdminFooter.tsx
// Footer for the admin / member area: club or association name, quick links, and the sponsor strip.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBrand } from "@/lib/contexts/BrandContext";
import PartnerStripClickable from "@/components/website/PartnerStripClickable";
import {
  normalizePublicPartners,
  type PublicSitePartner,
} from "@/lib/tenant/tenantPartners";

export default function AdminFooter() {
  const { user } = useAuth();
  const { brand } = useBrand();
  const [partners, setPartners] = useState<PublicSitePartner[]>([]);
  const [scope, setScope] = useState<{ kind: "club" | "association"; id: string } | null>(null);

  const clubRef = user?.clubSlug || user?.clubId || null;
  const assocId = user?.associationId || null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (clubRef) {
          const r = await fetch(`/api/clubs/${clubRef}`);
          if (!r.ok) return;
          const c = await r.json();
          if (cancelled) return;
          setPartners(normalizePublicPartners(c.publicPartners));
          setScope({ kind: "club", id: String(c.id || c.slug || clubRef) });
        } else if (assocId) {
          const r = await fetch(`/api/admin/associations/${assocId}`);
          if (!r.ok) return;
          const d = await r.json();
          const a = d.association || d;
          if (cancelled) return;
          setPartners(normalizePublicPartners(a?.branding?.partners));
          setScope({ kind: "association", id: String(assocId) });
        }
      } catch {
        /* footer is decorative */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clubRef, assocId]);

  const primary = brand?.primaryColor ?? "#06054e";

  return (
    <footer style={{ backgroundColor: primary }} className="mt-8 text-white/90">
      {partners.length > 0 && scope ? (
        <PartnerStripClickable
          partners={partners}
          scopeType={scope.kind}
          scopeId={scope.id}
          layout="footer"
          borderColor="rgba(255,255,255,0.18)"
          headingClass="text-white/60"
        />
      ) : null}
      <div className="flex flex-col items-center justify-between gap-3 px-6 py-5 text-xs sm:flex-row">
        <p className="font-semibold">
          © {new Date().getFullYear()} {brand?.name ?? "Hockey Management System"}
        </p>
        <nav className="flex flex-wrap items-center gap-4 font-bold">
          <Link href="/" className="hover:underline">Public site</Link>
          <Link href="/competitions" className="hover:underline">Competitions</Link>
          <Link href="/clubs" className="hover:underline">Clubs</Link>
          <Link href="/play" className="hover:underline">Get involved</Link>
        </nav>
      </div>
    </footer>
  );
}
