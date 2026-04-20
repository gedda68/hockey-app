"use client";

/**
 * Epic V1 — Association venue directory + pitches (CRUD via admin APIs).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MapPin, Plus, Trash2, Save } from "lucide-react";

type PitchSurface =
  | "grass"
  | "turf"
  | "water"
  | "sand"
  | "indoor"
  | "hybrid"
  | "other";

type PitchRow = { pitchId: string; label: string; surface: PitchSurface };

type VenueRow = {
  venueId: string;
  name: string;
  shortCode?: string | null;
  status: string;
  address: {
    street: string;
    suburb: string;
    city: string;
    state: string;
    postcode: string;
    country?: string;
  };
  geo?: { lat: number; lng: number } | null;
  pitches: PitchRow[];
  notes?: string | null;
};

const SURFACES: PitchSurface[] = [
  "grass",
  "turf",
  "water",
  "sand",
  "indoor",
  "hybrid",
  "other",
];

const emptyAddress = () => ({
  street: "",
  suburb: "",
  city: "",
  state: "",
  postcode: "",
  country: "Australia",
});

export default function AssociationVenuesClient({
  associationId,
  associationName,
  primaryColor = "#06054e",
}: {
  associationId: string;
  associationName: string;
  primaryColor?: string;
}) {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    shortCode: "",
    notes: "",
    ...emptyAddress(),
    lat: "",
    lng: "",
    pitches: [] as { label: string; surface: PitchSurface }[],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<VenueRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/venues`,
        { credentials: "include" },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load venues");
      setVenues((j.venues ?? []) as VenueRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [associationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createVenue = async () => {
    if (!draft.name.trim()) {
      toast.error("Venue name is required.");
      return;
    }
    if (!draft.street.trim() || (!draft.suburb.trim() && !draft.city.trim())) {
      toast.error("Address needs at least a street and either a suburb or city.");
      return;

    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: draft.name.trim(),
        address: {
          street: draft.street.trim(),
          suburb: draft.suburb.trim(),
          city: draft.city.trim(),
          state: draft.state.trim() || "QLD",
          postcode: draft.postcode.trim() || "0000",
          country: draft.country.trim() || "Australia",
        },
        pitches: draft.pitches.filter((p) => p.label.trim()),
      };
      if (draft.shortCode.trim()) body.shortCode = draft.shortCode.trim();
      if (draft.notes.trim()) body.notes = draft.notes.trim();
      const lat = parseFloat(draft.lat);
      const lng = parseFloat(draft.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        body.geo = { lat, lng };
      }
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/venues`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Create failed");
      toast.success("Venue created.");
      setDraft({
        name: "",
        shortCode: "",
        notes: "",
        ...emptyAddress(),
        lat: "",
        lng: "",
        pitches: [],
      });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/venues/${encodeURIComponent(editDraft.venueId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: editDraft.name,
            shortCode: editDraft.shortCode?.trim() || null,
            status: editDraft.status,
            address: editDraft.address,
            notes: editDraft.notes?.trim() ? editDraft.notes.trim() : null,
            pitches: editDraft.pitches,
            geo:
              editDraft.geo === null
                ? null
                : editDraft.geo
                  ? editDraft.geo
                  : undefined,
          }),
        },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.success("Venue saved.");
      setEditingId(null);
      setEditDraft(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const deleteVenue = async (v: VenueRow) => {
    if (!confirm(`Delete venue “${v.name}”? This cannot be undone.`)) return;
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/venues/${encodeURIComponent(v.venueId)}`,
        { method: "DELETE", credentials: "include" },
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Delete failed");
      toast.success("Venue deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div
            className="rounded-xl p-3 text-white shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <MapPin size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#06054e]">Venues &amp; pitches</h1>
            <p className="text-sm font-bold text-slate-600 mt-1">
              {associationName} — master list for scheduling (Epic V). Use{" "}
              <code className="font-mono text-xs">venueId</code> on league fixtures once linked in
              the fixture editor (V2). Today, fixtures may still use free-text venue names.
            </p>
            <p className="text-xs font-bold text-slate-500 mt-2">
              Requires <code className="font-mono">competitions.manage</code> or{" "}
              <code className="font-mono">competitions.fixtures</code>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-black">
              <Link
                href={`/admin/associations/${encodeURIComponent(associationId)}/venue-calendar`}
                className="inline-flex rounded-xl border-2 border-cyan-600 bg-cyan-50 px-3 py-2 text-cyan-900 hover:bg-cyan-100"
              >
                Pitch calendar &amp; venue hire blocks →
              </Link>
              <Link
                href={`/associations/${encodeURIComponent(associationId)}/venue-calendar`}
                className="inline-flex rounded-xl border-2 border-slate-300 px-3 py-2 text-slate-800 hover:bg-slate-50"
                target="_blank"
                rel="noreferrer"
              >
                Public calendar (preview) ↗
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add venue
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-black uppercase text-slate-500">
            Name *
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Short code
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold"
              value={draft.shortCode}
              onChange={(e) => setDraft((d) => ({ ...d, shortCode: e.target.value }))}
              placeholder="e.g. PP"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-black uppercase text-slate-500">
            street
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold"
              value={draft.street}
              onChange={(e) => setDraft((d) => ({ ...d, street: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            suburb
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold"
              value={draft.suburb}
              onChange={(e) => setDraft((d) => ({ ...d, suburb: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            city
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold"
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            state
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold"
              value={draft.state}
              onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            postcode
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold"
              value={draft.postcode}
              onChange={(e) => setDraft((d) => ({ ...d, postcode: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            country
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold"
              value={draft.country}
              onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-black uppercase text-slate-500">
            Latitude (optional)
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
              value={draft.lat}
              onChange={(e) => setDraft((d) => ({ ...d, lat: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Longitude (optional)
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
              value={draft.lng}
              onChange={(e) => setDraft((d) => ({ ...d, lng: e.target.value }))}
            />
          </label>
        </div>
        <label className="block text-xs font-black uppercase text-slate-500">
          Notes
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold min-h-[72px]"
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          />
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-black uppercase text-slate-500">Pitches</span>
          <button
            type="button"
            className="text-xs font-black text-[#06054e] underline"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                pitches: [...d.pitches, { label: "", surface: "turf" }],
              }))
            }
          >
            + Add pitch row
          </button>
        </div>
        {draft.pitches.map((p, idx) => (
          <div key={idx} className="flex flex-wrap gap-2 items-end">
            <input
              className="flex-1 min-w-[160px] rounded-lg border px-3 py-2 text-sm font-bold"
              placeholder="Pitch label (e.g. Field 1)"
              value={p.label}
              onChange={(e) => {
                const next = [...draft.pitches];
                next[idx] = { ...p, label: e.target.value };
                setDraft((d) => ({ ...d, pitches: next }));
              }}
            />
            <select
              className="rounded-lg border px-2 py-2 text-sm font-bold"
              value={p.surface}
              onChange={(e) => {
                const next = [...draft.pitches];
                next[idx] = { ...p, surface: e.target.value as PitchSurface };
                setDraft((d) => ({ ...d, pitches: next }));
              }}
            >
              {SURFACES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="text-red-600 text-xs font-black"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  pitches: d.pitches.filter((_, i) => i !== idx),
                }))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={creating}
          className="rounded-xl px-5 py-2.5 text-sm font-black text-white disabled:opacity-40"
          style={{ backgroundColor: primaryColor }}
          onClick={() => void createVenue()}
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null}
          Create venue
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-800">Directory</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 font-bold">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : venues.length === 0 ? (
          <p className="text-sm font-bold text-slate-500">No venues yet.</p>
        ) : (
          venues.map((v) => (
            <div
              key={v.venueId}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-[#06054e]">{v.name}</h3>
                  <p className="text-xs font-mono text-slate-500">
                    venueId: {v.venueId}
                    {v.shortCode ? (
                      <span className="ml-2 font-bold text-slate-600">· {v.shortCode}</span>
                    ) : null}
                  </p>
                  <p className="text-sm font-bold text-slate-600 mt-1">
                    {[v.address.street, v.address.suburb, v.address.city, v.address.state]
                      .filter(Boolean)
                      .join(", ")}{" "}
                    {v.address.postcode}
                  </p>
                  {v.geo ? (
                    <p className="text-xs font-mono text-slate-500">
                      {v.geo.lat.toFixed(5)}, {v.geo.lng.toFixed(5)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-black"
                    onClick={() => {
                      setEditingId(v.venueId);
                      setEditDraft({
                        ...v,
                        pitches: (v.pitches ?? []).map((p) => ({ ...p })),
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 text-red-700 px-3 py-1.5 text-xs font-black"
                    onClick={() => void deleteVenue(v)}
                  >
                    <Trash2 className="h-3 w-3 inline mr-1" />
                    Delete
                  </button>
                </div>
              </div>
              <div className="text-xs font-black uppercase text-slate-500">
                Pitches ({v.pitches?.length ?? 0})
              </div>
              <ul className="text-sm font-bold text-slate-700 space-y-1">
                {(v.pitches ?? []).map((p) => (
                  <li key={p.pitchId}>
                    {p.label}{" "}
                    <span className="text-slate-400 font-mono text-xs">({p.surface})</span> ·{" "}
                    <span className="font-mono text-xs">{p.pitchId}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {editingId && editDraft ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="text-xl font-black text-[#06054e]">Edit venue</h3>
            <label className="block text-xs font-black uppercase text-slate-500">
              Name
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 font-bold"
                value={editDraft.name}
                onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))}
              />
            </label>
            <label className="block text-xs font-black uppercase text-slate-500">
              Status
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 font-bold"
                value={editDraft.status}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, status: e.target.value } : d))
                }
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["street", "suburb", "city", "state", "postcode", "country"] as const).map((k) => (
                <label key={k} className="text-xs font-black uppercase text-slate-500">
                  {k}
                  <input
                    className="mt-1 w-full rounded-lg border px-2 py-2 text-sm font-bold"
                    value={(editDraft.address as Record<string, string>)[k] ?? ""}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d
                          ? {
                              ...d,
                              address: { ...d.address, [k]: e.target.value },
                            }
                          : d,
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-black uppercase text-slate-500">Pitches</span>
              <button
                type="button"
                className="text-xs font-black underline text-[#06054e]"
                onClick={() =>
                  setEditDraft((d) =>
                    d
                      ? {
                          ...d,
                          pitches: [
                            ...d.pitches,
                            {
                              pitchId: `pitch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                              label: "New pitch",
                              surface: "turf",
                            },
                          ],
                        }
                      : d,
                  )
                }
              >
                + Pitch
              </button>
            </div>
            {editDraft.pitches.map((p, idx) => (
              <div key={p.pitchId} className="flex flex-wrap gap-2 border border-slate-100 rounded-lg p-2">
                <input
                  className="flex-1 min-w-[120px] rounded border px-2 py-1 text-sm font-bold"
                  value={p.label}
                  onChange={(e) => {
                    const next = [...editDraft.pitches];
                    next[idx] = { ...p, label: e.target.value };
                    setEditDraft({ ...editDraft, pitches: next });
                  }}
                />
                <select
                  className="rounded border px-2 py-1 text-sm font-bold"
                  value={p.surface}
                  onChange={(e) => {
                    const next = [...editDraft.pitches];
                    next[idx] = { ...p, surface: e.target.value as PitchSurface };
                    setEditDraft({ ...editDraft, pitches: next });
                  }}
                >
                  {SURFACES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-xs text-red-600 font-black"
                  onClick={() =>
                    setEditDraft({
                      ...editDraft,
                      pitches: editDraft.pitches.filter((_, i) => i !== idx),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 font-black text-sm"
                onClick={() => {
                  setEditingId(null);
                  setEditDraft(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl px-4 py-2 font-black text-sm text-white flex items-center gap-2"
                style={{ backgroundColor: primaryColor }}
                onClick={() => void saveEdit()}
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-xs font-bold text-slate-500">
        League setup:{" "}
        <Link
          href={`/admin/associations/${encodeURIComponent(associationId)}/competitions`}
          className="underline text-[#06054e]"
        >
          Competitions wizard
        </Link>
      </p>
    </div>
  );
}
