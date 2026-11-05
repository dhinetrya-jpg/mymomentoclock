# Phase 1 final baseline — 2026-11-05

Starting local branch fix/cfrs-p0-01-codex-completion at 18c2dee8b28100405389a7720f5c189dfff693a1, clean. Fetched main equals the requested baseline b0c9af31d2df505dbcc889fff166659895aa0531, which merges that local history. New isolated branch fix/phase1-final-remediation starts at b0c9af3; no reset/clean/rebase performed.

## Runnable paths
- server.ts (npm dev/start; Dockerfile.web): Express APIs and built root React UI; anonymous stateless chart/BTR, festival preview, payment/SSE/simulation, AI forwarding, fake metrics/stress diagnostics.
- backend/cmd/server/main.go (Dockerfile, Compose, Kubernetes): independent Go API; normalization, BTR, resolver/hydration, remedies, webhook, Prometheus.
- root Go module: no server main; compiles and exports legacy calculation/graph/webhook/LLM functions, exercised by root-tests image. Unsafe exported functions cannot be assumed unreachable forever.
- src and frontend/src: duplicate browser engines; root is the authoritative web build, alternate frontend also builds. GitHub Pages is static only.
- public/assets/aistudio: downloadable historical implementation artifacts, not imports, but sensitive/unsafe examples remain publicly distributed and need removal from the served build.
- SQL schema and database/schema.sql: competing legacy payment tables, no durable provider-event or entitlement model; no real auth/provider initialization found. No production migration executed.

## Confirmed pending risks
- Root and backend BTR: Julian-day parity Dasha, unbounded goroutines, ignored timezone parsing errors, threshold certification.
- Both Go resolvers: arbitrary modulators, unsafe graph type assertions, unconditional resolution. Both graph hydrators: client-owned IDs, shared global Planet nodes, fabricated strengths.
- Node payment: public client price, seeded session, unsigned or reconstructed-body webhook, unknown-token fulfillment, in-memory state, unauthenticated SSE and simulated unlock. Go webhook: generic scheme, no amount/customer/currency checks and nil DB success. No configured payment provider/auth owner boundary exists.
- Native bridge: returned flags/warnings/version discarded, silent Moshier fallback; non-CGO approximation substitutes bodies. Go normalizer assumes India at route, cannot distinguish missing coordinates from zero; permissive CORS, no HTTP timeouts.
- Node metrics are literal production-looking values; stress endpoint public. UI CheckoutModal simulates success; funnel offers paid-like demo navigation. AI receives sensitive birth context without an explicit consent boundary.
- TypeScript resolver's fixed transit modulation and user-facing fabricated health/relationship scores remain unvalidated illustrations. No independent astronomical validation data or activity-rule provenance found.

## Existing satisfied requirements
Semantic Node birth validation, midnight handling, name-independent unavailable personal timing, explicit event city, false graph-payload removal, Node candidate-fit semantics, clean build images and bundled assets exist and are preserved unless a stronger safety boundary requires an explicit documented contract change.

## Executed baseline
`npm ci`, both frontend lint/build commands: passed. Node regression suite: 41 passed, 0 failed, duration 979ms (host Node 24). Working Go Docker toolchain: go1.22.12; root `go test ./...`: passed (3 tests); backend native tests started against same toolchain. Full evidence is recorded in PHASE1_FINAL_TEST_REPORT.md after completion. Existing historical failure reports are not current failures.

## External dependencies
No auth bindings, payment-provider identity/credentials, approved product price, durable production payment connection, independently validated Dasha/BTR method, natal timing rules or numerical reference dataset are configured. Required dependent capabilities must remain unavailable. Final release gate stays NO-GO pending evidence, regardless of green builds.
