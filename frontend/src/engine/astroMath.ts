import { validateBirthInput, CalculationInputError } from './calculationValidation';
import {
  calculateExactAscendant,
  calculateAllApparentTropicalBodies,
  norm360
} from './planetaryEphemeris';

/**
 * MymomentOclock Mathematical & Astronomical Specification Core
 * Supports True Lahiri (Chitrapaksha), KP, and Raman Ayanamsas.
 * Calculates Julian Day, Ephemeris Delta-T, Ascendant (Lagna),
 * Planetary Sidereal Positions, and Micro-Divisional Vargas (D-1, D-2, D-9, D-60).
 */

export enum AyanamsaType {
  TRUE_LAHIRI = 'TRUE_LAHIRI',
  KP = 'KP',
  RAMAN = 'RAMAN',
}

export type CalculationMode =
  | 'ANALYTICAL_APPROXIMATION'
  | 'SWISS_EPHEMERIS_MOSHIER'
  | 'SWISS_EPHEMERIS_FILE'
  | 'SWISS_EPHEMERIS_JPL';

export interface PlanetPosition {
  name: string;
  symbol: string;
  longitude: number; // 0 - 360 degrees
  signIndex: number; // 0 - 11
  signName: string;
  signLord: string;
  degreeInSign: number; // 0 - 30 degrees
  speed: number | null;
  isRetrograde: boolean | null;
  shadbala: null; // structural strength factor (0.8 - 1.8)
  ashtakavargaBindus: null; // 0 - 8 points
  functionalNature: null; // +1.0 Benefic, -1.0 Malefic, 0.0 Neutral
  functionalScore: null; // S_p score
  houseNumber: number; // 1 - 12
  nakshatra: string;
  nakshatraPada: number;
}

export interface HouseInfo {
  number: number;
  signIndex: number;
  signName: string;
  signLord: string;
  baseVibhuti: null; // House potency multiplier (0.6 - 1.2)
  planetsPresent: string[];
}

export interface ShashtyamsaData {
  planet: string;
  partIndex: number; // 0 - 59
  deityName: string;
  nature: 'Auspicious' | 'Malefic' | 'Neutral';
  significance: string;
}

export interface ChartCalculationResult {
  systemMetadata: {
    engineVersion: string;
    calculationMode: CalculationMode;
    independentValidationStatus: 'NOT_PERFORMED';
    strengthMetricsStatus: 'UNAVAILABLE';
    timezoneMode: 'CALLER_SUPPLIED_OFFSET' | 'IANA_VERIFIED_OFFSET';
    ayanamsaApplied: AyanamsaType;
    ayanamsaValue: number;
    julianDayUT: number;
    deltaTSeconds: number;
    calculationTimestamp: number;
    nativeLibraryVersion?: string;
    nativeSourceCommit?: string;
  };
  inputProfile: {
    birthDate: string;
    birthTime: string;
    latitude: number;
    longitude: number;
    cityName: string;
    timezoneOffset: number; // hours e.g. +5.5 for IST
    timezone?: string;
  };
  ascendantDegree: number;
  ascendantSignIndex: number;
  ascendantSignName: string;
  planets: PlanetPosition[];
  houses: HouseInfo[];
  divisionalCharts: {
    d1: { name: string; housePlacements: Record<number, string[]> };
    d2: { name: string; signs: Record<string, string> }; // Hora: Leo (Sun) vs Cancer (Moon)
    d9: { name: string; navamshaPlacements: Record<string, { sign: string; signIndex: number }> };
    d60: { name: string; shashtyamsas: ShashtyamsaData[] };
  };
  vimshottariDasha: {
    status: 'UNAVAILABLE';
    birthLord: null; balanceYears: null; activeMahadasha: null;
    activeAntardasha: null; activePratyantardasha: null;
    timeline: Array<{ lord: string; startDate: string; endDate: string; isCurrent: boolean }>;
  };
}

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon',
  'Sun', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Saturn', 'Jupiter'
];

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

export const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋'
};

export const DASHA_PERIODS: Record<string, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17
};

export const DASHA_ORDER = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'
];

