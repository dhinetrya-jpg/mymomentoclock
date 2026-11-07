# CORE-P0-01 final accuracy report

## Option A final accuracy — 2026-11-07

**Engineering checks PASS. Selected SWISS_FILE numerical subset PASS (224/224). Full production science PARTIAL. Full cross-mode science FAIL (12 MOSHIER scalar failures). Customer release NOT AUTHORIZED.**

Actual pinned native version2.10.03/source175e1fcb3108bcd5c0d146c803f51dcf23508012 and exact SWISS_FILE DE441 hashes remain unchanged. No astronomical output, expected value or numerical band was adjusted to obtain agreement. The architecture distinction is explicitly owner-authorized in Option A, not an implicit waiver of diagnostic failures.

### Target-admission correction

Official Swiss documentation sections2.4/Test6 establishes that default planetary calculations use system barycenters for Mars/Jupiter/Saturn, not physical centers of body. Native metadata previously said only BODY and the prior audit incorrectly assumed COB. We corrected metadata/admission, not calculations. Genuine JUP310599-versus-native5 is now NOT_ADMITTED even though its numerical residuals fit the band. The first misadmitted run/data remain preserved in `verify-initial-target-policy.log` and `production-initial-center-mismatch.json`, explicitly superseded.

Matched DE421 target5/6 references now cover Jupiter/Saturn at all eight admitted epochs. Original five-body expected values are unchanged. DE4211→199,2→299,4→499 zero-vector position/velocity aliases are explicitly verified at every compared TT epoch and±60s sample; this supplies the missing justified target transformation for original Mercury/Venus/Mars references, not a physical Mars COB claim. Physical COB output remains unrequested/unverified and must not be silently substituted.

### Production numerical summary

56 admitted body/epochs across seven default targets, eight distinct TT epochs, four quantities each =224 scalar comparisons. Historical1975, exact J2000 TT, modern, equinox/wrap, retrograde and full/new Moon are retained. Location does not duplicate geocentric planetary samples. The additional pre1972 rows are rejected on unmatched UTC/UT1 instants, not counted as passing measurements.

| Body | Quantity | Samples | Maximum residual | Median | p95 nearest rank | Unchanged tolerance | Status |
|---|---|---:|---:|---:|---:|---:|---|
|sun|tropical_longitude|8|3.94906181e-07|1.78867055e-07|3.94906181e-07|0.0002|PASS|
|sun|latitude|8|7.17313805e-08|3.67680982e-08|7.17313805e-08|1e-05|PASS|
|sun|distance_au|8|5.35384004e-09|1.67514874e-09|5.35384004e-09|1e-06|PASS|
|sun|longitude_speed_deg_per_day|8|5.08679693e-07|2.26806474e-07|5.08679693e-07|0.0002|PASS|
|moon|tropical_longitude|8|1.13718465e-06|6.02658915e-07|1.13718465e-06|0.0002|PASS|
|moon|latitude|8|1.3266261e-07|2.96505734e-08|1.3266261e-07|0.0002|PASS|
|moon|distance_au|8|2.51413001e-11|1.24586691e-11|2.51413001e-11|1e-06|PASS|
|moon|longitude_speed_deg_per_day|8|6.12242713e-05|2.04006862e-05|6.12242713e-05|0.0002|PASS|
|mercury|tropical_longitude|8|5.68970393e-07|2.41807868e-07|5.68970393e-07|0.0002|PASS|
|mercury|latitude|8|1.02828338e-06|4.45427677e-07|1.02828338e-06|0.0002|PASS|
|mercury|distance_au|8|6.03555406e-09|2.605967e-09|6.03555406e-09|1e-06|PASS|
|mercury|longitude_speed_deg_per_day|8|7.67556444e-06|9.88467965e-07|7.67556444e-06|0.0002|PASS|
|venus|tropical_longitude|8|5.11186727e-07|1.61055894e-07|5.11186727e-07|0.0002|PASS|
|venus|latitude|8|7.59124503e-08|6.00586921e-08|7.59124503e-08|0.0002|PASS|
|venus|distance_au|8|4.83353313e-09|1.09085563e-09|4.83353313e-09|1e-06|PASS|
|venus|longitude_speed_deg_per_day|8|1.81995936e-06|1.45299848e-06|1.81995936e-06|0.0002|PASS|
|mars|tropical_longitude|8|3.72011641e-07|1.71317339e-07|3.72011641e-07|0.0002|PASS|
|mars|latitude|8|1.85090513e-07|9.26243138e-08|1.85090513e-07|0.0002|PASS|
|mars|distance_au|8|3.09740278e-09|9.87870896e-10|3.09740278e-09|1e-06|PASS|
|mars|longitude_speed_deg_per_day|8|7.00472646e-07|4.90081716e-07|7.00472646e-07|0.0002|PASS|
|jupiter|tropical_longitude|8|7.04706395e-07|4.25555925e-07|7.04706395e-07|0.0002|PASS|
|jupiter|latitude|8|5.06294365e-06|3.18917419e-06|5.06294365e-06|0.0002|PASS|
|jupiter|distance_au|8|1.69779906e-08|1.62588218e-08|1.69779906e-08|1e-06|PASS|
|jupiter|longitude_speed_deg_per_day|8|1.76469236e-07|1.24387422e-07|1.76469236e-07|0.0002|PASS|
|saturn|tropical_longitude|8|4.07748416e-07|1.86849888e-07|4.07748416e-07|0.0002|PASS|
|saturn|latitude|8|1.84058263e-07|5.7231297e-08|1.84058263e-07|0.0002|PASS|
|saturn|distance_au|8|2.04434514e-08|1.19774857e-09|2.04434514e-08|1e-06|PASS|
|saturn|longitude_speed_deg_per_day|8|5.11036491e-07|2.81625182e-07|5.11036491e-07|0.0002|PASS|

