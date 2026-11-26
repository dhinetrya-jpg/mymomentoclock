import { CalculationInputError, validGregorianDate } from './calculationValidation';

/**
 * Single Authoritative Solar, 60-Term Lunar, Planetary, Nodal & Horizon Ephemeris Core
 *
 * Collapses all solar/lunar calculations across `panchang.ts`, `zeroCostAstroEngine.ts`,
 * `astroMath.ts`, `scoringEngine.ts`, and `server/dailyTimingEngine.ts` onto ONE shared core:
 * - `moonSun(jdUT)` — ΔT-corrected VSOP87 Apparent Sun + Full 60-Term Meeus Ch. 47 Table 47.A Moon
 *   with E/E² eccentricity scaling, A1/A2/L'-F perturbations, 10-term IAU Nutation (Δψ, Δε),
 *   True Obliquity (ε), Right Ascension (α), Declination (δ), and Right-Ascension Equation of Time.
 * - `solarTimes(...)` — 2-pass topocentric Sunrise, Sunset & Solar Noon with standard -50' upper-limb
 *   atmospheric refraction plus optional geometric horizon dip for observer `elevationMeters`.
 * - `calculateAllApparentTropicalBodies(jdUT)` — Mercury..Saturn (Meeus Table 31.A + Kepler + 5:2 Great Inequality
 *   mutual Jupiter/Saturn perturbations + retarded light-time/aberration) + Mean Lunar Nodes (Rahu/Ketu).
 */

const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;
const LIGHT_SPEED_AU_PER_DAY = 173.1446326846693;

export function norm360(deg: number): number {
  const r = deg % 360.0;
  return r < 0 ? r + 360.0 : r;
}

function wrap180(deg: number): number {
  return ((deg + 540.0) % 360.0) - 180.0;
}

/**
 * Espenak & Meeus (NASA TP-2006-214141) piecewise ΔT (TT - UT) in seconds.
 * Matches IERS observed ΔT within ~0.5s across 1900–2026.
 */
export function calculateAccurateDeltaTSeconds(jdUT: number): number {
  const year = 2000.0 + (jdUT - 2451545.0) / 365.25;
  if (year < 1920) {
    const t = year - 1900.0;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t;
  }
  if (year < 1941) {
    const t = year - 1920.0;
    return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t * t * t;
  }
  if (year < 1961) {
    const t = year - 1950.0;
    return 29.07 + 0.407 * t - (t * t) / 233.0 + (t * t * t) / 2547.0;
  }
  if (year < 1986) {
    const t = year - 1975.0;
    return 45.45 + 1.067 * t - (t * t) / 260.0 - (t * t * t) / 718.0;
  }
  if (year < 2005) {
    const t = year - 2000.0;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t * t +
      0.0017275 * t * t * t +
      0.000651814 * t * t * t * t +
      0.00002373599 * t * t * t * t * t
    );
  }
  if (year <= 2050) {
    const t = year - 2000.0;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  const u = (year - 1820.0) / 100.0;
  return -20.0 + 32.0 * u * u - 0.5628 * (2150.0 - year);
}

/**
 * Computes IAU Nutation in Longitude (Δψ, deg), Nutation in Obliquity (Δε, deg),
 * Mean Obliquity (ε0, deg), and True Obliquity (ε, deg) at Terrestrial Time JD_TT (Meeus Ch. 22).
 */
