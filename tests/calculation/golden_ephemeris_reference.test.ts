/**
 * Golden Astronomical & Birth-Chart Reference Suite (26 Verified Reference Cases)
 *
 * Cross-checks the ephemeris & validation engine against:
 * 1. Audit 2 Reference Case T1 (1990-03-14 14:30:00 IST, New Delhi -> Swiss Ephemeris Moshier Lahiri)
 * 2. 7 Skyfield + IAU2000A/2006 Tropical Ascendant Cases (`tests/calculation/reference/pr21/normalized.json`)
 * 3. 9 Multi-Century 7-Planet JPL DE421 Epochs (`1910`–`2026`, `pr21/normalized.json` + `option-a/outer-planets.json`)
 * 4. 3 Skyfield Horizons Apparent Vectors (`1956` Mars, `2005` Sun × 2, `reference/acquired/normalized.json`)
 * 5. 6 FRD Boundary & Historical/DST Timezone Cases (`T6` future, `T10` year 0001, 1899/1900, NY DST gap & fold)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AyanamsaType,
  calculateAscendant,
  calculateFullChart,
  calculateJulianDay,
  circularAngularDifference,
  getAyanamsa,
} from '../../src/engine/astroMath';
import { calculateAllApparentTropicalBodies } from '../../src/engine/planetaryEphemeris';
import { CalculationInputError, validateBirthInput } from '../../src/engine/calculationValidation';
import { resolveIanaTimezone } from '../../src/engine/timezoneResolver';

const pr21Data = JSON.parse(
  fs.readFileSync(new URL('./reference/pr21/normalized.json', import.meta.url), 'utf8')
);
const outerData = JSON.parse(
  fs.readFileSync(new URL('./reference/option-a/outer-planets.json', import.meta.url), 'utf8')
);
const acquiredData = JSON.parse(
  fs.readFileSync(new URL('./reference/acquired/normalized.json', import.meta.url), 'utf8')
);

function jdFromIsoUtc(isoUtc: string): number {
  const dt = new Date(isoUtc);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  const h = dt.getUTCHours();
  const min = dt.getUTCMinutes();
  const sec = dt.getUTCSeconds() + dt.getUTCMilliseconds() / 1000;
  return calculateJulianDay(y, m, d, h, min, sec);
}

// Case 1: Audit 2 Reference Case T1 (1990-03-14 14:30 IST, Delhi 28.6139°N, 77.2090°E, UTC+5.5)
test('Golden Case 01 (Audit 2 T1): 1990-03-14 14:30 IST Delhi matches Swiss Ephemeris Lahiri reference', () => {
  const chart = calculateFullChart('1990-03-14', '14:30:00', 28.6139, 77.209, 'New Delhi', 5.5, AyanamsaType.TRUE_LAHIRI, 'Asia/Kolkata');

  // Swiss Ephemeris (Moshier, Lahiri) reference values from Audit 2:
  assert.ok(Math.abs(chart.systemMetadata.ayanamsaValue - 23.7202) < 0.002, `Ayanamsa: ${chart.systemMetadata.ayanamsaValue}`);
  assert.equal(chart.ascendantSignName, 'Cancer');
  assert.ok(circularAngularDifference(chart.ascendantDegree, 99.082) < 0.03, `Ascendant ${chart.ascendantDegree}° vs 99.082°`);

  const swissRef: Record<string, { lon: number; sign: string; tol: number }> = {
    Sun: { lon: 329.795, sign: 'Aquarius', tol: 0.02 },
    Moon: { lon: 182.569, sign: 'Libra', tol: 0.03 },
    Mercury: { lon: 325.356, sign: 'Aquarius', tol: 0.08 },
    Venus: { lon: 284.457, sign: 'Capricorn', tol: 0.08 },
    Mars: { lon: 278.284, sign: 'Capricorn', tol: 0.08 },
    Jupiter: { lon: 67.590, sign: 'Gemini', tol: 0.08 },
    Saturn: { lon: 269.526, sign: 'Sagittarius', tol: 0.08 },
  };

  for (const [body, ref] of Object.entries(swissRef)) {
    const p = chart.planets.find((x) => x.name === body)!;
    assert.ok(p, `Missing ${body}`);
    const err = circularAngularDifference(p.longitude, ref.lon);
    assert.ok(err < ref.tol, `${body} ${p.longitude}° differs from Swiss ${ref.lon}° by ${err.toFixed(4)}° (tol ${ref.tol}°)`);
    assert.equal(p.signName, ref.sign, `${body} sign mismatch`);
  }
});

// Cases 2–8: 7 Skyfield Tropical Ascendant Reference Charts (including Polar Tromso 69.65°N)
for (const [idx, c] of (pr21Data.charts as any[]).entries()) {
  test(`Golden Case ${String(idx + 2).padStart(2, '0')} (Skyfield Ascendant ${c.id}): ${c.utc} (${c.latitude}°, ${c.longitude}°)`, () => {
    const jdUT = jdFromIsoUtc(c.utc) + (c.dut1_seconds || 0) / 86400;
    const tropAsc = calculateAscendant(jdUT, c.latitude, c.longitude, 0);
    const diff = circularAngularDifference(tropAsc, c.tropical_ascendant);
    assert.ok(diff < 0.02, `${c.id} Ascendant ${tropAsc.toFixed(4)}° vs Skyfield ${c.tropical_ascendant.toFixed(4)}° (diff ${diff.toFixed(4)}°)`);
  });
}

// Cases 9–17: 9 Multi-Century 7-Planet JPL DE421 Reference Epochs (1910–2026)
const epochIds = Array.from(
  new Set((pr21Data.planetary as any[]).map((r) => String(r.id).replace(/_(sun|moon|mercury|venus|mars)$/, '')))
);

epochIds.forEach((epochPrefix, idx) => {
  test(`Golden Case ${String(idx + 9).padStart(2, '0')} (JPL DE421 7-Body Epoch ${epochPrefix})`, () => {
    const innerRows = (pr21Data.planetary as any[]).filter((r) => r.id.startsWith(epochPrefix + '_'));
    const outerRows = (outerData.rows as any[]).filter((r) => r.id.startsWith(epochPrefix + '_'));
    assert.equal(innerRows.length, 5);
    assert.equal(outerRows.length, 2);

    const jdUT = jdFromIsoUtc(innerRows[0].utc);
    const bodies = calculateAllApparentTropicalBodies(jdUT);

    const mapName: Record<string, string> = {
      sun: 'Sun',
      moon: 'Moon',
      mercury: 'Mercury',
      venus: 'Venus',
      mars: 'Mars',
      jupiter: 'Jupiter',
      saturn: 'Saturn',
    };

    for (const row of [...innerRows, ...outerRows]) {
      const key = mapName[row.body];
      const computed = bodies[key];
      const expected = row.quantities.tropical_longitude;
      const diff = circularAngularDifference(computed, expected);
      const tol = row.body === 'sun' ? 0.015 : row.body === 'moon' ? 0.03 : 0.08;
      assert.ok(diff < tol, `${epochPrefix} ${key}: ${computed.toFixed(4)}° vs DE421 ${expected.toFixed(4)}° (diff ${diff.toFixed(4)}°)`);
    }
  });
});

// Cases 18–20: 3 Skyfield Horizons Apparent Vectors (1956 Mars & 2005 Sun)
(acquiredData.planetary as any[]).forEach((vec, idx) => {
  test(`Golden Case ${String(idx + 18).padStart(2, '0')} (Skyfield Horizons ${vec.id}): ${vec.utc}`, () => {
    const jdUT = jdFromIsoUtc(vec.utc);
    const bodies = calculateAllApparentTropicalBodies(jdUT);
    const bodyKey = vec.body === 'mars' ? 'Mars' : 'Sun';
    const diff = circularAngularDifference(bodies[bodyKey], vec.longitude_deg);
    const tol = bodyKey === 'Sun' ? 0.01 : 0.05;
    assert.ok(diff < tol, `${vec.id}: ${bodies[bodyKey].toFixed(4)}° vs ${vec.longitude_deg}° (diff ${diff.toFixed(4)}°)`);
  });
});

// Cases 21–26: FRD Date Bounds & Historical/DST Timezone Boundaries (Audit 2 T6, T10, E1-03, E1-04)
test('Golden Case 21 (Audit 2 T6): Rejects future birth date 2099-01-01 with INVALID_BIRTH_DATE', () => {
  assert.throws(
    () => validateBirthInput({ birthDate: '2099-01-01', birthTime: '12:00:00', latitude: 28.6139, longitude: 77.209, timezoneOffset: 5.5 }),
    (err: any) => err instanceof CalculationInputError && err.code === 'INVALID_BIRTH_DATE'
  );
});

test('Golden Case 22 (Audit 2 T10): Rejects pre-1900 birth date 0001-01-01 with INVALID_BIRTH_DATE', () => {
  assert.throws(
    () => validateBirthInput({ birthDate: '0001-01-01', birthTime: '12:00:00', latitude: 28.6139, longitude: 77.209, timezoneOffset: 5.5 }),
    (err: any) => err instanceof CalculationInputError && err.code === 'INVALID_BIRTH_DATE'
  );
});

test('Golden Case 23: Rejects 1899-12-31 and accepts 1900-01-01 boundary', () => {
  assert.throws(
    () => validateBirthInput({ birthDate: '1899-12-31', birthTime: '23:59:59', latitude: 28.6139, longitude: 77.209, timezoneOffset: 5.5 }),
    (err: any) => err instanceof CalculationInputError && err.code === 'INVALID_BIRTH_DATE'
  );
  const c1900 = calculateFullChart('1900-01-01', '12:00:00', 28.6139, 77.209, 'Delhi', 5.5);
  assert.ok(c1900.systemMetadata.ayanamsaValue > 22.0 && c1900.systemMetadata.ayanamsaValue < 23.0);
});

test('Golden Case 24: Rejects mismatched manual UTC offset when IANA timezone is supplied', () => {
  assert.throws(
    () => calculateFullChart('2026-07-15', '12:00:00', 40.7128, -74.006, 'New York', -5, AyanamsaType.TRUE_LAHIRI, 'America/New_York'),
    (err: any) => err instanceof CalculationInputError && err.code === 'INVALID_TIMEZONE'
  );
  const summerNy = calculateFullChart('2026-07-15', '12:00:00', 40.7128, -74.006, 'New York', -4, AyanamsaType.TRUE_LAHIRI, 'America/New_York');
  assert.equal(summerNy.systemMetadata.timezoneMode, 'IANA_VERIFIED_OFFSET');
});

test('Golden Case 25: Rejects nonexistent spring-forward DST birth time (2026-03-08 02:30 America/New_York)', () => {
  assert.throws(
    () => resolveIanaTimezone('2026-03-08', '02:30:00', 'America/New_York'),
    (err: any) => err instanceof CalculationInputError && err.code === 'NONEXISTENT_LOCAL_TIME'
  );
});

test('Golden Case 26: Disambiguates repeated fall-back DST birth time (2026-11-01 01:30 America/New_York)', () => {
  assert.throws(
    () => resolveIanaTimezone('2026-11-01', '01:30:00', 'America/New_York'),
    (err: any) => err instanceof CalculationInputError && err.code === 'AMBIGUOUS_LOCAL_TIME'
  );
  const cEdt = calculateFullChart('2026-11-01', '01:30:00', 40.7128, -74.006, 'New York', -4, AyanamsaType.TRUE_LAHIRI, 'America/New_York');
  const cEst = calculateFullChart('2026-11-01', '01:30:00', 40.7128, -74.006, 'New York', -5, AyanamsaType.TRUE_LAHIRI, 'America/New_York');
  // 1 elapsed hour rotates the Ascendant by ~15°
  const ascShift = circularAngularDifference(cEdt.ascendantDegree, cEst.ascendantDegree);
  assert.ok(ascShift > 10 && ascShift < 22, `Expected ~15° Ascendant shift across 1h DST fold, got ${ascShift.toFixed(2)}°`);
  assert.ok(Math.abs((getAyanamsa(cEst.systemMetadata.julianDayUT) - getAyanamsa(cEdt.systemMetadata.julianDayUT))) < 0.001);
});
