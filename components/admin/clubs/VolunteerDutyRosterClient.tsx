"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  VOLUNTEER_DUTY_KIND_IDS,
  VOLUNTEER_DUTY_KIND_LABELS,
  type VolunteerDutyKindId,
} from "@/lib/volunteerDuty/volunteerDutyKinds";

type Lead = {
  leadId: string;
  displayName: string;
  email: string;
  phone?: string | null;
  dutyKinds: VolunteerDutyKindId[];
  message?: string | null;
  notes?: string | null;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_OPTS = ["lead", "contacted", "active", "paused", "archived"] as const;

export default function VolunteerDutyRosterClient({ clubRef }: { clubRef: string }) {
  const [clubLabel, setClubLabel] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addKinds, setAddKinds] = useState<Set<VolunteerDutyKindId>>(
    () => new Set(["canteen"]),
  );
  const [addNotes, setAddNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/clubs/${encodeURIComponent(clubRef)}/volunteer-duty-roster`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Load failed");
      }
      setClubLabel(data.club?.name ? String(data.club.name) : "");
      const list = Array.isArray(data.leads) ? data.leads : [];
      setLeads(list as Lead[]);
      const n: Record<string, string> = {};
      const s: Record<string, string> = {};
      for (const L of list as Lead[]) {
        n[L.leadId] = L.notes ?? "";
        s[L.leadId] = L.status;
      }
      setDraftNotes(n);
      setDraftStatus(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [clubRef]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveLead = async (leadId: string) => {
    try {
      const res = await fetch(
        `/api/admin/clubs/${encodeURIComponent(clubRef)}/volunteer-duty-roster/${encodeURIComponent(leadId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: draftNotes[leadId] ?? "",
            status: draftStatus[leadId] ?? "lead",
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      }
      toast.success("Saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!window.confirm("Remove this lead from the roster?")) return;
    try {
      const res = await fetch(
        `/api/admin/clubs/${encodeURIComponent(clubRef)}/volunteer-duty-roster/${encodeURIComponent(leadId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Delete failed");
      }
      toast.success("Deleted");
      setExpanded(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const submitAdd = async () => {
    const dutyKinds = [...addKinds];
    if (dutyKinds.length === 0) {
      toast.error("Pick at least one duty");
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/clubs/${encodeURIComponent(clubRef)}/volunteer-duty-roster`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: addName.trim(),
            email: addEmail.trim(),
            phone: addPhone.trim() || undefined,
            dutyKinds,
            notes: addNotes.trim() || undefined,
            status: "lead",
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Create failed");
      }
      toast.success("Lead added");
      setAddOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddNotes("");
      setAddKinds(new Set(["canteen"]));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    }
  };

  const toggleAddKind = (k: VolunteerDutyKindId) => {
    setAddKinds((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-[#06054e]">Volunteer duty roster</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          {clubLabel || "Club"} — game-day helpers (canteen, goal judge, …). Separate from the
          association umpire register.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Public sign-up:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
            /clubs/&lt;slug&gt;/volunteer-duties
          </code>
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="rounded-xl bg-[#06054e] px-4 py-2 text-sm font-black text-white shadow hover:bg-[#0a0968]"
        >
          {addOpen ? "Close add form" : "Add lead"}
        </button>
      </div>

      {addOpen ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
          <h2 className="text-lg font-black text-[#06054e]">New lead (admin)</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              Name
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Email
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">
              Phone (optional)
              <input
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">Duties</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {VOLUNTEER_DUTY_KIND_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleAddKind(id)}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  addKinds.has(id)
                    ? "border-amber-500 bg-amber-200/60 text-[#06054e]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {VOLUNTEER_DUTY_KIND_LABELS[id]}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-xs font-bold text-slate-600">
            Notes
            <textarea
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void submitAdd()}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow hover:bg-emerald-700"
          >
            Create lead
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-sm text-slate-500">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="p-8 text-sm text-slate-500">No leads yet. Share the public volunteer duties URL.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {leads.map((L) => {
              const open = expanded === L.leadId;
              return (
                <li key={L.leadId} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#06054e]">{L.displayName}</p>
                      <p className="text-sm text-slate-600">{L.email}</p>
                      {L.phone ? (
                        <p className="text-xs text-slate-500">{L.phone}</p>
                      ) : null}
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        {L.dutyKinds.map((k) => VOLUNTEER_DUTY_KIND_LABELS[k]).join(" · ")}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">
                        {L.source} · {L.status} · {L.createdAt?.slice(0, 10)}
                      </p>
                      {L.message ? (
                        <p className="mt-2 text-xs italic text-slate-600">&ldquo;{L.message}&rdquo;</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : L.leadId)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {open ? "Close" : "CRM"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteLead(L.leadId)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                      <label className="text-xs font-bold text-slate-600">
                        Status
                        <select
                          value={draftStatus[L.leadId] ?? L.status}
                          onChange={(e) =>
                            setDraftStatus((prev) => ({
                              ...prev,
                              [L.leadId]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          {STATUS_OPTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-600">
                          Internal notes
                          <textarea
                            value={draftNotes[L.leadId] ?? ""}
                            onChange={(e) =>
                              setDraftNotes((prev) => ({
                                ...prev,
                                [L.leadId]: e.target.value,
                              }))
                            }
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => void saveLead(L.leadId)}
                        className="rounded-xl bg-[#06054e] px-4 py-2 text-sm font-black text-white shadow hover:bg-[#0a0968]"
                      >
                        Save changes
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
