"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Download } from "lucide-react";
import Link from "next/link";

type RateRow = {
  qualificationTier: string;
  matchLevel: string;
  amountCents: number;
  currency: string;
};

type ScheduleState = {
  defaultCurrency: string;
  rates: RateRow[];
};

type SeasonComp = {
  seasonCompetitionId: string;
  competitionId?: string;
  season?: string | number;
  status?: string;
};

type FixtureRow = {
  fixtureId: string;
  round?: number;
  homeTeamId?: string;
  awayTeamId?: string;
};

type PaymentLine = {
  paymentLineId: string;
  fixtureId: string;
  umpireId: string;
  umpireType: string;
  qualificationTier: string;
  matchLevel: string;
  amountCents: number | null;
  currency: string;
  status: string;
  createdAt?: string;
  displayName?: string;
  displaySource?: string;
  linkedMemberId?: string;
};

function formatMoney(cents: number | null, currency: string) {
  if (cents == null) return "—";
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export default function UmpirePaymentsTreasurerPanel({
  associationId,
  associationName,
  primaryColor = "#06054e",
}: {
  associationId: string;
  associationName: string;
  primaryColor?: string;
}) {
  const [schedule, setSchedule] = useState<ScheduleState>({
    defaultCurrency: "AUD",
    rates: [],
  });
  const [seasonComps, setSeasonComps] = useState<SeasonComp[]>([]);
  const [seasonCompetitionId, setSeasonCompetitionId] = useState("");
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [fixtureId, setFixtureId] = useState("");
  const [defaultQualificationTier, setDefaultQualificationTier] =
    useState("community");
  const [includeUnpriced, setIncludeUnpriced] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [lines, setLines] = useState<PaymentLine[]>([]);
  const [lineStatusTab, setLineStatusTab] = useState<
    "pending" | "approved" | "paid" | ""
  >("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amountDraft, setAmountDraft] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const base = `/api/admin/associations/${associationId}`;

  const loadSchedule = useCallback(async () => {
    const res = await fetch(`${base}/umpire-payment-schedule`);
    if (!res.ok) {
      toast.error("Could not load payment schedule");
      return;
    }
    const data = await res.json();
    setSchedule({
      defaultCurrency: data.defaultCurrency ?? "AUD",
      rates: Array.isArray(data.rates) ? data.rates : [],
    });
  }, [base]);

  const loadSeasons = useCallback(async () => {
    const res = await fetch(`${base}/season-competitions`);
    if (!res.ok) {
      toast.error("Could not load season competitions");
      return;
    }
    const data = await res.json();
    const list = data.seasonCompetitions ?? [];
    setSeasonComps(list);
    setSeasonCompetitionId(
      (prev) => prev || list[0]?.seasonCompetitionId || "",
    );
  }, [base]);

  const loadFixtures = useCallback(async () => {
    if (!seasonCompetitionId) {
      setFixtures([]);
      return;
    }
    const res = await fetch(
      `/api/admin/season-competitions/${seasonCompetitionId}/fixtures`,
    );
    if (!res.ok) {
      toast.error("Could not load fixtures");
      setFixtures([]);
      return;
    }
    const data = await res.json();
    setFixtures(data.fixtures ?? []);
    setFixtureId("");
    setPreview(null);
  }, [seasonCompetitionId]);

  const loadLines = useCallback(async () => {
    const q =
      lineStatusTab === ""
        ? ""
        : `?status=${encodeURIComponent(lineStatusTab)}&limit=120`;
    const res = await fetch(`${base}/umpire-payment-lines${q}`);
    if (!res.ok) {
      toast.error("Could not load payment lines");
      return;
    }
    const data = await res.json();
    setLines(data.lines ?? []);
    setSelected(new Set());
    setAmountDraft({});
  }, [base, lineStatusTab]);

  useEffect(() => {
    void loadSchedule();
    void loadSeasons();
  }, [loadSchedule, loadSeasons]);

  useEffect(() => {
    void loadFixtures();
  }, [loadFixtures]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  function updateRate(i: number, field: keyof RateRow, value: string | number) {
    setSchedule((s) => {
      const rates = [...s.rates];
      const row = { ...rates[i], [field]: value };
      rates[i] = row as RateRow;
      return { ...s, rates };
    });
  }

  function addRateRow() {
    setSchedule((s) => ({
      ...s,
      rates: [
        ...s.rates,
        {
          qualificationTier: "",
          matchLevel: "league",
          amountCents: 0,
          currency: s.defaultCurrency,
        },
      ],
    }));
  }

  function removeRateRow(i: number) {
    setSchedule((s) => ({
      ...s,
      rates: s.rates.filter((_, j) => j !== i),
    }));
  }

  function saveSchedule() {
    for (const r of schedule.rates) {
      if (!r.qualificationTier.trim() || !r.matchLevel.trim()) {
        toast.error("Each rate row needs a qualification tier and match level");
        return;
      }
    }
    startTransition(async () => {
      const res = await fetch(`${base}/umpire-payment-schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCurrency: schedule.defaultCurrency,
          rates: schedule.rates.map((r) => ({
            qualificationTier: r.qualificationTier.trim(),
            matchLevel: r.matchLevel.trim(),
            amountCents: Number(r.amountCents),
            currency: (r.currency || schedule.defaultCurrency).trim(),
          })),
        }),
      });
      if (!res.ok) {
        toast.error("Save schedule failed");
        return;
      }
      toast.success("Schedule saved");
      await loadSchedule();
    });
  }

  function runPreview() {
    if (!seasonCompetitionId || !fixtureId) {
      toast.error("Select a season and fixture");
      return;
    }
    startTransition(async () => {
      const q = `?defaultQualificationTier=${encodeURIComponent(defaultQualificationTier)}`;
      const res = await fetch(
        `/api/admin/season-competitions/${seasonCompetitionId}/fixtures/${fixtureId}/umpire-payments/preview${q}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Preview failed");
        return;
      }
      setPreview(await res.json());
    });
  }

  function recordPendingLines() {
    if (!seasonCompetitionId || !fixtureId) {
      toast.error("Select a season and fixture");
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/season-competitions/${seasonCompetitionId}/fixtures/${fixtureId}/umpire-payments/lines`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultQualificationTier,
            includeUnpriced,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not record lines");
        return;
      }
      toast.success(
        `Recorded ${data.created ?? 0} line(s)${
          data.skippedDuplicatePending
            ? ` (${data.skippedDuplicatePending} duplicate pending skipped)`
            : ""
        }`,
      );
      await loadLines();
    });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function patchLines(status: "approved" | "paid") {
    const ids = [...selected];
    if (ids.length === 0) {
      toast.error("Select at least one line");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`${base}/umpire-payment-lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: ids.map((paymentLineId) => ({ paymentLineId, status })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Update failed");
        return;
      }
      const uS = data.updatedStatus?.length ?? 0;
      const uA = data.updatedAmount?.length ?? 0;
      if (data.errors?.length && uS + uA === 0) {
        toast.error(data.errors.join("; "));
      } else {
        if (data.errors?.length) {
          toast.message(`Some rows skipped: ${data.errors.join("; ")}`);
        }
        if (uS + uA > 0) {
          toast.success(`Updated ${uS + uA} line change(s)`);
        }
      }
      await loadLines();
    });
  }

  function downloadPaymentCsv() {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("format", "csv");
      params.set("limit", "5000");
      if (lineStatusTab) params.set("status", lineStatusTab);
      if (seasonCompetitionId)
        params.set("seasonCompetitionId", seasonCompetitionId);
      const res = await fetch(`${base}/umpire-payment-lines?${params}`);
      if (!res.ok) {
        toast.error("CSV export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `umpire-honoraria-${associationId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    });
  }

  function savePendingAmount(ln: PaymentLine) {
    const raw =
      amountDraft[ln.paymentLineId] ??
      (ln.amountCents != null ? (ln.amountCents / 100).toFixed(2) : "");
    const n = Number.parseFloat(raw);
    if (Number.isNaN(n) || n < 0) {
      toast.error("Enter a valid dollar amount");
      return;
    }
    const cents = Math.round(n * 100);
    startTransition(async () => {
      const res = await fetch(`${base}/umpire-payment-lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ paymentLineId: ln.paymentLineId, amountCents: cents }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not update amount");
        return;
      }
      toast.success("Amount saved");
      await loadLines();
    });
  }

  function deletePendingLine(paymentLineId: string) {
    startTransition(async () => {
      const res = await fetch(
        `${base}/umpire-payment-lines?paymentLineId=${encodeURIComponent(paymentLineId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Delete failed");
        return;
      }
      toast.success("Line removed");
      await loadLines();
    });
  }

  const previewLines = useMemo(
    () =>
      (preview?.lines as
        | Array<{
            umpireId: string;
            umpireType?: string;
            qualificationTier: string;
            matchLevel: string;
            amountCents: number | null;
            currency: string;
            missingRate: boolean;
          }>
        | undefined) ?? [],
    [preview],
  );

  return (
    <div className="space-y-8">
      <div
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        style={{ borderTopColor: primaryColor, borderTopWidth: 4 }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#06054e]">
              Umpire honoraria schedule
            </h2>
            <p className="text-sm font-bold text-slate-500">
              {associationName} — rates by qualification tier and match level
              (cents).
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
            disabled={isPending}
            onClick={() => void loadSchedule()}
          >
            <RefreshCw size={16} />
            Reload
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-black uppercase text-slate-500">
            Default currency
            <input
              className="input mt-1 w-24 font-mono"
              value={schedule.defaultCurrency}
              onChange={(e) =>
                setSchedule((s) => ({ ...s, defaultCurrency: e.target.value }))
              }
              maxLength={3}
            />
          </label>
        </div>

        <div className="space-y-2">
          {schedule.rates.length === 0 && (
            <p className="text-sm font-bold text-slate-500">
              No rate rows yet. Add a row for each qualification × match level
              combination.
            </p>
          )}
          {schedule.rates.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
            >
              <input
                className="input col-span-3 font-bold"
                placeholder="Qualification tier"
                value={r.qualificationTier}
                onChange={(e) => updateRate(i, "qualificationTier", e.target.value)}
              />
              <input
                className="input col-span-2 font-bold"
                placeholder="Match level"
                value={r.matchLevel}
                onChange={(e) => updateRate(i, "matchLevel", e.target.value)}
              />
              <input
                type="number"
                className="input col-span-2 font-mono"
                placeholder="Cents"
                value={r.amountCents}
                onChange={(e) =>
                  updateRate(i, "amountCents", Number(e.target.value))
                }
              />
              <input
                className="input col-span-2 font-mono"
                placeholder="CUR"
                value={r.currency}
                onChange={(e) => updateRate(i, "currency", e.target.value)}
              />
              <button
                type="button"
                className="col-span-1 text-red-600"
                onClick={() => removeRateRow(i)}
                aria-label="Remove row"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#06054e] px-4 py-2 text-sm font-black text-[#06054e]"
            onClick={addRateRow}
          >
            <Plus size={18} />
            Add rate row
          </button>
          <button
            type="button"
            className="rounded-xl px-6 py-2 text-sm font-black text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
            disabled={isPending}
            onClick={saveSchedule}
          >
            Save schedule
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-xl font-black text-[#06054e]">
          Preview & record lines
        </h2>
        <p className="mb-4 text-sm font-bold text-slate-500">
          Choose a season competition and fixture, preview calculated amounts,
          then create pending ledger lines.
        </p>

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-black uppercase text-slate-500">
            Season competition
            <select
              className="input mt-1 w-full font-bold"
              value={seasonCompetitionId}
              onChange={(e) => setSeasonCompetitionId(e.target.value)}
            >
              <option value="">Select…</option>
              {seasonComps.map((sc) => (
                <option
                  key={sc.seasonCompetitionId}
                  value={sc.seasonCompetitionId}
                >
                  {String(sc.season ?? "")} · {sc.seasonCompetitionId}
                  {sc.status ? ` (${sc.status})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Fixture
            <select
              className="input mt-1 w-full font-mono text-sm"
              value={fixtureId}
              onChange={(e) => setFixtureId(e.target.value)}
            >
              <option value="">Select…</option>
              {fixtures.map((f) => (
                <option key={f.fixtureId} value={f.fixtureId}>
                  R{f.round ?? "?"} · {f.fixtureId.slice(0, 18)}…
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-black uppercase text-slate-500">
            Default qualification (if slot empty)
            <input
              className="input mt-1 w-full font-bold"
              value={defaultQualificationTier}
              onChange={(e) => setDefaultQualificationTier(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={includeUnpriced}
              onChange={(e) => setIncludeUnpriced(e.target.checked)}
            />
            Include unpriced slots (amount blank)
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border-2 border-slate-300 px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50"
            disabled={isPending}
            onClick={runPreview}
          >
            Run preview
          </button>
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
            disabled={isPending}
            onClick={recordPendingLines}
          >
            Record pending lines
          </button>
        </div>

        {preview && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="table w-full text-sm">
              <thead className="bg-slate-100 font-black uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Umpire</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Tier</th>
                  <th className="px-3 py-2 text-left">Level</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Rate</th>
                </tr>
              </thead>
              <tbody>
                {previewLines.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono">{row.umpireId}</td>
                    <td className="px-3 py-2">{row.umpireType ?? "—"}</td>
                    <td className="px-3 py-2">{row.qualificationTier}</td>
                    <td className="px-3 py-2">{row.matchLevel}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatMoney(row.amountCents, row.currency)}
                    </td>
                    <td className="px-3 py-2">
                      {row.missingRate ? (
                        <span className="font-bold text-amber-700">
                          Missing rate
                        </span>
                      ) : (
                        <span className="text-emerald-700">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#06054e]">Payment lines</h2>
            <p className="text-sm font-bold text-slate-500">
              Pending → approved → paid. Select rows to update in bulk.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
              disabled={isPending}
              onClick={() => void downloadPaymentCsv()}
            >
              <Download size={16} />
              Download CSV
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
              disabled={isPending}
              onClick={() => void loadLines()}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["pending", "Pending"],
              ["approved", "Approved"],
              ["paid", "Paid"],
              ["", "All"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val || "all"}
              type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-black transition-colors ${
                lineStatusTab === val
                  ? "text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              style={
                lineStatusTab === val ? { backgroundColor: primaryColor } : {}
              }
              onClick={() => setLineStatusTab(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {lineStatusTab === "pending" && (
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              disabled={isPending}
              onClick={() => patchLines("approved")}
            >
              Mark selected approved
            </button>
          </div>
        )}
        {lineStatusTab === "approved" && (
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              disabled={isPending}
              onClick={() => patchLines("paid")}
            >
              Mark selected paid
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="table w-full text-sm">
            <thead className="bg-slate-100 font-black uppercase text-slate-600">
              <tr>
                <th className="w-10 px-2 py-2" />
                <th className="px-3 py-2 text-left">Fixture</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Umpire id</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Tier / level</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((ln) => (
                <tr key={ln.paymentLineId} className="border-t border-slate-100">
                  <td className="px-2 py-2 text-center">
                    {(lineStatusTab === "pending" ||
                      lineStatusTab === "approved") && (
                      <input
                        type="checkbox"
                        checked={selected.has(ln.paymentLineId)}
                        onChange={() => toggleSelected(ln.paymentLineId)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    )}
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs">
                    {ln.fixtureId}
                  </td>
                  <td className="max-w-[120px] px-3 py-2 text-xs font-bold text-slate-800">
                    {ln.displayName?.trim() ? (
                      <span title={ln.displaySource ?? ""}>{ln.displayName}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{ln.umpireId}</td>
                  <td className="px-3 py-2">{ln.umpireType}</td>
                  <td className="px-3 py-2 text-xs">
                    {ln.qualificationTier} / {ln.matchLevel}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {ln.status === "pending" ? (
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="input w-28 py-1 text-right font-mono text-xs"
                          value={
                            amountDraft[ln.paymentLineId] ??
                            (ln.amountCents != null
                              ? (ln.amountCents / 100).toFixed(2)
                              : "")
                          }
                          onChange={(e) =>
                            setAmountDraft((d) => ({
                              ...d,
                              [ln.paymentLineId]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="text-xs font-black text-[#06054e] hover:underline"
                          onClick={() => savePendingAmount(ln)}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono">
                        {formatMoney(ln.amountCents, ln.currency)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-bold capitalize">{ln.status}</td>
                  <td className="px-3 py-2">
                    {ln.status === "pending" && (
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => deletePendingLine(ln.paymentLineId)}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lines.length === 0 && (
          <p className="mt-4 text-center text-sm font-bold text-slate-500">
            No lines in this view.
          </p>
        )}

        <p className="mt-6 text-sm font-bold text-slate-600">
          Resolve names via{" "}
          <Link
            href={`/admin/associations/${associationId}/official-register`}
            className="text-[#06054e] underline"
          >
            Official register
          </Link>{" "}
          (or member id match). Coverage:{" "}
          <Link
            href={`/admin/associations/${associationId}/officiating-report`}
            className="text-[#06054e] underline"
          >
            Officiating report
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
