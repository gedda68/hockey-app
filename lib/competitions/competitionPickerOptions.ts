// lib/competitions/competitionPickerOptions.ts
// Groups season competitions for the compact competition picker:
// seasons (newest first) → leagues (e.g. BHL, JHL, MHL) → grades in natural order.

export interface PickerInput {
  seasonCompetitionId: string;
  season: string;
  competitionName: string | null;
  competitionId: string;
  href: string;
}

export interface PickerOption {
  id: string;
  label: string;
  href: string;
}

export interface PickerGroup {
  league: string;
  options: PickerOption[];
}

export interface PickerSeason {
  season: string;
  groups: PickerGroup[];
  /** Where to go when this season is picked (its first competition). */
  firstHref: string;
}

const OTHER = "Other competitions";

/** "BHL 1" → "BHL"; "JHL U12A" → "JHL"; "Men's Premier League" → "Other competitions". */
export function leagueOf(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return /^[A-Z]{2,5}$/.test(first) ? first : OTHER;
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function buildCompetitionPicker(items: PickerInput[]): PickerSeason[] {
  const bySeason = new Map<string, Map<string, PickerOption[]>>();
  for (const it of items) {
    const name = (it.competitionName || it.competitionId).trim();
    const league = leagueOf(name);
    const leagues = bySeason.get(it.season) ?? new Map<string, PickerOption[]>();
    const list = leagues.get(league) ?? [];
    list.push({ id: it.seasonCompetitionId, label: name, href: it.href });
    leagues.set(league, list);
    bySeason.set(it.season, leagues);
  }

  return [...bySeason.entries()]
    .sort(([a], [b]) => collator.compare(b, a))
    .map(([season, leagues]) => {
      const groups = [...leagues.entries()]
        .sort(([a], [b]) => (a === OTHER ? 1 : b === OTHER ? -1 : collator.compare(a, b)))
        .map(([league, options]) => ({ league, options: options.sort((x, y) => collator.compare(x.label, y.label)) }));
      return { season, groups, firstHref: groups[0]?.options[0]?.href ?? "" };
    });
}
