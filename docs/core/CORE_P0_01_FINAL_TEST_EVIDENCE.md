# CORE-P0-01 final test evidence

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
