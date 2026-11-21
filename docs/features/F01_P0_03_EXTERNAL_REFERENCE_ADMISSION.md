# F01-P0-03 — External Sripati numerical-reference admission

## Scope

This feature provides an **offline**, fail-closed numerical reference comparison workflow. It is not a new customer API, and does **not** enable birth-time rectification, timing, payments, or scientific acceptance.

The existing repository already quarantines historical unverified fixtures; never copy or relabel those as independent cusp data.

### Evidence contract

Source fixtures live in `tests/calculation/reference/f01/manifest.json` and reference raw original documents in `tests/calculation/reference/f01/originals/`.

Each reference requires:

- A unique ID, UTC instant, latitude and longitude
- `SRIPATI_S_CUSP_START_1_BASED`, `SWISS_SE_SIDM_LAHIRI`, `SIDEREAL_ECLIPTIC_OF_DATE` and `UTC` conventions
- An independently generated set of **12 signed, ordered, normalized cusp longitudes** in degrees
- Explicit source producer, method, software/version and HTTPS source URL
- An original source file and **SHA-256** digest matching its actual bytes
- A predeclared numerical tolerance (positive, at most 0.1°)
- Proper circular cusp geometry, finite numeric data, valid dated inputs

Cross-checking the source-file checksum confirms the archive contents are unchanged. It does **not**, by itself, confirm the publishing institution's identity or that its results are truly independent.

### Execution

From the repository root:

```bash
cd backend
CGO_ENABLED=0 go test ./internal/f01reference -count=1

# Requires a real populated, provenance-verified external manifest and
# the existing pinned Swiss ephemeris data. With the checked-in empty manifest,
# this exits nonzero and reports BLOCKED_NO_ADMITTED_EXTERNAL_REFERENCES.
F01_REFERENCE_EPHEMERIS_DIR=/absolute/path/to/pinned/native-data \
  go run ./cmd/f01reference ../tests/calculation/reference/f01
```

This command **does not fetch or invent references**. Once genuine independent worked charts are sourced and admitted, it compares each of the 12 original Sripati cusp positions against the existing pinned native implementation. It reports worst-cusp angular error, predeclared tolerance, and PASS/FAIL for each admitted case.

### Acceptance policy

- Empty manifest: **BLOCKED**, nonzero exit.
- Source convention mismatch, invalid/missing original or SHA mismatch: **BLOCKED**, nonzero exit.
- Missing pinned provider: **BLOCKED**, nonzero exit.
- Any numerical tolerance failure: **FAILED**, nonzero exit.
- All admitted comparisons pass: **PARTIAL_EXTERNAL_NUMERICAL_COVERAGE_NOT_PREDICTIVE_VALIDATION**, because the fixture set can never by itself establish worldwide coverage or astrological prediction validity.

Unit tests use explicitly fictional data and are **not included as admitted references**.

### Next independent evidence required

Collect externally calculated, reproducible examples with proper legal permission, numerical cusp outputs and original publication evidence at different historical dates, hemispheres, latitudes and near-boundary cases. Agree on acceptable external reference methods and tolerance budgets *before* looking at observed differences. Review and sign off provenance separately from numeric agreement.

This PR is **framework complete**, not scientific acceptance complete. The checked-in manifest intentionally contains no claimed external fixtures.

### Schema 2 integrity repair (private-release audit)

Schema 1 is no longer admitted. Schema 2 requires exactly 12 non-null JSON
numbers (the Go fixed-array decoder previously padded/truncated arrays), rejects
duplicate keys and manifests larger than 1 MiB, and admits every source before
executing any numerical comparison.

The currently supported original is a UTF-8 JSON object containing exactly
`utc`, `latitude`, `longitude`, `house_system`, `ayanamsa`, `sidereal_mode`,
`time_scale`, `cusp_units` (`DEGREES`) and `expected_cusps`. Every value must match
the manifest claim, in addition to the original-byte SHA-256 check. A publisher
using another format needs a separately reviewed extractor; do not rewrite a
published document as a new purported original to bypass this requirement.
PDF, text and CSV originals are currently unsupported and fail closed.

Each manifest reference also requires `qualification`: `astronomy_lineage`,
`house_formula_lineage`, `review_evidence`, `source_precision_degrees`,
`tolerance_basis`, `tolerance_declared_utc` and `first_comparison_utc`.
Precision must be positive and no greater than the tolerance; declaration must
precede first comparison. The basis must address source rounding, chart time,
coordinates and model/convention uncertainty, with original evidence cited.
Shared Swiss/JyotiPy lineage is rejected. These fields record review claims;
strings, timestamps and substring checks do **not authenticate a reviewer or
prove independence**. An independent auditor must inspect the original source,
lineage and tolerance evidence before a case is added to the controlled manifest.

No actual source has qualified. The production manifest remains empty. These
repairs establish mechanical integrity only; source qualification, all-sky
coverage and scientific/traditional acceptance remain blocked. See
`docs/release/evidence/F01_REFERENCE_RESEARCH.md` for the original PR27 source
inspection and narrower internal geometry verdict.
