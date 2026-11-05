# CFRS-P0-01-CODEX changes

Overall status: PARTIAL across the repository; verified coverage is the root Node/React path and matching browser modules. Base commit: 5d7e2e5c7901b5735586cafa60f268e4b979fbf6.

## Confirmed defects and resulting behavior
| Original location / cause | Result and compatibility |
|---|---|
| server.ts:76 / format-only birth checks | Shared Gregorian/leap-year/time/finite-coordinate/UTC-offset/ayanamsa validation. Existing missing-field checks remain. Missing offset now yields 422 rather than assuming India. UNKNOWN time is rejected; APPROXIMATE is disclosed, not certified. |
| astroMath.ts:499 / `parseInt(hour) || 12` | Valid midnight stays zero. Representative non-midnight chart numerics match baseline exactly. This intentionally changes midnight calculations; it is a JavaScript zero-fallback defect, not an ephemeris replacement. |
| diwaliData.ts:233 / name hash and fixed 18:00 hour | Same result for all names, null personal times/ruler/duration, typed scope UNAVAILABLE. City registry retained as unverified Diwali 2026 preview, source/date limitations explicit. No daily calculation fabricated. |
| server.ts:315 / silent Delhi fallback | Explicit city required, exact case-insensitive/trimmed match only, 422 typed errors with supported list. Coordinates/timezone overrides and activity/date/duration/tradition requests rejected. Birthplace not used as event city. |
| btrProcessor.ts:80 / sample event and noon fallback | Actual validated milestones required; candidate search retains existing heuristic, offset and ayanamsa propagated; date-crossing candidates excluded rather than wrapped onto wrong date. UI accepts actual event dates/types; apply remains explicit. |
| server.ts:184 / heuristic threshold treated as certification | v1 schema_version=2 assessment metadata, is_certified=false always; no confidence_score/certification_threshold. Legacy candidate time aliases retained with independent_validation_status NOT_PERFORMED. Zero milestones returns 422. No 0.75 threshold retained. |
| server.ts:255 / client user_id and fixed Kolkata chart | 503 PROFILE_GRAPH_UNAVAILABLE, false verification, null vector. No profile returned for any ID. Auth/ownership integration is absent, not invented. |
| conflictResolver.ts / constant graph payload and positive default yoga | Synthetic verifiedGraphPayload and fallback yoga removed; conflict flag reflects actual opposing triggered yogas. Missing graph data stays absent. Existing scoring formula preserved; no independent validation claimed. Resolver outputs can intentionally change where synthetic yoga previously contributed. |
| App.tsx / example native initialization | No natal profile until wizard input. Empty dashboard/remediation state links to editor. Birth form no prefilled date/time/city and requires explicit UTC offset. |
| BtrModal / verified sample events and true-time labels | Actual milestone entry, candidate and internal-fit labels, original time retained, no automatic apply. |
| ConflictResolverModal / fallback JSON vectors | Null graph fields and actual computed heuristic values. |
| DeshaKalaPatraAI / fixed 0.88 and +05:30 | Sends original local time and actual supplied offset, no fake BTR rating. Server no-key fallback returns unavailable text, no financial vectors or golden window. Live provider was not called. |
| Dashboard/Countdown/Kit/Funnel | Unsupported personal timing claims replaced or explicitly disclosed as static/unverified illustrations. Funnel remains a clearly labeled synthetic demonstration and does not initialize the actual native chart. No payment behavior changed. |

## API transition
Birth-input response chart fields remain; additive scope_metadata discloses uncertainty/timezone limitations. BTR camelCase aliases remain for local consumers, deprecated semantically in favor of candidate_* metadata. v1 BTR payload declares schema_version=2; external consumers expecting confidence_score/certification_threshold must migrate. Old k6 script still expects obsolete certification and is explicitly not a passing compatibility target. The GET resolver intentionally becomes unavailable pending an authenticated graph/profile service. Muhurat timing fields become nullable; root and frontend/ consumers updated together. No public API usage registry exists, so unknown external consumers remain a rollout risk.

## Scope limits
No payment handlers, entitlement grants, credentials, dependency manifests/lockfiles, database tables, CGO/linker settings, infrastructure or environment drafts changed. Go backend and root Go blueprints remain unremediated and are release blockers. No astronomical accuracy certification, new auth system or new timing formula is asserted.

## Exact changed-file inventory

- `docs/remediation/CFRS_MASTER_TRACKER.md`
- `docs/remediation/CFRS_P0_01_CODEX_BASELINE.md`
- `docs/remediation/CFRS_P0_01_CODEX_CHANGES.md`
- `docs/remediation/CFRS_P0_01_CODEX_HANDOFF.md`
- `docs/remediation/CFRS_P0_01_CODEX_TEST_REPORT.md`
- `frontend/src/App.tsx`
- `frontend/src/components/BtrModal.tsx`
- `frontend/src/components/ConflictResolverModal.tsx`
- `frontend/src/components/ConversionFunnelView.tsx`
- `frontend/src/components/DashboardView.tsx`
- `frontend/src/components/DeshaKalaPatraAI.tsx`
- `frontend/src/components/DiwaliCountdown.tsx`
- `frontend/src/components/DiwaliProsperityKit.tsx`
- `frontend/src/components/OnboardingWizard.tsx`
- `frontend/src/components/TimingScopeNotice.tsx`
- `frontend/src/engine/astroMath.ts`
- `frontend/src/engine/btrProcessor.ts`
- `frontend/src/engine/calculationValidation.ts`
- `frontend/src/engine/conflictResolver.ts`
- `frontend/src/engine/diwaliData.ts`
- `frontend/src/engine/uatAndStress.ts`
- `server.ts`
- `src/App.tsx`
- `src/components/BtrModal.tsx`
- `src/components/ConflictResolverModal.tsx`
- `src/components/ConversionFunnelView.tsx`
- `src/components/DashboardView.tsx`
- `src/components/DeshaKalaPatraAI.tsx`
- `src/components/DiwaliCountdown.tsx`
- `src/components/DiwaliProsperityKit.tsx`
- `src/components/OnboardingWizard.tsx`
- `src/components/TimingScopeNotice.tsx`
- `src/engine/astroMath.ts`
- `src/engine/btrProcessor.ts`
- `src/engine/calculationValidation.ts`
- `src/engine/conflictResolver.ts`
- `src/engine/diwaliData.ts`
- `src/engine/uatAndStress.ts`
- `tests/calculation/baseline-chart.json`
- `tests/calculation/integrity.test.tsx`
