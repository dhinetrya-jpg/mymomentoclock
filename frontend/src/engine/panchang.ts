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
import { moonSun, solarTimes } from './planetaryEphemeris';

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
  const ms = moonSun(jd);
  return {
    apparentLongitude: Number(ms.sunTropicalDeg.toFixed(6)),
    tropicalLongitude: Number(ms.sunGeometricDeg.toFixed(6)),
    rightAscension: Number(ms.sunRightAscensionDeg.toFixed(6)),
    declination: Number(ms.sunDeclinationDeg.toFixed(6)),
    equationOfTimeMinutes: Number(ms.equationOfTimeMinutes.toFixed(4)),
  };
}

/**
 * Computes apparent geocentric tropical lunar longitude via the unified 60-term Meeus Ch. 47
 * Table 47.A core (with ΔT = TT - UT, E/E² eccentricity scaling, A1/A2/L'-F perturbations, and IAU nutation).
 */
export function calculateHighPrecisionMoon(jd: number): {
  tropicalLongitude: number;
} {
  const ms = moonSun(jd);
  return {
    tropicalLongitude: Number(ms.moonTropicalDeg.toFixed(6)),
  };
}

// --- Solar Events (Sunrise, Sunset, Noon) ---

/**
 * Calculates apparent sunrise, sunset, and solar noon for a given civil date and location
 * via the unified `solarTimes(...)` core (standard zenith 90°50' + optional elevation dip).
 */
export function calculateSolarEvents(
  year: number,
  month: number,
  day: number,
  latitude: number,
  longitude: number,
  timezoneOffset: number,
  elevationMeters: number = 0
): SolarEventResult {
  const dateStr = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (!validGregorianDate(dateStr) || ![year, month, day].every(Number.isInteger)) {
    throw new CalculationInputError('INVALID_DATE', 'Supply an existing Gregorian date.');
  }
  if (
    ![latitude, longitude, timezoneOffset, elevationMeters].every(Number.isFinite) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    timezoneOffset < -12 ||
    timezoneOffset > 14
  ) {
    throw new CalculationInputError('INVALID_LOCATION', 'Supply finite coordinates and an explicit UTC offset.');
  }
  const approxNoonJD = calculateJulianDay(year, month, day, 12, 0, 0) - timezoneOffset / 24;
  const st = solarTimes(year, month, day, latitude, longitude, elevationMeters);

  const formatMsToTimes = (utcMs: number) => {
    const snapped = Math.round(utcMs / 1000) * 1000;
    const utc = new Date(snapped).toISOString();
    const local = new Date(snapped + Math.round(timezoneOffset * 3600) * 1000).toISOString().slice(11, 19);
    return { utc, local };
  };

  const noonTimes = formatMsToTimes(st.solarNoonUtcMs);
  const riseTimes = st.sunriseUtcMs !== null ? formatMsToTimes(st.sunriseUtcMs) : null;
  const setTimes = st.sunsetUtcMs !== null ? formatMsToTimes(st.sunsetUtcMs) : null;

  return {
    calculationMode: 'ANALYTICAL_APPROXIMATION',
    independentValidationStatus: 'NOT_PERFORMED',
    source: 'LEGACY_ANALYTICAL_PREVIEW',
    eventDatePolicy: 'UTC_ISO_WITH_DATE',
    date: dateStr,
    latitude,
    longitude,
    timezoneOffset,
    julianDayNoonUT: Number(approxNoonJD.toFixed(6)),
    solarNoonUTC: noonTimes.utc,
    sunriseUTC: st.isPolarNight ? 'POLAR_NIGHT' : st.isPolarDay || !riseTimes ? 'POLAR_DAY' : riseTimes.utc,
    sunsetUTC: st.isPolarDay ? 'POLAR_DAY' : st.isPolarNight || !setTimes ? 'POLAR_NIGHT' : setTimes.utc,
    sunriseLocal: st.isPolarNight ? 'POLAR_NIGHT' : st.isPolarDay || !riseTimes ? 'POLAR_DAY' : riseTimes.local,
    sunsetLocal: st.isPolarDay ? 'POLAR_DAY' : st.isPolarNight || !setTimes ? 'POLAR_NIGHT' : setTimes.local,
    dayLengthHours: st.dayLengthHours,
    isPolarDay: st.isPolarDay,
    isPolarNight: st.isPolarNight,
    atmosphericRefractionDegrees: 0.5667,
    solarSemiDiameterDegrees: 0.2667,
    standardZenithDegrees: Number((90.0 - st.horizonAltitudeDeg).toFixed(4)),
  };
}

// --- Vedic Daytime Muhurtas ---

