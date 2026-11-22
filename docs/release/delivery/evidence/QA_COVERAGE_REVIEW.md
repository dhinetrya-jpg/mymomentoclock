# Independent QA/UAT and bounded-performance scope review

## Scope and provenance

Read-only reviewer, independent of feature writers. Checkout `/workspace/mymomentoclock-delivery`, HEAD/base `57a6bbe5cd2695fb7a69746ad322384009a6fbd2`, feature `feat/private-product-execution`, dirty candidate source (not yet pinned). Inspected latest delivery brief SHA256 `34da95267c1099f5d84303805d21cab1f548aaa5ff01b8c77cc38adf47773d4f`, docs/release/delivery/{TRACEABILITY,SOURCES,STATE}.json, EXECUTION.md, UX_BASELINE.md, scope research and actual test sources. No repository file or running server was changed. No browser, test, load or deployment was executed by this reviewer at this planning stage. Exact-head QA remains NOT RUN.

Inspected source fingerprints (repeat review if these relevant inputs change):
- tests/pwa/browser.mjs: `99262096055a5a84c5c402141d4bb49f7cb61aea328f40526b4932f942959173`
- tests/accessibility/browser.mjs: `e24bed99de9a4db7d97c16822aae794e03b360704bc6500d8dd86848ecf71146`
- tests/f01/timeout-browser.mjs: `e8573d8ec14c2520792dbbb39ec2cc695b68aec75e7596363fcdb3f3c78e371d`
- tests/release/pages_guard_test.py: `eea64505991a10a6b86d8782f952cb239389cc1e51aa4cd1ce818820312ca00c`
- tests/stress/load_profile.js: `6dffba88834f75da2e8580f97375ae76eaff5b75a2c0d2ef2b24c194d016e951`

Evidence/F01_TIMEOUT_BROWSER.txt contains six prior working-tree success lines and implementation report describes 12 contract passes; evidence/PAGES_GUARD_REGRESSION.txt records a current-workflow pass plus expected baseline failure. Those are inspected implementer/precommit records, not my independent execution, and do not bind the final SHA. PWA update lifecycle is still being repaired. No PASS is inferred from files existing or console.log text in their source.

## Criterion-to-assertion map

All current final-candidate verdicts below are NOT RUN pending pinned SHA, stable builds and independent execution.