Units are degrees, AU, or degrees/day as named. Source uncertainty is not invented from a comparison band. Nearest-rank p95 is an observed sample statistic, not a confidence bound or global accuracy claim. Original Sun latitude1e-5° band is retained; other new-body latitude2e-4° and all other PR21 budgets are unchanged.

### Remaining numerical scope

Selected-mode evidence also includes24 independent Tithi/Karana boundaries (including two near-midnight additions and the nearest scanned sunrise-adjacent case), seven matched solar noons, seven tropical ascendants and16 source-backed IERS time-scale scalars. The Kolkata sunrise-adjacent Tithi is11m22.687s from the independent conventional sunrise, not an exact sunrise-Vara boundary proof. Same-definition sunrise/set remain unverified: conventional topocentric center altitude differs from native variable upper-limb/refraction. Diagnostics stay DIAGNOSTIC even inside90s. Sidereal offset/nodes/Nakshatra/Yoga/house/varga acceptance and full enclosing-boundary coverage remain incomplete. Mathematical source comparisons are not independent astronomical evidence.

### Full cross-mode retained failures

The final strict cross-mode run emits576 records, including448 planetary scalar comparisons. SWISS_FILE224/224 pass; MOSHIER212/224 pass and12 fail. Two are the historical Moon longitude failures; ten are newly measured Jupiter/Saturn distance failures at the original1e-6AU band. No diagnostic failure is hidden or mislabeled a passing cross-mode suite.

| Case | Quantity | Expected | Actual | Signed residual | Unchanged tolerance | Status |
|---|---|---:|---:|---:|---:|---|
|J2000_TT_jupiter|distance_au|4.62116360623|4.62116986986|6.2636274647e-06|1e-06|FAIL|
|MODERN_2026_jupiter|distance_au|4.23773305395|4.23773722192|4.16797763414e-06|1e-06|FAIL|
|MODERN_2026_saturn|distance_au|9.93863745028|9.9386445366|7.08632056856e-06|1e-06|FAIL|
|EQUINOX_WRAP_BEFORE_saturn|distance_au|10.486474852|10.4864805053|5.65328130975e-06|1e-06|FAIL|
|EQUINOX_WRAP_AFTER_saturn|distance_au|10.4875449013|10.487550563|5.66169315874e-06|1e-06|FAIL|
|RETROGRADE_2026_jupiter|distance_au|4.7076425606|4.70764367624|1.11564375604e-06|1e-06|FAIL|
|RETROGRADE_2026_saturn|distance_au|10.4540318255|10.4540374|5.57447333627e-06|1e-06|FAIL|
|FULL_MOON_2026_jupiter|distance_au|4.63741901258|4.63742040706|1.39448117054e-06|1e-06|FAIL|
|FULL_MOON_2026_saturn|distance_au|10.4300167298|10.4300223316|5.60172549413e-06|1e-06|FAIL|
|NEW_MOON_2026_saturn|distance_au|10.4843958244|10.4844014588|5.63444582014e-06|1e-06|FAIL|
|HISTORICAL_1975_moon|tropical_longitude|136.949398047|136.949850417|0.000452369889814|0.0002|FAIL|
|FULL_MOON_2026_moon|tropical_longitude|163.102167208|163.101938076|-0.000229132543495|0.0002|FAIL|

Complete machine-readable expected/actual/residual/budget records: `evidence/option-a/production-results.json`, `production-summary.json`, `cross-mode-results.json`. Original raw references, original thresholds and historical failures remain intact. This is independent JPL evaluation with shared underlying solar-system theory, not independent observational confirmation.

## Historical PR21 snapshots — superseded by Option A above

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
