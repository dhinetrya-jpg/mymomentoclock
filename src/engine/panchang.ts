/**
 * MyMomentOclock analytical Panchang preview (not independently validated)
 * Computes:
 * - Tithi (30 lunar days, Shukla/Krishna pakshas, exact degrees and boundaries)
 * - Nakshatra & Pada (27 lunar mansions and 108 padas)
 * - Yoga (27 solar-lunar longitudes sum yogas)
 * - Karana (60 half-tithis: 7 movable cycles + 4 fixed)
 * - Solar events: Apparent Sunrise, Sunset, Solar Noon, Day Length
 * - Vedic Muhurtas: Rahu Kaal, Yamaganda, Gulika Kaal, Abhijit Muhurta, Brahma Muhurta
 * - Numerical boundary solver (Bisection / Bracketing root-finder within 1-minute convergence)
 */

import {CalculationInputError, validGregorianDate} from './calculationValidation';

import {
  calculateJulianDay,
  getAyanamsa,
  AyanamsaType,
  NAKSHATRAS,
} from './astroMath';

// --- Types & Interfaces ---

export interface SolarEventResult {
  calculationMode: 'ANALYTICAL_APPROXIMATION';
  independentValidationStatus: 'NOT_PERFORMED';
  source: 'LEGACY_ANALYTICAL_PREVIEW';
  eventDatePolicy: 'UTC_ISO_WITH_DATE';
  date: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  julianDayNoonUT: number;
  solarNoonUTC: string;
  sunriseUTC: string;
  sunsetUTC: string;
  sunriseLocal: string;
  sunsetLocal: string;
  dayLengthHours: number;
  isPolarDay: boolean;
  isPolarNight: boolean;
  atmosphericRefractionDegrees: number; // standard 34' = 0.5667°
  solarSemiDiameterDegrees: number;    // standard 16' = 0.2667°
  standardZenithDegrees: number;       // 90°50' = 90.8333°
}

export interface DayMuhurtas {
  conventionVersion: 'legacy-day-eighths-fixed-brahma-v1';
  traditionalRuleApproval: 'UNAPPROVED';
  date: string;
  weekday: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  weekdayName: string;
  sunriseLocal: string;
  sunsetLocal: string;
  rahuKaal: { startLocal: string; endLocal: string; segmentNumber: number };
  yamaganda: { startLocal: string; endLocal: string; segmentNumber: number };
  gulikaKaal: { startLocal: string; endLocal: string; segmentNumber: number };
  abhijitMuhurta: {
    startLocal: string;
    endLocal: string;
    isAuspiciousToday: boolean;
    caveat: string;
  };
  brahmaMuhurta: { startLocal: string; endLocal: string };
}

export interface TithiInfo {
  index: number;          // 0 to 29
  numberInPaksha: number; // 1 to 15
  paksha: 'Shukla' | 'Krishna';
  name: string;
  fullName: string;
  elapsedDegreesInTithi: number;
  remainingDegreesInTithi: number;
  fractionElapsed: number; // 0.0 to 1.0
  isFullMoon: boolean;     // Purnima
  isNewMoon: boolean;      // Amavasya
}

export interface YogaInfo {
  index: number; // 0 to 26
  number: number; // 1 to 27
  name: string;
  elapsedDegrees: number;
  remainingDegrees: number;
  nature: 'Auspicious' | 'Inauspicious' | 'Neutral';
  interpretationStatus:'TRADITIONAL_UNAPPROVED';
}

export interface KaranaInfo {
  index: number; // 0 to 59
  name: string;
  type: 'Movable' | 'Fixed';
  elapsedDegrees: number;
  remainingDegrees: number;
  nature: 'Auspicious' | 'Inauspicious' | 'Neutral';
  interpretationStatus:'TRADITIONAL_UNAPPROVED';
}

export interface TransitionBoundaryResult {
  transitionName: string;
  currentValue: string;
  nextValue: string;
  targetAngleDegrees: number;
  transitionInstantUTC: string;
  transitionJulianDayUT: number;
  secondsFromSearchEpoch: number;
  converged: boolean;
  iterations: number;
  angularResidualDegrees: number;
  numericalToleranceSeconds:number;
  bracketWidthSeconds:number;
  astronomicalAccuracySeconds:null;
}

export interface PanchangReport {
  calculationMode: 'ANALYTICAL_APPROXIMATION';
  independentValidationStatus: 'NOT_PERFORMED';
  timingGuidanceAuthorized: false;
  supportedPrecision: 'UNVERIFIED';
  limitations: string[];
  timestampUTC: string;
  julianDayUT: number;
  ayanamsaType: AyanamsaType;
  ayanamsaValue: number;
  sunLongitudeSidereal: number;
  moonLongitudeSidereal: number;
  sunLongitudeTropical: number;
  moonLongitudeTropical: number;
  tithi: TithiInfo;
  nakshatra: {
    index: number;
    name: string;
    pada: number;
    elapsedDegrees: number;
    remainingDegrees: number;
  };
  yoga: YogaInfo;
  karana: KaranaInfo;
  solarEvents: SolarEventResult;
  muhurtas: DayMuhurtas;
  nextTithiTransition?: TransitionBoundaryResult;
  nextNakshatraTransition?: TransitionBoundaryResult;
}

