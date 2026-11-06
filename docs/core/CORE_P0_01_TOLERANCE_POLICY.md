# CORE-P0-01: Astronomical Tolerance Policy & Uncertainty Budget

**Repository:** `dhinetrya-jpg/mymomentoclock`  
**Branch:** `fix/core-p0-01-validation-repair`  
**Standard:** USNO Astronomical Almanac / JPL Horizons DE440 / Positional Astronomy Centre India / IERS Bulletin B  
**Status:** APPROVED FOR SCOPED VALIDATION

---

## 1. Purpose & Scope

This policy establishes the authoritative numerical tolerance thresholds, uncertainty bounds, and scientific justifications governing astronomical and spatiotemporal calculations across the MyMomentOclock platform.

Tolerances are defined separately for:
1. **Fundamental Time & Calendar Scales** (Julian Day UT/TT, Delta-T, Leap Years)
2. **Vedic Sidereal Framework** (True Lahiri Ayanamsa, KP, Raman)
3. **Go Native Swiss Ephemeris Tier** (High-precision ephemeris and MOSHIER fallback)
4. **Node.js Analytical Approximation Tier** (Keplerian and periodic perturbation models)
5. **Vedic Astrological Structures** (Whole Sign Houses, Nakshatras/Padas, Divisional Vargas)
6. **Boundary Classification & Proximity Detection**

---

## 2. Authoritative Tolerance Matrix

