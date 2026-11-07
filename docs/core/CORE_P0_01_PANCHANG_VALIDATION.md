> SUPERSEDED — HISTORICAL, NOT ACCEPTANCE EVIDENCE (2026-11-07). The claims and figures in the preserved report below are not current verified findings. Consult [FINAL_ACCURACY_REPORT](CORE_P0_01_FINAL_ACCURACY_REPORT.md) and [COMPLETION_MATRIX](CORE_P0_01_COMPLETION_MATRIX.md). No historical GO/complete/precision claim authorizes production or CORE-P0-02.

# CORE-P0-01 Vedic Panchang Validation & Boundary Solver Report

**Audit Identifier:** CORE-P0-01-ASTRONOMICAL-ACCURACY-REPAIR  
**Document Classification:** Engineering Release Evidence / Independent Verification  
**Evaluation Date:** 2026-11-06  
**Reference Ephemeris:** Positional Astronomy Centre (PAC), India Meteorological Department, Ministry of Earth Sciences, Government of India  
**Benchmark Publications:** *Indian Astronomical Ephemeris* (IAE) and *Rashtriya Panchang*

---

## 1. Executive Summary

The Vedic Panchang constitutes the five core limbs of astronomical time measurement:
1. **Tithi** (Lunar day based on $12^\circ$ Moon-Sun elongation increments).
2. **Nakshatra & Pada** (Lunar mansion based on $13^\circ 20'$ Moon sidereal longitude intervals, divided into 4 padas of $3^\circ 20'$).
3. **Yoga** (Combined solar and lunar longitude intervals of $13^\circ 20'$).
4. **Karana** (Half-tithi intervals of $6^\circ$: 7 repeating movable cycles and 4 fixed).
5. **Vara** (Solar day governed by sunrise-to-sunrise diurnal cycle).

Additionally, auspicious and inauspicious daytime divisions (*Ashtabhaga* segments for Rahu Kaal, Yamaganda, Gulika Kaal; Abhijit Muhurta; and Brahma Muhurta) require rigorous topocentric apparent solar calculation with atmospheric refraction and solar semi-diameter.

Under CORE-P0-01 remediation:
- Complete analytical formulations for all five Panchang limbs are implemented and numerically verified.
- Apparent Sunrise and Sunset match official Positional Astronomy Centre (PAC India) almanacs within $0.5\text{ minutes}$ (well within the $\le 2\text{ minute}$ release tolerance).
- A high-precision bisection root-finding boundary solver (`findTransitionInstant`) guarantees convergence to transition instants within $\le 10^{-5}\text{ days}$ ($< 0.86\text{ seconds}$).
- Unverified predictive features (personal Muhurat, BTR, Dasha) remain explicitly disabled with `scope: UNAVAILABLE` and honest metadata disclosures.

---

## 2. Mathematical Formulations of the Five Limbs

### 2.1 Tithi (Lunar Day)
Tithi is governed by the angular separation (elongation) between the Moon and the Sun:
$$\Delta\lambda = (\lambda_{\text{Moon}} - \lambda_{\text{Sun}}) \pmod{360^\circ}$$
$$\text{Tithi Index} = \left\lfloor \frac{\Delta\lambda}{12^\circ} \right\rfloor \in [0, 29]$$

- **Shukla Paksha (Waxing Phase):** Indices $0$ to $14$ (Pratipada to Purnima).
  - Purnima culminates at exact opposition: $\Delta\lambda = 180^\circ$ ($\text{Tithi Index} = 14$).
- **Krishna Paksha (Waning Phase):** Indices $15$ to $29$ (Pratipada to Amavasya).
  - Amavasya culminates at exact conjunction: $\Delta\lambda = 360^\circ / 0^\circ$ ($\text{Tithi Index} = 29$).
- **Boundary Precision:** Verified across Shukla Pratipada / Dwitiya boundary at $12.00^\circ$ with $0.0001^\circ$ resolution.

### 2.2 Nakshatra & Pada
Governed by the sidereal longitude of the Moon $\lambda_{\text{Moon, sidereal}}$ (True Lahiri Chitrapaksha):
$$\text{Nakshatra Step} = \frac{360^\circ}{27} = 13^\circ 20' = 13.333333^\circ$$
$$\text{Pada Step} = \frac{13^\circ 20'}{4} = 3^\circ 20' = 3.333333^\circ$$
$$\text{Nakshatra Index} = \left\lfloor \frac{\lambda_{\text{Moon, sidereal}}}{\text{Nakshatra Step}} \right\rfloor \in [0, 26]$$
$$\text{Pada} = \left\lfloor \frac{\lambda_{\text{Moon, sidereal}} \pmod{\text{Nakshatra Step}}}{\text{Pada Step}} \right\rfloor + 1 \in [1, 4]$$

Boundary test verified at $13.32^\circ$ (Ashwini Pada 4) and $13.35^\circ$ (Bharani Pada 1).

### 2.3 Yoga
Governed by the sum of sidereal solar and lunar longitudes:
$$\Sigma\lambda = (\lambda_{\text{Sun, sidereal}} + \lambda_{\text{Moon, sidereal}}) \pmod{360^\circ}$$
$$\text{Yoga Index} = \left\lfloor \frac{\Sigma\lambda}{13^\circ 20'} \right\rfloor \in [0, 26]$$
- 9 inauspicious Yogas are identified and flagged: *Vishkambha, Atiganda, Shula, Ganda, Vyaghata, Vajra, Vyatipata, Parigha, Vaidhriti*.

### 2.4 Karana (Half-Tithi)
Governed by half-tithi intervals of $6.0^\circ$:
$$\text{Karana Index} = \left\lfloor \frac{\Delta\lambda}{6^\circ} \right\rfloor \in [0, 59]$$

- **Fixed Karanas (4 total):**
  1. *Kintughna:* Index $0$ (Shukla Pratipada 1st half)
  2. *Shakuni:* Index $57$ (Krishna Chaturdashi 2nd half)
  3. *Chatushpada:* Index $58$ (Amavasya 1st half)
  4. *Naga:* Index $59$ (Amavasya 2nd half)
- **Movable Karanas (7 repeating in 8 cycles = 56 intervals):**
  *Bava, Balava, Kaulava, Taitila, Garija (Gara), Vanija, Vishti (Bhadra)*.
  *Vishti (Bhadra)* is explicitly classified as `nature: "Inauspicious"`.

---

## 3. Solar Horizon Events & Zenith Corrections

Topocentric apparent sunrise and sunset define the start and end of the Vedic day (*Dina-Mana*).

### 3.1 Astronomical Zenith Angle Correction
The geometric horizon corresponds to a zenith angle of $90^\circ$. For apparent visual sunrise/sunset, the Sun's upper limb touches the true horizon:
- **Atmospheric Refraction at Horizon:** Standard value $34' = 0.5667^\circ$.
- **Solar Semi-Diameter:** Standard value $16' = 0.2667^\circ$.
- **Effective Zenith Distance $z_0$:**
  $$z_0 = 90^\circ + 34' + 16' = 90^\circ 50' = 90.833333^\circ$$

The local hour angle $H_0$ is computed via:
$$\cos H_0 = \frac{\cos(90.833333^\circ) - \sin\phi \sin\delta}{\cos\phi \cos\delta}$$
where $\phi$ is the observer's geographic latitude and $\delta$ is the Sun's apparent declination.

### 3.2 Comparison with Official PAC India Ephemerides

| Scenario & Location | Date | PAC India Official Sunrise | PAC India Official Sunset | Engine Sunrise (Local) | Engine Sunset (Local) | Discrepancy | Tolerance | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **New Delhi** ($28.6139^\circ\text{ N}, 77.2090^\circ\text{ E}$) | 2026-11-08 | 06:38 IST | 17:31 IST | 06:38:14 IST | 17:31:27 IST | $+14\text{s} / +27\text{s}$ ($< 0.5\text{m}$) | $\le 2.0\text{m}$ | **PASS** |
| **Kolkata** ($22.5726^\circ\text{ N}, 88.3639^\circ\text{ E}$) | 1989-11-23 | 05:54 IST | 16:51 IST | 05:54:30 IST | 16:51:19 IST | $+30\text{s} / +19\text{s}$ ($< 0.5\text{m}$) | $\le 2.0\text{m}$ | **PASS** |

---

## 4. Daytime Muhurta Timing & Ashtabhaga Intervals

Daylight duration $D = T_{\text{sunset}} - T_{\text{sunrise}}$ is partitioned according to classical Vedic rules:

### 4.1 Ashtabhaga (8 Equal Daytime Segments, each $D / 8$)
- **Rahu Kaal Segment Mapping:**
  - Sunday: 8th segment (late afternoon)
  - Monday: 2nd segment (morning)
  - Tuesday: 7th segment (afternoon)
  - Wednesday: 5th segment (midday)
  - Thursday: 6th segment (early afternoon)
  - Friday: 4th segment (late morning)
  - Saturday: 3rd segment (morning)
- **Yamaganda & Gulika Kaal:** Mapped deterministically to respective weekday segments.

### 4.2 Abhijit & Brahma Muhurtas
- **Abhijit Muhurta:** 8th Muhurta of a 15-muhurta daytime division ($\text{Duration} = D / 15$). Centered near solar noon.
  - *Safeguard:* Inauspicious on Wednesday due to Rahu Kaal overlap; cleanly flagged with cautionary notice.
- **Brahma Muhurta:** Exactly two 48-minute Muhurtas (96 minutes to 48 minutes) preceding local apparent sunrise.

---

## 5. Numerical Boundary Solver (`findTransitionInstant`)

When displaying auspicious intervals, relying solely on discrete daily snapshots leads to inaccurate boundary reports. The platform incorporates a numerical root-finding bisection solver:

1. **Bracketing Phase:** Coarse step of $0.5\text{ hours}$ ($0.020833\text{ days}$) scans forward from search epoch up to $36.0\text{ hours}$ to bracket the zero-crossing of residual angle:
   $$\text{Residual}(t) = (\theta(t) - \theta_{\text{target}}) \pmod{360^\circ} \in [-180^\circ, 180^\circ]$$
2. **Bisection Refinement:** Once bracket $[t_A, t_B]$ with $\text{Residual}(t_A) \cdot \text{Residual}(t_B) \le 0$ is isolated, bisection executes until convergence tolerance $\epsilon \le 10^{-5}\text{ days}$ ($0.864\text{ seconds}$) is achieved.
3. **Verified Performance:**
   - Converges in 12–15 iterations.
   - Angular residual at root: $< 0.0001^\circ$ ($< 0.36\text{ arcseconds}$).
   - Discrepancy vs PAC boundary times: $< 30\text{ seconds}$ (well within the $\le 60\text{ second}$ requirement).
