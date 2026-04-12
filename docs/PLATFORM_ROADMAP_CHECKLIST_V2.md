# Platform roadmap V2 — portal ownership, benchmarks, and next work

This document **supersedes the narrative scope** of `PLATFORM_ROADMAP_CHECKLIST.md` for planning purposes: it adds a **canonical responsibility model** (who owns which portal content and competitions), a **gap analysis** against the current codebase, and a **benchmark** against large federation sites (e.g. NRL, AFL). Use the original checklist for **what is already shipped** (`[X]` items); use **V2** for **what to do next** and **policy alignment**.

**How to use:** Track V2 items as `[ ]` → `[x]`. Epics are numbered **L** (levels & tenancy), **P** (product/public), **T** (technical debt), **B** (benchmark-driven), plus cross-references to existing epics A–K where relevant.

---

## 1. Canonical portal responsibility model

The platform hosts **many independent portals** (per association subdomain and per club). Each portal should surface **only** content and competitions that belong to that tenant, except where the product explicitly defines **federation syndication** (e.g. national news mirrored on state sites).

### 1.1 Business tiers (your definitions)

| Tier | Role | Representative & development football | Championships / titles | Club–club league (many ages/divisions) |
|------|------|----------------------------------------|--------------------------|----------------------------------------|
| **Level 0** | National body | National rep teams, national academy/development, national pathways | National championships | *Not* primary operator of local club leagues |
| **Level 2** | State body | State rep teams, state academy/development | State championships / titles | *Not* primary operator of local club leagues (unless product chooses otherwise) |
| **Level 4** | Regional / metro / district association (“feeder” body under state) | Rep and development teams at this level where applicable | State-level titles **hosted or governed** at this tier as per your rules | **Primary** operator of regular season competitions between **member clubs** (multi age group, multi division) |
| **Club** | Member club | Club teams that **enter** Level 4 competitions | Club finals / internal grades only | Runs **its** teams, staff, member comms; **does not** run the association league |

> **Note on numbering:** Product and docs should use **one** canonical mapping from these business tiers to the stored `associations.level` integer. Today the codebase mixes comments (e.g. schema vs admin list filters). **V2 action:** define a single table in `docs/domain/CANONICAL_GRAPH.md` and enforce it in admin UI + APIs (see **L1**).

### 1.2 Content ownership matrix (target state)

| Asset / feature | Level 0 | Level 2 | Level 4 | Club |
|-----------------|---------|---------|---------|------|
| Public **news** articles | National portal only (unless syndicated) | State portal only | Association portal only | Club portal only |
| **Photos / galleries** (hero, albums) | National | State | Association | Club |
| **Staff** (committee, contacts, public directory) | National | State | Association | Club + team staff on rosters |
| **Teams** listed publicly | National rep squads if modeled | State rep | Club teams in **this** association’s comps | **This** club’s teams |
| **Season league** (`SeasonCompetition`) | Only if product allows national league | Only if product allows state-wide league | **Yes** — primary home for club vs club | **No** — club enters; association owns |
| **Tournaments** (rep, carnival) | National events | State events | Local / regional / state-qualifying as configured | Host role possible (`hostType: club`) |
| **Fees / registration** | National fee rules in stack | State fee rules | Association + club stack | Club portion |

### 1.3 Current codebase gaps (high level)

- **`news` collection** — No `associationId` / `clubId` / `portalScope` on types or public query (`lib/data/publicNews.ts`, `app/api/news/route.ts`, admin `app/api/admin/news/route.ts`). **All portals risk showing the same news.**
- **Home gallery** — Platform-level hero imagery (`lib/data/homeGallery.ts`, admin home-gallery API) is not clearly keyed per tenant; **risk of one gallery for every subdomain.**
- **Association `level`** — `lib/types/roles.ts` maps `0–2` to national/state/city; `app/api/admin/associations/route.ts` string filter maps `State` → `2`, which **does not match** `numericLevelToString(1) === "state"`. **Align before** building level-gated features.
- **Competition ownership** — Epic C enforces owning association for season leagues; **confirm** UI defaults create season comps only for **Level 4–equivalent** associations (policy + optional API guard).

---

## 2. Benchmark: NRL.com / AFL.com.au–class expectations

Federation-grade sites optimise for **repeat visits**, **mobile**, and **clear match-day journeys**. Use as **aspirational** targets (not all are in scope short term).

- [ ] **B1** **Draw / ladder / results hub** — Single place for “this round”, filters by team/club, deep links to match centre. *We have:* league hubs, fixtures, standings APIs. *Improve:* match-centre style page per fixture (lineups, events timeline, venue map), spoiler-free option.
- [ ] **B2** **Video and rich media** — Highlights, embeds, club channels. *We have:* images in news/gallery. *Improve:* optional video URLs per article, oEmbed, or curated YouTube playlists per tenant.
- [ ] **B3** **Identity / logged-in fan** — Tips, favourites, alerts. *We have:* member portal baseline. *Improve:* “follow my team(s)” → push/email from Epic J patterns.
- [ ] **B4** **Pathways narrative** — Clear “Play”, “Coach”, “Umpire”, “Volunteer” entry points per **tenant** (not only global). Tie to registration and role-request flows.
- [ ] **B5** **Sponsors & partners** — Footer and dedicated partners strip per portal using existing branding config.
- [ ] **B6** **Accessibility & performance** — WCAG contrast, keyboard nav on drawers, LCP for hero images, `prefers-reduced-motion` for carousels.
- [ ] **B7** **SEO + sharing** — Per-tenant sitemaps, canonical URLs on subdomains, consistent `og:image` per article/club.
- [ ] **B8** **Official app parity** (long term) — Deep links from app to web match pages; iCal already started (Epic J2).

