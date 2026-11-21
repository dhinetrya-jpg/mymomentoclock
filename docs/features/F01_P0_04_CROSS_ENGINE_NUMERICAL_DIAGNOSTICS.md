# F01-P0-04 — Cross-engine numerical diagnostic

## What this does

This is a **real executable comparison**, not another fixture-only test. The pipeline computes eight Sripati charts via **JyotiPy 0.2.1 / PyMeeus 0.5.12**, then calculates matching charts via the pinned SWISS_FILE native engine (Swiss Ephemeris 2.10.03 and checked-in native data checksums). It emits raw secondary-engine cusp values and numerical differences for each of 12 cusps.

Run GitHub Actions workflow `F01 Cross-Engine Diagnostic Evidence` (or build Docker target `f01-cross-engine-diagnostics`) and inspect artifact `f01-cross-engine-diagnostic` containing:
- `input.json`: second-engine astronomical calculations for eight fixed dated geographic cases
- `comparison.json`: both engines’ values and the circular difference for each numbered cusp, per-chart worst cusp, native calculation conventions and data provenance, and scientific label
- The evidence is **unadmitted** and cannot turn on any production or commercial functionality

The Docker build target is not a production image and does not alter `runtime`, `default`, commercial payment, or GitHub Pages.

## Why it is not independent Sripati validation

JyotiPy uses PyMeeus rather than Swiss for astronomical calculations and angles, **but its Sripati house algorithm was transcribed from Swiss's house-system source**. Therefore:

1. This can reveal disagreements between astronomical pipelines and their sidereal conventions.
2. It CANNOT prove an independently authored Sripati formula is correct.
3. It CANNOT validate astronomical planetary positions outside the house calculation.
4. A small residual is not accuracy proof; a large residual does not establish which engine is correct.
5. It must NOT populate F01-P0-03's admitted independent reference manifest or enable customer release.

A successful workflow yields `COMPARISON_COMPLETED_UNADMITTED` and `scientific_acceptance: NOT_ESTABLISHED`, regardless of the numerical residual. The comparator must fail on missing native Swiss data, unexpected native version/mode, invalid or missing second-engine inputs, or nonsensical cusps.

## Reproducibility and limitations

- Provider package versions are pinned: `jyotipy==0.2.1` and `PyMeeus==0.5.12`. The JyotiPy wheel, PyMeeus source archive, and PyMeeus build dependencies are pinned by SHA-256. The capture records JyotiPy’s Lahiri offset and nominal UTC-derived Julian day. The comparison records Swiss’s Lahiri offset, epoch metadata, and house-system identifier.
- The selected eight cases cover India, UK, US, Australia, equator, opposite hemispheres and several decades. These are *diagnostic dates*, not a statistically representative accuracy study.
- Differences may arise from sidereal ayanamsa definitions, time scales, nutation, precession, angle derivation and house conventions. Each discrepancy needs individual analysis.
- Exact external published cusp reference values with full provenance, independently implemented formulas, explicit time scales and predeclared error budgets remain required for F01 numerical scientific acceptance.

## Usage

GitHub Actions -> F01 Cross-Engine Diagnostic Evidence -> Run workflow, or after reviewing this PR allow its targeted CI to run. Download the `f01-cross-engine-diagnostic` artifact.

No user birth data, profiles, payment, BTR or personal timing predictions are included.