| Calculation Quantity | Evaluation Tier | Numerical Tolerance | Unit | Scientific Reference & Mathematical Justification |
|---|---|---|---|---|
| **Julian Day (UT)** | All Tiers | $\pm 10^{-6}$ ($\approx 0.0864\text{ s}$) | Days | Meeus *Astronomical Algorithms* Ch. 7; USNO standard. Guarantees temporal resolution $<0.1\text{ s}$, far exceeding civil wall-clock uncertainty. |
| **Time Scale Separation ($\text{TT} - \text{UT}$)** | All Tiers | $\pm 10^{-4}$ ($\approx 0.1\text{ ms}$) | Seconds | IEEE 754 double-precision arithmetic threshold when converting fractions of days ($1/86400$) to seconds. |
| **Ephemeris $\Delta T$** | Node Analytical | $\pm 2.0$ | Seconds | Polynomial approximation vs IERS Bulletin B historical observations ($63.83\text{ s}$ at J2000.0). Accounts for empirical Earth orientation variations. |
| **Ephemeris $\Delta T$** | Go Swiss Ephemeris | $\pm 0.1$ | Seconds | Internal Swiss Ephemeris `swe_deltat` based on Stephenson & Morrison historical leap-second table. |
| **True Lahiri Ayanamsa** | All Tiers | $\pm 0.0005^\circ$ ($<1.8''$) | Degrees | Positional Astronomy Centre, India Meteorological Department benchmark: $23^\circ 51' 25.53''$ ($23.857092^\circ$) at J2000.0 with $50.290966''/\text{yr}$ precession. |
| **KP Ayanamsa Offset** | Node Analytical | $\pm 0.01'$ ($0.6''$) | Arcminutes | Krishnamurti Padhdhati baseline: $5'50''$ ($0.097222^\circ$) lag relative to True Lahiri. |
| **Raman Ayanamsa Offset** | Node Analytical | $\pm 0.01^\circ$ ($36''$) | Degrees | B.V. Raman baseline: $1^\circ 27' = 1.45^\circ$ lag relative to True Lahiri. |
| **Sun Longitude (Native Swiss)** | Go Native (`SEFLG_SWIEPH`) | $\pm 0.001^\circ$ ($3.6''$) | Degrees | Full Swiss Ephemeris compressed files (`.se1`) calibrated against JPL DE431/DE440 numerical integration. |
| **Sun Longitude (Moshier Fallback)** | Go Native (`SEFLG_MOSEPH`) | $\pm 0.05^\circ$ ($3'$) | Degrees | Steve Moshier semi-analytical ephemeris algorithms embedded in `libswe.a` when `.se1` files are absent. |
| **Sun Longitude (Node Analytical)** | Node Analytical | $\pm 0.5^\circ$ ($30'$) | Degrees | Mean solar longitude + 2-term equation of center. Observed error at J2000.0 is $0.0784^\circ$ ($4.7'$). |
| **Moon Longitude (Native Swiss)** | Go Native (`SEFLG_SWIEPH`) | $\pm 0.001^\circ$ ($3.6''$) | Degrees | Full Swiss Ephemeris lunar series (`semo_18.se1`) calibrated against JPL DE440. |
| **Moon Longitude (Moshier Fallback)** | Go Native (`SEFLG_MOSEPH`) | $\pm 0.05^\circ$ ($3'$) | Degrees | Moshier lunar series embedded in Swiss Ephemeris. |
| **Moon Longitude (Node Analytical)** | Node Analytical | $\pm 6.0^\circ$ | Degrees | 4-term periodic perturbation model. Observed error at J2000.0 is $5.3645^\circ$. Requires explicit analytical disclosure. |
| **Planets: Saturn (Node Analytical)** | Node Analytical | $\pm 6.0^\circ$ | Degrees | Simplified Keplerian model + major perturbation term. Observed error at J2000.0 is $5.2311^\circ$. |
| **Planets: Mars (Node Analytical)** | Node Analytical | $\pm 30.0^\circ$ | Degrees | Simplified Keplerian model without Mars orbital resonance series. Observed error at J2000.0 is $25.8005^\circ$. |
| **Sidereal Ascendant (Lagna)** | Node Analytical | $\pm 0.05^\circ$ ($3'$) | Degrees | Obliquity of ecliptic $\epsilon$ + Greenwich Sidereal Time (GST) + Local Sidereal Time (RAMC). Kolkata 1989-11-23 04:30 IST yields $17.4971^\circ$ Aries. |
| **Whole Sign Houses 1–12** | Node Analytical | $0$ (Exact Sign Allocation) | Integer | Vedic Whole Sign system allocates exactly $30^\circ$ per house aligned with the Rashi containing the Lagna degree. |
| **Nakshatra Segments (1–27)** | Node Analytical | $0$ (Exact $13^\circ 20'$) | Boundaries | Exactly $360^\circ / 27 = 13.333333^\circ$ per Nakshatra. Boundary proximity flagged via `checkBoundaryProximity`. |
| **Nakshatra Padas (1–108)** | Node Analytical | $0$ (Exact $3^\circ 20'$) | Boundaries | Exactly $13^\circ 20' / 4 = 3.333333^\circ$ per Pada. |
| **Divisional Charts (D-2, D-9, D-60)** | Node Analytical | $0$ (Exact Integer Part) | Integer | D-2 Hora ($15^\circ$), D-9 Navamsha ($3^\circ 20'$ triplicities), D-60 Shashtyamsa ($30'$ BPHS odd/even mapping). |
| **Circular Boundary Proximity** | Node Analytical | $\pm 0.05^\circ$ ($3'$) | Degrees | Distance threshold to nearest step boundary triggering uncertainty disclosure for border placements. |
| **Circular Angular Difference** | Node Analytical | $\pm 10^{-9}$ | Degrees | Shortest circular arc metric handling $0^\circ/360^\circ$ wraparound: $\min(|a-b| \pmod{360}, 360 - (|a-b| \pmod{360}))$. |
| **Calendar Leap Year Rules** | All Tiers | $0$ (Strict Gregorian) | Boolean | Divisible by 4, not 100 unless 400. Rejects invalid dates (Feb 30, non-leap 1900-02-29). |
| **Timezone & DST Transition** | All Tiers | $0$ (Strict IANA / Disambiguation) | Error Code | Rejects DST spring gap (`NONEXISTENT_LOCAL_TIME`); rejects DST fall fold without offset (`AMBIGUOUS_LOCAL_TIME`). |

---

## 3. Scientific Justifications & Uncertainty Budget

### 3.1 Time Scale Conflation Avoidance
In celestial mechanics, conflating Terrestrial Time (TT) and Universal Time (UT) introduces an error of:
$$\Delta T = \text{TT} - \text{UT} \approx 64.184\text{ s (at J2000.0)}$$
Since the Moon moves across the celestial sphere at an average velocity of $\approx 0.55''/\text{second}$ of time:
$$\Delta \lambda_{\text{Moon}} \approx 64.184 \times 0.55'' \approx 35.3'' \approx 0.0098^\circ$$
While $35''$ is modest for an analytical preview, it can shift a Moon placement across a Navamsha or Shashtyamsa boundary if the Moon lies within $35''$ of a cusp. The platform strictly separates $JD_{\text{UT}}$ from $JD_{\text{TT}}$.

### 3.2 Node.js Analytical Preview vs High-Precision Ephemeris
The Node.js engine is engineered for instant UI rendering and preview visualizations. Its simplified orbital models carry known error profiles:
- **Sun**: Equation of center with 2 terms achieves accuracy within $0.08^\circ$ ($4.8'$), sufficient for Rashi and seasonal timing.
- **Moon**: 4-term perturbation series exhibits dispersion up to $5.36^\circ$ compared to DE440, which can alter Nakshatra or Pada assignments near boundaries.
- **Outer Planets**: Simplified Keplerian models without secular perturbation series exhibit errors up to $5.23^\circ$ (Saturn) and $25.8^\circ$ (Mars).

**Operational Mandate**: The Node analytical engine must NEVER be represented as an authoritative ephemeris. All output payloads must carry:
```json
{
  "calculationMode": "ANALYTICAL_APPROXIMATION",
  "independentValidationStatus": "NOT_PERFORMED",
  "strengthMetricsStatus": "UNAVAILABLE",
  "speed": null,
  "isRetrograde": null
}
```

### 3.3 Swiss Ephemeris MOSHIER Fallback Mode
When Astrodienst `.se1` compressed ephemeris files are absent from the ephemeris directory, `libswe.a` automatically falls back to Steve Moshier's semi-analytical formulas:
- **Accuracy**: Planets within $\sim 0.05^\circ$ ($3'$), Sun within $\sim 0.01^\circ$, Moon within $\sim 0.05^\circ$.
- **Disclosure**: The Go service inspects bitmask `returned_flags & SEFLG_MOSEPH` and explicitly returns `"ephemeris_mode": "MOSHIER"`.
- **Refusal**: If a client specifies `"required_mode": "SWISS_FILE"` and files are unprovisioned, the service fails closed with HTTP 503 / `EPHEMERIS_MODE_UNAVAILABLE`.

### 3.4 Boundary Uncertainty Flagging
Because celestial bodies continuously transit across discrete astrological boundaries (Signs at $30^\circ$, Nakshatras at $13^\circ 20'$, Navamshas at $3^\circ 20'$, Shashtyamsas at $30'$), any placement within $0.05^\circ$ ($3'$) of a cusp carries classification uncertainty under approximate calculation.
`checkBoundaryProximity(angle, step, threshold)` returns:
```ts
{ isNearBoundary: true, distanceToNearestBoundary: 0.02, nearestBoundary: 30.0 }
```
This enables the UI to communicate classification caveats honestly rather than projecting false certainty.
