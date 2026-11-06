# CORE-P0-02 test report

2026-11-06. Baseline `993837f1b04dfb9873b79ee27c46c483feb7e2dd`. Functional source `73f4819db8f6d42d8ebbf7837b16102ebac9c72d`. Evidence in `evidence/core02/`. Synthetic rule/interval tests are not astronomical accuracy evidence. No merge, deployment or customer activation.

| Executed checks | Actual result |
|---|---|
| `node --import tsx tests/timing/contracts.test.tsx` |17 passed,0 failed,0 skipped: schemas, six categories, unavailable/insufficient projection, fake release rejection, client malformed-window/provenance rejection, finance disclosure, SSR accessibility/escaping, mirrored files |
| `node --import ./tests/calculation/register-assets.mjs --import tsx tests/calculation/integrity.test.tsx` |41 passed,0 failed,0 skipped; original numerical baseline unchanged |
| `node --import tsx tests/calculation/astronomical_accuracy.test.ts` |17 passed,0 failed,0 skipped; analytical/reference assertions only, NOT independent native/Panchang acceptance |
| Individual `node --import tsx` runs: payment/boundary, pay02, pay03, phase1/security |12+4+32+25=73 passed,0 failed,0 skipped |
| Combined Node assertions |148 passed,0 failed,0 skipped |
| `PHASE1_REUSE_TEST_IMAGE=1 PHASE1_CA_BUNDLE=<trusted-system-CA> sh scripts/test-phase1-go.sh` |PASS exit0: both modules normal/race/vet/CGO-disabled, isolated real TLS PostgreSQL and three actual restart checks |
| New Go timing tests within full gate |PASS: interval subtraction/intersection, exclusions/overlaps/priority/ties/empty, deterministic fixed-clock results, bound/missing/conflicting evidence, missing polar solar events, uncertainty, invalid schema/date/mode/location, India/US/Canada DST and30minute DST, leap/skipped date, midnight crossings, native release refusal |
| `TestNodeMTLSGoTimingBoundary` in full Go gate |PASS: actual Node22 mTLS client→Go Handler, India24h/US23h/Canada25h, ambiguous birth offset, invalid date and insufficient uncertainty; no fixture result or birth echo |
| Root + alternate `npm run lint` and `npm run build` |PASS both frontend production bundles |
| `CHROMIUM_PATH=/usr/bin/chromium CORE02_WEB_URL=http://127.0.0.1:3101 node tests/timing/browser.mjs` |8/8 PASS:375/1280 × unavailable/unknown/synthetic/invalid response; keyboard submit, labels, offset timeline, HTML escaping, no URL/storage leak or overflow; input edits clear old results |
| Existing `tests/phase1/browser.mjs` |PASS375/1280: chart/input/BTR/festival/checkout/privacy/overflow |
| Existing `tests/payment/pay03-browser.mjs` |12/12 PASS, local fixtures only |
| Native `go build -buildvcs=false ./cmd/server` and actual HTTP smoke in disposable container |PASS: capability blocked, daily503, requested SWISS_FILE distinct from actual UNAVAILABLE, no birth echo/log |
| Scoped payment/auth/database/config diff against baseline |Unchanged; only timing route imports/registration added to entrypoints |

Host Node24.22.1, Go1.26.10 with existing pinned Swiss library; cross-service tests use Node22 supplied by the existing gate. Native test containers receive the trusted CA for pinned existing dependencies; no TLS bypass or new dependency. Initial Go-only focused runs skip Node cross-service when Node is absent; full gate supplies Node and actually executes it. Existing recovery-only tests skip initial stages and run after database restart; these are not silently counted as passed integrations.

Defects corrected: initial test searched limitation prose for the word probability (fixed to inspect prohibited JSON fields); explicit select accessible names added after browser locator failure; a pre-existing unused fMoon declaration blocked alternate TypeScript build, removed in both mirrored engines without changing formulas/results. Existing CORE01 tests/files were retained. Requested/actual ephemeris provenance is now explicit. No unexecuted CI, reference accuracy, legal approval or production rollout is claimed.

Independent accuracy limitation: the CORE01 commit's report claims GO, but these tests import the analytical TS path and provide no captured native/sunrise/Panchang validation or verified source-to-native execution chain for this engine. Timing T11 remains BLOCKED_EXTERNAL_DEPENDENCY despite17 passing analytical assertions. No traditional rule source or predictive validity is established by any fixture.

Parallel-main check: main advanced during implementation to `e57f45273021552db5e9a0350f371ae5003eda04` (script execution/build fixes plus the same unused fMoon removal). These four changes were inspected; they add no native/Panchang acceptance evidence. A read-only `git merge-tree --write-tree origin/main HEAD` preview succeeded without conflicts. No branch was merged, rewritten or overwritten, and no post-merge CI result is claimed. The tested source baseline remains993837f; the build fixes remain on main for the authorized integration.
