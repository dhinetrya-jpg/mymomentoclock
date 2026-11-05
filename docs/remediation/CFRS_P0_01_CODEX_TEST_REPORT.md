# Executed test report — 2026-11-05

## Baseline
`npm run lint` and `npm run build`: passed. Existing engine UAT: 4/4. An impossible date/time returned HTTP 200. Valid chart fixture captured before edits; its deterministic astronomical fields committed as tests/calculation/baseline-chart.json.

## Final checks
- `node --import tsx --test tests/calculation/integrity.test.tsx`: **41 passed, 0 failed, 0 skipped**. Uses Node's built-in runner (no pre-existing JS test framework or script exists). Includes real production-mode child server and HTTP assertions, Gregorian/date/time/type/finite bounds, missing inputs, offset and ayanamsa, explicit cities and all 12 registry previews, name independence, no fake timing, BTR actual-event requirements/fit semantics, no graph evidence, rejection of claimed stored-profile access, production UAT route isolation, no-key AI fallback, SSR scope/unavailable/BTR/dashboard/onboarding/checkout states, and stable chart fixture.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm --prefix frontend run build`: passed, existing Tailwind @theme/@tailwind minification warnings.
- `npm --prefix frontend run lint`: failed with 13 diagnostics. An untouched `git archive HEAD frontend` copy under /tmp/cfrs-original, linked to installed dependencies, produced 14 diagnostics with the same unused imports/state, NodeJS namespaces, TSX import and CSS declaration problems; the old unused city parameter was removed by this patch. No new final diagnostics identified. Frontend configuration was not altered to conceal these failures.
- `git diff --check`: passed.
- Direct existing `runEngineUatSuite`: 4/4 after the intentional conflict-flag assertion correction; also asserted in the 41-test suite.

## Failures investigated
Initial new API test: 37/38 passed; v1 valid BTR returned 422 because Express app.use strips the mounted path. Corrected adapter detection to originalUrl; regression now passes.
Existing UAT initially became 3/4 after removing synthetic fallback yoga and unconditional conflict success. UAT-003 assumed every chart has a resolved conflict. Replaced it with a stronger factual invariant: flag equals presence of actual opposing yoga types, finite score and no fabricated graph payload. This is an intentional contract correction, not an unexplained assertion relaxation.

## Blocked / unrun
- `CGO_ENABLED=0 go test ./...` in root and backend/: blocked, installed /usr/bin/go is not a usable Go toolchain (`Go: Unknown option: test`). No Go source or linker changes were made. Docker/Swiss Ephemeris/CGO accuracy not validated.
- Browser click/visual/mobile regression: unrun; no browser automation tool available. SSR tests verify rendering only, not interactions or responsive pixels. BTR entry/apply, navigation and payment gating need browser acceptance.
- Authentication/ownership integration: unavailable. Tests prove fail-closed root endpoint behavior, not successful cross-user authorization.
- Live Gemini, payment/webhook transactions, database/Neo4j, 10k k6 load tests, deployed infrastructure: unrun. Payment processing deliberately untouched.
- Alternate frontend baseline typecheck was established retrospectively from untouched HEAD, not assumed from the edited tree.

No test was disabled to obtain a passing result. Overall repository completion remains PARTIAL.

## PR #5 integration follow-up

See CFRS_PR5_MERGE_REPAIR.md for the updated test invocation with Node asset registration and the combined main-branch validation. Earlier standalone frontend failures above describe the historical baseline; the merged build fixes now pass both frontend typechecks.
