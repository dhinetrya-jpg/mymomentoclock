# PAY-P0-02 handoff / independent review

Branch `fix/pay-p0-02-provider-sandbox-integration`, base069587b0d9e4c273bf87b7b9c51431595aebc5b8, functional implementation `e22a04b4f57e450fd008677d3faac72e0784fb3d`. Code commits cd9492a (provider/domain/durable recovery) and e22a04b (web/official checkout preparation). Documentation/delivery commits follow. No main merge, deployment, environment publication or production migration.

## Separate milestones

| Milestone | Status |
|---|---|
| PROVIDER_ADAPTER_IMPLEMENTED | Provisional disabled Razorpay test adapter implemented; supported order/payment/refund contracts exercised locally |
| LOCAL_INTEGRATION_VERIFIED | PASS against controlled local HTTP provider fixture and disposable TLS PostgreSQL, not real provider |
| REAL_PROVIDER_SANDBOX_VERIFIED | BLOCKED_EXTERNAL_DEPENDENCY; zero genuine order/payment/webhook/refund evidence |
| PRODUCTION_PAYMENT_READY | NO-GO; production mode/keys rejected, real identity/provider configuration absent |

## Acceptance gates

PASS below describes implementation/local evidence only. G18–G21 require genuine provider evidence and cannot pass from mocks.

| Gate | Status | Evidence / limitation |
|---|---|---|
| G01 choice/approval status | PASS | Razorpay provisional, owner approval absent explicitly recorded |
| G02 current official contract | BLOCKED_EXTERNAL_DEPENDENCY | Official SDK pinned; hosted current docs403, account/test-method guarantees not verified |
| G03 real adapter code | PASS | Actual HTTP/signature/parser implementation; disabled/test-only, not a live provider success |
| G04 secure sandbox config | PASS | Test keys only, secret files, approval/identity/TLS checks and actual startup refusals |
| G05 order creation integration | PASS | Local fixture/Go application, durable intent before POST |
| G06 binding persisted | PASS | Disposable PostgreSQL validated order IDs/value/receipt |
| G07 raw signature | PASS | Official-algorithm local vectors; genuine signature G20 blocked |
| G08 state mapping | PASS | Explicit no-revision lattice, terminal protection and review hold tested locally; live consistency unverified |
| G09 status lookup integration | PASS | Order/payments/processed-refunds API fixture with strict validation |
| G10 PG fulfillment | PASS | Existing authority and atomic grant/revoke/hold |
| G11 duplicates | PASS | Unique event/raw digest/source grant and20 duplicate delivery checks |
| G12 refund/reversal | BLOCKED_EXTERNAL_DEPENDENCY | Full/partial refund local behavior verified; actual reversal/dispute contract unsupported/unverified |
| G13 lost acknowledgement | PASS | New adapter/application instance recovers original durable order via receipt; one POST; empty ambiguity blocks |
| G14 real sandbox entry wiring | BLOCKED_EXTERNAL_DEPENDENCY | DI/listeners/factories implemented and tested with fixtures; no real Identity registered, current entry remains unavailable |
| G15 ownership | PASS | Verified test identity and actual SQL/mTLS cross-user denial; real identity integration remains blocked |
| G16 checkout UI prepared | PASS | Both default/optional UI trees, official widget code, server confirmation,82-test/browser evidence; widget transaction not executed |
| G17 local integration | PASS | Actual Node->mTLS->Go->PG->provider-code fixture |
| G18 genuine sandbox order | BLOCKED_EXTERNAL_DEPENDENCY |0 real API order creations |
| G19 genuine sandbox payment | BLOCKED_EXTERNAL_DEPENDENCY |0 real payments/captures |
| G20 genuine webhook | BLOCKED_EXTERNAL_DEPENDENCY |0 real merchant signed deliveries |
| G21 genuine refund | BLOCKED_EXTERNAL_DEPENDENCY |0 real refunds/reversals |
| G22 scoped security audit | PASS | No identified active bypass in current disabled paths; live security certification not claimed |
| G23 regression | PASS | Node82, dual Go/race/vet,PG restart,Docker/API,375/1280 browser |
| G24 production disabled | PASS | Production keys/mode rejected; default endpoints unavailable |
| G25 GitHub delivery | NOT_TESTED | Must be updated after remote branch confirmation; final response supplies verified SHA |
| G26 handoff/docs | PASS | Twelve PAY_P0_02 documents, evidence and tracker |

Overall **NO-GO**. Do not activate while blocked gates remain. No source of external success was fabricated.

## Owner / next-session actions