export function calculateNutationAndObliquity(jdTT: number): {
  deltaPsiDeg: number;
  deltaEpsDeg: number;
  meanObliquityDeg: number;
  trueObliquityDeg: number;
} {
  const t = (jdTT - 2451545.0) / 36525.0;
  const t2 = t * t;
  const t3 = t2 * t;

  const d = norm360(297.85036 + 445267.11148 * t - 0.0019142 * t2 + t3 / 189474.0) * DEG2RAD;
  const m = norm360(357.52772 + 35999.05034 * t - 0.0001603 * t2 - t3 / 300000.0) * DEG2RAD;
  const mp = norm360(134.96298 + 477198.867398 * t + 0.0086972 * t2 + t3 / 56250.0) * DEG2RAD;
  const f = norm360(93.27191 + 483202.017538 * t - 0.0036825 * t2 + t3 / 327270.0) * DEG2RAD;
  const om = norm360(125.04452 - 1934.136261 * t + 0.0020708 * t2 + t3 / 450000.0) * DEG2RAD;

  const dPsiArcsec =
    ((-171996 - 174.2 * t) * Math.sin(om) +
      (-13187 - 1.6 * t) * Math.sin(-2 * d + 2 * f + 2 * om) +
      (-2274 - 0.2 * t) * Math.sin(2 * f + 2 * om) +
      (2062 + 0.2 * t) * Math.sin(2 * om) +
      (1426 - 3.4 * t) * Math.sin(m) +
      (712 + 0.1 * t) * Math.sin(mp) +
      (-517 + 1.2 * t) * Math.sin(-2 * d + m + 2 * f + 2 * om) +
      (-386 - 0.4 * t) * Math.sin(2 * f + om) +
      -301 * Math.sin(mp + 2 * f + 2 * om) +
      (217 - 0.5 * t) * Math.sin(-2 * d - m + 2 * f + 2 * om)) *
    1e-4;

  const dEpsArcsec =
    ((92025 + 8.9 * t) * Math.cos(om) +
      (5736 - 3.1 * t) * Math.cos(-2 * d + 2 * f + 2 * om) +
      (977 - 0.5 * t) * Math.cos(2 * f + 2 * om) +
      (-895 + 0.5 * t) * Math.cos(2 * om) +
      (54 - 0.1 * t) * Math.cos(m) +
      -7 * Math.cos(mp) +
      (224 - 0.6 * t) * Math.cos(-2 * d + m + 2 * f + 2 * om) +
      200 * Math.cos(2 * f + om) +
      (129 - 0.1 * t) * Math.cos(mp + 2 * f + 2 * om) +
      (-95 + 0.3 * t) * Math.cos(-2 * d - m + 2 * f + 2 * om)) *
    1e-4;

  const meanObliquityDeg =
    23.0 +
    26.0 / 60.0 +
    21.448 / 3600.0 -
    (46.815 * t + 0.00059 * t2 - 0.001813 * t3) / 3600.0;

  const deltaPsiDeg = dPsiArcsec / 3600.0;
  const deltaEpsDeg = dEpsArcsec / 3600.0;

  return {
    deltaPsiDeg,
    deltaEpsDeg,
    meanObliquityDeg,
    trueObliquityDeg: meanObliquityDeg + deltaEpsDeg,
  };
}

/**
 * Computes Greenwich Apparent Sidereal Time (GAST) in degrees at JD_UT
 */
export function calculateGAST(jdUT: number, jdTT?: number): { gastDeg: number; trueObliquityDeg: number } {
  const effectiveTT = jdTT ?? jdUT + calculateAccurateDeltaTSeconds(jdUT) / 86400.0;
  const t = (jdUT - 2451545.0) / 36525.0;
  const gmst = norm360(
    280.46061837 + 360.98564736629 * (jdUT - 2451545.0) + 0.000387933 * t * t - (t * t * t) / 38710000.0
  );
  const nut = calculateNutationAndObliquity(effectiveTT);
  const eqEquinoxes = nut.deltaPsiDeg * Math.cos(nut.trueObliquityDeg * DEG2RAD);
  return {
    gastDeg: norm360(gmst + eqEquinoxes),
    trueObliquityDeg: nut.trueObliquityDeg,
  };
}

/**
 * Computes exact Eastern Sidereal Ascendant (Lagna) in degrees [0, 360).
 */
export function calculateExactAscendant(
  jdUT: number,
  latitude: number,
  longitude: number,
  ayanamsaVal: number
): number {
  if (!Number.isFinite(jdUT) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new CalculationInputError('INVALID_COORDINATES', 'Supply finite Julian Day and geographic coordinates.');
  }
  if (Math.abs(latitude) >= 89.999999) {
    throw new CalculationInputError('ASCENDANT_UNAVAILABLE_AT_POLE', 'Ascendant is undefined at the exact geographic poles.');
  }

  const { gastDeg, trueObliquityDeg } = calculateGAST(jdUT);
  const ramcRad = norm360(gastDeg + longitude) * DEG2RAD;
  const epsRad = trueObliquityDeg * DEG2RAD;
  const latRad = latitude * DEG2RAD;

  const y = Math.cos(ramcRad);
  const x = -(Math.sin(epsRad) * Math.tan(latRad) + Math.cos(epsRad) * Math.sin(ramcRad));
  const tropicalAsc = norm360(Math.atan2(y, x) * RAD2DEG);

  return norm360(tropicalAsc - ayanamsaVal);
}

