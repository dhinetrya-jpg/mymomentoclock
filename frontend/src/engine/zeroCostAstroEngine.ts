/**
 * @license
 * MIT License
 *
 * High-Precision Self-Contained Astronomical & Vedic Panchang Engine
 * Implements Meeus Astronomical Algorithms (VSOP87 & ELP2000-82 truncated),
 * Topocentric Refraction-corrected Sunrise/Sunset, True Chitrapaksha Lahiri Ayanamsa,
 * 5-Limb Panchang (with true 60-Karana cycle), 8 Kaalas (with lunar Amritadi Ghati),
 * 16 Day/Night Choghadiyas + Pre-Sunrise Continuity, 24 Horas, and Live Sripati Bhava Chalit.
 *
 * Zero external dependencies. Zero licensing cost. Permissive MIT license.
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  cityName?: string;
  timezone?: string;     // Optional IANA timezone e.g. 'Asia/Kolkata', 'America/New_York'
  timezoneOffset: number; // e.g. +5.5 for IST
}

export interface PanchangaLimbResult {
  index: number;
  name: string;
  fractionElapsed: number; // 0.0 - 1.0
  degreeInSpan: number;
}

export interface KaalaWindow {
  name: string;
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
  startLocal: string; // HH:MM (24h canonical)
  endLocal: string;   // HH:MM (24h canonical)
  start12Hr: string;  // hh:mm AM/PM
  end12Hr: string;    // hh:mm AM/PM
  nature: 'Auspicious' | 'Inauspicious' | 'Neutral';
  scoreImpact: number;
}

export interface ChoghadiyaWindow {
  name: string;
  vedicLord: string;
  nature: 'Amrit' | 'Shubh' | 'Labh' | 'Char' | 'Rog' | 'Kaal' | 'Udveg';
  isAuspicious: boolean;
  startMs: number;
  endMs: number;
  startLocal: string;
  endLocal: string;
  start12Hr: string;
  end12Hr: string;
  scoreImpact: number;
}

export interface HoraWindow {
  horaNumber: number;
  rulingPlanet: string;
  startMs: number;
  endMs: number;
  startLocal: string;
  endLocal: string;
  start12Hr: string;
  end12Hr: string;
  isAuspicious: boolean;
}

export interface BhavaCusp {
  bhavaNumber: number;
  madhyaLongitude: number;      // Midpoint
  sandhiStartLongitude: number; // Starting boundary
  sandhiEndLongitude: number;   // Ending boundary
  rashiIndex: number;
  rashiName: string;
}

export interface DayAnalysisResult {
  date: string;
  location: LocationCoordinates;
  solarMetrics: {
    sunrise: string;
    sunset: string;
    solarNoon: string;
    sunrise12Hr: string;
    sunset12Hr: string;
    solarNoon12Hr: string;
    sunriseMs: number;
    sunsetMs: number;
    nextSunriseMs: number;
    dayLengthMinutes: number;
    nightLengthMinutes: number;
    isPolar: boolean;
    polarCondition?: 'POLAR_DAY' | 'POLAR_NIGHT';
  };
  sunriseLocal?: string;
  sunsetLocal?: string;
  dayOfWeekIndex: number;
  siderealSunLongitude: number;
  siderealMoonLongitude: number;
  panchanga: {
    tithi: PanchangaLimbResult & { paksha: 'Shukla' | 'Krishna' };
    nakshatra: PanchangaLimbResult & { lord: string; pada: number };
    yoga: PanchangaLimbResult;
    karana: PanchangaLimbResult & { isVishtiBhadra: boolean };
    vaara: { dayIndex: number; name: string; lord: string };
  };
  fixedKaalas: {
    rahuKaal: KaalaWindow;
    gulikaKaal: KaalaWindow;
    yamaghanta: KaalaWindow;
    abhijitMuhurta: KaalaWindow & { isValidOnThisDay: boolean };
    brahmaMuhurta: KaalaWindow;
    godhuliKaal: KaalaWindow;
    vijayaMuhurta: KaalaWindow;
    amritKaal: KaalaWindow;
  };
  kaalaTimings: {
    rahuKaalam: { start: string; end: string; start12Hr: string; end12Hr: string };
    gulikaKaalam: { start: string; end: string; start12Hr: string; end12Hr: string };
    yamaghantam: { start: string; end: string; start12Hr: string; end12Hr: string };
    abhijitMuhurta: { start: string; end: string; start12Hr: string; end12Hr: string };
    brahmaMuhurta: { start: string; end: string; start12Hr: string; end12Hr: string };
    godhuliBela: { start: string; end: string; start12Hr: string; end12Hr: string };
    vijayaMuhurta: { start: string; end: string; start12Hr: string; end12Hr: string };
    amritKaal: { start: string; end: string; start12Hr: string; end12Hr: string };
  };
  choghadiya: {
    preSunriseChoghadiya: ChoghadiyaWindow[];
    dayChoghadiya: ChoghadiyaWindow[];
    nightChoghadiya: ChoghadiyaWindow[];
  };
  horas: HoraWindow[];
  preSunriseHoras: HoraWindow[];
  ayanamsa: {
    type: 'TRUE_LAHIRI';
    valueDegrees: number;
  };
}

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
];

export const NAKSHATRA_NAMES = [
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

export const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva',
  'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla',
  'Brahma', 'Indra', 'Vaidhriti'
];

export const MOVABLE_KARANAS = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti (Bhadra)'
];

export const KARANA_NAMES = [
  ...MOVABLE_KARANAS,
  'Shakuni', 'Chatushpada', 'Naga', 'Kintughna'
];

const CHOGHADIYA_LORDS: Record<string, string> = {
  Udveg: 'Sun',
  Char: 'Venus',
  Labh: 'Mercury',
  Amrit: 'Moon',
  Kaal: 'Saturn',
  Shubh: 'Jupiter',
  Rog: 'Mars'
};

// Classical Amritadi Ghati start offset (out of 60 Ghatis) per Nakshatra (Ashwini..Revati, Muhurta Chintamani)
const NAKSHATRA_AMRIT_START_GHATI = [
  42, 48, 54, 52, 38, 35, 54, 44, 56,
  54, 44, 42, 45, 44, 38, 38, 34, 38,
  44, 48, 44, 34, 34, 42, 40, 48, 54
];

// Day Choghadiya sequence per weekday lord: Sun, Mon, Tue, Wed, Thu, Fri, Sat
const DAY_CHOGHADIYA_ORDER = [
  ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg'], // Sun
  ['Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit'], // Mon
  ['Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'],   // Tue
  ['Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh'], // Wed
  ['Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh'], // Thu
  ['Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char'],   // Fri
  ['Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal']   // Sat
];

// Night Choghadiya sequence per weekday lord
const NIGHT_CHOGHADIYA_ORDER = [
  ['Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh'], // Sun
  ['Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char'],   // Mon
  ['Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal'],   // Tue
  ['Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg'], // Wed
  ['Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit'], // Thu
  ['Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog'],   // Fri
  ['Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh']   // Sat
];

// Chaldean Planetary Order (Descending speed: Saturn down to Moon)
const CHALDEAN_HORA_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
const WEEKDAY_FIRST_HORA = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

export class HighPrecisionAstroEngine {
  private static readonly DEG2RAD = Math.PI / 180.0;
  private static readonly RAD2DEG = 180.0 / Math.PI;

  public static normalizeDegrees(deg: number): number {
    let d = deg % 360.0;
    if (d < 0) d += 360.0;
    return d;
  }

  /**
   * Formats 24-hour "HH:MM" into localized 12-hour "hh:mm AM/PM"
   */
  public static format24To12Hr(hhmm: string): string {
    if (!hhmm || !hhmm.includes(':')) return '12:00 PM';
    const [hRaw, mRaw] = hhmm.split(':').map(Number);
    const h24 = Number.isFinite(hRaw) ? ((Math.floor(hRaw) % 24) + 24) % 24 : 12;
    const mins = Number.isFinite(mRaw) ? Math.max(0, Math.min(59, Math.floor(mRaw))) : 0;
    const isPm = h24 >= 12;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    return `${h12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
  }

  /**
   * Resolves current observer calendar date (YYYY-MM-DD) for a UTC offset
   */
  public static getObserverDateString(timezoneOffset: number = 5.5, nowMs: number = Date.now()): string {
    const safeTz = Number.isFinite(timezoneOffset) ? timezoneOffset : 5.5;
    const localDate = new Date(nowMs + Math.round(safeTz * 3600000));
    return localDate.toISOString().split('T')[0];
  }

  /**
   * Resolves canonical Karana name (1..60 half-tithis in a lunar month)
   */
  public static getKaranaNameByIndex(karanaNumber1To60: number): string {
    const k = Math.min(60, Math.max(1, Math.floor(karanaNumber1To60)));
    if (k === 1) return 'Kintughna';
    if (k >= 2 && k <= 57) return MOVABLE_KARANAS[(k - 2) % 7];
    if (k === 58) return 'Shakuni';
    if (k === 59) return 'Chatushpada';
    return 'Naga';
  }

  /**
   * Calculates Julian Day number from Unix timestamp (ms)
   */
  public static julianDayFromEpochMs(epochMs: number): number {
    return 2440587.5 + epochMs / 86400000.0;
  }

  /**
   * Calculates Julian Day number for Gregorian date at 0h UT + hourFraction
   */
  public static calculateJulianDay(year: number, month: number, day: number, hourFraction: number = 0): number {
    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hourFraction + b - 1524.5;
  }

  /**
   * True Chitrapaksha (Lahiri) Ayanamsa Formulation
   */
  public static getTrueLahiriAyanamsa(jd: number): number {
    const t = (jd - 2451545.0) / 36525.0;
    const precessionRate = 50.290966 / 3600.0;
    return 23.857092 + (t * 100.0 * precessionRate);
  }

  /**
   * High-accuracy Sun apparent tropical longitude (VSOP87 truncated, Meeus Chapter 25)
   */
  public static calculateSunLongitude(jd: number): { longitude: number; distanceAU: number } {
    const t = (jd - 2451545.0) / 36525.0;
    const l0 = this.normalizeDegrees(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
    const m = this.normalizeDegrees(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
    const mRad = m * this.DEG2RAD;

    const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mRad)
            + (0.019993 - 0.000101 * t) * Math.sin(2 * mRad)
            + 0.000289 * Math.sin(3 * mRad);

    const trueLong = l0 + c;
    const omega = 125.04 - 1934.136 * t;
    const apparentLong = this.normalizeDegrees(trueLong - 0.00569 - 0.00478 * Math.sin(omega * this.DEG2RAD));
    const distanceAU = 1.000001018 * (1 - 0.016708634 * Math.cos(mRad));

    return { longitude: apparentLong, distanceAU };
  }

  /**
   * High-accuracy Moon apparent tropical longitude (ELP2000-82 truncated, Meeus Chapter 47)
   */
  public static calculateMoonLongitude(jd: number): number {
    const t = (jd - 2451545.0) / 36525.0;
    const lPrime = this.normalizeDegrees(218.3164477 + 481267.88123421 * t);
    const d = this.normalizeDegrees(297.8501921 + 445267.1114034 * t) * this.DEG2RAD;
    const m = this.normalizeDegrees(357.5291092 + 35999.0502909 * t) * this.DEG2RAD;
    const mPrime = this.normalizeDegrees(134.9633964 + 477198.8675055 * t) * this.DEG2RAD;
    const f = this.normalizeDegrees(93.2720950 + 483202.0175233 * t) * this.DEG2RAD;

    const periodicTerms =
      + 6.288774 * Math.sin(mPrime)
      + 1.274027 * Math.sin(2 * d - mPrime)
      + 0.658314 * Math.sin(2 * d)
      + 0.213618 * Math.sin(2 * mPrime)
      - 0.185116 * Math.sin(m)
      - 0.114332 * Math.sin(2 * f)
      + 0.058793 * Math.sin(2 * d - 2 * mPrime)
      + 0.057066 * Math.sin(2 * d - m - mPrime)
      + 0.053322 * Math.sin(2 * d + mPrime)
      + 0.046153 * Math.sin(2 * d - m)
      - 0.034722 * Math.sin(d)
      - 0.030383 * Math.sin(m + mPrime)
      + 0.015327 * Math.sin(2 * d - 2 * f)
      - 0.012528 * Math.sin(2 * f + mPrime);

    return this.normalizeDegrees(lPrime + periodicTerms);
  }

  /**
   * Computes live Sidereal Ascendant (Lagna) and Sidereal Midheaven (MC) for any UTC epoch & coordinates
   */
  public static calculateLiveAngles(
    epochMs: number,
    latitude: number,
    longitude: number
  ): { siderealAscendant: number; siderealMidheaven: number; ayanamsa: number } {
    const jd = this.julianDayFromEpochMs(epochMs);
    const t = (jd - 2451545.0) / 36525.0;
    const ayanamsa = this.getTrueLahiriAyanamsa(jd);

    const gst = this.normalizeDegrees(
      280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - (t * t * t) / 38710000.0
    );
    const ramc = this.normalizeDegrees(gst + longitude);
    const epsRad = (23.4392911 - 0.0130042 * t) * this.DEG2RAD;
    const ramcRad = ramc * this.DEG2RAD;
    const clampedLat = Math.max(-66.0, Math.min(66.0, latitude));
    const latRad = clampedLat * this.DEG2RAD;

    const tropAsc = this.normalizeDegrees(
      Math.atan2(
        Math.cos(ramcRad),
        -(Math.sin(epsRad) * Math.tan(latRad) + Math.cos(epsRad) * Math.sin(ramcRad))
      ) * this.RAD2DEG
    );
    const tropMc = this.normalizeDegrees(
      Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad)) * this.RAD2DEG
    );

    return {
      siderealAscendant: this.normalizeDegrees(tropAsc - ayanamsa),
      siderealMidheaven: this.normalizeDegrees(tropMc - ayanamsa),
      ayanamsa
    };
  }

  /**
   * Topocentric Sunrise, Sunset and Solar Noon with standard -50' atmospheric refraction
   */
  public static calculateSolarTimes(
    year: number,
    month: number,
    day: number,
    latitude: number,
    longitude: number,
    timezoneOffset: number
  ): {
    sunriseDate: Date;
    sunsetDate: Date;
    solarNoonDate: Date;
    isPolar: boolean;
    polarCondition?: 'POLAR_DAY' | 'POLAR_NIGHT';
  } {
    const safeTz = (typeof timezoneOffset === 'number' && !isNaN(timezoneOffset)) ? timezoneOffset : 5.5;
    const jd0 = this.calculateJulianDay(year, month, day, 0.5 - safeTz / 24.0);
    const sun0 = this.calculateSunLongitude(jd0);

    const eps = (23.4392911 - 0.0130042 * ((jd0 - 2451545.0) / 36525.0)) * this.DEG2RAD;
    const sinDec = Math.sin(eps) * Math.sin(sun0.longitude * this.DEG2RAD);
    const cosDec = Math.cos(Math.asin(sinDec));
    const dec = Math.asin(sinDec);

    const h0 = -0.833333 * this.DEG2RAD;
    const latRad = Math.max(-89.5, Math.min(89.5, latitude)) * this.DEG2RAD;

    const meanLong = this.normalizeDegrees(280.46646 + 36000.76983 * ((jd0 - 2451545.0) / 36525.0));
    // Circular angle wrap in [-180°, +180°] prevents ±24h jump at Vernal Equinox (360° -> 0°)
    const eotDiffDeg = ((meanLong - sun0.longitude + 540.0) % 360.0) - 180.0;
    const eotMinutes = 4.0 * eotDiffDeg;
    const solarNoonHours = 12.0 + (safeTz * 15.0 - longitude) / 15.0 - (eotMinutes / 60.0);

    const toDate = (hours: number): Date => {
      const safeHours = (typeof hours === 'number' && !isNaN(hours)) ? hours : 12.0;
      const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      d.setUTCSeconds(Math.round((safeHours - safeTz) * 3600));
      return d;
    };

    const cosH0 = (Math.sin(h0) - Math.sin(latRad) * Math.sin(dec)) / (Math.cos(latRad) * cosDec);

    if (cosH0 > 1.0 || cosH0 < -1.0) {
      const solarNoonDate = toDate(solarNoonHours);
      return {
        sunriseDate: new Date(solarNoonDate.getTime() - 6 * 3600000),
        sunsetDate: new Date(solarNoonDate.getTime() + 6 * 3600000),
        solarNoonDate,
        isPolar: true,
        polarCondition: cosH0 < -1.0 ? 'POLAR_DAY' : 'POLAR_NIGHT'
      };
    }

    const h0Hours = Math.acos(cosH0) * this.RAD2DEG / 15.0;
    const riseHours = solarNoonHours - h0Hours;
    const setHours = solarNoonHours + h0Hours;

    return {
      sunriseDate: toDate(riseHours),
      sunsetDate: toDate(setHours),
      solarNoonDate: toDate(solarNoonHours),
      isPolar: false
    };
  }

  /**
   * Sripati Bhava Chalit (Cuspal Unequal House Trisection)
   */
  public static calculateBhavaChalitCusps(
    siderealAscendant: number,
    siderealMidheaven: number
  ): BhavaCusp[] {
    const asc = this.normalizeDegrees(siderealAscendant);
    const mc = this.normalizeDegrees(siderealMidheaven);
    const ic = this.normalizeDegrees(mc + 180.0);
    const desc = this.normalizeDegrees(asc + 180.0);

    const span1 = this.normalizeDegrees(ic - asc) / 3.0;
    const span2 = this.normalizeDegrees(desc - ic) / 3.0;
    const span3 = this.normalizeDegrees(mc - desc) / 3.0;
    const span4 = this.normalizeDegrees(asc - mc) / 3.0;

    const madhyas: number[] = [
      asc,
      this.normalizeDegrees(asc + span1),
      this.normalizeDegrees(asc + 2 * span1),
      ic,
      this.normalizeDegrees(ic + span2),
      this.normalizeDegrees(ic + 2 * span2),
      desc,
      this.normalizeDegrees(desc + span3),
      this.normalizeDegrees(desc + 2 * span3),
      mc,
      this.normalizeDegrees(mc + span4),
      this.normalizeDegrees(mc + 2 * span4)
    ];

    const cusps: BhavaCusp[] = [];
    for (let i = 0; i < 12; i++) {
      const prevIdx = (i + 11) % 12;
      const nextIdx = (i + 1) % 12;

      const mCurrent = Number.isFinite(madhyas[i]) ? madhyas[i] : (i * 30.0);
      const mPrev = Number.isFinite(madhyas[prevIdx]) ? madhyas[prevIdx] : (prevIdx * 30.0);
      const mNext = Number.isFinite(madhyas[nextIdx]) ? madhyas[nextIdx] : (nextIdx * 30.0);

      const diffPrev = this.normalizeDegrees(mCurrent - mPrev);
      const sandhiStart = this.normalizeDegrees(mPrev + diffPrev / 2.0);

      const diffNext = this.normalizeDegrees(mNext - mCurrent);
      const sandhiEnd = this.normalizeDegrees(mCurrent + diffNext / 2.0);

      const rashiIdx = Math.floor(mCurrent / 30.0) % 12;
      cusps.push({
        bhavaNumber: i + 1,
        madhyaLongitude: Number(mCurrent.toFixed(4)),
        sandhiStartLongitude: Number(sandhiStart.toFixed(4)),
        sandhiEndLongitude: Number(sandhiEnd.toFixed(4)),
        rashiIndex: rashiIdx,
        rashiName: ZODIAC_SIGNS[rashiIdx] || 'Aries'
      });
    }

    return cusps;
  }

  /**
   * Complete Day Panchanga, Kaalas, Choghadiyas and Horas Generator
   */
  public static analyzeFullDay(dateStr: string, loc: LocationCoordinates): DayAnalysisResult {
    const tz = (typeof loc?.timezoneOffset === 'number' && !isNaN(loc.timezoneOffset))
      ? loc.timezoneOffset
      : ((loc as { defaultUtcOffset?: number })?.defaultUtcOffset ?? 5.5);

    const isIsoDate = typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
    let validDate = isIsoDate ? dateStr.trim() : this.getObserverDateString(tz);
    let [y, m, d] = validDate.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12 || d < 1 || d > 31) {
      validDate = this.getObserverDateString(tz);
      [y, m, d] = validDate.split('-').map(Number);
    }

    const safeLoc: LocationCoordinates = {
      latitude: loc?.latitude ?? 28.6139,
      longitude: loc?.longitude ?? 77.2090,
      timezoneOffset: tz,
      timezone: loc?.timezone,
      cityName: loc?.cityName || 'New Delhi'
    };

    const { sunriseDate, sunsetDate, solarNoonDate, isPolar, polarCondition } = this.calculateSolarTimes(
      y, m, d, safeLoc.latitude, safeLoc.longitude, tz
    );

    // Adjacent solar days for exact Vedic Ratri-mana (sunset -> next sunrise) and pre-sunrise continuity
    const prevUtc = new Date(Date.UTC(y, m - 1, d - 1));
    const nextUtc = new Date(Date.UTC(y, m - 1, d + 1));
    const prevSolar = this.calculateSolarTimes(
      prevUtc.getUTCFullYear(), prevUtc.getUTCMonth() + 1, prevUtc.getUTCDate(),
      safeLoc.latitude, safeLoc.longitude, tz
    );
    const nextSolar = this.calculateSolarTimes(
      nextUtc.getUTCFullYear(), nextUtc.getUTCMonth() + 1, nextUtc.getUTCDate(),
      safeLoc.latitude, safeLoc.longitude, tz
    );

    const tRiseMs = isNaN(sunriseDate.getTime()) ? Date.UTC(y, m - 1, d, 0, 30) : sunriseDate.getTime();
    const tSetMs = isNaN(sunsetDate.getTime()) ? tRiseMs + 12 * 3600000 : sunsetDate.getTime();
    const tNextRiseMs = isNaN(nextSolar.sunriseDate.getTime()) ? tRiseMs + 24 * 3600000 : nextSolar.sunriseDate.getTime();
    const tPrevRiseMs = isNaN(prevSolar.sunriseDate.getTime()) ? tRiseMs - 24 * 3600000 : prevSolar.sunriseDate.getTime();
    const tPrevSetMs = isNaN(prevSolar.sunsetDate.getTime()) ? tPrevRiseMs + 12 * 3600000 : prevSolar.sunsetDate.getTime();

    const dayLengthMs = Math.max(3600000, tSetMs - tRiseMs);
    const nightLengthMs = Math.max(3600000, tNextRiseMs - tSetMs);
    const prevNightLengthMs = Math.max(3600000, tRiseMs - tPrevSetMs);
    const partMs = dayLengthMs / 8.0;

    // Exact Julian Day from Unix Epoch (immune to 00:xx UTC / Jan 0-index falsy bugs)
    const jdSunrise = this.julianDayFromEpochMs(tRiseMs);
    const ayanamsa = this.getTrueLahiriAyanamsa(jdSunrise);
    const sunTrop = this.calculateSunLongitude(jdSunrise).longitude;
    const moonTrop = this.calculateMoonLongitude(jdSunrise);

    const siderealSun = this.normalizeDegrees(sunTrop - ayanamsa);
    const siderealMoon = this.normalizeDegrees(moonTrop - ayanamsa);

    // Tithi (1..30)
    const lunarSep = this.normalizeDegrees(siderealMoon - siderealSun);
    const tithiIdx = Math.min(30, Math.floor(lunarSep / 12.0) + 1);
    const tithiFraction = (lunarSep % 12.0) / 12.0;

    // Nakshatra (1..27)
    const nakSpanDeg = 360.0 / 27.0;
    const nakshatraIdx = Math.min(27, Math.floor(siderealMoon / nakSpanDeg) + 1);
    const nakshatraFraction = (siderealMoon % nakSpanDeg) / nakSpanDeg;
    const nakPada = Math.min(4, Math.floor(nakshatraFraction * 4) + 1);

    // Nitya Yoga (1..27)
    const yogaSum = this.normalizeDegrees(siderealSun + siderealMoon);
    const yogaIdx = Math.min(27, Math.floor(yogaSum / nakSpanDeg) + 1);
    const yogaFraction = (yogaSum % nakSpanDeg) / nakSpanDeg;

    // Karana (1..60 half-tithis in lunar month -> true 4 Sthira + 7x8 Chara cycle)
    const karanaIdx = Math.min(60, Math.floor(lunarSep / 6.0) + 1);
    const karanaFraction = (lunarSep % 6.0) / 6.0;
    const karanaName = this.getKaranaNameByIndex(karanaIdx);

    // Vaara (Weekday in observer local calendar at Sunrise)
    const localDayOfWeek = ((new Date(tRiseMs + Math.round(tz * 3600000)).getUTCDay()) % 7 + 7) % 7;
    const prevLocalDayOfWeek = (localDayOfWeek + 6) % 7;

    const formatLocal = (ms: number): string => {
      if (!Number.isFinite(ms)) return '12:00';
      try {
        const local = new Date(ms + Math.round(tz * 3600000));
        return local.toISOString().substring(11, 16);
      } catch {
        return '12:00';
      }
    };

    const makeWindow = (
      name: string,
      startMs: number,
      endMs: number,
      nature: 'Auspicious' | 'Inauspicious' | 'Neutral',
      scoreImpact: number
    ): KaalaWindow => {
      const s = Number.isFinite(startMs) ? startMs : tRiseMs;
      const e = Number.isFinite(endMs) ? endMs : s + 3600000;
      const s24 = formatLocal(s);
      const e24 = formatLocal(e);
      return {
        name,
        startMs: s,
        endMs: e,
        startIso: new Date(s).toISOString(),
        endIso: new Date(e).toISOString(),
        startLocal: s24,
        endLocal: e24,
        start12Hr: this.format24To12Hr(s24),
        end12Hr: this.format24To12Hr(e24),
        nature,
        scoreImpact
      };
    };

    const rahuSegments = [8, 2, 7, 5, 6, 4, 3]; // Sun -> Sat
    const gulikaSegments = [7, 6, 5, 4, 3, 2, 1];
    const yamaSegments = [5, 4, 3, 2, 1, 7, 6];

    const rSeg = rahuSegments[localDayOfWeek] || 8;
    const gSeg = gulikaSegments[localDayOfWeek] || 7;
    const ySeg = yamaSegments[localDayOfWeek] || 5;

    const rahuKaal = makeWindow('Rahu Kaal', tRiseMs + (rSeg - 1) * partMs, tRiseMs + rSeg * partMs, 'Inauspicious', -30);
    const gulikaKaal = makeWindow('Gulika Kaal', tRiseMs + (gSeg - 1) * partMs, tRiseMs + gSeg * partMs, 'Neutral', -10);
    const yamaghanta = makeWindow('Yamaghanta', tRiseMs + (ySeg - 1) * partMs, tRiseMs + ySeg * partMs, 'Inauspicious', -20);

    // Abhijit Muhurta (8th of 15 diurnal Muhurtas; cancelled on Wednesdays per Muhurta Chintamani)
    const mSpanMs = dayLengthMs / 15.0;
    const tNoonMs = isNaN(solarNoonDate.getTime()) ? tRiseMs + dayLengthMs / 2.0 : solarNoonDate.getTime();
    const isAbhijitValid = localDayOfWeek !== 3;
    const abhijit = {
      ...makeWindow(
        'Abhijit Muhurta',
        tNoonMs - mSpanMs / 2.0,
        tNoonMs + mSpanMs / 2.0,
        isAbhijitValid ? 'Auspicious' : 'Inauspicious',
        isAbhijitValid ? 25 : 0
      ),
      isValidOnThisDay: isAbhijitValid
    };

    // Brahma Muhurta (96 mins to 48 mins before Sunrise)
    const brahma = makeWindow('Brahma Muhurta', tRiseMs - 96 * 60000, tRiseMs - 48 * 60000, 'Auspicious', 20);

    // Godhuli Kaal (12 mins before to 12 mins after Sunset)
    const godhuli = makeWindow('Godhuli Kaal', tSetMs - 12 * 60000, tSetMs + 12 * 60000, 'Auspicious', 15);

    // Vijaya Muhurta (11th diurnal Muhurta)
    const vijaya = makeWindow('Vijaya Muhurta', tRiseMs + 10 * mSpanMs, tRiseMs + 11 * mSpanMs, 'Auspicious', 20);

    // Classical Lunar Nakshatra Amrit Kaal (4 Ghatis = 4/60 of mean ~24.3h lunar star transit)
    const meanNakDurationMs = 24.32 * 3600000;
    const nakEntryMs = tRiseMs - nakshatraFraction * meanNakDurationMs;
    const amritGhatiOffset = NAKSHATRA_AMRIT_START_GHATI[(nakshatraIdx - 1) % 27] ?? 42;
    let amritStartMs = nakEntryMs + (amritGhatiOffset / 60.0) * meanNakDurationMs;
    const amritDurationMs = (4.0 / 60.0) * meanNakDurationMs; // ~97 minutes
    // Keep within the current solar day cycle if entry wrapped prior to sunrise
    if (amritStartMs + amritDurationMs < tRiseMs) {
      const nextNakIdx = nakshatraIdx % 27;
      const nextOffset = NAKSHATRA_AMRIT_START_GHATI[nextNakIdx] ?? 42;
      amritStartMs = (nakEntryMs + meanNakDurationMs) + (nextOffset / 60.0) * meanNakDurationMs;
    }
    const amrit = makeWindow('Amrit Kaal', amritStartMs, amritStartMs + amritDurationMs, 'Auspicious', 18);

    const buildChoghadiyaSet = (order: string[], baseMs: number, stepMs: number): ChoghadiyaWindow[] =>
      order.map((name, idx) => {
        const sMs = baseMs + idx * stepMs;
        const eMs = sMs + stepMs;
        const isGood = ['Amrit', 'Shubh', 'Labh', 'Char'].includes(name);
        const s24 = formatLocal(sMs);
        const e24 = formatLocal(eMs);
        return {
          name,
          vedicLord: CHOGHADIYA_LORDS[name] || 'Jupiter',
          nature: name as ChoghadiyaWindow['nature'],
          isAuspicious: isGood,
          startMs: sMs,
          endMs: eMs,
          startLocal: s24,
          endLocal: e24,
          start12Hr: this.format24To12Hr(s24),
          end12Hr: this.format24To12Hr(e24),
          scoreImpact: name === 'Amrit' ? 25 : name === 'Shubh' ? 20 : name === 'Labh' ? 15 : name === 'Char' ? 8 : -20
        };
      });

    const preSunriseChoghadiya = buildChoghadiyaSet(
      NIGHT_CHOGHADIYA_ORDER[prevLocalDayOfWeek] || NIGHT_CHOGHADIYA_ORDER[0],
      tPrevSetMs,
      prevNightLengthMs / 8.0
    );
    const dayChogList = buildChoghadiyaSet(
      DAY_CHOGHADIYA_ORDER[localDayOfWeek] || DAY_CHOGHADIYA_ORDER[0],
      tRiseMs,
      partMs
    );
    const nightChogList = buildChoghadiyaSet(
      NIGHT_CHOGHADIYA_ORDER[localDayOfWeek] || NIGHT_CHOGHADIYA_ORDER[0],
      tSetMs,
      nightLengthMs / 8.0
    );

    const buildHorasForDay = (weekdayIdx: number, riseMs: number, setMs: number, dLenMs: number, nLenMs: number): HoraWindow[] => {
      const dHoraMs = dLenMs / 12.0;
      const nHoraMs = nLenMs / 12.0;
      const fLord = WEEKDAY_FIRST_HORA[weekdayIdx] || 'Sun';
      const sIdx = Math.max(0, CHALDEAN_HORA_ORDER.indexOf(fLord));
      const list: HoraWindow[] = [];
      for (let h = 0; h < 24; h++) {
        const isDay = h < 12;
        const sMs = isDay ? riseMs + h * dHoraMs : setMs + (h - 12) * nHoraMs;
        const eMs = sMs + (isDay ? dHoraMs : nHoraMs);
        const planet = CHALDEAN_HORA_ORDER[(sIdx + h) % 7];
        const s24 = formatLocal(sMs);
        const e24 = formatLocal(eMs);
        list.push({
          horaNumber: h + 1,
          rulingPlanet: planet,
          startMs: sMs,
          endMs: eMs,
          startLocal: s24,
          endLocal: e24,
          start12Hr: this.format24To12Hr(s24),
          end12Hr: this.format24To12Hr(e24),
          isAuspicious: ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(planet)
        });
      }
      return list;
    };

    const firstLord = WEEKDAY_FIRST_HORA[localDayOfWeek] || 'Sun';
    const horas = buildHorasForDay(localDayOfWeek, tRiseMs, tSetMs, dayLengthMs, nightLengthMs);
    const preSunriseHoras = buildHorasForDay(
      prevLocalDayOfWeek,
      tPrevRiseMs,
      tPrevSetMs,
      Math.max(3600000, tPrevSetMs - tPrevRiseMs),
      prevNightLengthMs
    ).slice(12); // Nocturnal 12 Horas leading into today's sunrise

    const sunriseStr = formatLocal(tRiseMs);
    const sunsetStr = formatLocal(tSetMs);
    const noonStr = formatLocal(tNoonMs);

    return {
      date: validDate,
      location: safeLoc,
      solarMetrics: {
        sunrise: sunriseStr,
        sunset: sunsetStr,
        solarNoon: noonStr,
        sunrise12Hr: this.format24To12Hr(sunriseStr),
        sunset12Hr: this.format24To12Hr(sunsetStr),
        solarNoon12Hr: this.format24To12Hr(noonStr),
        sunriseMs: tRiseMs,
        sunsetMs: tSetMs,
        nextSunriseMs: tNextRiseMs,
        dayLengthMinutes: Math.round(dayLengthMs / 60000),
        nightLengthMinutes: Math.round(nightLengthMs / 60000),
        isPolar,
        polarCondition
      },
      sunriseLocal: sunriseStr,
      sunsetLocal: sunsetStr,
      dayOfWeekIndex: localDayOfWeek,
      siderealSunLongitude: Number(siderealSun.toFixed(4)),
      siderealMoonLongitude: Number(siderealMoon.toFixed(4)),
      panchanga: {
        tithi: {
          index: tithiIdx,
          name: TITHI_NAMES[tithiIdx - 1] || 'Pratipada',
          paksha: tithiIdx <= 15 ? 'Shukla' : 'Krishna',
          fractionElapsed: Number(tithiFraction.toFixed(4)),
          degreeInSpan: Number((tithiFraction * 12.0).toFixed(2))
        },
        nakshatra: {
          index: nakshatraIdx,
          name: NAKSHATRA_NAMES[nakshatraIdx - 1] || 'Ashwini',
          lord: NAKSHATRA_LORDS[nakshatraIdx - 1] || 'Ketu',
          pada: nakPada,
          fractionElapsed: Number(nakshatraFraction.toFixed(4)),
          degreeInSpan: Number((nakshatraFraction * nakSpanDeg).toFixed(2))
        },
        yoga: {
          index: yogaIdx,
          name: YOGA_NAMES[yogaIdx - 1] || 'Vishkambha',
          fractionElapsed: Number(yogaFraction.toFixed(4)),
          degreeInSpan: Number((yogaFraction * nakSpanDeg).toFixed(2))
        },
        karana: {
          index: karanaIdx,
          name: karanaName,
          isVishtiBhadra: karanaName.includes('Vishti'),
          fractionElapsed: Number(karanaFraction.toFixed(4)),
          degreeInSpan: Number((karanaFraction * 6.0).toFixed(2))
        },
        vaara: {
          dayIndex: localDayOfWeek,
          name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][localDayOfWeek],
          lord: firstLord
        }
      },
      fixedKaalas: {
        rahuKaal,
        gulikaKaal,
        yamaghanta,
        abhijitMuhurta: abhijit,
        brahmaMuhurta: brahma,
        godhuliKaal: godhuli,
        vijayaMuhurta: vijaya,
        amritKaal: amrit
      },
      kaalaTimings: {
        rahuKaalam: { start: rahuKaal.startLocal, end: rahuKaal.endLocal, start12Hr: rahuKaal.start12Hr, end12Hr: rahuKaal.end12Hr },
        gulikaKaalam: { start: gulikaKaal.startLocal, end: gulikaKaal.endLocal, start12Hr: gulikaKaal.start12Hr, end12Hr: gulikaKaal.end12Hr },
        yamaghantam: { start: yamaghanta.startLocal, end: yamaghanta.endLocal, start12Hr: yamaghanta.start12Hr, end12Hr: yamaghanta.end12Hr },
        abhijitMuhurta: { start: abhijit.startLocal, end: abhijit.endLocal, start12Hr: abhijit.start12Hr, end12Hr: abhijit.end12Hr },
        brahmaMuhurta: { start: brahma.startLocal, end: brahma.endLocal, start12Hr: brahma.start12Hr, end12Hr: brahma.end12Hr },
        godhuliBela: { start: godhuli.startLocal, end: godhuli.endLocal, start12Hr: godhuli.start12Hr, end12Hr: godhuli.end12Hr },
        vijayaMuhurta: { start: vijaya.startLocal, end: vijaya.endLocal, start12Hr: vijaya.start12Hr, end12Hr: vijaya.end12Hr },
        amritKaal: { start: amrit.startLocal, end: amrit.endLocal, start12Hr: amrit.start12Hr, end12Hr: amrit.end12Hr }
      },
      choghadiya: {
        preSunriseChoghadiya,
        dayChoghadiya: dayChogList,
        nightChoghadiya: nightChogList
      },
      horas,
      preSunriseHoras,
      ayanamsa: {
        type: 'TRUE_LAHIRI',
        valueDegrees: Number(ayanamsa.toFixed(6))
      }
    };
  }
}
