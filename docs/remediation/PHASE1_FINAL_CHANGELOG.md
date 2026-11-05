# Phase 1 final changelog — 2026-11-05

Implementation SHA: `40d60a3e013a94c637de2d7fa55781d615b1b74b`. Base: `b0c9af31d2df505dbcc889fff166659895aa0531`. Branch: `fix/phase1-final-remediation`. This is remediation, not a production release. Historical reports remain intact.

## Requirement reconciliation

| Area | Implementation and customer impact | Status |
|---|---|---|
| A: duplicate unsafe Go paths | Root and backend BTR, graph hydration, conflict resolver, remedies and root AI forwarding fail closed; removed Julian parity Dasha, goroutine fan-out, arbitrary modifiers, shared-planet mutation and unconditional resolution. Cancellation respected. | VERIFIED_FIXED for safety; dependent capabilities SAFELY_DISABLED |
| B: identity/payment | Node seeded sessions, client-price checkout, simulated webhook, SSE and in-memory grants removed. Both Go webhooks refuse fulfillment even with a valid generic HMAC. Protected profiles cannot be selected by caller identity. | VERIFIED_FIXED boundaries; auth/provider BLOCKED_EXTERNAL_DEPENDENCY |
| B: durable domain | PostgreSQL orders/events/entitlements use integer minor units, owner-approved server catalog, transactional row locks, unique provider events/payment IDs, exact amount/currency/customer validation, idempotency and revocation. No active route invokes it. | VERIFIED_FIXED domain; live integration BLOCKED_EXTERNAL_DEPENDENCY |
| C: native truth | Official pinned Swiss source builds against actual headers/static library. Returned flags, fallback mode, version, warnings, finite positions and UTC-as-UT limitation disclosed; SWISS_FILE requirement fails when files absent. Non-CGO gives no approximation and readiness fails. | VERIFIED_FIXED provenance; independent accuracy BLOCKED_EXTERNAL_DEPENDENCY |
| C: input/time | Strict Go dates/times/finite coordinates, missing versus zero, explicit timezone, IANA historical offsets and DST gap/fold rejection/disambiguation. Node negative fractional offsets corrected; Node explicit numeric offsets only. | VERIFIED_FIXED validation; browser historical-zone support SAFELY_DISABLED |
| D: browser integrity | Removed fabricated Dasha, scores, strengths, motion and house potency. Analytical positions remain an explicitly unvalidated preview. Both source trees reconciled. No prediction made from unavailable rules. | VERIFIED_FIXED disclosure; prediction capabilities SAFELY_DISABLED |
| E: UX | Birth form, actual-position/division views, explicit-city festival preview, cultural content and responsive navigation retained. Checkout/BTR/AI/conflict dialogs explain unavailable status and collect no sensitive/payment input. Production demo/admin navigation removed. | VERIFIED_FIXED scoped journeys |
| F: operations | Stateless default Compose, isolated optional dev stores requiring passwords, no embedded K8s secrets, non-root native image, read-only containers, constrained ingress/network policies, no public fake metrics, rate/body/time limits, graceful shutdown. Supported Go 1.26.10 validated. | VERIFIED_FIXED local boundaries; live infra IMPLEMENTED_UNVERIFIED |
| G: evidence | Both modules tested/race/vet, real PostgreSQL transactions and restart, Node regression/security, Docker/API/browser and smoke evidence recorded. | VERIFIED_FIXED local checks |

## Changed contracts

- Chart API schema 3: unvalidated analytical preview; previously invented strength, motion, potency fields are null. Explicit offset required. No default birth profile.
- BTR valid requests return 503 `DASHA_CALCULATION_UNAVAILABLE`, no candidate time/fit, `is_certified:false`. Empty milestones return 422 `MILESTONES_REQUIRED`; malformed/duplicate/future/prebirth events are rejected. Legacy and canonical formats supported without mixed-format guessing.
- Go normalize requires explicit timezone/offset and coordinates (zero is valid). Native metadata identifies actual mode per body; only Sun/Moon/Mars/Saturn supported. No whole-chart or independent accuracy claim.
- Profile/hydration/resolver/payment return unavailable. Unknown/simulated paths return 404. No payment toggle or supplied key can activate fulfillment.
- Personal timing is unavailable. General 2026 city registry is an unverified, non-personal preview; unsupported activity/date/coordinate overrides rejected. Name does not affect timing.
- Diagnostics are not publicly exposed. AI endpoint returns unavailable even when a key exists; no personal data forwarded.
- Default Compose has no database. Optional migrations create a separate inactive payment domain; migration 002 removes unsafe defaults without deleting rows. No production database migration occurred.