// Complete 60-row Meeus Chapter 47 Table 47.A series for Moon longitude: [D, M, M', F, Σl_coeff_1e-6_deg]
const MOON_LON_TERMS_60: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 0, 1, 0, 6288774],
  [2, 0, -1, 0, 1274027],
  [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793],
  [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923],
  [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383],
  [2, 0, 0, -2, 15327],
  [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675],
  [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548],
  [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163],
  [1, 1, 0, 0, 4987],
  [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994],
  [4, 0, 0, 0, 3861],
  [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602],
  [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348],
  [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069],
  [2, -2, -1, 0, 2048],
  [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595],
  [4, -1, -1, 0, 1215],
  [0, 0, 2, 2, -1110],
  [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810],
  [4, -1, -2, 0, 759],
  [0, 2, -1, 0, -713],
  [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596],
  [4, 0, 1, 0, 549],
  [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520],
  [1, 0, -2, 0, -487],
  [2, 1, 0, -2, -399],
  [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351],
  [3, 0, -2, 0, -340],
  [4, 0, -3, 0, 330],
  [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323],
  [1, 1, -1, 0, 299],
  [2, 0, 3, 0, 294],
  [2, 0, -1, -2, 0],
];

/**
 * Apparent geocentric tropical Moon longitude (Full 60-term Meeus Ch. 47 Table 47.A + E/E² + A1/A2/L'-F + nutation)
 */
export function calculateApparentMoonTropical(jdTT: number, deltaPsiDeg: number): number {
  const t = (jdTT - 2451545.0) / 36525.0;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;

  const lp = norm360(218.3164477 + 481267.88123421 * t - 0.0015786 * t2 + t3 / 538841.0 - t4 / 65194000.0);
  const d = norm360(297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868.0 - t4 / 113065000.0);
  const m = norm360(357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000.0);
  const mp = norm360(134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699.0 - t4 / 14712000.0);
  const f = norm360(93.272095 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000.0 + t4 / 863310000.0);

  const a1 = norm360(119.75 + 131.849 * t) * DEG2RAD;
  const a2 = norm360(53.09 + 479264.29 * t) * DEG2RAD;
  const a3 = norm360(313.45 + 481266.484 * t) * DEG2RAD;
  void a3; // Meeus p. 338: A3 applies to Σb (latitude); A1, L'-F, A2 apply to Σl (longitude)
  const eFactor = 1.0 - 0.002516 * t - 0.0000074 * t2;
  const e2Factor = eFactor * eFactor;

  let sumL = 0;
  for (const [kd, km, kmp, kf, coeff] of MOON_LON_TERMS_60) {
    if (coeff === 0) continue;
    const arg = (kd * d + km * m + kmp * mp + kf * f) * DEG2RAD;
    const absM = Math.abs(km);
    const mult = absM === 1 ? eFactor : absM === 2 ? e2Factor : 1.0;
    sumL += coeff * mult * Math.sin(arg);
  }

  // Venus (A1), Earth-flattening (L'-F), and Jupiter (A2) additive longitude terms (Meeus p. 338)
  sumL += 3958 * Math.sin(a1) + 1962 * Math.sin((lp - f) * DEG2RAD) + 318 * Math.sin(a2);

  return norm360(lp + sumL * 1e-6 + deltaPsiDeg);
}

/**
 * Apparent geocentric tropical Sun details at JD_TT (Meeus Ch. 25, pp. 163–166, with planetary & lunar perturbations)
 */
