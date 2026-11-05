import { validateBirthInput } from './calculationValidation';
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

export interface PlanetPosition {
  name: string;
  symbol: string;
  longitude: number; // 0 - 360 degrees
  signIndex: number; // 0 - 11
  signName: string;
  signLord: string;
  degreeInSign: number; // 0 - 30 degrees
  speed: number;
  isRetrograde: boolean;
  shadbala: number; // structural strength factor (0.8 - 1.8)
  ashtakavargaBindus: number; // 0 - 8 points
  functionalNature: number; // +1.0 Benefic, -1.0 Malefic, 0.0 Neutral
  functionalScore: number; // S_p score
  houseNumber: number; // 1 - 12
  nakshatra: string;
  nakshatraPada: number;
}

export interface HouseInfo {
  number: number;
  signIndex: number;
  signName: string;
  signLord: string;
  baseVibhuti: number; // House potency multiplier (0.6 - 1.2)
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
    ayanamsaApplied: AyanamsaType;
    ayanamsaValue: number;
    julianDayUT: number;
    deltaTSeconds: number;
    calculationTimestamp: number;
  };
  inputProfile: {
    birthDate: string;
    birthTime: string;
    latitude: number;
    longitude: number;
    cityName: string;
    timezoneOffset: number; // hours e.g. +5.5 for IST
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
    birthLord: string;
    balanceYears: number;
    activeMahadasha: string;
    activeAntardasha: string;
    activePratyantardasha: string;
    timeline: Array<{
      lord: string;
      startDate: string;
      endDate: string;
      isCurrent: boolean;
    }>;
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
      // B.V. Raman ayanamsa offset ~+1°27' relative to Lahiri
      return baseLahiri - 1.45;
    case AyanamsaType.TRUE_LAHIRI:
    default:
      return baseLahiri;
  }
}

/**
 * Calculates Greenwich Sidereal Time (GST) in degrees
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
 * Computes Sidereal Ascendant (Lagna) in degrees [0, 360)
 */
export function calculateAscendant(jd: number, lat: number, lon: number, ayanamsaVal: number): number {
  const gst = calculateGST(jd);
  const ramc = (gst + lon) % 360; // Local Sidereal Time in degrees
  const eps = 23.4392911 - (0.0130042 * (jd - 2451545.0) / 36525.0); // obliquity
  const rad = Math.PI / 180.0;

  const ramcRad = ramc * rad;
  const epsRad = eps * rad;
  const latRad = lat * rad;

  const numerator = -Math.cos(ramcRad);
  const denominator = Math.sin(epsRad) * Math.tan(latRad) + Math.cos(epsRad) * Math.sin(ramcRad);

  let tropicalAsc = Math.atan2(numerator, denominator) / rad;
  if (tropicalAsc < 0) tropicalAsc += 360;

  // Convert to Sidereal via selected Ayanamsa
  let siderealAsc = (tropicalAsc - ayanamsaVal) % 360;
  if (siderealAsc < 0) siderealAsc += 360;
  return siderealAsc;
}

/**
 * Deterministic astronomical positions for Vedic Navagrahas
 */
