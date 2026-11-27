/**
 * @license
 * MIT License
 *
 * Unified High-Precision Astronomical & Vedic Panchang Engine
 * Powered by the single shared `moonSun()` + `solarTimes()` core (`planetaryEphemeris.ts`):
 * - Meeus VSOP87 Apparent Sun + Full 60-Term Meeus Ch. 47 Table 47.A Moon (with ΔT, E/E², A1/A2/L'-F, IAU Nutation)
 * - 2-Pass Right-Ascension Equation of Time Sunrise/Sunset with -50' refraction + optional elevation dip
 * - Strict Date, Coordinate & IANA Timezone Validation (zero silent fallback to New Delhi or UTC+5.5)
 * - Exact Root-Solved Tithi, Nakshatra, Yoga & Karana End Times + Udaya Tithi + Kshaya/Vriddhi Detection
 * - Lunar Masa (Amanta & Purnimanta) with Astronomical Adhika & Kshaya Masa Detection
 * - Exact Root-Solved Varjyam (Tyajya), Amrit Kalam, Vishti (Bhadra) Windows, Panchak & Festival Rules
 */

import { CalculationInputError, validGregorianDate } from './calculationValidation';
import { calculateGAST, moonSun, norm360, solarTimes } from './planetaryEphemeris';

export type LunarMonthSystem = 'AMANTA' | 'PURNIMANTA';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  cityName?: string;
  timezone?: string;       // IANA timezone e.g. 'Asia/Kolkata', 'America/New_York'
  timezoneOffset: number;  // Explicit UTC offset in hours e.g. +5.5 (auto-derived when valid IANA timezone is supplied)
  elevationMeters?: number; // Optional observer elevation above sea level (meters)
}

export type StrictLocationInput =
  | LocationCoordinates
  | (Omit<LocationCoordinates, 'timezoneOffset'> & { timezone: string; timezoneOffset?: number });

export interface DayAnalysisOptions {
  lunarMonthSystem?: LunarMonthSystem;
  elevationMeters?: number;
}

export interface PanchangaLimbResult {
  index: number;
  name: string;
  fractionElapsed: number; // 0.0 - 1.0 at sunrise
  degreeInSpan: number;
  endMs: number;
  endIso: string;
  endLocal: string;
  end12Hr: string;
  endsAfterNextSunrise: boolean;
}

export interface TithiSpanEntry {
  index: number; // 1..30
  name: string;
  paksha: 'Shukla' | 'Krishna';
  startMs: number;
  endMs: number;
  start12Hr: string;
  end12Hr: string;
  classification: 'UDAYA' | 'VRIDDHI' | 'KSHAYA' | 'SUBSEQUENT';
}

export interface LunarMasaInfo {
  activeSystem: LunarMonthSystem;
  amantaIndex: number;      // 0..11 (Chaitra..Phalguna)
  amantaName: string;
  purnimantaIndex: number;  // 0..11
  purnimantaName: string;
  displayName: string;      // Includes "Adhika " or "Kshaya " prefix when applicable
  isAdhikaMasa: boolean;
  isKshayaMasa: boolean;
  prevNewMoonIso: string;
  nextNewMoonIso: string;
}

export interface FestivalObservance {
  id: string;
  name: string;
  ruleSummary: string;
  observanceWindow12Hr: string;
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
  madhyaLongitude: number;
  sandhiStartLongitude: number;
  sandhiEndLongitude: number;
  rashiIndex: number;
  rashiName: string;
}

export interface LocalDayUtcBounds {
  date: string;
  timezone?: string;
  startUtcMs: number;
  endUtcMs: number;
  startIso: string;
  endIso: string;
  elapsedSeconds: number;
  elapsedMinutes: number;
  elapsedHours: number;
  sampleCount15Min: number;
  startOffsetHours: number;
  endOffsetHours: number;
  startOffsetLabel: string;
  endOffsetLabel: string;
  isDstTransition: boolean;
}

export interface WallTimeParts {
  dateStr: string;
  hhmm24: string;
  hhmm12: string;
  hour24: number;
  minute: number;
  second: number;
  minutesOfDay: number;
  offsetMinutes: number;
  offsetHours: number;
  offsetLabel: string;
}