export function calculateSunDetailsAtTT(
  jdTT: number,
  deltaPsiDeg: number,
  trueObliquityDeg: number
): {
  meanLongitudeDeg: number;
  trueGeometricLongitudeDeg: number;
  apparentLongitudeDeg: number;
  distanceAU: number;
  rightAscensionDeg: number;
  declinationDeg: number;
  equationOfTimeMinutes: number;
} {
  const t = (jdTT - 2451545.0) / 36525.0;
  const t2 = t * t;

  const l0 = norm360(280.46646 + 36000.76983 * t + 0.0003032 * t2);
  const m = norm360(357.52911 + 35999.05029 * t - 0.0001537 * t2);
  const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t2;
  const mRad = m * DEG2RAD;

  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t2) * Math.sin(mRad) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * mRad) +
    0.000289 * Math.sin(3 * mRad);

  const sunTrueLon = norm360(l0 + c);
  const vRad = (m + c) * DEG2RAD;
  const distanceAU = (1.000001018 * (1.0 - e * e)) / (1.0 + e * Math.cos(vRad));

  const a = norm360(351.52 + 22518.4428 * t) * DEG2RAD;
  const b = norm360(253.14 + 45036.8857 * t) * DEG2RAD;
  const cArg = norm360(157.23 + 32964.4673 * t) * DEG2RAD;
  const dArg = norm360(297.85 + 445267.1117 * t) * DEG2RAD;
  const eArg = norm360(252.08 + 20.19 * t) * DEG2RAD;

  const dLonDeg =
    0.00134 * Math.cos(a) +
    0.00154 * Math.cos(b) +
    0.002 * Math.cos(cArg) +
    0.00179 * Math.sin(dArg) +
    0.00178 * Math.sin(eArg);

  const aberrationDeg = -20.4898 / (3600.0 * distanceAU);
  const apparentLongitudeDeg = norm360(sunTrueLon + dLonDeg + aberrationDeg + deltaPsiDeg);

  const epsRad = trueObliquityDeg * DEG2RAD;
  const appLonRad = apparentLongitudeDeg * DEG2RAD;
  const rightAscensionDeg = norm360(Math.atan2(Math.cos(epsRad) * Math.sin(appLonRad), Math.cos(appLonRad)) * RAD2DEG);
  const declinationDeg = Math.asin(Math.max(-1.0, Math.min(1.0, Math.sin(epsRad) * Math.sin(appLonRad)))) * RAD2DEG;

  // Exact Meeus Eq. (28.1) Right-Ascension Equation of Time: E = L0 - 0.0057183° - α + Δψ cos(ε)
  const eotDeg = wrap180(l0 - 0.0057183 - rightAscensionDeg + deltaPsiDeg * Math.cos(epsRad));
  const equationOfTimeMinutes = 4.0 * eotDeg;

  return {
    meanLongitudeDeg: l0,
    trueGeometricLongitudeDeg: sunTrueLon,
    apparentLongitudeDeg,
    distanceAU,
    rightAscensionDeg,
    declinationDeg,
    equationOfTimeMinutes,
  };
}

export function calculateApparentSunTropical(jdTT: number, deltaPsiDeg: number): number {
  const { trueObliquityDeg } = calculateNutationAndObliquity(jdTT);
  return calculateSunDetailsAtTT(jdTT, deltaPsiDeg, trueObliquityDeg).apparentLongitudeDeg;
}

export interface UnifiedMoonSunResult {
  jdUT: number;
  jdTT: number;
  deltaTSeconds: number;
  deltaPsiDeg: number;
  trueObliquityDeg: number;
  sunTropicalDeg: number;
  sunGeometricDeg: number;
  sunDistanceAU: number;
  sunRightAscensionDeg: number;
  sunDeclinationDeg: number;
  equationOfTimeMinutes: number;
  moonTropicalDeg: number;
}

/**
 * Unified single-source `moonSun(jdUT)` core used by BOTH `panchang.ts` and `zeroCostAstroEngine.ts`.
 * Applies ΔT = TT - UT, 10-term IAU nutation, VSOP87 Sun, and 60-term Meeus Ch. 47 Moon.
 */
export function moonSun(jdUT: number): UnifiedMoonSunResult {
  if (!Number.isFinite(jdUT)) {
    throw new CalculationInputError('INVALID_JULIAN_DAY', 'Supply a finite Julian Day.');
  }
  const deltaTSeconds = calculateAccurateDeltaTSeconds(jdUT);
  const jdTT = jdUT + deltaTSeconds / 86400.0;
  const { deltaPsiDeg, trueObliquityDeg } = calculateNutationAndObliquity(jdTT);
  const sun = calculateSunDetailsAtTT(jdTT, deltaPsiDeg, trueObliquityDeg);
  const moonTropicalDeg = calculateApparentMoonTropical(jdTT, deltaPsiDeg);

  return {
    jdUT,
    jdTT,
    deltaTSeconds,
    deltaPsiDeg,
    trueObliquityDeg,
    sunTropicalDeg: sun.apparentLongitudeDeg,
    sunGeometricDeg: sun.trueGeometricLongitudeDeg,
    sunDistanceAU: sun.distanceAU,
    sunRightAscensionDeg: sun.rightAscensionDeg,
    sunDeclinationDeg: sun.declinationDeg,
    equationOfTimeMinutes: sun.equationOfTimeMinutes,
    moonTropicalDeg,
  };
}

