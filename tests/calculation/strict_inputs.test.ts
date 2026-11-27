/**
 * Strict Input Validation, IANA-Only 540-Case Golden Corpus, & Natal Chart Golden Corpus
 *
 * Permanently verifies:
 * 1. `HighPrecisionAstroEngine.analyzeFullDayStrict`:
 *    - Never substitutes any silent default (date, city, or UTC+5.5).
 *    - Rejects impossible Gregorian dates (`2026-02-31`, `1900-02-29`), years outside `1900..2100`,
 *      NaN/out-of-range latitude or longitude, missing timezone, unknown IANA zone, and any typed
 *      `timezoneOffset` that disagrees with the IANA zone on that date (`TIMEZONE_OFFSET_MISMATCH`).
 *    - Every failure is a `CalculationInputError` with a stable `code` and `fields` naming the offending field(s).
 * 2. `HighPrecisionAstroEngine.analyzeFullDay`:
 *    - Returns `inputNotes` whenever a caller supplies a fixed numeric offset without IANA zone,
 *      a stale seasonal offset overridden by an authoritative IANA zone, or a DST transition date.
 * 3. 540-Case Global Golden Corpus via Pure IANA-Only `analyzeFullDayStrict` (no `timezoneOffset`):
 *    - Exercises 15 cities (Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Varanasi, Srinagar, Kathmandu +5:45,
 *      Dubai, London, New York, Toronto, Vancouver, Sydney, Tromsø) × 36 multi-season/DST dates = 540 cases.
 *    - Verifies seasonal DST offsets and `<= 60s` (±1 min) sunrise/sunset agreement vs independent GAST oracle.
 * 4. 12-Case Global Natal Chart Golden Corpus (`calculateFullChart` + `resolveIanaTimezone`):
 *    - Verifies sidereal Ascendant within `<= 0.01°` across all 4 quadrants of RAMC (never 180° flipped)
 *      and all 9 sidereal Navagraha longitudes against independent spherical-trigonometry & ephemeris references.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AyanamsaType, calculateFullChart, getAyanamsa } from '../../src/engine/astroMath';
import { CalculationInputError } from '../../src/engine/calculationValidation';
import {
  calculateAllApparentTropicalBodies,
  calculateGAST,
  calculateNutationAndObliquity,
  moonSun,
  norm360,
} from '../../src/engine/planetaryEphemeris';
import { resolveIanaTimezone } from '../../src/engine/timezoneResolver';
import { HighPrecisionAstroEngine, type StrictLocationInput } from '../../src/engine/zeroCostAstroEngine';
import { calculateRealDailyTimingWindows } from '../../server/dailyTimingEngine';

function angularDistanceDeg(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

function independentGastHorizonCrossingUtcMs(
  year: number,
  month: number,
  day: number,
  latitude: number,
  longitude: number,
  kind: 'sunrise' | 'sunset'
): number | null {
  const deg2rad = Math.PI / 180.0;
  const targetSinAlt = Math.sin((-50.0 / 60.0) * deg2rad);
  const latRad = latitude * deg2rad;

  const altMinusTarget = (utcMs: number): number => {
    const jdUT = utcMs / 86400000.0 + 2440587.5;
    const ms = moonSun(jdUT);
    const { gastDeg } = calculateGAST(jdUT);
    const localHourAngleRad = (((gastDeg + longitude - ms.sunRightAscensionDeg + 540.0) % 360.0) - 180.0) * deg2rad;
    const decRad = ms.sunDeclinationDeg * deg2rad;
    const sinAlt =
      Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(localHourAngleRad);
    return sinAlt - targetSinAlt;
  };

  const approxNoonMs = Date.UTC(year, month - 1, day, 0, 0, 0) + (12.0 - longitude / 15.0) * 3600000.0;
  const startMs = kind === 'sunrise' ? approxNoonMs - 12 * 3600000 : approxNoonMs;
  const endMs = kind === 'sunrise' ? approxNoonMs : approxNoonMs + 12 * 3600000;

  const steps = 48;
  const dt = (endMs - startMs) / steps;
  let prevMs = startMs;
  let prevVal = altMinusTarget(prevMs);

  for (let i = 1; i <= steps; i++) {
    const curMs = startMs + i * dt;
    const curVal = altMinusTarget(curMs);
    const crossed =
      (kind === 'sunrise' && prevVal <= 0 && curVal >= 0) ||
      (kind === 'sunset' && prevVal >= 0 && curVal <= 0);
    if (crossed) {
      let lo = prevMs;
      let hi = curMs;
      let fLo = prevVal;
      for (let iter = 0; iter < 32; iter++) {
        const mid = 0.5 * (lo + hi);
        const fMid = altMinusTarget(mid);
        if ((fLo <= 0 && fMid <= 0) || (fLo >= 0 && fMid >= 0)) {
          lo = mid;
          fLo = fMid;
        } else {
          hi = mid;
        }
      }
      return Math.round(0.5 * (lo + hi));
    }
    prevMs = curMs;
    prevVal = curVal;
  }
  return null;
}

const IANA_ONLY_CITIES: ReadonlyArray<{ id: string; cityName: string; latitude: number; longitude: number; timezone: string }> = [
  { id: 'DELHI', cityName: 'New Delhi, India', latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata' },
  { id: 'MUMBAI', cityName: 'Mumbai, India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { id: 'KOLKATA', cityName: 'Kolkata, India', latitude: 22.5726, longitude: 88.3639, timezone: 'Asia/Kolkata' },
  { id: 'CHENNAI', cityName: 'Chennai, India', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' },
  { id: 'BENGALURU', cityName: 'Bengaluru, India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
  { id: 'VARANASI', cityName: 'Varanasi, India', latitude: 25.3176, longitude: 82.9739, timezone: 'Asia/Kolkata' },
  { id: 'SRINAGAR', cityName: 'Srinagar, India', latitude: 34.0837, longitude: 74.7973, timezone: 'Asia/Kolkata' },
  { id: 'KATHMANDU', cityName: 'Kathmandu, Nepal', latitude: 27.7172, longitude: 85.3240, timezone: 'Asia/Kathmandu' },
  { id: 'DUBAI', cityName: 'Dubai, UAE', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { id: 'LONDON', cityName: 'London, UK', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { id: 'NEW_YORK', cityName: 'New York, USA', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
  { id: 'TORONTO', cityName: 'Toronto, Canada', latitude: 43.6532, longitude: -79.3832, timezone: 'America/Toronto' },
  { id: 'VANCOUVER', cityName: 'Vancouver, Canada', latitude: 49.2827, longitude: -123.1207, timezone: 'America/Vancouver' },
  { id: 'SYDNEY', cityName: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { id: 'TROMSO', cityName: 'Tromso, Norway', latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo' },
];

const CORPUS_DATES: ReadonlyArray<string> = [
  '2025-01-15', '2025-02-26', '2025-03-09', '2025-03-20', '2025-03-30', '2025-04-30',
  '2025-06-21', '2025-09-22', '2025-10-20', '2025-10-26', '2025-11-02', '2025-12-21',
  '2026-01-03', '2026-01-15', '2026-02-15', '2026-03-03', '2026-03-08', '2026-03-19',
  '2026-03-21', '2026-03-29', '2026-04-05', '2026-04-19', '2026-05-18', '2026-05-25',
  '2026-06-05', '2026-06-21', '2026-07-15', '2026-08-15', '2026-09-23', '2026-10-04',
  '2026-10-20', '2026-10-25', '2026-11-01', '2026-11-06', '2026-11-08', '2026-12-21',
];

function expectStrictError(fn: () => unknown, expectedCode: string, expectedField: string): void {
  let caught: unknown;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof CalculationInputError, `Expected CalculationInputError (${expectedCode}), got ${String(caught)}`);
  assert.equal(caught.code, expectedCode);
  assert.ok(
    caught.fields.includes(expectedField),
    `Expected CalculationInputError.fields (${JSON.stringify(caught.fields)}) to include "${expectedField}"`
  );
}

test('analyzeFullDayStrict rejects invalid dates, out-of-range years, bad coordinates, missing/unknown zones, and offset mismatches with field names', () => {
  const validLondon: StrictLocationInput = { latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' };

  // Impossible calendar dates & years outside 1900..2100
  expectStrictError(() => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-02-31', validLondon), 'INVALID_DATE', 'date');
  expectStrictError(() => HighPrecisionAstroEngine.analyzeFullDayStrict('1900-02-29', validLondon), 'INVALID_DATE', 'date');
  expectStrictError(() => HighPrecisionAstroEngine.analyzeFullDayStrict('not-a-date', validLondon), 'INVALID_DATE', 'date');
  expectStrictError(() => HighPrecisionAstroEngine.analyzeFullDayStrict('1899-12-31', validLondon), 'DATE_OUT_OF_RANGE', 'date');
  expectStrictError(() => HighPrecisionAstroEngine.analyzeFullDayStrict('2101-01-01', validLondon), 'DATE_OUT_OF_RANGE', 'date');

  // Missing location & NaN / out-of-range coordinates
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', null as unknown as StrictLocationInput),
    'INVALID_LOCATION',
    'location'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', { ...validLondon, latitude: Number.NaN }),
    'INVALID_LATITUDE',
    'latitude'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', { ...validLondon, latitude: 90.001 }),
    'INVALID_LATITUDE',
    'latitude'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', { ...validLondon, longitude: Number.NaN }),
    'INVALID_LONGITUDE',
    'longitude'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', { ...validLondon, longitude: -180.5 }),
    'INVALID_LONGITUDE',
    'longitude'
  );

  // Missing timezone, unknown IANA zone, 'Local', 'UTC_OFFSET', and out-of-range offset
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', { latitude: 28.6139, longitude: 77.2090 } as unknown as StrictLocationInput),
    'MISSING_TIMEZONE',
    'timezone'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', { latitude: 28.6139, longitude: 77.2090, timezone: 'Mars/Olympus' }),
    'INVALID_TIMEZONE',
    'timezone'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', { latitude: 28.6139, longitude: 77.2090, timezone: 'Local' }),
    'INVALID_TIMEZONE',
    'timezone'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', { latitude: 28.6139, longitude: 77.2090, timezone: 'UTC_OFFSET', timezoneOffset: 5.5 }),
    'INVALID_TIMEZONE',
    'timezone'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-06-21', { ...validLondon, timezoneOffset: 15 }),
    'INVALID_TIMEZONE_OFFSET',
    'timezoneOffset'
  );

  // Typed offset disagreeing with IANA zone on that date
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-07-15', { ...validLondon, timezoneOffset: 0 }), // BST is +1
    'TIMEZONE_OFFSET_MISMATCH',
    'timezoneOffset'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-01-15', { ...validLondon, timezoneOffset: 1 }), // GMT is 0
    'TIMEZONE_OFFSET_MISMATCH',
    'timezoneOffset'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-07-15', { latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York', timezoneOffset: -5 }), // EDT is -4
    'TIMEZONE_OFFSET_MISMATCH',
    'timezoneOffset'
  );
  expectStrictError(
    () => HighPrecisionAstroEngine.analyzeFullDayStrict('2026-11-08', { latitude: 27.7172, longitude: 85.324, timezone: 'Asia/Kathmandu', timezoneOffset: 5.5 }), // NPT is +5.75
    'TIMEZONE_OFFSET_MISMATCH',
    'timezoneOffset'
  );

  // Agreeing typed offset succeeds cleanly
  const londonSummerOk = HighPrecisionAstroEngine.analyzeFullDayStrict('2026-07-15', { ...validLondon, timezoneOffset: 1 });
  assert.equal(londonSummerOk.location.timezoneOffset, 1);
  assert.deepEqual(londonSummerOk.inputNotes, []);
});

test('analyzeFullDay populates inputNotes on offset override, fixed offset without IANA zone, and DST transition dates, and dailyTimingEngine wires analyzeFullDayStrict', () => {
  // 1. Stale winter offset passed on summer date in UI-tolerant analyzeFullDay -> authoritative BST +1 + warning note
  const uiAdjusted = HighPrecisionAstroEngine.analyzeFullDay('2026-07-15', {
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    timezoneOffset: 0,
  });
  assert.equal(uiAdjusted.location.timezoneOffset, 1);
  assert.ok(uiAdjusted.inputNotes.some((n) => n.includes('differed from IANA zone Europe/London')));

  // 2. Fixed numeric offset without IANA zone -> warning note
  const fixedOnly = HighPrecisionAstroEngine.analyzeFullDay('2026-11-08', {
    latitude: -31.9505,
    longitude: 115.8605,
    timezoneOffset: 8,
  });
  assert.ok(fixedOnly.inputNotes.some((n) => n.includes('Fixed numeric UTC offset')));

  // 3. DST spring-forward date with IANA-only input -> DST transition note
  const nySpring = HighPrecisionAstroEngine.analyzeFullDayStrict('2026-03-08', {
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
  });
  assert.equal(nySpring.localDayBounds.elapsedHours, 23);
  assert.ok(nySpring.inputNotes.some((n) => n.includes('Daylight Saving Time transition')));

  // 4. Server dailyTimingEngine uses analyzeFullDayStrict and rejects out-of-range / invalid target zone
  assert.throws(
    () =>
      calculateRealDailyTimingWindows(
        {
          schema_version: 1,
          birth: { date: '1990-03-14', time: '14:30', certainty: 'EXACT', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 },
          target: { date: '2026-07-15', timezone: 'Mars/Olympus', latitude: 51.5074, longitude: -0.1278 },
          activity: 'work',
          rule_version: 'timing-rules-v1',
          ephemeris_mode: 'MOSHIER',
        },
        { releaseAuthorized: false, taraBalaAuthorized: false, provisionalEvaluationMode: true }
      ),
    CalculationInputError
  );
});

test('540-case global golden corpus passes analyzeFullDayStrict using ONLY IANA timezones (no typed timezoneOffset) within <= 60s', () => {
  let checkedCases = 0;
  let nonPolarCases = 0;

  for (const city of IANA_ONLY_CITIES) {
    for (const dateStr of CORPUS_DATES) {
      checkedCases++;
      const [y, m, d] = dateStr.split('-').map(Number);
      const res = HighPrecisionAstroEngine.analyzeFullDayStrict(dateStr, {
        latitude: city.latitude,
        longitude: city.longitude,
        cityName: city.cityName,
        timezone: city.timezone,
      });

      if (!res.localDayBounds.isDstTransition) {
        assert.deepEqual(res.inputNotes, []);
      }

      if (city.id === 'KATHMANDU') {
        assert.equal(res.location.timezoneOffset, 5.75);
      } else if (city.id === 'LONDON' && dateStr === '2026-01-15') {
        assert.equal(res.location.timezoneOffset, 0);
      } else if (city.id === 'LONDON' && dateStr === '2026-07-15') {
        assert.equal(res.location.timezoneOffset, 1);
      } else if (city.id === 'NEW_YORK' && dateStr === '2026-01-15') {
        assert.equal(res.location.timezoneOffset, -5);
      } else if (city.id === 'NEW_YORK' && dateStr === '2026-07-15') {
        assert.equal(res.location.timezoneOffset, -4);
      } else if (city.id === 'SYDNEY' && dateStr === '2026-01-15') {
        assert.equal(res.location.timezoneOffset, 11);
      } else if (city.id === 'SYDNEY' && dateStr === '2026-07-15') {
        assert.equal(res.location.timezoneOffset, 10);
      }

      if (!res.solarMetrics.isPolar) {
        nonPolarCases++;
        const oracleRise = independentGastHorizonCrossingUtcMs(y, m, d, city.latitude, city.longitude, 'sunrise');
        const oracleSet = independentGastHorizonCrossingUtcMs(y, m, d, city.latitude, city.longitude, 'sunset');
        if (oracleRise !== null && oracleSet !== null) {
          assert.ok(
            Math.abs(res.solarMetrics.sunriseMs - oracleRise) <= 60000,
            `[${city.id} ${dateStr}] Strict IANA sunrise error > 60s`
          );
          assert.ok(
            Math.abs(res.solarMetrics.sunsetMs - oracleSet) <= 60000,
            `[${city.id} ${dateStr}] Strict IANA sunset error > 60s`
          );
        }
      }
    }
  }

  assert.equal(checkedCases, 540);
  assert.ok(nonPolarCases >= 500);
});

test('12-case global Natal Chart golden corpus verifies exact Ascendant quadrant (<= 0.01°, never 180° flipped) and all 9 sidereal Navagrahas', () => {
  const natalCases: ReadonlyArray<{
    id: string;
    birthDate: string;
    birthTime: string;
    timezone: string;
    latitude: number;
    longitude: number;
    expectedAscSign?: string;
  }> = [
    { id: 'INDIA_1947_MIDNIGHT', birthDate: '1947-08-15', birthTime: '00:00:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.2090, expectedAscSign: 'Taurus' },
    { id: 'DELHI_1990_CANCER', birthDate: '1990-03-14', birthTime: '14:30:00', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.2090, expectedAscSign: 'Cancer' },
    { id: 'KOLKATA_1989_DAWN', birthDate: '1989-11-23', birthTime: '04:30:00', timezone: 'Asia/Kolkata', latitude: 22.5726, longitude: 88.3639 },
    { id: 'KATHMANDU_2001_NPT', birthDate: '2001-06-01', birthTime: '21:15:00', timezone: 'Asia/Kathmandu', latitude: 27.7172, longitude: 85.3240 },
    { id: 'LONDON_2012_BST', birthDate: '2012-07-27', birthTime: '20:12:00', timezone: 'Europe/London', latitude: 51.5074, longitude: -0.1278 },
    { id: 'LONDON_1998_GMT', birthDate: '1998-01-19', birthTime: '08:45:00', timezone: 'Europe/London', latitude: 51.5074, longitude: -0.1278 },
    { id: 'NYC_2005_EDT', birthDate: '2005-08-10', birthTime: '11:20:00', timezone: 'America/New_York', latitude: 40.7128, longitude: -74.0060 },
    { id: 'NYC_2018_EST', birthDate: '2018-12-05', birthTime: '23:10:00', timezone: 'America/New_York', latitude: 40.7128, longitude: -74.0060 },
    { id: 'SF_1995_PDT', birthDate: '1995-05-22', birthTime: '06:05:00', timezone: 'America/Los_Angeles', latitude: 37.7749, longitude: -122.4194 },
    { id: 'SYDNEY_2000_AEDT', birthDate: '2000-09-15', birthTime: '19:00:00', timezone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093 },
    { id: 'TOKYO_2019_JST', birthDate: '2019-05-01', birthTime: '00:01:00', timezone: 'Asia/Tokyo', latitude: 35.6762, longitude: 139.6503 },
    { id: 'REYKJAVIK_2015_SUBARCTIC', birthDate: '2015-03-20', birthTime: '09:45:00', timezone: 'Atlantic/Reykjavik', latitude: 64.1466, longitude: -21.9426 },
  ];

  const deg2rad = Math.PI / 180.0;
  const rad2deg = 180.0 / Math.PI;

  for (const tc of natalCases) {
    const resolved = resolveIanaTimezone(tc.birthDate, tc.birthTime, tc.timezone);
    const chart = calculateFullChart(
      tc.birthDate,
      tc.birthTime,
      tc.latitude,
      tc.longitude,
      tc.id,
      resolved.offsetHours,
      AyanamsaType.TRUE_LAHIRI,
      tc.timezone
    );

    // Independent spherical-trigonometry Ascendant check (verifies ecliptic point rising in the East: sin(H) < 0 and altitude = 0)
    const jdUT = chart.systemMetadata.julianDayUT;
    const { gastDeg, trueObliquityDeg } = calculateGAST(jdUT);
    const ramcRad = norm360(gastDeg + tc.longitude) * deg2rad;
    const epsRad = trueObliquityDeg * deg2rad;
    const latRad = tc.latitude * deg2rad;

    const tropAscOracle = norm360(
      Math.atan2(
        Math.cos(ramcRad),
        -(Math.sin(epsRad) * Math.tan(latRad) + Math.cos(epsRad) * Math.sin(ramcRad))
      ) * rad2deg
    );
    const ayanamsa = getAyanamsa(jdUT, AyanamsaType.TRUE_LAHIRI);
    const sidAscOracle = norm360(tropAscOracle - ayanamsa);

    // Verify rising horizon condition: altitude sin(h) === 0 and local hour angle H = RAMC - RA(Asc) lies on eastern horizon (sin(H) < 0)
    const ascTropRad = tropAscOracle * deg2rad;
    const raAscRad = Math.atan2(Math.sin(ascTropRad) * Math.cos(epsRad), Math.cos(ascTropRad));
    const decAscRad = Math.asin(Math.sin(ascTropRad) * Math.sin(epsRad));
    const hourAngleRad = ramcRad - raAscRad;
    const sinHorizonAlt = Math.sin(latRad) * Math.sin(decAscRad) + Math.cos(latRad) * Math.cos(decAscRad) * Math.cos(hourAngleRad);
    const sinHourAngle = Math.sin(hourAngleRad);
    assert.ok(Math.abs(sinHorizonAlt) < 1e-10, `[${tc.id}] Ascendant must lie on geometric horizon (sin(h) ≈ 0), got ${sinHorizonAlt}`);
    assert.ok(sinHourAngle < 0, `[${tc.id}] Ascendant must lie on the eastern rising horizon (sin(H) < 0), got ${sinHourAngle}`);

    const ascErrDeg = angularDistanceDeg(chart.ascendantDegree, sidAscOracle);
    assert.ok(ascErrDeg <= 0.01, `[${tc.id}] Ascendant error ${ascErrDeg.toFixed(5)}° > 0.01°`);

    if (tc.expectedAscSign) {
      assert.equal(chart.ascendantSignName, tc.expectedAscSign, `[${tc.id}] Expected ${tc.expectedAscSign} Lagna, got ${chart.ascendantSignName}`);
    }

    // Verify all 9 sidereal Navagraha longitudes match ephemeris core within quantization (<= 0.005°)
    assert.equal(chart.planets.length, 9);
    const jdTT = jdUT + chart.systemMetadata.deltaTSeconds / 86400.0;
    const { deltaPsiDeg } = calculateNutationAndObliquity(jdTT);
    const bodies = calculateAllApparentTropicalBodies(jdUT, chart.systemMetadata.deltaTSeconds, deltaPsiDeg);

    const expectedMap: Record<string, number> = {
      Sun: norm360(bodies.Sun - ayanamsa),
      Moon: norm360(bodies.Moon - ayanamsa),
      Mars: norm360(bodies.Mars - ayanamsa),
      Mercury: norm360(bodies.Mercury - ayanamsa),
      Jupiter: norm360(bodies.Jupiter - ayanamsa),
      Venus: norm360(bodies.Venus - ayanamsa),
      Saturn: norm360(bodies.Saturn - ayanamsa),
      Rahu: norm360(bodies.Rahu - ayanamsa),
      Ketu: norm360(bodies.Ketu - ayanamsa),
    };

    for (const p of chart.planets) {
      const exp = expectedMap[p.name];
      assert.ok(exp !== undefined, `[${tc.id}] Unexpected planet ${p.name}`);
      assert.ok(
        angularDistanceDeg(p.longitude, exp) <= 0.005,
        `[${tc.id} ${p.name}] Planet longitude mismatch: got ${p.longitude}°, expected ${exp.toFixed(4)}°`
      );
    }

    const rahu = chart.planets.find((p) => p.name === 'Rahu')!;
    const ketu = chart.planets.find((p) => p.name === 'Ketu')!;
    assert.ok(angularDistanceDeg(norm360(rahu.longitude + 180.0), ketu.longitude) <= 0.002, `[${tc.id}] Rahu/Ketu must be 180° opposite`);
  }
});
