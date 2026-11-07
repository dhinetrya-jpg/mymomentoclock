# CORE-P0-01 final accuracy report

## PR21 current acceptance update — 2026-11-07

**FAILED — REQUIRED ACCEPTANCE TESTS FAIL.** This supersedes the earlier PARTIAL verdict and limited numerical scope preserved below as a historical snapshot. Current evidence: [planetary report](CORE_P0_01_PR21_PLANETARY_VALIDATION.md), [Panchang/solar report](CORE_P0_01_PR21_PANCHANG_SOLAR_VALIDATION.md), [repair matrix](CORE_P0_01_PR21_REPAIR_MATRIX.md).

Independent JPL DE421/Skyfield evaluation admits 40 body/epochs per mode across five centers, exact TT J2000, historical 1975, modern, equinox/wrap, retrograde and full/new Moon. Each mode has 160 position/distance/speed scalar checks. SWISS_FILE passes all 160; MOSHIER Moon fails twice at unchanged 0.0002°: +0.000452369889814° (1975) and -0.000229132543495° (2026 full Moon). No expected value, tolerance or astronomical correction was fitted. Ten pre1972 mode/body records are NOT_ADMITTED due to UTC/UT1 epoch incompatibility.

Additional dated evidence: 42 Tithi/Karana boundaries, 14 solar noons, 14 tropical ascendants and 16 time-scale scalars from four observed IERS Bulletin A records. Rise/set remain different-definition diagnostics. Matched sidereal offset/nodes/Jupiter/Saturn centers, complete Panchang/chart/traditional acceptance remain incomplete. This is independent evaluation against shared underlying JPL theory, not independent observational confirmation; numerical budgets are not source observational uncertainty.

Optional native JPL mode is unsupported/NOT_TESTED with a real native kernel; its absence alone is not a mandatory release blocker. The reference SPK is not a compatible native Swiss JPL kernel. Native/data commercial-license choice and redistribution review still require owner/legal decisions. No legal approval is inferred.

Default Go evaluator execution emits every scientific FAIL and is not an accuracy PASS. `sh scripts/test-core-pr21-acceptance.sh` sets `CORE01_STRICT_SCIENCE=1` and fails on numerical discrepancies. The top-level verifier calls strict acceptance after engineering checks. Customer timing remains disabled; provider Load refuses admission; ranking/payment/auth/entitlements are unchanged. No merge or deployment.

## Historical implementation snapshot (superseded where above differs)

As of2026-11-07 (Asia/Kolkata). **CORE-P0-01 PARTIAL — BLOCKERS REMAIN.** Engineering implementation and operational tests are distinct from full independent astronomical acceptance. No production or personal timing release authorization.

## Source admission and measured scope

The four legacy text exports and both old JSON datasets are quarantined by `tests/calculation/reference/legacy_quarantine.json`; their32 scenarios are retained, not silently replaced. Their local checksums match local files, but checksums do not prove institutional origin. Prior bibliography/retrieval labels and GO reports were not sufficient evidence.

New `reference/acquired/` preserves12 genuine immutable upstream resources, final URLs/40character revisions, retrieval times, SHA256 and license files. Original bytes and normalization are separate. Controlled refresh: `python3 scripts/core-reference-acquire.py refresh`; offline verification: `verify`; strict scientific acceptance: `accept`. Eight adversarial tests reject missing/tampered captures, altered numbers, HTTP403-as-success and vendor-data-as-independent-evidence.

Direct NASA Horizons, USNO, IERS, IANA-server and PAC queries returned proxy403. Exact queries and failures are retained; no NASA-looking export was fabricated. Available sources are Skyfield's published Horizons-derived vectors, ERFA's independent standards test vectors and IANA maintainer rules/archived leap list from immutable official GitHub repositories. These are honestly attributed upstream publications, not direct NASA/PAC authenticity claims. Swiss vendor data proves runtime mode availability, never independent accuracy.