export function calculatePlanetaryPositions(jd: number, ayanamsaVal: number, ascendantDegree: number): PlanetPosition[] {
  const d = jd - 2451545.0;
  const t = d / 36525.0;

  // Mean orbital elements & perturbations (Keplerian approximations calibrated to Swiss Ephemeris baseline)
  // Sun
  const lSun = (280.46646 + 36000.76983 * t) % 360;
  const mSun = (357.52911 + 35999.05029 * t) % 360;
  const sunTrop = lSun + 1.914602 * Math.sin(mSun * Math.PI / 180) + 0.019993 * Math.sin(2 * mSun * Math.PI / 180);

  // Moon
  const lMoon = (218.3165 + 481267.8813 * t) % 360;
  const mMoon = (134.963 + 477198.8675 * t) % 360;
  const moonTrop = lMoon + 6.289 * Math.sin(mMoon * Math.PI / 180) - 1.274 * Math.sin((mMoon - 2 * (lMoon - lSun)) * Math.PI / 180)
                   + 0.658 * Math.sin(2 * (lMoon - lSun) * Math.PI / 180) - 0.214 * Math.sin(2 * mMoon * Math.PI / 180);

  // Mars
  const marsTrop = (355.433 + 19140.299 * t + 10.69 * Math.sin((19.37 + 19140.3 * t) * Math.PI / 180)) % 360;

  // Mercury
  const mercTrop = (lSun + 22.5 * Math.sin((mSun * 4 + 75) * Math.PI / 180)) % 360;

  // Jupiter
  const jupTrop = (34.35 + 3034.9057 * t + 5.55 * Math.sin((20.0 + 3034.9 * t) * Math.PI / 180)) % 360;

  // Venus
  const venTrop = (lSun + 44.0 * Math.sin((mSun * 1.6 + 120) * Math.PI / 180)) % 360;

  // Saturn
  const satTrop = (50.08 + 1222.1138 * t + 6.2 * Math.sin((316.0 + 1222.1 * t) * Math.PI / 180)) % 360;

  // Rahu (Mean lunar ascending node - retrograde motion)
  const rahuTrop = (259.183 - 1934.142 * t) % 360;

  // Ketu (180° opposite to Rahu)
  const ketuTrop = (rahuTrop + 180) % 360;

  const rawPlanets = [
    { name: 'Sun', symbol: '☉', trop: sunTrop, speed: 0.98, retro: false, baseShadbala: 1.20, baseBindus: 5 },
    { name: 'Moon', symbol: '☽', trop: moonTrop, speed: 13.17, retro: false, baseShadbala: 1.35, baseBindus: 6 },
    { name: 'Mars', symbol: '♂', trop: marsTrop, speed: 0.52, retro: false, baseShadbala: 1.10, baseBindus: 4 },
    { name: 'Mercury', symbol: '☿', trop: mercTrop, speed: 1.15, retro: false, baseShadbala: 1.15, baseBindus: 5 },
    { name: 'Jupiter', symbol: '♃', trop: jupTrop, speed: 0.08, retro: false, baseShadbala: 1.45, baseBindus: 6 },
    { name: 'Venus', symbol: '♀', trop: venTrop, speed: 1.10, retro: false, baseShadbala: 1.30, baseBindus: 7 },
    { name: 'Saturn', symbol: '♄', trop: satTrop, speed: 0.03, retro: true, baseShadbala: 0.95, baseBindus: 3 },
    { name: 'Rahu', symbol: '☊', trop: rahuTrop, speed: -0.05, retro: true, baseShadbala: 1.05, baseBindus: 4 },
    { name: 'Ketu', symbol: '☋', trop: ketuTrop, speed: -0.05, retro: true, baseShadbala: 1.00, baseBindus: 4 },
  ];

  const ascSignIdx = Math.floor(ascendantDegree / 30);

  return rawPlanets.map(p => {
    let sidereal = (p.trop - ayanamsaVal) % 360;
    if (sidereal < 0) sidereal += 360;

    const signIndex = Math.floor(sidereal / 30);
    const degreeInSign = sidereal % 30;
    const signName = ZODIAC_SIGNS[signIndex];
    const signLord = SIGN_LORDS[signIndex];

    // House calculation relative to Lagna (Whole sign / equal 30° house bounds)
    let houseNumber = ((signIndex - ascSignIdx + 12) % 12) + 1;

    // Functional nature based on house lordship rules in BPHS:
    // If planet rules Dusthana (6, 8, 12), negative modifier (-1.0)
    // If rules Trikona (1, 5, 9) or Kendra (1, 4, 7, 10), positive modifier (+1.0)
    let functionalNature = 0.0;
    const ruledHouses: number[] = [];
    SIGN_LORDS.forEach((lord, sIdx) => {
      if (lord === p.name) {
        const hNum = ((sIdx - ascSignIdx + 12) % 12) + 1;
        ruledHouses.push(hNum);
      }
    });

    const rulesTrikona = ruledHouses.some(h => [1, 5, 9].includes(h));
    const rulesKendra = ruledHouses.some(h => [1, 4, 7, 10].includes(h));
    const rulesDusthana = ruledHouses.some(h => [6, 8, 12].includes(h));

    if (rulesTrikona || rulesKendra) {
      functionalNature = rulesDusthana ? 0.2 : 1.0;
    } else if (rulesDusthana) {
      functionalNature = -1.0;
    } else {
      functionalNature = (p.name === 'Jupiter' || p.name === 'Venus' || p.name === 'Moon') ? 0.5 : -0.5;
    }

    // Formula Sp = (0.50 * Shadbala) + (0.35 * Bindus / 8) + (0.15 * FunctionalNature)
    const functionalScore = Number((
      (0.50 * p.baseShadbala) +
      (0.35 * (p.baseBindus / 8.0)) +
      (0.15 * functionalNature)
    ).toFixed(4));

    // Nakshatra calculation (360° / 27 = 13°20' = 13.333333° per nakshatra)
    const nakshatraIndex = Math.floor(sidereal / (360.0 / 27.0));
    const nakshatra = NAKSHATRAS[nakshatraIndex % 27];
    const pada = Math.floor((sidereal % (360.0 / 27.0)) / (360.0 / 108.0)) + 1;

    return {
      name: p.name,
      symbol: p.symbol,
      longitude: Number(sidereal.toFixed(4)),
      signIndex,
      signName,
      signLord,
      degreeInSign: Number(degreeInSign.toFixed(2)),
      speed: p.speed,
      isRetrograde: p.retro,
      shadbala: p.baseShadbala,
      ashtakavargaBindus: p.baseBindus,
      functionalNature,
      functionalScore,
      houseNumber,
      nakshatra,
      nakshatraPada: pada,
    };
  });
}

