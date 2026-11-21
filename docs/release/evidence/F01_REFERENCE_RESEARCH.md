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
