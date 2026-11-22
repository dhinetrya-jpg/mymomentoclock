# Independent candidate QA execution

## Preflight — candidate not yet testable as an exact revision

Requested candidate: `6c55a7b0c4e1d22d4c850a125d743c107bf44d7e` in `/workspace/mymomentoclock-delivery`.

Actual `git rev-parse HEAD` matched. However, `git status --short` reported `M vite.config.ts`. The dirty diff adds `import {privateShellPwa} from './tooling/pwa.ts'` and `privateShellPwa()` to Vite plugins; the committed HEAD does not contain this build-critical registration. A PWA test from this worktree would therefore test different source than the stated candidate. Root HTTP3101 health is healthy, but its dist provenance cannot be inferred from health.

Environment: Node24.22.1, Chromium155.0.8059.79, Linux desktop headless automation. No physical mobile, Safari/WebKit, screen-reader or real-user UAT exercised.

Test-source SHA256:
- tests/pwa/browser.mjs: bcd4ef536ba943e0da8ea21f45a0dc94368cb3f010e047dfbcbd92d7de5c282f
- tests/accessibility/browser.mjs: 6fa51b3f7487963d583d22b15ce4c2a6e75cbc28617b1fec8488eaf6a1f38b8d
- tests/f01/timeout-browser.mjs: e8573d8ec14c2520792dbbb39ec2cc695b68aec75e7596363fcdb3f3c78e371d

Browser execution: NOT RUN at this stage. Delivery Lead notified of concrete candidate/provenance blocker before tests. No repository source changed by this auditor. Awaiting clean renewed candidate and rebuild confirmation.

## Renewed pinned candidate and actual independent execution

Delivery Lead committed the omitted Vite plugin registration and renewed the candidate as `c1851327d3d2779cad95a0d6f96e912bbcd7a914`. Before execution HEAD matched and `git status --porcelain` was empty; after all checks HEAD still matched and status remained empty. The source fingerprints above were unchanged. The earlier6c55a7b provenance finding is closed by the repin; no test result is backdated to6c55a7b.

The Delivery Lead rebuilt the local production application at `http://127.0.0.1:3101`; this auditor verified health and executed actual app browser assertions against it. The PWA suite independently builds its own temporary artifacts from the pinned source and serves them on isolated loopback ports. No source edits, branch moves, deployments or live provider calls were made by this auditor.

Executed sequentially to avoid unnecessary shared-runner load:

| Exact command | Result | Observed coverage and limitations |
|---|---|---|
| `CHROMIUM_PATH=/usr/bin/chromium node tests/pwa/browser.mjs` |PASS exit0|3 real built-artifact/worker scenarios: root, project base `/mymomentoclock/`, alternate `/alternate/`; Chromium installability error array empty, actual static cache/offline behavior, private GET/POST/query exclusions, failed-precache preservation, changed-build explicit update/cancel/two-tab refusal, foreign/other-scope cache preservation; protocol-only source change gets distinct cache identity.375px desktop viewport. Synthetic prompt invocation, dismissed/accepted choices and appinstalled-event controls are explicitly not an OS installation. |
| `CHROMIUM_PATH=/usr/bin/chromium A11Y_WEB_URL=http://127.0.0.1:3101 node tests/accessibility/browser.mjs` |PASS exit0|9 modal keyboard cases (3 dialogs×320/375/1280);3 nested/hosted-overlay/removed-invoker cases;6 real-app cases (320/375/1280×100/200% root-text). Actual keyboard skip-link focus, associated label operation, UNKNOWN chart refusal, no page/form-control horizontal clipping, no uncaught page errors. Root-font doubling is not a claim of every browser zoom implementation. Hosted widget is a synthetic overlay, not real provider iframe acceptance. |
| `CHROMIUM_PATH=/usr/bin/chromium F01_WEB_URL=http://127.0.0.1:3101 node tests/f01/timeout-browser.mjs` |PASS exit0|6 cases: active timeout/deliberate recovery, unmount cancellation and forced supersession at375/1280. Only the unique12000ms timer is accelerated to750ms; real browser fetch/AbortSignal exercised with synthetic responses. No automatic resubmit, stale result/error, URL leak or local/session-storage leak in this scope. SW intentionally blocked for this isolated failure-state suite. |
| `node /tmp/delivery-independent-qa-fallback.mjs` |PASS exit0|2 supplementary actual-app probes: synthetic register-Promise SecurityError rejection and simulated absent serviceWorker API. Navigation remains usable, availability copy remains honest, no uncaught error; historical `/assets/aistudio/Dockerfile_b2ba3b87.txt` returns404. These simulate unsupported/denied browser API branches, not actual OS/enterprise policy changes. |

