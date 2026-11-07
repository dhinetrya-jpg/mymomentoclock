# ADR CORE-P0-01 / Option A / v1

Status: architecture selected by owner in the finalization request, 2026-11-07 (Asia/Kolkata). This selects a production candidate; it grants no scientific, traditional, commercial or customer-release approval.

Swiss Ephemeris **2.10.03**, source `175e1fcb3108bcd5c0d146c803f51dcf23508012`, **SWISS_FILE only** is `PRODUCTION_AUTHORITY`. The Go/CGO engine and existing numerical algorithms remain in place. MOSHIER is `DIAGNOSTIC_ONLY`; its two historical lunar precision failures remain factual, visible and failing in the full strict cross-mode suite. Native JPL is optional, unsupported without a compatible kernel, and cannot become the production authority. Absence of that optional kernel is not a mandatory release blocker.

## Immutable inputs and contract

Native files: `sepl_18.se1` and `semo_18.se1`, DE441/format3 covering 1800–2399, official data revision `94621aba9f3ff9c32cb721eac0380c30dbb153fe`.

| File | SHA256 |
|---|---|
|sepl_18.se1|ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66|
|semo_18.se1|1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7|

The versioned `astronomy.AuthorityContract` exposes engine/version, production and configured mode, role, dataset version/hash, sidereal mode, time-scale policy, timezone database, traditional-rule version, scientific status and customer-admission status. Dataset aggregate hash is SHA256 of Go's compact, sorted-key JSON encoding of the exact filename/hash map; individual file hashes remain the actual content admission criteria. A role is not permission: `production_eligible` and customer authorization remain false.

Use `backend/config/astronomy.option-a.example.json` as the reviewed server-file template. Set `ASTRONOMY_NATIVE_CONFIG_FILE` to its read-only mounted path, mount the exact public/native data read-only, and retain the actual configured ephemeris path. There is no implicit configured mode. Missing config refuses canonical astronomy and readiness. Missing/corrupt files fail closed; returned flags must match requested file mode. Server-side checksum/data/version failures return unavailable, never a diagnostic substitute. Client-selected paths/hashes/approval fields are not accepted.

A diagnostic server requires an explicit file containing `{"mode":"MOSHIER","usage":"DIAGNOSTIC_ONLY"}`. That mode's outputs disclose their role and cannot enter `NativeAstronomyProvider.Inspect` or `Load` as production authority. An explicit MOSHIER request to a SWISS_FILE-configured canonical API is refused. Legacy analytical/normalization inspection endpoints remain unverified diagnostic surfaces, not an authority or timing-admission route.

## Conventions

- Target policy: default Swiss planetary-system barycenters (Mars4/Jupiter5/Saturn6); Sun10 and Moon301 centers, moonless Mercury1/Venus2 body/system centers coincide. Centers-of-body are NOT requested or claimed. DE4211→199/2→299/4→499 zero-vector aliases are explicitly verified at every compared epoch/velocity sample, rather than silently substituting target types.
- Tropical geocentric apparent ecliptic/equinox of date; explicit Swiss ephemeris/speed/sidereal flags, actual flags/version/data metadata retained.
- Sidereal: `SE_SIDM_LAHIRI=1`, default Swiss precession, `swe_get_ayanamsa_ex` without NONUT (true ayanamsa includes nutation), without SIDBIT_PREC_ORIG. It is neither True Citra nor a silently substituted historical IAE mean convention.
- Mean and true ascending lunar nodes are distinct native computations. Snapshot `lunar_nodes` labels Rahu and derives each corresponding descending Ketu by +180°, without claiming an independently observed planet. Independent node accuracy remains pending.
- UTC→TT uses pinned Swiss leap-table behavior; TAI follows TT−32.184s where applicable. UT1 is modeled unless explicit DUT1 is supplied; caller input is not automatically observed/verified. Historical pre1972 UTC/UT1 limitations remain explicit. J2000 is JD2451545.0 TT.
- Native calculations use embedded immutable IANA data at `e29969d3f327f129ec4aebaa9c7aee96c46f8e3b`, not host/ZONEINFO fallback. Original main-zone data and backward aliases/license, compiler identity, deterministic ZIP hash and reproduction command are retained. Current Vancouver November2026 is unique UTC−7; 2024 gap/fold remains separately tested. Frontend analytical preview is not this production authority.
- Existing half-open angular/UTC interval conventions remain; no epsilon fitting, rounding-to-display classification or changed tolerances.
- Traditional measurements retain `weekday-daylight-eighths-v1`, `daylight-fifteenth-centered-v1`, `fixed96-to48-minutes-before-sunrise-v1`, and existing `sunrise-day-v1`. All remain unapproved traditional variants, not efficacy or personal recommendations. D60 remains a half-degree segment with uncertain-birth suppression, not an approved deity/sign interpretation.

## Acceptance and integration

`npm run verify:core-p0-01:production` executes strict SWISS_FILE reference comparisons plus authority/rule tests. Exit0 requires the implemented full gate; current exit2 reports passing numerical subset with missing independent/domain/legal coverage. Exit1 means an execution/numerical failure. It does not accept MOSHIER results.

`npm run verify:core-p0-01:cross-mode` preserves the original strict suite across modes and continues to fail on the documented MOSHIER Moon discrepancies at the unchanged ±0.0002° band. `npm run verify:core-p0-01` runs engineering checks and both scientific commands, prints both exits, and returns production disposition; a diagnostic failure cannot invalidate an independently accepted file-only configuration, nor can it be called a cross-mode PASS.

The typed CORE-P0-02 provider uses the same pinned file authority for natal/day inspection, propagates metadata and UTC intervals, rejects diagnostic modes and refuses unaccepted customer admission. Ranking, activity rules, payment/auth/entitlements/pricing and release trust roots are unchanged. No synthetic relabel, paid timing, profit guarantee, deployment or merge is authorized by this ADR.

## Remaining decisions

Matched node/Lahiri/sidereal chart/Panchang and same-definition solar evidence; domain approval of versioned variants; Swiss/data/reference commercial/redistribution licensing. These are concrete owner/evidence decisions in FINAL_HANDOFF, not another speculative engineering iteration. Architecture selection itself is already approved and must not be asked again.

Target-policy correction: official Swiss documentation sections2.4/Test6 identified a prior incorrect planet-center assumption. The initially close JUP310599 comparison is preserved but NOT_ADMITTED; matching DE4215/6 references now cover eight admitted epochs each with unchanged budgets. No astronomical output or tolerance changed to obtain agreement. Physical COB support would require a separate explicit flag/data decision and is not silently provided.