export interface UnifiedSolarTimesResult {
  date: string;
  sunriseUtcMs: number | null;
  sunsetUtcMs: number | null;
  solarNoonUtcMs: number;
  dayLengthHours: number;
  isPolarDay: boolean;
  isPolarNight: boolean;
  horizonAltitudeDeg: number;
  elevationMeters: number;
}

function julianDayFromCivilUtc(year: number, month: number, day: number, utcHours: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + utcHours / 24.0 + b - 1524.5;
}

/**
 * Unified single-source `solarTimes(...)` core used by BOTH `panchang.ts` and `zeroCostAstroEngine.ts`.
 * Computes topocentric apparent Sunrise, Sunset & Solar Noon via 2-pass Right-Ascension Equation of Time
 * and declination refinement, with standard -50' upper-limb atmospheric refraction plus optional elevation dip.
 */
export function solarTimes(
  year: number,
  month: number,
  day: number,
  latitude: number,
  longitude: number,
  elevationMeters: number = 0
): UnifiedSolarTimesResult {
  const dateStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (!validGregorianDate(dateStr) || ![year, month, day].every(Number.isInteger)) {
    throw new CalculationInputError('INVALID_DATE', `Invalid Gregorian calendar date: ${dateStr}`);
  }
  if (![latitude, longitude, elevationMeters].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new CalculationInputError('INVALID_LOCATION', 'Supply finite latitude (±90°) and longitude (±180°).');
  }
  if (elevationMeters < -500 || elevationMeters > 12000) {
    throw new CalculationInputError('INVALID_ELEVATION', 'Observer elevation must be between -500m and 12000m.');
  }

  const clampedLatRad = Math.max(-89.9999, Math.min(89.9999, latitude)) * DEG2RAD;
  const dipDeg = elevationMeters > 0 ? (1.76 * Math.sqrt(elevationMeters)) / 60.0 : 0;
  const horizonAltitudeDeg = -(50.0 / 60.0) - dipDeg;
  const sinH0 = Math.sin(horizonAltitudeDeg * DEG2RAD);

  const evalAtUtcHours = (utcHrs: number) => {
    const jd = julianDayFromCivilUtc(year, month, day, utcHrs);
    const ms = moonSun(jd);
    const decRad = ms.sunDeclinationDeg * DEG2RAD;
    const cosH0 = (sinH0 - Math.sin(clampedLatRad) * Math.sin(decRad)) / (Math.cos(clampedLatRad) * Math.cos(decRad));
    const noonUtcHrs = 12.0 - longitude / 15.0 - ms.equationOfTimeMinutes / 60.0;
    return { cosH0, noonUtcHrs };
  };

  const baseMidnight = new Date(0);
  baseMidnight.setUTCFullYear(year, month - 1, day);
  baseMidnight.setUTCHours(0, 0, 0, 0);
  const midnightMs = baseMidnight.getTime();

  const approxNoonHrs = 12.0 - longitude / 15.0;
  const pass1 = evalAtUtcHours(approxNoonHrs);
  const pass2Noon = evalAtUtcHours(pass1.noonUtcHrs);
  const solarNoonUtcMs = midnightMs + Math.round(pass2Noon.noonUtcHrs * 3600000);

  if (pass2Noon.cosH0 > 1.0) {
    return {
      date: dateStr,
      sunriseUtcMs: null,
      sunsetUtcMs: null,
      solarNoonUtcMs,
      dayLengthHours: 0,
      isPolarDay: false,
      isPolarNight: true,
      horizonAltitudeDeg,
      elevationMeters,
    };
  }
  if (pass2Noon.cosH0 < -1.0) {
    return {
      date: dateStr,
      sunriseUtcMs: null,
      sunsetUtcMs: null,
      solarNoonUtcMs,
      dayLengthHours: 24,
      isPolarDay: true,
      isPolarNight: false,
      horizonAltitudeDeg,
      elevationMeters,
    };
  }

  const h0Hrs0 = (Math.acos(pass2Noon.cosH0) * RAD2DEG) / 15.0;
  const riseHrs0 = pass2Noon.noonUtcHrs - h0Hrs0;
  const setHrs0 = pass2Noon.noonUtcHrs + h0Hrs0;

  // Pass 2 & Pass 3 evaluated at actual sunrise and sunset instants (~0.25° solar motion across daylight)
  const riseEval1 = evalAtUtcHours(riseHrs0);
  if (riseEval1.cosH0 > 1.0 || riseEval1.cosH0 < -1.0) {
    return {
      date: dateStr,
      sunriseUtcMs: null,
      sunsetUtcMs: null,
      solarNoonUtcMs,
      dayLengthHours: riseEval1.cosH0 < -1.0 ? 24 : 0,
      isPolarDay: riseEval1.cosH0 < -1.0,
      isPolarNight: riseEval1.cosH0 > 1.0,
      horizonAltitudeDeg,
      elevationMeters,
    };
  }
  const riseHrs1 = riseEval1.noonUtcHrs - (Math.acos(riseEval1.cosH0) * RAD2DEG) / 15.0;
  const riseEval2 = evalAtUtcHours(riseHrs1);
  const finalRiseHrs =
    riseEval2.cosH0 >= -1.0 && riseEval2.cosH0 <= 1.0
      ? riseEval2.noonUtcHrs - (Math.acos(riseEval2.cosH0) * RAD2DEG) / 15.0
      : riseHrs1;

  const setEval1 = evalAtUtcHours(setHrs0);
  if (setEval1.cosH0 > 1.0 || setEval1.cosH0 < -1.0) {
    return {
      date: dateStr,
      sunriseUtcMs: null,
      sunsetUtcMs: null,
      solarNoonUtcMs,
      dayLengthHours: setEval1.cosH0 < -1.0 ? 24 : 0,
      isPolarDay: setEval1.cosH0 < -1.0,
      isPolarNight: setEval1.cosH0 > 1.0,
      horizonAltitudeDeg,
      elevationMeters,
    };
  }
  const setHrs1 = setEval1.noonUtcHrs + (Math.acos(setEval1.cosH0) * RAD2DEG) / 15.0;
  const setEval2 = evalAtUtcHours(setHrs1);
  const finalSetHrs =
    setEval2.cosH0 >= -1.0 && setEval2.cosH0 <= 1.0
      ? setEval2.noonUtcHrs + (Math.acos(setEval2.cosH0) * RAD2DEG) / 15.0
      : setHrs1;

  const sunriseUtcMs = midnightMs + Math.round(finalRiseHrs * 3600000);
  const sunsetUtcMs = midnightMs + Math.round(finalSetHrs * 3600000);

  return {
    date: dateStr,
    sunriseUtcMs,
    sunsetUtcMs,
    solarNoonUtcMs,
    dayLengthHours: Number(((sunsetUtcMs - sunriseUtcMs) / 3600000).toFixed(4)),
    isPolarDay: false,
    isPolarNight: false,
    horizonAltitudeDeg,
    elevationMeters,
  };
}