## Commits

- `4bba0eb`: Go paths, native disclosure, validation and durable inactive payment domain.
- `b2ca07f`: browser/Node integrity, private-flow refusals and regression coverage.
- `7530f24`: isolated deployment configuration and release checks.
- `40d60a3`: supported Go and non-native refusal/browser verification.

## Changed-file inventory

The following is the implementation diff from the requested baseline (documentation/evidence follow in a separate commit):

```text
.env.example
.github/workflows/ci.yml
.github/workflows/payment-audit-pipeline.yml
Dockerfile
README.md
backend/cmd/server/main.go
backend/cmd/server/security_test.go
backend/go.sum
backend/internal/calibration/btr.go
backend/internal/calibration/btr_test.go
backend/internal/ephemeris/bridge.cpp
backend/internal/ephemeris/bridge_cgo.go
backend/internal/ephemeris/bridge_cgo_test.go
backend/internal/ephemeris/bridge_nocgo.go
backend/internal/ephemeris/normalizer.go
backend/internal/ephemeris/validation_test.go
backend/internal/graph/hydrator.go
backend/internal/payment/store.go
backend/internal/payment/store_test.go
backend/internal/resolver/conflict.go
backend/internal/rvm/remedies.go
backend/internal/webhook/security_test.go
backend/internal/webhook/verification.go
btr_processor.go
conflict_resolver.go
database/migrations/001_secure_payments.sql
database/migrations/002_remove_unsafe_legacy_defaults.sql
deploy/kubernetes/01-config.yaml
deploy/kubernetes/03-databases.yaml
deploy/kubernetes/04-api-ingress.yaml
deploy/kubernetes/06-network-policy.yaml
docker-compose.dev.yml
docker-compose.yml
ephemeris_bridge.cpp
frontend/index.html
frontend/src/App.tsx
frontend/src/components/BtrModal.tsx
frontend/src/components/CheckoutModal.tsx
frontend/src/components/ConflictResolverModal.tsx
frontend/src/components/DashboardView.tsx
frontend/src/components/DeshaKalaPatraAI.tsx
frontend/src/components/DiwaliCountdown.tsx
frontend/src/components/DiwaliProsperityKit.tsx
frontend/src/components/LivingRoomTvDashboard.tsx
frontend/src/components/Navigation.tsx
frontend/src/components/OnboardingWizard.tsx
frontend/src/components/RemediationView.tsx
frontend/src/engine/astroMath.ts
frontend/src/engine/btrProcessor.ts
frontend/src/engine/calculationValidation.ts
frontend/src/engine/conflictResolver.ts
frontend/src/engine/diwaliData.ts
frontend/src/engine/uatAndStress.ts
frontend/vite.config.ts
graph_hydrator.go
index.html
llm_streaming_engine.go
normalization_cgo.go
normalization_engine.go
normalization_nocgo.go
package-lock.json
package.json
phase1_security_test.go
rvm_engine.go
schema.sql
scripts/test-phase1-go.sh
server.ts
src/App.tsx
src/components/BtrModal.tsx
src/components/CheckoutModal.tsx
src/components/ConflictResolverModal.tsx
src/components/DashboardView.tsx
src/components/DeshaKalaPatraAI.tsx
src/components/DiwaliCountdown.tsx
src/components/DiwaliProsperityKit.tsx
src/components/LivingRoomTvDashboard.tsx
src/components/Navigation.tsx
src/components/OnboardingWizard.tsx
src/components/RemediationView.tsx
src/engine/astroMath.ts
src/engine/btrProcessor.ts
src/engine/calculationValidation.ts
src/engine/conflictResolver.ts
src/engine/diwaliData.ts
src/engine/uatAndStress.ts
tests/calculation/integrity.test.tsx
tests/deployment/smoke.mjs
tests/phase1/browser.mjs
tests/phase1/contracts.mjs
tests/phase1/security.test.ts
tests/stress/load_profile.js
transactional_webhook.go
vite.config.ts
```