Native comparisons admit two Sun UTC epochs in2005 (seven and eightUTC hours), each in MOSHIER and real SWISS_FILE modes, longitude and latitude:4mode-epoch pairs/8scalar comparisons. All use unchanged upstream0.0002degree longitude/0.00001degree latitude bands. Native measurements and signed residuals are recorded in the final Go log. No admitted numerical coverage exists for Moon/Mercury/Venus/Jupiter/Saturn/nodes/speeds/distance/ayanamsa/dated houses/solar/Panchang. A third captured Mars vector remains NOT_ADMITTED because barycenter/native-center and pre1972 epoch compatibility is unestablished.

Five published ERFA cases exercise actual native UTC→TT/TAI/UT1 conversion, calendar JD and the1994-06-30 23:59:60.13599 leap label. Rounded single-JD residuals are zero on these cases; this is not zero physical uncertainty. The explicit float64/source budget is retained in the result records. UTC quasi-JD leap-day scaling uses86401seconds, preserving :60 instead of normalizing it into the next day. UT1 is labeled modeled unless explicit DUT1 is supplied, and caller DUT1 is not falsely called observed.

## Contradictions resolved or explicitly unresolved

| Finding | Disposition |
|---|---|
| J2000 Mars old15-case tropical333.178/sidereal309.3209 vs32-case purported export tropical309.320914/sidereal285.463822 |Both source claims quarantined. Do not choose whichever agrees with a model. Genuine matched J2000 source remains pending |
| Claimed analytical Mars error25.8005degrees vs different frame yielding49.657578degrees |Neither is admitted scientific error; old result mixed incompatible unverified coordinates. Legacy diagnostic residual is null when frame/reduction is unestablished |
| Claimed Moon precision2degrees vs later6degrees and different Moon reference values |No fitted band accepted. Real native Moon is computed but independent matched source comparison remains pending |
| J2000.0 labeled UTC/UT1/TT interchangeably |Correct definition is JD2451545.0 TT; UTC noon is a different instant. Native TT/UT1/UTC fields and leap labels now separate; model/caller DUT1 disclosed |
| Fake apparent/ecliptic frame or source-header certainty |Admission requires source hashes, exact frame/center/time/body compatibility; unsupported comparisons are refused |
| Universal69.184second DeltaT |Removed from TS resolver. TT/UT1 remain null without explicit time-scale evidence; no fabricated historical conversion |
| TRUE_LAHIRI metadata while native used SE_SIDM_LAHIRI |Actual native metadata now SWISS_SE_SIDM_LAHIRI; canonical API rejects misleading alias, legacy alias is explicitly deprecated |
| Claimed native accuracy test only parsed dates |Renamed legacy suite honestly. Actual CGO numerical comparisons now execute, missing packaged references fail instead of silent skip |
| Panchang solver Date.now/false convergence, fake polar events, rounding loss |Repaired determinism/UTC rollover/half-open Tithi/brackets/failure/polar behavior. Native provider now supplies real solar and Panchang data |
| D2/D9/D60 classified rounded display degrees |Uses available full input longitude; tested before/at/after boundaries. Native D60 suppressed for non-EXACT birth time; traditional deity/sign interpretation still unapproved |
| Swiss mode leaked across concurrent legacy/native calls |Observed and fixed with full state/path/tidal reset under shared mutex; concurrent actual-mode tests pass |

## Implemented native science and conventions

The existing pinned Swiss2.10.03 library/source175e1fcb3108bcd5c0d146c803f51dcf23508012 remains the sole native astronomy engine. Canonical API computes nine bodies (Sun/Moon/five visible planets/mean and true nodes), tropical/sidereal coordinates, latitude/distance/real speeds and retrograde, actual Lahiri, native ascendant/whole-sign houses, UTC/TT/UT1, explicit leap labels, native sunrise/set/noon and polar/cross-midnight daylight. SWISS_FILE uses hash-verified official DE441 files; JPL refuses absent kernel and is NOT_TESTED with a real kernel. Required mode never silently falls back. Flat horizon, modeled pressure/elevation,15C and upper-limb assumptions are explicit; no sub-minute real-world solar accuracy promise.

Native Go Panchang uses the same native Sun/Moon for Tithi/Paksha, Nakshatra/Pada, Yoga, Karana fixed/movable cycles, civil and sunrise-based Vara variants, full enclosing factor start/end and constant-factor UTC intervals. The bounded unwrapped transition solver reports bracket/residual separately from astronomical accuracy. Polar days never invent sunrise-derived intervals. Exact-pole ascendant is refused; daily geocentric Panchang may still be computed without houses.