// BPHS 60 Shashtyamsa Deities (Brihat Parashara Hora Shastra)
export const D60_DEITIES_ODD = [
  'Ghoraputra', 'Rakshasa', 'Deva', 'Kubera', 'Yaksha', 'Kinnara', 'Bhrashta', 'Kulaghna',
  'Garala', 'Vahni', 'Maya', 'Purishaka', 'Apampati', 'Marutvat', 'Kaala', 'Sarpa',
  'Amrita', 'Indu', 'Mridu', 'Komala', 'Heramba', 'Brahma', 'Vishnu', 'Maheshwara',
  'Deva', 'Ardra', 'Kalinasa', 'Kshitiswara', 'Kamalakara', 'Gulika', 'Mrityu', 'Kaala',
  'Davagni', 'Ghora', 'Adhama', 'Kantaka', 'Sudha', 'Amrita', 'Purnachandra', 'Vishagdha',
  'Kulanasa', 'Vamshakshaya', 'Utpata', 'Kaalarupa', 'Saumya', 'Komala', 'Sheetala', 'Karaladamshtra',
  'Chandramukhi', 'Pravina', 'Kaalagni', 'Dandadhara', 'Nirmala', 'Shubha', 'Ashubha', 'Kalanidhi',
  'Devendra', 'Varuna', 'Yama', 'Bhairava'
];

/**
 * Calculates Julian Day number from UTC Year, Month, Day, Hour, Minute, Second
 */
export function calculateJulianDay(year: number, month: number, day: number, hour: number, minute: number, second: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const dayFraction = day + (hour + minute / 60.0 + second / 3600.0) / 24.0;
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayFraction + b - 1524.5;
  return jd;
}

/**
 * Ephemeris Delta-T approximation (polynomial fit based on JPL / NASA ephemerides)
 */
export function calculateDeltaT(year: number): number {
  const t = (year - 2000) / 100;
  if (year >= 2005 && year <= 2050) {
    return 62.92 + 0.32217 * (year - 2000) + 0.005589 * Math.pow(year - 2000, 2);
  }
  if (year >= 1986 && year < 2005) {
    return 64.69 + 0.28 * (year - 2000);
  }
  return 60.0 + 32.0 * t * t;
}

/**
 * Calculates Ayanamsa in degrees for a given Julian Day
 */
export function getAyanamsa(jd: number, type: AyanamsaType = AyanamsaType.TRUE_LAHIRI): number {
  const t = (jd - 2451545.0) / 36525.0; // Centuries from J2000.0
  // Baseline True Lahiri (Chitrapaksha) at J2000.0 is 23°51'25.53" = 23.857092°
  const lahiriRate = 50.290966 / 3600.0; // annual precession
  const baseLahiri = 23.857092 + (t * 100.0 * lahiriRate);

  switch (type) {
    case AyanamsaType.KP:
      // Krishnamurti Paddhati offset ~-0°05'50" relative to Lahiri
      return baseLahiri - (5.0 / 60.0 + 50.0 / 3600.0);
    case AyanamsaType.RAMAN:
      // B.V. Raman ayanamsa offset ~-1°27' relative to Lahiri
      return baseLahiri - 1.45;
    case AyanamsaType.TRUE_LAHIRI:
    default:
      return baseLahiri;
  }
}

/**
 * Calculates Greenwich Mean Sidereal Time (GMST) in degrees
 */
export function calculateGST(jd: number): number {
  const t = (jd - 2451545.0) / 36525.0;
  let gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
            0.000387933 * t * t - (t * t * t) / 38710000.0;
  gst = gst % 360;
  if (gst < 0) gst += 360;
  return gst;
}

/**
 * Computes Eastern Sidereal Ascendant (Lagna) in degrees [0, 360).
 * Uses Apparent Sidereal Time (GAST), True Obliquity, and correct Eastern horizon quadrant.
 */
export function calculateAscendant(jd: number, lat: number, lon: number, ayanamsaVal: number): number {
  return calculateExactAscendant(jd, lat, lon, ayanamsaVal);
}

/**
 * Calculates the shortest distance between two angles in degrees [0, 360).
 * Handles the 0°/360° circular boundary properly (e.g. diff between 359.9° and 0.1° is 0.2°).
 */
export function circularAngularDifference(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360 + 360) % 360);
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Checks whether an angle lies within a given angular threshold of a boundary step.
 * Useful for reporting classification uncertainty near Nakshatra / Sign transitions.
 */
