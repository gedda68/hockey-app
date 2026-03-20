// app/admin/clubs/[id]/fees/page.tsx

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FeeManager from "@/components/admin/FeeManager";

async function getClub(id: string, cookie: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/clubs/${id}`, {
      cache: "no-store",
      headers: cookie ? { cookie } : {},
    });

    if (!res.ok) {
      console.error(`Failed to fetch club ${id}:`, res.status);
      return null;
    }

    const data = await res.json();
    return data.club || null;
  } catch (error) {
    console.error("Error fetching club:", error);
    return null;
  }
}

export default async function ClubFeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";

  const club = await getClub(id, cookie);

  if (!club) {
    notFound();
  }

  const primaryColor = club.colors?.primaryColor || "#06054e";

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/clubs" className="font-bold text-slate-600 hover:text-[#06054e]">
          Clubs
        </Link>
        <span className="text-slate-400">/</span>
        <Link
          href={`/admin/clubs/${id}/edit`}
          className="font-bold text-slate-600 hover:text-[#06054e]"
        >
          {club.name}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-bold text-[#06054e]">Fees</span>
      </div>

      {/* Back link */}
      <Link
        href={`/admin/clubs/${id}/edit`}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#06054e] transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Club
      </Link>

      <FeeManager
        entityType="club"
        entityId={id}
        entityName={club.name}
        primaryColor={primaryColor}
      />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Fee Management | Club ${id} | Hockey Admin`,
  };
}