Rahu/Yamaganda/Gulika daylight-eighth schedules, Abhijit daylight-fifteenth and fixed96-to48minute Brahma variant are versioned **unapproved traditional measurements**, not personal favorable/unfavorable guidance or invented classical citations. Alternatives and source/owner approval remain pending. Native D2/D9 numeric mappings and D60halfdegree segments have explicit convention/representation-boundary caveats; mathematical mapping tests do not establish astrological or underlying longitude accuracy.

`backend/internal/astronomy/capabilities.json` is the per-capability implementation/mode/convention/validation inventory. Scientific snapshot/day/UTC-label/capability endpoints have strict schemas, bounded POST bodies/no URL birth data/no-store/safe errors. Server-owned config chooses data paths/hashes; browser requests cannot. Metadata remains COMPUTED_UNVERIFIED/NOT_INDEPENDENTLY_VERIFIED.

## CORE-P0-02 and release boundary

`timing.NativeAstronomyProvider.Inspect` supplies a versioned real natal/day payload. `Load` refuses incomplete independent acceptance; it never labels real unvalidated data Synthetic. Existing ranking and NativeEngine registration remain unchanged. No synthetic production rule is installed. Native readiness or a source report cannot activate personalized timing; traditional rule/release approvals remain separate.

## Deployment/license limits

Local native linkage, missing/files-present mode checks and containers are tested as recorded in FINAL_TEST_EVIDENCE; remote CI observation is separately reported. No production migration/deployment or payment/auth/entitlement change. Reader/library AGPL/commercial terms and data terms are distinct; original licenses are preserved. Commercial distribution/license choice requires owner/legal review; no legal compliance certification or paid purchase is made. No supported local JPL kernel was supplied.

## Executed numerical summary

| Calculation | Source | Samples | Maximum | Mean / median / p95 | Unchanged tolerance | Status |
|---|---|---:|---:|---|---:|---|
|Sun tropical_longitude / MOSHIER|Immutable upstream Skyfield Horizons-derived publication|2|1.76711725e-05°|1.76503811e-05 / 1.76503811e-05 / 1.76711725e-05°|0.0002°|PASS for this subset|
|Sun latitude / MOSHIER|Immutable upstream Skyfield Horizons-derived publication|2|7.75206172e-06°|7.71691439e-06 / 7.71691439e-06 / 7.75206172e-06°|1e-05°|PASS for this subset|
|Sun tropical_longitude / SWISS_FILE|Immutable upstream Skyfield Horizons-derived publication|2|1.31678222e-05°|1.31647126e-05 / 1.31647126e-05 / 1.31678222e-05°|0.0002°|PASS for this subset|
|Sun latitude / SWISS_FILE|Immutable upstream Skyfield Horizons-derived publication|2|4.31838577e-06°|4.29162591e-06 / 4.29162591e-06 / 4.31838577e-06°|1e-05°|PASS for this subset|
|ERFA calendar / UTC-TAI-TT-UT1 / leap quasi-JD|Published ERFA standards vectors|5|0 rounded single-JD residual|Representation/source budget, not physical uncertainty|0 or40.3195µs; leap86.4402ms|PASS for published cases|
|Moon / other planets / speeds / distance / ayanamsa / houses / dated solar-Panchang|Compatible independent records absent|0 admitted|Not measured|Not available|Not invented|BLOCKED|
|Analytical apparent-Sun diagnostics|Same upstream source, time-model limitation explicit|2|0.0030968° difference|0.00308975 /0.00308975 /0.0030968°|0.0002° not widened|NOT_ACCEPTED; no global accuracy claim|

Full signed residuals and per-mode statistics: `evidence/core01/numerical-summary.json`. P95 uses nearest rank; two samples are deliberately reported as two, not a population precision guarantee.

The retained Vancouver scenario uses actual2024 inputs although description text says2026; no2026 external comparison is claimed. The32case quarantine sidecar records this and the invalid180degree legacy Tithi expectation.
