"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import Link from "next/link";

type OfficialRow = {
  officialRecordId: string;
  displayName: string;
  memberId?: string | null;
  umpireNumber?: string | null;
  primaryClubId?: string | null;
  homeRegion?: string | null;
  nationalRegisterId?: string | null;
  allocationAvailability?: "available" | "limited" | "unavailable";
  availabilityNote?: string | null;
  unavailableUntil?: string | null;
  qualificationCodes?: string[];
  levelLabel?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
};

export default function OfficialRegisterClient({
  associationId,
  primaryColor = "#06054e",
}: {
  associationId: string;
  primaryColor?: string;
}) {
  const [rows, setRows] = useState<OfficialRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const base = `/api/admin/associations/${associationId}/official-register`;

  const [form, setForm] = useState({
    displayName: "",
    memberId: "",
    umpireNumber: "",
    primaryClubId: "",
    homeRegion: "",
    nationalRegisterId: "",
    allocationAvailability: "available" as OfficialRow["allocationAvailability"],
    availabilityNote: "",
    unavailableUntil: "",
    qualificationCodes: "",
    levelLabel: "",
    expiresAt: "",
  });
  const [importJson, setImportJson] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(base);
    if (!res.ok) {
      toast.error("Could not load official register");
      return;
    }
    const data = await res.json();
    setRows(data.officials ?? []);
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  function addOfficial() {
    if (!form.displayName.trim()) {
      toast.error("Display name required");
      return;
    }
    if (!form.memberId.trim() && !form.umpireNumber.trim()) {
      toast.error("Enter member id and/or umpire number (must match fixture umpireId)");
      return;
    }
    startTransition(async () => {
      const codes = form.qualificationCodes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          memberId: form.memberId.trim() || null,
          umpireNumber: form.umpireNumber.trim() || null,
          primaryClubId: form.primaryClubId.trim() || null,
          homeRegion: form.homeRegion.trim() || null,
          nationalRegisterId: form.nationalRegisterId.trim() || null,
          allocationAvailability: form.allocationAvailability ?? "available",
          availabilityNote: form.availabilityNote.trim() || null,
          unavailableUntil: form.unavailableUntil.trim()
            ? `${form.unavailableUntil.trim()}T23:59:59.999Z`
            : null,
          qualificationCodes: codes,
          levelLabel: form.levelLabel.trim() || null,
          expiresAt: form.expiresAt.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Create failed");
        return;
      }
      toast.success("Official added");
      setForm({
        displayName: "",
        memberId: "",
        umpireNumber: "",
        primaryClubId: "",
        homeRegion: "",
        nationalRegisterId: "",
        allocationAvailability: "available",
        availabilityNote: "",
        unavailableUntil: "",
        qualificationCodes: "",
        levelLabel: "",
        expiresAt: "",
      });
      await load();
    });
  }

  function patchRow(
    officialRecordId: string,
    patch: Partial<{
      displayName: string;
      memberId: string | null;
      umpireNumber: string | null;
      primaryClubId: string | null;
      allocationAvailability: OfficialRow["allocationAvailability"];
      availabilityNote: string | null;
      unavailableUntil: string | null;
      qualificationCodes: string[];
      levelLabel: string | null;
      expiresAt: string | null;
      isActive: boolean;
      homeRegion: string | null;
      nationalRegisterId: string | null;
    }>,
  ) {
    startTransition(async () => {
      const res = await fetch(`${base}/${officialRecordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Update failed");
        return;
      }
      toast.success("Saved");
      await load();
    });
  }

  function runBulkImport() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(importJson) as unknown;
    } catch {
      toast.error("Invalid JSON");
      return;
    }
    const records =
      parsed &&
      typeof parsed === "object" &&
      parsed !== null &&
      "records" in parsed &&
      Array.isArray((parsed as { records: unknown }).records)
        ? (parsed as { records: unknown[] }).records
        : Array.isArray(parsed)
          ? parsed
          : null;
    if (!records || records.length === 0) {
      toast.error('Provide an array of records or { "records": [...] }');
      return;
    }
    startTransition(async () => {
      const res = await fetch(`${base}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }
      const errN = Array.isArray(data.errors) ? data.errors.length : 0;
      toast.success(
        `Imported ${data.created ?? 0} official(s)${errN ? `, ${errN} row error(s)` : ""}`,
      );
      setImportJson("");
      await load();
    });
  }

  function removeRow(officialRecordId: string) {
    if (!confirm("Remove this official from the register?")) return;
    startTransition(async () => {
      const res = await fetch(`${base}/${officialRecordId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Delete failed");
        return;
      }
      toast.success("Removed");
      await load();
    });
  }

  return (
    <div className="space-y-8">
      <p className="text-sm font-bold text-slate-600">
        Map <strong>fixture umpireId</strong> values to display names for honoraria and
        reports. Match either a <strong>member id</strong> or the <strong>umpire number</strong>{" "}
        string used on fixtures. <strong>Primary club</strong> and <strong>member id</strong> drive
        conflict-of-interest checks when assigning umpires to fixtures;{" "}
        <strong>unavailable</strong> blocks new assignments unless the fixture records an override
        with a documented reason.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black text-[#06054e]">Add official</h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
            disabled={isPending}
            onClick={() => void load()}
          >
            <RefreshCw size={16} />
            Reload
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-black uppercase text-slate-500">
            Display name *
            <input
              className="input mt-1 w-full font-bold"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Member id (optional)
            <input
              className="input mt-1 w-full font-mono text-sm"
              value={form.memberId}
              onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
              placeholder="e.g. CHC-0000001"
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Umpire number (optional)
            <input
              className="input mt-1 w-full font-mono text-sm"
              value={form.umpireNumber}
              onChange={(e) => setForm((f) => ({ ...f, umpireNumber: e.target.value }))}
              placeholder="e.g. 0000001"
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Primary club id (COI)
            <input
              className="input mt-1 w-full font-mono text-sm"
              value={form.primaryClubId}
              onChange={(e) => setForm((f) => ({ ...f, primaryClubId: e.target.value }))}
              placeholder="club-… (optional if member club is enough)"
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Home region (reporting)
            <input
              className="input mt-1 w-full text-sm"
              value={form.homeRegion}
              onChange={(e) => setForm((f) => ({ ...f, homeRegion: e.target.value }))}
              placeholder='e.g. "QLD — Brisbane"'
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            National register id
            <input
              className="input mt-1 w-full font-mono text-sm"
              value={form.nationalRegisterId}
              onChange={(e) =>
                setForm((f) => ({ ...f, nationalRegisterId: e.target.value }))
              }
              placeholder="External accreditation ref (optional)"
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Allocation availability
            <select
              className="select select-bordered mt-1 w-full text-sm font-bold"
              value={form.allocationAvailability ?? "available"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  allocationAvailability: e.target.value as OfficialRow["allocationAvailability"],
                }))
              }
            >
              <option value="available">Available</option>
              <option value="limited">Limited (warning only)</option>
              <option value="unavailable">Unavailable (blocks assignments)</option>
            </select>
          </label>
          <label className="text-xs font-black uppercase text-slate-500 md:col-span-2">
            Availability note
            <input
              className="input mt-1 w-full text-sm"
              value={form.availabilityNote}
              onChange={(e) => setForm((f) => ({ ...f, availabilityNote: e.target.value }))}
              placeholder="Optional context for coordinators"
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Unavailable until (ISO date)
            <input
              className="input mt-1 w-full font-mono text-sm"
              type="date"
              value={form.unavailableUntil}
              onChange={(e) => setForm((f) => ({ ...f, unavailableUntil: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Qualification codes (comma-separated)
            <input
              className="input mt-1 w-full"
              value={form.qualificationCodes}
              onChange={(e) =>
                setForm((f) => ({ ...f, qualificationCodes: e.target.value }))
              }
              placeholder="level_2, state"
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Level label
            <input
              className="input mt-1 w-full"
              value={form.levelLabel}
              onChange={(e) => setForm((f) => ({ ...f, levelLabel: e.target.value }))}
            />
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Expiry (ISO date)
            <input
              className="input mt-1 w-full font-mono text-sm"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            />
          </label>
        </div>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-black text-white disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
          disabled={isPending}
          onClick={addOfficial}
        >
          <Plus size={18} />
          Add to register
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-black text-[#06054e]">Bulk import (JSON)</h2>
        <p className="mb-3 text-xs font-bold text-slate-600">
          Paste <code className="rounded bg-slate-100 px-1">{`{ "records": [ { "displayName", "memberId" | "umpireNumber", ... } ] }`}</code>{" "}
          (1–100 rows). Same fields as a single POST body per record.
        </p>
        <textarea
          className="textarea textarea-bordered min-h-[140px] w-full font-mono text-xs"
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          placeholder='{ "records": [ { "displayName": "...", "umpireNumber": "001" } ] }'
        />
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-black disabled:opacity-50"
          disabled={isPending}
          onClick={runBulkImport}
        >
          Import
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="table w-full text-sm">
          <thead className="bg-slate-100 font-black uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Member id</th>
              <th className="px-3 py-2 text-left">Umpire #</th>
              <th className="px-3 py-2 text-left">Club (COI)</th>
              <th className="px-3 py-2 text-left min-w-[100px]">Region</th>
              <th className="px-3 py-2 text-left min-w-[100px]">Nat. reg.</th>
              <th className="px-3 py-2 text-left">Avail.</th>
              <th className="px-3 py-2 text-left">Until</th>
              <th className="px-3 py-2 text-left min-w-[120px]">Note</th>
              <th className="px-3 py-2 text-left">Qualifications</th>
              <th className="px-3 py-2 text-left">Level</th>
              <th className="px-3 py-2 text-left">Expires</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.officialRecordId} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[140px] font-bold"
                    defaultValue={r.displayName}
                    key={r.displayName + r.officialRecordId}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== r.displayName)
                        patchRow(r.officialRecordId, { displayName: v });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[100px] font-mono text-xs"
                    defaultValue={r.memberId ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (r.memberId ?? null))
                        patchRow(r.officialRecordId, { memberId: v });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[80px] font-mono text-xs"
                    defaultValue={r.umpireNumber ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (r.umpireNumber ?? null))
                        patchRow(r.officialRecordId, { umpireNumber: v });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[90px] font-mono text-xs"
                    defaultValue={r.primaryClubId ?? ""}
                    key={`${r.officialRecordId}-club-${r.primaryClubId ?? ""}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (r.primaryClubId ?? null))
                        patchRow(r.officialRecordId, { primaryClubId: v });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[90px] text-xs"
                    defaultValue={r.homeRegion ?? ""}
                    key={`${r.officialRecordId}-region-${r.homeRegion ?? ""}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (r.homeRegion ?? null))
                        patchRow(r.officialRecordId, { homeRegion: v });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[80px] font-mono text-xs"
                    defaultValue={r.nationalRegisterId ?? ""}
                    key={`${r.officialRecordId}-nat-${r.nationalRegisterId ?? ""}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (r.nationalRegisterId ?? null))
                        patchRow(r.officialRecordId, { nationalRegisterId: v });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="select select-bordered select-sm w-full max-w-[140px] text-xs font-bold"
                    defaultValue={r.allocationAvailability ?? "available"}
                    key={`${r.officialRecordId}-avail-${r.allocationAvailability ?? "available"}`}
                    onChange={(e) =>
                      patchRow(r.officialRecordId, {
                        allocationAvailability: e.target
                          .value as OfficialRow["allocationAvailability"],
                      })
                    }
                  >
                    <option value="available">Available</option>
                    <option value="limited">Limited</option>
                    <option value="unavailable">Off</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[100px] font-mono text-xs"
                    type="date"
                    defaultValue={
                      r.unavailableUntil
                        ? String(r.unavailableUntil).slice(0, 10)
                        : ""
                    }
                    key={`${r.officialRecordId}-until-${r.unavailableUntil ?? ""}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      const prev = r.unavailableUntil
                        ? String(r.unavailableUntil).slice(0, 10)
                        : "";
                      if (v !== prev) {
                        patchRow(r.officialRecordId, {
                          unavailableUntil: v ? `${v}T23:59:59.999Z` : null,
                        });
                      }
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[100px] text-xs"
                    defaultValue={r.availabilityNote ?? ""}
                    key={`${r.officialRecordId}-note-${r.availabilityNote ?? ""}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (r.availabilityNote ?? null))
                        patchRow(r.officialRecordId, { availabilityNote: v });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[120px] text-xs"
                    defaultValue={(r.qualificationCodes ?? []).join(", ")}
                    onBlur={(e) => {
                      const codes = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const prev = (r.qualificationCodes ?? []).join(", ");
                      if (codes.join(",") !== prev)
                        patchRow(r.officialRecordId, { qualificationCodes: codes });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[80px] text-xs"
                    defaultValue={r.levelLabel ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (r.levelLabel ?? null))
                        patchRow(r.officialRecordId, { levelLabel: v });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="input w-full py-1.5 text-sm min-w-[100px] font-mono text-xs"
                    type="date"
                    defaultValue={
                      r.expiresAt
                        ? String(r.expiresAt).slice(0, 10)
                        : ""
                    }
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      const prev = r.expiresAt
                        ? String(r.expiresAt).slice(0, 10)
                        : "";
                      if (v !== prev)
                        patchRow(r.officialRecordId, {
                          expiresAt: v ? `${v}T00:00:00.000Z` : null,
                        });
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    defaultChecked={r.isActive !== false}
                    onChange={(e) =>
                      patchRow(r.officialRecordId, { isActive: e.target.checked })
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => removeRow(r.officialRecordId)}
                    aria-label="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="text-center text-sm font-bold text-slate-500">
          No officials yet. Add at least one row so treasurer views can resolve names.
        </p>
      )}

      <p className="text-sm font-bold text-slate-500">
        <Link href={`/admin/associations/${associationId}/umpire-payments`} className="text-[#06054e] underline">
          ← Back to umpire honoraria
        </Link>
      </p>
    </div>
  );
}