export function checkBoundaryProximity(
  angleDegrees: number,
  stepDegrees: number,
  thresholdDegrees: number = 0.05
): { isNearBoundary: boolean; distanceToNearestBoundary: number; nearestBoundary: number } {
  const norm = ((angleDegrees % 360) + 360) % 360;
  const lowerBoundary = Math.floor(norm / stepDegrees) * stepDegrees;
  const upperBoundary = (lowerBoundary + stepDegrees) % 360;
  const distToLower = circularAngularDifference(norm, lowerBoundary);
  const distToUpper = circularAngularDifference(norm, upperBoundary);
  const distanceToNearest = Math.min(distToLower, distToUpper);
  const nearestBoundary = distToLower <= distToUpper ? lowerBoundary : upperBoundary;
  return {
    isNearBoundary: distanceToNearest <= thresholdDegrees,
    distanceToNearestBoundary: Number(distanceToNearest.toFixed(6)),
    nearestBoundary,
  };
}

/**
 * Maps a body's sidereal longitude [0, 360) into full Vedic Rashi, House, and Nakshatra/Pada metadata.
 */
export function buildPlanetPositionFromSidereal(
  name: string,
  siderealLongitude: number,
  ascSignIdx: number,
  motion?: { speed: number | null; isRetrograde: boolean | null }
): PlanetPosition {
  const sidereal = norm360(siderealLongitude);
  const quantized = Number(sidereal.toFixed(4)) % 360;
  const signIndex = Math.min(11, Math.max(0, Math.floor(quantized / 30)));
  const degreeInSign = quantized - signIndex * 30;
  const signName = ZODIAC_SIGNS[signIndex];
  const signLord = SIGN_LORDS[signIndex];
  const houseNumber = ((signIndex - ascSignIdx + 12) % 12) + 1;
  const nakSpan = 360.0 / 27.0;
  const nakshatraIndex = Math.floor(quantized / nakSpan) % 27;
  const nakshatra = NAKSHATRAS[nakshatraIndex];
  const pada = Math.min(4, Math.floor((quantized % nakSpan) / (360.0 / 108.0)) + 1);

  return {
    name,
    symbol: PLANET_SYMBOLS[name] || '•',
    longitude: quantized,
    signIndex,
    signName,
    signLord,
    degreeInSign: Number(degreeInSign.toFixed(2)),
    speed: motion ? motion.speed : null,
    isRetrograde: motion ? motion.isRetrograde : null,
    shadbala: null,
    ashtakavargaBindus: null,
    functionalNature: null,
    functionalScore: null,
    houseNumber,
    nakshatra,
    nakshatraPada: pada,
  };
}

/**
 * High-precision astronomical positions for Vedic Navagrahas (Meeus VSOP87 / ELP2000-82 + mutual perturbations)
 */
export function calculatePlanetaryPositions(jd: number, ayanamsaVal: number, ascendantDegree: number): PlanetPosition[] {
  const apparentTrop = calculateAllApparentTropicalBodies(jd);
  const ascSignIdx = Math.min(11, Math.max(0, Math.floor(norm360(ascendantDegree) / 30)));
  const orderedNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const;

  return orderedNames.map((name) => {
    const sidereal = norm360(apparentTrop[name] - ayanamsaVal);
    return buildPlanetPositionFromSidereal(name, sidereal, ascSignIdx);
  });
}

// Division boundaries must not use the 2-decimal display degree.
function divisionDegree(p: PlanetPosition): number {
  if (Number.isFinite(p.longitude) && Number.isInteger(p.signIndex)) {
    const degree = p.longitude - p.signIndex * 30;
    if (degree >= 0 && degree < 30) return degree;
    throw new CalculationInputError('DIVISION_BOUNDARY_UNRESOLVED', 'Rounded longitude and sign disagree at a boundary; use a validated native position.');
  }
  throw new CalculationInputError('INVALID_PLANET_POSITION', 'Supply a finite longitude and consistent sign for divisional mapping.');
}

export function calculateD2Hora(planets: PlanetPosition[]): Record<string, string> {
  const result: Record<string, string> = {};
  planets.forEach(p => {
    const isOddSign = p.signIndex % 2 === 0; // Aries=0 (odd sign in Vedic 1-indexed count)
    const firstHalf = divisionDegree(p) < 15.0;
    if (isOddSign) {
      result[p.name] = firstHalf ? 'Sun (Leo - Active/Wealth Solar)' : 'Moon (Cancer - Receptive/Lunar)';
    } else {
      result[p.name] = firstHalf ? 'Moon (Cancer - Receptive/Lunar)' : 'Sun (Leo - Active/Wealth Solar)';
    }
  });
  return result;
}