Approve provider/account/key ownership and obtain current official API/test-mode/pagination/retry/refund/dispute documentation. Supply secure test API/webhook secrets, real identity/session integration and approved product pricing/capability/refund/access policy. Provide private TLS PostgreSQL/migration rollout, separate internal mTLS/client SAN and externally reachable sandbox webhook TLS/network. Review provider consistency and dispute/reversal model, official SDK CSP/methods, secret rotation, retention/backup/restore/observability. Configure secrets in approved storage, not chat. Then independently execute G18–G21 with genuine redacted evidence and review before any separate sandbox/customer activation. Production requires another explicit authorization and implementation review.

Read API_MAPPING/STATE_MACHINE_MAPPING before modifying the domain. Never invent ordered revisions or blind POST idempotency. Do not reset the durable create-attempt flag simply because a receipt lookup is empty. Never map authorization to captured or callback to entitlement. Preserve old fingerprint serialization, review holds and independent grants. Do not remove identity refusals or put test adapters into production.

## Every implementation file and purpose

| File | Why |
|---|---|
| .env.example | Secret-manager sandbox specification, no real price/credentials or activation. |
| .github/workflows/ci.yml | Run four additional sandbox boundary/presentation security tests. |
| backend/cmd/server/main.go | Explicit blocked sandbox bootstrap, separate TLS listeners/shutdown; default native unchanged. |
| backend/internal/payment/application.go | Optional snapshot model, durable first-create intent/recovery, notification processing and safe checkout response. |
| backend/internal/payment/application_test.go | 005 migration, lattice ordering and legacy fingerprint compatibility tests. |
| backend/internal/payment/database.go | Require005 schema columns in readiness, never startup migration. |
| backend/internal/payment/http.go | Safe sandbox checkout projection and private mTLS readiness. |
| backend/internal/payment/providers/razorpay/integration_test.go | Actual mTLS/Node/Go/PG plus adapter fixture, durable recovery/concurrency/restart tests. |
| backend/internal/payment/providers/razorpay/razorpay.go | Provisional test-only provider API/signature/state adapter. |
| backend/internal/payment/providers/razorpay/razorpay_test.go | Synthetic API/auth/raw-signature/state/retry/lost-response unit tests. |
| backend/internal/payment/reconcile.go | Process notification backlog only after authoritative snapshot, never grant from callback. |
| backend/internal/payment/sandbox/bootstrap.go | Validated secret/TLS/DB/catalog/provider construction with injected real identity requirement. |
| backend/internal/payment/store.go | Stored evidence-mode isolation, capture/refund lattice, fulfillment review/revocation, compatible canonical fields/raw digest. |
| backend/internal/payment/store_test.go | Retain original tests with additive005 migration. |
| backend/internal/payment/webhook.go | Bounded raw-byte provider receiver; absent dependencies unavailable. |
| database/migrations/005_provider_sandbox.sql | Add create-attempt/evidence/review metadata, preserve old status enum. |
| frontend/src/components/CheckoutModal.tsx | Mirror root checkout continuity. |
| frontend/src/components/SandboxCheckout.tsx | Mirror accessible sandbox state UI. |
| frontend/src/engine/paymentClient.ts | Mirror safe client contract. |
| scripts/migrate-payments.sh | Include explicit005 operator operation. |
| scripts/test-phase1-go.sh | Verify original and provider-integrated markers after actual restart. |
| server.ts | Blocked sandbox factory selection and explicit sandbox-only CSP origins. |
| server/paymentBoundary.ts | Validated test-mode checkout allowlist and secret-file mTLS sandbox factory. |
| src/components/CheckoutModal.tsx | Optional sandbox presentation; default remains disabled. |
| src/components/SandboxCheckout.tsx | Official widget preparation, test label, server-only confirmation and bounded polling. |
| src/engine/paymentClient.ts | Checkout public fields and review-hold state, no browser authorization. |
| tests/payment/pay02.test.tsx | Disabled/default test-mode presentation, absent-identity and live-key rejection tests. |

Documentation: BASELINE records reconciliation; PROVIDER_SELECTION approval/provisional choice; PROVIDER_API_MAPPING official references; ARCHITECTURE wiring; WEBHOOK_SECURITY raw boundary; STATE_MACHINE_MAPPING ordering/review/compatibility; SANDBOX_SETUP missing configuration; TEST_MATRIX coverage; TEST_REPORT exact results/blocked evidence; SECURITY_AUDIT scoped review; DEPLOYMENT_RUNBOOK controlled operation; this HANDOFF continuity/gates. Evidence logs contain no generated keys/DSNs. Tracker appended, historical PAY01 docs preserved.
