// A section of the nominations page: a navy title bar over a light-grey body, so titles and content both read clearly.

import type { ReactNode } from "react";

export default function NominationSection({
  icon, title, subtitle, badge, children,
}: { icon?: ReactNode; title: string; subtitle?: ReactNode; badge?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 bg-[#06054e] px-6 py-4 text-white md:px-8">
        {icon && <span className="text-yellow-300">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-xl font-black uppercase leading-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs font-bold text-white/80">{subtitle}</p>}
        </div>
        {badge && <span className="ml-auto shrink-0 rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-[#06054e]">{badge}</span>}
      </div>
      <div className="bg-slate-100 p-6 text-slate-700 md:p-8">{children}</div>
    </section>
  );
}
