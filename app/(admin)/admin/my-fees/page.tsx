"use client";

/**
 * /admin/my-fees
 *
 * Two-tab fee & payment portal for authenticated members and admins.
 *
 * ── Tab 1: Fee Schedule ───────────────────────────────────────────────────────
 *   Personal fee dashboard — shows every fee the member owes or has paid,
 *   grouped by season year and entity (national → state → regional → club →
 *   insurance → role registrations). Includes a "Simulate Payment" flow for
 *   dev/test mode. Uses GET /api/member/my-fees.
 *
 * ── Tab 2: Payment History ────────────────────────────────────────────────────
 *   Actual payment records from the `payments` collection via GET /api/payments.
 *   Members see only their own payments.
 *   Admins (club-admin, registrar, assoc-admin, assoc-registrar, super-admin)
 *   see all payments within their scope plus member name/email search, status
 *   filter, and season-year filter.
 *   Each payment has a "View Receipt" button that opens an inline receipt modal.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Receipt,
  ShieldCheck,
  Search,
  Filter,
  X,
  Printer,
  History,
  CalendarDays,
} from "lucide-react";
import type { MyFeesResponse, MyFeesYear, MyFeeSection, MyFeeItem } from "@/app/api/member/my-fees/route";

// ── Constants ─────────────────────────────────────────────────────────────────

const ADMIN_ROLES = new Set([
  "super-admin",
  "club-admin",
  "registrar",
  "assoc-admin",
  "assoc-registrar",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(dateStr: string | undefined | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-AU", opts ?? { day: "numeric", month: "short", year: "numeric" });
}

function methodLabel(method: string | undefined): string {
  switch (method) {
    case "stripe":    return "Stripe";
    case "manual":    return "Manual";
    case "simulated": return "Simulated";
    default:          return method ?? "—";
  }
}

// ── Fee-schedule status config ────────────────────────────────────────────────

const FEE_STATUS_CONFIG: Record<
  MyFeeItem["status"],
  { label: string; icon: React.ReactNode; color: string; badgeBg: string }
> = {
  paid: {
    label: "Paid",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-green-700",
    badgeBg: "bg-green-100 border-green-300",
  },
  outstanding: {
    label: "Outstanding",
    icon: <AlertCircle className="w-4 h-4" />,
    color: "text-orange-700",
    badgeBg: "bg-orange-100 border-orange-300",
  },
  "pending-approval": {
    label: "Awaiting Approval",
    icon: <Clock className="w-4 h-4" />,
    color: "text-blue-700",
    badgeBg: "bg-blue-100 border-blue-300",
  },
  waived: {
    label: "Waived",
    icon: <ShieldCheck className="w-4 h-4" />,
    color: "text-purple-700",
    badgeBg: "bg-purple-100 border-purple-300",
  },
  rejected: {
    label: "Cancelled",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-gray-500",
    badgeBg: "bg-gray-100 border-gray-300",
  },
};

// ── Payment-record status config ──────────────────────────────────────────────

type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded" | "cancelled";

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; bg: string }
> = {
  pending:           { label: "Pending",        color: "text-orange-700", bg: "bg-orange-100 border-orange-300" },
  paid:              { label: "Paid",            color: "text-green-700",  bg: "bg-green-100 border-green-300"  },
  failed:            { label: "Failed",          color: "text-red-700",    bg: "bg-red-100 border-red-300"      },
  refunded:          { label: "Refunded",        color: "text-blue-700",   bg: "bg-blue-100 border-blue-300"    },
  partially_refunded:{ label: "Partial Refund",  color: "text-amber-700",  bg: "bg-amber-100 border-amber-300"  },
  cancelled:         { label: "Cancelled",       color: "text-gray-600",   bg: "bg-gray-100 border-gray-300"    },
};

const ENTITY_ICONS: Record<MyFeeSection["entityType"], string> = {
  association: "🏒",
  club: "🏑",
  tournament: "🏆",
  insurance: "🛡️",
  role: "🎫",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentLineItem {
  itemId?: string;
  type?: string;
  name: string;
  amount?: number;
  description?: string;
}

interface PaymentRecord {
  paymentId: string;
  memberId: string;
  amount: number;
  amountCents?: number;
  status: PaymentStatus;
  seasonYear?: string;
  paymentMethod?: string;
  transactionId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  paidDate?: string;
  refundedAt?: string;
  refundAmountCents?: number;
  lineItems?: PaymentLineItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  memberDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

// ── Fee Schedule sub-components ───────────────────────────────────────────────

function FeeStatusBadge({ status }: { status: MyFeeItem["status"] }) {
  const cfg = FEE_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badgeBg} ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SummaryCard({ label, cents, color, icon }: { label: string; cents: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900">{formatCents(cents)}</p>
      </div>
    </div>
  );
}

// ── Payment modal (simulate payment) ─────────────────────────────────────────

interface PayItem {
  type: "payment" | "role-request";
  sourceId: string;
  name: string;
  description?: string;
  amountCents: number;
}

function SimulatePaymentModal({ items, onClose, onSuccess }: { items: PayItem[]; onClose: () => void; onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ paymentRef: string; paidAt: string; totalCents: number } | null>(null);
  const totalCents = items.reduce((s, i) => s + i.amountCents, 0);

  async function handlePay() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/member/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ type: i.type, sourceId: i.sourceId })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed");
      setReceipt({ paymentRef: data.paymentRef, paidAt: data.paidAt, totalCents: data.totalCents });
      toast.success("Payment simulated successfully");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">{receipt ? "Payment Receipt" : "Confirm Payment"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {receipt ? (
          <div className="p-5 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800 text-lg">Payment Successful</p>
              <p className="text-green-700 text-sm">Your fees have been recorded.</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="font-mono font-medium">{receipt.paymentRef}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{new Date(receipt.paidAt).toLocaleString("en-AU")}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total Paid</span><span className="font-bold text-green-700">{formatCents(receipt.totalCents)}</span></div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Test mode</strong> — This is a simulated payment. No real money was charged.
            </div>
            <button onClick={onClose} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">Done</button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.sourceId} className="flex justify-between items-start gap-3 py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCents(item.amountCents)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center font-bold text-base border-t pt-3">
              <span>Total</span>
              <span className="text-indigo-700">{formatCents(totalCents)}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Test / development mode</strong> — clicking the button below simulates a successful payment. No real money is processed.
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} disabled={submitting} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50">Cancel</button>
              <button onClick={handlePay} disabled={submitting} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" />Processing…</> : <><CreditCard className="w-4 h-4" />Pay {formatCents(totalCents)}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Fee section card ──────────────────────────────────────────────────────────

function FeeSectionCard({ section, onPayItem }: { section: MyFeeSection; onPayItem: (item: MyFeeItem) => void }) {
  const [expanded, setExpanded] = useState(true);
  const icon = ENTITY_ICONS[section.entityType] ?? "💰";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-gray-900">{section.entityName}</span>
          {section.outstandingCents > 0 && (
            <span className="bg-orange-100 border border-orange-300 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {formatCents(section.outstandingCents)} outstanding
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">{formatCents(section.paidCents)} / {formatCents(section.totalCents)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t divide-y divide-gray-100">
          {section.items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 italic">No fees for this section.</p>
          ) : (
            section.items.map((item) => (
              <div key={item.itemId} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                  {item.paidDate && <p className="text-xs text-gray-400 mt-0.5">Paid {new Date(item.paidDate).toLocaleDateString("en-AU")}</p>}
                  {item.waiver && <p className="text-xs text-purple-600 mt-0.5">Waived by {item.waiver.grantedByName} — {new Date(item.waiver.grantedAt).toLocaleDateString("en-AU")}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-gray-800 tabular-nums">{formatCents(item.amountCents)}</span>
                  <FeeStatusBadge status={item.status} />
                  {item.status === "outstanding" && (
                    <button onClick={() => onPayItem(item)} className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition font-medium">Pay</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function YearView({ yearData, onPayItem, onPayAll }: { yearData: MyFeesYear; onPayItem: (item: MyFeeItem, section: MyFeeSection) => void; onPayAll: (year: string) => void }) {
  const { year, sections, summary } = yearData;
  const hasOutstanding = summary.outstandingCents > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total Fees"   cents={summary.totalCents}       color="bg-gray-100"   icon={<Receipt className="w-4 h-4 text-gray-600" />} />
        <SummaryCard label="Paid"         cents={summary.paidCents}        color="bg-green-100"  icon={<CheckCircle2 className="w-4 h-4 text-green-600" />} />
        <SummaryCard label="Outstanding"  cents={summary.outstandingCents} color="bg-orange-100" icon={<AlertCircle className="w-4 h-4 text-orange-600" />} />
        <SummaryCard label="Waived"       cents={summary.waivedCents}      color="bg-purple-100" icon={<ShieldCheck className="w-4 h-4 text-purple-600" />} />
      </div>
      {hasOutstanding && (
        <div className="flex justify-end">
          <button onClick={() => onPayAll(year)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-sm">
            <CreditCard className="w-4 h-4" />
            Pay All Outstanding — {formatCents(summary.outstandingCents)}
          </button>
        </div>
      )}
      {sections.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No fees recorded for {year}</p>
          <p className="text-sm mt-1">Fees will appear here once you register.</p>
        </div>
      ) : (
        sections.map((section) => (
          <FeeSectionCard key={section.sectionId} section={section} onPayItem={(item) => onPayItem(item, section)} />
        ))
      )}
    </div>
  );
}

// ── Receipt modal ─────────────────────────────────────────────────────────────

function ReceiptModal({ payment, onClose }: { payment: PaymentRecord; onClose: () => void }) {
  const memberName = [payment.memberDetails?.firstName, payment.memberDetails?.lastName].filter(Boolean).join(" ") || "—";
  const cfg = PAYMENT_STATUS_CONFIG[payment.status] ?? { label: payment.status, color: "text-gray-600", bg: "bg-gray-100 border-gray-300" };
  const totalDollars = payment.amount ?? ((payment.amountCents ?? 0) / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Payment Receipt</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2.5 py-1.5 rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-1">×</button>
          </div>
        </div>

        <div className="p-5 space-y-4 print:p-0">
          {/* Status banner */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.color}`}>
            {payment.status === "paid" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {payment.status === "refunded" && <RefreshCw className="w-5 h-5 shrink-0" />}
            {payment.status === "failed" && <XCircle className="w-5 h-5 shrink-0" />}
            {!["paid", "refunded", "failed"].includes(payment.status) && <Clock className="w-5 h-5 shrink-0" />}
            <span className="font-semibold">{cfg.label}</span>
          </div>

          {/* Reference */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500 shrink-0">Payment ID</span>
              <span className="font-mono font-medium text-gray-900 text-right break-all">{payment.paymentId}</span>
            </div>
            {payment.memberDetails && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Member</span>
                <span className="font-medium text-gray-900 text-right">{memberName}</span>
              </div>
            )}
            {payment.memberDetails?.email && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Email</span>
                <span className="text-gray-700 text-right">{payment.memberDetails.email}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-gray-500 shrink-0">Date</span>
              <span className="text-gray-900">{formatDate(payment.paidDate ?? payment.createdAt, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500 shrink-0">Method</span>
              <span className="text-gray-900">{methodLabel(payment.paymentMethod)}</span>
            </div>
            {payment.transactionId && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Transaction</span>
                <span className="font-mono text-xs text-gray-700 text-right break-all">{payment.transactionId}</span>
              </div>
            )}
            {payment.seasonYear && (
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Season</span>
                <span className="text-gray-900">{payment.seasonYear}</span>
              </div>
            )}
          </div>

          {/* Line items */}
          {(payment.lineItems?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items</h3>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {payment.lineItems!.map((item, idx) => (
                  <div key={item.itemId ?? idx} className="flex justify-between items-start gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                    </div>
                    <span className="text-sm font-semibold text-gray-800 whitespace-nowrap tabular-nums">
                      {item.amount !== undefined ? formatCents(Math.round(item.amount * 100)) : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center font-bold text-base border-t pt-3">
            <span className="text-gray-700">Total</span>
            <span className="text-gray-900">{formatCents(Math.round(totalDollars * 100))}</span>
          </div>

          {/* Refund info */}
          {payment.refundAmountCents !== undefined && payment.refundAmountCents > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <span className="font-semibold">Refunded:</span> {formatCents(payment.refundAmountCents)}
              {payment.refundedAt && <span className="text-xs ml-2">on {formatDate(payment.refundedAt)}</span>}
            </div>
          )}

          {payment.notes && (
            <p className="text-xs text-gray-500 italic border-t pt-3">{payment.notes}</p>
          )}

          <button onClick={onClose} className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Payment status badge ──────────────────────────────────────────────────────

function PaymentStatusBadge({ status }: { status: PaymentStatus | string }) {
  const cfg = PAYMENT_STATUS_CONFIG[status as PaymentStatus] ?? { label: status, color: "text-gray-600", bg: "bg-gray-100 border-gray-300" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Payment card ──────────────────────────────────────────────────────────────

function PaymentCard({ payment, showMember, onViewReceipt }: { payment: PaymentRecord; showMember: boolean; onViewReceipt: (p: PaymentRecord) => void }) {
  const [expanded, setExpanded] = useState(false);
  const memberName = [payment.memberDetails?.firstName, payment.memberDetails?.lastName].filter(Boolean).join(" ");
  const totalDollars = payment.amount ?? ((payment.amountCents ?? 0) / 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Left: icon + info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-400">{payment.paymentId}</span>
            <PaymentStatusBadge status={payment.status} />
            {payment.seasonYear && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <CalendarDays className="w-3 h-3" />{payment.seasonYear}
              </span>
            )}
          </div>
          {showMember && memberName && (
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{memberName}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            {methodLabel(payment.paymentMethod)} · {formatDate(payment.paidDate ?? payment.createdAt)}
          </p>
          {/* First line item preview */}
          {(payment.lineItems?.length ?? 0) > 0 && (
            <p className="text-xs text-gray-600 mt-1 truncate">{payment.lineItems![0].name}</p>
          )}
        </div>

        {/* Right: amount + actions */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="font-bold text-gray-900 tabular-nums">{formatCents(Math.round(totalDollars * 100))}</span>
          <div className="flex items-center gap-1">
            {(payment.lineItems?.length ?? 0) > 1 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {payment.lineItems!.length} items
              </button>
            )}
            <button
              onClick={() => onViewReceipt(payment)}
              className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-lg transition font-medium"
            >
              <Receipt className="w-3 h-3" />
              Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Expanded line items */}
      {expanded && payment.lineItems && payment.lineItems.length > 1 && (
        <div className="border-t divide-y divide-gray-100 bg-gray-50">
          {payment.lineItems.map((item, idx) => (
            <div key={item.itemId ?? idx} className="flex justify-between items-center px-4 py-2 text-xs">
              <span className="text-gray-700">{item.name}</span>
              {item.amount !== undefined && (
                <span className="font-semibold text-gray-800 tabular-nums">{formatCents(Math.round(item.amount * 100))}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payment History view ──────────────────────────────────────────────────────

function PaymentHistoryView({ isAdmin }: { isAdmin: boolean }) {
  const [payments, setPayments]       = useState<PaymentRecord[]>([]);
  const [loading, setLoading]         = useState(false);
  const [receipt, setReceipt]         = useState<PaymentRecord | null>(null);

  // Filters
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter]   = useState("");

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (overrides?: { search?: string; status?: string; year?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const q = overrides?.search  !== undefined ? overrides.search  : search;
      const s = overrides?.status  !== undefined ? overrides.status  : statusFilter;
      const y = overrides?.year    !== undefined ? overrides.year    : yearFilter;
      if (q)  params.set("search",     q);
      if (s)  params.set("status",     s);
      if (y)  params.set("seasonYear", y);
      params.set("limit", "100");

      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load payments");
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, yearFilter]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load({ search: val }), 400);
  }

  function applyFilter(key: "status" | "year", val: string) {
    if (key === "status") { setStatusFilter(val); load({ status: val }); }
    else                  { setYearFilter(val);   load({ year:   val }); }
  }

  function clearFilters() {
    setSearch(""); setStatusFilter(""); setYearFilter("");
    load({ search: "", status: "", year: "" });
  }

  const hasFilters = search || statusFilter || yearFilter;
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search — admin only */}
        {isAdmin && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search member name or email…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        )}

        {/* Status filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => applyFilter("status", e.target.value)}
            className="pl-8 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none bg-white"
          >
            <option value="">All statuses</option>
            {Object.entries(PAYMENT_STATUS_CONFIG).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Year filter */}
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={yearFilter}
            onChange={(e) => applyFilter("year", e.target.value)}
            className="pl-8 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none bg-white"
          >
            <option value="">All seasons</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Refresh + clear */}
        <div className="flex gap-1.5">
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <X className="w-3.5 h-3.5" />Clear
            </button>
          )}
          <button onClick={() => load()} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-600">No payments found</p>
          <p className="text-sm mt-1">
            {hasFilters ? "Try clearing the filters." : "Completed payments will appear here."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">{payments.length} payment{payments.length !== 1 ? "s" : ""} found</p>
          <div className="space-y-3">
            {payments.map((p) => (
              <PaymentCard
                key={p.paymentId}
                payment={p}
                showMember={isAdmin}
                onViewReceipt={setReceipt}
              />
            ))}
          </div>
        </>
      )}

      {/* Receipt modal */}
      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyFeesPage() {
  const { user, isLoading: authLoading } = useAuth();

  // Tab
  const [activeTab, setActiveTab] = useState<"fees" | "history">("fees");

  // Fee schedule state
  const [data, setData]               = useState<MyFeesResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [showAllYears, setShowAllYears] = useState(false);
  const [modalItems, setModalItems]   = useState<PayItem[] | null>(null);

  const isAdmin = ADMIN_ROLES.has(user?.role ?? "");

  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/member/my-fees?year=${showAllYears ? "all" : selectedYear}`);
      if (!res.ok) throw new Error("Failed to load fees");
      const json: MyFeesResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load fees");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showAllYears]);

  useEffect(() => { if (!authLoading) fetchFees(); }, [authLoading, fetchFees]);

  function allOutstandingForYear(year: string): PayItem[] {
    const yearData = data?.years.find((y) => y.year === year);
    if (!yearData) return [];
    return yearData.sections.flatMap((section) =>
      section.items
        .filter((i) => i.status === "outstanding")
        .map((i) => ({ type: i.sourceType, sourceId: i.sourceId, name: i.name, description: section.entityName, amountCents: i.amountCents }))
    );
  }

  function handlePayItem(item: MyFeeItem, section: MyFeeSection) {
    setModalItems([{ type: item.sourceType, sourceId: item.sourceId, name: item.name, description: section.entityName, amountCents: item.amountCents }]);
  }

  function handlePayAll(year: string) {
    const items = allOutstandingForYear(year);
    if (items.length === 0) return;
    setModalItems(items);
  }

  const currentYearData = data?.years.find((y) => y.year === selectedYear) ?? {
    year: selectedYear,
    sections: [],
    summary: { totalCents: 0, paidCents: 0, outstandingCents: 0, waivedCents: 0 },
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Fees & Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registration fees and payment history.</p>
        </div>
        {activeTab === "fees" && (
          <button onClick={fetchFees} disabled={loading} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("fees")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "fees" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Receipt className="w-4 h-4" />
          Fee Schedule
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <History className="w-4 h-4" />
          Payment History
          {isAdmin && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Admin</span>
          )}
        </button>
      </div>

      {/* ── Fee Schedule tab ──────────────────────────────────────────────────── */}
      {activeTab === "fees" && (
        <>
          {/* Year selector */}
          {data && data.availableYears.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {data.availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => { setSelectedYear(year); setShowAllYears(false); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    !showAllYears && selectedYear === year
                      ? "bg-indigo-600 text-white"
                      : "bg-white border border-gray-300 text-gray-600 hover:border-indigo-400"
                  }`}
                >
                  {year}
                </button>
              ))}
              <button
                onClick={() => setShowAllYears(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  showAllYears ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:border-indigo-400"
                }`}
              >
                All Years
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          )}

          {!loading && data && !data.memberId && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-semibold text-amber-800">No member account linked</p>
              <p className="text-sm text-amber-700 mt-1">Contact your club registrar.</p>
            </div>
          )}

          {!loading && data && data.memberId && (
            <>
              {showAllYears ? (
                <div className="space-y-8">
                  {data.years.map((yearData) => (
                    <div key={yearData.year}>
                      <h2 className="text-lg font-bold text-gray-700 mb-3">{yearData.year} Season</h2>
                      <YearView yearData={yearData} onPayItem={handlePayItem} onPayAll={handlePayAll} />
                    </div>
                  ))}
                </div>
              ) : (
                <YearView yearData={currentYearData} onPayItem={handlePayItem} onPayAll={handlePayAll} />
              )}
            </>
          )}

          {modalItems && (
            <SimulatePaymentModal
              items={modalItems}
              onClose={() => setModalItems(null)}
              onSuccess={() => { setModalItems(null); fetchFees(); }}
            />
          )}
        </>
      )}

      {/* ── Payment History tab ───────────────────────────────────────────────── */}
      {activeTab === "history" && <PaymentHistoryView isAdmin={isAdmin} />}
    </div>
  );
}
