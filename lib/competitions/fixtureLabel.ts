// Human-readable fixture label for dropdowns: "Round 1 - Redcliffe v Bulimba".

export function formatFixtureLabel(input: {
  round?: number | null;
  homeName?: string | null;
  awayName?: string | null;
  fixtureId?: string;
}): string {
  const round = input.round && input.round > 0 ? `Round ${input.round}` : "Round -";
  const home = input.homeName?.trim();
  const away = input.awayName?.trim();
  if (home && away) return `${round} - ${home} v ${away}`;
  return `${round} - ${input.fixtureId ?? "fixture"}`;
}