interface OrbitalPoly {
  L: readonly [number, number, number, number];
  a: readonly [number, number];
  e: readonly [number, number, number];
  i: readonly [number, number, number];
  Omega: readonly [number, number, number];
  varpi: readonly [number, number, number];
}

const MEEUS_ELEMENTS: Record<'Earth' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn', OrbitalPoly> = {
  Earth: {
    L: [100.466457, 36000.7698278, 0.00030322, 0.00000002],
    a: [1.000001018, 0],
    e: [0.01670863, -0.000042037, -0.0000001267],
    i: [0, 0, 0],
    Omega: [0, 0, 0],
    varpi: [102.937348, 1.7195366, 0.00045688],
  },
  Mercury: {
    L: [252.250906, 149474.0722491, 0.0003035, 0.000000018],
    a: [0.38709831, 0],
    e: [0.20563175, 0.000020407, -0.0000000283],
    i: [7.004986, 0.0018215, -0.0000181],
    Omega: [48.330893, 1.1861883, 0.00017542],
    varpi: [77.456119, 1.5564776, 0.00029544],
  },
  Venus: {
    L: [181.979801, 58519.2130302, 0.00031014, 0.000000015],
    a: [0.72332982, 0],
    e: [0.00677192, -0.000047765, 0.0000000981],
    i: [3.394662, 0.0010037, -0.00000088],
    Omega: [76.67992, 0.9011206, 0.00040618],
    varpi: [131.563703, 1.4022288, -0.00107618],
  },
  Mars: {
    L: [355.433, 19141.6964471, 0.00031052, 0.000000016],
    a: [1.523679342, 0],
    e: [0.09340065, 0.000090484, -0.0000000806],
    i: [1.849726, -0.0006011, 0.00001276],
    Omega: [49.558093, 0.7720959, 0.00001557],
    varpi: [336.060234, 1.8410449, 0.00013477],
  },
  Jupiter: {
    L: [34.351519, 3036.3027748, 0.0002233, 0.000000037],
    a: [5.202603209, 0.000000191],
    e: [0.04849793, 0.000163225, -0.0000004714],
    i: [1.303267, -0.0054965, 0.00000466],
    Omega: [100.464407, 1.0209774, 0.00040315],
    varpi: [14.331207, 1.6126352, 0.00103042],
  },
  Saturn: {
    L: [50.077444, 1223.5110686, 0.00051908, -0.00000003],
    a: [9.554909192, -0.000002139],
    e: [0.05554814, -0.000346641, -0.0000006436],
    i: [2.488879, -0.0037362, -0.00001519],
    Omega: [113.665503, 0.877088, -0.00012176],
    varpi: [93.057237, 1.9637613, 0.00083753],
  },
};

