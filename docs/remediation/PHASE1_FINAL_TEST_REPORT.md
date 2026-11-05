# Phase 1 final test report — 2026-11-05

Implementation: `40d60a3e013a94c637de2d7fa55781d615b1b74b`. Local validation only. Full raw test output is in [evidence](evidence/). No production/provider credentials were used.

| Check | Result | Evidence / limitations |
|---|---|---|
| Clean Node install | PASS | `npm ci`; baseline dependency install succeeded |
| Root and alternate TypeScript + production builds | PASS | `npm run lint`, `npm run build`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`; both lint checks repeated at final SHA |
| Node calculation + security suite | PASS | 66 tests, 0 failures, 0 skips; 1191ms on host Node 24. Original positional fixture still checked; removed invalid fabricated fields separately asserted null. See node-all-final.log |
| Root/backend Go test, race, vet | PASS | Supported go1.26.10 linux/amd64; fresh-count both modules, native C++ concurrent/deterministic tests. See go-supported-tests.log |
| Real PostgreSQL domain | PASS | Isolated PostgreSQL 16 container, generated test-only credential, no published port; transactional idempotency, 20 concurrent deliveries, mismatches, unknown/failure/replay, refund/reversal, migrations and restart recovery. No provider protocol claim |
| Restart recovery | PASS | Conditional recovery test skips during ordinary suite; database then actually restarted and explicit recovery invocation passes. This is not an unexecuted skip counted as a pass |
| Non-CGO modules | PASS | Both complete module suites with CGO_ENABLED=0, including root legacy refusal. PostgreSQL tests skip without test URL in this extra run; native-backed PostgreSQL evidence is separate |
| Native production Docker | PASS | Official Swiss source/static library, Go1.26 build/tests, runtime image smoke with constrained non-root/read-only container; required SWISS_FILE unavailable as expected |
| Web production Docker | PASS | Production startup, page/assets/JPEG/chart API and AI refusal smoke; browser tests against actual image, not Vite dev server |
| Cross-service contracts | PASS | Shared invalid/missing date/time/coordinates/offset codes, BTR validation/unavailability, protected paths, actual native flags/version/mode, absent se1 refusal and non-CGO readiness503/no synthetic positions. contracts-final.log |
| Browser | PASS | Chromium via Playwright, 375 and1280px: form validation and actual chart, division tabs, BTR status, modals, explicit city, festival/seal, disabled checkout, images, no overflow, page/console errors or cross-origin requests, empty session/local storage. browser-verified.log |
| k6 smoke | PASS | 1VU,10iterations,20requests,50/50 checks; no fabricated BTR/graph results, expected503 explicitly asserted. Local response p95≈2.86ms is refusal-path latency, not computation capacity. k6-final.log |
| Compose/Kubernetes syntax | PASS | Compose resolved and YAML parsed; no live Kubernetes/ingress/registry reconciliation performed |
| Diff whitespace and second source sweep | PASS scoped review | No whitespace errors. Retained analytical trig, game randomness, request-ID crypto randomness and synthetic dev-only demos classified in security report |

## Reproduce

```sh
npm ci
npm run lint
npm run build
npm --prefix frontend run lint
npm --prefix frontend run build
node --import ./tests/calculation/register-assets.mjs --import tsx --test tests/calculation/integrity.test.tsx tests/phase1/security.test.ts
# Requires Docker, network and trusted CA. Script creates/removes only its own isolated DB/network.
PHASE1_CA_BUNDLE=/path/to/trusted-combined-ca.pem sh scripts/test-phase1-go.sh
# Omit CA variable outside proxy environments; never disable verification.
docker build -t phase1-native .
docker build -f Dockerfile.web -t phase1-web .
# Run images on loopback ports before the following checks.
node tests/deployment/smoke.mjs engine http://127.0.0.1:18081
node tests/deployment/smoke.mjs web http://127.0.0.1:13001
PHASE1_WEB_URL=http://127.0.0.1:13001 PHASE1_ENGINE_URL=http://127.0.0.1:18081 node tests/phase1/contracts.mjs
CHROMIUM_PATH=/path/to/chromium PHASE1_WEB_URL=http://127.0.0.1:13001 node tests/phase1/browser.mjs
# Optional PHASE1_NOCGO_ENGINE_URL exercises a separately built CGO_ENABLED=0 service.
```

For smoke load, run `grafana/k6:1.0.0` with the web container's network namespace, TARGET_URL=http://127.0.0.1:3000 and TEST_PROFILE=smoke, piping tests/stress/load_profile.js on stdin. Heavy original load profile was not executed.

## Corrected test-environment failures

Initial browser run exposed missing CSP blob-worker permission for confetti; allowed worker-src self/blob only, reran successfully. Test origin check now compares URL origins so local blob URLs are not falsely external. A browser-test comment syntax error was fixed and actual browser rerun passed. Docker VFS filled disk during a disposable build; removed only superseded task images/cache, rebuilt and reran successfully. Standalone non-CGO artifact first failed Git VCS stamping in a bind-mounted container; recompiled test artifact with buildvcs=false (no production build change), then exercised its real HTTP refusal/readiness. Earlier Go1.22 success is superseded by supported Go1.26.10 evidence.

## Not executed / not established

Provider sandbox signature/event mapping or real checkout; sign-in/session ownership integration; production DB/TLS/Kubernetes/registry; independent astronomical accuracy datasets; Swiss .se1 file mode; certified Dasha/BTR/personal timing; AI consent integration; static Pages API hosting; 10k-user throughput. These are release blockers or explicitly unavailable features, not green tests. Browser alternate build compiled but was not separately served in the browser matrix. No claim of a comprehensive third-party dependency vulnerability audit.