---

## Epic L — Levels, tenancy, and data isolation

- [ ] **L1** **Single source of truth for `association.level`** — Document business tier ↔ integer mapping in `docs/domain/CANONICAL_GRAPH.md`; fix admin `GET` level filter string↔number drift (`app/api/admin/associations/route.ts`); align `AssociationSchema` comments with `numericLevelToString`.
- [ ] **L2** **Tenant-scoped news** — Add `scopeType: 'platform' | 'association' | 'club'` + `scopeId`; migrate existing rows to `platform` or default association; `getPublicNewsItems(limit, { associationId?, clubId? })`; public `/api/news` respects host/subdomain tenant (`lib/tenant`, `PublicTenantContext`); admin news list/create filtered by user’s resource access; optional **syndicate up** (club post visible on parent association — off by default).
- [ ] **L3** **Tenant-scoped media gallery** — Same pattern as L2 for home hero / albums; admin upload UI scoped to current tenant.
- [ ] **L4** **Portal RBAC for media** — Extend `media-marketing` (or split roles) so association media users **cannot** edit another association’s news/gallery; club media **cannot** touch parent association content.
- [ ] **L5** **Competition creation guardrails** — Wizard or API validation: “primary club league” `SeasonCompetition` may only be created under associations whose level is **in the allowed set** (e.g. Level 4–equivalent); national/state **tournaments** and **rep** comps allowed at L0/L2 with different templates.
- [ ] **L6** **Cross-tenant leakage audit** — Sweep public APIs (`/api/news`, `/api/fixtures`, `/api/public/*`, calendars) for queries missing `associationId` / `clubId` when running on a tenant host; add integration tests per subdomain.

---

## Epic P — Product & public experience

- [ ] **P1** **Association hub content sections** — On `/associations/[id]`, group: Rep & pathways | Championships | Local league | News (scoped) | Contacts — driven by level and configured features.
- [ ] **P2** **Club hub** — Prominent “Teams”, “News”, “Join”, “Fixture list (my teams)” using tenant-scoped data only.
- [ ] **P3** **Fixture match centre** — One URL per league fixture with narrative layout (teams, time, venue, result, link to stats if present).
- [ ] **P4** **Staff / committee pages** — Public pages from `AssociationPosition` / club committee data with contact opt-in mirroring team staff rules (Epic G).
- [ ] **P5** **Search** — Tenant-scoped search across news, teams, clubs (avoid global Mongo text search without tenant filter).

---

## Epic T — Technical debt & platform hygiene

- [x] **T1** **`app/api/auth/login/route.ts` build typing** — Avoid untyped `_id` in `updateOne` (use stable filter on `clubId`/`id`). *Shipped in V2 pass.*
- [ ] **T2** **Next.js middleware → proxy migration** — When ready, migrate from deprecated middleware (`middleware.ts` deprecation warning) to the supported replacement per Next 16+ guidance.
- [ ] **T3** **Consistent Mongo client usage** — Prefer shared `clientPromise` in routes that still spin up `new MongoClient` (e.g. some news routes) for connection pooling.
- [ ] **T4** **Observability** — Structured logging for tenant resolution failures; metrics on public API 404/403 by host.

---

## Epic M — Migration & content ops

- [ ] **M1** **Data migration script** — Backfill `news` and gallery documents with `scopeType`/`scopeId`; default platform scope for legacy items on main domain only.
- [ ] **M2** **Admin UX** — Tenant indicator in admin shell (“Editing: BHA” / club name); block save if resource ID does not match session scope.

---

## Suggested priority order

1. **L1 + L6** — Correct level semantics and stop cross-tenant data leaks (news/gallery/public APIs).
2. **L2 + L3 + L4** — Full portal-appropriate content ownership.
3. **L5 + P1 + P2** — Align competition and hub UX with business tiers.
4. **P3 + B1 + B6** — Match-day and quality bar.
5. **B2–B5, P4–P5, T2–T4** — Federation polish and hardening.

---

## Traceability to V1 checklist

| V1 epic | V2 relationship |
|---------|------------------|
| A — Hierarchy | Extend with **L1** level semantics |
| B — RBAC | Extend with **L4**, **L6** |
| C — Competitions | Extend with **L5** |
| I — Public site | Extend with **P***, **B***, tenant-scoped news/gallery |
| J — Integrations | Supports **B3**, **B8** |
| K — Quality | **L6**, **T4** add automated guarantees |

---

*Last updated: 2026-04-12 — V2 introduces portal ownership model, benchmark epics, and tenancy backlog; V1 checklist remains the record of completed baseline epics.*
