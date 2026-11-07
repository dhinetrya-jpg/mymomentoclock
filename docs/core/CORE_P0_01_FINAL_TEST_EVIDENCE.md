# CORE-P0-01 final test evidence

## PR21 current acceptance update — 2026-11-07

**FAILED — REQUIRED ACCEPTANCE TESTS FAIL.** This supersedes the earlier PARTIAL verdict and limited numerical scope preserved below as a historical snapshot. Current evidence: [planetary report](CORE_P0_01_PR21_PLANETARY_VALIDATION.md), [Panchang/solar report](CORE_P0_01_PR21_PANCHANG_SOLAR_VALIDATION.md), [repair matrix](CORE_P0_01_PR21_REPAIR_MATRIX.md).

Independent JPL DE421/Skyfield evaluation admits 40 body/epochs per mode across five centers, exact TT J2000, historical 1975, modern, equinox/wrap, retrograde and full/new Moon. Each mode has 160 position/distance/speed scalar checks. SWISS_FILE passes all 160; MOSHIER Moon fails twice at unchanged 0.0002°: +0.000452369889814° (1975) and -0.000229132543495° (2026 full Moon). No expected value, tolerance or astronomical correction was fitted. Ten pre1972 mode/body records are NOT_ADMITTED due to UTC/UT1 epoch incompatibility.

Additional dated evidence: 42 Tithi/Karana boundaries, 14 solar noons, 14 tropical ascendants and 16 time-scale scalars from four observed IERS Bulletin A records. Rise/set remain different-definition diagnostics. Matched sidereal offset/nodes/Jupiter/Saturn centers, complete Panchang/chart/traditional acceptance remain incomplete. This is independent evaluation against shared underlying JPL theory, not independent observational confirmation; numerical budgets are not source observational uncertainty.

Optional native JPL mode is unsupported/NOT_TESTED with a real native kernel; its absence alone is not a mandatory release blocker. The reference SPK is not a compatible native Swiss JPL kernel. Native/data commercial-license choice and redistribution review still require owner/legal decisions. No legal approval is inferred.

Default Go evaluator execution emits every scientific FAIL and is not an accuracy PASS. `sh scripts/test-core-pr21-acceptance.sh` sets `CORE01_STRICT_SCIENCE=1` and fails on numerical discrepancies. The top-level verifier calls strict acceptance after engineering checks. Customer timing remains disabled; provider Load refuses admission; ranking/payment/auth/entitlements are unchanged. No merge or deployment.

## PR21 exact fresh executions