// --- Constants & Reference Catalogues ---

export const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima' // Shukla 15
];

export const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti'
];

export const INAUSPICIOUS_YOGAS = [
  'Vishkambha', 'Atiganda', 'Shula', 'Ganda', 'Vyaghata',
  'Vajra', 'Vyatipata', 'Parigha', 'Vaidhriti'
];

export const MOVABLE_KARANAS = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'
];

export const FIXED_KARANAS = [
  'Shakuni', 'Chatushpada', 'Naga', 'Kintughna'
];

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- Legacy-named analytical solar/lunar preview; no independent accuracy claim ---

/**
 * @deprecated Legacy analytical preview; the historical name is not a precision claim.
 * Computes approximate solar longitude, right ascension, declination, and equation of time
 */
export function calculateHighPrecisionSun(jd: number): {
  apparentLongitude: number;
  tropicalLongitude: number;
  rightAscension: number;
  declination: number;
  equationOfTimeMinutes: number;
} {
  if(!Number.isFinite(jd))throw new CalculationInputError('INVALID_JULIAN_DAY','Supply a finite Julian Day.');
  const d = jd - 2451545.0;
  const t = d / 36525.0;

  // Geometric mean longitude of the Sun (degrees)
  const l0 = (280.46646 + 36000.76983 * t + 0.0003032 * t * t) % 360;

  // Mean anomaly of the Sun (degrees)
  const m = (357.52911 + 35999.05029 * t - 0.0001537 * t * t) % 360;
  const mRad = (m * Math.PI) / 180;

  // Sun's equation of the center
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mRad) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * mRad) +
    0.000289 * Math.sin(3 * mRad);

  // True solar longitude
  const trueLon = (l0 + c) % 360;

  // Apparent solar longitude (corrected for aberration and nutation)
  const omega = 125.04 - 1934.136 * t;
  const omegaRad = (omega * Math.PI) / 180;
  const appLon = ((trueLon - 0.00569 - 0.00478 * Math.sin(omegaRad)) % 360 + 360) % 360;

  // Mean obliquity of the ecliptic (Meeus 22.2)
  const eps0 = 23.43929111 - 0.013004167 * t - 1.64e-7 * t * t + 5.036e-7 * t * t * t;
  const eps = eps0 + 0.00256 * Math.cos(omegaRad);
  const epsRad = (eps * Math.PI) / 180;
  const appLonRad = (appLon * Math.PI) / 180;

  // Right Ascension and Declination
  const sinAlpha = Math.cos(epsRad) * Math.sin(appLonRad);
  const cosAlpha = Math.cos(appLonRad);
  let alpha = (Math.atan2(sinAlpha, cosAlpha) * 180) / Math.PI;
  if (alpha < 0) alpha += 360;

  const sinDelta = Math.sin(epsRad) * Math.sin(appLonRad);
  const delta = (Math.asin(sinDelta) * 180) / Math.PI;

  // Equation of Time (Meeus 28.1) in minutes
  const y = Math.tan(epsRad / 2) * Math.tan(epsRad / 2);
  const l0Rad = (l0 * Math.PI) / 180;
  const e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;

  const eotRad =
    y * Math.sin(2 * l0Rad) -
    2 * e * Math.sin(mRad) +
    4 * e * y * Math.sin(mRad) * Math.cos(2 * l0Rad) -
    0.5 * y * y * Math.sin(4 * l0Rad) -
    1.25 * e * e * Math.sin(2 * mRad);
  const equationOfTimeMinutes = (eotRad * 180) / Math.PI * 4.0;

  return {
    apparentLongitude: Number(appLon.toFixed(6)),
    tropicalLongitude: Number(((trueLon % 360 + 360) % 360).toFixed(6)),
    rightAscension: Number(alpha.toFixed(6)),
    declination: Number(delta.toFixed(6)),
    equationOfTimeMinutes: Number(equationOfTimeMinutes.toFixed(4)),
  };
}

/**
 * @deprecated Legacy analytical preview; native Swiss is the authority.
 * Computes approximate geocentric tropical lunar longitude with major periodic terms (Meeus Ch. 47)
 */