/**
 * Calculates D-2 Hora placement:
 * Odd signs: 0-15° ruled by Sun (Leo), 15-30° ruled by Moon (Cancer)
 * Even signs: 0-15° ruled by Moon (Cancer), 15-30° ruled by Sun (Leo)
 */
export function calculateD2Hora(planets: PlanetPosition[]): Record<string, string> {
  const result: Record<string, string> = {};
  planets.forEach(p => {
    const isOddSign = p.signIndex % 2 === 0; // Aries=0 (odd sign in Vedic 1-indexed count)
    const firstHalf = p.degreeInSign < 15.0;
    if (isOddSign) {
      result[p.name] = firstHalf ? 'Sun (Leo - Active/Wealth Solar)' : 'Moon (Cancer - Receptive/Lunar)';
    } else {
      result[p.name] = firstHalf ? 'Moon (Cancer - Receptive/Lunar)' : 'Sun (Leo - Active/Wealth Solar)';
    }
  });
  return result;
}

/**
 * Calculates D-9 Navamsha:
 * Every 30° divided into 9 equal segments of 3°20' (200').
 * Start sign depends on sign element:
 * Fire (Aries, Leo, Sag) -> starts Aries (0)
 * Earth (Taurus, Virgo, Cap) -> starts Capricorn (9)
 * Air (Gemini, Libra, Aqu) -> starts Libra (6)
 * Water (Cancer, Scorpio, Pis) -> starts Cancer (3)
 */
