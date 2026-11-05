# CFRS-P0-01-CODEX handoff

**PARTIAL — NOT DEPLOYED.**

Branch: fix/cfrs-p0-01-codex-completion. Base: 5d7e2e5c7901b5735586cafa60f268e4b979fbf6. Implementation/test commit: `d706d52bd52090271c1498a41ccef406d5ecffde`. A separate documentation commit follows it; no remote push or merge performed.

Read BASELINE, CHANGES and TEST_REPORT alongside CFRS_MASTER_TRACKER. Root Node calculation path has 41 passing regression tests and passing typecheck/build; mirrored frontend builds but its pre-existing standalone typecheck fails.

## Release blockers / next recommended phase (not started)
1. Remediate and test alternate Go backend selected by Dockerfile. backend/internal/calibration/btr.go still certifies a heuristic score; backend/cmd/server/main.go still defaults user identity and timezone and exposes graph/profile routes without demonstrated ownership. Root btr_processor.go also retains old certification naming. Do not deploy either path as Phase 1-complete.
2. Design authenticated profile ownership and actual graph evidence. Root stored-profile resolver intentionally returns unavailable rather than returning synthetic data. Stateless client chart rules are not an authorization boundary or verified graph service.
3. Establish festival provenance and a real natal/activity/duration timing engine before enabling personal recommendations. Current 2026 registry and dashboard illustrations cannot substantiate current accuracy.
4. Restore the real Go toolchain and repair existing standalone frontend TypeScript/Tailwind configuration separately, then run browser interaction/mobile tests, actual database integration, and numerical reference validation. Core astronomical approximations and BTR score calibration remain independently unverified.
5. Independent payment P0: hardcoded default webhook secret, seeded example checkout session, simulation route and customer-like synthetic funnel require a separate payment/auth review. This patch does not change payment code or assert it is production-safe. The funnel is explicitly labeled a demonstration.
6. Migrate external API/load-test consumers: required explicit UTC offsets, nullable personal timing, 503 resolver, 422 empty milestones, v1 BTR schema_version=2. Existing k6 script asserts obsolete certification semantics; do not use it as a release gate without a reviewed contract migration.

## Rollback / continuity
Prefer reverting the focused local patch commit(s) after review; do not reset or clean user work. Reverting restores known unsafe defaults/claims, so it is not a safe production release. No migrations or dependency upgrades need reversal. Ignored dist/node_modules are local generated outputs. Baseline fixtures under /tmp are transient; the regression fixture is retained in tests/calculation/.

No deployment, publication, push, merge, production changes or Phase 2 execution occurred. No environment configuration changes were reapplied.
