# CORE-P0-02 handoff

2026-11-06. Branch [`fix/core-p0-02-personalized-timing`](https://github.com/dhinetrya-jpg/mymomentoclock/tree/fix/core-p0-02-personalized-timing); baseline main `993837f1b04dfb9873b79ee27c46c483feb7e2dd` (includes PAY03 merge4050fd2 and newer CORE01 tests). Exact delivered SHA is the remotely verified branch head recorded in the final response; functional source commit: `73f4819db8f6d42d8ebbf7837b16102ebac9c72d`. No merge/deploy.

Implemented: reusable typed Go timing pipeline, request/fact binding, IANA civil-day/DST validation, strict versioned activity/rule contracts, natal-dependent include rules, interval intersection/subtraction, exclusion precedence, overlap partition/merge, deterministic ranking and explanations; safe versioned Node/native APIs, optional bounded internal mTLS transport, explicit provenance, mobile-first form/timeline and fail-closed UI states. No new paid dependency or second astronomy engine.

Unavailable: actual personalized natal/transit/Panchang/solar calculations and traditional activity guidance. No validated provider or real rules are registered; all executable fixture rules live in tests. Synthetic results never represent astronomical accuracy and cannot leave the deployed Node gateway as recommendations. Legacy disabled Muhurat/BTR/Dasha/graph/remedies stay disabled. Payment/auth/database/provider/commercial configuration sources are unchanged.

| Gate | Status | Scope/evidence |
|---|---|---|
| T01 Baseline/dependency audit |PASS|Fetched latest main; audited actual CORE01 tests/contracts, retained merged PAY03 |
| T02 Typed pipeline |PASS|Go validated request→provider facts→rules→intervals→rank/explanation; real provider unavailable |
| T03 Versioned source-traceable activity rules |BLOCKED_EXTERNAL_DEPENDENCY|Registry/schema and six categories implemented; actual tradition/source passages and approved predicates absent; no invented citations |
| T04 Interval generation/ranking |PASS|Synthetic algebra/overlap/conflict/tie/midnight/empty tests |
| T05 Timezone/date handling |PASS|Existing Go ephemeris civil-time validation, DST gaps/folds/explicit offset,23/24/25/23.5hour days, skipped/leap dates |
| T06 No fabricated certainty/predictions |PASS|No numerical confidence/success scores; empty unavailable/insufficient responses; explicit synthetic provenance |
| T07 Secure versioned API |PASS|Strict schemas/limits/no-store/no URL birth data, mTLS cross-service and remote-fixture rejection |
| T08 Accessible daily timeline |PASS|Actual UI and synthetic timeline tested on375/1280; customer default unavailable |
| T09 Tests/regression |PASS|148 Node assertions, full Go/race/vet/PG/restart and browser suites; TEST_REPORT and evidence |
| T10 Payment/auth isolation |PASS|Scoped sources unchanged and regressions pass |
| T11 CORE01 independently verified |BLOCKED_EXTERNAL_DEPENDENCY|Analytical17-test pass does not verify required native natal/Panchang/solar inputs |
| T12 Approved rules/release |BLOCKED_EXTERNAL_DEPENDENCY|Owner source/applicability/uncertainty approval and release authorization absent |

**Engineering: GO for review of the implemented deterministic, testable infrastructure. Customer release: NO-GO.** T03/T11/T12 are not PASS. No verified personal recommendation is exposed.

Remaining actions: obtain independently captured native reference cases including source epochs/timescale/site/ayanamsa/actual returned mode/flags/tolerances; implement and independently verify sunrise/sunset and full-day Panchang/factor intervals (including polar and DST cases) through the existing native boundary; supply exact traditional source editions/passages, six activity predicates/exclusions and approved uncertainty policy; review finance context disclosure and release decision. Then bind the reviewed provider/registry and guarded customer response path in a separate code review, validate private TLS/ingress logging, rerun evidence and authorize release. No environment flag or report alone opens these gates.

Changed-file inventory (repository-relative; evidence logs are included):

- `.github/workflows/ci.yml`
- `backend/cmd/server/main.go`
- `backend/internal/timing/calendar.go`
- `backend/internal/timing/contracts.go`
- `backend/internal/timing/cross_service_test.go`
- `backend/internal/timing/engine.go`
- `backend/internal/timing/engine_test.go`
- `backend/internal/timing/http.go`
- `backend/internal/timing/intervals.go`
- `backend/internal/timing/rules.go`
- `docs/core/CORE_P0_02_ARCHITECTURE.md`
- `docs/core/CORE_P0_02_HANDOFF.md`
- `docs/core/CORE_P0_02_RULE_MATRIX.md`
- `docs/core/CORE_P0_02_TEST_REPORT.md`
- `docs/core/evidence/core02/README.md`
- `docs/core/evidence/core02/browser-final.log`
- `docs/core/evidence/core02/browser-payment.log`
- `docs/core/evidence/core02/browser-regression.log`
- `docs/core/evidence/core02/calculation-regression.log`
- `docs/core/evidence/core02/core01-regression.log`
- `docs/core/evidence/core02/go-full.log`
- `docs/core/evidence/core02/native-api.log`
- `docs/core/evidence/core02/node-timing.log`
- `docs/core/evidence/core02/payment-security-regression.log`
- `docs/core/evidence/core02/web-build.log`
- `frontend/src/App.tsx`
- `frontend/src/components/DailyTiming.tsx`
- `frontend/src/components/Navigation.tsx`
- `frontend/src/engine/astroMath.ts`
- `frontend/src/engine/timingClient.ts`
- `server.ts`
- `server/timingBoundary.ts`
- `src/App.tsx`
- `src/components/DailyTiming.tsx`
- `src/components/Navigation.tsx`
- `src/engine/astroMath.ts`
- `src/engine/timingClient.ts`
- `tests/timing/browser.mjs`
- `tests/timing/contracts.test.tsx`
- `tests/timing/cross-service.mjs`

Parallel-main check: main advanced during implementation to `e57f45273021552db5e9a0350f371ae5003eda04` (script execution/build fixes plus the same unused fMoon removal). These four changes were inspected; they add no native/Panchang acceptance evidence. A read-only `git merge-tree --write-tree origin/main HEAD` preview succeeded without conflicts. No branch was merged, rewritten or overwritten, and no post-merge CI result is claimed. The tested source baseline remains993837f; the build fixes remain on main for the authorized integration.
