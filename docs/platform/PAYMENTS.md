# Payments gateway (Epic J3)

## Mode

`lib/payments/paymentGateway.ts` reads **`PAYMENT_GATEWAY_MODE`**:

| Value | Behaviour |
|-------|-----------|
| `simulate` | Members may call **`POST /api/member/payments/simulate`** to mark demo/test items paid (same DB writes as today’s dev flow). |
| `stripe` | Simulate endpoint returns **403** — use Stripe Checkout / Payment Element + webhooks to create/update `payments` and related records (integrate in your deployment). |
| `none` | Simulate disabled; use when no self-service payment path is exposed yet. |

**Default:** `simulate` when `NODE_ENV=development`, otherwise **`none`** (dummy payments off in production until you set an explicit mode).

## Consistency

- All products (registration fees, role-request fees, tournament allocations) should converge on the same **`payments`** collection and statuses once Stripe is wired.
- After a real charge succeeds, perform the **same updates** that `simulate` does today (payment status, role-request advancement, etc.) from a **verified webhook** only.
