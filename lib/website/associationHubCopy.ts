import { numericLevelToString } from "@/lib/types/roles";

/** Short copy blocks for `/associations/[id]` sections (aligned with `associations.level`). */
export function associationHubRepPathwaysIntro(level: number): string {
  switch (numericLevelToString(level)) {
    case "national":
      return "National representative programs, academies, and pathways. Open championships and qualifying events run across the network — browse tournaments and follow your state or regional body for local league entry.";
    case "state":
      return "State representative teams, development pathways, and state championship events. Regional associations typically run week-to-week club leagues; use Match day when your competition is hosted here.";
    case "city":
      return "Representative and development programs at this level, plus pathways toward state squads and championships. Club-vs-club season draws are usually anchored here.";
    default:
      return "Local rep teams, qualifying tournaments, and pathways through this association — alongside the club competitions we help coordinate.";
  }
}

export function associationHubChampionshipsIntro(level: number): string {
  switch (numericLevelToString(level)) {
    case "national":
      return "National championship and carnival events linked to this body.";
    case "state":
      return "State titles, carnivals, and rep events hosted or branded for this association.";
    default:
      return "Tournaments and title events run or branded through this association (including qualifiers where applicable).";
  }
}

export function associationHubLocalLeagueIntro(level: number): string {
  switch (numericLevelToString(level)) {
    case "national":
    case "state":
      return "This round, ladders, and club hubs for competitions published under this association. For community leagues, open the regional association that runs your division.";
    default:
      return "Match day for season competitions, member clubs in this association, and quick access to draws and standings.";
  }
}

export function associationHubNewsIntro(): string {
  return "This association’s posts appear first. Below that, news from parent bodies in the hierarchy flows down (nothing from sibling associations or clubs). Open any headline for the full article.";
}
