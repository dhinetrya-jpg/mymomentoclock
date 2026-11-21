# Captured reference evidence — CORE-P0-01

Captured on2026-11-06 through normal verified HTTPS. `acquisition_manifest.json` records exact immutable URLs/revisions, original-byte SHA256, byte counts, response metadata and observed retrieval times. `originals/` are unmodified upstream files; `normalized.json` is separately extracted by `scripts/core-reference-acquire.py` version core-reference-normalizer-v1. The extractor binds every expected value to its original source hash and function/line locator.

## Scientific status

- Skyfield commit31a6ed7584cd09b6e48e07546a4b5921e1cd5bb4 publishes tests explicitly labeled Horizons-derived. Three matched geocentric apparent ecliptic-of-date vectors are extracted: Mars barycenter1956-01-14T06:00Z and Sun2005-10-01T07:00Z/08:00Z. These are independent upstream-published test vectors, **not direct NASA response authenticity proof**. The upstream context is DE421. Mars barycenter differs from Mars center. The original upstream tolerances are retained unchanged: longitude0.0002degree and latitude0.00001degree. Swiss mode results must be compared only after matching the stated conventions, with any center/model mismatch retained as a limitation.
- ERFA commit1a8044cde5b7763295d472a6443387239127c6c8 publishes independent standard test vectors for calendar JD, UTC→TAI, TAI→TT, UTC→UT1 (explicit DUT1) and UTC quasi-JD across a leap second. Original split-JD tolerances are preserved. A single float64 JD around2451545 has an approximately40.2µs ULP: collapsing two parts requires a predeclared representation error budget, not post-hoc widening of scientific tolerances.
- IANA maintainer mirror commit6903dde39ed637adaafc352c4b6993739253f058 is the peeled2024b tag. Original northamerica/asia/australasia rule files and historical leap-seconds archive are captured. A historical leap table does not certify future leap-second forecasts or current IERS DUT1.
- `native-data/` contains official Swiss vendor files from commit94621aba9f3ff9c32cb721eac0380c30dbb153fe. Header SWISSEPH3, created2026-05-26 from DE441. They are vendor mode/availability data, **not independent Swiss accuracy references**. They are a separately pinned data revision from the application library source pin175e1fc. Runtime compatibility, file checksums and actual returned flags require native tests. Vendor LICENSE and AGPL text are retained; this is not a legal approval for commercial distribution.

## Direct institutional attempts

NASA Horizons, USNO solar API, IERS EOP, IANA release server and PAC publication entry all returned proxy tunnel403 Forbidden in this environment. Exact intended query/endpoints, observed UTC attempt times and errors are in `acquisition_attempts.json`, marked EXTERNAL_REFERENCE_PENDING. No denied response is presented as a scientific payload. In particular, the old local J2000/PAC-looking text files are not authenticated by the new evidence.

Still absent: direct independently admitted J2000 Sun/Moon/Mars values, all-body/multi-epoch/velocity/node coverage, PAC almanac source tables, independently dated Panchang/solar-event comparisons. Do not choose a contradictory historical number merely because a native or preview calculation matches it.

## Reproduction

- Offline integrity/extraction: `python3 scripts/core-reference-acquire.py verify`.
- Adversarial integrity tests: `python3 scripts/core-reference-tests.py` (8 tests).
- Controlled online refresh: `python3 scripts/core-reference-acquire.py refresh` (uses inherited proxy/trust; does not change network policy). Institution payloads, if accessible later, are captured UNADMITTED until a reviewed source-specific parser validates formats, body/epoch/frame and units. Failed resource refresh preserves the prior complete manifest.
- Full independent-source acceptance: `python3 scripts/core-reference-acquire.py accept` deliberately exits nonzero with EXTERNAL_REFERENCE_PENDING. Passing offline checks is evidence integrity, not complete astronomical acceptance.

Verification never repairs modified expected values silently. It checks immutable source binding, size/hash and exact regenerated extraction, and rejects tampering/missing originals. Routine CI remains offline.
