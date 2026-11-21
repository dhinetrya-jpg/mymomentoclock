# CORE-P0-01 live completion matrix

## Option A final acceptance matrix — 2026-11-07

**CORE-P0-01 ENGINEERING COMPLETE — EXTERNAL APPROVALS PENDING.** This is not full scientific acceptance or customer authorization. Architecture was selected by the owner; statuses are supported by executed evidence, not by the selection alone.

| Gate | Requirement | Implementation | Evidence | Final status | Remaining action |
|---|---|---|---|---|---|
|A01|Complete inventory|57 requested calculations with explicit conventions/evidence/eligibility|FINAL_CALCULATION_MATRIX + machine inventory|PASS|No blanket eligibility inferred|
|A02|Pinned native authority|Explicit SWISS_FILE; immutable hashes; no silent fallback; diagnostic request refused|Actual native/mode/version/hash/readiness/provider/API tests|PASS|Optional JPL unsupported; not mandatory blocker|
|A03|Independent reference provenance|Original DE421/IERS/IANA retained; correct target5/6 references; alias proof|Immutable raw SPK, source hashes/reproducers and28 provenance/adversarial tests|PARTIAL|Matched independent node/Lahiri/solar sources|
|A04|Planetary accuracy|Production224/224 tropical/latitude/distance/speed pass; full cross-mode12 diagnostic FAIL|Strict mode-separated machine records; no tolerance relaxation|PARTIAL|Independent sidereal/node quantities; no physical COB claim|
|A05|Temporal correctness|Pinned timezone data; explicit scales/leaps; actual eight-location API|ERFA/IERS, DST/fractional offsets/J2000/polar/API and no-OS-fallback tests|PARTIAL|Broad historical/observed-UT1 evidence; pre1972 restrictions remain|
|A06|Chart acceptance|Native ascendant, whole signs and full-input mappings; D60 guard; node opposites|7 production tropical geometry cases; chart/math/source boundary tests|PARTIAL|Matched sidereal placements and traditional D2/D9/D60 interpretation approval|
|A07|Panchang/solar/traditional|24 independent phase boundaries,7 noon, polar/day coverage;249 rule windows|Dated JPL/Skyfield events vs mathematical source outputs explicitly separated|PARTIAL|Same-definition sunrise/set, independent sidereal events and approved variants|
|A08|Honest metadata/admission|Versioned authority, actual targets/modes/data/time and uncertainty|API/schema/forged-config/diagnostic-refusal tests; all customer flags false|PASS|No release approval implied|
|A09|Operational and license governance|Clean native/web builds, nonroot/read-only/present/corrupt/missing tested; notices retained|Docker/runtime evidence and reuse/license inventory|BLOCKED|Owner/legal AGPL/Professional/data redistribution decisions|
|A10|Reproducible tests/CI|Full local engineering stages pass; production partial and cross-mode fail classified|Final verification logs; final-source remote CI observation in handoff|PARTIAL|Observe final remote head; no overall scientific green claim|
|A11|CORE-P0-02 provider readiness|Natal/day share file authority; UTC/provenance; diagnostics and customer admission refused|Actual same-engine inspection and Load/NativeEngine refusal tests|PASS|PASS technical inspection only; customer activation remains disabled|
|A12|Evidence-based final acceptance|Adversarial target/flag/source/convention audit; concrete owner package|All actionable production engineering fixes verified; science/domain/legal gaps explicit|PARTIAL|No full independent or customer acceptance before external gates|

A04 explicitly separates the selected SWISS_FILE subset from the still-failing diagnostic suite. A07 separates mathematics from astronomical event accuracy. A09 remains blocked on legal decisions. A11 PASS covers technical inspection/refusal, not recommendations. Detailed current limitations are in FINAL_HANDOFF; prior planet-center assumptions below are historical and superseded.

## Historical PR21 snapshots — superseded by Option A above

Initial audit2026-11-06 (Asia/Kolkata), clean baseline main `cc3ab8245ea5d6bced19f5fed200da1528d13154`. This supersedes prior self-declared GO reports; dispositions below begin from source inspection, not report labels. All engineering continues while genuine source/approval gaps remain explicit.

