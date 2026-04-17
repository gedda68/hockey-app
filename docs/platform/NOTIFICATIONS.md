# Notifications (Epic J1)

Email uses **Resend** via `lib/email/client.ts` (`RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`).

## Shipped flows

| Trigger | Mechanism |
|---------|-----------|
| **Umpire assignment** | `notifyAssignedUmpires` on league fixture PATCH + `lib/officiating/umpireAssignmentNotify.ts`. |
| **Fixture schedule / venue change** | League fixture PATCH: `notifyScheduleChange: true` with optional `scheduleChangeNotifyEmails: [...]` (up to 10). Sends only if the fixture is **published** after the patch and **time, venue, or address** changed. **Emails** go to the admin list **plus** fans who follow either team (deduped). **Push** goes to fans with push enabled and a stored subscription. Admin list may be empty (fans-only). |
| **Payment due reminder** | `POST /api/admin/members/[memberId]/notify-fee-due` (`registration.manage`, member in scope). Optional JSON `{ "note": "..." }`. |

## SMS

Not implemented. For Twilio or similar, add a thin `lib/sms/client.ts` and call from the same hooks behind a feature flag.
