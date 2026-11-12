import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { userCanAccessAssociationResource } from "@/lib/auth/resourceAccessDb";

export const metadata = { title: "Competition panel | Admin" };

/**
 * Entry point for the Competition panel. Association users go straight to
 * their association's panel; a super-admin picks an association (or is sent
 * straight in when only one exists).
 */
export default async function CompetitionPanelEntry() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/competition-panel");

  const own = session.associationId?.trim();
  if (own && session.role !== "super-admin") {
    redirect(`/admin/associations/${encodeURIComponent(own)}/competition-panel`);
  }

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const all = await db
    .collection("associations")
    .find({}, { projection: { _id: 0, associationId: 1, name: 1 } })
    .sort({ name: 1 })
    .toArray();
  // Only associations this user may access (super-admin: all).
  const allowed = await Promise.all(
    all.map((a) => userCanAccessAssociationResource(session, a.associationId as string)),
  );
  const rows = all.filter((_, i) => allowed[i]);

  if (rows.length === 1) {
    redirect(`/admin/associations/${encodeURIComponent(rows[0].associationId as string)}/competition-panel`);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-black text-[#06054e]">Competition panel</h1>
      <p className="text-sm text-slate-500">Choose an association.</p>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((a) => (
          <li key={a.associationId as string}>
            <Link
              href={`/admin/associations/${encodeURIComponent(a.associationId as string)}/competition-panel`}
              className="block rounded-xl border-2 border-slate-100 bg-white p-4 font-bold text-[#06054e] hover:border-[#06054e]"
            >
              {a.name as string}
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-sm text-slate-500">No associations found.</p>}
    </div>
  );
}