- `python3 scripts/core-reference-acquire.py verify`: PASS original source bindings, kernel, generated package and direct IERS extraction/current IANA captures.
- `python3 scripts/core-reference-tests.py`: 8 PASS. `python3 scripts/core-pr21-tests.py`: 10 PASS. Source/hash tests are not proof of astronomical accuracy.
- `/tmp/pr21-venv/bin/python scripts/core-pr21-reference.py generate`: PASS pinned independent evaluator. Repeated generation compared byte-for-byte with `cmp`; no native calculations generate expected values.
- `PHASE1_REUSE_TEST_IMAGE=1 PHASE1_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt CHROMIUM_PATH=/usr/bin/chromium npm run verify:core-p0-01`: initial attempt passed both frontend lint/build and 181 Node assertions, then hit disk during root Go race compilation (`verify-full.log`).
- `PHASE1_REUSE_TEST_IMAGE=1 PHASE1_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt sh scripts/test-phase1-go.sh`: PASS both Go modules, normal/race/vet/CGO-disabled, actual TLS PostgreSQL integration, payment/auth and three restart tests (`go-integration.log`). Toolchain reused, current source always recompiled with count=1.
- Focused newly added IERS test plus affected astronomy race/vet: PASS (`iers-time-and-race.log`).
- `CORE01_DOCKER_NO_CACHE=1 PHASE1_REUSE_TEST_IMAGE=1 PHASE1_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt CHROMIUM_PATH=/usr/bin/chromium npm run verify:core-p0-01`: both frontends, 181 Node assertions, complete Go/PG checks, actual no-cache native + web Docker builds and browsers PASS. It then exposed a newly added incorrect November2026 Vancouver-fold expectation (`verify-clean-final.log`). The implementation was correct: current source confirms permanent UTC-7. Fixed only the new test; originals preserved.
- `sh /tmp/pr21-runtime-resume.sh`: PASS fresh-image native/web/legacy API smoke, desktop/mobile browsers, eight timing browser states, twelve payment UI fixture states, expanded actual native day/gap/fold/fractional-offset/leap API tests in both modes, nonroot readonly real Swiss data and missing-file readiness503. Exact resumed script is preserved as `evidence/pr21/runtime-resume.sh`; results `runtime-final.log` include `ENGINEERING_CHECKS_PASSED`.
- The same runtime invocation executes `sh scripts/test-core-pr21-acceptance.sh`: FAIL (exit1) at precisely two Moshier Moon longitude comparisons. All other admitted numerical comparisons pass; 10 pre1972 rows are NOT_ADMITTED. Exact final strict stage is extracted without altering records to `strict-acceptance.log`.
- `python3 scripts/core-pr21-report.py docs/core/evidence/pr21/strict-acceptance.log --require-pass`: FAIL (exit1), 436 executed records, 2 numerical FAIL, 10 NOT_ADMITTED. Every record and per-mode max/median/nearest-rank p95 retained in `numerical-results.json` and generated planetary report.
- `python3 scripts/core-reference-acquire.py accept`: BLOCKED/exit1 `EXTERNAL_REFERENCE_PENDING` (`source-acceptance.log`); no waiver for still missing quantities.
- GitHub API GraphQL/REST returned403. The accessible normal checks page was read with `python3 scripts/core-pr21-ci-observe.py <sha> <output>` and exact PR-head/workflow-title binding; baseline four workflows SUCCESS. Final-head observation is recorded in final handoff separately.

Initial native image attempt also hit VFS disk capacity (`native-docker-build.log`). Inspected unused regular build snapshots were cleared after preserving all tagged test images/application data; this recovered >30GB and permitted actual no-cache builds. No TLS verification was disabled. Final image IDs: native `88283f9ed400`, web `738f0fc341b8` (full build export digests in clean log).

Engineering stages passed after repair/resume; no combined top-level invocation is claimed green. Strict scientific acceptance remains failed. No merge/deploy/live payment/provider sandbox or customer timing authorization occurred.

## Historical implementation snapshot (superseded where above differs)

2026-11-07 (Asia/Kolkata). Baseline `cc3ab8245ea5d6bced19f5fed200da1528d13154`. Source implementation and selected execution logs are committed. No production deployment, paid service, real payment or timing activation.

## Commands actually executed

