import { redirect } from "next/navigation";

// Match Day and Match Results are now one page: /competitions/matches. Old links land there with their filters.
export default async function ThisRoundRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val && k !== "mode") q.set(k, val);
  }
  if (sp.mode === "week" && !q.get("round")) q.set("round", "week");
  redirect(`/competitions/matches${q.toString() ? `?${q.toString()}` : ""}`);
}
