# Provider snapshot model — no invented revisions

PAY-P0-01 ORDERED_REVISION remains unchanged. New evidence fields use omitempty so old persisted canonical fingerprints stay byte-compatible; a golden regression test checks the original event serialization/hash. Each reserved order persists its selected evidence_model; modes cannot be substituted across orders.

Razorpay uses CAPTURE_REFUND_LATTICE_V1 with Revision=0, explicitly not an authoritative counter. Only current server-to-provider snapshots enter this model. Callback events are notifications, not payment states. A deterministic hash identifies the normalized authoritative snapshot, so identical snapshots are durable no-ops without invented time/counter ordering.

| Provider evidence | Result |
|---|---|
| Created, authorized or failed attempt with no captured payment | PENDING; no grant |
| Exactly one captured payment, exact values/IDs/receipt and order paid | COMPLETED; one source-order grant |
| Verified processed full refund equal to captured amount | REFUNDED; revoke source grant atomically |
| Partial/pending refund inconsistency | provider_review_required=true; revoke/suspend source grant; API projects PAYMENT_REVIEW |
| Multiple captures, truncated/contradictory/unknown state or mismatched values | Reject for reconciliation |
| Reversal/dispute | Unsupported; no fabricated reversal mapping; requires approved current contract |

The review flag separates fulfillment hold from the existing payment status enum. This preserves earlier migration reruns and original state-machine tests. A hold is conservative and terminal for access until full refund or a separately approved manual resolution policy. No public/manual regrant route exists.

Lattice: PENDING->PENDING/COMPLETED/REFUNDED/REVIEW; COMPLETED->COMPLETED/REFUNDED/REVIEW; REVIEW->REVIEW/REFUNDED; REFUNDED->REFUNDED only. Old completion/pending cannot reverse refund/hold or erase a grant. Repeated already-processed snapshot can return a no-op in terminal state but never mutate it. Independent purchases retain their own grants. Existing active access query also excludes review flag.

Migration005 adds durable create-attempt intent, evidence_model and review flag only. No legacy tables/rows dropped, no production migration. Earlier001/003/004 remain intact. Role permissions remain table-level existing least-privilege DML; startup readiness now requires005 columns and fails closed if absent.
