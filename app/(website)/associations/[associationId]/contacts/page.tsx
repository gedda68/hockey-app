import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicAssociationById } from "@/lib/public/publicAssociation";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";

export const dynamic = "force-dynamic";

export default async function AssociationContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ associationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { associationId } = await params;
  const sp = await searchParams;
  const tenant: PublicTenantPayload | null = await getPublicTenantForServerPage(sp);

  const assoc = await getPublicAssociationById(associationId);
  if (!assoc) notFound();

  if (tenant?.kind === "association" && tenant.id !== associationId) notFound();
  if (tenant?.kind === "club") notFound();

  const positions = assoc.positions ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl text-white">
        <Link
          href={`/associations/${encodeURIComponent(associationId)}`}
          className="inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← Back to association hub
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-black uppercase italic tracking-tight">
            Contacts
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Committee and public contacts published by {assoc.name}. Contact details only appear
            when they have been opted-in for the public site.
          </p>

          {positions.length === 0 ? (
            <p className="mt-6 text-sm text-white/60">
              No public committee contacts available yet.
            </p>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {positions
                .slice()
                .sort((a, b) => (a.displayName ?? a.title).localeCompare(b.displayName ?? b.title))
                .map((p) => (
                  <li
                    key={p.positionId}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="font-black">
                      {p.displayName ?? p.title}
                    </div>
                    {p.description ? (
                      <p className="mt-1 text-sm text-white/70 whitespace-pre-wrap line-clamp-4">
                        {p.description}
                      </p>
                    ) : null}

                    <div className="mt-3 space-y-1 text-sm text-white/85">
                      {p.email ? (
                        <a className="hover:underline" href={`mailto:${p.email}`}>
                          {p.email}
                        </a>
                      ) : null}
                      {p.phone ? (
                        <a className="hover:underline" href={`tel:${p.phone}`}>
                          {p.phone}
                        </a>
                      ) : null}
                      {!p.email && !p.phone ? (
                        <span className="text-white/50 text-xs">
                          Contact details not published.
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