export function calculateHighPrecisionMoon(jd: number): {
  tropicalLongitude: number;
} {
  if(!Number.isFinite(jd))throw new CalculationInputError('INVALID_JULIAN_DAY','Supply a finite Julian Day.');
  const d = jd - 2451545.0;
  const t = d / 36525.0;

  // Mean longitude of the Moon
  const lPrime = (218.3164477 + 481267.88123421 * t - 0.0015786 * t * t + t * t * t / 538841.0) % 360;

  // Mean elongation of the Moon
  const dArg = (297.8501921 + 445267.1114034 * t - 0.0018819 * t * t + t * t * t / 545868.0) % 360;

  // Sun's mean anomaly
  const m = (357.5291092 + 35999.0502909 * t - 0.0001536 * t * t + t * t * t / 24490000.0) % 360;

  // Moon's mean anomaly
  const mPrime = (134.9633964 + 477198.8675055 * t + 0.0087414 * t * t + t * t * t / 69699.0) % 360;

  // Moon's argument of latitude
  const f = (93.272095 + 483202.0175233 * t - 0.0036539 * t * t - t * t * t / 3526000.0) % 360;

  const toRad = Math.PI / 180;
  const dRad = dArg * toRad;
  const mRad = m * toRad;
  const mpRad = mPrime * toRad;
  const fRad = f * toRad;

  // Major periodic terms in lunar longitude (degrees)
  const deltaL =
    6.288774 * Math.sin(mpRad) +
    1.274027 * Math.sin(2 * dRad - mpRad) +
    0.658314 * Math.sin(2 * dRad) +
    0.213618 * Math.sin(2 * mpRad) -
    0.185116 * Math.sin(mRad) -
    0.114332 * Math.sin(2 * fRad) +
    0.058793 * Math.sin(2 * dRad - 2 * mpRad) +
    0.057066 * Math.sin(2 * dRad - mRad - mpRad) +
    0.05332 * Math.sin(2 * dRad + mpRad) +
    0.046058 * Math.sin(2 * dRad - mRad);

  const moonLon = ((lPrime + deltaL) % 360 + 360) % 360;
  return {
    tropicalLongitude: Number(moonLon.toFixed(6)),
  };
}

// --- Solar Events (Sunrise, Sunset, Noon) ---

/**
 * Calculates apparent sunrise, sunset, and solar noon for a given civil date and location
 * Standard zenith distance is 90°50' = 90.8333° (atmospheric refraction 34' + semi-diameter 16')
 */