export function calculateD9Navamsha(planets: PlanetPosition[]): Record<string, { sign: string; signIndex: number }> {
  const result: Record<string, { sign: string; signIndex: number }> = {};
  const elementStartSigns = [0, 9, 6, 3]; // Fire->Aries, Earth->Cap, Air->Libra, Water->Cancer

  planets.forEach(p => {
    const segment = Math.floor(divisionDegree(p) / (30.0 / 9.0)); // 0 to 8
    const element = p.signIndex % 4; // 0=Fire, 1=Earth, 2=Air, 3=Water
    const startSign = elementStartSigns[element];
    const navamshaSignIdx = (startSign + segment) % 12;
    result[p.name] = {
      sign: ZODIAC_SIGNS[navamshaSignIdx],
      signIndex: navamshaSignIdx,
    };
  });

  return result;
}

export function calculateD60Shashtyamsa(planets: PlanetPosition[]): ShashtyamsaData[] {
  return planets.map(p => {
    const partIndex = Math.min(59, Math.floor(divisionDegree(p) / 0.5));
    const isOdd = p.signIndex % 2 === 0;
    const deityName = isOdd ? D60_DEITIES_ODD[partIndex] : D60_DEITIES_ODD[59 - partIndex];

    const auspiciousNames = ['Deva', 'Kubera', 'Amrita', 'Indu', 'Mridu', 'Komala', 'Vishnu', 'Brahma', 'Saumya', 'Sheetala', 'Nirmala', 'Shubha', 'Kalanidhi'];
    const maleficNames = ['Ghoraputra', 'Rakshasa', 'Bhrashta', 'Garala', 'Vahni', 'Maya', 'Sarpa', 'Mrityu', 'Kaala', 'Davagni', 'Ghora', 'Kantaka'];

    let nature: 'Auspicious' | 'Malefic' | 'Neutral' = 'Neutral';
    if (auspiciousNames.includes(deityName)) nature = 'Auspicious';
    if (maleficNames.includes(deityName)) nature = 'Malefic';

    return {
      planet: p.name,
      partIndex,
      deityName,
      nature,
      significance: `D-60 Part ${partIndex + 1}/60 (${deityName}): karmic destiny seed for ${p.name}`,
    };
  });
}

export function calculateVimshottariDasha(_moonLongitude: number, _birthDateStr: string): ChartCalculationResult['vimshottariDasha'] {
  return { status: 'UNAVAILABLE', birthLord: null, balanceYears: null, activeMahadasha: null, activeAntardasha: null, activePratyantardasha: null, timeline: [] };
}

/**
 * Shared chart assembly helper used by both Analytical Preview and Native Swiss Ephemeris CGo Bridge
 */
