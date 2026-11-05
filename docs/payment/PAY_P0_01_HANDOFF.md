# PAY-P0-01 handoff

Starting local SHA08c84ac; reconciled latest-main base31dc6dff42b31045e27327c8133cde09baff8fca. Branch fix/pay-p0-01-durable-payment-integration. Implementation `291aed20640839e015ce9f4ce4675e7d92600093`; documentation commit follows (use git log -1 for final review SHA). No merge/deploy/activation. Original branches and existing security/calculation behavior preserved.

## Milestones / release decision

| Milestone | Decision |
|---|---|
| DURABLE_STORAGE_IMPLEMENTED | VERIFIED locally: additive migrations, constraints, orders/events/grants/audit, state/concurrency/crash/restart and actual TLS PG |
| APPLICATION_INTEGRATION_TESTED | VERIFIED with controlled test adapters: actual Node->mTLS->Go->PostgreSQL, ownership/status/access, completion/duplicate/refund/revocation; both UI builds remain disabled |
| PROVIDER_SANDBOX_VERIFIED | NOT VERIFIED / BLOCKED_EXTERNAL_DEPENDENCY: no selected provider/account/signing spec/sandbox |
| PRODUCTION_PAYMENT_ENABLED | DISABLED / NO-GO: no real identity/provider/catalog/production infrastructure approval |

Engineering foundation is implemented and tested. No real financial transaction or production checkout is enabled. Production payment and overall Phase1 release remain NO-GO. ProductionReady adapter assertions are not sandbox evidence.

## Exact next dependencies

Owner must select actual identity/session/customer ownership system and claims policy; payment brand/account/environment, raw signing/replay protocol and authoritative revision/retry/refund semantics; approve product/version/capability/price/currency/access-expiry/partial-refund policy; supply production PostgreSQL/private host/CA/roles/secret bindings and reviewed migration window; approve internal CA/SAN/cert rotation/provider egress, backup/restore RPO/RTO, retention/deletion/audit policy. Configure secrets in approved storage, not chat. Then implement reviewed adapters and bootstrap in a separate change, sandbox full lifecycle, stage migration/restore/TLS/role testing, and obtain explicit activation/deployment approval. Do not remove refusal handlers or introduce a fake provider to get green routes.

## Contracts to preserve

Opaque VerifiedEvent; one authority/no Node SQL; exact integer snapshot; stable customer retry key and provider idempotency; provider/account/environment scope; authoritative ordered revisions; revoked terminal/no replay regrant; independent source grants; active+unrevoked+unexpired query; no browser callback unlock; mTLS plus bearer re-verification; no test adapter/config switch in production; no startup migration; original Phase1 chart/privacy unavailable boundaries.

Reproduce commands and exact results are in PAY_P0_01_TEST_REPORT.md. Full gate requires npm ci plus Docker/OpenSSL; bare go test without isolated DB/Node skips integration tests and is insufficient. Do not use production DSN with fixtures; helper refuses database name other than phase1_test. No live provider webhook or worker starts in current binaries.

## Implementation commits

-2abbf3e: authoritative durable lifecycle/schema/evidence/access/tests.
-73d827d: Go/Node mTLS and React preparation; no public activation.
-bec3647: TLS test/restart/CI, migration tooling and deployment specification.
-291aed2: non-root migration packaging fix, actual TLS execution and CI readability/refusal guard.

## Every implementation file and purpose

| File | Why |
|---|---|
| .env.example | Secret-compatible configuration specification; no activation or price defaults. |
| .github/workflows/ci.yml | Run payment web/checkout contract tests. |
| .github/workflows/payment-audit-pipeline.yml | Install Node dependencies for actual cross-service full gate. |
| Dockerfile.payment-migrations | Explicit operator migration image; no startup DDL. |
| Dockerfile.web | Copy the new server boundary into production runtime. |
| backend/cmd/server/main.go | Dependency-injected payment handlers and conditional DB readiness; default nil disabled. |
| backend/internal/payment/application.go | Validated dependencies, idempotent snapshot order lifecycle, ownership/access and verified provider application. |
| backend/internal/payment/application_test.go | TLS/PG/concurrency/matrix/crash/security/full Node-Go fixtures; test adapters only. |
| backend/internal/payment/catalog.go | Strict reviewed server catalog loader, no illustrative live price. |
| backend/internal/payment/database.go | Secret DSN, verify-full, pooling/deadlines, migration readiness and close. |
| backend/internal/payment/http.go | Authenticated bounded handlers, mutual TLS/SAN guard and private listener constructor. |
| backend/internal/payment/reconcile.go | Bounded durable recovery, leases/backoff/audit and actual internal counts. |
| backend/internal/payment/store.go | Durable inbox, opaque evidence, revision state machine, atomic grant/revoke/audit. |
| backend/internal/payment/store_test.go | Preserve legacy invariants under new schema/seal and full application restart markers. |
| database/migrations/003_payment_application.sql | Transactional additive order/event/grant/audit expansion; legacy-sensitive NOT VALID constraints. |
| database/migrations/004_payment_validate.sql | Explicit staged validation after preflight. |
| database/payment_runtime_role.sql | Separate least-privilege NOLOGIN group template, no supplied login/password. |
| database/schema.sql | Label inactive legacy payment table; retain data. |
| deploy/kubernetes/payment-isolation.yaml | Future private workload isolation; no active workload/secret/egress opened. |
| docker-compose.dev.yml | Keep persistent local tools separate from disposable tests/production TLS. |
| docker-compose.yml | Document disabled default and future reviewed TLS/secret requirements. |
| frontend/src/components/CheckoutModal.tsx | Mirror safe checkout model. |
| frontend/src/engine/paymentClient.ts | Mirror prepared API/status model. |
| schema.sql | Label inactive legacy payment table; retain data. |
| scripts/migrate-payments.sh | Explicit reviewed operator action with secret libpq service and forced TLS. |
| scripts/test-phase1-go.sh | TLS disposable PG, fresh dual-module/race/vet, Node22 cross-service and actual restart/cleanup. |
| server.ts | Mount disabled-by-default prepared payment boundary. |
| server/paymentBoundary.ts | Verified session, fixed path/body mTLS transport, timeouts/bounds/error/response allowlists. |
| src/components/CheckoutModal.tsx | Use shared status model, preserve unavailable UI and no data collection. |
| src/engine/paymentClient.ts | Same-origin API preparation and all checkout states; no local authorization. |
| tests/payment/boundary.test.ts | Twelve security/transport/UI contracts with actual TLS certificates. |
| tests/payment/e2e-client.mjs | Go-invoked actual Node->Go lifecycle, fixture-only control routes. |
| tsconfig.json | Include server adapter in strict application typecheck. |

| README.md | Link the new payment foundation and disabled release status. |

## Documentation/evidence files

PAY_P0_01_BASELINE.md records reconciliation. ARCHITECTURE explains boundaries. SCHEMA_AND_MIGRATIONS covers DDL/role/rollback/retention. STATE_MACHINE records all transitions. API_CONTRACTS specifies actual disabled and intended authenticated contracts. SECURITY_REVIEW records controls/residuals. TEST_REPORT records exact execution. DEPLOYMENT_RUNBOOK specifies owner-controlled operation. This HANDOFF records continuity/file inventory. docs/remediation/CFRS_MASTER_TRACKER.md is appended with the four separate milestones. evidence/ contains sanitized test/build/smoke/browser/config/sweep output; no generated private keys/DB credentials.