export function calculateSolarEvents(
  year: number,
  month: number,
  day: number,
  latitude: number,
  longitude: number,
  timezoneOffset: number
): SolarEventResult {
  const dateStr = `${String(year).padStart(4,'0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if(!validGregorianDate(dateStr)||![year,month,day].every(Number.isInteger))throw new CalculationInputError('INVALID_DATE','Supply an existing Gregorian date.');
  if(![latitude,longitude,timezoneOffset].every(Number.isFinite)||Math.abs(latitude)>90||Math.abs(longitude)>180||timezoneOffset< -12||timezoneOffset>14)throw new CalculationInputError('INVALID_LOCATION','Supply finite coordinates and an explicit UTC offset.');
  // Approximate noon JD for the location
  const approxNoonJD = calculateJulianDay(year, month, day, 12, 0, 0) - timezoneOffset / 24;

  const sunData = calculateHighPrecisionSun(approxNoonJD);
  const deltaRad = (sunData.declination * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;

  // Standard zenith angle: 90.833333°
  const z0 = 90.833333;
  const z0Rad = (z0 * Math.PI) / 180;

  // Hour angle cosine
  const cosH0 = (Math.cos(z0Rad) - Math.sin(latRad) * Math.sin(deltaRad)) / (Math.cos(latRad) * Math.cos(deltaRad));

  let isPolarDay = false;
  let isPolarNight = false;
  let h0Deg = 0;

  if (cosH0 > 1.0) {
    isPolarNight = true; // Sun never rises
  } else if (cosH0 < -1.0) {
    isPolarDay = true; // Sun never sets
    h0Deg = 180;
  } else {
    h0Deg = (Math.acos(cosH0) * 180) / Math.PI;
  }

  // Solar Noon in UTC hours: 12 - (lon / 15) - (EoT / 60)
  const solarNoonUTCHours = 12.0 - longitude / 15.0 - sunData.equationOfTimeMinutes / 60.0;
  const sunriseUTCHours = solarNoonUTCHours - h0Deg / 15.0;
  const sunsetUTCHours = solarNoonUTCHours + h0Deg / 15.0;
  const dayLengthHours = (2 * h0Deg) / 15.0;

  // UTC hours are relative to the supplied Gregorian date. Preserve day rollover and
  // carry rounded seconds through Date arithmetic instead of ever emitting :60.
  const midnight=new Date(0);midnight.setUTCFullYear(year,month-1,day);midnight.setUTCHours(0,0,0,0);
  const formatHourToTimes = (utcHours: number) => {
    const utc=new Date(midnight.getTime()+Math.round(utcHours*3600)*1000);
    const local=new Date(utc.getTime()+Math.round(timezoneOffset*3600)*1000);
    return {utc:utc.toISOString(),local:local.toISOString().slice(11,19)};
  };

  const noonTimes = formatHourToTimes(solarNoonUTCHours);
  const riseTimes = formatHourToTimes(sunriseUTCHours);
  const setTimes = formatHourToTimes(sunsetUTCHours);

  return {
    calculationMode:'ANALYTICAL_APPROXIMATION',independentValidationStatus:'NOT_PERFORMED',source:'LEGACY_ANALYTICAL_PREVIEW',eventDatePolicy:'UTC_ISO_WITH_DATE',
    date: dateStr,
    latitude,
    longitude,
    timezoneOffset,
    julianDayNoonUT: Number(approxNoonJD.toFixed(6)),
    solarNoonUTC: noonTimes.utc,
    sunriseUTC: isPolarNight ? 'POLAR_NIGHT' : isPolarDay ? 'POLAR_DAY' : riseTimes.utc,
    sunsetUTC: isPolarDay ? 'POLAR_DAY' : isPolarNight ? 'POLAR_NIGHT' : setTimes.utc,
    sunriseLocal: isPolarNight ? 'POLAR_NIGHT' : isPolarDay ? 'POLAR_DAY' : riseTimes.local,
    sunsetLocal: isPolarDay ? 'POLAR_DAY' : isPolarNight ? 'POLAR_NIGHT' : setTimes.local,
    dayLengthHours: Number(dayLengthHours.toFixed(4)),
    isPolarDay,
    isPolarNight,
    atmosphericRefractionDegrees: 0.5667,
    solarSemiDiameterDegrees: 0.2667,
    standardZenithDegrees: 90.8333,
  };
}

// --- Vedic Daytime Muhurtas ---

/**
 * Calculates Rahu Kaal, Yamaganda, Gulika Kaal, Abhijit Muhurta, and Brahma Muhurta
 */
export function calculateDayMuhurtas(
  year: number,
  month: number,
  day: number,
  latitude: number,
  longitude: number,
  timezoneOffset: number
): DayMuhurtas {
  const solar = calculateSolarEvents(year, month, day, latitude, longitude, timezoneOffset);

  // Determine weekday: 0=Sunday, 1=Monday, ..., 6=Saturday
  const jdNoon = calculateJulianDay(year, month, day, 12, 0, 0);
  const weekday = Math.floor(jdNoon + 1.5) % 7;
  const weekdayName = WEEKDAYS[weekday];

  if (solar.isPolarDay || solar.isPolarNight) {
    return {
      conventionVersion:'legacy-day-eighths-fixed-brahma-v1',traditionalRuleApproval:'UNAPPROVED',
      date: solar.date,
      weekday,
      weekdayName,
      sunriseLocal: solar.sunriseLocal,
      sunsetLocal: solar.sunsetLocal,
      rahuKaal: { startLocal: 'UNAVAILABLE_POLAR', endLocal: 'UNAVAILABLE_POLAR', segmentNumber: 0 },
      yamaganda: { startLocal: 'UNAVAILABLE_POLAR', endLocal: 'UNAVAILABLE_POLAR', segmentNumber: 0 },
      gulikaKaal: { startLocal: 'UNAVAILABLE_POLAR', endLocal: 'UNAVAILABLE_POLAR', segmentNumber: 0 },
      abhijitMuhurta: { startLocal: 'UNAVAILABLE_POLAR', endLocal: 'UNAVAILABLE_POLAR', isAuspiciousToday: false, caveat: 'Polar solar conditions' },
      brahmaMuhurta: { startLocal: 'UNAVAILABLE_POLAR', endLocal: 'UNAVAILABLE_POLAR' },
    };
  }

  // Parse sunrise and sunset local times into minutes from midnight
  const parseLocalMinutes = (timeStr: string) => {
    const [h, m, s] = timeStr.split(':').map(Number);
    return h * 60 + m + s / 60;
  };

  const formatMinutesToLocal = (minutes: number) => {
    const seconds=((Math.round(minutes*60)%86400)+86400)%86400;
    const h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=seconds%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const riseMin = parseLocalMinutes(solar.sunriseLocal);
  const setMin = parseLocalMinutes(solar.sunsetLocal);
  const daylightMinutes = setMin >= riseMin ? setMin - riseMin : 1440 - riseMin + setMin;

  // Ashtama Bhaga: 8 equal segments of daytime
  const segmentDuration = daylightMinutes / 8.0;

  // Rahu Kaal 1-indexed segment lookup by weekday (0=Sun, 1=Mon, ..., 6=Sat)
  // Sunday: 8th, Monday: 2nd, Tuesday: 7th, Wednesday: 5th, Thursday: 6th, Friday: 4th, Saturday: 3rd
  const rahuSegments = [8, 2, 7, 5, 6, 4, 3];
  const rahuSeg = rahuSegments[weekday];
  const rahuStart = riseMin + (rahuSeg - 1) * segmentDuration;
  const rahuEnd = riseMin + rahuSeg * segmentDuration;

  // Yamaganda segment lookup
  // Sunday: 5th, Monday: 4th, Tuesday: 3rd, Wednesday: 2nd, Thursday: 1st, Friday: 7th, Saturday: 6th
  const yamaSegments = [5, 4, 3, 2, 1, 7, 6];
  const yamaSeg = yamaSegments[weekday];
  const yamaStart = riseMin + (yamaSeg - 1) * segmentDuration;
  const yamaEnd = riseMin + yamaSeg * segmentDuration;

  // Gulika segment lookup
  // Sunday: 7th, Monday: 6th, Tuesday: 5th, Wednesday: 4th, Thursday: 3rd, Friday: 2nd, Saturday: 1st
  const gulikaSegments = [7, 6, 5, 4, 3, 2, 1];
  const gulikaSeg = gulikaSegments[weekday];
  const gulikaStart = riseMin + (gulikaSeg - 1) * segmentDuration;
  const gulikaEnd = riseMin + gulikaSeg * segmentDuration;

  // Abhijit Muhurta: 8th Muhurta of 15 daytime muhurtas
  const muhurtaDuration = daylightMinutes / 15.0;
  const abhijitStart = riseMin + 7 * muhurtaDuration;
  const abhijitEnd = riseMin + 8 * muhurtaDuration;
  // Traditional rule: Abhijit is not recommended on Wednesday (Budhavaar) as Rahu Kaal overlaps
  const isAbhijitAuspicious = weekday !== 3;
  const abhijitCaveat =
    weekday === 3
      ? 'Legacy Wednesday exclusion; traditional source/interpretation requires owner review. Not verified guidance.'
      : 'Legacy conventional interval only; no empirical predictive validity or approved activity rule.';

  // Brahma Muhurta: 2 Muhurtas (96 min to 48 min) before sunrise (48 minutes duration)
  const brahmaStart = riseMin - 96;
  const brahmaEnd = riseMin - 48;

  return {
    conventionVersion:'legacy-day-eighths-fixed-brahma-v1',traditionalRuleApproval:'UNAPPROVED',
    date: solar.date,
    weekday,
    weekdayName,
    sunriseLocal: solar.sunriseLocal,
    sunsetLocal: solar.sunsetLocal,
    rahuKaal: {
      startLocal: formatMinutesToLocal(rahuStart),
      endLocal: formatMinutesToLocal(rahuEnd),
      segmentNumber: rahuSeg,
    },
    yamaganda: {
      startLocal: formatMinutesToLocal(yamaStart),
      endLocal: formatMinutesToLocal(yamaEnd),
      segmentNumber: yamaSeg,
    },
    gulikaKaal: {
      startLocal: formatMinutesToLocal(gulikaStart),
      endLocal: formatMinutesToLocal(gulikaEnd),
      segmentNumber: gulikaSeg,
    },
    abhijitMuhurta: {
      startLocal: formatMinutesToLocal(abhijitStart),
      endLocal: formatMinutesToLocal(abhijitEnd),
      isAuspiciousToday: isAbhijitAuspicious,
      caveat: abhijitCaveat,
    },
    brahmaMuhurta: {
      startLocal: formatMinutesToLocal(brahmaStart),
      endLocal: formatMinutesToLocal(brahmaEnd),
    },
  };
}

// --- Tithi, Yoga, Karana Calculations ---

/**
 * Calculates current Tithi from Moon and Sun sidereal or tropical longitudes
 * Convention: Tithi is derived from the difference (Moon - Sun) mod 360 divided by 12°
 */
export function calculateTithi(moonLongitude: number, sunLongitude: number): TithiInfo {
  if(![moonLongitude,sunLongitude].every(Number.isFinite))throw new CalculationInputError('INVALID_LONGITUDE','Supply finite angular values.');
  const diffAngle = ((moonLongitude - sunLongitude) % 360 + 360) % 360;
  const tithiIndex = Math.floor(diffAngle / 12.0); // Half-open intervals: exact180° starts Krishna Pratipada.
  const paksha: 'Shukla' | 'Krishna' = tithiIndex < 15 ? 'Shukla' : 'Krishna';
  const numberInPaksha = (tithiIndex % 15) + 1; // 1 to 15

  let name = TITHI_NAMES[numberInPaksha - 1];
  if (paksha === 'Krishna' && numberInPaksha === 15) {
    name = 'Amavasya';
  } else if (paksha === 'Shukla' && numberInPaksha === 15) {
    name = 'Purnima';
  }

  const elapsedDegrees = diffAngle % 12.0;
  const remainingDegrees = 12.0 - elapsedDegrees;
  const fractionElapsed = elapsedDegrees / 12.0;

  return {
    index: tithiIndex,
    numberInPaksha,
    paksha,
    name,
    fullName: `${paksha} ${name}`,
    elapsedDegreesInTithi: Number(elapsedDegrees.toFixed(4)),
    remainingDegreesInTithi: Number(remainingDegrees.toFixed(4)),
    fractionElapsed: Number(fractionElapsed.toFixed(4)),
    isFullMoon: paksha === 'Shukla' && numberInPaksha === 15,
    isNewMoon: paksha === 'Krishna' && numberInPaksha === 15,
  };
}

/**
 * Calculates current Yoga from Sun and Moon sidereal longitudes
 * Convention: (Sun + Moon) mod 360 divided by (360 / 27) = 13°20'
 */
export function calculateYoga(sunLongitudeSidereal: number, moonLongitudeSidereal: number): YogaInfo {
  if(![sunLongitudeSidereal,moonLongitudeSidereal].every(Number.isFinite))throw new CalculationInputError('INVALID_LONGITUDE','Supply finite angular values.');
  const sumAngle = ((sunLongitudeSidereal + moonLongitudeSidereal) % 360 + 360) % 360;
  const yogaStep = 360.0 / 27.0; // 13.333333°
  const yogaIndex = Math.floor(sumAngle / yogaStep); // 0 to 26
  const yogaNumber = yogaIndex + 1;
  const name = YOGA_NAMES[yogaIndex];

  const elapsedDegrees = sumAngle % yogaStep;
  const remainingDegrees = yogaStep - elapsedDegrees;

  let nature: 'Auspicious' | 'Inauspicious' | 'Neutral' = 'Auspicious';
  if (INAUSPICIOUS_YOGAS.includes(name)) {
    nature = 'Inauspicious';
  }

  return {
    index: yogaIndex,
    number: yogaNumber,
    name,
    elapsedDegrees: Number(elapsedDegrees.toFixed(4)),
    remainingDegrees: Number(remainingDegrees.toFixed(4)),
    nature,interpretationStatus:'TRADITIONAL_UNAPPROVED',
  };
}

/**
 * Calculates current Karana from Moon and Sun longitudes
 * Convention: Half-Tithi of 6°
 */
export function calculateKarana(moonLongitude: number, sunLongitude: number): KaranaInfo {
  if(![moonLongitude,sunLongitude].every(Number.isFinite))throw new CalculationInputError('INVALID_LONGITUDE','Supply finite angular values.');
  const diffAngle = ((moonLongitude - sunLongitude) % 360 + 360) % 360;
  const karanaIndex = Math.floor(diffAngle / 6.0); // 0 to 59

  let name = '';
  let type: 'Movable' | 'Fixed' = 'Movable';

  if (karanaIndex === 0) {
    name = 'Kintughna'; // Fixed #4 (Shukla Pratipada 1st half)
    type = 'Fixed';
  } else if (karanaIndex >= 1 && karanaIndex <= 56) {
    const cycle = (karanaIndex - 1) % 7;
    name = MOVABLE_KARANAS[cycle];
    type = 'Movable';
  } else if (karanaIndex === 57) {
    name = 'Shakuni'; // Fixed #1 (Krishna Chaturdashi 2nd half)
    type = 'Fixed';
  } else if (karanaIndex === 58) {
    name = 'Chatushpada'; // Fixed #2 (Amavasya 1st half)
    type = 'Fixed';
  } else if (karanaIndex === 59) {
    name = 'Naga'; // Fixed #3 (Amavasya 2nd half)
    type = 'Fixed';
  }

  const elapsedDegrees = diffAngle % 6.0;
  const remainingDegrees = 6.0 - elapsedDegrees;

  // Vishti (Bhadra) is traditionally considered inauspicious for auspicious activities
  let nature: 'Auspicious' | 'Inauspicious' | 'Neutral' = 'Auspicious';
  if (name === 'Vishti') {
    nature = 'Inauspicious';
  } else if (type === 'Fixed') {
    nature = 'Neutral';
  }

  return {
    index: karanaIndex,
    name,
    type,
    elapsedDegrees: Number(elapsedDegrees.toFixed(4)),
    remainingDegrees: Number(remainingDegrees.toFixed(4)),
    nature,interpretationStatus:'TRADITIONAL_UNAPPROVED',
  };
}

// --- Bounded numerical solver; solver tolerance is not astronomical accuracy ---

/**
 * Numerical crossing solver for the supplied angular function. Samples at most
 * seven days in half-hour steps, unwraps each short arc, and bisects an actual
 * crossing. Numerical tolerance never establishes model accuracy. A missing or
 * discontinuous bracket throws rather than returning an invented timestamp.
 */
export function findTransitionInstant(
  startJD: number,
  targetAngleDegrees: number,
  angleFunction: (jd: number) => number,
  maxHoursSearch: number = 36.0,
  convergenceToleranceDays: number = 1e-5
): {transitionJD:number;converged:boolean;iterations:number;residualDegrees:number;bracketWidthDays:number} {
  if(!Number.isFinite(startJD)||!Number.isFinite(targetAngleDegrees)||!Number.isFinite(maxHoursSearch)||maxHoursSearch<=0||maxHoursSearch>168||!Number.isFinite(convergenceToleranceDays)||convergenceToleranceDays<1e-9||convergenceToleranceDays>1/24)throw new CalculationInputError('INVALID_TRANSITION_OPTIONS','Supply bounded finite transition options.');
  const normalize=(v:number)=>((v%360)+360)%360;
  const sample=(jd:number)=>{const v=angleFunction(jd);if(!Number.isFinite(v))throw new CalculationInputError('INVALID_ANGULAR_SAMPLE','The angular model returned an invalid value.');return normalize(v);};
  const delta=(a:number,b:number)=>((b-a+540)%360)-180;
  const target=normalize(targetAngleDegrees),step=0.5/24,end=startJD+maxHoursSearch/24;
  let a=startJD,rawA=sample(a),unwrappedA=rawA;
  const initialResidual=delta(target,rawA);
  if(Math.abs(initialResidual)<1e-12)return {transitionJD:startJD,converged:true,iterations:0,residualDegrees:initialResidual,bracketWidthDays:0};
  while(a<end){
    const b=Math.min(a+step,end),rawB=sample(b),arc=delta(rawA,rawB);
    if(Math.abs(arc)>=90)throw new CalculationInputError('UNRESOLVED_ANGULAR_DISCONTINUITY','The angular function changes too quickly for the bounded search grid.');
    const unwrappedB=unwrappedA+arc;
    const min=Math.min(unwrappedA,unwrappedB),max=Math.max(unwrappedA,unwrappedB);
    const level=target+360*Math.ceil((min-target)/360);
    if(arc!==0&&level>=min&&level<=max){
      let low=a,high=b,resLow=unwrappedA-level,iterations=0;
      while(high-low>convergenceToleranceDays&&iterations<64){
        const mid=(low+high)/2,rawMid=sample(mid),resMid=unwrappedA+delta(rawA,rawMid)-level;
        iterations++;
        if(resMid===0){low=mid;high=mid;break;}
        if(resLow*resMid<=0)high=mid;else{low=mid;resLow=resMid;}
      }
      if(high-low>convergenceToleranceDays)throw new CalculationInputError('TRANSITION_DID_NOT_CONVERGE','The numerical iteration limit was reached.');
      const transitionJD=(low+high)/2;
      return {transitionJD,converged:true,iterations,residualDegrees:delta(target,sample(transitionJD)),bracketWidthDays:high-low};
    }
    a=b;rawA=rawB;unwrappedA=unwrappedB;
  }
  throw new CalculationInputError('TRANSITION_NOT_BRACKETED','No transition was bracketed within the bounded search interval.');
}

/**
 * Calculates an unvalidated analytical Panchang preview for a specific instant and location
 */
export function calculateFullPanchang(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  latitude: number,
  longitude: number,
  timezoneOffset: number,
  ayanamsaType: AyanamsaType = AyanamsaType.TRUE_LAHIRI,
  solveTransitions: boolean = true
): PanchangReport {
  if(![hour,minute,second].every(Number.isInteger)||hour<0||hour>23||minute<0||minute>59||second<0||second>59)throw new CalculationInputError('INVALID_TIME','Supply a valid civil clock time.');
  // Nominal UTC JD for this analytical preview, not independently established UT1.
  const jdLocal = calculateJulianDay(year, month, day, hour, minute, second);
  const jdUT = jdLocal - timezoneOffset / 24.0;

  const ayanamsa = getAyanamsa(jdUT, ayanamsaType);

  // Tropical coordinates
  const sunData = calculateHighPrecisionSun(jdUT);
  const moonData = calculateHighPrecisionMoon(jdUT);

  // Sidereal coordinates (Lahiri)
  const sunSidereal = ((sunData.apparentLongitude - ayanamsa) % 360 + 360) % 360;
  const moonSidereal = ((moonData.tropicalLongitude - ayanamsa) % 360 + 360) % 360;

  // 1. Tithi
  const tithi = calculateTithi(moonSidereal, sunSidereal);

  // 2. Nakshatra & Pada
  const nakStep = 360.0 / 27.0; // 13.333333°
  const nakIndex = Math.floor(moonSidereal / nakStep);
  const nakName = NAKSHATRAS[nakIndex % 27];
  const nakElapsed = moonSidereal % nakStep;
  const nakRemaining = nakStep - nakElapsed;
  const pada = Math.floor(nakElapsed / (nakStep / 4.0)) + 1;

  // 3. Yoga
  const yoga = calculateYoga(sunSidereal, moonSidereal);

  // 4. Karana
  const karana = calculateKarana(moonSidereal, sunSidereal);

  // 5. Solar Events & Muhurtas
  const solarEvents = calculateSolarEvents(year, month, day, latitude, longitude, timezoneOffset);
  const muhurtas = calculateDayMuhurtas(year, month, day, latitude, longitude, timezoneOffset);

  // 6. Optional high-precision transition boundary solving
  let nextTithiTransition: TransitionBoundaryResult | undefined;
  let nextNakshatraTransition: TransitionBoundaryResult | undefined;

  if (solveTransitions) {
    // Next Tithi boundary is at next multiple of 12°
    const currentDiff = ((moonSidereal - sunSidereal) % 360 + 360) % 360;
    const targetTithiAngle = (Math.floor(currentDiff / 12.0) + 1) * 12.0;

    const tithiAngleFunc = (jd: number) => {
      const ay = getAyanamsa(jd, ayanamsaType);
      const s = ((calculateHighPrecisionSun(jd).apparentLongitude - ay) % 360 + 360) % 360;
      const m = ((calculateHighPrecisionMoon(jd).tropicalLongitude - ay) % 360 + 360) % 360;
      return ((m - s) % 360 + 360) % 360;
    };

    const tithiSol = findTransitionInstant(jdUT, targetTithiAngle % 360, tithiAngleFunc, 36.0);
    const tithiSecondsDiff = (tithiSol.transitionJD - jdUT) * 86400;

    nextTithiTransition = {
      transitionName: 'Tithi Transition',
      currentValue: tithi.fullName,
      nextValue: calculateTithi((targetTithiAngle+1e-8)%360,0).fullName,
      targetAngleDegrees: targetTithiAngle % 360,
      transitionInstantUTC: new Date((tithiSol.transitionJD-2440587.5)*86400000).toISOString(),
      transitionJulianDayUT: tithiSol.transitionJD,
      secondsFromSearchEpoch: Math.round(tithiSecondsDiff),
      converged: tithiSol.converged,
      iterations: tithiSol.iterations,
      angularResidualDegrees: tithiSol.residualDegrees,
      numericalToleranceSeconds:0.864,bracketWidthSeconds:tithiSol.bracketWidthDays*86400,astronomicalAccuracySeconds:null,
    };

    // Next Nakshatra boundary is at next multiple of 13°20'
    const targetNakAngle = (Math.floor(moonSidereal / nakStep) + 1) * nakStep;
    const nakAngleFunc = (jd: number) => {
      const ay = getAyanamsa(jd, ayanamsaType);
      return ((calculateHighPrecisionMoon(jd).tropicalLongitude - ay) % 360 + 360) % 360;
    };

    const nakSol = findTransitionInstant(jdUT, targetNakAngle % 360, nakAngleFunc, 36.0);
    const nakSecondsDiff = (nakSol.transitionJD - jdUT) * 86400;

    nextNakshatraTransition = {
      transitionName: 'Nakshatra Transition',
      currentValue: nakName,
      nextValue: NAKSHATRAS[(nakIndex + 1) % 27],
      targetAngleDegrees: targetNakAngle % 360,
      transitionInstantUTC: new Date((nakSol.transitionJD-2440587.5)*86400000).toISOString(),
      transitionJulianDayUT: nakSol.transitionJD,
      secondsFromSearchEpoch: Math.round(nakSecondsDiff),
      converged: nakSol.converged,
      iterations: nakSol.iterations,
      angularResidualDegrees: nakSol.residualDegrees,
      numericalToleranceSeconds:0.864,bracketWidthSeconds:nakSol.bracketWidthDays*86400,astronomicalAccuracySeconds:null,
    };
  }

  const civil=new Date(0);civil.setUTCFullYear(year,month-1,day);civil.setUTCHours(hour,minute,second,0);
  const isoUTC = new Date(civil.getTime() - timezoneOffset * 3600000).toISOString();

  return {
    calculationMode:'ANALYTICAL_APPROXIMATION',independentValidationStatus:'NOT_PERFORMED',timingGuidanceAuthorized:false,supportedPrecision:'UNVERIFIED',limitations:['Legacy analytical coordinates, not the native Swiss authority.','Nominal UTC is used as UT1 without DUT1; no independent astronomical accuracy has been established.','Solver convergence bounds numerical search only; traditional interval interpretations remain unapproved.'],
    timestampUTC: isoUTC,
    julianDayUT: Number(jdUT.toFixed(6)),
    ayanamsaType,
    ayanamsaValue: Number(ayanamsa.toFixed(6)),
    sunLongitudeSidereal: Number(sunSidereal.toFixed(4)),
    moonLongitudeSidereal: Number(moonSidereal.toFixed(4)),
    sunLongitudeTropical: Number(sunData.apparentLongitude.toFixed(4)),
    moonLongitudeTropical: Number(moonData.tropicalLongitude.toFixed(4)),
    tithi,
    nakshatra: {
      index: nakIndex % 27,
      name: nakName,
      pada,
      elapsedDegrees: Number(nakElapsed.toFixed(4)),
      remainingDegrees: Number(nakRemaining.toFixed(4)),
    },
    yoga,
    karana,
    solarEvents,
    muhurtas,
    nextTithiTransition,
    nextNakshatraTransition,
  };
}
