import { AyanamsaType, NAKSHATRAS, checkBoundaryProximity, getAyanamsa } from '../src/engine/astroMath';
import {
  moonSun,
  norm360,
  solarTimes,
} from '../src/engine/planetaryEphemeris';
import {
  TIMING_RULE_VERSION,
  TIMING_VERSION,
  type TimingActivity,
  type TimingRequest,
  type TimingResult,
  type TimingWindow,
} from '../src/engine/timingClient';
import { resolveIanaTimezone } from '../src/engine/timezoneResolver';
import { HighPrecisionAstroEngine } from '../src/engine/zeroCostAstroEngine';

export interface DailyTimingGatePolicy {
  /** Flip to true ONLY after ~100 city-date reference exit tests, CI tolerance gate, and Jyotishi rule sign-off. */
  releaseAuthorized: boolean;
  /** Separate gate for personalized Tara Bala: requires Moon/Nakshatra ephemeris exit test to pass first. */
  taraBalaAuthorized: boolean;
  /** Pre-authorization QA / CI tolerance evaluation mode: computes real windows labeled PROVISIONAL with release_authorized: false. */
  provisionalEvaluationMode?: boolean;
}

export interface DayPartDiagnostics {
  sunriseUtc: string;
  sunsetUtc: string;
  rahuKaal: { start: string; end: string };
  yamaganda: { start: string; end: string };
  gulikaKaal: { start: string; end: string };
  birthMoonSiderealDeg: number;
  birthNakshatra: string;
}

export interface ComputedDailyTimingOutcome {
  httpStatus: 200 | 503;
  body: TimingResult;
  diagnostics?: DayPartDiagnostics;
}

interface SecInterval {
  startSec: number;
  endSec: number;
}

interface TaggedInterval extends SecInterval {
  ruleId: string;
  explanation: string;
  priority: number;
}

const CHALDEAN_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'] as const;
const WEEKDAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;

const DAY_CHOGHADIYA: ReadonlyArray<ReadonlyArray<string>> = [
  ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg'], // Sunday
  ['Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit'], // Monday
  ['Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'],   // Tuesday
  ['Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh'], // Wednesday
  ['Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh'], // Thursday
  ['Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char'],   // Friday
  ['Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal'],   // Saturday
];

const NIGHT_CHOGHADIYA: ReadonlyArray<ReadonlyArray<string>> = [
  ['Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh'], // Sunday
  ['Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char'],   // Monday
  ['Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal'],   // Tuesday
  ['Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg'], // Wednesday
  ['Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit'], // Thursday
  ['Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog'],   // Friday
  ['Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh'],   // Saturday
];

// 1-indexed Ashtabhaga daytime segment (out of 8) for Sun..Sat
const RAHU_KAAL_SEGMENT = [8, 2, 7, 5, 6, 4, 3] as const;
const YAMAGANDA_SEGMENT = [5, 4, 3, 2, 1, 7, 6] as const;
const GULIKA_SEGMENT = [7, 6, 5, 4, 3, 2, 1] as const;

const TITHI_LABELS = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
] as const;

const YOGA_LABELS = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula',
  'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
] as const;

const TARA_NAMES = [
  'Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyak', 'Sadhana', 'Naidhana', 'Mitra', 'Parama Mitra',
] as const;

const ACTIVITY_FAVORABLE_HORAS: Record<TimingActivity, ReadonlyArray<string>> = {
  work: ['Sun', 'Jupiter', 'Mercury', 'Venus'],
  purchases: ['Venus', 'Jupiter', 'Moon', 'Mercury'],
  travel: ['Moon', 'Venus', 'Mercury', 'Jupiter'],
  learning: ['Mercury', 'Jupiter', 'Moon', 'Venus'],
  family: ['Venus', 'Jupiter', 'Moon'],
  finance: ['Jupiter', 'Venus', 'Mercury'],
};

const ACTIVITY_PREFERRED_CHOGHADIYAS: Record<TimingActivity, ReadonlyArray<string>> = {
  work: ['Amrit', 'Shubh', 'Labh'],
  purchases: ['Amrit', 'Shubh', 'Labh', 'Char'],
  travel: ['Char', 'Amrit', 'Shubh', 'Labh'],
  learning: ['Amrit', 'Shubh', 'Labh'],
  family: ['Amrit', 'Shubh', 'Labh'],
  finance: ['Labh', 'Amrit', 'Shubh'],
};