| Criterion | Present executable assertion | What it can establish / gap |
|---|---|---|
| PWA-P0-01-AC01 manifest/start/scope/icons | tests/pwa/browser.mjs builds root `/`, root project `/mymomentoclock/`, alternate `/alternate/`; actual manifest JSON/display/start_url/scope, icon GET200, Chromium CDP installability errors empty | Strong built-artifact slice. Add explicit registration.scope==intended base and same-origin manifest.id checks; icon dimensions are indirectly checked by Chromium installability rather than explicit PNG decode. Physical install not covered. |
| PWA-P0-01-AC02 truthful install UI | Same script currently checks install-button count<=1 and CDP installability | Weak UI acceptance: count<=1 passes even if support/event logic never exposes a button. Add deterministic beforeinstallprompt event→user gesture/prompt→dismiss/accepted/appinstalled assertions, label these synthetic browser-UI branches. Actual browser/OS installation remains NOT RUN. |
| PWA-P0-01-AC03 offline/degraded shell | Worker ready/controller, warm offline reload, offline role=status message, blank birth field after reload, offline API fetch rejection, online reconnect status | Covers warm cached-shell behavior, not first-ever offline launch or a genuinely disconnected hosted installation. No assertion that navigator.onLine proves server availability; copy correctly treats it as advisory. |
| PWA-P0-01-AC04 personal-data exclusions | Real synthetic GET profile, POST F01 and GET checkout; query-bearing static GET; enumerate CacheStorage keys/body text, reject API/query/private sentinel; offline API/query rejection | Covers representative paths. Does not yet exercise actual daily-timing/auth/entitlement response caching or IndexedDB contents; source exact immutable allowlist reduces risk but full privacy acceptance still needs exact-head security review. |
| PWA-P0-01-AC05 atomic safe updates | Two real Vite build outputs, failed precache→old cache-name equality and preserved form; waiting update does not reload; cancel preserves input; second tab blocks update and keeps both forms; explicit update→new text and one owned cache | Meaningful lifecycle coverage once it actually passes. Missing sentinel foreign cache/other-scope app cache assertion: currently cleanup could delete somebody else's cache and this test would not detect it. Must add or leave ownership-cleanup coverage incomplete. |
| PWA-P0-01-AC06 builds/Chromium | PWA script builds both frontend trees and three bases from source into temporary directories; root and alternate npm lint/build commands also required | Chromium desktop process with375px viewport, not Android Chrome. No Firefox/WebKit or physical device. Source/dists are rebuilt independently by script; pin source SHA and capture output/exit status. |
| UX-A11Y-P0-01-AC01 modal focus/containment | tests/accessibility/browser.mjs esbuilds actual components into isolated StrictMode harness, tests3 dialogs at375/1280, initial focus, Tab/ShiftTab and dynamically added/disabled control | Good keyboard behavior slice; harness CSS is not actual Tailwind visual layout. Not screen-reader conformance. |
| UX-A11Y-P0-01-AC02 Escape/return focus | Same harness closes/reopens each dialog, verifies invoker; removed-invoker fallback; nested dialog restores parent | Covered by assertions, pending actual final run. |
| UX-A11Y-P0-01-AC03 background/dynamic checkout | Background inert/aria-hidden and focus exclusion; original attributes restored; nested modal and synthetic Razorpay overlay ownership handoff | Synthetic hosted overlay is not a genuine Razorpay iframe/sandbox accessibility verification. Preserve release gates. |
| UX-A11Y-P0-01-AC04 profile labels | Same browser suite visits real built app, opens editor, getByLabel for4 exact visible controls | Concrete programmatic-name coverage, pending final run. |
| UX-A11Y-P0-01-AC05 skip link | App adds skip link + focusable main | NO browser assertion in current accessibility suite activates link and verifies focused main. Critical missing test for a newly asserted criterion; do not mark PASS from source alone. |
| UX-A11Y-P0-01-AC06 unknown/BTR copy | Actual onboarding rejects unknown chart, disables time input without inventing/resetting retained input, no old heuristic-candidate text; harness verifies BTR/graph/checkout refusal text | Scoped assertion covers honest refusal, not unknown-time astronomical acceptance. |
| UX-FAIL-P0-01-AC01 active timeout | tests/f01/timeout-browser.mjs observes pending/disabled button, removes old result, accelerates only12000ms deadline to750ms, checks accessible nontechnical alert and enabled retry | Deadline semantics, not literal12second wall-clock latency. Service workers deliberately blocked; PWA interaction is a separate check. |
| UX-FAIL-P0-01-AC02 stale/unmount | Navigate away while pending; remount blank/no old error/result; test-only superseding submit, latest response survives late old503 and old timeout | Good race-specific assertions, not normal-user double-click or real astronomy. |
| UX-FAIL-P0-01-AC03 deliberate retry/privacy | Request-count checks no automatic resubmit, explicit retry obtains new synthetic result; POST/no query/cache:no-store metadata and URL/local/session-storage checks | Six scenarios375/1280. Does not replace PWA CacheStorage/IndexedDB audit. |
| REL-PUBLISH-GUARD-AC01 build guard | tests/release/pages_guard_test.py reads actual YAML job-level if, restricted AST evaluator checks main/master true and integration/feature/PR/tag false | Valid source-expression regression, not actual workflow dispatch or repository branch control verification. |
| REL-PUBLISH-GUARD-AC02 deploy guard | Same expression/ref matrix on deploy job; prior exact-base negative reproduction exists | Do not dispatch publishing to obtain a test. GitHub remote CI/admin/auto-merge state separately unverified. |

## Required evidence gaps before claiming all new engineering criteria pass

1. Add and execute skip-link keyboard activation/focus assertion (AC05). Source presence is not enough.
2. Add and execute foreign-cache and other-scope-owned-cache preservation in PWA update tests. Ownership-safe cleanup is security relevant.
3. Replace install-button<=1 as sole UI acceptance with explicit supported/unsupported/prompt/dismiss/installed branch assertions. Keep physical install NOT RUN.
4. Test320 CSS-px/reflow and long profile-bar content or explicitly retain that UX finding as NOT RUN. Existing body overflow:hidden and document.scrollWidth checks can mask clipping; inspect control/text bounding boxes, keyboard reachability and screenshots. No clipping defect is proven by this static review.
5. Include SW-registration-denied and browser-without-SW API fallback, and assert index.html does not expose historical public/assets. These are source-reviewed fallback criteria without present executable assertions in the new PWA suite.
6. Record explicit exception/NOT RUN for Firefox/WebKit, real Android/iOS install, screen-reader/contrast/zoom matrix, real UAT and applicable private infrastructure/operational recovery. No owner-approved full matrix/group exists yet; latest brief authorizes engineering progress, not made-up signoffs.

No concrete implementation defect has been established by this read-only planning review. The findings above are acceptance-test/evidence gaps. In particular, I have not declared the in-progress PWA lifecycle implementation passing or failing without execution.

## Exact candidate QA sequence

Coordinate with writers, then pin full git SHA and confirm clean source. Build fresh dist before using3101; record actual server command/PID and source hash. Check no other load worker is active. Run with synthetic data only:

