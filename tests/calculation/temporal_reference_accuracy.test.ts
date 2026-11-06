import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calculateJulianDay,
  calculateDeltaT,
} from '../../src/engine/astroMath';
import {
  resolveIanaTimezone,
  calculateJulianDayTT,
} from '../../src/engine/timezoneResolver';
import { validateBirthInput, CalculationInputError } from '../../src/engine/calculationValidation';

const fixturesDataset = JSON.parse(
  fs.readFileSync(new URL('./reference/independent_reference_fixtures.json', import.meta.url), 'utf8')
);

test('A05: Timescale separation between UT and TT at J2000.0', () => {
  // Epoch J2000.0 is defined as 2000-01-01 12:00:00 TT -> JD_TT = 2451545.0
  const jdUT_12h = calculateJulianDay(2000, 1, 1, 12, 0, 0);
  assert.equal(jdUT_12h, 2451545.0);

  // Delta-T at J2000.0 is approx 63.83s (observed) / 64.69s (standard model)
  const deltaT = calculateDeltaT(2000.0);
  assert.ok(deltaT >= 62.0 && deltaT <= 66.0, `DeltaT ${deltaT} outside expected range`);

  // TT is ahead of UT by DeltaT seconds:
  // JD_TT = JD_UT + DeltaT / 86400
  const jdTT = calculateJulianDayTT(jdUT_12h, deltaT);
  const diffDays = jdTT - jdUT_12h;
  const diffSeconds = diffDays * 86400;

  // Numerical precision check (within 1ms tolerance on float64 JD)
  assert.ok(Math.abs(diffSeconds - deltaT) < 1e-3, `diffSeconds ${diffSeconds} vs deltaT ${deltaT}`);
  assert.ok(diffDays > 0.0007 && diffDays < 0.0008, `Expected ~0.00074 days difference, got ${diffDays}`);
});

test('A05: Delta-T values across historical and future epochs', () => {
  // Model implemented in engine:
  // 1900: 60.0 + 32.0 * (-1)^2 = 92.0s
  const dt1900 = calculateDeltaT(1900);
  assert.equal(dt1900, 92.0);

  // 2000: 64.69s
  const dt2000 = calculateDeltaT(2000);
  assert.ok(dt2000 >= 64.0 && dt2000 <= 65.0);

  // 2026: ~75.07s
  const dt2026 = calculateDeltaT(2026);
  assert.ok(dt2026 >= 74.0 && dt2026 <= 76.0);
});

test('A05: IANA timezone resolution for North America (New York, Toronto, Vancouver)', () => {
  // Winter EST in New York (-5h)
  const fEst = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_06_US_NEW_YORK_WINTER_EST');
  assert.ok(fEst);
  const resEst = resolveIanaTimezone(fEst.inputs.birthDate, fEst.inputs.birthTime, fEst.inputs.timezone);
  assert.equal(resEst.offsetHours, -5);
  assert.equal(resEst.isoUtc, '2026-01-15T17:00:00.000Z');
  assert.ok(Math.abs(resEst.julianDayUT - fEst.expected.julianDayUT) < 1e-5);

  // Summer EDT in New York (-4h)
  const fEdt = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_07_US_NEW_YORK_SUMMER_EDT');
  assert.ok(fEdt);
  const resEdt = resolveIanaTimezone(fEdt.inputs.birthDate, fEdt.inputs.birthTime, fEdt.inputs.timezone);
  assert.equal(resEdt.offsetHours, -4);
  assert.equal(resEdt.isoUtc, '2026-07-15T16:00:00.000Z');
  assert.ok(Math.abs(resEdt.julianDayUT - fEdt.expected.julianDayUT) < 1e-5);

  // Toronto EDT (-4h)
  const fToronto = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_10_CANADA_TORONTO_SUMMER_EDT');
  assert.ok(fToronto);
  const resToronto = resolveIanaTimezone(fToronto.inputs.birthDate, fToronto.inputs.birthTime, fToronto.inputs.timezone);
  assert.equal(resToronto.offsetHours, -4);
  assert.equal(resToronto.isoUtc, '2026-06-15T18:00:00.000Z');

  // Vancouver PST (-8h)
  const fVan = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_11_CANADA_VANCOUVER_WINTER_PST');
  assert.ok(fVan);
  const resVan = resolveIanaTimezone(fVan.inputs.birthDate, fVan.inputs.birthTime, fVan.inputs.timezone);
  assert.equal(resVan.offsetHours, -8);
  assert.equal(resVan.isoUtc, '2024-12-15T17:00:00.000Z');
});

