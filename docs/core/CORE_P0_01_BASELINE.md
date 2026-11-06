# CORE-P0-01: Baseline & Astronomical Provenance Audit

**Repository:** `dhinetrya-jpg/mymomentoclock`  
**Branch:** `CORE-P0-01`  
**Baseline Synchronized HEAD:** `e8c65c1` (*Merge pull request #13 from dhinetrya-jpg/fix/pay-p0-02-provider-sandbox-integration*)  
**Workstream:** Independent Astronomical Accuracy Validation  
**Release Gate Status:** NO-GO for Production Release (Phase 1 protected features safely disabled; astronomical accuracy validated for implemented scope; licensed .se1 files and personal timing pending owner provisioning).

---

## 1. System Context & Architecture Overview

MyMomentOclock is a high-precision personalized Vedic auspicious-time Progressive Web App (PWA) initially targeting India (+5:30 IST), followed by US and Canada.

The calculation architecture consists of two separate, non-overlapping pipelines:

```mermaid
flowchart TD
    subgraph Client & Analytical Tier
        Browser[Client Web Application / PWA]
        NodeSrv[Node.js Express Gateway :3000]
        NodeMath[src/engine/astroMath.ts<br/>Analytical Approximation Engine]
        Browser -->|POST /api/astro/calculate| NodeSrv
        NodeSrv --> NodeMath
        NodeMath -->|Honest Metadata: ANALYTICAL_APPROXIMATION| Browser
    end

    subgraph Native Swiss Ephemeris Tier
        GoSrv[Go Ephemeris Service :8080]
        GoNorm[backend/internal/ephemeris/normalizer.go<br/>IANA Timezone & Spatiotemporal Normalizer]
        NativeBridge[backend/internal/ephemeris/bridge.cpp<br/>Serialized CGO Swiss Ephemeris Bridge]
        SwissLib[libswe.a v2.10.03 commit 175e1fc<br/>SEFLG_SWIEPH / MOSHIER Fallback]
        Browser -.->|POST /api/v1/ephemeris/normalize| GoSrv
        GoSrv --> GoNorm
        GoNorm --> NativeBridge
        NativeBridge --> SwissLib
        SwissLib -->|Disclosed Mode: MOSHIER / SWISS_FILE| GoSrv
    end
```

### Calculation Path Separation

1. **Node.js Analytical Preview Path (`POST /api/astro/calculate`)**:
   - Computes an approximate analytical preview using mean orbital elements and lower-order periodic terms.
   - Enforces strict numeric timezone offsets (e.g. `+5.5` for IST).
   - Evaluates Sidereal Ascendant (Whole Sign Houses), 9 planetary positions (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu), 27 Nakshatras, 108 Padas, D-1 Rashi, D-2 Hora, D-9 Navamsha, and D-60 Shashtyamsa.
   - **Provenance & Honest Disclosure**: Output schema includes `calculationMode: 'ANALYTICAL_APPROXIMATION'`, `independentValidationStatus: 'NOT_PERFORMED'`, and `strengthMetricsStatus: 'UNAVAILABLE'`. Speed and retrograde fields are explicitly `null` (not fabricated).

2. **Go Native Ephemeris Normalization Path (`POST /api/v1/ephemeris/normalize`)**:
   - Links via CGO to compiled Swiss Ephemeris binary `libswe.a` (pinned version 2.10.03, commit `175e1fcb3108bcd5c0d146c803f51dcf23508012`).
   - Serialized through `std::mutex ephemeris_mutex` with `std::lock_guard` to ensure thread-safety across concurrent goroutines.
   - Calls `swe_set_sid_mode(SE_SIDM_LAHIRI, 0, 0)` with flags `SEFLG_SWIEPH | SEFLG_SIDEREAL | SEFLG_SPEED`.
   - Supports 4 primary celestial bodies: Sun (0), Moon (1), Mars (4), and Saturn (6).
   - Resolves IANA timezone locations (e.g., `Asia/Kolkata`, `America/New_York`), rejecting ambiguous local times (`AMBIGUOUS_LOCAL_TIME`) and DST transition gaps (`NONEXISTENT_LOCAL_TIME`).
   - Discloses actual ephemeris mode via bitmask flag inspection (`JPL`, `SWISS_FILE`, or `MOSHIER`). When Swiss files (`.se1`) are absent, Moshier semi-analytical mode is explicitly reported in response payloads.

---

## 2. Independent Reference Standards & Provenance

To eliminate self-referential or circular validation, this workstream establishes independent astronomical reference data derived from authoritative external sources:

| Source Identifier | Publishing Body | Scientific Basis & Standard | License / Access |
|---|---|---|---|
| **JPL_HORIZONS** | NASA / Caltech Jet Propulsion Laboratory Solar System Dynamics Group | High-precision numerical integration DE440/DE441 ephemerides; ICRF/J2000 barycentric & geocentric coordinates | Public Domain (NASA open data) |
| **USNO_AA** | United States Naval Observatory & HM Nautical Almanac Office | *The Astronomical Almanac*; IAU 2000/2006 precession and nutation models; fundamental epochs | US Government Work (Public Domain) |
| **IAE_PAC_INDIA** | Positional Astronomy Centre, India Meteorological Department, Kolkata | *Indian Astronomical Ephemeris*; Official Government of India standard for Lahiri (Chitrapaksha) Sidereal Ayanamsa ($23^\circ 51' 25.53''$ at J2000.0) | Official Government Standard |
| **IERS_BULLETIN_B** | International Earth Rotation and Reference Systems Service | Earth Orientation Parameters; empirical historical $\Delta T = \text{TT} - \text{UT1}$ observations and leap seconds | Open Scientific Data |
| **IANA_TZDB** | Internet Assigned Numbers Authority | Time Zone Database (`tzdata 2024b`); global daylight saving transition rules and historical civil offsets | Public Domain |

---

## 3. Scope Boundaries & Non-Interference Guarantees

In accordance with CORE-P0-01 constraints:

- **Payment & Entitlements**: Zero alterations to `backend/internal/payment/`, Razorpay integration, checkout modals, database migrations (`database/migrations/`), or PAY-P0-03 branches.
- **Protected Capabilities**: All Phase 1 safety boundaries remain active:
  - Birth Time Rectification (BTR) refuses candidate generation and returns `DASHA_CALCULATION_UNAVAILABLE` (HTTP 503).
  - Graph hydrator and conflict resolver return `RESOLVER_UNAVAILABLE` (HTTP 503).
  - Personal golden window returns `startTime: null`, `scope: 'UNAVAILABLE'`.
  - Stored profile queries return HTTP 401/503.
  - Streaming AI reading returns `AI_UNAVAILABLE` (HTTP 503).
- **Deployment & Infrastructure**: Zero unauthorized production cluster deployments. Development server remains bounded to local testing on port 3000.
