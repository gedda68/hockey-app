# Altius → hockey-app: BHA 2026 BHL / JHL / MHL

Seeds the 2026 Brisbane Hockey Association men's (BHL), junior boys' (JHL) and
masters men's (MHL) competitions from <https://hockeybrisbane.altius.live> into
the `hockey-app` MongoDB.

| Piece | File |
|---|---|
| Browser harvester (scrapes Altius → one JSON file) | `scripts/altius-2026/harvest-in-browser.js` |
| Transform (JSON → hockey-app documents, pure + tested) | `lib/altius/transform.ts` |
| Schema checks (uses the app's own zod schemas) | `lib/altius/validate.ts` |
| Seed CLI (dry run / apply) | `scripts/altius-2026/seed.ts` |
| Tests | `__tests__/lib/altius/transform.test.ts` |

> **Data files are not committed.** The repo is public and the harvest contains
> players' names and match records, including juniors. Keep
> `data/altius/` local (it's gitignored).

## What gets seeded (2026 harvest)

| Collection | Count | Notes |
|---|---|---|
| `competitions` | 21 | One per grade: BHL 1–7, JHL J1–J3 / U14A–B / U12A–C / U12 BYE games, MHL 1–5 |
| `season_competitions` | 21 | `season: "2026"`, one division each, 3/1/0 ladder, final Altius ladder + standings kept under `altius` |
| `teams` | 142 | Linked to clubs by Altius team code; rosters built from match lineups |
| `league_fixtures` | 1,211 | Every match except BYEs. Results, shootouts, forfeits, finals (`matchLevel: "finals"`), venue + pitch, goals/cards as `matchEvents`, umpires/officials as `umpires` |
| `members` | 2,380 | 1,932 players, 303 coaches/managers, 145 match officials |
| `association-registrations` | 1,932 | One per player: BHA, 2026, `status: active`, `source: altius` |
| `club-registrations` | 1,932 | Player's club for 2026 |
| `association_venues` | 10 | Addresses from bha.org.au playing venues; pitches from Altius |
| `fixture_lineups` | 2,392 | **New collection.** One per fixture + team: who played, match-day shirt number, goalkeeper/captain, coach/manager. Feeds the match-centre timeline and player pages |
| `fixture_team_stats` | 2,394 | **New collection.** One per fixture + team: penalty corners awarded per quarter/half and the period end minutes (from each match's Altius statistics report). Corners show as "not recorded" for the ~145 matches where Altius has 0–0. Strokes awarded, shots, circle entries and possession aren't recorded in Altius |
| `competition_awards` | 4 | The BHL 1 tournament awards (only grade with awards in Altius) |
| `clubs` | 1 | Mudgeeraba (Gold Coast) plays MHL 2 but isn't a BHA club — a minimal club record is created |

Not seeded:
- **`users`**: Altius has no email addresses, and creating logins for real people without them is not appropriate. Members get `userId: null` and can be linked when a person signs up.
- **`registrations`** (fee/payment records): nothing about fees exists in Altius. The registration records above are the app's membership-style registrations, marked `source: "altius"`.

Checks done on the 2026 data:
- Altius's goal lists add up to the final score in every completed match. 8 goals (in 5 matches) have no scorer recorded in Altius, so they aren't linked to a player as events; the scores themselves are complete. These are listed in `altius-seed-warnings.txt` after a run.
- The ladder the app computes from the seeded fixtures matches Altius's ladder for all 142 team rows (played, W/D/L, GF/GA, points).
- Every document passes the app's zod schemas (`TeamSchema`, `LeagueFixtureSchema`, `SeasonCompetitionSchema`, `AssociationVenueSchema`, …).

## Run it

Prerequisites: `.env.local` with `MONGODB_URI` (and `DB_NAME` if not `hockey-app`), the `bha` association, and the BHA clubs (`scripts/seed-bha-clubs.ts`), because teams are matched to clubs by `shortName`.

```bash
# 1. Put the harvest files in place (the stats file is optional)
mkdir -p data/altius/2026
cp ~/Downloads/bha-2026-altius.json data/altius/2026/
cp ~/Downloads/bha-2026-altius-stats.json data/altius/2026/

# 2. Dry run: validates everything and prints counts, writes nothing
npx tsx scripts/altius-2026/seed.ts

# 3. Write to the database
npx tsx scripts/altius-2026/seed.ts --apply
```

Options:

| Flag | Meaning |
|---|---|
| `--only=BHL` (or `BHL,MHL`) | Seed only some leagues |
| `--skip-people` | Competitions, teams and fixtures only. Fixture events/umpires still reference member IDs, so seed people later |
| `--file=path.json` | Use a different harvest file |
| `--stats-file=path.json` | Statistics harvest (default `data/altius/2026/bha-2026-altius-stats.json`; skipped if missing) |
| `--association=bha` | Owning association id |

If `mongodb+srv` DNS fails (`querySrv ECONNREFUSED`), the script already uses public DNS; set `DNS_SERVERS=system` to turn that off or `DNS_SERVERS=ip1,ip2` to use others.

### Re-running

Safe to repeat: every document is keyed by an Altius-derived ID (`fx-altius-<matchId>`, `team-altius-<teamId>`, `MBR-ALT-<playerId>`, …).

- Refreshed from Altius each run: competitions, season competitions, teams (incl. rosters), fixtures (results, events, umpires).
- Created once, then left alone: members, registrations, venues, visiting clubs. Contact details or addresses your admins add later are not overwritten. Member `teams`, `roles` and the `altius` reference are refreshed.
- Fixtures that disappear from Altius are deleted (only `fx-altius-*` fixtures in these season competitions).

## Refreshing the data (or next season)

1. Open <https://hockeybrisbane.altius.live> in Chrome or Edge (no login needed).
2. Press F12 → **Console**, paste the whole of `scripts/altius-2026/harvest-in-browser.js`, press Enter.
3. Progress logs every few seconds; ~1,400 matches take 10–25 minutes. It then downloads `bha-<season>-altius.json`.
4. Copy it to `data/altius/<season>/` and run the seed. For another season, change `SEASON` at the top of the harvester and `SEASON` in `seed.ts`.

## How things are mapped

**Clubs.** Altius team code prefix → club `shortName` (`ALTIUS_CODE_TO_CLUB_SHORTNAME` in `lib/altius/transform.ts`), e.g. `STA`→`STS` (Pine Rivers St Andrews), `RHC`→`RDC` (Redcliffe), `SWU`→`STW` (South West United), `PKHC`→`PNJ` (Punjabi), `RDL`→`RED` (Redlands). Unknown codes fall back to name keywords, then to a minimal imported club.

**People.** Altius issues a new player ID for each team a person plays in. IDs are merged into one member when the name and club match, keeping all Altius IDs in `altius.playerIds`. Same name at different clubs stays separate. A player's most-played team is `registered`; other teams are `assigned` (fill-ins). Juniors (any JHL games) get `role-junior-player` and `membershipType: junior`; MHL-only players `masters`.

**Fixtures.** Brisbane local times → UTC. Finals are identified by Altius's phase label (Semi Final, Grand Final, Gold/Bronze Medal…), stored with `matchLevel: "finals"`, numbered after the last league round, and the label kept in `result.notes`. League games Altius left without a round number take the round played that day.

**Ladder change in the app.** `lib/competitions/standings.ts` now skips fixtures with `matchLevel: "finals"`, so finals don't inflate the regular-season ladder.

**Events.** Field goals and penalty corners → `goal` (the type is in `notes`); penalty strokes → `penalty_stroke_goal`; G/Y/R cards → `green_card`/`yellow_card`/`red_card`. Shootout goals aren't per-player in Altius; only the shootout score is stored.
