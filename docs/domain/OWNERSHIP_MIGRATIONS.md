## Ownership invariants & migration rules (no orphan teams)

This doc defines the **invariants** that prevent orphaned teams/rosters and the **migration rules** for safe changes to club/association ownership.

It assumes the canonical graph defined in `docs/domain/CANONICAL_GRAPH.md`.

### Core invariants (must always hold)

- **No orphan clubs**
  - `club.associationId` is **required**.
  - A club cannot be deleted while referenced by teams/rosters/registrations (use soft-delete/archival semantics instead).

- **No orphan teams**
  - Every team must reference a valid `clubId`.
  - Every team must have its required context fields (at minimum `seasonId` and a competition context reference such as `competitionId`/`seasonCompetitionId`).
  - If a team is used by fixtures/results/entries, it cannot be hard-deleted.

- **No orphan rosters**
  - Every roster must reference a valid `teamId` (preferred) or must carry the same canonical context fields (`clubId`, `seasonId`, `competitionContextId`, …) and be constrained so it cannot exist without them.
  - Player/staff membership rows must reference a roster (or team) that exists.

- **Ownership is derived, not duplicated**
  - A team’s effective association is **derived via its club** (and optionally competition ownership), not stored as a separate “authoritative” association field on the team.
  - If you denormalize `associationId` onto team/roster for query speed, treat it as a **cache** and keep it consistent (trigger/job/backfill) — it must never disagree with the canonical path.

### Mutations that are allowed vs forbidden

- **Allowed**
  - Move a club to a new association (with strict preconditions and audit).
  - Move a team/roster to a different club (rare; usually only for admin correction or club mergers).
  - Archive/retire teams for a season/competition context.

- **Forbidden (or “never rewrite history”)**
  - Rewriting association ownership for historical competitions by mass-editing past fixtures/results ownership fields.
  - Deleting canonical teams that are referenced by results, registrations, or audit logs.

### Migration playbooks

#### Playbook A — Club changes association (re-affiliation)

**Use when**: a club is re-affiliated from Association A to Association B (jurisdiction change, restructure, governance change).

**Goal**: keep teams/fixtures/results intact while ensuring future permissions, registrations, and competition eligibility reflect the new association.

**Preconditions**

- Club is a canonical entity (not a duplicate).
- No pending “in-flight” financial processes that assume the old association (registrations awaiting payment settlement, unresolved invoices), or you accept a defined cutover rule.
- RBAC policy supports “historical read” even after ownership moves (recommended).

**Steps**

1. **Create an admin-audited “ClubAffiliationChange” record**
   - `clubId`, `fromAssociationId`, `toAssociationId`
   - `effectiveAt` timestamp (and optionally `effectiveSeasonId`)
   - `reason`, `approvedByUserId`

2. **Update canonical ownership**
   - Set `club.associationId = toAssociationId`

3. **Decide the cutover semantics (choose one and enforce consistently)**

   - **Option A (recommended): “forward-only”**
     - Past seasons/competitions remain historically correct as-recorded.
     - New registrations/competitions after `effectiveAt` use the new association.
     - If you need “who owned this at the time” for reporting, you read from `ClubAffiliationChange` history.

   - **Option B: “effective season”**
     - Apply the new affiliation starting from a specific `effectiveSeasonId`.
     - Past seasons remain under the old affiliation for reporting and eligibility rules.

4. **Reconcile derived/cached fields**
   - If you cache `associationId` on team/roster/member registrations, run a backfill for:
     - future teams (and optionally teams where `seasonId >= effectiveSeasonId`)
     - open registrations
     - access-control “ownership” materializations (if any)

5. **RBAC and access**
   - Ensure association admins for the old association keep access to historical data if required (read-only via audit/legacy scope), or explicitly drop access at `effectiveAt`.

**Do not**

- Bulk change competition ownership. A competition’s owning association remains the creator/owner of that competition (see Epic C rules), regardless of which clubs participate.

#### Playbook B — Team/Roster moves to a different club

**Use when**: admin correction (team was created under wrong club), club merger, or a club split. This is high-risk because it can break identity and reporting.

**Principle**: **Prefer creating a new team under the correct club and migrating “participants”** rather than rewriting canonical IDs that are referenced by results.

**Preconditions**

- You know whether the team has fixtures/results/registrations already attached.
- You have a defined policy for what should happen to:
  - fixtures/results
  - ladders/standings history
  - fees/registrations and payment records

**Cases**

- **Case B1: Team has no fixtures/results/entries yet**
  - Safe path: update `team.clubId` (and any roster `clubId` if present) to the correct club.
  - Recompute derived fields and eligibility.
  - Log an audit event.

- **Case B2: Team has fixtures/results/entries**
  - **Do not change** the canonical team’s `clubId` if it would rewrite published history.
  - Instead:
    - Create a **new team** under the target club with the same context (season + competition + dimensions).
    - Move future-facing artifacts:
      - future fixtures (unplayed) if your rules allow
      - roster memberships (players/staff) effective from a cutover date
      - registrations not yet finalized (if legally/financially permissible)
    - Keep played fixtures/results attached to the original team for historical correctness.
  - Record an explicit “TeamTransfer”/“ClubMergeMapping” record that links:
    - `fromTeamId` → `toTeamId`, `effectiveAt`, `reason`, `approvedBy`

#### Playbook C — Association restructure (tree changes)

**Use when**: associations are reparented (e.g. regions consolidated under a new state association).

**Steps**

- Update `association.parentAssociationId` edges.
- Ensure no cycles and regenerate any cached hierarchy fields (materialized path, closure table, etc.).
- Clubs remain attached to their canonical association nodes; only the association tree changes.

### Enforcement mechanisms (implementation-neutral)

- **DB constraints**
  - Foreign keys: `team.clubId → club.id`, `club.associationId → association.id`, `roster.teamId → team.id`
  - NOT NULL on required context fields
  - Unique composite constraints for team identity within a context (see `CANONICAL_GRAPH.md`)

- **Application guards**
  - Disallow deletes for referenced rows (soft delete with `archivedAt`)
  - On any ownership change, require:
    - admin permission
    - audit record
    - backfill of derived/cached ownership fields

- **Audit**
  - Every ownership mutation creates an immutable audit event including before/after IDs and effective date.

