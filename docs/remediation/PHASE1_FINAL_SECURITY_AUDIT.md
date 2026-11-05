# Phase 1 final security audit — scoped source/runtime review

Result: known unsafe identified public paths now refuse execution or expose an explicitly limited stateless preview. This is not production security certification. Live identity, provider and infrastructure integration are missing. Release stays NO-GO.

| Threat | Control / evidence | Residual limitation |
|---|---|---|
| Forged identity / cross-owner profile | No active profile routes; caller-supplied IDs do not authorize anything. Missing/forged/expired identity cases cannot read/write private records | Real auth/session/ownership integration not implemented |
| Forged webhook/client price/free unlock | All live handlers503, simulate404, no SSE seeded session or memory grants; actual HMAC primitive rejects empty key/invalid hex/length and compares raw-byte MAC in constant time | Primitive is not a real provider signature protocol; no provider sandbox |
| Duplicate/reordered payment event | Inactive transactional PG domain enforces event/payment uniqueness, amount/currency/customer/provider consistency, row locks, no regression and refund/reversal revocation; concurrent/restart tests | Live integration not active; production DB/migration planning needed |
| Fake certified result | Parity Dasha, arbitrary conflict/graph scores and UI fabricated strengths removed; null/unavailable fields and no cert assertions | Dasha/BTR, personal timing, graph evidence and accuracy unavailable |
| Native fallback misrepresented | Actual flags/version/mode/warnings disclosed; SWISS_FILE required refusal tested; non-CGO no synthetic substitute | No .se1 files or independent reference accuracy acceptance |
| DoS/input failure |64KB JSON,8 concurrent,600/min/process, Go strict fields/timeouts, bounded milestones, no goroutine-per-candidate, serialized native bridge | Per-process aggregate limiter needs real production edge policy; no capacity claim |
| Sensitive leakage / AI | No prompt/data forwarding, checkout does not collect PII, no user-bearing logs/persistent browser storage, no third-party fonts/requests in tested journeys | Future AI requires consent, retention policy and actual provider review |
| Insecure deployment defaults | No supplied default DB/admin secrets, no default stores, loopback local bindings, non-root/read-only/cap drop, TLS/external secrets references, network policies, no permissive CORS | Live cluster/CNI/registry/secret rotation/TLS are unverified |

## Second sweep

Rechecked root/backend Go, Node, both browser trees, SQL and deployment YAML after implementation; reviewed remaining trigonometry/randomness/certification/default strings rather than treating every match as an exploit.

- `astroMath.ts` in both trees retains analytical positional trigonometry, explicitly marked unvalidated preview. No new formula added. It is not a verified astronomical calculation or a personalized forecast. Negative fractional timezone arithmetic is corrected and regression-tested.
- `FamilyGameNight.tsx` uses randomness for a cultural Housie game, not prediction or authentication.
- `backend/cmd/server/main.go` uses cryptographic randomness for request IDs, no birth outcome.
- `ConversionFunnelView.tsx` retains synthetic sample heatmap/telemetry only behind import.meta.env.DEV, with explicit demonstration banner. No production tab or active API exposes it. Its outputs are not verified rules or customer capabilities.
- `CandidateEvaluation`/`RectificationResult` are legacy TypeScript compatibility declarations, including historical HEURISTIC_CANDIDATE labels; execution always throws unavailable. Node's legacy success serializer is unreachable under that implementation and cannot yield a certified result. No current working BTR is claimed.
- Legacy SQL defaults appear in migration regression fixtures so removal is actually exercised. Runtime schema/default migration no longer initializes conflict_resolved=true or a birth city.
- Historical aistudio source remains in Git for history but is excluded by both Vite publicDir settings, not copied to the web runtime image, and explicitly404 at server boundaries. It is not a second deployed API.
- RVM helper illustrations and sample UAT inputs are not personal recommendation authority; public RVM/AI routes and browser recommendation views are disabled. No sample graph/profile authorizes access.
- Tests contain deliberate malformed/forged data and generic HMAC keys; these are not production credentials. Evidence excludes ephemeral DB credential files.

No credentials were requested in chat or embedded. Tests generated isolated database credentials and cleanup removed them. No production rows were read/migrated. No dependency/advisory scanner or external penetration test was run; do not interpret green unit tests as their substitute.

## Remaining exact boundaries

`ExecuteRectification` (root and backend/calibration), `executeBirthTimeRectification` (both TS trees): verified Dasha/milestone method absent,503/unavailable.
`ResolveConflictMatrix`, `HydrateUserGraph`, browser resolver: trusted auth/graph/rules absent, unavailable.
`WebhookServer.HandlePaymentCallback` (both Go copies) and Node payment handlers: selected provider/raw protocol/sandbox/auth/DB adapter absent,503.
`Store.ApplyVerifiedEvent`: implemented/tested inactive domain; must never be exposed without real verification.
`calculatePersonalGoldenWindow`: returns unavailable personal output; city registry remains unverified2026 general preview.
`calculateFullChart`: approximate preview only; independent accuracy acceptance remains blocked.
