# MongoDB Schema Reference

This document is the **single source of truth** for field naming conventions
across all MongoDB collections.  Always refer here before adding new fields.

---

## Field naming rules

| Rule | Example |
|------|---------|
| Entity IDs use `{entity}Id` camelCase | `memberId`, `clubId`, `teamId` |
| Clubs are the exception — they use `id` (legacy, not `clubId`) | `{ id: "CHC" }` |
| Timestamps are ISO strings stored as `createdAt` / `updatedAt` | `"2026-01-15T08:00:00.000Z"` |
| Nested objects group related fields | `personalInfo`, `contact`, `address` |
| Arrays of strings for multi-value role/type fields | `roles: ["player", "coach"]` |
| MongoDB internal `_id` is never used in application queries | Use `memberId`, `userId`, etc. |

---

## Collections

### `clubs`

> ⚠️ **Naming quirk**: clubs use `id` (not `clubId`) as their primary application key.
> This is a legacy decision. All new code must use `{ id: clubId }` when querying clubs.

```
{
  _id:                 ObjectId   — internal MongoDB only, never used in app queries
  id:                  string     — PRIMARY KEY  e.g. "CHC"
  slug:                string     — URL key      e.g. "commercial-hc"  ← prefer for URLs
  name:                string     — display name e.g. "Commercial Hockey Club"
  shortName:           string     — abbreviation e.g. "Commercial"
  active:              boolean
  parentAssociationId: string     — FK → associations.associationId
  region:              string
  state:               string
  colors: {
    primary:           string     — hex colour
    secondary:         string
    accent?:           string
  }
  address: {
    street?:  string
    suburb?:  string
    state?:   string
    postcode?: string
    country?: string
  }
  contact: {
    email?:   string
    phone?:   string
    website?: string
  }
  memberSequence:      number     — auto-increment counter for CHC-0000001 IDs
  createdAt:           string     — ISO datetime
  updatedAt:           string
}
```

**Legacy field**: `title` — pre-migration JSON data used `title` instead of `name`.
The application still falls back to `title` in `GET /api/clubs/[clubId]`.
Migrate any remaining documents with: `db.clubs.updateMany({ title: { $exists: true }, name: { $exists: false } }, [{ $set: { name: "$title" } }])`

---

### `members`

```
{
  _id:            ObjectId
  memberId:       string     — PRIMARY KEY  e.g. "CHC-0000001"
  clubId:         string     — FK → clubs.id  (note: clubs use `id`, not `clubId`)
  associationId:  string?    — FK → associations.associationId

  personalInfo: {
    salutation?:  string
    firstName:    string
    lastName:     string
    displayName?: string
    dateOfBirth?: string     — ISO date "YYYY-MM-DD"
    gender?:      string
    photoUrl?:    string | null
  }

  contact: {
    email?:          string
    primaryEmail?:   string  — same field, two names exist in DB (migrate to `email`)
    phone?:          string | null
    mobile?:         string | null
    emergencyContact?: {
      name:          string
      relationship?: string
      phone:         string
      email?:        string | null
    }
  }

  address?: {
    street?:   string
    suburb?:   string
    state?:    string
    postcode?: string
    country?:  string
  }

  membership?: {
    status?:          string   — "Active" | "Inactive" | "Suspended"
    membershipTypes?: string[]
    joinDate?:        string
    expiryDate?:      string | null
    renewalDate?:     string | null
  }

  roles?:  string[]   — e.g. ["player", "coach"]
  teams?:  string[]   — teamId references
  userId?: string | null  — FK → users.userId (if they have a portal account)
  medical?: object | null
  notes?:  string | null

  auth?: {
    username:      string  — auto-generated e.g. "sjohnson001"
    passwordHash:  string  — bcrypt hash
  }

  createdAt:  string
  updatedAt:  string
  createdBy:  string
  updatedBy:  string | null
}
```

**Known inconsistency**: `contact.email` and `contact.primaryEmail` both exist in
the database for legacy reasons. New code should write to `contact.email`.
Queries that need to be email-safe should use `$or`:
```js
{ $or: [{ "contact.email": email }, { "contact.primaryEmail": email }] }
```

---

### `users`

Admin/staff portal accounts (separate from member portal accounts).

```
{
  _id:       ObjectId
  userId:    string     — PRIMARY KEY  e.g. "user-abc123"
  email:     string     — unique login email
  username?: string     — optional display username
  passwordHash: string  — bcrypt
  firstName: string
  lastName:  string
  role:      string     — "super-admin" | "association-admin" | "club-admin" | ...
  clubId?:   string     — FK → clubs.id
  associationId?: string
  status:    string     — "active" | "inactive" | "suspended"
  forcePasswordChange?: boolean
  createdAt: string
  updatedAt: string
}
```

---

### `associations`

```
{
  _id:                 ObjectId
  associationId:       string   — PRIMARY KEY  e.g. "bha"
  code:                string   — short code   e.g. "BHA"
  name:                string
  fullName:            string
  parentAssociationId?: string  — FK → associations.associationId
  level:               number   — 0=National, 1=State, 2=City, 3=Region
  hierarchy:           string[] — ancestor IDs from root down
  status:              string   — "active" | "inactive"
  region?:             string
  state?:              string
}
```

---

### `teams`

```
{
  _id:    ObjectId
  teamId: string   — PRIMARY KEY  e.g. "team-chc-u12-2026"
  clubId: string   — FK → clubs.id
  name:   string
  ageGroup: string
  season:   string
  roster: TeamRosterMember[]
  ...
}
```

---

### `password_reset_tokens`

Created by `POST /api/auth/forgot-password`. Auto-deleted by MongoDB TTL index.

```
{
  _id:        ObjectId
  email:      string   — the account email
  token:      string   — 64-char hex (randomBytes(32))
  collection: string   — "users" | "members"
  accountId:  string   — the userId or memberId
  expiresAt:  Date     — TTL index field (auto-deleted after expiry)
  createdAt:  Date
  used:       boolean
  usedAt?:    Date
}
```

TTL index: `{ expiresAt: 1 }, { expireAfterSeconds: 0 }`

---

## Cross-collection FK summary

```
members.clubId          → clubs.id             (not clubs.clubId!)
members.associationId   → associations.associationId
members.userId          → users.userId
teams.clubId            → clubs.id
users.clubId            → clubs.id
clubs.parentAssociationId → associations.associationId
associations.parentAssociationId → associations.associationId
```

---

## Recommended indexes

```js
// clubs
db.clubs.createIndex({ slug: 1 }, { unique: true })
db.clubs.createIndex({ id: 1 }, { unique: true })

// members
db.members.createIndex({ memberId: 1 }, { unique: true })
db.members.createIndex({ clubId: 1 })
db.members.createIndex({ "contact.email": 1 })
db.members.createIndex({ "auth.username": 1 }, { sparse: true })

// users
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ userId: 1 }, { unique: true })

// associations
db.associations.createIndex({ associationId: 1 }, { unique: true })

// password_reset_tokens
db.password_reset_tokens.createIndex({ token: 1 })
db.password_reset_tokens.createIndex({ email: 1 })
db.password_reset_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```