| Command / stage | Observed result |
|---|---|
| `python3 scripts/core-reference-acquire.py verify` |PASS:12 immutable originals,3 published planetary and5 ERFA vectors; limited scope explicitly printed |
| `python3 scripts/core-reference-tests.py` |8/8 adversarial tests PASS |
| `npm run lint && npm run build`; `npm --prefix frontend run lint && npm --prefix frontend run build` |PASS both frontend production bundles |
| Direct `node --import ./tests/calculation/register-assets.mjs --import tsx <test-file>` for all12 files in verify script |181 assertions PASS,0 failures,0 skips:41 integrity +20 legacy astronomy +6 legacy planetary +8 temporal +8 Panchang +6 analytical safety +2 diagnostic harness +17 timing +12 boundary +4 PAY02 +32 PAY03 +25 security |
| `PHASE1_REUSE_TEST_IMAGE=1 PHASE1_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt sh scripts/test-phase1-go.sh` (inside verifier) |PASS both Go modules normal/race/vet/CGO-disabled, real TLS PostgreSQL and actual restart; ledger/provider/session recovery all PASS |
| Actual CGO scientific suites |PASS:9bodies and modes, explicit TT/UT1/leap labels, data hash/missing-file refusal, concurrent state isolation, native solar/polar/cross-midnight, Panchang enclosure/UTC coverage, chart and sector cuts, HTTP bounds, timing refusal |
| `TestPublishedExternalNativePlanetaryComparisons` |8 admitted Sun scalar comparisons PASS; Mars explicitly NOT_ADMITTED rather than falsely certified |
| `TestPublishedERFANativeEpochs` |5 published standards cases PASS with predeclared single-JD/source budget |
| Native and web `docker build --secret id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt ...` |Both final images built; native tests execute with immutable reference bind mount; native source installed at pinned revision |
| `node tests/deployment/smoke.mjs engine|web <loopback-url>` |Both actual image functional/health checks PASS |
| `tests/phase1/browser.mjs`, `tests/timing/browser.mjs`, `tests/payment/pay03-browser.mjs` |Original375/1280 browser PASS; timing8/8 and payment fixture12/12 PASS |
| `node tests/calculation/native_api_contract.mjs <native-loopback-url>` |PASS real API9bodies, time-scales, India/US/Canada day lengths, DST gap/fold+offsets, leap label, still-disabled timing |
| `sh scripts/test-core-native-files.sh` |PASS actual nonroot SWISS_FILE runtime using public vendor data; real API checks repeat in file mode; deletion of required file causes readiness503, no fallback |
| `tests/phase1/contracts.mjs` |Existing cross-service safety contracts executed against final images; result in legacy-api-contracts.log |
| Scoped source diff |Payment/auth/database/entitlement/commercial sources unchanged; activity ranking unchanged |

## Reproducible command and precise outcome

`PHASE1_REUSE_TEST_IMAGE=1 PHASE1_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt CHROMIUM_PATH=/usr/bin/chromium npm run verify:core-p0-01`

`PHASE1_REUSE_TEST_IMAGE=1` reuses only the installed Swiss/Go toolchain, recompiling current source and executing actual tests; it does not reuse stale application binaries. Omit it for a fresh toolchain build. Standard CI is offline for reference checks, and controlled source refresh is separate. The verifier has no success flag that waives independent evidence.

The combined run completed all source/build/assertion/Go/PG/native-image stages, then the cloud Docker VFS storage limit interrupted web image export. Only identified superseded task images/cache IDs were removed. The same web build and remaining Docker/browser/API/file-mode stages were resumed and passed, ending with `ENGINEERING_CHECKS_PASSED`. This is recorded as repaired stage execution, not a claim that the initial combined invocation exited0.

The final strict source-admission stage exited1 with `EXTERNAL_REFERENCE_PENDING`, correctly refusing full independent acceptance. An earlier focused backend check lacked the trusted CA for an existing JWT download; the full run corrected the CA mount with TLS verification enabled. No tolerance was relaxed and no expected astronomical value was changed to make scientific acceptance green.

Native clean build tests may explicitly skip database/cross-service suites when their disposable fixtures/Node binary are absent; the full Go/PG script supplies them and actually executes them. Restart-only tests skip the initial stage and execute after actual PostgreSQL restart. These skips are not counted as passed integrations. Host Node24.22.1; clean web/cross-service Node22; Go1.26.10, Swiss2.10.03. Captures were retrieved2026-11-06 and retained unchanged on resume.

## Limits

An analytical diagnostic harness passing means it correctly measured/refused evidence, not that the analytical Sun met the scientific tolerance. It did not. Solar/Panchang model tests and solver brackets are not independent accuracy evidence. No real JPL kernel, full historical EOP source, PAC almanac table or matched complete planetary reference set was supplied. Remote GitHub CI observation is recorded in FINAL_HANDOFF; local passing tests cannot stand in for a remote CI run.

Tested functional implementation commit: `f46d2dc8ce511677dd4d86c31d9b22b3eec68be5`. Subsequent commits may only add evidence/handoff metadata; exact delivered HEAD is verified in the final response.
