# Independent inventory audit — MyMomentOclock

Audit date: 2026-11-22 Asia/Calcutta (host UTC 2026-11-21). Exact inspected base: `03a5f5e7704c1e07aaa0de5bcbb9e301948bd4a8`, `/workspace/mymomentoclock-release`. Read-only source audit; no production, payment, merge or deployment action. The claims below distinguish code inspection from historical report claims. No new executable tests were run by this inventory audit.

## Verdict

Private product readiness is not established. Existing documents consistently retain NO-GO. The repository contains engineering contracts and milestone reports, but no authoritative full approved product feature matrix or approved traditional activity rulebook. Do not equate historical PASS rows with a fresh integrated audit or domain approval. PR27 diagnostic comparisons are explicitly unadmitted, and the real F01 reference manifest remains empty.

## Source register and authority

All file versions below are their Git blob contents at the pinned base above; filenames/embedded schema or contract versions identify the narrower scope. They are repository implementation records, not evidence of independent owner approval.

| Source | Version / scope | Consequence |
|---|---|---|
| README.md | Current base; Phase1 NO-GO statement | Later feature descriptions are historical goals, not implemented inventory |
| docs/remediation/CFRS_MASTER_TRACKER.md | CFRS historical tracker; final reconciliation references b0c9af | CFR-001..004 partial; CFR-005..018 definitions not supplied; cannot invent completion |
| docs/remediation/PHASE1_FINAL_RELEASE_GATE.md | 2026-11-05; original implementation 95efe71f4906bf7e268590a8e791e440579f35f4 | Unsupported routes disabled; independent accuracy and owner infrastructure/domain approvals blocked |
| docs/core/CORE_P0_01_OPTION_A_ARCHITECTURE.md and CORE_P0_01_FINAL_* | CORE01 Option A, later than original remediation | SWISS_FILE production candidate; Moshier diagnostic; flags remain unauthorized |
| docs/core/CORE_P0_01_TOLERANCE_POLICY.md / REFERENCE_PROVENANCE.md | CORE01 numerical conventions | Source and center compatibility essential; same-definition references required |
| docs/core/CORE_P0_02_RULE_MATRIX.md | timing-rules-v1 | Six activity registries unavailable, OWNER_RULE_SOURCE_REQUIRED |
| docs/core/CORE_P0_02_HANDOFF.md | CORE02 historical implementation handoff | Technical machinery only; T03/T12 blocked; stale astronomy omissions superseded by later CORE01 |
| docs/features/F01_BIRTH_TIME_UNCERTAINTY.md | f01-sensitivity-v1 | Exploratory uncertainty, explicitly not certified BTR |
| docs/features/F01_P0_01_TRANSITION_REFINEMENT.md | Observed transition refinement | Bounded sampled observations, not exhaustive stability proof |
| docs/features/F01_P0_02_SRIPATI_GEOMETRY_VALIDATION.md | Internal Porphyry midpoint check | Every sample/refinement geometry checked; not independent astronomy |
| docs/features/F01_P0_03_EXTERNAL_REFERENCE_ADMISSION.md | F01 manifest schema1 | Empty manifest; admission tooling only, no independent acceptance |
| docs/features/F01_P0_04_CROSS_ENGINE_NUMERICAL_DIAGNOSTICS.md | JyotiPy0.2.1/PyMeeus0.5.12, Swiss2.10.03 | Eight cases COMPARISON_COMPLETED_UNADMITTED; shared Sripati geometry lineage |
| docs/payment/PAY_P0_03_RELEASE_GATES.json | report schema1, as_of2026-11-06 | activation NO-GO, authorization false, genuine calls0 |

Missing approved master matrix blocks certainty about full feature inventory/completion. Missing rulebook blocks personalized work/interview, purchase/transaction, travel, learning/exam, family/personal and finance/trading timing rules. Missing approved Dasha/BTR/resolver/graph/remedies methods blocks their substantive implementation and acceptance. Missing current merchant/provider identity, approved product catalog, legal, infrastructure and operational decisions blocks real payment activation/deployment acceptance. These do not block narrow privacy/parser hardening and verification of existing safety behavior.

## Implemented versus independently verified

