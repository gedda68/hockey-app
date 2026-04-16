## Canonical graph (source-of-truth hierarchy)

This document defines the **canonical domain graph** for organizing entities across associations, clubs, seasons, and competitions.

### Entities

- **Association**
  - Represents an organization node in a hierarchy (e.g. national → state → region → city).
  - Associations form a **tree** (single parent, many children) with one or more roots.

### Stored `level` vs business tier (single source of truth)

The database field `associations.level` is a **small integer** used for RBAC and UI (`numericLevelToString` in `lib/types/roles.ts`). Stakeholders sometimes use labels like “Level 0 / 2 / 4”; map those to **stored** values as follows:

| Stakeholder label | Typical role | Stored `associations.level` | `AssociationLevel` string |
|-------------------|--------------|----------------------------|---------------------------|
| National (“L0”) | National body: rep, academy, national championships | **0** | `national` |
| State (“L2”) | State body: state rep, state titles | **1** | `state` |
| Metro / district (“L4”) | Regional association: **primary** operator of club-vs-club season leagues (many ages/divisions), plus local rep/titles as configured | **2** (city/metro) or **3** (region/district) | `city` or `district` |

**Rules of thumb**

- **Season league** (`SeasonCompetition` club-vs-club) should normally be owned by an association at **level 2 or 3** (under state), not by the national or state root unless the product explicitly allows it.
- **National / state** nodes focus on rep teams, pathways, and championships; portal content (news, galleries, staff) should be **scoped to that association** (see `docs/PLATFORM_ROADMAP_CHECKLIST_V2.md`).

> **Legacy data:** If any rows were filtered or created using an old string map that treated `State` as `2`, reconcile those documents so `level` matches the table above.

**Operational script:** `pnpm run reconcile:association-levels` (dry-run) or `pnpm run reconcile:association-levels -- --apply` — recomputes each row’s `level` and `hierarchy` from `parentAssociationId` (see `scripts/reconcile-association-levels.ts`).

**Admin UI labels** (badges, filters, form copy) should follow `lib/domain/associationLevelDisplay.ts`, which stays aligned with this table and `numericLevelToString` in `lib/types/roles.ts`.

- **Club**
  - Represents a single club organization.
  - A club has **exactly one canonical parent association** (single parent).

- **Team**
  - Represents a **club’s team identity within a specific context**.
  - Teams are not free-floating: a team exists as a function of:
    - **Club**
    - **Season**
    - **Competition context** (or league/division context)

- **Roster**
  - Represents the **membership of players/staff** for a team in a given context.
  - Rosters are tied to the same context as the team: **club + season + competition context**.

### Relationship rules (canonical)

#### 1) Association hierarchy (tree)

- **Association → Association**: `parentAssociationId` (nullable for root nodes)
- **Invariant**: No cycles; each association has at most one parent.
- **Primary use**: jurisdiction, permissions scoping, aggregations, and “who owns what”.

#### 2) Club has a single canonical parent

- **Association 1 → N Club** (a club belongs to exactly one association)
- **Invariant**: `club.associationId` is required; clubs are never orphans.
- **Rationale**: avoids ambiguous ownership, fees, and RBAC scope.

> Note: “affiliations” (a club participating in multiple association-run competitions) should be modeled as **relationships to competitions/registrations**, not as multiple canonical parents.

#### 3) Team/Roster is contextual (club + season + competition context)

- **Club 1 → N Team** (over time and across competitions)
- A canonical team record must be resolvable by:
  - `clubId`
  - `seasonId`
  - `competitionId` (or `seasonCompetitionId`, whichever is your canonical competition-season join)
  - plus optional dimensions commonly needed for uniqueness such as:
    - `ageGroup`, `gender`, `division/grade`

**Invariant**: a team/roster cannot exist without its club, season, and competition context.

### What “competition context” means

For this platform, “competition context” is the **owning competition scope** in which fixtures/results/ladders/eligibility are computed.

- **League season**: typically a `SeasonCompetition` (owning association + season year + format).
- **Tournament**: a tournament instance (hosted by an association or club), with entries linked back to canonical teams (do not create duplicate team entities per tournament).

### Practical identity keys (recommended)

Pick a single canonical uniqueness strategy and enforce it at the database layer.

- **Association**
  - `id` primary key
  - `parentAssociationId` forms the tree

- **Club**
  - `id` primary key
  - `associationId` required

- **Team**
  - Recommended unique composite (conceptual):
    - `(clubId, seasonId, competitionContextId, ageGroup?, gender?, division?)`
  - “Stable across seasons” identity (if needed) should be modeled separately (e.g. a `TeamIdentity` / “program” entity) and then instantiated per season/context.

- **Roster**
  - Recommended unique composite:
    - `(teamId)` if team already encodes the context
    - or `(clubId, seasonId, competitionContextId, …)` if roster is the primary contextual unit

### Implications

- **No orphan teams**: teams/rosters must always link to a club (and thus transitively to an association).
- **RBAC scope**:
  - Association-scoped permissions apply to: association subtree resources, competitions owned by that association, and clubs under that association.
  - Club-scoped permissions apply to: club members, rosters, and team management within allowed competitions.
- **Reporting rollups**: stats can aggregate upward:
  - Team → Club → Association (and association subtree)

### Example graph

- Association (National)
  - Association (State)
    - Association (Region)
      - Club (single parent = Region)
        - Team (Club + 2026 + Region League competition context + grade U13)
          - Roster (players registered for that team in that context)

