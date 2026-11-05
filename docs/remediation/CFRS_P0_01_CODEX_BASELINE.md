# CFRS-P0-01-CODEX baseline — 2026-11-05

Clean initial branch `work`, HEAD `5d7e2e5c7901b5735586cafa60f268e4b979fbf6`.
Remote main matches; remote remediation ref remains `d49961c2a80dc8c7ab31a88470886a9ce661d862` (read-only ls-remote). No checkout/pull/reset performed. Prior commit 987ca69 is present. Dedicated completion branch created from this clean state.

## Classification
- Already fixed: server.ts required birth-field checks and removal of active 0.942 BTR fallback. Baseline empty-input behavior inspected; full semantic validation remains partial.
- Partially fixed: diwaliData scope disclosure exists but name hash still fabricates times; BTR response has a disclaimer but certification threshold still asserts unsupported certification.
- Confirmed: server.ts calculate/rectify validate formats rather than actual dates/times; v1 BTR has even weaker validation. calculateFullChart treats midnight as noon. BTR silently uses SAMPLE_MILESTONES and defaults timezone/ayanamsa.
- Confirmed: server.ts muhurat falls back to Delhi; diwaliData fixed festival registry has no verifiable source. Name hash ignores actual Pradosh string, natal factors, date, activity, duration and tradition.
- Confirmed: server.ts v1 resolver uses Kolkata example and no auth; conflictResolver returns constant verifiedGraphPayload. App initializes a sample chart as Native Profile; BtrModal uses sample milestones as verified events.
- Unable to verify: independent astronomical accuracy, provenance of festival registry, historical timezone support, stored-profile ownership (no root auth/profile persistence exists).
- Not applicable to root npm workflow: SQL/Neo4j and separate Go backend are not invoked by server.ts. Dockerfile actually selects backend/ and frontend/, so those are alternate production paths, not safely dismissed as dead code.

## Call chains and contracts (pre-change)
- index.html → src/main.tsx → App.tsx → calculateFullChart; wizard invokes browser engine directly, not chart API. App supplies chart to dashboard/BTR/kit.
- DiwaliProsperityKit.tsx:52–53 → diwaliData.ts:calculatePersonalGoldenWindow; consumes startTime/endTime/ruler/action. server.ts:315 independently exposes cityData/goldenWindow/allSupportedCities. No frontend fetch consumer of muhurat exists.
- BtrModal → executeBirthTimeRectification → calculateFullChart; consumes legacy camelCase result. server.ts:135 exposes same result; :184 v1 adapter exposes certification/confidence. tests/stress/load_profile.js expects obsolete is_certified_true.
- server.ts:255 GET resolver accepts user_id without authentication; no root UI caller. POST resolve-conflict takes client chart. Browser dashboard calls resolver directly. Graph payload is constant, not evidence.
- frontend/src mirrors root components/engines; frontend has its own Vite build. Go backend exposes v1 resolver/BTR with similar defaults and no ownership checks. Payment code is outside this patch.

## Executed baseline
- `npm run lint`: PASS.
- `npm run build`: PASS (Vite 8.3.6).
- Root server on port 3100: GET /api/astro/uat-test PASS 4/4; chart fixture captured under /tmp/cfrs-baseline/chart.json; impossible 2026-02-30 and 25:90:00 returned 200, confirming defect.
- No package unit/integration/frontend test command exists; Makefile test only builds.
- `CGO_ENABLED=0 go test ./...` in root and backend: BLOCKED, installed `/usr/bin/go` reports `Go: Unknown option: test`.
- No deployment, push, merge, environment draft update, infrastructure or payment edits authorized/performed.
