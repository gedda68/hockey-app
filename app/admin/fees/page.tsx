"use client";
// app/admin/fees/page.tsx
// Representative Fee Management — bulk view, record payments, send reminders

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  CreditCard,
  Mail,
  Copy,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Banknote,
  RotateCcw,
  Users,
  TrendingDown,
} from "lucide-react";
import type { EnrichedFeeRecord } from "@/app/api/admin/rep-fees/route";
import ExportButton from "@/components/admin/ExportButton";
import type { ExportColumn } from "@/lib/export";

// ── Types ────────────────────────────────────────────────────────────────────
type FeeStatus = "pending" | "paid" | "overdue" | "waived" | "refunded";
type PaymentMethod = "cash" | "bank_transfer" | "stripe" | "paypal" | "other";

interface Summary {
  total: number;
  outstanding: number;
  collected: number;
  waived: number;
  count: number;
  countOutstanding: number;
}

interface PaymentForm {
  feeId: string;
  playerId: string;
  playerName: string;
  amount: number;
  description: string;
  method: PaymentMethod;
  transactionId: string;
  notes: string;
  paidDate: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear().toString();
const YEARS = [CURRENT_YEAR, String(+CURRENT_YEAR - 1), String(+CURRENT_YEAR - 2)];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmt(n: number) { return `$${n.toFixed(2)}`; }

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: FeeStatus }) {
  const cfg: Record<FeeStatus, { cls: string; label: string }> = {
    pending:  { cls: "bg-amber-100 text-amber-700 border-amber-200",  label: "Pending" },
    overdue:  { cls: "bg-red-100 text-red-700 border-red-200",        label: "Overdue" },
    paid:     { cls: "bg-green-100 text-green-700 border-green-200",  label: "Paid" },
    waived:   { cls: "bg-slate-100 text-slate-600 border-slate-200",  label: "Waived" },
    refunded: { cls: "bg-blue-100 text-blue-700 border-blue-200",     label: "Refunded" },
  };
  const { cls, label } = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${cls}`}>
      {label}
    </span>
  );
}

// ── Payment method label ─────────────────────────────────────────────────────
function MethodLabel({ method }: { method?: string }) {
  if (!method) return <span className="text-slate-400 text-xs">—</span>;
  const m: Record<string, string> = { cash: "Cash", bank_transfer: "Bank Transfer", stripe: "Card", paypal: "PayPal", other: "Other" };
  return <span className="text-xs font-semibold text-slate-600">{m[method] ?? method}</span>;
}

// ── Record Payment modal ─────────────────────────────────────────────────────
function RecordPaymentModal({
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
}: {
  form: PaymentForm;
  saving: boolean;
  onClose: () => void;
  onChange: (f: Partial<PaymentForm>) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 bg-[#06054e] rounded-t-3xl">
          <div className="flex items-center gap-3">
            <Banknote size={18} className="text-yellow-400" />
            <h2 className="font-black uppercase text-white text-sm">Record Payment</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Player + fee info */}
          <div className="bg-slate-50 rounded-2xl px-4 py-3">
            <p className="font-black text-[#06054e] text-sm">{form.playerName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{form.description}</p>
            <p className="text-2xl font-black text-[#06054e] mt-2">{fmt(form.amount)}</p>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {(["cash", "bank_transfer", "stripe", "paypal", "other"] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onChange({ method: m })}
                  className={`py-2 px-3 rounded-xl text-xs font-black uppercase border-2 transition-all ${
                    form.method === m ? "bg-[#06054e] text-white border-[#06054e]" : "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]/40"
                  }`}
                >
                  {m === "bank_transfer" ? "Bank" : m === "stripe" ? "Card" : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">Reference / Transaction ID</label>
            <input
              type="text"
              value={form.transactionId}
              onChange={(e) => onChange({ transactionId: e.target.value })}
              placeholder="Receipt #, BSB ref, etc."
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
            />
          </div>

          {/* Payment date */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">Payment Date</label>
            <input
              type="date"
              value={form.paidDate}
              onChange={(e) => onChange({ paidDate: e.target.value })}
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Any additional notes…"
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs rounded-2xl hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={saving}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-sm rounded-2xl transition-all disabled:opacity-40"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {saving ? "Saving…" : "Record Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reminder modal ───────────────────────────────────────────────────────────
function ReminderModal({
  fees,
  season,
  onClose,
}: {
  fees: EnrichedFeeRecord[];
  season: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  // Group by player to build email list
  const byPlayer = fees.reduce<Record<string, EnrichedFeeRecord[]>>((acc, f) => {
    if (!acc[f.playerId]) acc[f.playerId] = [];
    acc[f.playerId].push(f);
    return acc;
  }, {});

  const emailAddresses = Object.values(byPlayer)
    .map((records) => records[0].playerEmail)
    .filter(Boolean)
    .join(", ");

  const reminderTemplate = `Subject: Outstanding Nomination Fee – ${season} Representative Hockey

Dear Player,

This is a reminder that your nomination fee for the ${season} representative hockey season remains outstanding.

Outstanding fees:
${fees
  .map((f) => `  • ${f.tournamentTitle ?? f.ageGroup ?? "Rep nomination"} — $${f.amount.toFixed(2)} AUD (nominated ${formatDate(f.date)})`)
  .join("\n")}

Total outstanding: $${fees.reduce((s, f) => s + f.amount, 0).toFixed(2)} AUD

Please arrange payment at your earliest convenience. If you have already paid, please disregard this message or contact us with your payment reference.

Thank you,
Representative Hockey Administration`;

  function copyEmails() {
    navigator.clipboard.writeText(emailAddresses).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyTemplate() {
    navigator.clipboard.writeText(reminderTemplate);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 bg-[#06054e] rounded-t-3xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-yellow-400" />
            <h2 className="font-black uppercase text-white text-sm">
              Send Reminder{fees.length !== Object.keys(byPlayer).length && `s`} — {Object.keys(byPlayer).length} player{Object.keys(byPlayer).length !== 1 ? "s" : ""}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Email addresses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase text-slate-500">Email Addresses ({Object.keys(byPlayer).length})</label>
              <button onClick={copyEmails} className="flex items-center gap-1.5 text-xs font-black text-[#06054e] hover:text-[#0a0870] transition-colors">
                {copied ? <CheckCircle size={12} className="text-green-600" /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy All"}
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-600 font-mono break-all max-h-20 overflow-y-auto">
              {emailAddresses || <span className="text-slate-400 italic">No email addresses on file for selected players</span>}
            </div>
            {fees.some((f) => !f.playerEmail) && (
              <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                <AlertCircle size={10} />
                {fees.filter((f) => !f.playerEmail).length} player(s) have no email address on file.
              </p>
            )}
          </div>

          {/* Players summary */}
          <div>
            <p className="text-xs font-black uppercase text-slate-500 mb-2">Included Players</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {Object.entries(byPlayer).map(([pid, records]) => (
                <div key={pid} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-sm font-black text-[#06054e]">{records[0].playerName}</span>
                    {records[0].clubName && <span className="text-xs text-slate-400 ml-2">{records[0].clubName}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-red-600">{fmt(records.reduce((s, r) => s + r.amount, 0))}</span>
                    {records[0].playerEmail
                      ? <p className="text-[10px] text-slate-400">{records[0].playerEmail}</p>
                      : <p className="text-[10px] text-amber-500">No email</p>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Email template */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase text-slate-500">Email Template</label>
              <button onClick={copyTemplate} className="flex items-center gap-1.5 text-xs font-black text-[#06054e] hover:text-[#0a0870] transition-colors">
                <Copy size={12} />
                Copy Template
              </button>
            </div>
            <pre className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto border border-slate-100">
              {reminderTemplate}
            </pre>
          </div>

          <p className="text-[10px] text-slate-400 font-bold text-center">
            Copy the email addresses and template above, then send via your preferred email client.
            Full email integration coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FeesPage() {
  const [season, setSeason] = useState(CURRENT_YEAR);
  const [statusFilter, setStatusFilter] = useState<FeeStatus | "all">("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fees, setFees] = useState<EnrichedFeeRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set()); // feeId::playerId

  // Payment modal
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Reminder modal
  const [showReminder, setShowReminder] = useState(false);

  // Expand/collapse state per row
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchFees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ season });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (ageGroupFilter !== "all") params.set("ageGroup", ageGroupFilter);

      const res = await fetch(`/api/admin/rep-fees?${params}`);
      if (!res.ok) throw new Error("Failed to load fees");
      const data = await res.json();
      setFees(data.fees ?? []);
      setSummary(data.summary ?? null);
      setAgeGroups(data.ageGroups ?? []);
      setSelected(new Set());
    } catch {
      setError("Failed to load fee records.");
    } finally {
      setLoading(false);
    }
  }, [season, statusFilter, ageGroupFilter]);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  // ── Filtered by search ──────────────────────────────────────────────────────
  const filteredFees = search.trim()
    ? fees.filter((f) =>
        f.playerName.toLowerCase().includes(search.toLowerCase()) ||
        (f.clubName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (f.tournamentTitle ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : fees;

  // ── Selection helpers ───────────────────────────────────────────────────────
  const selKey = (f: EnrichedFeeRecord) => `${f.feeId}::${f.playerId}`;
  const allOutstandingKeys = filteredFees
    .filter((f) => f.status === "pending" || f.status === "overdue")
    .map(selKey);
  const allSelected = allOutstandingKeys.length > 0 && allOutstandingKeys.every((k) => selected.has(k));

  function toggleSelect(f: EnrichedFeeRecord) {
    const k = selKey(f);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allOutstandingKeys));
    }
  }

  // ── Update fee via API ──────────────────────────────────────────────────────
  async function patchFee(playerId: string, feeId: string, updates: object) {
    const res = await fetch("/api/admin/rep-fees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, feeId, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update fee");
  }

  // ── Quick actions ───────────────────────────────────────────────────────────
  async function quickMarkOverdue(fee: EnrichedFeeRecord) {
    try {
      await patchFee(fee.playerId, fee.feeId, { status: "overdue" });
      fetchFees();
    } catch { /* swallow */ }
  }

  async function quickWaive(fee: EnrichedFeeRecord) {
    if (!confirm(`Waive $${fee.amount.toFixed(2)} for ${fee.playerName}?`)) return;
    try {
      await patchFee(fee.playerId, fee.feeId, { status: "waived" });
      fetchFees();
    } catch { /* swallow */ }
  }

  async function quickRestore(fee: EnrichedFeeRecord) {
    try {
      await patchFee(fee.playerId, fee.feeId, { status: "pending" });
      fetchFees();
    } catch { /* swallow */ }
  }

  // ── Record payment submit ───────────────────────────────────────────────────
  async function submitPayment() {
    if (!paymentForm) return;
    setSaving(true);
    setSaveError("");
    try {
      await patchFee(paymentForm.playerId, paymentForm.feeId, {
        status: "paid",
        paymentMethod: paymentForm.method,
        transactionId: paymentForm.transactionId || undefined,
        notes: paymentForm.notes || undefined,
        paidDate: paymentForm.paidDate,
      });
      setPaymentForm(null);
      fetchFees();
    } catch {
      setSaveError("Failed to record payment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Bulk mark paid ──────────────────────────────────────────────────────────
  async function bulkMarkPaid() {
    const targets = filteredFees.filter((f) => selected.has(selKey(f)));
    if (targets.length === 0) return;
    if (!confirm(`Mark ${targets.length} fee(s) as paid (Cash)?`)) return;
    const today = new Date().toISOString().split("T")[0];
    await Promise.all(targets.map((f) => patchFee(f.playerId, f.feeId, { status: "paid", paymentMethod: "cash", paidDate: today })));
    fetchFees();
  }

  // ── Selected fees for reminder ─────────────────────────────────────────────
  const reminderFees = showReminder
    ? (selected.size > 0
        ? filteredFees.filter((f) => selected.has(selKey(f)))
        : filteredFees.filter((f) => f.status === "pending" || f.status === "overdue"))
    : [];

  // ── Export ──────────────────────────────────────────────────────────────────
  const FEE_EXPORT_COLUMNS: ExportColumn[] = [
    { header: "Player",       key: "playerName" },
    { header: "Club",         key: "clubName" },
    { header: "Tournament",   key: "tournamentTitle" },
    { header: "Division",     key: "ageGroup" },
    { header: "Description",  key: "description" },
    { header: "Amount",       key: (r) => r.amount != null ? `$${Number(r.amount).toFixed(2)}` : "" },
    { header: "Status",       key: "status" },
    { header: "Due Date",     key: "date" },
    { header: "Paid Date",    key: "paidDate" },
    { header: "Method",       key: "paymentMethod" },
    { header: "Transaction",  key: "transactionId" },
    { header: "Notes",        key: "notes" },
  ];

  const feeExportRows = filteredFees as unknown as Record<string, unknown>[];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#06054e] text-white px-6 pt-10 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <DollarSign size={28} className="text-yellow-400" />
              <h1 className="text-3xl font-black uppercase tracking-tighter">Fee Management</h1>
            </div>
            <ExportButton
              rows={feeExportRows}
              columns={FEE_EXPORT_COLUMNS}
              filename={`fees-${season}`}
              pdfTitle="Fee Management"
              pdfSubtitle={`${season} Season${statusFilter !== "all" ? ` — ${statusFilter}` : ""}`}
              pdfOrientation="landscape"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            />
          </div>
          <p className="text-white/60 font-bold text-sm">Representative nomination fees — track payments and send reminders</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-12 pb-16 space-y-6">

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm p-5 flex flex-wrap gap-4 items-center">
          {/* Season */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-black uppercase text-slate-400">Season</label>
            <select
              value={season}
              onChange={(e) => { setSeason(e.target.value); setAgeGroupFilter("all"); }}
              className="px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-[#06054e] focus:border-[#06054e] focus:outline-none"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Age group */}
          {ageGroups.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-black uppercase text-slate-400">Division</label>
              <select
                value={ageGroupFilter}
                onChange={(e) => setAgeGroupFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-[#06054e] focus:border-[#06054e] focus:outline-none"
              >
                <option value="all">All Divisions</option>
                {ageGroups.map((g) => <option key={g} value={g!}>{g}</option>)}
              </select>
            </div>
          )}

          {/* Status chips */}
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "pending", "overdue", "paid", "waived", "refunded"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                  statusFilter === s ? "bg-[#06054e] text-white" : "bg-slate-100 text-slate-500 hover:text-[#06054e]"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player or club…"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
            />
          </div>
        </div>

        {/* ── Summary stats ────────────────────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-[#06054e]">
              <p className="text-2xl font-black text-[#06054e]">{fmt(summary.total)}</p>
              <p className="text-xs font-black uppercase text-slate-400 mt-1">Total Billed</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{summary.count} record{summary.count !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-red-400">
              <p className="text-2xl font-black text-red-600">{fmt(summary.outstanding)}</p>
              <p className="text-xs font-black uppercase text-slate-400 mt-1">Outstanding</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{summary.countOutstanding} unpaid</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-green-400">
              <p className="text-2xl font-black text-green-600">{fmt(summary.collected)}</p>
              <p className="text-xs font-black uppercase text-slate-400 mt-1">Collected</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-slate-300">
              <p className="text-2xl font-black text-slate-500">{fmt(summary.waived)}</p>
              <p className="text-xs font-black uppercase text-slate-400 mt-1">Waived</p>
            </div>
          </div>
        )}

        {/* ── Bulk action bar (shows when items selected) ───────────────── */}
        {selected.size > 0 && (
          <div className="bg-[#06054e] rounded-2xl px-5 py-3 flex items-center gap-4 flex-wrap shadow-lg">
            <span className="text-white font-black text-sm">
              {selected.size} selected
            </span>
            <div className="flex gap-2 flex-wrap ml-auto">
              <button
                onClick={bulkMarkPaid}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-xl text-xs font-black uppercase transition-all"
              >
                <CheckCircle size={13} />
                Mark Paid (Cash)
              </button>
              <button
                onClick={() => setShowReminder(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-[#06054e] rounded-xl text-xs font-black uppercase transition-all"
              >
                <Mail size={13} />
                Send Reminders
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase transition-all"
              >
                <X size={13} />
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Fee table ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="font-bold">Loading fees…</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-8 text-red-600">
              <AlertCircle size={20} />
              <span className="font-semibold">{error}</span>
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="text-center py-24">
              <DollarSign size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="font-black text-slate-400 uppercase">No fee records found</p>
              <p className="text-slate-400 text-sm mt-2">
                {statusFilter !== "all" ? `No ${statusFilter} fees for ${season}.` : `No nomination fees recorded for ${season}.`}
              </p>
              {statusFilter !== "all" && (
                <button onClick={() => setStatusFilter("all")} className="mt-4 text-xs font-black text-[#06054e] underline">
                  Show all statuses
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#06054e] text-white text-[10px] uppercase font-black">
                    <th className="px-4 py-3 rounded-tl-3xl w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded"
                        title="Select all outstanding"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-left">Division</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Paid Date</th>
                    <th className="px-4 py-3 text-center rounded-tr-3xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map((fee, idx) => {
                    const key = selKey(fee);
                    const isSelected = selected.has(key);
                    const isOutstanding = fee.status === "pending" || fee.status === "overdue";
                    const rowKey = `${fee.feeId}-${fee.playerId}`;
                    const isExpanded = expandedRows.has(rowKey);

                    return (
                      <>
                        <tr
                          key={rowKey}
                          className={`border-b border-slate-50 transition-colors ${
                            isSelected ? "bg-blue-50" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                          } hover:bg-blue-50/40`}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3 text-center">
                            {isOutstanding ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(fee)}
                                className="rounded"
                              />
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>

                          {/* Player */}
                          <td className="px-4 py-3">
                            <p className="font-black text-[#06054e] leading-tight">{fee.playerName}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{fee.clubName ?? "—"}</p>
                            {fee.playerEmail && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{fee.playerEmail}</p>
                            )}
                          </td>

                          {/* Division */}
                          <td className="px-4 py-3">
                            {fee.ageGroup && (
                              <span className="px-2 py-0.5 bg-[#06054e]/10 text-[#06054e] rounded-lg text-[10px] font-black uppercase">
                                {fee.ageGroup}
                              </span>
                            )}
                            {fee.tournamentTitle && (
                              <p className="text-[10px] text-slate-500 mt-0.5 max-w-[140px] truncate">{fee.tournamentTitle}</p>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(fee.date)}</td>

                          {/* Amount */}
                          <td className="px-4 py-3 text-right font-black text-[#06054e] whitespace-nowrap">
                            {fmt(fee.amount)}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={fee.status} />
                          </td>

                          {/* Method */}
                          <td className="px-4 py-3">
                            <MethodLabel method={fee.paymentMethod} />
                          </td>

                          {/* Paid date */}
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {fee.paidDate ? formatDate(fee.paidDate) : "—"}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {isOutstanding && (
                                <>
                                  <button
                                    onClick={() => setPaymentForm({
                                      feeId: fee.feeId,
                                      playerId: fee.playerId,
                                      playerName: fee.playerName,
                                      amount: fee.amount,
                                      description: fee.description,
                                      method: "cash",
                                      transactionId: "",
                                      notes: "",
                                      paidDate: new Date().toISOString().split("T")[0],
                                    })}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-black uppercase transition-all"
                                    title="Record payment"
                                  >
                                    <CreditCard size={10} />
                                    Pay
                                  </button>
                                  {fee.status === "pending" && (
                                    <button
                                      onClick={() => quickMarkOverdue(fee)}
                                      className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[10px] font-black uppercase transition-all"
                                      title="Mark overdue"
                                    >
                                      Overdue
                                    </button>
                                  )}
                                  <button
                                    onClick={() => quickWaive(fee)}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase transition-all"
                                    title="Waive fee"
                                  >
                                    Waive
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelected(new Set([key]));
                                      setShowReminder(true);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-[#06054e] transition-colors"
                                    title="Send reminder"
                                  >
                                    <Mail size={13} />
                                  </button>
                                </>
                              )}
                              {(fee.status === "paid" || fee.status === "waived" || fee.status === "refunded") && (
                                <button
                                  onClick={() => quickRestore(fee)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase transition-all"
                                  title="Restore to pending"
                                >
                                  <RotateCcw size={10} />
                                  Restore
                                </button>
                              )}
                              {/* Toggle notes/details */}
                              {(fee.notes || fee.transactionId) && (
                                <button
                                  onClick={() => setExpandedRows((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(rowKey)) next.delete(rowKey);
                                    else next.add(rowKey);
                                    return next;
                                  })}
                                  className="p-1.5 text-slate-400 hover:text-[#06054e] transition-colors"
                                >
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded notes row */}
                        {isExpanded && (
                          <tr key={`${rowKey}-expanded`} className="bg-slate-50 border-b border-slate-100">
                            <td />
                            <td colSpan={8} className="px-4 py-3">
                              <div className="flex gap-6 text-xs text-slate-600">
                                {fee.transactionId && (
                                  <div>
                                    <span className="font-black uppercase text-slate-400 text-[10px]">Reference</span>
                                    <p className="font-mono mt-0.5">{fee.transactionId}</p>
                                  </div>
                                )}
                                {fee.notes && (
                                  <div>
                                    <span className="font-black uppercase text-slate-400 text-[10px]">Notes</span>
                                    <p className="mt-0.5">{fee.notes}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer totals */}
              <div className="border-t-2 border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50">
                <p className="text-xs font-bold text-slate-500">
                  Showing {filteredFees.length} record{filteredFees.length !== 1 ? "s" : ""}
                  {search && ` matching "${search}"`}
                </p>
                <div className="flex gap-6 text-xs font-black">
                  <span className="text-red-600">
                    Outstanding: {fmt(filteredFees.filter((f) => f.status === "pending" || f.status === "overdue").reduce((s, f) => s + f.amount, 0))}
                  </span>
                  <span className="text-green-700">
                    Collected: {fmt(filteredFees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0))}
                  </span>
                  <span className="text-slate-600">
                    Total: {fmt(filteredFees.reduce((s, f) => s + f.amount, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reminder shortcut when nothing selected */}
        {!loading && filteredFees.some((f) => f.status === "pending" || f.status === "overdue") && selected.size === 0 && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowReminder(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#06054e] hover:bg-[#0a0870] text-white rounded-2xl text-xs font-black uppercase transition-all shadow-md"
            >
              <Mail size={14} />
              Send Reminders to All Outstanding ({filteredFees.filter((f) => f.status === "pending" || f.status === "overdue").length})
            </button>
          </div>
        )}
      </div>

      {/* ── Record Payment modal ──────────────────────────────────────────── */}
      {paymentForm && (
        <RecordPaymentModal
          form={paymentForm}
          saving={saving}
          onClose={() => { setPaymentForm(null); setSaveError(""); }}
          onChange={(updates) => setPaymentForm((prev) => prev ? { ...prev, ...updates } : prev)}
          onSubmit={submitPayment}
        />
      )}

      {/* ── Reminder modal ────────────────────────────────────────────────── */}
      {showReminder && (
        <ReminderModal
          fees={reminderFees}
          season={season}
          onClose={() => setShowReminder(false)}
        />
      )}
    </div>
  );
}
