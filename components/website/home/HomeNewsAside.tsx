"use client";

import Link from "next/link";

export type HomeNewsLite = {
  id: string;
  title: string;
  content?: string;
  /** ISO string from server (serializable across RSC → client) */
  publishDate?: string;
  image?: string;
  imageUrl?: string;
  videoUrl?: string;
  author?: string;
};

function parsePub(n: HomeNewsLite): Date {
  if (!n.publishDate) return new Date();
  const d = new Date(n.publishDate);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function HomeNewsAside({ items }: { items: HomeNewsLite[] }) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-black uppercase text-[#06054e] tracking-tight">
          Latest news
        </h2>
        <Link
          href="/news"
          className="text-[10px] font-black uppercase text-slate-500 hover:text-[#06054e] shrink-0"
        >
          All →
        </Link>
      </div>
      <div className="h-1 w-10 bg-yellow-400 rounded-full mb-4" />

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 leading-relaxed">
          News and updates will appear here when published.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const pub = item.publishDate ? parsePub(item) : null;
            const isNew =
              pub && Date.now() - pub.getTime() < 5 * 86400000;
            return (
              <li key={item.id}>
                <Link
                  href={`/news/${encodeURIComponent(item.id)}`}
                  className="block w-full text-left rounded-xl border border-slate-100 bg-slate-50/80 p-4 hover:border-[#06054e]/20 hover:bg-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                >
                  <div className="flex items-start justify-between gap-2">
                    {pub && (
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        {pub.toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {isNew && (
                      <span className="text-[9px] font-black uppercase bg-yellow-400 text-[#06054e] px-2 py-0.5 rounded-full shrink-0">
                        New
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-sm font-black text-slate-900 leading-snug">
                    {item.title}
                  </h3>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
