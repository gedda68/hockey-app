# Data Utility Functions

Comprehensive utility functions for accessing and manipulating hockey app data.

## 📁 Structure

```
lib/data/
├── index.ts           # Central export (import everything from here)
├── matches.ts         # Match data functions
├── standings.ts       # Standings/team data functions
├── umpires.ts         # Umpire data functions
└── stats.ts           # Match statistics functions
```

## 🚀 Quick Start

```typescript
// Import all functions from central index
import {
  getMatchResults,
  getDivisionStandings,
  getTopScorers,
} from "@/lib/data";

// Use the functions
const matches = await getMatchResults();
const standings = await getDivisionStandings("BHL1");
const topScorers = await getTopScorers(10);
```

## 📚 API Reference

### Matches (`matches.ts`)

#### `getMatchesData()`

Get complete matches data including upcoming and results.

```typescript
const data = await getMatchesData();
// Returns: { lastUpdated, seasons, upcoming, results }
```

#### `getUpcomingMatches()`

Get all upcoming matches.

```typescript
const fixtures = await getUpcomingMatches();
```

#### `getMatchResults()`

Get all past match results.

```typescript
const results = await getMatchResults();
```

#### `getMatchById(matchId: string)`

Get a single match by its ID.

```typescript
const match = await getMatchById("2025PLM001");
```

#### `getMatchesByDivision(division: string, type?: "upcoming" | "results")`

Filter matches by division.

```typescript
const bhl1Matches = await getMatchesByDivision("BHL1", "results");
```

#### `getMatchesByRound(round: string, type?: "upcoming" | "results")`

Filter matches by round.

```typescript
const round1 = await getMatchesByRound("Round 1", "results");
```

#### `getMatchesByStatus(status: string, type?: "upcoming" | "results")`

Filter matches by status (Live, Final, Scheduled).

```typescript
const liveMatches = await getMatchesByStatus("Live");
```

#### `getDivisions(type?: "upcoming" | "results")`

Get list of all divisions.

```typescript
const divisions = await getDivisions();
// Returns: ["All", "Premier League", "BHL1", "BHL2"]
```

#### `getRounds(type?: "upcoming" | "results")`

Get list of all rounds.

```typescript
const rounds = await getRounds();
```

#### `getSeasons()`

Get available seasons.

```typescript
const seasons = await getSeasons();
// Returns: [{ year: 2025, isCurrent: false }, { year: 2026, isCurrent: true }]
```

#### `getCurrentSeason()`

Get the current season.

```typescript
const current = await getCurrentSeason();
// Returns: { year: 2026, isCurrent: true }
```

#### `filterMatches(filters)`

Advanced filtering with multiple criteria.

```typescript
const matches = await filterMatches({
  type: "results",
  division: "BHL1",
  round: "Round 1",
  status: "Final",
});
```

---

### Standings (`standings.ts`)

#### `getStandingsData()`

Get complete standings data.

```typescript
const data = await getStandingsData();
```

#### `getAllDivisions()`

Get all divisions with their teams.

```typescript
const divisions = await getAllDivisions();
```

#### `getDivisionStandings(divisionName: string)`

Get standings for a specific division.

```typescript
const bhl1 = await getDivisionStandings("BHL1");
```

#### `getDivisionNames()`

Get array of division names only.

```typescript
const names = await getDivisionNames();
// Returns: ["Premier League", "BHL1", "BHL2"]
```

#### `getTopTeams(divisionName: string, limit?: number)`

Get top N teams from a division.

```typescript
const top5 = await getTopTeams("BHL1", 5);
```

#### `getTeamByClub(divisionName: string, clubName: string)`

Get specific team details.

```typescript
const team = await getTeamByClub("BHL1", "Commercial");
```

#### `getTeamPosition(divisionName: string, clubName: string)`

Get team's current position.

```typescript
const position = await getTeamPosition("BHL1", "Commercial");
// Returns: 1
```