Safe raw execution evidence:
- `/tmp/delivery-independent-qa-status.txt` — requested/final SHA and individual exit0 values.
- `/tmp/delivery-independent-qa-pwa.log`
- `/tmp/delivery-independent-qa-a11y.log`
- `/tmp/delivery-independent-qa-f01.log`
- `/tmp/delivery-independent-qa-fallback.log`
- `/tmp/delivery-independent-qa-fallback.mjs` — exact supplementary assertion script.

No count above is inflated into a universal test count: each named browser case contains several assertions. No source-file existence or implementer report is used as proof that these actual commands ran.

## Disposition against earlier gaps and new criteria

- PWA AC01/AC03/AC04/AC05/AC06: PASS within the executed built-artifact/Chromium slice. Native manifest parsing/installability and private static-cache/worker/update boundaries were actually exercised across all3 build/base variants.
- PWA AC02: PASS for truthful browser UI branches/installability in this slice; physical installation and browser/OS promotion remain NOT RUN. Synthetic prompt outcome/appinstalled events are labeled rather than called real installation.
- UX-A11Y AC01–AC06: PASS for keyboard/labels/skip-link/refusal behavior and scoped responsive form controls; this is not full WCAG or screen-reader certification. Earlier skip-link gap is now directly exercised.
- UX-FAIL AC01–AC03: PASS for the6 executed synthetic browser scenarios; no actual astronomical/real-provider/user outcome is implied.
- REL-PUBLISH-GUARD: NOT EXECUTED by this auditor in this run; primary/static guard evidence remains a separately owned check. No publishing workflow was dispatched.
- Earlier foreign-cache and install-control gaps are covered by the revised executed PWA suite. Earlier unsupported/registration-denied gap received the two supplementary probes above.320px/root-text form reflow received actual assertions. No new critical implementation failure was observed in these executed checks.

## Remaining NOT RUN / blocked acceptance

1. Physical Android/iOS installation, real Safari/WebKit/Firefox, actual screen-reader/assistive-technology use, full contrast/touch-target/reduced-motion/zoom/device matrix and real-user UAT. There is no approved complete device/UAT policy to certify from these Chromium checks.
2. Ordinary same-script-URL browser update polling/HTTP-cache schedule. The executed lifecycle deliberately uses versioned real SW script URLs to trigger deterministic update checks. It tests changed-worker lifecycle semantics, not the browser's normal time-based polling schedule.
3. Cold first-ever offline launch without a prepared shell; hosted HTTPS/private access policies and real network/captive-portal failure conditions. Warm cached-shell and simulated connectivity are the executed scope.
4. Exhaustive all-route/API/IndexedDB/privacy adversarial coverage or genuine hosted checkout iframe behavior. Representative cache exclusions and explicit no-store/POST behaviors pass; independent security review remains separate.
5. Long profile-bar content, every visual clipping case and every native browser zoom implementation. Form controls and page bounds at the stated root-text sizes pass; this is not an all-content visual conformance result.
6. Load/stress/capacity/saturation/recovery and real traffic/device SLO acceptance. This QA worker executed no load test; the Delivery Lead owns the separate bounded refusal-path smoke. It must not be described as computation or concurrent-user capacity.
7. Remote CI, PR review/rules/merge, integrated SHA, private hosting/operations and actual owner release authorization. No such action/result is established by these local tests.
8. Full product inventory/CERS/ASCR, domain rulebook and qualified same-convention scientific references, real identity/catalog/provider/legal gates remain outside these shell/accessibility regressions. Tests never activate personal recommendations or live payment.

## Independent recommendation

**GO for engineering review/integration of the scoped PWA, modal/profile accessibility and F01 failure-state changes at candidate c1851327d3d2779cad95a0d6f96e912bbcd7a914**, subject to independent security review, applicable required CI/repository controls and explicit criterion scope above. No blocking browser failure remained in this executed slice. Material source changes require affected revalidation; evidence-only commits should retain candidate source binding and reviewed diff.

**PRIVATE RELEASE READY is not established.** Real-device/assistive-tech/UAT, approved product/method/workload inputs, operational/integration evidence and owner release authorization remain separate requirements. This is an independent local scripted QA recommendation, not real-user acceptance or actual owner approval.
