// The people you're a parent/guardian of, and what is waiting for you.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Loader2 } from "lucide-react";

import PageHeader from "@/components/admin/PageHeader";
interface Child { memberId: string; name: string; age: number | null; isMinor: boolean; clubName: string | null; status: string | null; roles: string[]; waitingForMe: number }

export default function MyChildrenPage() {
  const router = useRouter();
  const { user } = useAuth();
  // Not a parent/guardian: there is nothing here, so send them to the dashboard.
  useEffect(() => { if (user?.family && !user.family.hasChildren) router.replace("/admin/dashboard"); }, [user?.family, router]);
  const [children, setChildren] = useState<Child[] | null>(null);
  useEffect(() => {
    fetch("/api/member/my-children", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { children: [] }))
      .then((d) => setChildren(d.children ?? []))
      .catch(() => setChildren([]));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader eyebrow="Family" title="My children" subtitle="People you're recorded as a parent/guardian of." />
      {children === null ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : children.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">
          No one is linked to you yet. Ask your club registrar to link you as a parent/guardian on your child's record.
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((c) => (
            <div key={c.memberId} className="flex flex-col gap-3 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-slate-800">
                  {c.name}
                  {c.age !== null && <span className="ml-2 text-xs font-bold text-slate-400">{c.age} years{c.isMinor ? "" : " · adult"}</span>}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {c.clubName ?? "No club"}{c.status ? ` · ${c.status}` : ""}
                </p>
                {c.roles.length > 0 && <p className="mt-1 text-xs font-semibold text-slate-500">Roles: {c.roles.join(", ")}</p>}
              </div>
              {c.waitingForMe > 0 && (
                <Link href="/admin/guardian-approvals" className="rounded-xl bg-amber-100 px-4 py-2 text-xs font-black text-amber-800 hover:bg-amber-200">
                  {c.waitingForMe} waiting for you
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
