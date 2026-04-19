import Link from "next/link";
import { Info } from "lucide-react";
import { associationLevelDisplay } from "@/lib/domain/associationLevelDisplay";

/**
 * N2: Surfaces canonical hierarchy policy when the active association is national/state
 * (stored `level` 0–1), so admins see guidance before the season-league API returns 400.
 */
export function LeagueHierarchyPolicyCallout({
  associationLevel,
  associationName,
}: {
  associationLevel: number;
  associationName: string;
}) {
  if (associationLevel > 1) return null;

  const { label, short } = associationLevelDisplay(associationLevel);

  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/90 p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-600 p-2 text-white shrink-0">
          <Info size={22} />
        </div>
        <div className="space-y-2 text-sm font-bold text-indigo-950 leading-relaxed">
          <p className="text-base font-black text-indigo-950">
            Season club-vs-club leagues are not owned at {short} ({label})
          </p>
          <p>
            <strong>{associationName}</strong> is stored as hierarchy level{" "}
            <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs">{associationLevel}</code>.
            In this product, a <strong>season league</strong> (<code className="font-mono text-xs">SeasonCompetition</code>)
            must be owned by a <strong>regional / metro association</strong> (stored level ≥ 2) so club teams and
            venues sit under the body that runs Saturday leagues.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-indigo-900">
            <li>National and state bodies normally focus on rep play, pathways, and championships.</li>
            <li>
              If you need draw/results for rep or carnival play, use{" "}
              <strong className="text-indigo-950">tournaments</strong> instead of this league wizard for the
              national/state node.
            </li>
          </ul>
          <p className="text-xs font-bold text-indigo-800/90">
            Canonical rules: <code className="font-mono">docs/domain/CANONICAL_GRAPH.md</code> (stored{" "}
            <code className="font-mono">associations.level</code> vs business tier).
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/admin/tournaments"
              className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white hover:bg-indigo-700 transition-colors"
            >
              Open tournaments (rep play) →
            </Link>
            <Link
              href="/admin/associations"
              className="inline-flex items-center rounded-xl border-2 border-indigo-400 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-indigo-900 hover:bg-indigo-100/80 transition-colors"
            >
              Switch association →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
