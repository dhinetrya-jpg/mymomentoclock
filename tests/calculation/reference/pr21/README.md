# PR21 independent reference package

Raw original: JPL DE421 SPK, fetched from immutable official Skyfield repository revision. Source URL, HTTP status, retrieval timestamp, SHA256, size and limitations are in `source.json`; original SPK comments are preserved separately. DE421 is independent of Swiss evaluation, but shares JPL solar-system theory with Swiss DE441 data: this is not independent observational confirmation.

`normalized.json` is generated entirely by Skyfield 1.54 + jplephem 2.24, with no Swiss calls or imported native values. Exact evaluator dependencies are in `scripts/requirements-pr21-reference.txt`. `policy.json` predates native measurements; tolerance values have not been widened. The normalization manifest detects later fixture edits. It does not by itself prove authentic numerical values: reproduce the evaluator against original SPK bytes.

Reproduce offline after installing the pinned reference-only dependencies:

```
python scripts/core-pr21-reference.py generate
python scripts/core-pr21-reference.py verify
python scripts/core-pr21-tests.py
```

Generation is deterministic with the recorded package versions. Native Go tests evaluate both MOSHIER and SWISS_FILE and emit every numerical row. `CORE01_STRICT_SCIENCE=1` turns any numeric tolerance failure into a failing Go acceptance test. Default evaluation execution is not a scientific acceptance PASS. The report command with `--require-pass` refuses failed and unadmitted rows.

**Known acceptance failure:** Moshier Moon longitude fails the predeclared 0.0002-degree budget in historical/full-Moon cases. No correction, expected value or tolerance is fitted to those residuals. Swiss-file measurements and other comparisons must be assessed individually.

**Not admitted:** Jupiter/Saturn barycenters as centers, nodes, matched Lahiri offset and dependent sidereal quantities, pre1972 proleptic UTC versus UT1-labelled instants. Sunrise/set use the documented conventional center altitude -0.833333 degrees; they are diagnostic against native dynamic upper-limb/refraction, never identical-definition accuracy PASS. Source observational uncertainties are not supplied per row; declared comparison budgets are not substitutes for error bars.

Skyfield and jplephem evaluator software use MIT licenses (see package distributions and upstream licenses). The original binary's comments identify JPL DE421 and SPK conversion; they do not contain an explicit redistribution license grant. Owner/legal confirmation of kernel/data redistribution remains pending. No commercial terms are changed and the kernel is test data, not a native JPL-mode kernel.

Observed IERS Bulletin A source and BSD Astropy project license: `iers-source.json`; extraction and unchanged-original verification: `python3 scripts/core-pr21-eop.py verify`. Current official IANA maintainer source and license are in `tz-source.json`; they authenticate Vancouver’s 2026 permanent-time change. Previous older IANA captures remain historical. IANA source date matters: a November 2026 Vancouver fold is not expected. Upstream project licenses are preserved; original data-specific redistribution terms still require owner/legal review.
