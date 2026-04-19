"use client";

/**
 * Epic V3 — admin: training / private blocks on the public pitch week calendar.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type VenueRow = {
  venueId: string;
  name: string;
  pitches?: Array<{ pitchId: string; label: string }>;
};

type ClubOpt = { clubId: string; clubName: string };

type EntryRow = {
  entryId: string;
  venueId: string;
  pitchId: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  displayKind: "training" | "private" | "hire";
  trainingOrganizer?: "club" | "association";
  trainingClubId?: string | null;
};

function entryKindLabel(kind: string) {
  if (kind === "hire") return "Venue hire";
  if (kind === "private") return "Private";
  return "Training";
}

export default function AdminPitchCalendarClient({
  associationId,
  associationName,
}: {
  associationId: string;
  associationName: string;
}) {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [clubs, setClubs] = useState<ClubOpt[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [venueId, setVenueId] = useState("");
  const [pitchId, setPitchId] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [displayKind, setDisplayKind] = useState<"training" | "private" | "hire">("training");
  const [trainingOrganizer, setTrainingOrganizer] = useState<"club" | "association">(
    "association",
  );
  const [trainingClubId, setTrainingClubId] = useState("");

  const fromTo = useMemo(() => {
    const now = Date.now();
    const from = new Date(now - 2 * 86_400_000).toISOString();
    const to = new Date(now + 21 * 86_400_000).toISOString();
    return { from, to };
  }, []);

  const pitchOptions = useMemo(() => {
    const v = venues.find((x) => x.venueId === venueId);
    return v?.pitches ?? [];
  }, [venues, venueId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, lbRes, eRes] = await Promise.all([
        fetch(`/api/admin/associations/${encodeURIComponent(associationId)}/venues?status=active`, {
          credentials: "include",
        }),
        fetch(
          `/api/admin/associations/${encodeURIComponent(associationId)}/league-builder-teams`,
          { credentials: "include" },
        ),
        fetch(
          `/api/admin/associations/${encodeURIComponent(associationId)}/pitch-calendar-entries?from=${encodeURIComponent(fromTo.from)}&to=${encodeURIComponent(fromTo.to)}`,
          { credentials: "include" },
        ),
      ]);
      const vJson = await vRes.json().catch(() => ({}));
      if (!vRes.ok) throw new Error(vJson.error || "Venues load failed");
      setVenues((vJson.venues ?? []) as VenueRow[]);

      const lbJson = await lbRes.json().catch(() => ({}));
      if (!lbRes.ok) throw new Error(lbJson.error || "Clubs load failed");
      setClubs((lbJson.clubs ?? []) as ClubOpt[]);

      const eJson = await eRes.json().catch(() => ({}));
      if (!eRes.ok) throw new Error(eJson.error || "Entries load failed");
      setEntries((eJson.entries ?? []) as EntryRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [associationId, fromTo.from, fromTo.to]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setPitchId("");
  }, [venueId]);

  const submitCreate = async () => {
    if (!venueId || !pitchId || !scheduledStart.trim()) {
      toast.error("Venue, pitch, and start time are required.");
      return;
    }
    const body: Record<string, unknown> = {
      venueId,
      pitchId,
      scheduledStart: new Date(scheduledStart).toISOString(),
      scheduledEnd: scheduledEnd.trim() ? new Date(scheduledEnd).toISOString() : null,
      displayKind,
    };
    if (displayKind === "training") {
      body.trainingOrganizer = trainingOrganizer;
      if (trainingOrganizer === "club") {
        body.trainingClubId = trainingClubId.trim() || null;
      }
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/pitch-calendar-entries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Create failed");
      toast.success("Block created.");
      setScheduledStart("");
      setScheduledEnd("");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (entryId: string) => {
    if (!confirm("Delete this calendar block?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/pitch-calendar-entries/${encodeURIComponent(entryId)}`,
        { method: "DELETE", credentials: "include" },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Delete failed");
      toast.success("Deleted.");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#06054e]">Pitch calendar blocks</h1>
        <p className="text-sm font-bold text-slate-600 mt-1">
          {associationName} — use <strong>Venue hire</strong> for commercial / facility hire so it
          appears in admin lists; the{" "}
          <Link
            href={`/associations/${encodeURIComponent(associationId)}/venue-calendar`}
            className="text-emerald-800 underline font-black"
            target="_blank"
            rel="noreferrer"
          >
            public pitch calendar
          </Link>{" "}
          still shows hire only as <strong>Private</strong> (no hirer or fee details).{" "}
          <strong>Training</strong> shows club or association. <strong>Private</strong> is generic
          hidden detail.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-600 font-bold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : null}

      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase text-slate-500">Add block</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Venue
            <select
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold"
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
            >
              <option value="">Select…</option>
              {venues.map((v) => (
                <option key={v.venueId} value={v.venueId}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Pitch
            <select
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold"
              value={pitchId}
              onChange={(e) => setPitchId(e.target.value)}
              disabled={!venueId}
            >
              <option value="">Select…</option>
              {pitchOptions.map((p) => (
                <option key={p.pitchId} value={p.pitchId}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Start (local)
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-mono text-sm font-bold"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            End (optional)
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-mono text-sm font-bold"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm font-bold text-slate-700">
          Block type (public vs admin)
          <select
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold"
            value={displayKind}
            onChange={(e) =>
              setDisplayKind(e.target.value as "training" | "private" | "hire")
            }
          >
            <option value="training">Training (public shows organiser)</option>
            <option value="hire">Venue hire (admin label — public shows as Private)</option>
            <option value="private">Private (public shows as Private)</option>
          </select>
        </label>
        {displayKind === "training" ? (
          <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
            <label className="block text-sm font-bold text-slate-700">
              Organiser
              <select
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold"
                value={trainingOrganizer}
                onChange={(e) =>
                  setTrainingOrganizer(e.target.value as "club" | "association")
                }
              >
                <option value="association">Whole association</option>
                <option value="club">Member club</option>
              </select>
            </label>
            {trainingOrganizer === "club" ? (
              <label className="block text-sm font-bold text-slate-700">
                Club
                <select
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold"
                  value={trainingClubId}
                  onChange={(e) => setTrainingClubId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {clubs.map((c) => (
                    <option key={c.clubId} value={c.clubId}>
                      {c.clubName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void submitCreate()}
          className="rounded-xl bg-[#06054e] text-white px-5 py-3 font-black disabled:opacity-40"
        >
          {busy ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null} Save block
        </button>
      </div>

      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase text-slate-500 mb-3">
          Upcoming blocks (loaded window)
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm font-bold text-slate-500">No manual blocks in this date range.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.entryId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-black text-slate-800">{entryKindLabel(e.displayKind)}</span>
                  <span className="font-mono text-xs text-slate-500 ml-2">{e.entryId}</span>
                  <div className="text-xs font-bold text-slate-600 mt-1">
                    {e.scheduledStart}
                    {e.scheduledEnd ? ` → ${e.scheduledEnd}` : ""}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    venue {e.venueId} · pitch {e.pitchId}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="text-xs font-black text-red-700 underline disabled:opacity-40"
                  onClick={() => void removeEntry(e.entryId)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
