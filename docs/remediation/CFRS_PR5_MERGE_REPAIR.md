# PR #5 merge repair — 2026-11-05

Merged main `75192e1` (including Swiss Ephemeris/build PR #4) into `fix/cfrs-p0-01-codex-completion`, preserving its original `564297f` history. No rebase, force push or merge into main.

## Conflicts and integration fixes

- Resolved the root and alternate frontend DiwaliProsperityKit import conflicts by retaining both TimingScopeNotice and Vite-bundled image imports.
- Retained the safe typed/unavailable timing implementation in frontend/src/engine/diwaliData.ts, rather than restoring the name-hash algorithm.
- Added a test-only Node ESM loader for image URL imports used during server-rendering tests. Calculation code and assertions are not stubbed; production Vite bundling remains unchanged.
- Updated the Gemini missing-key regression assertion to the stronger explicit 503 AI_UNAVAILABLE contract now present on main.
- Updated k6 to send actual milestone fields and an explicit birth UTC offset, assert v2 candidate_fit_score and non-certification, and assert the resolver's intentional 503 unavailable/no-vector contract. Only that resolver request declares 503 expected; any other HTTP failure still fails the smoke run. These checks do not assert unavailable graph integration is functional.
- Added the calculation suite to CI using the asset-loader registration, so integration failures are checked automatically.

## Validation

- Root and alternate frontend typechecks: passed.
- Root and alternate frontend production builds: passed, including all three bundled JPEG assets.
- Calculation suite: 41/41 passed on both host Node 24 and CI-equivalent Node 22:
  `node --import ./tests/calculation/register-assets.mjs --import tsx --test tests/calculation/integrity.test.tsx`
- Production web Docker image: built successfully with Node 22.
- Production web smoke and k6 outcomes recorded after execution below.

GitHub GraphQL PR status access returned Forbidden; no remote CI success or branch-protection status is claimed from that API. Git transport remains available. Native Go files are unchanged from already-validated main and were not retested in this merge repair. Existing product/authentication/Go calculation limitations documented in the Phase 1 handoff remain open.

Final runtime checks: production web smoke passed (HTML, JS, all three JPEG assets, chart API and missing-key response). k6 completed 10 iterations/20 requests with 50/50 checks passing, zero interrupted iterations and zero unexpected HTTP failures. The resolver's explicitly expected 503 was tested for its typed unavailable error, null vector and false graph verification; it was not treated as successful graph calculation. Test container removed after verification. No live deployment occurred.