| Area | Code / historical evidence | Remaining acceptance |
|---|---|---|
| CORE01 native astronomy | Pinned Swiss-file engine, IANA data, solar/Panchang and fail-closed guards present. Historical compatible planetary comparison 224/224 agrees; Moshier cross-mode has12 scalar failures, and body-center differences matter. | Fresh integrated execution; independent sidereal/node/same-definition solar coverage, scientific/traditional signoff and licensing/release approval remain partial/blocked |
| F01 uncertainty | Exact/approximate/range/unknown, explicit DST offsets and rollover,17 initial samples, bounded transition refinement, whole-sign/Rashi versus Sripati, native geometry, mTLS gateway/UI present | No exhaustive stability proof, no qualified independent end-to-end Sripati reference, high-latitude and performance scope incomplete, certified BTR unavailable |
| F01 reference tooling | Empty admitted manifest, raw source SHA preservation, conventions and geometry checks present | Metadata labels plus checksum do not prove independence or correspondence to source; see finding A02 |
| CORE02 personalized timing | Generic source-traceable rule schema, interval/ranking machinery and six unavailable registries | No approved real rules. Synthetic tests prove algorithms only; recommendations remain unauthorized |
| Payments | PostgreSQL durable state/entitlement guards, provider adapters, HMAC, checkout/CSRF cookie, reconciliation/refund/monitoring machinery historically tested | Genuine sandbox/order/payment/webhook/refund not established; no authorization for live calls. G01/02/05/08/12/17–23/26 blocked; G24 deployment and G25 restore/PITR/on-call untested |
| Auth/profile/graph/remedies/AI | Refusal and scoped safety paths described; unsupported capabilities disabled | Owner specs/identity ownership/AI consent/privacy and product-specific acceptance absent |
| Deployment / UX | Build/static deployment and safety/UI tests exist historically | Current CI observation, integrated runtime validation, actual private infrastructure/TLS/data retention/restore gates required |

## Concrete eligible engineering findings

### A01 — P1: public F01 response projection can reflect arbitrary private upstream fields

`server/f01Boundary.ts:37` validResponse does not validate `timezone_database`, `start_utc` or `end_utc`. It validates four selected geometry properties but does not disallow other properties. `server/f01Boundary.ts:64–68` directly forwards the first three values and the complete geometry object. Therefore an upstream object-valued timestamp/database field, or `geometry_check.birth_input`, can expose data at the public boundary despite the stated fixed-schema projection. mTLS does not make malformed responses safe to publish. `request` parameter is unused; interval and transition bounds are not associated with the request.

Existing `tests/f01/contracts.test.tsx` happy-path test strips raw samples and unknown top-level fields, but its valid fixture omits timestamps and timezone database entirely and does not insert private nested geometry fields. This regression is missed by existing test structure.

Eligible fix: validate normalized UTC strings, bounded start/end and timezone database shape against native contract; construct geometry output explicitly from accepted scalar keys; reject object-valued fields, malformed brackets and dates outside accepted interval. Preserve privacy and no-authorization flags. Required evidence: adversarial upstream fixtures that include nested birth details and object-valued metadata, plus valid real native shape and full existing F01 contract suite. Request binding should use pinned native time conventions rather than silently relying on unpinned host timezone calculations.

### A02 — P1 evidence integrity: reference admission does not establish source qualification

`backend/internal/f01reference/reference.go:101–107` accepts free-text producer/method/version, a short blacklist, HTTPS prefix, checksummed original file and expected cusps. It does not bind cusps/time/location/conventions/tolerance to contents of the original file or record source precision/tolerance derivation/reviewer qualification. A shared-formula candidate can evade a Swiss-name blacklist through its wrapper's name. This is relevant because JyotiPy Sripati geometry is transcribed from Swiss houses, despite separate PyMeeus planetary astronomy.

Eligible engineering improvement: explicit qualification status/source precision/tolerance rationale and evidence binding, with rejection of unqualified sources; continue keeping manifest empty until Research/Auditor establish actual source eligibility. Do not claim executable admission tooling itself establishes independent truth.

### A03 — P2 parser edge cases to verify, not yet reproduced

`reference.go:122` decodes through `io.LimitReader(file,1<<20)`: valid JSON padded to the cap may hide trailing content beyond cap from EOF checks. ExpectedCusps uses `[12]float64`, and Go JSON decoding can discard excess array entries; exact12 admission contract should reject a13th cusp explicitly. These require targeted reproduction before being reported as confirmed regressions.

## Next eligible sequence

1. Fix A01 on isolated integration branch; run adversarial and normal contract/runtime checks. Independent exact-head review must inspect diff plus executable output.
2. Qualify PR27 original evidence through Research; retain diagnostic/unadmitted status unless all independence/convention/precision gates pass. Geometry-only coverage must be named narrowly.
3. Reproduce A03 and harden reference parsing if confirmed; add targeted non-mirroring regression tests.
4. Persist feature backlog and dated source register; refresh integrated calculation/payment safety/build checks without changing release flags or making real provider calls.
5. End-to-end release audit can report scoped engineering results, but cannot declare full readiness until missing owner specs and release gates have concrete evidence.
