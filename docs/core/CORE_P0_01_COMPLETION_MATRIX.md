# CORE-P0-01 live completion matrix

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