function secToIsoUtc(sec: number): string {
  return new Date(sec * 1000).toISOString().replace('.000Z', 'Z');
}

function jdUtFromEpochSec(sec: number): number {
  return sec / 86400.0 + 2440587.5;
}

function siderealSunAndMoonAtSec(sec: number): { sunSid: number; moonSid: number } {
  const jdUT = jdUtFromEpochSec(sec);
  const ms = moonSun(jdUT);
  const ayanamsa = getAyanamsa(jdUT, AyanamsaType.TRUE_LAHIRI);
  return {
    sunSid: norm360(ms.sunTropicalDeg - ayanamsa),
    moonSid: norm360(ms.moonTropicalDeg - ayanamsa),
  };
}

function shiftDateStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function weekdayIndexInZone(epochSec: number, timeZone: string): number {
  const shortDay = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date(epochSec * 1000));
  const idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(shortDay);
  return idx >= 0 ? idx : new Date(epochSec * 1000).getUTCDay();
}

function clipInterval(iv: SecInterval, minSec: number, maxSec: number): SecInterval | null {
  const startSec = Math.max(minSec, iv.startSec);
  const endSec = Math.min(maxSec, iv.endSec);
  return startSec < endSec ? { startSec, endSec } : null;
}

function subtractIntervals(base: SecInterval[], exclusions: SecInterval[]): SecInterval[] {
  let current = base.filter((b) => b.startSec < b.endSec);
  for (const ex of exclusions) {
    if (ex.startSec >= ex.endSec) continue;
    const next: SecInterval[] = [];
    for (const seg of current) {
      if (ex.endSec <= seg.startSec || ex.startSec >= seg.endSec) {
        next.push(seg);
      } else {
        if (ex.startSec > seg.startSec) {
          next.push({ startSec: seg.startSec, endSec: ex.startSec });
        }
        if (ex.endSec < seg.endSec) {
          next.push({ startSec: ex.endSec, endSec: seg.endSec });
        }
      }
    }
    current = next;
  }
  return current;
}

function subdivideSpan(startSec: number, endSec: number, parts: number): SecInterval[] {
  const span = endSec - startSec;
  const out: SecInterval[] = [];
  for (let i = 0; i < parts; i++) {
    const a = startSec + Math.round((span * i) / parts);
    const b = i === parts - 1 ? endSec : startSec + Math.round((span * (i + 1)) / parts);
    if (a < b) out.push({ startSec: a, endSec: b });
  }
  return out;
}

function karanaNameFromIndex(idx0To59: number): string {
  const k = Math.min(59, Math.max(0, idx0To59));
  if (k === 0) return 'Kintughna';
  if (k >= 1 && k <= 56) {
    return ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'][(k - 1) % 7];
  }
  if (k === 57) return 'Shakuni';
  if (k === 58) return 'Chatushpada';
  return 'Naga';
}

function panchangaStateAtSec(sec: number): {
  tithiIdx: number;
  nakshatraIdx: number;
  yogaIdx: number;
  karanaIdx: number;
} {
  const { sunSid, moonSid } = siderealSunAndMoonAtSec(sec);
  const elongation = norm360(moonSid - sunSid);
  const sumLon = norm360(moonSid + sunSid);
  return {
    tithiIdx: Math.min(29, Math.floor(elongation / 12.0)),
    nakshatraIdx: Math.min(26, Math.floor(moonSid / (360.0 / 27.0))),
    yogaIdx: Math.min(26, Math.floor(sumLon / (360.0 / 27.0))),
    karanaIdx: Math.min(59, Math.floor(elongation / 6.0)),
  };
}

