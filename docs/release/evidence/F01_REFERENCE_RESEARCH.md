# Research: F01-P0-05 reference qualification and missing approved specifications

Research base: `03a5f5e7704c1e07aaa0de5bcbb9e301948bd4a8` (main after PR #27). Read-only research; no reference cases admitted or customer/release gates changed. Research date: 2026-11-21 UTC.

## Actionable verdict

F01-P0-05 end-to-end independent Sripati numerical acceptance remains BLOCKED_REFERENCE_QUALIFICATION. The repository manifest has zero references and its originals directory contains only explanatory documentation. PR #27 provides useful reproducible cross-pipeline diagnostics, not an independent Sripati formula reference. No legitimate independently qualified numerical case was located among repository evidence, supplied attachments, or the investigated original candidate source. Do not infer acceptance from small residuals.

Eligible narrower scope is internal geometry consistency: independently written Go circular midpoint geometry over native Swiss Porphyry angles, compared with native Swiss Sripati for all 12 cusps. Its existing 1e-6 degree tolerance is a mathematical/internal consistency threshold. Shared astronomical inputs prevent independent astronomical or complete end-to-end acceptance. Existing fail-closed customer/scientific labels are appropriate.

## Provenance and original candidate inspection

Repository sources at the base above:
- docs/features/F01_P0_04_CROSS_ENGINE_NUMERICAL_DIAGNOSTICS.md; scripts/f01-cross-engine-capture.py; backend/internal/f01crossengine/diagnostic.go.
- docs/features/F01_P0_03_EXTERNAL_REFERENCE_ADMISSION.md; backend/internal/f01reference/reference.go; tests/calculation/reference/f01/manifest.json.
- docs/features/F01_P0_02_SRIPATI_GEOMETRY_VALIDATION.md; backend/internal/ephemeris/sripati_geometry.go.

Original JyotiPy 0.2.1 package metadata was fetched from https://pypi.org/pypi/jyotipy/0.2.1/json, and the pinned wheel from:
https://files.pythonhosted.org/packages/80/f0/3bf4494c1fa8cbbf1b3ef7261caf949a91bf84065603b3b83c7585c9f613/jyotipy-0.2.1-py3-none-any.whl
Wheel SHA256: dcaf59f6528fefab7c34798304918ec9b31ee93a42405718454cfcd8fd5d1c34, matching the repository pin. Original Python files extracted for read-only inspection under /tmp/jyotipy-research; no package installed. Publisher project URL https://github.com/AnandShah10/jyotipy.

Original-file hashes:
- jyotipy/houses.py d3a0bb7be3662203224f8bd75a0ab456f394e119ecec5e479245580f67e0b044
- jyotipy/chart.py 30aece2935b74baa76c473f795c45d8ecbeca6f21537685761f4c19941c42ef0
- jyotipy/ayanamsa.py b8715bb30f65ea7cb0200d21570a1345e8b51574e181300bfce478a8fd39704c

houses.py:113-166 explicitly describes Sripati as “transcribed DIRECTLY from the real Swiss Ephemeris C source (swehouse.c, case 'S')”. It implements six explicit points plus antipodal mirrors and returns house 1 through 12. This original evidence independently confirms the repository's diagnostic limitation. Different programming language/package/planet ephemeris does not remove shared house-formula lineage.

chart.py:80-84 computes tropical Asc/MC, applies that Sripati function, then subtracts its selected ayanamsa from every cusp. houses.py:32-57 obtains PyMeeus true obliquity, nutation longitude and apparent sidereal time before trigonometric Asc/MC calculation. Thus an astronomy-pipeline diagnostic is meaningful, but full formula independence fails.

ayanamsa.py:30-33 defines Lahiri as `23.85 + (5028.796195*T + 1.1054348*T*T)/3600`, with centuries from JD 2451545.0. It does not establish numerical equivalence or accuracy against the required SWISS_SE_SIDM_LAHIRI convention. Binary float output precision supplies no justified model error bound.

utils.py:42-62 converts naive local civil fields using a supplied offset, then calls PyMeeus Epoch with resulting year/month/day/hour. The capture uses explicit UTC Z strings with offset zero, but supplies no DUT1 or explicit separate UT1/TT transformation. Epoch naming `.jde()` does not prove the instant is TT. The j2000_delhi case is 2000-01-01T12:00:00Z, not an explicitly transformed JD2451545.0 TT epoch.

## Admission matrix

| Requirement | Actual PR #27 evidence | Verdict |
|---|---|---|
| Independent formula lineage | Swiss case S directly transcribed | Fail for independent Sripati |
| All 12 cusps | Capture checks list length and records 12 finite normalized values; original function returns 1..12 | Diagnostic coverage only; no checked-in independent original chart |
| Exact chart instant | Eight explicit UTC input instants | Present as nominal UTC civil inputs |
| UTC/UT1/TT conventions | No DUT1; nominal fields passed into PyMeeus Epoch | Not qualified for matched scientific timescale |
| Location | Decimal latitude/longitude for eight diverse sites, including northern/southern/equator | Diagnostic coordinates present; source datum/elevation/error budget not established |
| Lahiri | JyotiPy polynomial above; required Swiss convention unproven | Fail matched convention |
| Cusp definition/numbering | Original function supplies ordered 1..12 boundary cusps; applies tropical-then-sidereal | Algorithm definition inspectable; independence still fails; domain cusp-start vs bhava-midpoint approval still needed |
| Source precision/error budget | Unrounded binary floats; no source accuracy statement | Not established |
| Predeclared source-based tolerance | Internal 1e-6 and schema external ceiling 0.1 degree exist | Neither establishes this candidate's independent tolerance |
| Original retained numeric chart | Independent manifest empty | Fail |

A valid tolerance must be declared before comparing and justified by source rounding, time uncertainty (including time-scale handling), coordinate uncertainty, independently specified astronomical model/convention error, and numerical precision. The maximum allowed 0.1 degree is a ceiling, not a scientific derivation. No numerical external tolerance is defensible for this candidate from available evidence.

## Engineering findings eligible independently of reference research

The existing external admission parser uses Go `[12]float64`. Standard JSON decoding silently discards excess elements and pads missing ones, so it does not strictly prove the original array contained exactly 12 numbers. Use an explicit length check before conversion and regressions for 11/13 values. The diagnostic parser also uses this fixed-array shape.

External admission hashes retained original bytes but does not bind declared chart metadata and cusp values to those bytes. A correct file hash alone cannot establish that the typed values were extracted from that source. Add auditable structured source binding or explicit reviewed extraction with independent confirmation. Do not treat mere hash presence as scientific review.

Producer/method substring rejection of 'Swiss Ephemeris' and related terms cannot prove algorithm independence. Explicit reviewed lineage and source qualification are needed, together with source precision and predeclared tolerance rationale. This must remain fail-closed until original evidence is inspected. Tool hardening is independently eligible; populating with the JyotiPy candidate is not.

## Required unresolved input / alternatives

Needed: an independently authored original worked chart or independent astronomical+Sripati implementation with all 12 published cusp values, authentic versioned source, exact chart instant and stated UTC/UT1/TT treatment, coordinate conventions, exact Lahiri convention, cusp boundary definition and 1-based order, output precision/error statement, and independent lineage. Source qualification must precede numerical comparison. Owner review must separately approve applicable traditional interpretation and uncertainty/release policy.

Alternative A: authoritative worked textbook charts with complete metadata. No such original was available here; extracting partial chart illustrations would not satisfy all 12 cusps or precision.
Alternative B: independently specified quadrant geometry over a genuinely independent angle pipeline such as ERFA/Skyfield. This can add narrowly labeled geometry/model coverage once conventions are matched; it does not automatically become authoritative end-to-end traditional acceptance. Do not copy Swiss/JyotiPy code and label it independent.
Alternative C: same-engine external wrappers offer convention/regression diagnostics only; different wrapper identity does not prove numerical independence.

## Approved specification availability and dependencies

Nine historical user master-prompt attachments are available under /workspace/attachments. They cover first CFRS remediation, final CFRS remediation, PAY-P0-01/02/03, CORE-P0-01/02 and PR21/Option A repairs. /workspace/library-files is empty and no additional source documents were found under /workspace/shared. No separately approved comprehensive current product feature matrix or complete traditional activity rulebook was located. Repository implementation documents are evidence of implementation scope, not proof they exhaust the approved product inventory.

The repository docs/core/CORE_P0_02_RULE_MATRIX.md explicitly says no real traditional activity/natal/Panchang rule is approved. Its six versioned timing-rules-v1 categories require OWNER_RULE_SOURCE_REQUIRED: work/interviews, purchases/transactions, travel, learning/exams, family/personal occasions, finance/trading. They require exact owner-selected tradition/edition/passage, applicability/exclusions, approved predicates, and uncertainty policy. Synthetic engine fixtures verify generic intersection/exclusion/ranking only. All six live personalized recommendation rule sets, production Panchang/sunrise/Rahu facts and corresponding accuracy/release claims depend on missing source approval and independent references. Finance additionally requires owner/legal disclosure review.

The absent complete feature matrix blocks a defensible declaration that the entire approved product is complete, but does not block verified repository-scoped hardening, regression coverage, security/release audits or evidence bookkeeping. Existing F01 methodology docs and source evidence suffice to keep scientific gates closed; they do not supply missing independent acceptance data or owner domain signoff.

## Follow-up — published geometry worked example

V. Subrahmanya Sastri's English edition of *Sripatipaddhati*, chapter I,
slokas 6–8 and the table on printed p. 12 (PDF page 26), publishes all
12 house centers (madhyas) and all 12 junctions (sandhis). The scan
was retrieved from [eBharati Sampat](https://www.ebharatisampat.in/pdfs/ebharati-pdf-1621321809Sripatipadhati.pdf).
SHA-256 of the retrieved PDF is
`c1403fbc0a97fc4f17cdd97c950ad9c5c002ca66c1554629eee06d5dce9a9537`.

Two readers transcribed the image. The junction following house 12
is the start of house 1. The geometry regression supplies the printed
centers directly and compares against the printed junctions, reordered
to start at house 1. The one-arcsecond tolerance allows up to half an
arcsecond from rounding the centers (a midpoint averages that input
error) and half an arcsecond from rounding the published junction.
The test adds a small floating-point allowance. Runtime tolerance and
the reference admission manifest are unchanged.

The example supplies a traditional angle construction and a stated
ayanamsa. An exact modern instant, UTC/UT1/TT conventions, longitude,
and Swiss Lahiri equivalence remain unqualified. This fixture covers
the midpoint operation only. End-to-end external reference admission,
rule approvals, and private release remain blocked.

At base `1ed6d5c886b5055625a231e956ebd3f81505c5de`, the targeted pure-Go
suite (`cd backend && CGO_ENABLED=0 go test ./internal/ephemeris -run
'TestSripati' -v`) passed all three tests. The published example compared
all 12 boundaries with maximum absolute circular error 0.5 arcseconds.

A follow-up [TKS methods inspection](https://panchang.tksephemeris.com/tks-jyotish-methods)
and synthetic equatorial input to the provider's bhava-chalit endpoint
yielded 12 start, center and end rows. The response mixes a top-level
Lahiri label with true Chitrāpakṣa in provenance fields. The methods
describe fitting Lahiri to Swiss and omitting DUT1. The returned chart
lacks an immutable engine revision and a complete input echo. These
gaps prevent matched end-to-end comparison. A versioned export with
resolved field semantics, coordinates, time scales, sidereal
conventions and an uncertainty budget would permit reevaluation.

## Follow-up — LibEphemeris v4 lineage and input conventions

Research baseline: integration `492793423edbef06f9f93b05d40273732a0278da`.
Source inspected: LibEphemeris
[`1abe74d1d5a7693b69a16392795b0521be9892d2`](https://github.com/g-battaglia/libephemeris/tree/1abe74d1d5a7693b69a16392795b0521be9892d2).
Verdict: candidate for explicitly scoped diagnostics. End-to-end admission
remains blocked. No engine vectors were compared.

| Requirement | Pinned source finding | Admission implication |
|---|---|---|
| Geometry | [systems.rs](https://github.com/g-battaglia/libephemeris/blob/1abe74d1d5a7693b69a16392795b0521be9892d2/core/src/houses/systems.rs#L171-L198) attributes the geometry to Śrīpati and Holden (1977). It splits the Porphyry sectors and takes each previous-to-current circular midpoint, with the 12→1 wrap. The [release notes](https://github.com/g-battaglia/libephemeris/blob/1abe74d1d5a7693b69a16392795b0521be9892d2/RELEASE_NOTES.md#L93-L101) state there is no Swiss runtime or source dependency. | Source and indices support the boundary interpretation. The v4 statement is publisher provenance. The original historical worked example remains our separately verified geometry fixture. |
| Frame and time | [Public houses API](https://github.com/g-battaglia/libephemeris/blob/1abe74d1d5a7693b69a16392795b0521be9892d2/core/src/runtime/api/public_houses.rs#L175-L250) takes UT1 JD, geographic north/east degrees and returns 12 ordered cusps for ordinary systems. [House serving](https://github.com/g-battaglia/libephemeris/blob/1abe74d1d5a7693b69a16392795b0521be9892d2/core/src/houses/serving.rs#L389-L441) uses frame ARMC plus longitude and true obliquity. [Frame code](https://github.com/g-battaglia/libephemeris/blob/1abe74d1d5a7693b69a16392795b0521be9892d2/core/src/runtime/api/houses.rs#L500-L540) derives TT from a model delta and uses ERFA nut06a. The [source register](https://github.com/g-battaglia/libephemeris/blob/1abe74d1d5a7693b69a16392795b0521be9892d2/docs/sources.md) identifies the IAU/IERS and Skyfield snapshot lineage. | A reproducible comparison must retain the selected frame and model clock, actual UT1 and TT, UTC/leap table, and a dated Earth-orientation source or justified model allowance. For ordinary Sripati, the house calculation does not consume a planetary position just because the library supports JPL DE files. |
| Lahiri | [LibEphemeris defining pairs](https://github.com/g-battaglia/libephemeris/blob/1abe74d1d5a7693b69a16392795b0521be9892d2/core/src/time/sidereal.rs#L71-L85) use 23.85709166666667° at JD 2451545.0 TT for mode 1. [Swiss 2.10.03](https://github.com/aloistr/swisseph/blob/v2.10.03/sweph.h#L374-L387) uses 23.250182778° minus 0.004658035° at JD 2435553.5 and lists IAU 1976 in the mode record. Its [traditional sidereal house route](https://github.com/aloistr/swisseph/blob/v2.10.03/swehouse.c#L535-L562) applies the extended ayanamsa to its house cusps. | The epochs differ, so the constants cannot be directly subtracted to estimate model error. Matching mode names does not establish the same epoch transport, precession, and nutation conventions. No same-convention uncertainty budget is established. |

The Government of India [Calendar Reform Committee report](https://dspace.gipe.ac.in/xmlui/bitstream/handle/10973/39692/GIPE-043972.pdf),
Final Recommendations (7), specifies a variable ayanamsa of 23°15′00″
on 21 March 1956. [Swiss documentation](https://www.astro.com/swisseph/swisseph.htm),
§2.8.5 and Appendix E, distinguishes that interpretation (Swiss mode 46)
from mode 1, which follows the Indian Astronomical Ephemeris and interprets
its defining number as true despite the source's mean label. The committee
recommendation alone cannot establish the exact LibEphemeris mode 1
J2000 constant. The original IAE 1989 page 556 remains unverified here.

For admission, reconcile the original IAE with the committee report,
document the
mean-to-apparent reduction at common epochs, bind a UTC/UT1/TT conversion
and Earth-orientation input, and justify the predeclared error budget.
Use archived original outputs for all 12 boundaries and retain the selected
settings and output hash. A common-UT1 tropical comparison can provide a
separate frame/geometry diagnostic. Applying Swiss's sidereal offset to the
candidate would share the tested component and cannot validate that component.

The independent geometry slice was integrated in [PR #32](https://github.com/dhinetrya-jpg/mymomentoclock/pull/32).
Post-merge execution at `492793423edbef06f9f93b05d40273732a0278da`
passed all three targeted Go tests with a maximum circular error of
0.5 arcseconds across 12 boundaries. See the
[post-merge checkpoint](https://github.com/dhinetrya-jpg/mymomentoclock/pull/32#issuecomment-7079631235).

## Follow-up — observed clock input at the synthetic noon epoch

The IERS Earth Orientation Centre's
[20u24 C04 noon data](https://datacenter.iers.org/data/255/eopc04_20u24.12h.1984-now.txt)
gives UT1−UTC = +0.3550132 s with formal error 0.0000150 s at
MJD 51544.50. The downloaded file SHA-256 was
`1215c7820301444e5e193e2c5fc84a8f5f17b7fe0b3d4035a8d96535aa140034`.
The [USNO TAI−UTC history](https://maia.usno.navy.mil/ser7/tai-utc.dat)
gives TAI−UTC = 32 s, implying TT−UTC = 64.184 s at the same instant.
The downloaded table SHA-256 was
`3524e1ae34d67e858873a89e59983bbc5bd100221da898e796c1b36036a310c3`.

The linked-native regression supplies the IERS offset to `ConvertUTC`
for 2000-01-01 at 12:00 UTC. It verifies that native Swiss TT is unchanged
by the override, both Julian dates match the tabulated offsets when
rounded to one binary64 Julian day, and the provenance stays explicit.
The observed UT1 and TT Julian days were 2451545.000004109 and
2451545.0007428704. Recovering seconds from these values introduced
about 3.99 microseconds and 1.09 microseconds of rounding respectively.
The test derives its bound from half a Julian-day ULP (about 20.12
microseconds at this date). This bound covers representation of the
epoch only. An angular tolerance must also account for the frame,
location, time data, and verified sidereal convention.

In LibEphemeris, the [native extended house provider](https://github.com/g-battaglia/libephemeris/blob/1abe74d1d5a7693b69a16392795b0521be9892d2/core/src/runtime/api/houses.rs#L389-L406)
still uses bundled time conversions in the sidereal branch when the
public session accepts a frame clock override. The lower-level
[`houses_ex_via_callbacks` interface](https://github.com/g-battaglia/libephemeris/blob/1abe74d1d5a7693b69a16392795b0521be9892d2/core/src/houses/serving.rs#L787-L805)
can supply frame and ayanamsa callbacks for a controlled clock diagnostic.
That route needs explicit call tracing and remains distinct from the
stock session path. No LibEphemeris executable comparison was run.
The modern end-to-end reference criterion remains blocked by Lahiri
provenance and model uncertainty.

## Follow-up — historical cardinal angles at fixed sidereal time

The Researcher examined new published tables and worked examples. A separate
Domain Reviewer independently transcribed the selected cells and issued
**APPROVE NARROWER SCOPE** for the fixed-angle diagnostic before any engine
run. The Engineer then implemented and executed the test against Swiss
Ephemeris 2.10.03, source `175e1fcb3108bcd5c0d146c803f51dcf23508012`.
The research and implementation base was integration
`9c102e04c9dfd62bbd360555882a6b8039f11a2e`.

N. C. Lahiri's [Tables of Ascendants, ninth edition](https://storage.googleapis.com/teachmint/public/institute/members/7d954ce0-c321-4b04-bc22-9e2fab747284.pdf)
uses a fixed 23°27′ obliquity and directs the reader to add 23° to the
tabulated angles for tropical values. The historical construction is
described on printed p. 83. The verified cells are from pp. 8, 9 and 15.
The hosted scan has an incomplete PDF trailer but renders the inspected
pages. SHA-256 of the exact downloaded bytes is
`0ac68933a154870c2804611c2ace2bb47cbd10bb0d191a448bf03b563d7e749e`.

The test uses exact zero-minute sidereal grid cells with no interpolation,
ARMC equal to 15° per sidereal hour, and circular absolute residuals.
The provisional threshold, set in review before execution, is one printed
arcminute plus 1e−8 degrees for arithmetic. The table's empirical rounding
method is undocumented, so this threshold is a diagnostic convention.
Each published output has 1′ resolution.

| Local sidereal time | Latitude | Tropical Asc / MC | Asc / MC residual in arcmin |
|---|---:|---|---|
| 03:00 | 0° | 132°32′ / 47°28′ | 0.010606 / 0.010606 |
| 09:00 | 0° | 227°28′ / 132°32′ | 0.010606 / 0.010606 |
| 03:00 | 8° N | 134°54′ / 47°28′ | 0.023351 / 0.010606 |

All six circular comparisons passed. `tests/f01/historical_cardinal_angles.c`
calls `swe_houses_armc` in Sripati mode and evaluates the two returned
cardinal angles. It discards individual cusp results. Compile with
`cc -std=c11 -Wall -Wextra -Werror tests/f01/historical_cardinal_angles.c
-lswe -lm -ldl -o /tmp/historical-cardinal-angles` against the pinned
installed Swiss library, then run the binary. The isolated native suite
executes the same command.

B. V. Raman's [worked examples 32–35](https://www.scribd.com/document/614974243/Jyotish-A-Manual-of-Hindu-Astrology-B-v-raman-1992)
were investigated as a potential set of house junctions. The accessible
transcription has inconsistent adjacent endpoints. The example uses
a nearest-grid time and a different ayanamsa, so it remains unadmitted.
The fixed-angle result covers a different layer than the 12 independently
published midpoint junctions and the observed-clock regression. It leaves
the modern clock-to-frame pipeline, Lahiri equivalence, source-derived
end-to-end tolerances and full F01-P0-05 admission open.

The Researcher also located N. C. Lahiri's 1972
[Advance Ephemeris](https://ocrdigitalfile.nvli.in/dlirepository/1381/Advance-Ephemeris-ocr.pdf).
The indexed OCR for printed p. 52 lists a mean ayanamsa of 23°51.4′ for
Jan 0, 2000. The introduction defines Jan 0 as Greenwich midnight on
31 December of the previous year. This pre-correction source has 6″
printed resolution and a different epoch from the LibEphemeris anchor.
Its direct PDF returned HTTP 503 during research, so the OCR lead is
retained without fixture admission. It cannot resolve the 1985 IAE
revision of 0.658″ or establish present Swiss mode 1 equivalence.
