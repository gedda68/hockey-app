// sections/FeeHistorySection.tsx
// Fee and payment history for a player

"use client";

import { BaseSectionProps, FeeRecord } from "../types/player.types";
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
  CreditCard,
} from "lucide-react";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: FeeRecord["status"] }) {
  const cfg: Record<FeeRecord["status"], { classes: string; label: string }> = {
    paid:      { classes: "bg-green-100 text-green-700 border-green-200",   label: "Paid" },
    pending:   { classes: "bg-amber-100 text-amber-700 border-amber-200",   label: "Pending" },
    overdue:   { classes: "bg-red-100 text-red-700 border-red-200",         label: "Overdue" },
    waived:    { classes: "bg-slate-100 text-slate-600 border-slate-200",   label: "Waived" },
    refunded:  { classes: "bg-blue-100 text-blue-700 border-blue-200",      label: "Refunded" },
  };
  const { classes, label } = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${classes}`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: FeeRecord["type"] }) {
  const labels: Record<FeeRecord["type"], string> = {
    nomination:   "Nomination",
    registration: "Registration",
    association:  "Association",
    other:        "Other",
  };
  return (
    <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase">
      {labels[type] ?? type}
    </span>
  );
}

function PaymentMethodLabel({ method }: { method?: FeeRecord["paymentMethod"] }) {
  if (!method) return <span className="text-slate-400">—</span>;
  const labels: Record<string, string> = {
    stripe: "Card (Stripe)",
    paypal: "PayPal",
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    other: "Other",
  };
  return <span className="font-semibold">{labels[method] ?? method}</span>;
}

export default function FeeHistorySection({
  formData,
  onChange,
}: BaseSectionProps) {
  const fees: FeeRecord[] = formData.feeHistory ?? [];

  const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fees
    .filter((f) => f.status === "paid")
    .reduce((sum, f) => sum + f.amount, 0);
  const totalOutstanding = fees
    .filter((f) => f.status === "pending" || f.status === "overdue")
    .reduce((sum, f) => sum + f.amount, 0);

  function markAsPaid(feeId: string) {
    const today = new Date().toISOString().split("T")[0];
    const updated = fees.map((f) =>
      f.id === feeId
        ? { ...f, status: "paid" as const, paidDate: today }
        : f,
    );
    onChange("feeHistory", updated);
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 font-semibold">
          Fee records are created automatically when nominations are submitted
          with a payment. You can mark pending fees as paid below.
        </p>
      </div>

      {/* Summary */}
      {fees.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#06054e]/5 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-[#06054e]">
              ${totalAmount.toFixed(2)}
            </p>
            <p className="text-[10px] font-black uppercase text-slate-500 mt-0.5">
              Total Billed
            </p>
          </div>
          <div className="bg-green-50 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-green-600">
              ${totalPaid.toFixed(2)}
            </p>
            <p className="text-[10px] font-black uppercase text-slate-500 mt-0.5">
              Paid
            </p>
          </div>
          <div className={`rounded-2xl p-3 text-center ${totalOutstanding > 0 ? "bg-red-50" : "bg-slate-50"}`}>
            <p className={`text-xl font-black ${totalOutstanding > 0 ? "text-red-600" : "text-slate-400"}`}>
              ${totalOutstanding.toFixed(2)}
            </p>
            <p className="text-[10px] font-black uppercase text-slate-500 mt-0.5">
              Outstanding
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {fees.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <DollarSign size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-black uppercase text-sm">
            No fee records.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Fee records appear here when nominations are submitted with payment.
          </p>
        </div>
      )}

      {/* Fee table */}
      {fees.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#06054e] text-white">
                <th className="text-left px-4 py-3 font-black uppercase text-[10px] rounded-tl-2xl">Date</th>
                <th className="text-left px-4 py-3 font-black uppercase text-[10px]">Description</th>
                <th className="text-left px-4 py-3 font-black uppercase text-[10px]">Type</th>
                <th className="text-right px-4 py-3 font-black uppercase text-[10px]">Amount</th>
                <th className="text-left px-4 py-3 font-black uppercase text-[10px]">Status</th>
                <th className="text-left px-4 py-3 font-black uppercase text-[10px]">Method</th>
                <th className="text-left px-4 py-3 font-black uppercase text-[10px]">Paid Date</th>
                <th className="text-center px-4 py-3 font-black uppercase text-[10px] rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...fees]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((fee, idx) => (
                  <tr
                    key={fee.id}
                    className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(fee.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold max-w-[180px] truncate">
                      {fee.description}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={fee.type} />
                    </td>
                    <td className="px-4 py-3 text-right font-black text-[#06054e] whitespace-nowrap">
                      ${fee.amount.toFixed(2)} {fee.currency}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={fee.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <PaymentMethodLabel method={fee.paymentMethod} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {fee.paidDate ? formatDate(fee.paidDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(fee.status === "pending" || fee.status === "overdue") && (
                        <button
                          onClick={() => markAsPaid(fee.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-black uppercase text-[10px] transition-all"
                        >
                          <CheckCircle size={10} />
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
