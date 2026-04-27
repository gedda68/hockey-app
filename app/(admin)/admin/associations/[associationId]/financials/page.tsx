import Link from "next/link";

export default async function AssociationFinancialsIndexPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <h1 className="text-2xl font-black text-[#06054e]">Financials</h1>
          <p className="text-sm text-slate-600 mt-1">
            Foundation tools for ledgers and reporting (F1–F3).
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href={`/admin/associations/${encodeURIComponent(associationId)}/financials/chart-of-accounts`}
              className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-5 transition-colors"
            >
              <div className="font-black text-slate-900">Chart of accounts &amp; cost centres</div>
              <div className="text-sm text-slate-600 mt-1">
                Configure codes and categories for future income/expense entries.
              </div>
            </Link>
            <Link
              href={`/admin/associations/${encodeURIComponent(associationId)}/financials/income-ledger`}
              className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-5 transition-colors"
            >
              <div className="font-black text-slate-900">Income ledger</div>
              <div className="text-sm text-slate-600 mt-1">
                Record Stripe and manual income events with GST split.
              </div>
            </Link>
            <Link
              href={`/admin/associations/${encodeURIComponent(associationId)}/financials/expense-ledger`}
              className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-5 transition-colors"
            >
              <div className="font-black text-slate-900">Expense ledger</div>
              <div className="text-sm text-slate-600 mt-1">
                Manual outgoings and paid umpire honorarium (mirrored from officiating).
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