| Gate | Existing / required | Existing coverage and missing evidence | Production dependency / severity | Fix and acceptance | Initial status |
|---|---|---|---|---|---|
| A01 inventory | Browser charts + new analytical Panchang; native4 bodies only | Scattered source/structural assertions; no executable capability inventory | Authoritative provider/P0 | Versioned per-capability code/convention/mode/precision/source inventory | PARTIAL |
| A02 native | Thread-serialized Swiss2.10.03,4 bodies, sidereal lon/lat/speed | No full-mode/file/checksum/runtime path acceptance | Native allbodies/P0 | Extend existing bridge, UTC/TT/UT1, actual flags, tropical/sidereal, houses/solar; execute CGO and missing/files tests | PARTIAL |
| A03 external evidence |32 claimed independent scenarios +4 handwritten-looking raw summaries | No original response, retrieval records or hashes; NASA multi-body export format suspect | All accuracy claims/P0 | Preserve scenarios, quarantine unauthenticated values, reproducible acquisition; capture genuine sources or explicit403 pending | BLOCKED |
| A04 planets | Analytical preview + native4-body wrapper | Legacy test only calendar parsing; broad post-hoc tolerances; Mars/Moon/frame contradictions | Timing longitude accuracy/P0 | Actual native per-body comparisons to compatible genuine external vectors; residual stats and no tolerance relaxation | FAIL |
| A05 time | Go IANA fold/gap parser, TS new resolver | TT/UT1/UTC conflation; constant DeltaT69.184; pre1972/leaps omitted | All epoch calculations/P0 | Explicit Swiss UTC/TT/UT1 and caller-vs-modeled DUT1; genuine standards vectors, native API DST | PARTIAL |
| A06 charts | TS houses/vargas/nakshatra/pada | Mathematical segment tests plus unproven natal longitudes/citations | Birth placement boundaries/P0 | Native ascendant/whole sign; versioned mathematical mapping boundary tests and unapproved-convention disclosure | PARTIAL |
| A07 Panchang/solar |843line TS analytical implementation exists, not production native | Polar fictitious events, Date.now transition epoch, false solver convergence; no authentic solar/PAC tables | Daily provider/P0 | Native Sun/Moon/solar, robust unwrapped solver + UTC intervals; distinguish model tests from external validation | PARTIAL |
| A08 metadata | Preview NOT_PERFORMED; native actual flags | Analytical Panchang called authoritative; fabricated source precision claims | No unverified guidance/P0 | Honest mode/time/data/validation/precision metadata; keep timing and paid capabilities gated | PARTIAL |
| A09 native ops | Pinned library/install/container already implemented | No data-file manifest or present/missing full-mode validation; licensing not approved | Distribution/runtime/P0 | Reproducible data/config health/file verification, Docker tests and license evidence; no legal certification | PARTIAL |
| A10 tests/CI | Existing node/go/frontend/security gates | New Panchang suites not all inCI; old native acceptance silently skips dataset inDocker | Reliable delivered build/P0 | One verification command, offline source checks, actual native/integration/full regressions; strict acceptance exitsblocked | PARTIAL |
| A11 timing provider | CORE02 typed provider/interval/ranking exists and staysoff | No admitted native daily inputs; activity rules unapproved separately | Personal timing/P0 | Native versioned astronomy payload + adapter with explicit admission refusal; no ranking rewrite/activation | BLOCKED |
| A12 acceptance | Multiple contradictory unsupported GO/complete docs | No executed independent numerical evidence/remote CI confirmation | Release evidence/P0 | Supersede oldclaims, skeptical cross-check, final evidence-backed statuses not source-header claims | FAIL |

Task graph: source acquisition + native/time contracts → planetary/solar/Panchang outputs → mathematical chart/boundary/interval tests → source-compatible residual comparisons → guarded CORE02 provider → offline/full verification + container/CI observation → contradiction reconciliation and final A01–A12 disposition. Paid services, deployment, payment/auth and customer entitlements are outside this change.

## PR21 current disposition — 2026-11-07

**FAILED — REQUIRED ACCEPTANCE TESTS FAIL.** Earlier PARTIAL verdict is superseded by measured Moshier Moon failures.

| Gate | Previous | Changes | Evidence | Final |
|---|---|---|---|---|
|A01|PASS|Inventory retained|Capability API tests|PASS|
|A02|PARTIAL|Both actual supported modes; no fallback|Mode/hash/path/concurrency tests; optional JPL refusal only|PARTIAL|
|A03|PARTIAL|Original DE421 and observed IERS acquired|18 integrity/adversarial tests; reproducible independent evaluator|PARTIAL|
|A04|PARTIAL|40 admitted body/epochs per mode, 4 quantities|160 scalar checks per mode; Moshier Moon fails twice|FAIL|
|A05|PARTIAL|TT J2000, IERS and expanded DST|16 IERS scalars; retained ERFA; actual API requests|PARTIAL|
|A06|PARTIAL|Independent tropical ascendant|14 geometry comparisons; sidereal/varga evidence pending|PARTIAL|
|A07|PARTIAL|Dated elongation roots, noon and polar cases|42 boundaries + 14 noon; rise/set diagnostics only|PARTIAL|
|A08|PASS|Honest metadata retained|Actual modes, modeled/caller DUT1 and admission refusal|PASS|
|A09|PARTIAL|Nonroot/data readiness; optional JPL not a mandatory blocker|Container tests; commercial/data license decision pending|PARTIAL|
|A10|PARTIAL|Fresh engineering runs and strict scientific gate|Execution logs; API denied but normal checks-page observation recovered; strict science fails|PARTIAL|
|A11|PARTIAL|Existing real provider retained|Same-engine/metadata/UTC/customer-admission tests|PARTIAL|
|A12|PARTIAL|Adversarial audit exposes failed bands|No acceptance waiver or release activation|FAIL|

Detailed defects/actions: `CORE_P0_01_PR21_REPAIR_MATRIX.md`. No merge, deploy or customer timing authorization.