export function calculateDayMuhurtas(
  year: number,
  month: number,
  day: number,
  latitude: number,
  longitude: number,
  timezoneOffset: number
): DayMuhurtas {
  const solar = calculateSolarEvents(year, month, day, latitude, longitude, timezoneOffset);

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

  const segmentDuration = daylightMinutes / 8.0;

  const rahuSegments = [8, 2, 7, 5, 6, 4, 3];
  const rahuSeg = rahuSegments[weekday];
  const rahuStart = riseMin + (rahuSeg - 1) * segmentDuration;
  const rahuEnd = riseMin + rahuSeg * segmentDuration;

  const yamaSegments = [5, 4, 3, 2, 1, 7, 6];
  const yamaSeg = yamaSegments[weekday];
  const yamaStart = riseMin + (yamaSeg - 1) * segmentDuration;
  const yamaEnd = riseMin + yamaSeg * segmentDuration;

  const gulikaSegments = [7, 6, 5, 4, 3, 2, 1];
  const gulikaSeg = gulikaSegments[weekday];
  const gulikaStart = riseMin + (gulikaSeg - 1) * segmentDuration;
  const gulikaEnd = riseMin + gulikaSeg * segmentDuration;

  const muhurtaDuration = daylightMinutes / 15.0;
  const abhijitStart = riseMin + 7 * muhurtaDuration;
  const abhijitEnd = riseMin + 8 * muhurtaDuration;
  const isAbhijitAuspicious = weekday !== 3;
  const abhijitCaveat =
    weekday === 3
      ? 'Legacy Wednesday exclusion; traditional source/interpretation requires owner review. Not verified guidance.'
      : 'Legacy conventional interval only; no empirical predictive validity or approved activity rule.';

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

export function calculateTithi(moonLongitude: number, sunLongitude: number): TithiInfo {
  if(![moonLongitude,sunLongitude].every(Number.isFinite))throw new CalculationInputError('INVALID_LONGITUDE','Supply finite angular values.');
  const diffAngle = ((moonLongitude - sunLongitude) % 360 + 360) % 360;
  const tithiIndex = Math.floor(diffAngle / 12.0);
  const paksha: 'Shukla' | 'Krishna' = tithiIndex < 15 ? 'Shukla' : 'Krishna';
  const numberInPaksha = (tithiIndex % 15) + 1;

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

export function calculateYoga(sunLongitudeSidereal: number, moonLongitudeSidereal: number): YogaInfo {
  if(![sunLongitudeSidereal,moonLongitudeSidereal].every(Number.isFinite))throw new CalculationInputError('INVALID_LONGITUDE','Supply finite angular values.');
  const sumAngle = ((sunLongitudeSidereal + moonLongitudeSidereal) % 360 + 360) % 360;
  const yogaStep = 360.0 / 27.0;
  const yogaIndex = Math.floor(sumAngle / yogaStep);
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

export function calculateKarana(moonLongitude: number, sunLongitude: number): KaranaInfo {
  if(![moonLongitude,sunLongitude].every(Number.isFinite))throw new CalculationInputError('INVALID_LONGITUDE','Supply finite angular values.');
  const diffAngle = ((moonLongitude - sunLongitude) % 360 + 360) % 360;
  const karanaIndex = Math.floor(diffAngle / 6.0);

  let name = '';
  let type: 'Movable' | 'Fixed' = 'Movable';

  if (karanaIndex === 0) {
    name = 'Kintughna';
    type = 'Fixed';
  } else if (karanaIndex >= 1 && karanaIndex <= 56) {
    const cycle = (karanaIndex - 1) % 7;
    name = MOVABLE_KARANAS[cycle];
    type = 'Movable';
  } else if (karanaIndex === 57) {
    name = 'Shakuni';
    type = 'Fixed';
  } else if (karanaIndex === 58) {
    name = 'Chatushpada';
    type = 'Fixed';
  } else if (karanaIndex === 59) {
    name = 'Naga';
    type = 'Fixed';
  }

  const elapsedDegrees = diffAngle % 6.0;
  const remainingDegrees = 6.0 - elapsedDegrees;

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
  const jdLocal = calculateJulianDay(year, month, day, hour, minute, second);
  const jdUT = jdLocal - timezoneOffset / 24.0;

  const ayanamsa = getAyanamsa(jdUT, ayanamsaType);

  const sunData = calculateHighPrecisionSun(jdUT);
  const moonData = calculateHighPrecisionMoon(jdUT);

  const sunSidereal = ((sunData.apparentLongitude - ayanamsa) % 360 + 360) % 360;
  const moonSidereal = ((moonData.tropicalLongitude - ayanamsa) % 360 + 360) % 360;

  const tithi = calculateTithi(moonSidereal, sunSidereal);

  const nakStep = 360.0 / 27.0;
  const nakIndex = Math.floor(moonSidereal / nakStep);
  const nakName = NAKSHATRAS[nakIndex % 27];
  const nakElapsed = moonSidereal % nakStep;
  const nakRemaining = nakStep - nakElapsed;
  const pada = Math.floor(nakElapsed / (nakStep / 4.0)) + 1;

  const yoga = calculateYoga(sunSidereal, moonSidereal);
  const karana = calculateKarana(moonSidereal, sunSidereal);

  const solarEvents = calculateSolarEvents(year, month, day, latitude, longitude, timezoneOffset);
  const muhurtas = calculateDayMuhurtas(year, month, day, latitude, longitude, timezoneOffset);

  let nextTithiTransition: TransitionBoundaryResult | undefined;
  let nextNakshatraTransition: TransitionBoundaryResult | undefined;

  if (solveTransitions) {
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