#### `sortStandings(divisionName, sortBy?, order?)`

Sort standings by any field.

```typescript
const sorted = await sortStandings("BHL1", "pts", "desc");
```

#### `getZoneTeams(divisionName, zone, count?)`

Get teams in promotion/relegation zones.

```typescript
const promotion = await getZoneTeams("BHL1", "promotion", 3);
const relegation = await getZoneTeams("BHL1", "relegation", 3);
```

#### `getStandingsStats(divisionName: string)`

Get division statistics.

```typescript
const stats = await getStandingsStats("BHL1");
// Returns: { totalTeams, totalGoals, avgGoalsPerTeam, highestScorer, bestDefense }
```

---

### Umpires (`umpires.ts`)

#### `getUmpireList()`

Get all umpires.

```typescript
const umpires = await getUmpireList();
```

#### `getUmpireAllocations()`

Get all umpire allocations.

```typescript
const allocations = await getUmpireAllocations();
```

#### `getUmpireAllocationsMap()`

Get allocations as a keyed object (by matchId).

```typescript
const map = await getUmpireAllocationsMap();
const matchUmpires = map["2025PLM001"];
```

#### `getUmpireById(umpireId: string)`

Get umpire details by ID.

```typescript
const umpire = await getUmpireById("0000001");
```

#### `getUmpiresForMatch(matchId: string)`

Get all umpires for a match.

```typescript
const umpires = await getUmpiresForMatch("2025PLM001");
```

#### `getPrimaryUmpiresForMatch(matchId: string)`

Get primary umpires only.

```typescript
const primary = await getPrimaryUmpiresForMatch("2025PLM001");
```

#### `getBackupUmpiresForMatch(matchId: string)`

Get backup umpires only.

```typescript
const backup = await getBackupUmpiresForMatch("2025PLM001");
```

#### `getUmpiresByClub(club: string)`

Get umpires from a specific club.

```typescript
const clubUmpires = await getUmpiresByClub("Commercial");
```

#### `getActiveUmpires()`

Get all active umpires.

```typescript
const active = await getActiveUmpires();
```

#### `getUmpiresByLevel(level: string)`

Get umpires by certification level.

```typescript
const level2 = await getUmpiresByLevel("Level 2");
```

#### `getMatchesForUmpire(umpireId: string)`

Get all matches assigned to an umpire.

```typescript
const matches = await getMatchesForUmpire("0000001");
// Returns: ["2025PLM001", "2025BHL1001"]
```

#### `hasUmpireAccepted(matchId: string, umpireId: string)`

Check if umpire has accepted allocation.

```typescript
const accepted = await hasUmpireAccepted("2025PLM001", "0000001");
// Returns: true/false
```

#### `getUmpireStats(umpireId: string)`

Get umpire statistics.

```typescript
const stats = await getUmpireStats("0000001");
// Returns: { umpire, totalMatches, matchIds }
```

---

### Match Stats (`stats.ts`)

#### `getMatchStatsData()`

Get all match statistics.

```typescript
const stats = await getMatchStatsData();
```

#### `getStatsForMatch(matchId: string)`

Get stats for a specific match.

```typescript
const stats = await getStatsForMatch("2025PLM001");
```

#### `getGoalsForMatch(matchId: string)`

Get all goals from a match.

```typescript
const goals = await getGoalsForMatch("2025PLM001");
```

#### `getCardsForMatch(matchId: string)`

Get all cards from a match.

```typescript
const cards = await getCardsForMatch("2025PLM001");
```

#### `getShootoutForMatch(matchId: string)`

Get shootout data for a match.

```typescript
const shootout = await getShootoutForMatch("2025BHL2001");
```

#### `getGoalsByTeam(matchId: string, teamName: string)`

Get goals scored by a specific team.

```typescript
const goals = await getGoalsByTeam("2025PLM001", "Commercial");
```

