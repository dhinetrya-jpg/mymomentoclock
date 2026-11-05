# Authoritative snapshot state machine

Only justified domain states are supported: CREATED (local reservation), PENDING (provider association), COMPLETED, FAILED, CANCELLED, EXPIRED, REFUNDED, REVERSED. AUTHORIZED and PARTIALLY_REFUNDED are unsupported until provider/product policy is approved.

| Current state | Allowed authoritative state at same/newer revision |
|---|---|
| CREATED | No event transition; bind matching idempotent provider order first |
| PENDING | PENDING, COMPLETED, FAILED, CANCELLED, EXPIRED, REFUNDED, REVERSED |
| FAILED | FAILED, COMPLETED, CANCELLED, EXPIRED, REFUNDED, REVERSED |
| COMPLETED | COMPLETED, REFUNDED, REVERSED |
| CANCELLED | CANCELLED only |
| EXPIRED | EXPIRED only |
| REFUNDED | REFUNDED only |
| REVERSED | REVERSED only |

Additional rules override table: identical event ID+fingerprint already processed is a no-op; same ID/different evidence rejects. Lower revision is durably IGNORED after identity/value checks, never applied. Equal revision with different state rejects. Newer FAILED->COMPLETED is allowed only because a verified authoritative state supersedes failure for the SAME payment binding; no timestamp/arrival-order assumption. COMPLETED->COMPLETED does not insert another grant. Terminal states cannot reactivate, even with higher revision. One payment ID is bound to one order per provider/account/environment. Initial pending/failure/cancel/expiry may lack payment ID; completed/refunded/reversed cannot. An already bound payment ID cannot be changed.

Refund/reversal can arrive before local completion: apply authoritative terminal state with no grant. Later stale completion is ignored. Refunding/reversing a completed purchase revokes its grant in the same transaction. New event IDs repeating terminal state do not grant or increment revocation revision again. Partial refunds fail closed; no unapproved prorated policy. PENDING after completed is forbidden. Failure cannot erase a completed grant even when its revision is newer. A provider contradiction is rejected and requires operator/provider reconciliation, not guessing.

Event fingerprint includes normalized typed evidence, stable provider timestamp and ordered revision, not a reconstructed provider signature. Webhook signature verification still uses exact original bytes through the selected adapter. Authoritative snapshots get deterministic state/order/revision IDs. Original signed callbacks retain their independent IDs/fingerprints, so retries after a newer provider snapshot do not fabricate a conflict by changing the original evidence.

Tests cover the121-pair pure model matrix and72 durable state pairs, plus stale failures, failed-then-completed, late completion after refund, concurrent completion/refund,20 duplicates and20 conflicting same-ID deliveries. Transaction fault injection proves order/grant atomicity; durable inbox can remain RETRY after a rollback. Post-commit acknowledgement loss retries without another grant. See test report for actual outcomes.
