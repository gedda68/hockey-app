"use client";
// The Leagues filter row: the same dark type-ahead boxes as the Matches page, on one line.
import { useRouter } from "next/navigation";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";

export interface LeagueFilterField { key: string; label: string; value: string; allLabel: string; options: { value: string; label: string }[] }

export default function LeagueFilterBar({ fields }: { fields: LeagueFilterField[] }) {
  const router = useRouter();
  const go = (key: string, value: string) => {
    const sp = new URLSearchParams();
    for (const f of fields) {
      const v = f.key === key ? value : f.value;
      if (v && v !== "all") sp.set(f.key, v);
      else if (f.key === "season" && v === "all") sp.set("season", "all"); // "All years" must survive, otherwise the page falls back to the current year
    }
    router.push(`/competitions/leagues${sp.toString() ? `?${sp.toString()}` : ""}`);
  };
  return (
    <div className="flex flex-wrap gap-2 lg:flex-nowrap">
      {fields.map((f) => (
        <div key={f.key} className="flex min-w-0 basis-[calc(50%-0.25rem)] flex-col gap-1 lg:flex-1 lg:basis-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{f.label}</span>
          <TypeaheadSelect
            variant="dark" compact ariaLabel={f.label} placeholder={f.allLabel}
            options={[{ value: "all", label: f.allLabel }, ...f.options]} value={f.value || "all"}
            onChange={(v) => go(f.key, v)}
          />
        </div>
      ))}
    </div>
  );
}