export interface DayAnalysisResult {
  date: string;
  location: LocationCoordinates;
  localDayBounds: LocalDayUtcBounds;
  inputNotes: string[];
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
    elevationMeters: number;
  };
  sunriseLocal?: string;
  sunsetLocal?: string;
  dayOfWeekIndex: number;
  siderealSunLongitude: number;
  siderealMoonLongitude: number;
  lunarMasa: LunarMasaInfo;
  panchanga: {
    tithi: PanchangaLimbResult & {
      paksha: 'Shukla' | 'Krishna';
      udayaTithiIndex: number;
      udayaTithiName: string;
      tithiAnomaly: 'NORMAL' | 'VRIDDHI' | 'KSHAYA';
      kshayaTithiName?: string;
      dayTithiSpans: TithiSpanEntry[];
    };
    nakshatra: PanchangaLimbResult & {
      lord: string;
      pada: number;
      startMs: number;
      start12Hr: string;
    };
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
    varjyam: KaalaWindow;
    pradoshKaal: KaalaWindow;
  };
  vishtiWindows: KaalaWindow[];
  panchak: {
    isActive: boolean;
    window: KaalaWindow | null;
    nakshatraName: string | null;
  };
  festivalObservances: {
    ruleSetVersion: 'drik-festival-rules-v1';
    approvalStatus: 'UNAPPROVED_PENDING_JYOTISHI_SIGN_OFF';
    matched: FestivalObservance[];
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
    varjyam: { start: string; end: string; start12Hr: string; end12Hr: string };
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

export const MASA_NAMES = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha',
  'Shravana', 'Bhadrapada', 'Ashwin', 'Kartika',
  'Margashirsha', 'Pausha', 'Magha', 'Phalguna'
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

// Classical Varjyam (Vishaghati / Tyajya) start Ghati (out of 60 Ghatis of actual Nakshatra span) per Muhurta Chintamani
const NAKSHATRA_VARJYAM_START_GHATI = [
  50, 24, 30, 40, 14, 21, 30, 20, 32,
  30, 20, 18, 21, 20, 14, 14, 10, 14,
  56, 24, 20, 10, 10, 18, 16, 24, 30
];

// Classical Amritadi Ghati start offset (out of 60 Ghatis of actual Nakshatra span) per Muhurta Chintamani
const NAKSHATRA_AMRIT_START_GHATI = [
  42, 48, 54, 52, 38, 35, 54, 44, 56,
  54, 44, 42, 45, 44, 38, 38, 34, 38,
  44, 48, 44, 34, 34, 42, 40, 48, 54
];

const DAY_CHOGHADIYA_ORDER = [
  ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg'],
  ['Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit'],
  ['Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'],
  ['Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh'],
  ['Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh'],
  ['Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char'],
  ['Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal']
];

const NIGHT_CHOGHADIYA_ORDER = [
  ['Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh'],
  ['Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char'],
  ['Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal'],
  ['Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg'],
  ['Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit'],
  ['Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog'],
  ['Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh']
];

const CHALDEAN_HORA_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
const WEEKDAY_FIRST_HORA = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

function signedAngleDiff(targetDeg: number, currentDeg: number): number {
  return ((targetDeg - currentDeg + 540.0) % 360.0) - 180.0;
}

export class HighPrecisionAstroEngine {
  private static readonly DEG2RAD = Math.PI / 180.0;
  private static readonly RAD2DEG = 180.0 / Math.PI;
  private static readonly DTF_CACHE = new Map<string, Intl.DateTimeFormat>();

  public static normalizeDegrees(deg: number): number {
    return norm360(deg);
  }

  private static civilUtcMs(
    year: number,
    month: number,
    day: number,
    hour: number = 0,
    minute: number = 0,
    second: number = 0
  ): number {
    const d = new Date(0);
    d.setUTCFullYear(year, month - 1, day);
    d.setUTCHours(hour, minute, second, 0);
    return d.getTime();
  }

  public static isValidIanaTimezone(timezone?: string): boolean {
    if (!timezone || timezone === 'UTC_OFFSET' || timezone === 'Local') return false;
    if (this.DTF_CACHE.has(timezone)) return true;
    try {
      const dtf = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      });
      this.DTF_CACHE.set(timezone, dtf);
      return true;
    } catch {
      return false;
    }
  }

  public static formatUtcOffsetLabel(offsetMinutes: number): string {
    if (!Number.isFinite(offsetMinutes) || offsetMinutes === 0) return 'GMT+0';
    const sign = offsetMinutes < 0 ? '-' : '+';
    const abs = Math.abs(Math.round(offsetMinutes));
    const hrs = Math.floor(abs / 60);
    const mins = abs % 60;
    return mins === 0
      ? `GMT${sign}${hrs}`
      : `GMT${sign}${hrs}:${mins.toString().padStart(2, '0')}`;
  }

  public static getWallTimeInZone(
    epochMs: number,
    timezone?: string,
    fallbackOffset: number = 5.5,
    roundToMinute: boolean = false
  ): WallTimeParts {
    const safeMs = Number.isFinite(epochMs) ? epochMs : Date.now();
    const snappedMs = roundToMinute
      ? Math.round(safeMs / 60000) * 60000
      : Math.round(safeMs / 1000) * 1000;

    if (timezone && this.isValidIanaTimezone(timezone)) {
      const dtf = this.DTF_CACHE.get(timezone)!;
      const parts = dtf.formatToParts(new Date(snappedMs));
      let yStr = '2026', mStr = '01', dStr = '01', hStr = '00', minStr = '00', sStr = '00';
      for (const p of parts) {
        if (p.type === 'year') yStr = p.value;
        else if (p.type === 'month') mStr = p.value;
        else if (p.type === 'day') dStr = p.value;
        else if (p.type === 'hour') hStr = p.value === '24' ? '00' : p.value;
        else if (p.type === 'minute') minStr = p.value;
        else if (p.type === 'second') sStr = p.value;
      }
      const yn = Number(yStr), mn = Number(mStr), dn = Number(dStr);
      const hn = Number(hStr), minn = Number(minStr), sn = Number(sStr);
      const naiveLocalMs = this.civilUtcMs(yn, mn, dn, hn, minn, sn);
      const offsetMinutes = Math.round((naiveLocalMs - snappedMs) / 60000);
      const hhmm24 = `${hStr.padStart(2, '0')}:${minStr.padStart(2, '0')}`;
      return {
        dateStr: `${yStr.padStart(4, '0')}-${mStr.padStart(2, '0')}-${dStr.padStart(2, '0')}`,
        hhmm24,
        hhmm12: this.format24To12Hr(hhmm24),
        hour24: hn,
        minute: minn,
        second: sn,
        minutesOfDay: hn * 60 + minn,
        offsetMinutes,
        offsetHours: offsetMinutes / 60.0,
        offsetLabel: this.formatUtcOffsetLabel(offsetMinutes)
      };
    }

    const safeTz = Number.isFinite(fallbackOffset) ? fallbackOffset : 5.5;
    const offsetMinutes = Math.round(safeTz * 60);
    const shifted = new Date(snappedMs + offsetMinutes * 60000);
    const yn = shifted.getUTCFullYear();
    const mn = shifted.getUTCMonth() + 1;
    const dn = shifted.getUTCDate();
    const hn = shifted.getUTCHours();
    const minn = shifted.getUTCMinutes();
    const sn = shifted.getUTCSeconds();
    const hhmm24 = `${hn.toString().padStart(2, '0')}:${minn.toString().padStart(2, '0')}`;
    return {
      dateStr: `${yn.toString().padStart(4, '0')}-${mn.toString().padStart(2, '0')}-${dn.toString().padStart(2, '0')}`,
      hhmm24,
      hhmm12: this.format24To12Hr(hhmm24),
      hour24: hn,
      minute: minn,
      second: sn,
      minutesOfDay: hn * 60 + minn,
      offsetMinutes,
      offsetHours: offsetMinutes / 60.0,
      offsetLabel: this.formatUtcOffsetLabel(offsetMinutes)
    };
  }

  public static resolveStartOfLocalDateUtcMs(
    year: number,
    month: number,
    day: number,
    timezone?: string,
    fallbackOffset: number = 5.5
  ): number {
    const targetNaiveMs = this.civilUtcMs(year, month, day, 0, 0, 0);
    const safeTz = Number.isFinite(fallbackOffset) ? fallbackOffset : 5.5;
    if (!timezone || !this.isValidIanaTimezone(timezone)) {
      return targetNaiveMs - Math.round(safeTz * 3600000);
    }

    const targetDateKey = year * 10000 + month * 100 + day;
    const dateKeyAt = (ms: number): number => {
      const w = this.getWallTimeInZone(ms, timezone, safeTz, false);
      const [wy, wm, wd] = w.dateStr.split('-').map(Number);
      return wy * 10000 + wm * 100 + wd;
    };

    let guessMs = targetNaiveMs - Math.round(safeTz * 3600000);
    for (let i = 0; i < 4; i++) {
      const w = this.getWallTimeInZone(guessMs, timezone, safeTz, false);
      const [wy, wm, wd] = w.dateStr.split('-').map(Number);
      const shownNaiveMs = this.civilUtcMs(wy, wm, wd, w.hour24, w.minute, w.second);
      const errMs = shownNaiveMs - targetNaiveMs;
      if (errMs === 0) {
        if (dateKeyAt(guessMs - 3600000) < targetDateKey && dateKeyAt(guessMs - 1000) < targetDateKey) {
          return guessMs;
        }
        guessMs -= 3600000;
      } else {
        guessMs -= errMs;
      }
    }

    const anchor = targetNaiveMs - Math.round(safeTz * 3600000);
    let lo = anchor - 18 * 3600000;
    let hi = anchor + 18 * 3600000;
    for (let h = -18; h <= 18; h++) {
      const probe = anchor + h * 3600000;
      if (dateKeyAt(probe) < targetDateKey) {
        lo = probe;
      } else {
        hi = probe;
        break;
      }
    }
    while (hi - lo > 1000) {
      const mid = Math.floor((lo + hi) / 2000) * 1000;
      if (mid <= lo) break;
      if (dateKeyAt(mid) < targetDateKey) lo = mid;
      else hi = mid;
    }
    return Math.round(hi / 1000) * 1000;
  }

  public static getLocalDayUtcBounds(
    dateStr: string,
    timezone?: string,
    fallbackOffset: number = 5.5
  ): LocalDayUtcBounds {
    const trimmed = typeof dateStr === 'string' ? dateStr.trim() : '';
    if (!validGregorianDate(trimmed)) {
      throw new CalculationInputError('INVALID_DATE', `Invalid Gregorian calendar date: "${dateStr}".`);
    }
    const safeTz = Number.isFinite(fallbackOffset) ? fallbackOffset : 0;
    const [y, m, d] = trimmed.split('-').map(Number);
    const nextDayUtc = new Date(this.civilUtcMs(y, m, d + 1, 0, 0, 0));
    const ny = nextDayUtc.getUTCFullYear();
    const nm = nextDayUtc.getUTCMonth() + 1;
    const nd = nextDayUtc.getUTCDate();

    const startUtcMs = this.resolveStartOfLocalDateUtcMs(y, m, d, timezone, safeTz);
    const endUtcMs = this.resolveStartOfLocalDateUtcMs(ny, nm, nd, timezone, safeTz);
    const spanMs = Math.max(3600000, endUtcMs - startUtcMs);
    const elapsedSeconds = Math.round(spanMs / 1000);
    const elapsedMinutes = Math.round(spanMs / 60000);
    const elapsedHours = Number((elapsedSeconds / 3600.0).toFixed(2));
    const sampleCount15Min = Math.max(1, Math.round(spanMs / 900000));

    const startWall = this.getWallTimeInZone(startUtcMs, timezone, safeTz, false);
    const endWall = this.getWallTimeInZone(endUtcMs - 60000, timezone, safeTz, false);

    return {
      date: trimmed,
      timezone: timezone && this.isValidIanaTimezone(timezone) ? timezone : undefined,
      startUtcMs,
      endUtcMs,
      startIso: new Date(startUtcMs).toISOString(),
      endIso: new Date(endUtcMs).toISOString(),
      elapsedSeconds,
      elapsedMinutes,
      elapsedHours,
      sampleCount15Min,
      startOffsetHours: startWall.offsetHours,
      endOffsetHours: endWall.offsetHours,
      startOffsetLabel: startWall.offsetLabel,
      endOffsetLabel: endWall.offsetLabel,
      isDstTransition: startWall.offsetMinutes !== endWall.offsetMinutes || elapsedSeconds !== 86400
    };
  }

  public static resolveLocalMinutesToUtcMs(
    dateStr: string,
    minutesOfDay: number,
    timezone?: string,
    fallbackOffset: number = 5.5
  ): number {
    const safeMins = Math.max(0, Math.min(1439, Math.floor(minutesOfDay)));
    const bounds = this.getLocalDayUtcBounds(dateStr, timezone, fallbackOffset);
    const [y, m, d] = bounds.date.split('-').map(Number);
    const h = Math.floor(safeMins / 60);
    const min = safeMins % 60;
    const naiveMs = this.civilUtcMs(y, m, d, h, min, 0);

    if (!bounds.timezone) {
      return naiveMs - Math.round((Number.isFinite(fallbackOffset) ? fallbackOffset : 5.5) * 3600000);
    }

    const candidateOffsets = Array.from(new Set([bounds.startOffsetHours, bounds.endOffsetHours]));
    for (const offHrs of candidateOffsets) {
      const candMs = naiveMs - Math.round(offHrs * 3600000);
      if (candMs >= bounds.startUtcMs && candMs < bounds.endUtcMs) {
        const w = this.getWallTimeInZone(candMs, bounds.timezone, fallbackOffset, false);
        if (w.dateStr === bounds.date && w.hour24 === h && w.minute === min) {
          return candMs;
        }
      }
    }

    const snapped = naiveMs - Math.round(bounds.endOffsetHours * 3600000);
    return Math.min(bounds.endUtcMs - 60000, Math.max(bounds.startUtcMs, snapped));
  }

  public static format24To12Hr(hhmm: string): string {
    if (!hhmm || !hhmm.includes(':')) return '12:00 PM';
    const [hRaw, mRaw] = hhmm.split(':').map(Number);
    const h24 = Number.isFinite(hRaw) ? ((Math.floor(hRaw) % 24) + 24) % 24 : 12;
    const mins = Number.isFinite(mRaw) ? Math.max(0, Math.min(59, Math.floor(mRaw))) : 0;
    const isPm = h24 >= 12;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    return `${h12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
  }

  public static getObserverDateString(
    timezoneOffset: number = 5.5,
    nowMs: number = Date.now(),
    timezone?: string
  ): string {
    return this.getWallTimeInZone(nowMs, timezone, timezoneOffset, false).dateStr;
  }

  public static getKaranaNameByIndex(karanaNumber1To60: number): string {
    const k = Math.min(60, Math.max(1, Math.floor(karanaNumber1To60)));
    if (k === 1) return 'Kintughna';
    if (k >= 2 && k <= 57) return MOVABLE_KARANAS[(k - 2) % 7];
    if (k === 58) return 'Shakuni';
    if (k === 59) return 'Chatushpada';
    return 'Naga';
  }

  public static julianDayFromEpochMs(epochMs: number): number {
    return 2440587.5 + epochMs / 86400000.0;
  }

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

  public static getTrueLahiriAyanamsa(jd: number): number {
    const t = (jd - 2451545.0) / 36525.0;
    const precessionRate = 50.290966 / 3600.0;
    return 23.857092 + (t * 100.0 * precessionRate);
  }

  /**
   * Unified Sun apparent tropical longitude (delegates directly to `moonSun(jd)` in `planetaryEphemeris.ts`)
   */
  public static calculateSunLongitude(jd: number): { longitude: number; distanceAU: number } {
    const ms = moonSun(jd);
    return { longitude: ms.sunTropicalDeg, distanceAU: ms.sunDistanceAU };
  }

  /**
   * Unified 60-term Meeus Ch. 47 Moon apparent tropical longitude (delegates directly to `moonSun(jd)`)
   */
  public static calculateMoonLongitude(jd: number): number {
    return moonSun(jd).moonTropicalDeg;
  }

  /**
   * Sidereal Sun & Moon longitudes at any UTC millisecond instant using the unified core
   */
  public static siderealSunMoonAtMs(epochMs: number): { siderealSun: number; siderealMoon: number; ayanamsa: number } {
    const jdUT = this.julianDayFromEpochMs(epochMs);
    const ms = moonSun(jdUT);
    const ayanamsa = this.getTrueLahiriAyanamsa(jdUT);
    return {
      siderealSun: norm360(ms.sunTropicalDeg - ayanamsa),
      siderealMoon: norm360(ms.moonTropicalDeg - ayanamsa),
      ayanamsa,
    };
  }

  /**
   * Fast quasi-Newton + bracketed bisection solver for monotone forward angular crossings (converges < 0.5s in ~5 calls)
   */
  public static solveForwardCrossingMs(
    startMs: number,
    targetDeg: number,
    angleAtMs: (ms: number) => number,
    meanRateDegPerDay: number
  ): number {
    const target = norm360(targetDeg);
    const startAngle = angleAtMs(startMs);
    let remDeg = norm360(target - startAngle);
    if (remDeg < 1e-6) remDeg = 360.0;

    let t = startMs + (remDeg / meanRateDegPerDay) * 86400000.0;
    for (let iter = 0; iter < 5; iter++) {
      const ang = angleAtMs(t);
      const err = signedAngleDiff(target, ang);
      if (Math.abs(err) < 1e-5) break;
      const dtProbe = 600000; // 10 min derivative probe
      const rateDegPerMs = norm360(angleAtMs(t + dtProbe) - ang) / dtProbe;
      const safeRate = rateDegPerMs > 1e-11 ? rateDegPerMs : meanRateDegPerDay / 86400000.0;
      t += err / safeRate;
    }
    return Math.max(startMs + 1000, Math.round(t / 1000) * 1000);
  }

  /**
   * Fast quasi-Newton solver for monotone backward angular crossings (finds entry instant <= startMs)
   */
  public static solveBackwardCrossingMs(
    startMs: number,
    targetDeg: number,
    angleAtMs: (ms: number) => number,
    meanRateDegPerDay: number
  ): number {
    const target = norm360(targetDeg);
    const startAngle = angleAtMs(startMs);
    const elapsedDeg = norm360(startAngle - target);
    if (elapsedDeg < 1e-6) return Math.round(startMs / 1000) * 1000;

    let t = startMs - (elapsedDeg / meanRateDegPerDay) * 86400000.0;
    for (let iter = 0; iter < 5; iter++) {
      const ang = angleAtMs(t);
      const err = signedAngleDiff(target, ang);
      if (Math.abs(err) < 1e-5) break;
      const dtProbe = 600000;
      const rateDegPerMs = norm360(angleAtMs(t + dtProbe) - ang) / dtProbe;
      const safeRate = rateDegPerMs > 1e-11 ? rateDegPerMs : meanRateDegPerDay / 86400000.0;
      t += err / safeRate;
    }
    return Math.min(startMs, Math.round(t / 1000) * 1000);
  }

  public static calculateLiveAngles(
    epochMs: number,
    latitude: number,
    longitude: number
  ): { siderealAscendant: number; siderealMidheaven: number; ayanamsa: number } {
    const jd = this.julianDayFromEpochMs(epochMs);
    const ayanamsa = this.getTrueLahiriAyanamsa(jd);
    const { gastDeg, trueObliquityDeg } = calculateGAST(jd);
    const epsRad = trueObliquityDeg * this.DEG2RAD;
    const ramc = norm360(gastDeg + longitude);
    const ramcRad = ramc * this.DEG2RAD;
    const clampedLat = Math.max(-89.9999, Math.min(89.9999, latitude));
    const latRad = clampedLat * this.DEG2RAD;

    const tropAsc = norm360(
      Math.atan2(
        Math.cos(ramcRad),
        -(Math.sin(epsRad) * Math.tan(latRad) + Math.cos(epsRad) * Math.sin(ramcRad))
      ) * this.RAD2DEG
    );

    const tropMc = norm360(
      Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad)) * this.RAD2DEG
    );

    return {
      siderealAscendant: norm360(tropAsc - ayanamsa),
      siderealMidheaven: norm360(tropMc - ayanamsa),
      ayanamsa
    };
  }

  /**
   * Unified Topocentric Sunrise, Sunset and Solar Noon (delegates directly to `solarTimes()` in `planetaryEphemeris.ts`)
   */
  public static calculateSolarTimes(
    year: number,
    month: number,
    day: number,
    latitude: number,
    longitude: number,
    _timezoneOffset: number = 0,
    elevationMeters: number = 0
  ): {
    sunriseDate: Date;
    sunsetDate: Date;
    solarNoonDate: Date;
    isPolar: boolean;
    polarCondition?: 'POLAR_DAY' | 'POLAR_NIGHT';
  } {
    const st = solarTimes(year, month, day, latitude, longitude, elevationMeters);
    const solarNoonDate = new Date(st.solarNoonUtcMs);
    if (st.isPolarDay || st.isPolarNight || st.sunriseUtcMs === null || st.sunsetUtcMs === null) {
      return {
        sunriseDate: new Date(st.solarNoonUtcMs - 6 * 3600000),
        sunsetDate: new Date(st.solarNoonUtcMs + 6 * 3600000),
        solarNoonDate,
        isPolar: true,
        polarCondition: st.isPolarDay ? 'POLAR_DAY' : 'POLAR_NIGHT'
      };
    }
    return {
      sunriseDate: new Date(st.sunriseUtcMs),
      sunsetDate: new Date(st.sunsetUtcMs),
      solarNoonDate,
      isPolar: false
    };
  }

  public static calculateBhavaChalitCusps(
    siderealAscendant: number,
    siderealMidheaven: number
  ): BhavaCusp[] {
    const asc = norm360(siderealAscendant);
    const mc = norm360(siderealMidheaven);
    const ic = norm360(mc + 180.0);
    const desc = norm360(asc + 180.0);

    const span1 = norm360(ic - asc) / 3.0;
    const span2 = norm360(desc - ic) / 3.0;
    const span3 = norm360(mc - desc) / 3.0;
    const span4 = norm360(asc - mc) / 3.0;

    const madhyas: number[] = [
      asc,
      norm360(asc + span1),
      norm360(asc + 2 * span1),
      ic,
      norm360(ic + span2),
      norm360(ic + 2 * span2),
      desc,
      norm360(desc + span3),
      norm360(desc + 2 * span3),
      mc,
      norm360(mc + span4),
      norm360(mc + 2 * span4)
    ];

    const cusps: BhavaCusp[] = [];
    for (let i = 0; i < 12; i++) {
      const prevIdx = (i + 11) % 12;
      const nextIdx = (i + 1) % 12;
      const mCurrent = madhyas[i];
      const mPrev = madhyas[prevIdx];
      const mNext = madhyas[nextIdx];
      const sandhiStart = norm360(mPrev + norm360(mCurrent - mPrev) / 2.0);
      const sandhiEnd = norm360(mCurrent + norm360(mNext - mCurrent) / 2.0);
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
   * Strict API / Golden-Corpus Entry Point (`analyzeFullDayStrict`):
   * - Never substitutes any default date, city, or timezone.
   * - Rejects impossible Gregorian dates, years outside 1900..2100, NaN/out-of-range coordinates,
   *   missing/unknown IANA timezones, and any supplied `timezoneOffset` that disagrees with the IANA zone on `dateStr`.
   * - Every `CalculationInputError` carries a stable `code` and `fields` naming the offending input field(s).
   */
  public static analyzeFullDayStrict(
    dateStr: string,
    loc: StrictLocationInput,
    options?: DayAnalysisOptions
  ): DayAnalysisResult {
    return this.analyzeFullDayInternal(dateStr, loc, options, true);
  }

  /**
   * Day Panchanga, Limb End Times, Lunar Masa, Kaalas, Choghadiyas & Horas Generator.
   * Rejects invalid dates/years/coordinates/missing timezones; if a UI state supplies both an IANA `timezone`
   * and a stale seasonal `timezoneOffset`, resolves the authoritative IANA offset and records `inputNotes`.
   */
  public static analyzeFullDay(
    dateStr: string,
    loc: StrictLocationInput,
    options?: DayAnalysisOptions
  ): DayAnalysisResult {
    return this.analyzeFullDayInternal(dateStr, loc, options, false);
  }

  private static analyzeFullDayInternal(
    dateStr: string,
    loc: StrictLocationInput,
    options: DayAnalysisOptions | undefined,
    strictOffsetAgreement: boolean
  ): DayAnalysisResult {
    const inputNotes: string[] = [];

    // 1. Strict Gregorian Date & Year-Range Validation (1900..2100; rejects impossible dates like '2026-02-31' or '1900-02-29')
    const trimmedDate = typeof dateStr === 'string' ? dateStr.trim() : '';
    if (!validGregorianDate(trimmedDate)) {
      throw new CalculationInputError(
        'INVALID_DATE',
        `Invalid Gregorian calendar date: "${dateStr}". No fallback date is substituted.`,
        ['date']
      );
    }
    const [y, m, d] = trimmedDate.split('-').map(Number);
    if (y < 1900 || y > 2100) {
      throw new CalculationInputError(
        'DATE_OUT_OF_RANGE',
        `Year ${y} is outside supported ephemeris range (1900–2100).`,
        ['date']
      );
    }

    // 2. Strict Location & Coordinate Validation (zero silent fallback to New Delhi or UTC+5.5)
    if (!loc || typeof loc !== 'object') {
      throw new CalculationInputError(
        'INVALID_LOCATION',
        'Location coordinates and timezone are required; no default city is substituted.',
        ['location']
      );
    }
    if (typeof loc.latitude !== 'number' || !Number.isFinite(loc.latitude) || Math.abs(loc.latitude) > 90) {
      throw new CalculationInputError(
        'INVALID_LATITUDE',
        'Supply finite latitude within ±90°.',
        ['latitude']
      );
    }
    if (typeof loc.longitude !== 'number' || !Number.isFinite(loc.longitude) || Math.abs(loc.longitude) > 180) {
      throw new CalculationInputError(
        'INVALID_LONGITUDE',
        'Supply finite longitude within ±180°.',
        ['longitude']
      );
    }

    const elevationMeters = options?.elevationMeters ?? loc.elevationMeters ?? 0;
    if (!Number.isFinite(elevationMeters) || elevationMeters < -500 || elevationMeters > 12000) {
      throw new CalculationInputError(
        'INVALID_ELEVATION',
        'Observer elevation must be between -500m and 12000m.',
        ['elevationMeters']
      );
    }

    // 3. Strict IANA Timezone & Offset Agreement Validation
    const rawTz = loc.timezone;
    const rawOffset = (loc as { timezoneOffset?: unknown }).timezoneOffset;
    const hasOffsetProp = rawOffset !== undefined && rawOffset !== null;
    if (hasOffsetProp && (typeof rawOffset !== 'number' || !Number.isFinite(rawOffset) || rawOffset < -12 || rawOffset > 14)) {
      throw new CalculationInputError(
        'INVALID_TIMEZONE_OFFSET',
        'Typed UTC offset must be a finite number between −12 and +14 hours.',
        ['timezoneOffset']
      );
    }
    const typedOffset = hasOffsetProp ? (rawOffset as number) : undefined;

    if (rawTz !== undefined && rawTz !== '' && typeof rawTz !== 'string') {
      throw new CalculationInputError('INVALID_TIMEZONE', 'IANA timezone must be a string.', ['timezone']);
    }
    if (rawTz === 'Local' || (strictOffsetAgreement && rawTz === 'UTC_OFFSET')) {
      throw new CalculationInputError(
        'INVALID_TIMEZONE',
        `Unsupported or non-IANA timezone identifier: "${rawTz}".`,
        ['timezone']
      );
    }

    const hasExplicitIana = typeof rawTz === 'string' && rawTz !== '' && rawTz !== 'UTC_OFFSET';
    if (hasExplicitIana && !this.isValidIanaTimezone(rawTz)) {
      throw new CalculationInputError(
        'INVALID_TIMEZONE',
        `Unknown or unsupported IANA timezone: "${rawTz}".`,
        ['timezone']
      );
    }

    if (!hasExplicitIana && typedOffset === undefined) {
      throw new CalculationInputError(
        'MISSING_TIMEZONE',
        'Supply a valid IANA timezone or explicit UTC offset (−12 to +14).',
        ['timezone']
      );
    }

    const initialOffset = typedOffset !== undefined ? typedOffset : 0;
    const localDayBounds = this.getLocalDayUtcBounds(
      trimmedDate,
      hasExplicitIana ? rawTz : undefined,
      initialOffset
    );

    if (hasExplicitIana && typedOffset !== undefined) {
      const matchesStart = Math.abs(typedOffset - localDayBounds.startOffsetHours) < 1e-6;
      const matchesEnd = Math.abs(typedOffset - localDayBounds.endOffsetHours) < 1e-6;
      if (!matchesStart && !matchesEnd) {
        if (strictOffsetAgreement) {
          throw new CalculationInputError(
            'TIMEZONE_OFFSET_MISMATCH',
            `Supplied timezoneOffset (${typedOffset}) disagrees with IANA zone "${rawTz}" (${localDayBounds.startOffsetLabel}) on ${trimmedDate}.`,
            ['timezoneOffset', 'timezone']
          );
        }
        inputNotes.push(
          `Supplied UTC offset (${typedOffset >= 0 ? '+' : ''}${typedOffset}h) differed from IANA zone ${rawTz} (${localDayBounds.startOffsetLabel}) on ${trimmedDate}; applied authoritative ${rawTz} rules.`
        );
      }
    } else if (!hasExplicitIana && typedOffset !== undefined) {
      inputNotes.push(
        `Fixed numeric UTC offset (${this.formatUtcOffsetLabel(Math.round(typedOffset * 60))}) used without an IANA timezone; historical or daylight-saving transitions are not tracked.`
      );
    }
    if (localDayBounds.isDstTransition) {
      inputNotes.push(
        `Daylight Saving Time transition occurs on ${trimmedDate} in ${rawTz} (${localDayBounds.startOffsetLabel} → ${localDayBounds.endOffsetLabel}); each event timestamp is formatted at its exact instant offset.`
      );
    }

    const effectiveTzOffset = hasExplicitIana ? localDayBounds.startOffsetHours : initialOffset;

    const safeLoc: LocationCoordinates = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezoneOffset: effectiveTzOffset,
      timezone: hasExplicitIana ? rawTz : undefined,
      cityName: loc.cityName || `${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°`,
      elevationMeters
    };

    const { sunriseDate, sunsetDate, solarNoonDate, isPolar, polarCondition } = this.calculateSolarTimes(
      y, m, d, safeLoc.latitude, safeLoc.longitude, effectiveTzOffset, elevationMeters
    );

    const prevUtc = new Date(Date.UTC(y, m - 1, d - 1));
    const nextUtc = new Date(Date.UTC(y, m - 1, d + 1));
    const prevSolar = this.calculateSolarTimes(
      prevUtc.getUTCFullYear(), prevUtc.getUTCMonth() + 1, prevUtc.getUTCDate(),
      safeLoc.latitude, safeLoc.longitude, effectiveTzOffset, elevationMeters
    );
    const nextSolar = this.calculateSolarTimes(
      nextUtc.getUTCFullYear(), nextUtc.getUTCMonth() + 1, nextUtc.getUTCDate(),
      safeLoc.latitude, safeLoc.longitude, effectiveTzOffset, elevationMeters
    );

    const tRiseMs = sunriseDate.getTime();
    const tSetMs = sunsetDate.getTime();
    const tNextRiseMs = nextSolar.sunriseDate.getTime();
    const tPrevRiseMs = prevSolar.sunriseDate.getTime();
    const tPrevSetMs = prevSolar.sunsetDate.getTime();

    const dayLengthMs = Math.max(3600000, tSetMs - tRiseMs);
    const nightLengthMs = Math.max(3600000, tNextRiseMs - tSetMs);
    const prevNightLengthMs = Math.max(3600000, tRiseMs - tPrevSetMs);
    const partMs = dayLengthMs / 8.0;

    // Sidereal positions at local sunrise (Udaya instant)
    const { siderealSun, siderealMoon, ayanamsa } = this.siderealSunMoonAtMs(tRiseMs);

    const elongationAtMs = (ms: number) => {
      const s = this.siderealSunMoonAtMs(ms);
      return norm360(s.siderealMoon - s.siderealSun);
    };
    const sidMoonAtMs = (ms: number) => this.siderealSunMoonAtMs(ms).siderealMoon;
    const yogaSumAtMs = (ms: number) => {
      const s = this.siderealSunMoonAtMs(ms);
      return norm360(s.siderealMoon + s.siderealSun);
    };

    const formatLocal = (ms: number): string =>
      this.getWallTimeInZone(ms, safeLoc.timezone, effectiveTzOffset, true).hhmm24;
    const formatLocalWithDay = (ms: number): string => {
      const w = this.getWallTimeInZone(ms, safeLoc.timezone, effectiveTzOffset, true);
      return w.dateStr === trimmedDate ? w.hhmm12 : `${w.hhmm12} (+1d)`;
    };

    // 3. Tithi at Sunrise (Udaya Tithi) + Exact End Time + Kshaya / Vriddhi Detection
    const lunarSep = norm360(siderealMoon - siderealSun);
    const tithiIdx = Math.min(30, Math.floor(lunarSep / 12.0) + 1);
    const tithiFraction = (lunarSep % 12.0) / 12.0;
    const tithiEndMs = this.solveForwardCrossingMs(tRiseMs, (tithiIdx % 30) * 12.0, elongationAtMs, 12.19075);
    const tithiStartMs = this.solveBackwardCrossingMs(tRiseMs, ((tithiIdx - 1) % 30) * 12.0, elongationAtMs, 12.19075);

    let tithiAnomaly: 'NORMAL' | 'VRIDDHI' | 'KSHAYA' = 'NORMAL';
    let kshayaTithiName: string | undefined;
    const dayTithiSpans: TithiSpanEntry[] = [];

    if (tithiEndMs > tNextRiseMs) {
      tithiAnomaly = 'VRIDDHI';
      dayTithiSpans.push({
        index: tithiIdx,
        name: TITHI_NAMES[tithiIdx - 1],
        paksha: tithiIdx <= 15 ? 'Shukla' : 'Krishna',
        startMs: tithiStartMs,
        endMs: tithiEndMs,
        start12Hr: formatLocalWithDay(tithiStartMs),
        end12Hr: formatLocalWithDay(tithiEndMs),
        classification: 'VRIDDHI',
      });
    } else {
      dayTithiSpans.push({
        index: tithiIdx,
        name: TITHI_NAMES[tithiIdx - 1],
        paksha: tithiIdx <= 15 ? 'Shukla' : 'Krishna',
        startMs: tithiStartMs,
        endMs: tithiEndMs,
        start12Hr: formatLocalWithDay(tithiStartMs),
        end12Hr: formatLocalWithDay(tithiEndMs),
        classification: 'UDAYA',
      });
      const nextTithiIdx = (tithiIdx % 30) + 1;
      const secondEndMs = this.solveForwardCrossingMs(tithiEndMs + 2000, (nextTithiIdx % 30) * 12.0, elongationAtMs, 12.19075);
      if (secondEndMs <= tNextRiseMs) {
        tithiAnomaly = 'KSHAYA';
        kshayaTithiName = `${nextTithiIdx <= 15 ? 'Shukla' : 'Krishna'} ${TITHI_NAMES[nextTithiIdx - 1]}`;
        dayTithiSpans.push({
          index: nextTithiIdx,
          name: TITHI_NAMES[nextTithiIdx - 1],
          paksha: nextTithiIdx <= 15 ? 'Shukla' : 'Krishna',
          startMs: tithiEndMs,
          endMs: secondEndMs,
          start12Hr: formatLocalWithDay(tithiEndMs),
          end12Hr: formatLocalWithDay(secondEndMs),
          classification: 'KSHAYA',
        });
        const thirdIdx = (nextTithiIdx % 30) + 1;
        const thirdEndMs = this.solveForwardCrossingMs(secondEndMs + 2000, (thirdIdx % 30) * 12.0, elongationAtMs, 12.19075);
        dayTithiSpans.push({
          index: thirdIdx,
          name: TITHI_NAMES[thirdIdx - 1],
          paksha: thirdIdx <= 15 ? 'Shukla' : 'Krishna',
          startMs: secondEndMs,
          endMs: thirdEndMs,
          start12Hr: formatLocalWithDay(secondEndMs),
          end12Hr: formatLocalWithDay(thirdEndMs),
          classification: 'SUBSEQUENT',
        });
      } else {
        dayTithiSpans.push({
          index: nextTithiIdx,
          name: TITHI_NAMES[nextTithiIdx - 1],
          paksha: nextTithiIdx <= 15 ? 'Shukla' : 'Krishna',
          startMs: tithiEndMs,
          endMs: secondEndMs,
          start12Hr: formatLocalWithDay(tithiEndMs),
          end12Hr: formatLocalWithDay(secondEndMs),
          classification: 'SUBSEQUENT',
        });
      }
    }

    // 4. Nakshatra Exact Start & End Times -> Exact Varjyam & Amrit Kalam
    const nakSpanDeg = 360.0 / 27.0;
    const nakshatraIdx = Math.min(27, Math.floor(siderealMoon / nakSpanDeg) + 1);
    const nakshatraFraction = (siderealMoon % nakSpanDeg) / nakSpanDeg;
    const nakPada = Math.min(4, Math.floor(nakshatraFraction * 4) + 1);
    const nakStartMs = this.solveBackwardCrossingMs(tRiseMs, ((nakshatraIdx - 1) * nakSpanDeg) % 360.0, sidMoonAtMs, 13.17636);
    const nakEndMs = this.solveForwardCrossingMs(tRiseMs, (nakshatraIdx * nakSpanDeg) % 360.0, sidMoonAtMs, 13.17636);
    const actualNakDurationMs = Math.max(18 * 3600000, nakEndMs - nakStartMs);

    // 5. Yoga & Karana Exact End Times
    const yogaSum = norm360(siderealSun + siderealMoon);
    const yogaIdx = Math.min(27, Math.floor(yogaSum / nakSpanDeg) + 1);
    const yogaFraction = (yogaSum % nakSpanDeg) / nakSpanDeg;
    const yogaEndMs = this.solveForwardCrossingMs(tRiseMs, (yogaIdx * nakSpanDeg) % 360.0, yogaSumAtMs, 14.16196);

    const karanaIdx = Math.min(60, Math.floor(lunarSep / 6.0) + 1);
    const karanaFraction = (lunarSep % 6.0) / 6.0;
    const karanaName = this.getKaranaNameByIndex(karanaIdx);
    const karanaEndMs = this.solveForwardCrossingMs(tRiseMs, (karanaIdx * 6.0) % 360.0, elongationAtMs, 12.19075);

    // 6. Lunar Masa (Amanta & Purnimanta) + Adhika / Kshaya Masa Detection
    const activeMasaSystem: LunarMonthSystem = options?.lunarMonthSystem || 'AMANTA';
    const prevNewMoonMs = this.solveBackwardCrossingMs(tRiseMs, 0.0, elongationAtMs, 12.19075);
    const nextNewMoonMs = this.solveForwardCrossingMs(tRiseMs, 0.0, elongationAtMs, 12.19075);
    const sunRashiPrev = Math.floor(this.siderealSunMoonAtMs(prevNewMoonMs + 1000).siderealSun / 30.0) % 12;
    const sunRashiNext = Math.floor(this.siderealSunMoonAtMs(nextNewMoonMs - 1000).siderealSun / 30.0) % 12;
    const rashiAdvance = (sunRashiNext - sunRashiPrev + 12) % 12;

    const isAdhikaMasa = rashiAdvance === 0;
    const isKshayaMasa = rashiAdvance >= 2;
    const amantaIndex = isAdhikaMasa
      ? (sunRashiNext + 1) % 12
      : isKshayaMasa
      ? (sunRashiPrev + 1) % 12
      : sunRashiNext;
    const paksha: 'Shukla' | 'Krishna' = tithiIdx <= 15 ? 'Shukla' : 'Krishna';
    const purnimantaIndex = !isAdhikaMasa && paksha === 'Krishna' ? (amantaIndex + 1) % 12 : amantaIndex;
    const amantaName = MASA_NAMES[amantaIndex];
    const purnimantaName = MASA_NAMES[purnimantaIndex];
    const baseChosenName = activeMasaSystem === 'PURNIMANTA' ? purnimantaName : amantaName;
    const masaPrefix = isAdhikaMasa ? 'Adhika ' : isKshayaMasa ? 'Kshaya ' : '';

    const lunarMasa: LunarMasaInfo = {
      activeSystem: activeMasaSystem,
      amantaIndex,
      amantaName,
      purnimantaIndex,
      purnimantaName,
      displayName: `${masaPrefix}${baseChosenName}`,
      isAdhikaMasa,
      isKshayaMasa,
      prevNewMoonIso: new Date(prevNewMoonMs).toISOString(),
      nextNewMoonIso: new Date(nextNewMoonMs).toISOString(),
    };

    // Vaara (Weekday of the civil calendar date in the selected location)
    const localDayOfWeek = ((new Date(this.civilUtcMs(y, m, d, 12, 0, 0)).getUTCDay()) % 7 + 7) % 7;
    const prevLocalDayOfWeek = (localDayOfWeek + 6) % 7;

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

    const rahuSegments = [8, 2, 7, 5, 6, 4, 3];
    const gulikaSegments = [7, 6, 5, 4, 3, 2, 1];
    const yamaSegments = [5, 4, 3, 2, 1, 7, 6];

    const rSeg = rahuSegments[localDayOfWeek] || 8;
    const gSeg = gulikaSegments[localDayOfWeek] || 7;
    const ySeg = yamaSegments[localDayOfWeek] || 5;

    const rahuKaal = makeWindow('Rahu Kaal', tRiseMs + (rSeg - 1) * partMs, tRiseMs + rSeg * partMs, 'Inauspicious', -30);
    const gulikaKaal = makeWindow('Gulika Kaal', tRiseMs + (gSeg - 1) * partMs, tRiseMs + gSeg * partMs, 'Neutral', -10);
    const yamaghanta = makeWindow('Yamaghanta', tRiseMs + (ySeg - 1) * partMs, tRiseMs + ySeg * partMs, 'Inauspicious', -20);

    const mSpanMs = dayLengthMs / 15.0;
    const tNoonMs = solarNoonDate.getTime();
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

    const brahma = makeWindow('Brahma Muhurta', tRiseMs - 96 * 60000, tRiseMs - 48 * 60000, 'Auspicious', 20);
    const godhuli = makeWindow('Godhuli Kaal', tSetMs - 12 * 60000, tSetMs + 12 * 60000, 'Auspicious', 15);
    const vijaya = makeWindow('Vijaya Muhurta', tRiseMs + 10 * mSpanMs, tRiseMs + 11 * mSpanMs, 'Auspicious', 20);
    const pradoshKaal = makeWindow('Pradosh Kaal', tSetMs, tSetMs + 144 * 60000, 'Auspicious', 16);

    // 7. Exact Root-Solved Amrit Kalam & Varjyam (4 Ghatis = 4/60 of actual Nakshatra span)
    const resolveNakshatraGhatiWindow = (ghatiTable: number[], label: string, nature: 'Auspicious' | 'Inauspicious', impact: number): KaalaWindow => {
      const ghatiOffset = ghatiTable[(nakshatraIdx - 1) % 27] ?? 30;
      let winStart = nakStartMs + (ghatiOffset / 60.0) * actualNakDurationMs;
      let winDur = (4.0 / 60.0) * actualNakDurationMs;
      if (winStart + winDur < tRiseMs && nakEndMs < tNextRiseMs) {
        const nextNakIdx0 = nakshatraIdx % 27;
        const nextEndMs = this.solveForwardCrossingMs(nakEndMs + 2000, ((nextNakIdx0 + 1) * nakSpanDeg) % 360.0, sidMoonAtMs, 13.17636);
        const nextDurMs = Math.max(18 * 3600000, nextEndMs - nakEndMs);
        const nextOffset = ghatiTable[nextNakIdx0] ?? 30;
        winStart = nakEndMs + (nextOffset / 60.0) * nextDurMs;
        winDur = (4.0 / 60.0) * nextDurMs;
      }
      return makeWindow(label, winStart, winStart + winDur, nature, impact);
    };

    const amrit = resolveNakshatraGhatiWindow(NAKSHATRA_AMRIT_START_GHATI, 'Amrit Kaal', 'Auspicious', 18);
    const varjyam = resolveNakshatraGhatiWindow(NAKSHATRA_VARJYAM_START_GHATI, 'Varjyam (Tyajya)', 'Inauspicious', -22);

    // 8. Exact Root-Solved Vishti (Bhadra) Windows Overlapping the Local Day
    const vishtiWindows: KaalaWindow[] = [];
    {
      let cursorMs = localDayBounds.startUtcMs;
      for (let step = 0; step < 6 && cursorMs < localDayBounds.endUtcMs; step++) {
        const el = elongationAtMs(cursorMs + 1000);
        const kIdx1 = Math.min(60, Math.floor(el / 6.0) + 1);
        const kName = this.getKaranaNameByIndex(kIdx1);
        const kEnd = this.solveForwardCrossingMs(cursorMs + 1000, (kIdx1 * 6.0) % 360.0, elongationAtMs, 12.19075);
        const clippedEnd = Math.min(localDayBounds.endUtcMs, kEnd);
        if (kName.includes('Vishti') && clippedEnd > cursorMs) {
          vishtiWindows.push(makeWindow('Vishti (Bhadra)', cursorMs, clippedEnd, 'Inauspicious', -15));
        }
        cursorMs = kEnd + 1000;
      }
    }

    // 9. Exact Panchak Detection & Window (Sidereal Moon in [300°, 360°): Dhanishta P3-4 through Revati)
    let panchak: DayAnalysisResult['panchak'] = { isActive: false, window: null, nakshatraName: null };
    {
      const moonStart = sidMoonAtMs(localDayBounds.startUtcMs);
      const moonEnd = sidMoonAtMs(localDayBounds.endUtcMs - 1000);
      const startInPanchak = moonStart >= 300.0;
      const endInPanchak = moonEnd >= 300.0;
      const entersPanchak = !startInPanchak && moonStart >= 275.0 && endInPanchak;
      const exitsPanchak = startInPanchak && !endInPanchak && moonEnd < 25.0;

      if (startInPanchak || endInPanchak || entersPanchak || exitsPanchak) {
        const pStart = startInPanchak
          ? localDayBounds.startUtcMs
          : this.solveForwardCrossingMs(localDayBounds.startUtcMs, 300.0, sidMoonAtMs, 13.17636);
        const pEnd = endInPanchak
          ? localDayBounds.endUtcMs
          : this.solveForwardCrossingMs(pStart + 1000, 0.0, sidMoonAtMs, 13.17636);
        const clampedStart = Math.max(localDayBounds.startUtcMs, pStart);
        const clampedEnd = Math.min(localDayBounds.endUtcMs, pEnd);
        if (clampedEnd > clampedStart) {
          const midMoon = sidMoonAtMs((clampedStart + clampedEnd) / 2);
          const pNakIdx = Math.min(26, Math.floor(midMoon / nakSpanDeg));
          panchak = {
            isActive: true,
            window: makeWindow('Panchak', clampedStart, clampedEnd, 'Inauspicious', -8),
            nakshatraName: NAKSHATRA_NAMES[pNakIdx]
          };
        }
      }
    }

    // 10. Explicit Versioned Festival Rule Evaluator (e.g. Pradosh-Vyapini Kartika Amavasya for Diwali)
    const matchedFestivals: FestivalObservance[] = [];
    if (!isAdhikaMasa) {
      const pradoshMidMs = tSetMs + 72 * 60000;
      const tithiAtPradosh = Math.min(30, Math.floor(elongationAtMs(pradoshMidMs) / 12.0) + 1);
      const nishitaMidMs = tSetMs + nightLengthMs / 2.0;
      const tithiAtNishita = Math.min(30, Math.floor(elongationAtMs(nishitaMidMs) / 12.0) + 1);

      if (amantaIndex === 6 && tithiAtPradosh === 30) {
        matchedFestivals.push({
          id: 'diwali-lakshmi-puja',
          name: 'Diwali · Mahalakshmi Puja',
          ruleSummary: 'Kartika (Purnimanta) / Ashwin (Amanta) Amavasya prevailing during Pradosh Kaal',
          observanceWindow12Hr: `${pradoshKaal.start12Hr} – ${pradoshKaal.end12Hr}`
        });
      }
      if (amantaIndex === 6 && tithiAtPradosh === 28) {
        matchedFestivals.push({
          id: 'dhanteras-pradosh',
          name: 'Dhanteras (Dhantrayodashi)',
          ruleSummary: 'Krishna Trayodashi prevailing during Pradosh Kaal prior to Diwali',
          observanceWindow12Hr: `${pradoshKaal.start12Hr} – ${pradoshKaal.end12Hr}`
        });
      }
      if (amantaIndex === 1 && tithiIdx === 3) {
        matchedFestivals.push({
          id: 'akshaya-tritiya',
          name: 'Akshaya Tritiya',
          ruleSummary: 'Vaishakha Shukla Tritiya at Udaya / Purvahna',
          observanceWindow12Hr: `${this.format24To12Hr(formatLocal(tRiseMs))} – ${formatLocalWithDay(Math.min(tSetMs, tithiEndMs))}`
        });
      }
      if (amantaIndex === 6 && tithiIdx === 10) {
        matchedFestivals.push({
          id: 'vijaya-dashami',
          name: 'Vijaya Dashami (Dussehra)',
          ruleSummary: 'Ashwin Shukla Dashami (Aparahna / Vijaya Muhurta)',
          observanceWindow12Hr: `${vijaya.start12Hr} – ${vijaya.end12Hr}`
        });
      }
      if (amantaIndex === 10 && tithiAtNishita === 29) {
        matchedFestivals.push({
          id: 'maha-shivaratri',
          name: 'Maha Shivaratri',
          ruleSummary: 'Magha (Amanta) / Phalguna (Purnimanta) Krishna Chaturdashi during Nishita Kaal',
          observanceWindow12Hr: `${this.format24To12Hr(formatLocal(nishitaMidMs - 24 * 60000))} – ${this.format24To12Hr(formatLocal(nishitaMidMs + 24 * 60000))}`
        });
      }
    }

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
    ).slice(12);

    const sunriseStr = formatLocal(tRiseMs);
    const sunsetStr = formatLocal(tSetMs);
    const noonStr = formatLocal(tNoonMs);

    return {
      date: trimmedDate,
      location: safeLoc,
      localDayBounds,
      inputNotes,
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
        polarCondition,
        elevationMeters
      },
      sunriseLocal: sunriseStr,
      sunsetLocal: sunsetStr,
      dayOfWeekIndex: localDayOfWeek,
      siderealSunLongitude: Number(siderealSun.toFixed(4)),
      siderealMoonLongitude: Number(siderealMoon.toFixed(4)),
      lunarMasa,
      panchanga: {
        tithi: {
          index: tithiIdx,
          name: TITHI_NAMES[tithiIdx - 1] || 'Pratipada',
          paksha,
          udayaTithiIndex: tithiIdx,
          udayaTithiName: `${paksha} ${TITHI_NAMES[tithiIdx - 1] || 'Pratipada'}`,
          tithiAnomaly,
          ...(kshayaTithiName ? { kshayaTithiName } : {}),
          dayTithiSpans,
          fractionElapsed: Number(tithiFraction.toFixed(4)),
          degreeInSpan: Number((tithiFraction * 12.0).toFixed(2)),
          endMs: tithiEndMs,
          endIso: new Date(tithiEndMs).toISOString(),
          endLocal: formatLocal(tithiEndMs),
          end12Hr: formatLocalWithDay(tithiEndMs),
          endsAfterNextSunrise: tithiEndMs > tNextRiseMs,
        },
        nakshatra: {
          index: nakshatraIdx,
          name: NAKSHATRA_NAMES[nakshatraIdx - 1] || 'Ashwini',
          lord: NAKSHATRA_LORDS[nakshatraIdx - 1] || 'Ketu',
          pada: nakPada,
          fractionElapsed: Number(nakshatraFraction.toFixed(4)),
          degreeInSpan: Number((nakshatraFraction * nakSpanDeg).toFixed(2)),
          startMs: nakStartMs,
          start12Hr: formatLocalWithDay(nakStartMs),
          endMs: nakEndMs,
          endIso: new Date(nakEndMs).toISOString(),
          endLocal: formatLocal(nakEndMs),
          end12Hr: formatLocalWithDay(nakEndMs),
          endsAfterNextSunrise: nakEndMs > tNextRiseMs,
        },
        yoga: {
          index: yogaIdx,
          name: YOGA_NAMES[yogaIdx - 1] || 'Vishkambha',
          fractionElapsed: Number(yogaFraction.toFixed(4)),
          degreeInSpan: Number((yogaFraction * nakSpanDeg).toFixed(2)),
          endMs: yogaEndMs,
          endIso: new Date(yogaEndMs).toISOString(),
          endLocal: formatLocal(yogaEndMs),
          end12Hr: formatLocalWithDay(yogaEndMs),
          endsAfterNextSunrise: yogaEndMs > tNextRiseMs,
        },
        karana: {
          index: karanaIdx,
          name: karanaName,
          isVishtiBhadra: karanaName.includes('Vishti'),
          fractionElapsed: Number(karanaFraction.toFixed(4)),
          degreeInSpan: Number((karanaFraction * 6.0).toFixed(2)),
          endMs: karanaEndMs,
          endIso: new Date(karanaEndMs).toISOString(),
          endLocal: formatLocal(karanaEndMs),
          end12Hr: formatLocalWithDay(karanaEndMs),
          endsAfterNextSunrise: karanaEndMs > tNextRiseMs,
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
        amritKaal: amrit,
        varjyam,
        pradoshKaal
      },
      vishtiWindows,
      panchak,
      festivalObservances: {
        ruleSetVersion: 'drik-festival-rules-v1',
        approvalStatus: 'UNAPPROVED_PENDING_JYOTISHI_SIGN_OFF',
        matched: matchedFestivals
      },
      kaalaTimings: {
        rahuKaalam: { start: rahuKaal.startLocal, end: rahuKaal.endLocal, start12Hr: rahuKaal.start12Hr, end12Hr: rahuKaal.end12Hr },
        gulikaKaalam: { start: gulikaKaal.startLocal, end: gulikaKaal.endLocal, start12Hr: gulikaKaal.start12Hr, end12Hr: gulikaKaal.end12Hr },
        yamaghantam: { start: yamaghanta.startLocal, end: yamaghanta.endLocal, start12Hr: yamaghanta.start12Hr, end12Hr: yamaghanta.end12Hr },
        abhijitMuhurta: { start: abhijit.startLocal, end: abhijit.endLocal, start12Hr: abhijit.start12Hr, end12Hr: abhijit.end12Hr },
        brahmaMuhurta: { start: brahma.startLocal, end: brahma.endLocal, start12Hr: brahma.start12Hr, end12Hr: brahma.end12Hr },
        godhuliBela: { start: godhuli.startLocal, end: godhuli.endLocal, start12Hr: godhuli.start12Hr, end12Hr: godhuli.end12Hr },
        vijayaMuhurta: { start: vijaya.startLocal, end: vijaya.endLocal, start12Hr: vijaya.start12Hr, end12Hr: vijaya.end12Hr },
        amritKaal: { start: amrit.startLocal, end: amrit.endLocal, start12Hr: amrit.start12Hr, end12Hr: amrit.end12Hr },
        varjyam: { start: varjyam.startLocal, end: varjyam.endLocal, start12Hr: varjyam.start12Hr, end12Hr: varjyam.end12Hr }
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
