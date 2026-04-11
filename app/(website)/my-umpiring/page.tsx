"use client";

/**
 * /my-umpiring — linked from assignment notification emails (F3 follow-up).
 */

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

type Assignment = {
  fixtureId: string;
  seasonCompetitionId: string;
  owningAssociationId: string;
  slotIndex: number;
  umpireType: string;
  umpireId: string;
  allocationStatus?: string;
  isStandby?: boolean;
  scheduledStart?: string | null;
  venueName?: string | null;
  round?: number;
};

export default function MyUmpiringPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch("/api/member/my-umpire-assignments");
    if (res.status === 401) {
      setAssignments([]);
      return;
    }
    if (!res.ok) {
      toast.error("Could not load assignments");
      return;
    }
    const data = await res.json();
    setAssignments(data.assignments ?? []);
  }, []);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  function setStatus(
    a: Assignment,
    allocationStatus: "accepted" | "declined",
  ) {
    startTransition(async () => {
      const res = await fetch("/api/member/my-umpire-assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixtureId: a.fixtureId,
          seasonCompetitionId: a.seasonCompetitionId,
          slotIndex: a.slotIndex,
          allocationStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Update failed");
        return;
      }
      toast.success(allocationStatus === "accepted" ? "Accepted" : "Declined");
      await load();
    });
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-slate-600">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-black text-[#06054e]">My umpiring</h1>
        <p className="mt-4 font-bold text-slate-600">
          Sign in to see your assignments and respond to offers.
        </p>
        <Link
          href="/login?callbackUrl=/my-umpiring"
          className="mt-6 inline-block rounded-xl bg-[#06054e] px-5 py-2 text-sm font-black text-white"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (!user?.memberId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-black text-[#06054e]">My umpiring</h1>
        <p className="mt-4 font-bold text-slate-600">
          Your account does not have a linked member profile, so assignments cannot
          be matched. Contact your association if you expect to see fixtures here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-[#06054e]">My umpiring</h1>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
          disabled={pending}
          onClick={() => void load()}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <p className="mb-6 text-sm font-bold text-slate-600">
        Fixtures where you are listed as an umpire (by member id or umpire number on
        the official register). Use accept or decline when your association uses that
        workflow.
      </p>

      {assignments.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center font-bold text-slate-500">
          No assignments found.
        </p>
      ) : (
        <ul className="space-y-4">
          {assignments.map((a) => {
            const when = a.scheduledStart
              ? new Date(a.scheduledStart).toLocaleString("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "TBC";
            const st = a.allocationStatus ?? "assigned";
            return (
              <li
                key={`${a.fixtureId}-${a.seasonCompetitionId}-${a.slotIndex}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#06054e]">
                      {a.umpireType}
                      {a.isStandby ? (
                        <span className="ml-2 text-xs font-bold uppercase text-amber-700">
                          Standby
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      Round {a.round ?? "—"} · {when}
                    </p>
                    <p className="text-sm font-bold text-slate-600">
                      {a.venueName?.trim() || "Venue TBC"}
                    </p>
                    <p className="mt-2 font-mono text-xs text-slate-500">
                      {a.seasonCompetitionId} · {a.fixtureId}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black uppercase text-slate-700">
                      {st}
                    </span>
                    {!a.isStandby && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pending || st === "accepted"}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"
                          onClick={() => setStatus(a, "accepted")}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={pending || st === "declined"}
                          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-black text-red-700 disabled:opacity-40"
                          onClick={() => setStatus(a, "declined")}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
