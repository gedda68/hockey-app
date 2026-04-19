// app/admin/bulk-import/page.tsx
// Admin bulk upload — server wrapper for the client component.

import { Suspense } from "react";
import BulkImportClient from "./BulkImportClient";

export const metadata = {
  title: "Bulk Import — Admin",
  description:
    "Upload CSV/Excel to import members, registrations, competitions, tournaments, fees, news, and more (role-scoped).",
};

export default function BulkImportPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-5xl mx-auto animate-pulse">
          <div className="h-16 bg-slate-200 rounded-2xl mb-6" />
          <div className="flex gap-2 mb-6">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="h-9 w-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      }
    >
      <BulkImportClient />
    </Suspense>
  );
}
