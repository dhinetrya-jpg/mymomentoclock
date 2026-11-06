# PAY-P0-03 — Test Matrix

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

| Layer | Coverage |
|---|---|
| Node | boundary/pay02/pay03 + phase1: cookie/CSRF/Origin, ownership, logout/delete, environment and26 blocked gates |
| Calculations | existing integrity suite via asset loader |
| Go pure | JWT negative matrix, commercial catalog, release hashes/signatures/expiry, provider prefix/rotation/disputes |
| Real PostgreSQL | PAY02→006, durable orders/sessions/grants, idempotency, concurrency, rollback, revoke/expire/review, leased retry/dead-letter |
| Cross-service | actual Node→mTLS→Go→PostgreSQL→provider HTTP fixture, two accounts,20 duplicate concurrent requests/one provider order |
| Restart | PostgreSQL container restart: ledger, receipt recovery, opaque session recovery |
| Browser commercial |375/1280: auth-required, callback vs server grant, refund, review, recovery409, cancel/retry; isolated fake SDK only |
| Browser existing | phase1 desktop/mobile production regression |
| Artifacts | native/web defaults, separate commercial target/refusal and migration006 packaging |
| Genuine provider | BLOCKED_EXTERNAL_DEPENDENCY, no credentials/approval/results |
| Actual production | NOT_TESTED: no deployment, migration, live charge, deployed monitoring or backup restore |

Ephemeral test signing keys/public IDs are not release approval artifacts. Fixture transactions are never genuine sandbox verification. Exact results/limitations are in TEST_REPORT.
