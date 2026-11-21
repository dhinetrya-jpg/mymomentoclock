# F01 — Birth-Time Uncertainty Explorer (review build)

This PR implements a **non-certified exploratory** F01 flow, not a birth-time rectification engine.

## Implemented
- Birth-time EXACT / APPROXIMATE (± minutes) / UNKNOWN (entire local date).
- Historical pinned IANA timezones; ambiguous or nonexistent recorded local times rejected.
- Native Swiss SWISS_FILE sample snapshots with checked pinned source configuration.
- Distinct Whole Sign / Rashi vs sidereal Sripati house placements, circular cusp validation.
- Rashi, lunar Nakshatra/Pada, D2/D9 and Sripati sampled observations.
- Explicit OBSERVED_VARIABLE / OBSERVED_STABLE_NOT_PROVEN / UNRESOLVED labels.
- Strict Go endpoint, mTLS-only Node gateway, fail-closed default, responsive UI in src/ and frontend/src/.

## Not implemented / not authorized
- Genuine birth-time rectification from milestones; legacy BTR remains disabled.
- Exhaustive boundary isolation: 17 snapshots can miss transitions between samples. Never claim mathematically proven stable.
- D60 interpretations, inferred true timestamp, probabilistic fit, user-success percentages.
- Release of personalized Muhurta, AI readings, payment or commercial service.

## API
POST /api/v1/f01/explore

Example:
    {"schema_version":1,"birth_date":"2000-01-01","birth_time":"09:00","certainty":"APPROXIMATE","uncertainty_minutes":30,"timezone":"Asia/Kolkata","latitude":28.6139,"longitude":77.2090}

For UNKNOWN, omit birth_time, uncertainty_minutes and utc_offset. For EXACT, omit uncertainty_minutes.
Responses return status COMPUTED_UNVERIFIED, authority.production_eligible=false, customer_timing_authorized=false, observed sample sets and limitations.

## Transport
- Go service requires its existing reviewed ASTRONOMY_NATIVE_CONFIG_FILE and checksum-pinned SWISS_FILE data.
- Node requires F01_INTERNAL_URL=https://<trusted-internal-host>/, F01_INTERNAL_CA_FILE, F01_INTERNAL_CERT_FILE, F01_INTERNAL_KEY_FILE.
- Allowed upstream hostnames: localhost, *.internal, *.svc.cluster.local; TLS server validation and client certificates required.
- Without trusted transport, gateway returns 503. No browser or MOSHIER fallback.

## Outstanding acceptance
1. Mathematical boundary isolation/proof for exact stability, or continue provisional sample-only labels.
2. Independent sidereal Sripati cusp and house-assignment references, including high latitudes.
3. Astrologer/domain sign-off on Sripati convention and interpretation rules.
4. Benchmarks of repeated SHA-checked native snapshots; calibrate limits without weakening integrity.
5. Native regression, browser accessibility, load, API security and privacy tests.
6. Separate BTR methodology and blind validation if ever approved.
7. Scientific, tradition, Swiss license and release approvals before commercial customer access.

No secrets, migrations or live payment/timing switches are changed.