```sh
npm run lint
npm run build
npm --prefix frontend run lint
npm --prefix frontend run build
python3 tests/release/pages_guard_test.py
CHROMIUM_PATH=/usr/bin/chromium A11Y_WEB_URL=http://127.0.0.1:3101 node tests/accessibility/browser.mjs
CHROMIUM_PATH=/usr/bin/chromium F01_WEB_URL=http://127.0.0.1:3101 node tests/f01/timeout-browser.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/pwa/browser.mjs
CHROMIUM_PATH=/usr/bin/chromium PHASE1_WEB_URL=http://127.0.0.1:3101 node tests/phase1/browser.mjs
CHROMIUM_PATH=/usr/bin/chromium CORE02_WEB_URL=http://127.0.0.1:3101 node tests/timing/browser.mjs
CHROMIUM_PATH=/usr/bin/chromium node tests/payment/pay03-browser.mjs
```

Use configured project Node/unit/native checks for affected modules. Capture exit status and full safe output, exact SHA, test code hash and application build provenance. A11y/F01 scripts use real local app plus isolated synthetic component/API harnesses; PWA script starts its own local ports and builds true changed-release fixtures without mutating candidate dist. Record those boundaries rather than calling all scenarios end-to-end real provider UAT.

Run local security/cache audit independently on same SHA; keep features NOT_INTEGRATED until actual integration merge/check evidence. Any material source change renews affected QA. Screenshot/viewport evidence does not certify actual mobile hardware.

## Performance decision and approved smoke source

A small local refusal-path smoke is permissible as **engineering regression**, not release performance/capacity acceptance. Basis: committed `tests/stress/load_profile.js`, baseline CI `.github/workflows/mymomentoclock-matrix-pipeline.yml` defaults to smoke; historical BUILD_REPAIR/PHASE1_FINAL_TEST_REPORT explicitly scope it to 1VU/10iterations/20requests/50 checks. Latest brief authorizes synthetic testing in this local test environment. No production host, customer record, actual payment or scientific computation is involved.

Default/specified `TEST_PROFILE=smoke`:
-1 virtual user,10 iterations; each POSTs disabled BTR then GETs disabled resolver with0.5second sleeps after each.
- Expected503 explicitly classified as expected response, not transport failure. Check all five assertions each iteration: no BTR time/fit, no certification, correct current contract, no graph/vector fabrication.
- Only acceptance thresholds are checks rate==1 and http_req_failed rate==0. No latency threshold is applied for smoke.

`TEST_PROFILE=stress` is NOT eligible in this run without a workload/threshold/environment decision: it ramps2000→10000 virtual users over5minutes and hardcodes p95<200ms,p99<500ms,error<0.0001. Those have no approved traffic/SLO basis for the private product. Do not run it automatically or call them approved requirements.

k6 is not currently on PATH; Node24.22.1, Docker CLI and Chromium exist. No Docker-daemon/image/runtime access was tested by this reviewer. If k6 is available through the existing pinned toolchain, the native command after final pin/quiet loopback readiness is:

```sh
TARGET_URL=http://127.0.0.1:3101 TEST_PROFILE=smoke \
  k6 run --summary-trend-stats='avg,min,med,max,p(90),p(95),p(99)' \
  --summary-export=/tmp/delivery-k6-smoke-summary.json tests/stress/load_profile.js
```

The documented fallback is existing `grafana/k6:1.0.0` in the test web container's network namespace (read cloud Docker/network guidance first). Target an actual local test web container's127.0.0.1:3000 via `--network container:<owned-web-test-container>`; pipe only the test script. Do not use host networking or point a fresh container's localhost at the wrong machine. The current host process3101 is not automatically reachable via container loopback. Avoid dependency installation/download merely to claim performance readiness; record the runner constraint or use a separately justified, bounded alternative under the Delivery Lead.

If executed, report machine/Node/k6/version, candidate/build SHA, runner and server limits, request counts, checks, unexpected error rate, refusal-path p95/p99/throughput and environment contention. CPU/memory saturation and recovery are NOT measured by the existing smoke and remain NOT RUN unless instrumented separately.20 refusal requests provide no capacity estimate, active chart/timing latency, realistic concurrent-user throughput, PWA startup benchmark, 10000-user validation or user-device acceptance. Missing approved workload/device policy still blocks **private-release performance acceptance**, while this bounded engineering check can proceed independently.

## UAT and overall recommendation

Scripted synthetic journeys are eligible and can pass for their mapped engineering criteria. No authorized real-user UAT group or feedback was found; real UAT remains NOT RUN. Physical device/screen-reader/operational signoffs remain separate. Current recommendation is continue eligible work and pin/run independent candidate QA; PRIVATE RELEASE READY is not established by these tests, source review, report count, branch push or green CI.
