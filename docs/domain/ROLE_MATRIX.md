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

## Operational personas → `UserRole` (B2)

These job titles are how associations and clubs usually think about access. The platform implements them with **`UserRole` values** and **permissions** in `ROLE_DEFINITIONS` — not separate database personas yet.

| Persona | Typical `UserRole`(s) | Primary permissions / notes |
|--------|------------------------|-----------------------------|
| **Registrar (club)** | `registrar` | `registration.*`, `member.*`, `club.members`, fee recording. Uses **Members**, **Role requests**, **Fees** (club scope). `/admin/clubs/*` UI is **`club-admin`+** only; registrars work from member/roster flows. |
| **Registrar (association)** | `assoc-registrar` | Association registrations, approvals, cross-club visibility where implemented. **Representative**, **Role requests**, **Team tournaments** (per middleware). |
| **Treasurer / finance (club)** | `club-committee`, `registrar` | `reports.financial`, `club.fees`, `registration.payments` (see `ROLE_DEFINITIONS`). Often **committee** handles governance-level money; **registrar** handles day-to-day payments. |
| **Treasurer / finance (association)** | `assoc-committee`, `assoc-registrar` | Association fee policy + reporting; `association.fees`, `reports.financial`. |
| **Competition manager** | `association-admin` | `competitions.manage` — season/league competitions via `/api/admin/competitions` (API-enforced). Dedicated `/admin/competitions` UI may be added later. |
| **Umpire coordinator** | `association-admin` (today) | No separate coordinator role yet; allocations/public competition pages evolve under Epic F. **`umpire`** is a limited staff role for officials themselves. |
| **Coach coordinator** | `assoc-coach`, `coach` | Representative and team coaching access; nominations/rosters per `selection.*` / `team.roster`. |
| **Media / communications** | `media-marketing` | **News** and read access per `ROLE_DEFINITIONS`; also in association staff sets for representative where relevant. |
| **Committee (read-heavy)** | `assoc-committee`, `club-committee` | Strong **view** + **reports**; write access is narrower than `association-admin` / `club-admin` (see permission lists in code). |

When adding a new screen, update **`menuConfig.ts`** (visibility), **`lib/auth/adminRouteAccess.ts`** (URL gate), and **`ROLE_DEFINITIONS`** (API `requirePermission`).

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
  - Update **`lib/auth/adminRouteAccess.ts`** (and run `__tests__/lib/auth/adminRouteAccess.test.ts`) — `middleware.ts` imports it for edge checks.
  - Update `app/(admin)/admin/global-config/menuConfig.ts` for sidebar/dashboard visibility.

See also **`docs/domain/ARCHITECTURE.md`** for how public site, admin UI, middleware, and APIs fit together.

