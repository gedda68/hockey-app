# Compliance & operations (Epic J4)

## Member data export

- **`GET /api/admin/members/[memberId]/data-export`** — requires `member.view` and normal member route scope. Returns JSON: member profile (password hashes stripped), recent **`payments`** summaries, and **`club-registrations`** rows. Intended for **subject access** / portability requests.

## Erasure / deactivation

- **`DELETE /api/admin/members/[id]`** (existing) performs a **soft deactivate** (`membership.status: Inactive`). Hard delete and full anonymisation require a documented legal process, DB-wide reference checks, and are **not** automated here.

## Backups

- Use **MongoDB Atlas** continuous backup / point-in-time restore, or your host’s volume snapshots. Document RPO/RTO in your runbook.

## Monitoring

- Track app errors (e.g. OpenTelemetry, Sentry, or platform logs), API **5xx** rates, and Resend bounce/complaint rates for notification health.

## Calendar feeds

- Public league iCal: **`GET /api/calendar/league?seasonCompetitionId=...`** (see Epic J2). Subscribe in Google Calendar / Outlook via that URL.