test('A05: IANA timezone resolution for Asia/Kolkata, fractional and southern zones', () => {
  // Asia/Kolkata (+5:30 = +5.5h)
  const resKolkata = resolveIanaTimezone('2026-11-06', '12:00:00', 'Asia/Kolkata');
  assert.equal(resKolkata.offsetHours, 5.5);
  assert.equal(resKolkata.isoUtc, '2026-11-06T06:30:00.000Z');

  // Asia/Kathmandu (Nepal: +5:45 = +5.75h)
  const resNepal = resolveIanaTimezone('2026-11-06', '12:00:00', 'Asia/Kathmandu');
  assert.equal(resNepal.offsetHours, 5.75);
  assert.equal(resNepal.isoUtc, '2026-11-06T06:15:00.000Z');

  // Pacific/Fiji (+12:00 = +12.0h)
  const resFiji = resolveIanaTimezone('2026-11-06', '12:00:00', 'Pacific/Fiji');
  assert.equal(resFiji.offsetHours, 12);
  assert.equal(resFiji.isoUtc, '2026-11-06T00:00:00.000Z');
});

test('A05: Daylight saving transitions - Spring-forward gap rejection (NONEXISTENT_LOCAL_TIME)', () => {
  const fGap = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_08_US_NEW_YORK_SPRING_FORWARD_GAP');
  assert.ok(fGap);

  // In America/New_York on 2026-03-08, clocks jump from 01:59:59 directly to 03:00:00.
  // 02:30:00 is a non-existent local wall-clock time!
  assert.throws(
    () => resolveIanaTimezone(fGap.inputs.birthDate, fGap.inputs.birthTime, fGap.inputs.timezone),
    (err: any) => {
      assert.ok(err instanceof CalculationInputError);
      assert.equal(err.code, fGap.expected.errorCode);
      return true;
    }
  );
});

test('A05: Daylight saving transitions - Fall-back fold detection (AMBIGUOUS_LOCAL_TIME)', () => {
  const fFold = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_09_US_NEW_YORK_FALL_BACK_FOLD');
  assert.ok(fFold);

  // In America/New_York on 2026-11-01, clocks jump back from 02:00:00 to 01:00:00.
  // 01:30:00 occurs twice: once in EDT (UTC-4) and once in EST (UTC-5).
  assert.throws(
    () => resolveIanaTimezone(fFold.inputs.birthDate, fFold.inputs.birthTime, fFold.inputs.timezone),
    (err: any) => {
      assert.ok(err instanceof CalculationInputError);
      assert.equal(err.code, fFold.expected.errorCodeWithoutOffset);
      return true;
    }
  );

  // With explicit offset, fold disambiguation succeeds:
  const resFirst = resolveIanaTimezone(fFold.inputs.birthDate, fFold.inputs.birthTime, fFold.inputs.timezone, -4);
  assert.equal(resFirst.offsetHours, -4);
  assert.equal(resFirst.isoUtc, '2026-11-01T05:30:00.000Z');

  const resSecond = resolveIanaTimezone(fFold.inputs.birthDate, fFold.inputs.birthTime, fFold.inputs.timezone, -5);
  assert.equal(resSecond.offsetHours, -5);
  assert.equal(resSecond.isoUtc, '2026-11-01T06:30:00.000Z');
});

test('A05: Calendar integrity - Leap year rules (2000 vs 1900 vs 2024)', () => {
  // 2000-02-29 is valid (400-year quadricentennial rule)
  const f2000 = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_12_CALENDAR_LEAP_DAY_2000');
  assert.ok(f2000);
  assert.doesNotThrow(() => {
    validateBirthInput({
      birthDate: f2000.inputs.birthDate,
      birthTime: f2000.inputs.birthTime,
      latitude: 0,
      longitude: 0,
      timezoneOffset: 0,
    });
  });
  const jd2000 = calculateJulianDay(2000, 2, 29, 12, 0, 0);
  assert.equal(jd2000, f2000.expected.julianDayUT);

  // 1900-02-29 is INVALID (centurial non-leap year: 1900 is divisible by 100 but not 400)
  const f1900 = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_13_CALENDAR_CENTURY_NON_LEAP_1900');
  assert.ok(f1900);
  assert.throws(
    () => {
      validateBirthInput({
        birthDate: f1900.inputs.birthDate,
        birthTime: f1900.inputs.birthTime,
        latitude: 0,
        longitude: 0,
        timezoneOffset: 0,
      });
    },
    (err: any) => {
      assert.ok(err instanceof CalculationInputError);
      assert.equal(err.code, f1900.expected.errorCode);
      return true;
    }
  );

  // 2024-02-29 is valid (standard 4-year leap year)
  assert.doesNotThrow(() => {
    validateBirthInput({
      birthDate: '2024-02-29',
      birthTime: '12:00:00',
      latitude: 0,
      longitude: 0,
      timezoneOffset: 0,
    });
  });
});

test('A05: Temporal boundary - Midnight vs noon separation (0.5 days difference, zero aliasing)', () => {
  const fSep = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_14_TEMPORAL_MIDNIGHT_NOON_SEPARATION');
  assert.ok(fSep);

  const jdMidnight = calculateJulianDay(2000, 1, 1, 0, 0, 0);
  const jdNoon = calculateJulianDay(2000, 1, 1, 12, 0, 0);

  assert.equal(jdMidnight, 2451544.5);
  assert.equal(jdNoon, 2451545.0);

  const delta = jdNoon - jdMidnight;
  assert.equal(delta, 0.5, 'Midnight and noon must differ by exactly 0.5 Julian days');
});
