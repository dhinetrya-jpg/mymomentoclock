# PR21 Panchang, solar and chart validation

**A07 PARTIAL.** Independent Tithi/Karana boundaries and solar noon pass predeclared bands; sunrise/set remain different-model diagnostics. Matched sidereal Nakshatra/Pada/Yoga and traditional-source approval remain absent.

Reference: original JPL DE421 SPK evaluated by Skyfield 1.54/jplephem 2.24. No Swiss results or native roots generate expectations. Independent almanac root epsilon 0.05s; native bracket <=1s. Both are numerical precision, not physical uncertainty. Event budgets were declared before native measurements: 10s elongation boundaries, 2s meridian transit.

| Case | Date | Zone | Latitude | Longitude | Elevation m | UTC day seconds |
|---|---|---|---:|---:|---:|---:|
|KOLKATA|2026-03-19|Asia/Kolkata|22.5726|88.3639|0|86400.0|
|NEW_YORK_DST_GAP|2026-03-08|America/New_York|40.7128|-74.006|0|82800.0|
|NEW_YORK_DST_FOLD|2026-11-01|America/New_York|40.7128|-74.006|0|90000.0|
|TORONTO_FULL_MOON|2026-03-03|America/Toronto|43.6532|-79.3832|0|86400.0|
|VANCOUVER|2026-03-19|America/Vancouver|49.2827|-123.1207|0|86400.0|
|TROMSO_POLAR_DAY|2026-06-21|Europe/Oslo|69.6492|18.9553|0|86400.0|
|TROMSO_POLAR_NIGHT|2026-12-21|Europe/Oslo|69.6492|18.9553|0|86400.0|

| Quantity | Mode | Samples | Maximum residual s | Median | p95 nearest rank | Band s | Status |
|---|---|---:|---:|---:|---:|---:|---|
|karana|MOSHIER|14|2.696908125|0.9595995|2.696908125|10|PASS|
|solar_noon|MOSHIER|7|0.297537743|0.26000094|0.297537743|2|PASS|
|sunrise|MOSHIER|5|1.838156873|1.301929664|1.838156873|90|DIAGNOSTIC|
|sunset|MOSHIER|5|2.383626795|1.823339488|2.383626795|90|DIAGNOSTIC|
|tithi|MOSHIER|7|1.8224143750000001|1.187976875|1.8224143750000001|10|PASS|
|karana|SWISS_FILE|14|0.449405375|0.196995625|0.449405375|10|PASS|
|solar_noon|SWISS_FILE|7|0.297215878|0.258713479|0.297215878|2|PASS|
|sunrise|SWISS_FILE|5|1.8389213020000001|1.3030561920000001|1.8389213020000001|90|DIAGNOSTIC|
|sunset|SWISS_FILE|5|2.381735837|1.8214082980000001|2.381735837|90|DIAGNOSTIC|
|tithi|SWISS_FILE|7|0.449405375|0.287359375|0.449405375|10|PASS|

## Event definitions and boundary scope

Independent rise/set uses apparent geocentric Sun center altitude -0.8333333333333334°, zero elevation, fixed conventional horizon and no variable refraction. Native uses upper limb, pressure modeled from elevation, 15°C and its refraction model. These are NOT admitted as identical definitions. The 90s diagnostic band is not an acceptance tolerance. Solar noon is a matched meridian-transit event; UT1-model limitations remain disclosed. No real-weather or terrain accuracy claim.

Independent polar cases have no rise/set; native must refuse unavailable events and sunrise-derived intervals. Each native local-day length is checked against IANA bounds, including NY 23/25h. Actual API requests additionally cover Toronto 2026 gaps/folds and Vancouver 2024 gaps/folds plus unique November 2026, authenticated by current IANA source, Lord Howe 24.5h and Kathmandu/Kolkata fractional offsets.

Tithi/Karana cases include new-Moon 0/360 wrap and Toronto full Moon. Tests compare transition counts, circular target angles, UTC timestamps and native bracket termination. Existing native tests check contiguous half-open clipped intervals and enclosing bounds. This does not establish an independently dated near-midnight Tithi, a sidereal Nakshatra/Pada boundary or approved sunrise-Vara transition; these remain missing evidence.

## Traditional convention review

| Quantity | Exact selected rule | Evidence status |
|---|---|---|
|Rahu Kaal|Sunday-first daylight eighths [8,2,7,5,6,4,3]|Versioned weekday-daylight-eighths-v1; authenticated traditional source and owner approval absent|
|Yamaganda|Sunday-first eighths [5,4,3,2,1,7,6]|Source/owner approval absent|
|Gulika|Sunday-first eighths [7,6,5,4,3,2,1]|Source/owner approval absent|
|Abhijit|One daylight fifteenth centered on daylight midpoint|Versioned measurement; alternative traditions and weekday interpretation unapproved|
|Brahma|Fixed 96 to 48 minutes before sunrise|Versioned fixed-minute variant; night-duration alternatives remain distinct|
|Sunrise Vara|Weekday associated with previous sunrise|Operational variant; compatible independent dated boundary pending|

No classical citation, owner approval or astrological efficacy is fabricated. Different-model solar diagnostics cannot validate derived traditional intervals. Paksha/index/Karana-name arithmetic is mathematically tested; Nakshatra/Pada/Yoga and sidereal placements still require a matched independent Lahiri source.

## Chart and time context

Four observed IERS Bulletin A records (1975/2000/2024/2026) preserve original formal errors/observed flags and exact immutable official Astropy publication bytes. Fixed-width extraction is reproduced by `scripts/core-pr21-eop.py verify`. Actual native UTC JD, source DUT1 input, TT-UTC and DeltaT are checked against a predeclared 100µs numerical representation budget. Runtime arbitrary caller DUT1 remains unverified; source-backed offline tests do not certify arbitrary inputs.

Seven tropical ascendants per mode independently intersect the true ecliptic with the geometric eastern horizon using Skyfield GAST/IAU2006 obliquity/IAU2000A nutation and consistently supplied modeled DUT1. Passing geometry does not validate Lahiri offset, sidereal Whole Sign houses or traditional D2/D9/D60. Full-input mathematical mapping tests and D60 birth-uncertainty suppression remain unchanged.

Complete per-row expected/actual/residual/tolerance records are in `CORE_P0_01_PR21_PLANETARY_VALIDATION.md` and `evidence/pr21/numerical-results.json`.
