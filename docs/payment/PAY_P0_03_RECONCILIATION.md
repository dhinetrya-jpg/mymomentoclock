# PAY-P0-03 — Reconciliation

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

One-at-a-time PostgreSQL SKIP LOCKED claims use random lease tokens. Defaults: batch20,8 consecutive failures, minimum age1min, job deadline30s, lease45s, poll15s, jittered exponential retry capped24h. Invalid bounds reject. Success resets failure count; exhaustion records DEAD_LETTER plus REVIEW_REQUIRED audit. Worker is disabled until reviewed config enables it.

Jobs use authenticated provider state and original safe state machine, recover receipt acknowledgement loss and replay idempotently. Pending risk holds precede captured snapshots. Entitlement mismatches alert instead of blind regrant. Token-checked recording and bounded independent cancellation context preserve durable recovery. Lease expiry permits process recovery.

Disposable PostgreSQL tests cover concurrency, retry/dead-letter, rollback and database restart. Provider outage leaves pending/unavailable status. Clearing dead-letter/financial correction needs a separately authorized audited procedure; no unsafe public/admin override exists.
