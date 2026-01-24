"use client";

import Link from "next/link";
import { ROUTES } from "../../../../lib/constants";

export default function OfficialsPage() {
  return (
    <section className="py-2 px-4">
      <Link href={ROUTES.UMPIRE_ALLOCATIONS}>
        <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
          <h2 className="text-2xl font-black uppercase text-[#06054e]">
            Umpire Allocations
          </h2>
          <p className="text-sm text-slate-600">
            View umpire assignments for all matches
          </p>
        </div>
      </Link>
    </section>
  );
}
