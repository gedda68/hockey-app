import Link from "next/link";
import { getPublicNewsItems } from "@/lib/data/publicNews";

export const metadata = {
  title: "News",
};

export default async function NewsPage() {
  const items = await getPublicNewsItems(30);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10">
          <Link
            href="/"
            className="text-xs font-black uppercase text-slate-500 hover:text-[#06054e]"
          >
            ← Home
          </Link>
          <h1 className="mt-4 text-4xl font-black uppercase text-[#06054e] tracking-tight">
            News
          </h1>
          <p className="mt-2 text-slate-600">
            Updates and announcements from the association.
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-slate-500">No published news at the moment.</p>
        ) : (
          <ul className="space-y-6">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xl font-black text-slate-900">{item.title}</h2>
                <div className="mt-1 text-xs text-slate-500">
                  {item.publishDate
                    ? item.publishDate.toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : null}
                  {item.author ? ` · ${item.author}` : ""}
                </div>
                {item.content && (
                  <p className="mt-3 text-slate-700 whitespace-pre-wrap line-clamp-6">
                    {item.content}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
