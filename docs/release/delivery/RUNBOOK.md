# Resume, integration and rollback runbook

1. Read STATE/TRACEABILITY/EXECUTION and the latest handoff, inspect dirty worktrees,
   fetch main/integration explicitly and preserve changes. Resume only a task with
   satisfied dependencies; do not reapply previously merged PR28/29 work.
2. For this candidate, source c185132 is independently reviewed. Metadata-only
   followups must retain that binding and receive changed-head confirmation.
3. Verify the active network policy/connector. The last observed enforced revision1
   excludes api.github.com and CONNECT403 happens before GitHub. No callable GitHub
   connector was exposed. Git fetch/push and public HTML reads work. Do not treat
   this as an actual GitHub permission verdict or retry the same denial blindly.
4. Once access exists, inspect repository agent write vs admin capabilities
   independently, current integration rules/review requirements and allow_auto_merge.
   Find or create exactly one PR with base integration and remote tested head.
   Obtain required exact-head CI and actual permitted review. Enable native auto-merge
   only if those controls are verified; never manufacture an approval or bypass rules.
   Verify merged SHA and relevant integrated checks before unlocking dependents.
5. Never merge main/master or dispatch publishing workflows without explicit owner
   authorization. Deployment/private hosting/live activation remain separate gates.

## Reproduce local engineering checks

Use lockfile dependencies and the recorded browser/runtime versions. Both builds
must retain publicDir:false. Commands:

- npm run lint; npm --prefix frontend run lint
- npm run build; npm --prefix frontend run build
- python3 tests/release/pages_guard_test.py
- Existing .github/workflows/ci.yml calculation and boundary test commands
- CHROMIUM_PATH=/usr/bin/chromium node tests/pwa/browser.mjs
- With a local production test server3101: A11Y_WEB_URL=http://127.0.0.1:3101
  node tests/accessibility/browser.mjs; F01_WEB_URL=http://127.0.0.1:3101
  node tests/f01/timeout-browser.mjs
- Local preview load and restart baseline: run `npm ci`, `npm run build`,
  then `python3 tests/stress/preview_baseline.py` on a disposable non-production
  machine. The runner starts its own process with neutral configuration in a
  temporary directory, sends loopback requests only, and stops the process
  when finished. It verifies the health response, successful Kolkata timing
  preview, and expected unsupported-city refusal, with 30 sequential
  requests, 120 requests across up to eight clients, and nine requests
  after a graceful process restart. Capture the emitted JSON along with the
  tested commit, Node version and machine details. Latencies and restart
  time are observations for this fixture; the baseline has no production
  capacity or availability threshold.
- Existing tests/stress/load_profile.js only with TEST_PROFILE=smoke for the bounded
  engineering regression. Do not run the10000VU stress profile without approved
  workload/threshold/environment scope. Synthetic data only.

The actual run used Node24.22.1/Chromium155 local automation; GitHub CI specifies
Node22 and has not been observed for this feature. Image builds use Node22 runtime.
No Firefox/WebKit/physical-device/screen-reader or actual user result is inferred.

## Rollback design and actual evidence

No hosted deployment occurred, so no deployed rollback was exercised. For code
rollback, create a new branch from current integration, revert the affected change
without rewriting shared history, rerun affected checks and use the same controlled
integration PR process. Keep publishing branches untouched.

A future deployed PWA rollback needs explicit service-worker migration testing.
Keep a compatible static-shell worker while rolling back application behavior, or
ship a reviewed tombstone worker that deletes only its scope-owned caches and
unregisters, with an honest online-only fallback. Merely removing sw.js can leave
old clients controlled and is not a verified rollback. Test existing/waiting workers,
multiple open forms, failed precache, scope isolation and old/new assets on the actual
chosen host. Users must not be silently reloaded or told unsaved input survives.

Failed precache and two-tab update/cancel behavior were actually tested locally;
these are not deployment rollback, backup restore/PITR or incident/on-call rehearsals.
Retained personal/financial stores would require their own approved recovery and
retention evidence. Current shell intentionally stores no personal results.
