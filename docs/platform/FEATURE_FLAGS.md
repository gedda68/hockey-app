# Feature flags (competition / tournament)

Server-side opt-out toggles for higher-risk operations. **Default: all features on** (no env set). Set the variable to `true`, `1`, or `yes` to **disable** the behaviour.

| Env variable | Effect when disabled |
|--------------|----------------------|
| `FEATURE_DISABLE_LEAGUE_FIXTURE_BULK_REPLACE` | `POST /api/admin/season-competitions/[id]/fixtures/generate` rejects `{ "replace": true }` with **403**. |
| `FEATURE_DISABLE_REP_TOURNAMENT_FIXTURE_REPLACE` | `POST /api/admin/tournaments/[id]/fixtures` rejects `{ "replace": true }` with **403**. |
| `FEATURE_DISABLE_REP_TOURNAMENT_KNOCKOUT_GENERATE` | `POST` with `{ "mode": "knockout_from_draw" }` returns **403**. Pool round-robin generation is unchanged. |

Use in staging/production when you want to block destructive regeneration or knockout automation without a deploy.
