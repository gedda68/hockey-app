# Multi-club members, transfers, and fee / registration authority

Baseline rules for **A5** (hierarchy epic). Implementation in APIs and registration flows should converge on these principles.

## Membership

- A **person** (member record) may hold **multiple club memberships** over time or concurrently, each with its own season, category, and role assignments.
- **Primary club** for a season is the club through which the member registers for **club-level** products (training, local league). It is stored explicitly on the registration / membership record — not inferred only from `clubId` on the user session.
- **Secondary / visiting** participation (e.g. fill-in, academy) is modeled as additional membership links or event-level entries, not duplicate member identities.

## Transfers

- A **transfer** moves the member’s **primary club affiliation** for a given season (or from a defined effective date). It must:
  - Close or supersede the prior club’s season registration for that competition context where rules require it.
  - Preserve **history** (audit): previous club, dates, approver, and any financial clearance flags.
- **Transfer windows** are association-defined (dates + who may approve: outgoing club, incoming club, association registrar).

## Which association’s fees and registrations apply

- **Club fees** are owed to the **member’s primary club** for club products.
- **Association fees** (e.g. capitation, affiliation) are owed to the **association that owns the competition** the member is entering:
  - **Local league** → usually the **city/regional** association aligned with `SeasonCompetition.owningAssociationId`.
  - **Representative / state pathways** → the **registering association** that operates the nomination or championship product (may differ from the club’s day-to-day city association when state/national bodies collect).
- **Stacking order** (association then club, or the reverse) is a **product configuration** per fee rule — see future **H1** fee stack; until then, document the intended order per product in fee metadata.

## Enforcement (direction of travel)

- Mutating APIs must validate **`(user, associationId | clubId | resource)`** from the **server session + database-backed resource**, not from client-supplied org IDs alone (**B3**).
- Registration endpoints must attach **owningAssociationId** / **clubId** from authoritative competition and club records after lookup.
