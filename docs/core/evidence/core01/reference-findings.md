# CORE01 independent reference specialist findings

Baseline audited: cc3ab8245ea5d6bced19f5fed200da1528d13154. No existing application/test/report source modified by this specialist. New files only: scripts/core-reference-acquire.py, scripts/core-reference-tests.py and tests/calculation/reference/acquired/**.

## Existing evidence contradictions

- The baseline15-scenario dataset says J2000 Mars tropical333.178°, sidereal309.3209°. The32-scenario dataset and purported JPL raw text call309.320914° tropical; raw text then calls285.463822° sidereal. That is a coordinate-convention contradiction, not rounding. There is no authenticated direct source response resolving it. Neither number was adopted as independent truth.
- Old J2000 Sun tropical280.460618° equals the separate GST expected constant in the15-scenario fixture. Moon218.324205° references have no authenticated source query/capture. These suspicious summaries are not admitted merely because a report calls them DE440.
- The old raw export concatenates seven bodies, a generic ICRF/J2000 label, apparent ecliptic coordinates, UTC=UT and a derived sidereal summary. It lacks original single-target Horizons response headers/query provenance. The source manifest advertises a semicolon-separated multi-target COMMAND; the new reproducible intended query uses single target499, center500@399, observer quantity31 and explicit UTC/UT-era query.
- All32 stored evidence_checksum values do match their referenced local raw-file bytes. That proves internal integrity only; it does not establish that the bytes came from NASA/PAC/IERS/IANA. Do not report checksum mismatch as the root defect.
- Delta-T=TT-UT1 differs from TT-UTC=TAI-UTC+32.184. Old 'canonicalDeltaTSeconds64.184' labels TT-UTC as Delta-T. JD2451545.0TT is J2000; nominal UTC noon is not the same epoch. A UTC Julian-date label cannot assert UT1 without DUT1 evidence.
- Tolerances of Moon6°, Saturn6°, Mars30° were motivated by observed residuals against unadmitted summaries, not an independent predeclared error budget. Those figures cannot establish scientific accuracy.

## Actual retrieval

Direct NASA Horizons, USNO, IERS, IANA server and PAC entry requests were attempted through inherited proxy/trust. All five failed tunnel403 Forbidden; exact endpoints/parameters/errors and observed UTC timestamps are preserved in acquired/acquisition_attempts.json, EXTERNAL_REFERENCE_PENDING. No proxy failure body is called an institutional scientific response.

Genuine immutable HTTPS files captured:

1. Skyfield31a6ed7584cd09b6e48e07546a4b5921e1cd5bb4 test_against_horizons.py + MIT license. Three upstream-published, explicitly Horizons-derived apparent geocentric ecliptic-of-date vectors: Mars barycenter1956-01-14T06:00UTC lon240.0965633°,lat0.4753402°; Sun2005-10-01T07:00UTC lon188.2011122°,lat0.0000488° and08:00UTC lon188.2420983°,lat0.0000474°. Upstream preexisting tolerances unchanged:0.0002° longitude,0.00001° latitude. ContextDE421. These are third-party published reference vectors, not original NASA response authenticity; Mars barycenter is not Mars center. Exact source hash/lines are normalized separately.
2. ERFA1a8044cde5b7763295d472a6443387239127c6c8 t_erfa_c.c + license. Five independently published calendar/time-scale standard vectors: CAL2JD2003-06-01, UTCTAI, TAITT, UTCUT1(DUT1=0.3341s), and DTF2D leap-second1994-06-30. Exact original expected values/tolerances/locators are in acquired/normalized.json. Two-part fractional precision must not be directly asserted after collapse to one double-JD: one JD ULP is~4.6566e-10day/~40.2µs. Preserve split parts or predeclare representation budget before testing.
3. IANA maintainer mirror peeled2024b commit6903dde39ed637adaafc352c4b6993739253f058 northamerica,asia,australasia and historical leap-seconds.list. These are actual source rules, not generated transition prose. Historical records do not certify future leap predictions or current DUT1.
4. Vendor-only Swiss data commit94621aba9f3ff9c32cb721eac0380c30dbb153fe sepl_18.se1 and semo_18.se1 + licenses. HeaderSWISSEPH3/DE441,2026-05-26. Source pin175e1fcb has no ephe files at those paths (404), so data revision is separately declared. Planets484061bytes SHA256ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66; Moon1304771bytes SHA2561ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7. Mode validation only, never independent accuracy proof; legal/commercial distribution review not granted.

## Reproduction and actual tests

- python3 scripts/core-reference-acquire.py refresh: executed successfully;12 immutable original resources captured, five direct institutional attempts pending403.
- python3 scripts/core-reference-acquire.py verify: PASS offline source binding/hash/size/format and exact separate normalization (3 planetary+5 temporal vectors), without modifying data.
- python3 scripts/core-reference-tests.py:8/8 PASS, including source corruption, source substitution, missing capture, wrong normalized expected value rejection with no silent repair, and vendor-versus-independent separation.
- python3 scripts/core-reference-acquire.py accept: executed; exits1 with EXTERNAL_REFERENCE_PENDING as intended. This is a real scientific-evidence blocker, not an implementation test failure disguised as success.

## Acceptance limit and next step

A03 is partial: immutable externally retrieved independent published vectors exist, but direct institutional authenticity and required breadth remain incomplete. A04/solar/Panchang cannot pass from three Sun/Mars vectors. No independently admitted Moon/Mercury/Venus/Jupiter/Saturn/nodes/velocity/PAC/Panchang/solar references obtained. J2000 contradictions remain unresolved scientifically. Run controlled refresh in an environment with approved institutional access, then validate a source-specific parser and original response body/epoch/frame/units before admitting it. No network policy bypass was attempted. Source data package totals~2.5MiB; the temporary~985MiB vendor checkout was removed after retaining the two needed files.