function refineStateBoundarySec(loSec: number, hiSec: number): number {
  let lo = loSec;
  let hi = hiSec;
  const base = panchangaStateAtSec(lo);
  const same = (s: ReturnType<typeof panchangaStateAtSec>) =>
    s.tithiIdx === base.tithiIdx &&
    s.nakshatraIdx === base.nakshatraIdx &&
    s.yogaIdx === base.yogaIdx &&
    s.karanaIdx === base.karanaIdx;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (same(panchangaStateAtSec(mid))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return hi;
}

/**
 * Computes real Panchang + Planetary Hora + Choghadiya + Natal Tara Bala windows across
 * the target city's exact local day (`00:00` to next `00:00` in IANA timezone, handling 23h/24h/25h DST days).
 *
 * Strictly enforces `DailyTimingGatePolicy`:
 * - Returns HTTP 503 (`CORE_P0_01_NOT_VERIFIED`, 0 windows) when both `releaseAuthorized` and `provisionalEvaluationMode` are false.
 * - Returns HTTP 503 (`TARA_BALA_MOON_EXIT_TEST_REQUIRED`, 0 windows) if `taraBalaAuthorized` is false.
 */
export function calculateRealDailyTimingWindows(
  req: TimingRequest,
  gate: DailyTimingGatePolicy,
  now: Date = new Date()
): ComputedDailyTimingOutcome {
  // Enforce strict IANA-only validation (`analyzeFullDayStrict`) on the target date, coordinates, and IANA zone
  const strictTargetDay = HighPrecisionAstroEngine.analyzeFullDayStrict(req.target.date, {
    latitude: req.target.latitude,
    longitude: req.target.longitude,
    timezone: req.target.timezone,
  });
  const bounds = strictTargetDay.localDayBounds;
  const dayStartSec = Math.round(bounds.startUtcMs / 1000);
  const dayEndSec = Math.round(bounds.endUtcMs / 1000);

  const dayContract = {
    date: req.target.date,
    timezone: req.target.timezone,
    start: secToIsoUtc(dayStartSec),
    end: secToIsoUtc(dayEndSec),
    elapsed_seconds: dayEndSec - dayStartSec,
  };

  const baseLimitations = [
    'Traditional Muhurat classifications (Panchang, Hora, Choghadiya, Tara Bala) are cultural time-selection conventions, not empirically validated predictions or guarantees of outcome.',
    ...(req.activity === 'finance'
      ? ['Financial categories provide traditional context only, with no guaranteed profit, investment advantage or scientific predictive claim.']
      : []),
  ];

  const makeBlocked = (
    status: 'UNAVAILABLE' | 'INSUFFICIENT_EVIDENCE',
    code: string,
    extraLimitations: string[] = []
  ): ComputedDailyTimingOutcome => ({
    httpStatus: 503,
    body: {
      schema_version: 1,
      status,
      code,
      activity: req.activity,
      day: dayContract,
      windows: [],
      limitations: [...extraLimitations, ...baseLimitations],
      provenance: {
        calculation_version: TIMING_VERSION,
        rule_version: TIMING_RULE_VERSION,
        ephemeris_mode: 'UNAVAILABLE',
        requested_ephemeris_mode: req.ephemeris_mode,
        source: 'GATED_TIMING_ENGINE',
        calculated_at: now.toISOString(),
        accuracy_status: 'NOT_VERIFIED',
        release_authorized: false,
      },
    },
  });

  // 1. Birth-time certainty check (applies in both gated and open modes)
  if (req.birth.certainty !== 'EXACT' || !req.birth.time) {
    return makeBlocked(
      'INSUFFICIENT_EVIDENCE',
      'BIRTH_TIME_EVIDENCE_INSUFFICIENT',
      ['Exact recorded birth time is required to determine natal Janma Nakshatra and Tara Bala without unverified guessing.']
    );
  }

  // 2. Resolve historical/DST birth instant in IANA timezone (throws 422 CalculationInputError on spring gap or un-disambiguated fall fold)
  const birthResolved = resolveIanaTimezone(
    req.birth.date,
    req.birth.time,
    req.birth.timezone,
    req.birth.utc_offset
  );

  // 3. Production Gate Check
  if (!gate.releaseAuthorized && !gate.provisionalEvaluationMode) {
    return makeBlocked(
      'UNAVAILABLE',
      'CORE_P0_01_NOT_VERIFIED',
      ['Personalized guidance requires independently verified ~100 city-date reference exit tests, CI tolerance verification, and Jyotishi rule sign-off.']
    );
  }

  // 4. Separate Moon / Tara Bala Exit-Test Gate Check
  if (!gate.taraBalaAuthorized) {
    return makeBlocked(
      'UNAVAILABLE',
      'TARA_BALA_MOON_EXIT_TEST_REQUIRED',
      ['Personalized Tara Bala is withheld until lunar longitude and Nakshatra boundary accuracy pass independent ephemeris exit testing.']
    );
  }

  // 5. Natal Moon Sidereal Longitude & Nakshatra Boundary Proximity Check (±0.05° = 3 arcminutes)
  const birthEpochSec = Math.round(Date.parse(birthResolved.isoUtc) / 1000);
  const { moonSid: birthMoonSid } = siderealSunAndMoonAtSec(birthEpochSec);
  const nakStep = 360.0 / 27.0;
  const nakProximity = checkBoundaryProximity(birthMoonSid, nakStep, 0.05);
  if (nakProximity.isNearBoundary) {
    return makeBlocked(
      'INSUFFICIENT_EVIDENCE',
      'BIRTH_NAKSHATRA_BOUNDARY_AMBIGUOUS',
      [`Natal Moon (${birthMoonSid.toFixed(4)}°) lies within 0.05° of a Nakshatra boundary (${nakProximity.nearestBoundary.toFixed(4)}°); personalized Tara Bala refuses to guess across cusp tolerance.`]
    );
  }
  const birthNakshatraIdx = Math.min(26, Math.floor(birthMoonSid / nakStep));
  const birthNakshatraName = NAKSHATRAS[birthNakshatraIdx];

  // 6. Target-Day Solar Events (Prev Sunset, Target Sunrise & Sunset, Next Sunrise)
  const [ty, tm, td] = req.target.date.split('-').map(Number);
  const prevDateStr = shiftDateStr(req.target.date, -1);
  const nextDateStr = shiftDateStr(req.target.date, 1);
  const [py, pm, pd] = prevDateStr.split('-').map(Number);
  const [ny, nm, nd] = nextDateStr.split('-').map(Number);

  const solarPrev = solarTimes(py, pm, pd, req.target.latitude, req.target.longitude, 0);
  const solarTarget = solarTimes(ty, tm, td, req.target.latitude, req.target.longitude, 0);
  const solarNext = solarTimes(ny, nm, nd, req.target.latitude, req.target.longitude, 0);

  const isPolar = solarTarget.isPolarDay || solarTarget.isPolarNight || solarTarget.sunriseUtcMs === null || solarTarget.sunsetUtcMs === null;
  const sunriseSec = solarTarget.sunriseUtcMs !== null ? Math.round(solarTarget.sunriseUtcMs / 1000) : 0;
  const sunsetSec = solarTarget.sunsetUtcMs !== null ? Math.round(solarTarget.sunsetUtcMs / 1000) : 0;

  if (
    isPolar ||
    !(sunriseSec > dayStartSec && sunsetSec > sunriseSec && sunsetSec < dayEndSec)
  ) {
    return makeBlocked(
      'INSUFFICIENT_EVIDENCE',
      'SOLAR_EVENTS_UNAVAILABLE',
      ['Standard sunrise/sunset day-part divisions (Hora, Choghadiya, Rahu Kaal) are undefined when sunrise or sunset does not occur within the local date.']
    );
  }

  const prevSunsetSec = solarPrev.sunsetUtcMs === null
    ? sunriseSec - 12 * 3600
    : Math.min(sunriseSec - 3600, Math.round(solarPrev.sunsetUtcMs / 1000));
  const nextSunriseSec = solarNext.sunriseUtcMs === null
    ? sunsetSec + 12 * 3600
    : Math.max(sunsetSec + 3600, Math.round(solarNext.sunriseUtcMs / 1000));

  const targetWeekday = weekdayIndexInZone(sunriseSec + 60, req.target.timezone);
  const prevWeekday = (targetWeekday + 6) % 7;

  // 7. Daytime Ashtabhaga Exclusions (Rahu Kaal, Yamaganda, Gulika Kaal)
  const dayEighths = subdivideSpan(sunriseSec, sunsetSec, 8);
  const rahuIv = dayEighths[RAHU_KAAL_SEGMENT[targetWeekday] - 1];
  const yamaIv = dayEighths[YAMAGANDA_SEGMENT[targetWeekday] - 1];
  const gulikaIv = dayEighths[GULIKA_SEGMENT[targetWeekday] - 1];

  const exclusions: SecInterval[] = [rahuIv, yamaIv, gulikaIv];

  // 8. Choghadiya Partition across [dayStartSec, dayEndSec]
  const favorableChoghadiyas: TaggedInterval[] = [];
  const preferredChoghadiyaList = ACTIVITY_PREFERRED_CHOGHADIYAS[req.activity];

  const collectChoghadiya = (segments: SecInterval[], names: ReadonlyArray<string>, phaseLabel: string) => {
    segments.forEach((seg, idx) => {
      const clipped = clipInterval(seg, dayStartSec, dayEndSec);
      if (!clipped) return;
      const name = names[idx];
      if (name === 'Rog' || name === 'Kaal' || name === 'Udveg') {
        exclusions.push(clipped);
        return;
      }
      if (preferredChoghadiyaList.includes(name)) {
        const prio = name === 'Amrit' ? 3 : name === 'Shubh' || name === 'Labh' ? 2 : 1;
        favorableChoghadiyas.push({
          ...clipped,
          ruleId: `choghadiya-${name.toLowerCase()}-v1`,
          explanation: `Choghadiya (${TIMING_RULE_VERSION}): ${name} (${phaseLabel}) favorable for ${req.activity}.`,
          priority: prio,
        });
      } else {
        exclusions.push(clipped);
      }
    });
  };

  collectChoghadiya(subdivideSpan(prevSunsetSec, sunriseSec, 8), NIGHT_CHOGHADIYA[prevWeekday], 'pre-dawn night');
  collectChoghadiya(dayEighths, DAY_CHOGHADIYA[targetWeekday], 'daytime');
  collectChoghadiya(subdivideSpan(sunsetSec, nextSunriseSec, 8), NIGHT_CHOGHADIYA[targetWeekday], 'nighttime');

  // 9. Planetary Hora Partition (24 Chaldean Horas per Vedic Solar Day)
  const favorableHoras: TaggedInterval[] = [];
  const allowedHoraLords = ACTIVITY_FAVORABLE_HORAS[req.activity];

  const collectHoras = (dayRiseSec: number, daySetSec: number, nextRiseSec: number, wd: number) => {
    const startLord = WEEKDAY_LORD[wd];
    const startChaldeanIdx = CHALDEAN_ORDER.indexOf(startLord);
    const daySlots = subdivideSpan(dayRiseSec, daySetSec, 12);
    const nightSlots = subdivideSpan(daySetSec, nextRiseSec, 12);
    [...daySlots, ...nightSlots].forEach((slot, hIdx) => {
      const clipped = clipInterval(slot, dayStartSec, dayEndSec);
      if (!clipped) return;
      const lord = CHALDEAN_ORDER[(startChaldeanIdx + hIdx) % 7];
      if (allowedHoraLords.includes(lord)) {
        const rankIdx = allowedHoraLords.indexOf(lord);
        favorableHoras.push({
          ...clipped,
          ruleId: `hora-${lord.toLowerCase()}-v1`,
          explanation: `Planetary Hora (${TIMING_RULE_VERSION}): ${lord} Hora (#${hIdx + 1}/24) aligned with ${req.activity}.`,
          priority: rankIdx === 0 ? 3 : rankIdx === 1 ? 2 : 1,
        });
      } else {
        exclusions.push(clipped);
      }
    });
  };

  const prevRiseApproxSec = prevSunsetSec - (sunsetSec - sunriseSec);
  collectHoras(prevRiseApproxSec, prevSunsetSec, sunriseSec, prevWeekday);
  collectHoras(sunriseSec, sunsetSec, nextSunriseSec, targetWeekday);

  // 10. Panchang Shuddhi + Natal Tara Bala Partition across [dayStartSec, dayEndSec] (root-refined to 1s)
  const panchangaCutPoints: number[] = [dayStartSec];
  const stepSec = 900; // 15-minute bracket scan, bisected to 1-second exact transition
  let prevSampleSec = dayStartSec;
  let prevState = panchangaStateAtSec(dayStartSec);

  for (let s = dayStartSec + stepSec; s <= dayEndSec; s = Math.min(dayEndSec, s + stepSec)) {
    const curState = panchangaStateAtSec(s);
    if (
      curState.tithiIdx !== prevState.tithiIdx ||
      curState.nakshatraIdx !== prevState.nakshatraIdx ||
      curState.yogaIdx !== prevState.yogaIdx ||
      curState.karanaIdx !== prevState.karanaIdx
    ) {
      const boundarySec = refineStateBoundarySec(prevSampleSec, s);
      if (boundarySec > panchangaCutPoints[panchangaCutPoints.length - 1] && boundarySec < dayEndSec) {
        panchangaCutPoints.push(boundarySec);
      }
      prevState = curState;
    }
    prevSampleSec = s;
    if (s === dayEndSec) break;
  }
  panchangaCutPoints.push(dayEndSec);

  const favorablePanchangaTara: TaggedInterval[] = [];
  for (let i = 0; i < panchangaCutPoints.length - 1; i++) {
    const a = panchangaCutPoints[i];
    const b = panchangaCutPoints[i + 1];
    if (a >= b) continue;
    const midSec = Math.floor((a + b) / 2);
    const st = panchangaStateAtSec(midSec);

    const paksha = st.tithiIdx < 15 ? 'Shukla' : 'Krishna';
    const numInPaksha = (st.tithiIdx % 15) + 1;
    const tithiName = `${paksha} ${TITHI_LABELS[st.tithiIdx]}`;
    const isRiktaTithi = numInPaksha === 4 || numInPaksha === 9 || numInPaksha === 14;
    const isAmavasya = st.tithiIdx === 29;
    const karanaName = karanaNameFromIndex(st.karanaIdx);
    const isVishti = karanaName === 'Vishti';
    const yogaName = YOGA_LABELS[st.yogaIdx];
    const isSevereMaleficYoga = st.yogaIdx === 16 || st.yogaIdx === 26; // Vyatipata, Vaidhriti

    const transitNakName = NAKSHATRAS[st.nakshatraIdx];
    const taraIdx0To8 = ((st.nakshatraIdx - birthNakshatraIdx + 27) % 27) % 9;
    const taraNumber = taraIdx0To8 + 1;
    const taraName = TARA_NAMES[taraIdx0To8];
    const isMaleficTara =
      taraNumber === 3 || // Vipat
      taraNumber === 5 || // Pratyak
      taraNumber === 7 || // Naidhana
      (taraNumber === 1 && ['finance', 'purchases', 'travel'].includes(req.activity));

    if (isRiktaTithi || isAmavasya || isVishti || isSevereMaleficYoga || isMaleficTara) {
      exclusions.push({ startSec: a, endSec: b });
      continue;
    }

    const taraPrio = taraNumber === 2 || taraNumber === 4 || taraNumber === 6 || taraNumber === 9 ? 3 : 2;
    favorablePanchangaTara.push({
      startSec: a,
      endSec: b,
      ruleId: `panchang-shuddhi-v1|tara-bala-${taraName.toLowerCase().replace(/\s+/g, '-')}-v1`,
      explanation: `Panchang & Tara Bala (${TIMING_RULE_VERSION}): ${tithiName}, Transit ${transitNakName} (${taraName} Tara #${taraNumber} from natal ${birthNakshatraName}), ${yogaName} Yoga, ${karanaName} Karana; excludes Rahu/Yamaganda/Gulika & Vishti.`,
      priority: taraPrio,
    });
  }

  // 11. Intersect all 3 positive layers & subtract all exclusions on exact boundary grid
  const boundarySet = new Set<number>([dayStartSec, dayEndSec]);
  for (const list of [favorableChoghadiyas, favorableHoras, favorablePanchangaTara]) {
    for (const iv of list) {
      boundarySet.add(iv.startSec);
      boundarySet.add(iv.endSec);
    }
  }
  for (const ex of exclusions) {
    const c = clipInterval(ex, dayStartSec, dayEndSec);
    if (c) {
      boundarySet.add(c.startSec);
      boundarySet.add(c.endSec);
    }
  }

  const sortedBounds = Array.from(boundarySet).sort((x, y) => x - y);
  const clippedExclusions = exclusions
    .map((e) => clipInterval(e, dayStartSec, dayEndSec))
    .filter((e): e is SecInterval => e !== null);

  interface CandidateSlice {
    startSec: number;
    endSec: number;
    ruleIds: string[];
    explanations: string[];
    priority: number;
  }

  const rawSlices: CandidateSlice[] = [];

  for (let i = 0; i < sortedBounds.length - 1; i++) {
    const s = sortedBounds[i];
    const e = sortedBounds[i + 1];
    if (s >= e) continue;
    if (subtractIntervals([{ startSec: s, endSec: e }], clippedExclusions).length === 0) continue;

    const chog = favorableChoghadiyas.find((c) => c.startSec <= s && c.endSec >= e);
    const hora = favorableHoras.find((h) => h.startSec <= s && h.endSec >= e);
    const pan = favorablePanchangaTara.find((p) => p.startSec <= s && p.endSec >= e);
    if (!chog || !hora || !pan) continue;

    const ruleIds = Array.from(new Set([
      ...pan.ruleId.split('|'),
      chog.ruleId,
      hora.ruleId,
    ])).sort();

    const explanations = [pan.explanation, chog.explanation, hora.explanation];
    const priority = pan.priority + chog.priority + hora.priority;

    const prev = rawSlices[rawSlices.length - 1];
    if (
      prev &&
      prev.endSec === s &&
      prev.priority === priority &&
      prev.ruleIds.join(',') === ruleIds.join(',')
    ) {
      prev.endSec = e;
    } else {
      rawSlices.push({ startSec: s, endSec: e, ruleIds, explanations, priority });
    }
  }

  // Filter out slivers shorter than 15 minutes (900s) and rank deterministically
  const meaningful = rawSlices.filter((sl) => sl.endSec - sl.startSec >= 900);
  meaningful.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const durA = a.endSec - a.startSec;
    const durB = b.endSec - b.startSec;
    if (durA !== durB) return durB - durA;
    return a.startSec - b.startSec;
  });

  const isFullyAuthorized = gate.releaseAuthorized && gate.taraBalaAuthorized;
  const classification = isFullyAuthorized
    ? 'TRADITIONAL_FAVORABLE'
    : 'PROVISIONAL_TRADITIONAL_FAVORABLE';

  const windows: TimingWindow[] = meaningful.slice(0, 128).map((sl, idx) => ({
    start: secToIsoUtc(sl.startSec),
    end: secToIsoUtc(sl.endSec),
    duration_seconds: sl.endSec - sl.startSec,
    rank: idx + 1,
    rule_ids: sl.ruleIds,
    explanations: sl.explanations,
    classification,
  }));

  const status = isFullyAuthorized ? 'AUTHORIZED' : 'PROVISIONAL';
  const code = windows.length === 0
    ? 'NO_CANDIDATE_WINDOWS'
    : isFullyAuthorized
    ? 'TIMING_WINDOWS_AUTHORIZED'
    : 'PRE_AUTHORIZATION_ENGINE_PREVIEW';

  return {
    httpStatus: 200,
    body: {
      schema_version: 1,
      status,
      code,
      activity: req.activity,
      day: dayContract,
      windows,
      limitations: [
        ...(isFullyAuthorized
          ? []
          : ['Pre-authorization evaluation output: release_authorized remains false pending 100-city exit tests and Jyotishi sign-off.']),
        ...baseLimitations,
      ],
      provenance: {
        calculation_version: TIMING_VERSION,
        rule_version: TIMING_RULE_VERSION,
        ephemeris_mode: 'ANALYTICAL_VSOP87_ELP2000',
        requested_ephemeris_mode: req.ephemeris_mode,
        source: 'DAILY_TIMING_PANCHANG_HORA_CHOGHADIYA_TARABALA_V1',
        calculated_at: now.toISOString(),
        accuracy_status: isFullyAuthorized ? 'VERIFIED_RELEASE_AUTHORIZED' : 'PROVISIONAL_PRE_AUTHORIZATION',
        release_authorized: isFullyAuthorized,
      },
    },
    diagnostics: {
      sunriseUtc: secToIsoUtc(sunriseSec),
      sunsetUtc: secToIsoUtc(sunsetSec),
      rahuKaal: { start: secToIsoUtc(rahuIv.startSec), end: secToIsoUtc(rahuIv.endSec) },
      yamaganda: { start: secToIsoUtc(yamaIv.startSec), end: secToIsoUtc(yamaIv.endSec) },
      gulikaKaal: { start: secToIsoUtc(gulikaIv.startSec), end: secToIsoUtc(gulikaIv.endSec) },
      birthMoonSiderealDeg: Number(birthMoonSid.toFixed(4)),
      birthNakshatra: birthNakshatraName,
    },
  };
}