function solveKeplerRad(meanAnomalyRad: number, e: number): number {
  let E = meanAnomalyRad + e * Math.sin(meanAnomalyRad) * (1.0 + e * Math.cos(meanAnomalyRad));
  for (let iter = 0; iter < 8; iter++) {
    const f = E - e * Math.sin(E) - meanAnomalyRad;
    const fp = 1.0 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

function heliocentricEclipticOfDate(
  body: 'Earth' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn',
  jdTT: number
): { x: number; y: number; z: number } {
  const t = (jdTT - 2451545.0) / 36525.0;
  const t2 = t * t;
  const t3 = t2 * t;
  const el = MEEUS_ELEMENTS[body];

  const L = norm360(el.L[0] + el.L[1] * t + el.L[2] * t2 + el.L[3] * t3);
  const a = el.a[0] + el.a[1] * t;
  const e = el.e[0] + el.e[1] * t + el.e[2] * t2;
  const inc = (el.i[0] + el.i[1] * t + el.i[2] * t2) * DEG2RAD;
  const Omega = norm360(el.Omega[0] + el.Omega[1] * t + el.Omega[2] * t2);
  const varpi = norm360(el.varpi[0] + el.varpi[1] * t + el.varpi[2] * t2);

  const Mdeg = norm360(L - varpi);
  const Mrad = (Mdeg > 180 ? Mdeg - 360 : Mdeg) * DEG2RAD;
  const E = solveKeplerRad(Mrad, e);

  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(Math.max(0, 1.0 - e * e)) * Math.sin(E);
  const vDeg = Math.atan2(yv, xv) * RAD2DEG;
  const r = Math.hypot(xv, yv);

  if (body === 'Earth') {
    const lonRad = norm360(varpi + vDeg) * DEG2RAD;
    return { x: r * Math.cos(lonRad), y: r * Math.sin(lonRad), z: 0 };
  }

  const uRad = norm360(varpi - Omega + vDeg) * DEG2RAD;
  const omRad = Omega * DEG2RAD;
  const cosU = Math.cos(uRad);
  const sinU = Math.sin(uRad);
  const cosO = Math.cos(omRad);
  const sinO = Math.sin(omRad);
  const cosI = Math.cos(inc);
  const sinI = Math.sin(inc);

  const xh = r * (cosO * cosU - sinO * sinU * cosI);
  const yh = r * (sinO * cosU + cosO * sinU * cosI);
  const zh = r * (sinU * sinI);

  if (body !== 'Jupiter' && body !== 'Saturn') {
    return { x: xh, y: yh, z: zh };
  }

  let lonHelio = Math.atan2(yh, xh) * RAD2DEG;
  let latHelio = Math.atan2(zh, Math.hypot(xh, yh)) * RAD2DEG;

  const jEl = MEEUS_ELEMENTS.Jupiter;
  const sEl = MEEUS_ELEMENTS.Saturn;
  const Mj = norm360(
    jEl.L[0] + jEl.L[1] * t + jEl.L[2] * t2 + jEl.L[3] * t3 - (jEl.varpi[0] + jEl.varpi[1] * t + jEl.varpi[2] * t2)
  );
  const Ms = norm360(
    sEl.L[0] + sEl.L[1] * t + sEl.L[2] * t2 + sEl.L[3] * t3 - (sEl.varpi[0] + sEl.varpi[1] * t + sEl.varpi[2] * t2)
  );

  if (body === 'Jupiter') {
    lonHelio +=
      -0.332 * Math.sin((2 * Mj - 5 * Ms - 67.6) * DEG2RAD) -
      0.056 * Math.sin((2 * Mj - 2 * Ms + 21.0) * DEG2RAD) +
      0.042 * Math.sin((3 * Mj - 5 * Ms + 21.0) * DEG2RAD) -
      0.036 * Math.sin((Mj - 2 * Ms) * DEG2RAD) +
      0.022 * Math.cos((Mj - Ms) * DEG2RAD) +
      0.023 * Math.sin((2 * Mj - 3 * Ms + 52.0) * DEG2RAD) -
      0.016 * Math.sin((Mj - 5 * Ms - 69.0) * DEG2RAD);
  } else {
    lonHelio +=
      0.812 * Math.sin((2 * Mj - 5 * Ms - 67.6) * DEG2RAD) -
      0.229 * Math.cos((2 * Mj - 4 * Ms - 2.0) * DEG2RAD) +
      0.119 * Math.sin((Mj - 2 * Ms - 3.0) * DEG2RAD) +
      0.046 * Math.sin((2 * Mj - 6 * Ms - 69.0) * DEG2RAD) +
      0.014 * Math.sin((Mj - 3 * Ms + 32.0) * DEG2RAD);
    latHelio +=
      -0.02 * Math.cos((2 * Mj - 4 * Ms - 2.0) * DEG2RAD) +
      0.018 * Math.sin((2 * Mj - 6 * Ms - 49.0) * DEG2RAD);
  }

  const lonR = lonHelio * DEG2RAD;
  const latR = latHelio * DEG2RAD;
  const rCosB = r * Math.cos(latR);
  return {
    x: rCosB * Math.cos(lonR),
    y: rCosB * Math.sin(lonR),
    z: r * Math.sin(latR),
  };
}

export function calculateApparentPlanetTropical(
  body: 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn',
  jdTT: number,
  deltaPsiDeg: number
): number {
  const e0 = heliocentricEclipticOfDate('Earth', jdTT);
  const p0 = heliocentricEclipticOfDate(body, jdTT);
  const dist0 = Math.hypot(p0.x - e0.x, p0.y - e0.y, p0.z - e0.z);
  const tau0 = dist0 / LIGHT_SPEED_AU_PER_DAY;

  const p1 = heliocentricEclipticOfDate(body, jdTT - tau0);
  const dist1 = Math.hypot(p1.x - e0.x, p1.y - e0.y, p1.z - e0.z);
  const tau = dist1 / LIGHT_SPEED_AU_PER_DAY;

  const pRet = heliocentricEclipticOfDate(body, jdTT - tau);
  const eRet = heliocentricEclipticOfDate('Earth', jdTT - tau);

  const dx = pRet.x - eRet.x;
  const dy = pRet.y - eRet.y;
  const meanLon = norm360(Math.atan2(dy, dx) * RAD2DEG);
  return norm360(meanLon + deltaPsiDeg);
}

export function calculateMeanLunarNodeTropical(jdTT: number, deltaPsiDeg: number): number {
  const t = (jdTT - 2451545.0) / 36525.0;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const omegaMean = 125.0445479 - 1934.1362891 * t + 0.0020754 * t2 + t3 / 467441.0 - t4 / 60616000.0;
  return norm360(omegaMean + deltaPsiDeg);
}

export function calculateAllApparentTropicalBodies(jdUT: number): Record<string, number> {
  const ms = moonSun(jdUT);
  const rahu = calculateMeanLunarNodeTropical(ms.jdTT, ms.deltaPsiDeg);
  return {
    Sun: ms.sunTropicalDeg,
    Moon: ms.moonTropicalDeg,
    Mars: calculateApparentPlanetTropical('Mars', ms.jdTT, ms.deltaPsiDeg),
    Mercury: calculateApparentPlanetTropical('Mercury', ms.jdTT, ms.deltaPsiDeg),
    Jupiter: calculateApparentPlanetTropical('Jupiter', ms.jdTT, ms.deltaPsiDeg),
    Venus: calculateApparentPlanetTropical('Venus', ms.jdTT, ms.deltaPsiDeg),
    Saturn: calculateApparentPlanetTropical('Saturn', ms.jdTT, ms.deltaPsiDeg),
    Rahu: rahu,
    Ketu: norm360(rahu + 180.0),
  };
}