export function assembleChartResult(params: {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  cityName: string;
  timezoneOffset: number;
  timezone?: string;
  ayanamsaType: AyanamsaType;
  ayanamsaVal: number;
  jdUT: number;
  deltaT: number;
  ascDegree: number;
  planets: PlanetPosition[];
  calculationMode: CalculationMode;
  engineVersion: string;
  nativeLibraryVersion?: string;
  nativeSourceCommit?: string;
}): ChartCalculationResult {
  const ascQuant = Number(norm360(params.ascDegree).toFixed(4)) % 360;
  const ascSignIdx = Math.min(11, Math.max(0, Math.floor(ascQuant / 30)));

  const houses: HouseInfo[] = Array.from({ length: 12 }, (_, i) => {
    const houseNum = i + 1;
    const signIdx = (ascSignIdx + i) % 12;
    const planetsInHouse = params.planets.filter(p => p.houseNumber === houseNum).map(p => p.name);
    return {
      number: houseNum,
      signIndex: signIdx,
      signName: ZODIAC_SIGNS[signIdx],
      signLord: SIGN_LORDS[signIdx],
      baseVibhuti: null,
      planetsPresent: planetsInHouse,
    };
  });

  const d1Placements: Record<number, string[]> = {};
  houses.forEach(h => {
    d1Placements[h.number] = h.planetsPresent;
  });

  const d2Hora = calculateD2Hora(params.planets);
  const d9Navamsha = calculateD9Navamsha(params.planets);
  const d60Shashtyamsa = calculateD60Shashtyamsa(params.planets);
  const moon = params.planets.find(p => p.name === 'Moon') || params.planets[1];
  const vimshottariDasha = calculateVimshottariDasha(moon.longitude, params.birthDate);

  return {
    systemMetadata: {
      engineVersion: params.engineVersion,
      calculationMode: params.calculationMode,
      independentValidationStatus: 'NOT_PERFORMED',
      strengthMetricsStatus: 'UNAVAILABLE',
      timezoneMode: params.timezone && params.timezone !== 'UTC_OFFSET' ? 'IANA_VERIFIED_OFFSET' : 'CALLER_SUPPLIED_OFFSET',
      ayanamsaApplied: params.ayanamsaType,
      ayanamsaValue: Number(params.ayanamsaVal.toFixed(6)),
      julianDayUT: Number(params.jdUT.toFixed(6)),
      deltaTSeconds: Number(params.deltaT.toFixed(2)),
      calculationTimestamp: Math.floor(Date.now() / 1000),
      ...(params.nativeLibraryVersion ? { nativeLibraryVersion: params.nativeLibraryVersion } : {}),
      ...(params.nativeSourceCommit ? { nativeSourceCommit: params.nativeSourceCommit } : {}),
    },
    inputProfile: {
      birthDate: params.birthDate,
      birthTime: params.birthTime,
      latitude: params.latitude,
      longitude: params.longitude,
      cityName: params.cityName,
      timezoneOffset: params.timezoneOffset,
      ...(params.timezone ? { timezone: params.timezone } : {}),
    },
    ascendantDegree: ascQuant,
    ascendantSignIndex: ascSignIdx,
    ascendantSignName: ZODIAC_SIGNS[ascSignIdx],
    planets: params.planets,
    houses,
    divisionalCharts: {
      d1: { name: 'D-1 Rashi (Lagna)', housePlacements: d1Placements },
      d2: { name: 'D-2 Hora (Wealth & Vitality)', signs: d2Hora },
      d9: { name: 'D-9 Navamsha (Dharma & Destiny)', navamshaPlacements: d9Navamsha },
      d60: { name: 'D-60 Shashtyamsa (Macro Karma)', shashtyamsas: d60Shashtyamsa },
    },
    vimshottariDasha,
  };
}

/**
 * Primary chart calculation orchestrator
 */
export function calculateFullChart(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  cityName: string = '',
  timezoneOffset: number = Number.NaN,
  ayanamsaType: AyanamsaType = AyanamsaType.TRUE_LAHIRI,
  timezone?: string
): ChartCalculationResult {
  validateBirthInput({ birthDate, birthTime, latitude, longitude, timezoneOffset, ayanamsaType, timezone });
  const [yearStr, monthStr, dayStr] = birthDate.split('-');
  const [hourStr, minStr, secStr] = birthTime.split(':');

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const localHour = parseInt(hourStr, 10);
  const localMin = Number(minStr);
  const localSec = secStr === undefined ? 0 : Number(secStr);

  // Apply explicit offset as elapsed time, including negative fractional offsets and date boundaries.
  const jdUT = calculateJulianDay(year, month, day, localHour, localMin, localSec) - timezoneOffset / 24;
  const deltaT = calculateDeltaT(year);
  const ayanamsaVal = getAyanamsa(jdUT, ayanamsaType);
  const ascDegree = calculateAscendant(jdUT, latitude, longitude, ayanamsaVal);
  const ascQuant = Number(norm360(ascDegree).toFixed(4)) % 360;
  const planets = calculatePlanetaryPositions(jdUT, ayanamsaVal, ascQuant);

  return assembleChartResult({
    birthDate,
    birthTime,
    latitude,
    longitude,
    cityName,
    timezoneOffset,
    timezone,
    ayanamsaType,
    ayanamsaVal,
    jdUT,
    deltaT,
    ascDegree: ascQuant,
    planets,
    calculationMode: 'ANALYTICAL_APPROXIMATION',
    engineVersion: 'meeus-vsop87-elp2000-v2',
  });
}