#### `getCardsByTeam(matchId: string, teamName: string)`

Get cards received by a specific team.

```typescript
const cards = await getCardsByTeam("2025PLM001", "Commercial");
```

#### `getGoalsByPlayer(matchId: string, playerName: string)`

Get goals scored by a specific player.

```typescript
const goals = await getGoalsByPlayer("2025PLM001", "J. Smith");
```

#### `getTimelineEvents(matchId: string)`

Get chronological timeline of all events.

```typescript
const timeline = await getTimelineEvents("2025PLM001");
// Returns goals and cards sorted by time
```

#### `getTotalGoalsByTeam(teamName: string)`

Get total goals scored by a team across all matches.

```typescript
const total = await getTotalGoalsByTeam("Commercial");
```

#### `getTopScorers(limit?: number)`

Get top scorers across all matches.

```typescript
const topScorers = await getTopScorers(10);
// Returns: [{ player, goals, team }, ...]
```

#### `getCardStats()`

Get card statistics across all matches.

```typescript
const stats = await getCardStats();
// Returns: { green: 5, yellow: 12, red: 2 }
```

#### `getShootoutMatches()`

Get list of matches that went to shootout.

```typescript
const shootouts = await getShootoutMatches();
// Returns: ["2025BHL2001", ...]
```

#### `getGoalScoringPatterns()`

Analyze goal scoring by time period.

```typescript
const patterns = await getGoalScoringPatterns();
// Returns: { "0-15": 5, "16-30": 8, "31-45": 12, "46-60": 10, "60+": 3 }
```

---

## 💡 Usage Examples

### Example 1: Get match with full details

```typescript
import {
  getMatchById,
  getStatsForMatch,
  getPrimaryUmpiresForMatch,
} from "@/lib/data";

async function getFullMatchDetails(matchId: string) {
  const [match, stats, umpires] = await Promise.all([
    getMatchById(matchId),
    getStatsForMatch(matchId),
    getPrimaryUmpiresForMatch(matchId),
  ]);

  return { match, stats, umpires };
}
```

### Example 2: Dashboard statistics

```typescript
import { getTopScorers, getCardStats, getShootoutMatches } from "@/lib/data";

async function getDashboardStats() {
  const [topScorers, cardStats, shootoutCount] = await Promise.all([
    getTopScorers(5),
    getCardStats(),
    getShootoutMatches().then((matches) => matches.length),
  ]);

  return { topScorers, cardStats, shootoutCount };
}
```

### Example 3: Team profile

```typescript
import {
  getTeamByClub,
  getTotalGoalsByTeam,
  getMatchesByDivision,
} from "@/lib/data";

async function getTeamProfile(division: string, club: string) {
  const [teamInfo, totalGoals, matches] = await Promise.all([
    getTeamByClub(division, club),
    getTotalGoalsByTeam(club),
    getMatchesByDivision(division),
  ]);

  const teamMatches = matches.filter(
    (m) => m.homeTeam === club || m.awayTeam === club
  );

  return { teamInfo, totalGoals, teamMatches };
}
```

## ✨ Benefits

- **Type-safe**: Full TypeScript support
- **Consistent**: All functions follow same patterns
- **Cached**: Results cached by Next.js automatically
- **Testable**: Easy to mock for unit tests
- **Reusable**: Use anywhere in your app
- **Maintainable**: Single source of truth for data access

## 🔄 Error Handling

All functions handle errors gracefully and return empty arrays or null on failure:

```typescript
try {
  const matches = await getMatchResults();
  // Handle success
} catch (error) {
  console.error("Failed to load matches:", error);
  // Handle error
}
```

## 🎯 Best Practices

1. **Import from index**: Always import from `@/lib/data` not individual files
2. **Use Promise.all**: Load multiple data sources in parallel
3. **Cache results**: Functions are async - use in server components for automatic caching
4. **Type everything**: Use the types from `@/types` for all data
