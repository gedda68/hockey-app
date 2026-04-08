# Role matrix (RBAC)

This document is the human-readable view of the platform’s roles and permissions.

**Source of truth:** `lib/types/roles.ts` (`UserRole`, `Permission`, `ROLE_DEFINITIONS`).

**Enforcement layers:**

- **Edge route gating (UI navigation)**: `middleware.ts` (route → allowed roles + optional scope checks).
- **API enforcement (authoritative)**: `lib/auth/middleware.ts` (`requireAuth`, `requirePermission`, `requireResourceAccess`).

## Scopes

Every role assignment is scoped to exactly one of:

- **global**: system-wide (e.g. `super-admin`)
- **association**: one association (`associationId`)
- **club**: one club (`clubId`)
- **team**: one team (`teamId`) (supported in types; only used where implemented)

Users can hold **multiple simultaneous role assignments** (e.g. player at a club + selector at an association). UI route access should consider scoped roles; APIs must validate scope against the target resource.

## Roles (summary)

The table below is a simplified summary. For the full permission list per role, see `ROLE_DEFINITIONS` in `lib/types/roles.ts`.

### System

- **`super-admin`**: Full system access (users, settings, all orgs).

### Association (scoped)

- **`association-admin`**: Manage an association, its competitions, and child clubs.
- **`assoc-committee`**: Governance + finance/reporting visibility.
- **`assoc-registrar`**: Registrations + member management at association level.
- **`assoc-selector`**: Representative selection (view/manage selection workflows).
- **`assoc-coach`**: Representative coaching staff (view rosters/nominations).
- **`media-marketing`**: News/media management (association or club scope).

### Club (scoped)

- **`club-admin`**: Manage a club (members, teams, registrations).
- **`club-committee`**: Governance + finance/reporting visibility at club level.
- **`registrar`**: Registrations + payments/fee workflows at club level.
- **`coach`**, **`manager`**: Team staff; roster + team operations where permitted.
- **`team-selector`**: Selection workflows at team/club scope (where enabled).
- **`volunteer`**, **`umpire`**, **`technical-official`**: Limited access (typically read-only / fixture related as implemented).

### Member portal (scoped to a club)

- **`player`**, **`member`**, **`parent`**: Portal access (own/linked profiles, registrations, nominations).

### Public

- **`public`**: No account; public website + any explicitly public APIs.

## Permission groupings (high level)

These are the core permission families used throughout the app:

- **System**: `system.*`
- **Associations**: `association.*`
- **Competitions**: `competitions.manage`
- **Clubs**: `club.*`
- **Members**: `member.*`
- **Teams**: `team.*`
- **Registration + payments**: `registration.*`
- **Reports**: `reports.*`
- **Selection**: `selection.*`
- **Profile**: `profile.*`

## Developer notes

- Prefer **permission checks** in APIs (`requirePermission`) over raw role checks.
- If you add a new role or permission:
  - Update `lib/types/roles.ts`
  - Update `middleware.ts` route rules if the UI needs to expose new admin pages
  - Update any admin navigation/menu config that filters by role

