"use client";

/**
 * /admin/my-fees
 *
 * Personal fee dashboard. Shows every fee the authenticated member owes or has
 * paid, grouped by season year and hierarchical entity (national → state →
 * regional → club → insurance → role registrations).
 *
 * Includes a "Simulate Payment" flow (test/dev mode) so the full payment
 * workflow can be exercised without a real payment gateway.
 */

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import type { MyFeesResponse, MyFeesYear, MyFeeSection, MyFeeItem } from "@/app/api/member/my-fees/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

// ── Status display config ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
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

const ENTITY_ICONS: Record<MyFeeSection["entityType"], string> = {
  association: "🏒",
  club: "🏑",
  insurance: "🛡️",
  role: "🎫",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MyFeeItem["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badgeBg} ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SummaryCard({
  label,
  cents,
  color,
  icon,
}: {
  label: string;
  cents: number;
  color: string;
  icon: React.ReactNode;
}) {
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

// ── Payment modal ─────────────────────────────────────────────────────────────

interface PayItem {
  type: "payment" | "role-request";
  sourceId: string;
  name: string;
  description?: string;
  amountCents: number;
}

interface PaymentModalProps {
  items: PayItem[];
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ items, onClose, onSuccess }: PaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{
    paymentRef: string;
    paidAt: string;
    totalCents: number;
  } | null>(null);

  const totalCents = items.reduce((s, i) => s + i.amountCents, 0);

  async function handlePay() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/member/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ type: i.type, sourceId: i.sourceId })),
        }),
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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">
              {receipt ? "Payment Receipt" : "Confirm Payment"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {receipt ? (
          // ── Receipt view ────────────────────────────────────────────────
          <div className="p-5 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800 text-lg">Payment Successful</p>
              <p className="text-green-700 text-sm">Your fees have been recorded.</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono font-medium">{receipt.paymentRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{new Date(receipt.paidAt).toLocaleString("en-AU")}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total Paid</span>
                <span className="font-bold text-green-700">{formatCents(receipt.totalCents)}</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Test mode</strong> — This is a simulated payment. No real money was charged.
              Any role requests paid here will now await admin approval.
            </div>
            <button
              onClick={onClose}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Done
            </button>
          </div>
        ) : (
          // ── Confirmation view ───────────────────────────────────────────
          <div className="p-5 space-y-4">
            {/* Item list */}
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.sourceId}
                  className="flex justify-between items-start gap-3 py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {formatCents(item.amountCents)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center font-bold text-base border-t pt-3">
              <span>Total</span>
              <span className="text-indigo-700">{formatCents(totalCents)}</span>
            </div>

            {/* Test mode notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Test / development mode</strong> — clicking the button below simulates a
              successful payment. No real money is processed.
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                disabled={submitting}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={submitting}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay {formatCents(totalCents)}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Fee section card ──────────────────────────────────────────────────────────

interface FeeSectionCardProps {
  section: MyFeeSection;
  onPayItem: (item: MyFeeItem) => void;
}

function FeeSectionCard({ section, onPayItem }: FeeSectionCardProps) {
  const [expanded, setExpanded] = useState(true);
  const icon = ENTITY_ICONS[section.entityType] ?? "💰";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
      >
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
          <span className="text-sm font-medium text-gray-600">
            {formatCents(section.paidCents)} / {formatCents(section.totalCents)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Items */}
      {expanded && (
        <div className="border-t divide-y divide-gray-100">
          {section.items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 italic">No fees for this section.</p>
          ) : (
            section.items.map((item) => (
              <div
                key={item.itemId}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-gray-500">{item.description}</p>
                  )}
                  {item.paidDate && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Paid {new Date(item.paidDate).toLocaleDateString("en-AU")}
                    </p>
                  )}
                  {item.waiver && (
                    <p className="text-xs text-purple-600 mt-0.5">
                      Waived by {item.waiver.grantedByName} —{" "}
                      {new Date(item.waiver.grantedAt).toLocaleDateString("en-AU")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-gray-800 tabular-nums">
                    {formatCents(item.amountCents)}
                  </span>
                  <StatusBadge status={item.status} />
                  {item.status === "outstanding" && (
                    <button
                      onClick={() => onPayItem(item)}
                      className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition font-medium"
                    >
                      Pay
                    </button>
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

// ── Year view ─────────────────────────────────────────────────────────────────

interface YearViewProps {
  yearData: MyFeesYear;
  onPayItem: (item: MyFeeItem, section: MyFeeSection) => void;
  onPayAll: (year: string) => void;
}

function YearView({ yearData, onPayItem, onPayAll }: YearViewProps) {
  const { year, sections, summary } = yearData;
  const hasOutstanding = summary.outstandingCents > 0;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Fees"
          cents={summary.totalCents}
          color="bg-gray-100"
          icon={<Receipt className="w-4 h-4 text-gray-600" />}
        />
        <SummaryCard
          label="Paid"
          cents={summary.paidCents}
          color="bg-green-100"
          icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
        />
        <SummaryCard
          label="Outstanding"
          cents={summary.outstandingCents}
          color="bg-orange-100"
          icon={<AlertCircle className="w-4 h-4 text-orange-600" />}
        />
        <SummaryCard
          label="Waived"
          cents={summary.waivedCents}
          color="bg-purple-100"
          icon={<ShieldCheck className="w-4 h-4 text-purple-600" />}
        />
      </div>

      {/* Pay all outstanding button */}
      {hasOutstanding && (
        <div className="flex justify-end">
          <button
            onClick={() => onPayAll(year)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
          >
            <CreditCard className="w-4 h-4" />
            Pay All Outstanding — {formatCents(summary.outstandingCents)}
          </button>
        </div>
      )}

      {/* Fee sections */}
      {sections.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">No fees recorded for {year}</p>
          <p className="text-sm mt-1">Fees will appear here once you register.</p>
        </div>
      ) : (
        sections.map((section) => (
          <FeeSectionCard
            key={section.sectionId}
            section={section}
            onPayItem={(item) => onPayItem(item, section)}
          />
        ))
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyFeesPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<MyFeesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [showAllYears, setShowAllYears] = useState(false);

  // Payment modal state
  const [modalItems, setModalItems] = useState<PayItem[] | null>(null);

  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/member/my-fees?year=${showAllYears ? "all" : selectedYear}`
      );
      if (!res.ok) throw new Error("Failed to load fees");
      const json: MyFeesResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load fees");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, showAllYears]);

  useEffect(() => {
    if (!authLoading) fetchFees();
  }, [authLoading, fetchFees]);

  // Collect all outstanding items for a given year
  function allOutstandingForYear(year: string): PayItem[] {
    const yearData = data?.years.find((y) => y.year === year);
    if (!yearData) return [];
    return yearData.sections.flatMap((section) =>
      section.items
        .filter((i) => i.status === "outstanding")
        .map((i) => ({
          type: i.sourceType,
          sourceId: i.sourceId,
          name: i.name,
          description: section.entityName,
          amountCents: i.amountCents,
        }))
    );
  }

  function handlePayItem(item: MyFeeItem, section: MyFeeSection) {
    setModalItems([
      {
        type: item.sourceType,
        sourceId: item.sourceId,
        name: item.name,
        description: section.entityName,
        amountCents: item.amountCents,
      },
    ]);
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
          <p className="text-sm text-gray-500 mt-0.5">
            All registration and role fees across every level — historic and current.
          </p>
        </div>
        <button
          onClick={fetchFees}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

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
              showAllYears
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:border-indigo-400"
            }`}
          >
            All Years
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      )}

      {/* No member linked */}
      {!loading && data && !data.memberId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="font-semibold text-amber-800">No member account linked</p>
          <p className="text-sm text-amber-700 mt-1">
            Your login is not yet linked to a member profile. Contact your club registrar.
          </p>
        </div>
      )}

      {/* Fee content */}
      {!loading && data && data.memberId && (
        <>
          {showAllYears ? (
            // All years stacked
            <div className="space-y-8">
              {data.years.map((yearData) => (
                <div key={yearData.year}>
                  <h2 className="text-lg font-bold text-gray-700 mb-3">
                    {yearData.year} Season
                  </h2>
                  <YearView
                    yearData={yearData}
                    onPayItem={handlePayItem}
                    onPayAll={handlePayAll}
                  />
                </div>
              ))}
            </div>
          ) : (
            <YearView
              yearData={currentYearData}
              onPayItem={handlePayItem}
              onPayAll={handlePayAll}
            />
          )}
        </>
      )}

      {/* Payment modal */}
      {modalItems && (
        <PaymentModal
          items={modalItems}
          onClose={() => setModalItems(null)}
          onSuccess={() => {
            setModalItems(null);
            fetchFees();
          }}
        />
      )}
    </div>
  );
}
