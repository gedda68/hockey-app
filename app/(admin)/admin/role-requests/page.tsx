// app/admin/role-requests/page.tsx
// Role assignment approval queue — visible to club-admin, registrar,
// association-admin, assoc-registrar, and super-admin.
// Scope is enforced server-side; this page shows only what the caller can act on.

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, CreditCard, Clock, ChevronDown,
  AlertCircle, User, Calendar, Shield, RefreshCw, Search,
  ClipboardList, AlertTriangle,
} from "lucide-react";
import type { RoleRequest, RoleRequestStatus } from "@/types/roleRequests";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import ExportButton from "@/components/admin/ExportButton";
import type { ExportColumn } from "@/lib/export";

// ── Status config ───────────────────────────────────────────────────────────���─

const STATUS_CONFIG: Record<
  RoleRequestStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  pending_payment:   { label: "Pending Payment",   color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200", icon: <CreditCard   size={13} /> },
  awaiting_approval: { label: "Awaiting Approval", color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",   icon: <Clock        size={13} /> },
  approved:          { label: "Approved",           color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200",  icon: <CheckCircle  size={13} /> },
  rejected:          { label: "Rejected",           color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200",    icon: <XCircle      size={13} /> },
  withdrawn:         { label: "Withdrawn",          color: "text-slate-600",  bg: "bg-slate-50",   border: "border-slate-200",  icon: <ChevronDown  size={13} /> },
};

const TABS: { key: RoleRequestStatus | "all"; label: string }[] = [
  { key: "all",               label: "All"              },
  { key: "pending_payment",   label: "Pending Payment"  },
  { key: "awaiting_approval", label: "Awaiting Approval"},
  { key: "approved",          label: "Approved"         },
  { key: "rejected",          label: "Rejected"         },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function RoleBadge({ role }: { role: string }) {
  const def = ROLE_DEFINITIONS[role as keyof typeof ROLE_DEFINITIONS];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black uppercase bg-gradient-to-r ${def?.color ?? "from-slate-400 to-slate-600"} text-white`}>
      {def?.icon} {def?.label ?? role}
    </span>
  );
}

function StatusBadge({ status }: { status: RoleRequestStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <h2 className="font-black text-[#06054e] text-lg uppercase">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Approve modal ──────────────────────────────────────────────────────────��──

function ApproveModal({
  req,
  onClose,
  onDone,
}: {
  req: RoleRequest;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reviewNotes, setReviewNotes]     = useState("");
  const [waiveFee, setWaiveFee]           = useState(false);
  const [waiverReason, setWaiverReason]   = useState("");
  const [loading, setLoading]             = useState(false);

  const needsFeeAction = req.requiresFee && !req.feePaid;

  async function submit() {
    if (needsFeeAction && waiveFee && waiverReason.trim().length < 10) {
      toast.error("Waiver reason must be at least 10 characters");
      return;
    }
    if (needsFeeAction && !waiveFee) {
      toast.error("Fee must be paid or waived before approving");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/role-requests/${req.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          reviewNotes: reviewNotes.trim() || undefined,
          waiveFee: waiveFee || undefined,
          waiverReason: waiverReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Role approved for ${req.memberName}`);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Approve Role Request" onClose={onClose}>
      <div className="space-y-4">
        {/* Summary */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 text-sm">
          <p><span className="font-black text-slate-500 uppercase text-xs">Member</span><br /><span className="font-bold text-slate-800">{req.memberName}</span></p>
          <p><span className="font-black text-slate-500 uppercase text-xs">Role</span><br /><RoleBadge role={req.requestedRole} /></p>
          <p><span className="font-black text-slate-500 uppercase text-xs">Scope</span><br /><span className="font-semibold text-slate-700">{req.scopeName ?? req.scopeId ?? req.scopeType}</span></p>
          {req.seasonYear && <p><span className="font-black text-slate-500 uppercase text-xs">Season</span><br /><span className="font-semibold text-slate-700">{req.seasonYear}</span></p>}
        </div>

        {/* Fee warning */}
        {needsFeeAction && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
            <p className="text-sm font-bold text-orange-800 flex items-center gap-2">
              <AlertTriangle size={15} /> Fee of {req.feeAmountCents ? `$${(req.feeAmountCents / 100).toFixed(2)}` : "an amount"} has not been paid.
            </p>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={waiveFee} onChange={e => setWaiveFee(e.target.checked)} className="rounded" />
              <span className="text-sm font-black text-orange-800">Waive this fee</span>
            </label>
          </div>
        )}

        {/* Waiver reason — required when waiving */}
        {needsFeeAction && waiveFee && (
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
              Waiver Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={waiverReason}
              onChange={e => setWaiverReason(e.target.value)}
              rows={3}
              placeholder="e.g. Life member — board resolution 2025-03-01; or Financial hardship approved by committee"
              className="w-full px-3 py-2.5 border-2 border-orange-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-500 placeholder:text-slate-400 resize-none"
            />
            <p className="text-xs text-orange-700 font-semibold mt-1">
              This reason is stored permanently as an audit record alongside your name, role, and the timestamp.
            </p>
          </div>
        )}

        {/* Optional review notes */}
        <div>
          <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Notes (optional)</label>
          <textarea
            value={reviewNotes}
            onChange={e => setReviewNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes for this approval…"
            className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#06054e] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={loading || (needsFeeAction && waiveFee && waiverReason.trim().length < 10)} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-black hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle size={15} />}
            Approve
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({ req, onClose, onDone }: { req: RoleRequest; onClose: () => void; onDone: () => void }) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (reviewNotes.trim().length < 5) { toast.error("Please provide a reason (min 5 characters)"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/role-requests/${req.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reviewNotes: reviewNotes.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Request rejected");
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Reject Role Request" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 font-semibold flex items-start gap-2">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          Rejecting will notify {req.memberName}. A reason is required.
        </div>
        <div>
          <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
            Reason for rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reviewNotes}
            onChange={e => setReviewNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Missing qualification, duplicate registration, incorrect season year…"
            className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-red-400 resize-none"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={loading || reviewNotes.trim().length < 5} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-black hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <XCircle size={15} />}
            Reject
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Payment modal ─────────────────────────────────────────────────────────────

function PaymentModal({ req, onClose, onDone }: { req: RoleRequest; onClose: () => void; onDone: () => void }) {
  const [paymentId, setPaymentId]     = useState("");
  const [amountCents, setAmountCents] = useState(req.feeAmountCents ? String(req.feeAmountCents / 100) : "");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading]         = useState(false);

  async function submit() {
    if (!paymentId.trim()) { toast.error("Payment reference is required"); return; }
    if (!amountCents || isNaN(Number(amountCents))) { toast.error("Valid amount required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/role-requests/${req.requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_payment",
          paymentId: paymentId.trim(),
          amountCents: Math.round(Number(amountCents) * 100),
          paymentDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("Payment recorded — request is now awaiting approval");
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Record Fee Payment" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Payment Reference / Receipt No. <span className="text-red-500">*</span></label>
            <input value={paymentId} onChange={e => setPaymentId(e.target.value)} placeholder="e.g. STRIPE-abc123 or RCPT-001" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#06054e]" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Amount ($) <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" min="0" value={amountCents} onChange={e => setAmountCents(e.target.value)} placeholder="0.00" className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#06054e]" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Date Paid <span className="text-red-500">*</span></label>
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#06054e]" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={loading} className="flex-1 py-2.5 bg-[#06054e] text-white rounded-xl text-sm font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <CreditCard size={15} />}
            Record Payment
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Request card ───────────────────────────────���──────────────────────────────

function RequestCard({
  req,
  onRefresh,
}: {
  req: RoleRequest;
  onRefresh: () => void;
}) {
  const [modal, setModal] = useState<"approve" | "reject" | "payment" | null>(null);
  const isActionable = req.status === "awaiting_approval" || req.status === "pending_payment";

  function done() { setModal(null); onRefresh(); }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-black text-[#06054e] text-base truncate">{req.memberName}</span>
              <StatusBadge status={req.status} />
            </div>
            <RoleBadge role={req.requestedRole} />
          </div>
          {req.requiresFee && (
            <div className={`flex-shrink-0 text-xs font-black px-2 py-1 rounded-lg ${req.feePaid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              {req.feePaid ? "Fee paid" : "Fee unpaid"}
            </div>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Shield size={11} />
            <span className="font-semibold truncate">{req.scopeName ?? req.scopeId ?? req.scopeType}</span>
          </div>
          {req.seasonYear && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Calendar size={11} />
              <span className="font-semibold">Season {req.seasonYear}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-slate-500">
            <User size={11} />
            <span className="font-semibold truncate">Req. by {req.requestedByName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar size={11} />
            <span className="font-semibold">{fmtDate(req.requestedAt)}</span>
          </div>
        </div>

        {req.notes && (
          <p className="text-xs text-slate-500 italic mb-3 border-l-2 border-slate-200 pl-2">{req.notes}</p>
        )}

        {/* Reviewer notes (approved/rejected) */}
        {req.reviewNotes && (
          <div className={`text-xs p-2 rounded-lg mb-3 ${req.status === "rejected" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            <span className="font-black">Reviewer: </span>{req.reviewNotes}
          </div>
        )}

        {/* Fee waiver audit */}
        {req.feeWaiver && (
          <div className="text-xs p-2 bg-amber-50 border border-amber-200 rounded-lg mb-3">
            <p className="font-black text-amber-800 mb-0.5">Fee Waived</p>
            <p className="text-amber-700"><span className="font-bold">By:</span> {req.feeWaiver.grantedByName} ({req.feeWaiver.grantedByRole} @ {req.feeWaiver.grantedByScope})</p>
            <p className="text-amber-700"><span className="font-bold">Reason:</span> {req.feeWaiver.reason}</p>
            <p className="text-amber-600 mt-0.5">{fmtDate(req.feeWaiver.grantedAt)}</p>
          </div>
        )}

        {/* Actions */}
        {isActionable && (
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            {req.status === "pending_payment" && (
              <button
                onClick={() => setModal("payment")}
                className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-xs font-black hover:bg-orange-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <CreditCard size={13} /> Record Payment
              </button>
            )}
            {req.status === "awaiting_approval" && (
              <button
                onClick={() => setModal("approve")}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={13} /> Approve
              </button>
            )}
            {/* Approve with fee waiver available even on pending_payment */}
            {req.status === "pending_payment" && (
              <button
                onClick={() => setModal("approve")}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={13} /> Approve + Waive
              </button>
            )}
            <button
              onClick={() => setModal("reject")}
              className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-black hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5"
            >
              <XCircle size={13} /> Reject
            </button>
          </div>
        )}
      </div>

      {modal === "approve"  && <ApproveModal req={req} onClose={() => setModal(null)} onDone={done} />}
      {modal === "reject"   && <RejectModal  req={req} onClose={() => setModal(null)} onDone={done} />}
      {modal === "payment"  && <PaymentModal req={req} onClose={() => setModal(null)} onDone={done} />}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RoleRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests]         = useState<RoleRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<RoleRequestStatus | "all">("awaiting_approval");
  const [search, setSearch]             = useState("");
  const [pagination, setPagination]     = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchRequests = useCallback(async (tab: RoleRequestStatus | "all", page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (tab !== "all") params.set("status", tab);
      const res  = await fetch(`/api/admin/role-requests?${params}`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests ?? []);
        setPagination(data.pagination ?? { page: 1, totalPages: 1, total: 0 });
      } else {
        toast.error(data.error ?? "Failed to load requests");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(activeTab); }, [activeTab, fetchRequests]);

  const filtered = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.memberName.toLowerCase().includes(q) ||
      r.requestedRole.includes(q) ||
      (r.scopeName ?? "").toLowerCase().includes(q) ||
      (r.seasonYear ?? "").includes(q)
    );
  });

  const pendingPaymentCount   = requests.filter(r => r.status === "pending_payment").length;
  const awaitingApprovalCount = requests.filter(r => r.status === "awaiting_approval").length;

  const EXPORT_COLUMNS: ExportColumn[] = [
    { header: "Member",        key: "memberName" },
    { header: "Role",          key: "requestedRole" },
    { header: "Organisation",  key: "scopeName" },
    { header: "Season",        key: "seasonYear" },
    { header: "Status",        key: "status" },
    { header: "Requires Fee",  key: "requiresFee" },
    { header: "Fee Amount",    key: "feeAmount" },
    { header: "Fee Paid",      key: "feePaid" },
    { header: "Payment Ref",   key: "paymentRef" },
    { header: "Requested",     key: "requestedAt" },
    { header: "Requested By",  key: "requestedBy" },
    { header: "Reviewed By",   key: "reviewedBy" },
    { header: "Review Notes",  key: "reviewNotes" },
  ];

  async function fetchExportRows() {
    const params = new URLSearchParams();
    if (activeTab !== "all") params.set("status", activeTab);
    const res = await fetch(`/api/export/role-requests?${params}`);
    if (!res.ok) throw new Error("Export fetch failed");
    const data = await res.json();
    return data.rows as Record<string, unknown>[];
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-wide">
                Role Approvals
              </h1>
              <p className="text-amber-100 mt-1 font-semibold text-sm">
                Review and approve role assignment requests for your {user?.associationId ? "association and clubs" : "club"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                rows={[]}
                columns={EXPORT_COLUMNS}
                filename={`role-requests-${activeTab === "all" ? "all" : activeTab}`}
                pdfTitle="Role Requests"
                pdfSubtitle={activeTab === "all" ? "All Statuses" : STATUS_CONFIG[activeTab as RoleRequestStatus]?.label}
                fetchRows={fetchExportRows}
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              />
              <button
                onClick={() => fetchRequests(activeTab)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-sm transition-colors"
              >
                <RefreshCw size={15} /> Refresh
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Pending Payment",   value: pendingPaymentCount,   color: "bg-orange-400/30 border-orange-300/40 text-white" },
              { label: "Awaiting Approval", value: awaitingApprovalCount, color: "bg-blue-400/30 border-blue-300/40 text-white" },
              { label: "Total Shown",       value: pagination.total,      color: "bg-white/20 border-white/20 text-white" },
              { label: "This Page",         value: filtered.length,       color: "bg-white/10 border-white/10 text-white/80" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.color}`}>
                <div className="text-2xl font-black">{s.value}</div>
                <div className="text-xs font-bold uppercase opacity-80 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                  activeTab === t.key
                    ? "bg-[#06054e] text-white shadow"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-400"
                }`}
              >
                {t.label}
                {t.key === "awaiting_approval" && awaitingApprovalCount > 0 && (
                  <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {awaitingApprovalCount}
                  </span>
                )}
                {t.key === "pending_payment" && pendingPaymentCount > 0 && (
                  <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {pendingPaymentCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative sm:ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, scope…"
              className="pl-8 pr-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium w-60 focus:outline-none focus:border-[#06054e]"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={28} className="text-amber-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500 font-black text-lg uppercase">No requests found</p>
            <p className="text-slate-400 text-sm mt-1">
              {activeTab === "awaiting_approval"
                ? "No requests are currently waiting for your approval."
                : "No requests match this filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((req) => (
              <RequestCard key={req.requestId} req={req} onRefresh={() => fetchRequests(activeTab)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500 font-semibold">
              Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchRequests(activeTab, pagination.page - 1)}
                className="px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:border-slate-400 disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchRequests(activeTab, pagination.page + 1)}
                className="px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:border-slate-400 disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
