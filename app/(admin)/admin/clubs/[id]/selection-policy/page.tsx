import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import SelectionPolicyForm from "@/components/admin/selection/SelectionPolicyForm";

async function getClub(clubId: string, cookie: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(
      `${baseUrl}/api/admin/clubs/${encodeURIComponent(clubId)}`,
      {
        cache: "no-store",
        headers: cookie ? { cookie } : {},
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.club || null;
  } catch {
    return null;
  }
}

export default async function ClubSelectionPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";
  const club = await getClub(id, cookie);
  if (!club) notFound();

  const ref = club.slug || club.id;
  const name = club.name || club.id;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/admin/clubs"
          className="font-bold text-slate-600 hover:text-[#06054e]"
        >
          Clubs
        </Link>
        <span className="text-slate-400">/</span>
        <Link
          href={`/admin/clubs/${encodeURIComponent(ref)}/edit`}
          className="font-bold text-slate-600 hover:text-[#06054e]"
        >
          {name}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-bold text-slate-800">Selection policy</span>
      </div>

      <SelectionPolicyForm
        apiUrl={`/api/admin/clubs/${encodeURIComponent(ref)}/selection-policy`}
        title={`${name}`}
        subtitle="Club-level team selection policy (merged over parent association chain)"
        tierHint="Club"
      />
    </div>
  );
}