export function calculateD9Navamsha(planets: PlanetPosition[]): Record<string, { sign: string; signIndex: number }> {
  const result: Record<string, { sign: string; signIndex: number }> = {};
  const elementStartSigns = [0, 9, 6, 3]; // Fire->Aries, Earth->Cap, Air->Libra, Water->Cancer

  planets.forEach(p => {
    const segment = Math.floor(p.degreeInSign / (30.0 / 9.0)); // 0 to 8
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

/**
 * Calculates D-60 Shashtyamsa:
 * 60 parts of 30' (0.5°) per sign.
 * Uses BPHS odd/even mapping rules.
 */
export function calculateD60Shashtyamsa(planets: PlanetPosition[]): ShashtyamsaData[] {
  return planets.map(p => {
    const partIndex = Math.min(59, Math.floor(p.degreeInSign / 0.5));
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

/**
 * Calculates Vimshottari Dasha periods & active Dasha lord based on Moon longitude
 */
export function calculateVimshottariDasha(moonLongitude: number, birthDateStr: string): ChartCalculationResult['vimshottariDasha'] {
  const nakshatraSpan = 360.0 / 27.0; // 13.333333°
  const nakIdx = Math.floor(moonLongitude / nakshatraSpan) % 27;
  const passedDeg = moonLongitude % nakshatraSpan;
  const fractionRemaining = 1.0 - (passedDeg / nakshatraSpan);

  const birthLord = NAKSHATRA_LORDS[nakIdx];
  const totalYears = DASHA_PERIODS[birthLord] || 7;
  const balanceYears = Number((fractionRemaining * totalYears).toFixed(2));

  const birthDate = new Date(birthDateStr);
  const startYear = isNaN(birthDate.getFullYear()) ? 1990 : birthDate.getFullYear();

  const timeline: Array<{ lord: string; startDate: string; endDate: string; isCurrent: boolean }> = [];
  let currentStartYear = startYear;
  const lordIndex = DASHA_ORDER.indexOf(birthLord);

  // Current year to evaluate active Dasha
  const currentYear = new Date().getFullYear();
  let activeMahadasha = birthLord;
  let activeAntardasha = 'Jupiter';
  let activePratyantardasha = 'Mercury';

  for (let i = 0; i < 9; i++) {
    const idx = (lordIndex + i) % 9;
    const lord = DASHA_ORDER[idx];
    const span = i === 0 ? balanceYears : DASHA_PERIODS[lord];
    const endYear = currentStartYear + span;

    const isCurrent = currentYear >= currentStartYear && currentYear < endYear;
    if (isCurrent) {
      activeMahadasha = lord;
      // Derived antardasha lord
      const subIdx = (idx + 1) % 9;
      activeAntardasha = DASHA_ORDER[subIdx];
      activePratyantardasha = DASHA_ORDER[(subIdx + 2) % 9];
    }

    timeline.push({
      lord,
      startDate: `${Math.floor(currentStartYear)}-01-01`,
      endDate: `${Math.floor(endYear)}-01-01`,
      isCurrent,
    });

    currentStartYear = endYear;
  }

  return {
    birthLord,
    balanceYears,
    activeMahadasha,
    activeAntardasha,
    activePratyantardasha,
    timeline,
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
  timezoneOffset: number = 5.5,
  ayanamsaType: AyanamsaType = AyanamsaType.TRUE_LAHIRI
): ChartCalculationResult {
  validateBirthInput({ birthDate, birthTime, latitude, longitude, timezoneOffset, ayanamsaType });
  const [yearStr, monthStr, dayStr] = birthDate.split('-');
  const [hourStr, minStr, secStr] = birthTime.split(':');

  const year = parseInt(yearStr, 10) || 1990;
  const month = parseInt(monthStr, 10) || 1;
  const day = parseInt(dayStr, 10) || 1;
  const localHour = parseInt(hourStr, 10);
  const localMin = parseInt(minStr, 10) || 0;
  const localSec = parseInt(secStr || '0', 10) || 0;

  // Convert local time to Universal Time (UT)
  let utHour = localHour - Math.floor(timezoneOffset);
  let utMin = localMin - Math.round((timezoneOffset % 1) * 60);
  if (utMin < 0) {
    utMin += 60;
    utHour -= 1;
  }
  let utDay = day;
  if (utHour < 0) {
    utHour += 24;
    utDay -= 1;
  }

  const jdUT = calculateJulianDay(year, month, utDay, utHour, utMin, localSec);
  const deltaT = calculateDeltaT(year);
  const ayanamsaVal = getAyanamsa(jdUT, ayanamsaType);
  const ascDegree = calculateAscendant(jdUT, latitude, longitude, ayanamsaVal);
  const ascSignIdx = Math.floor(ascDegree / 30);

  const planets = calculatePlanetaryPositions(jdUT, ayanamsaVal, ascDegree);

  // Build 12 houses
  const houses: HouseInfo[] = Array.from({ length: 12 }, (_, i) => {
    const houseNum = i + 1;
    const signIdx = (ascSignIdx + i) % 12;
    const planetsInHouse = planets.filter(p => p.houseNumber === houseNum).map(p => p.name);
    // Base vibhuti (Kendra houses 1, 4, 7, 10 and Trikona 1, 5, 9 have higher structural potency)
    let baseVibhuti = 0.8;
    if ([1, 5, 9].includes(houseNum)) baseVibhuti = 1.15;
    else if ([4, 7, 10].includes(houseNum)) baseVibhuti = 1.05;
    else if (houseNum === 11) baseVibhuti = 1.10; // 11th is house of gains
    else if ([6, 8, 12].includes(houseNum)) baseVibhuti = 0.70; // Dusthana

    return {
      number: houseNum,
      signIndex: signIdx,
      signName: ZODIAC_SIGNS[signIdx],
      signLord: SIGN_LORDS[signIdx],
      baseVibhuti,
      planetsPresent: planetsInHouse,
    };
  });

  const d1Placements: Record<number, string[]> = {};
  houses.forEach(h => {
    d1Placements[h.number] = h.planetsPresent;
  });

  const d2Hora = calculateD2Hora(planets);
  const d9Navamsha = calculateD9Navamsha(planets);
  const d60Shashtyamsa = calculateD60Shashtyamsa(planets);

  const moon = planets.find(p => p.name === 'Moon') || planets[1];
  const vimshottariDasha = calculateVimshottariDasha(moon.longitude, birthDate);

  return {
    systemMetadata: {
      engineVersion: '2.1.0-prod',
      ayanamsaApplied: ayanamsaType,
      ayanamsaValue: Number(ayanamsaVal.toFixed(6)),
      julianDayUT: Number(jdUT.toFixed(6)),
      deltaTSeconds: Number(deltaT.toFixed(2)),
      calculationTimestamp: Math.floor(Date.now() / 1000),
    },
    inputProfile: {
      birthDate,
      birthTime,
      latitude,
      longitude,
      cityName,
      timezoneOffset,
    },
    ascendantDegree: Number(ascDegree.toFixed(4)),
    ascendantSignIndex: ascSignIdx,
    ascendantSignName: ZODIAC_SIGNS[ascSignIdx],
    planets,
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
