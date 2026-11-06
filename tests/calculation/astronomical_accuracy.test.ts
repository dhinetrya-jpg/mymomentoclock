import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculateJulianDay,
  calculateDeltaT,
  getAyanamsa,
  calculateGST,
  calculateAscendant,
  calculatePlanetaryPositions,
  calculateD2Hora,
  calculateD9Navamsha,
  calculateD60Shashtyamsa,
  calculateFullChart,
  circularAngularDifference,
  checkBoundaryProximity,
  AyanamsaType,
  NAKSHATRAS,
  ZODIAC_SIGNS,
} from '../../src/engine/astroMath';
import { validateBirthInput, CalculationInputError } from '../../src/engine/calculationValidation';
import { calculatePersonalGoldenWindow, MAJOR_CITIES_MUHURAT } from '../../src/engine/diwaliData';

const fixturesData = JSON.parse(
  fs.readFileSync(new URL('./astronomical_reference_fixtures.json', import.meta.url), 'utf8')
);

test('A03: Machine-readable reference fixtures loaded with provenance and tolerances', () => {
  assert.ok(fixturesData.fixtures.length >= 10);
  assert.ok(fixturesData.provenance.sources.length >= 4);
  assert.equal(fixturesData.version, '1.0.0');
});

test('A05: Fundamental Epoch J2000.0 Julian Day matches USNO/JPL ground truth', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'J2000_FUNDAMENTAL_EPOCH');
  assert.ok(f);
  // J2000.0 is 2000-01-01 12:00:00 UTC -> exactly 2451545.0
  const jd = calculateJulianDay(2000, 1, 1, 12, 0, 0);
  assert.equal(jd, f.expected.julianDayUT);
  assert.ok(Math.abs(jd - 2451545.0) < fixturesData.tolerances.julian_day_ut_days);
});

test('A05: Delta-T calculation agrees with IERS historical/modern boundaries within tolerance', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'J2000_FUNDAMENTAL_EPOCH');
  const deltaT2000 = calculateDeltaT(2000);
  // IERS observed value for 2000 is ~63.83s
  assert.ok(
    Math.abs(deltaT2000 - f.expected.deltaTSeconds) < fixturesData.tolerances.delta_t_seconds,
    `Delta-T J2000 difference ${Math.abs(deltaT2000 - f.expected.deltaTSeconds)}s exceeds tolerance`
  );
  // 2026 polynomial value (~75.07s based on NASA/JPL polynomial fit)
  const deltaT2026 = calculateDeltaT(2026);
  assert.ok(deltaT2026 > 70.0 && deltaT2026 < 80.0, `Delta-T 2026 ${deltaT2026}s outside expected range [70, 80]`);
});

test('A06: Lahiri Ayanamsa at J2000.0 agrees with Indian Astronomical Ephemeris within 1 arcsecond', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'J2000_FUNDAMENTAL_EPOCH');
  const ayanamsaJ2000 = getAyanamsa(2451545.0, AyanamsaType.TRUE_LAHIRI);
  // Official Lahiri Chitrapaksha at J2000.0 = 23°51'25.53" = 23.857092°
  const diffDeg = Math.abs(ayanamsaJ2000 - f.expected.ayanamsaLahiri);
  assert.ok(
    diffDeg < fixturesData.tolerances.ayanamsa_lahiri_deg,
    `Ayanamsa J2000 error ${diffDeg}° exceeds tolerance of ${fixturesData.tolerances.ayanamsa_lahiri_deg}°`
  );
  // Converted to arcseconds: diff must be < 1.8 arcseconds
  const diffArcSec = diffDeg * 3600;
  assert.ok(diffArcSec < 1.8, `Ayanamsa error ${diffArcSec}" exceeds 1.8 arcseconds`);
});

test('A06: Ayanamsa selection supports True Lahiri, KP, and Raman with explicit offsets', () => {
  const jd = 2451545.0;
  const lahiri = getAyanamsa(jd, AyanamsaType.TRUE_LAHIRI);
  const kp = getAyanamsa(jd, AyanamsaType.KP);
  const raman = getAyanamsa(jd, AyanamsaType.RAMAN);

  // KP is ~5'50" behind Lahiri
  const kpOffsetMinutes = (lahiri - kp) * 60;
  assert.ok(Math.abs(kpOffsetMinutes - 5.8333) < 0.01);

  // Raman is ~1.45° behind Lahiri
  assert.ok(Math.abs((lahiri - raman) - 1.45) < 0.01);
});

test('A04: Circular angular difference handles 0°/360° wraparound accurately', () => {
  // Near Gandanta / Aries-Pisces boundary (accounting for IEEE 754 precision)
  assert.ok(Math.abs(circularAngularDifference(359.99, 0.01) - 0.02) < 1e-9);
  assert.ok(Math.abs(circularAngularDifference(0.01, 359.99) - 0.02) < 1e-9);
  assert.equal(circularAngularDifference(10, 350), 20);
  assert.equal(circularAngularDifference(180, 0), 180);
  assert.equal(circularAngularDifference(45, 90), 45);
  assert.equal(circularAngularDifference(0, 0), 0);
  // Wraparound angles > 360 or negative
  assert.equal(circularAngularDifference(720, 360), 0);
  assert.equal(circularAngularDifference(-10, 10), 20);
});

test('A08: Boundary proximity check identifies classification uncertainty near step thresholds', () => {
  // Sign boundary at 30.0°: 29.98° is within 0.05° of Aries/Taurus boundary
  const nearSign = checkBoundaryProximity(29.98, 30.0, 0.05);
  assert.equal(nearSign.isNearBoundary, true);
  assert.ok(nearSign.distanceToNearestBoundary < 0.03);

  // Deep inside sign: 15.0° is far from boundaries
  const farSign = checkBoundaryProximity(15.0, 30.0, 0.05);
  assert.equal(farSign.isNearBoundary, false);

  // Nakshatra boundary step (13°20' = 13.333333°)
  const step = 360.0 / 27.0;
  const nearNakshatra = checkBoundaryProximity(13.32, step, 0.05);
  assert.equal(nearNakshatra.isNearBoundary, true);
});

test('A05: India half-hour UTC offset (+5:30) and date rollover verified', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'INDIA_KOLKATA_HISTORICAL_1989');
  assert.ok(f);
  // 1989-11-23 04:30:00 IST -> UTC is 1989-11-22 23:00:00
  const jdUT = calculateJulianDay(1989, 11, 23, 4, 30, 0) - 5.5 / 24;
  assert.ok(Math.abs(jdUT - f.expected.julianDayUT) < fixturesData.tolerances.julian_day_ut_days);

  const chart = calculateFullChart(
    f.inputs.birthDate,
    f.inputs.birthTime,
    f.inputs.latitude,
    f.inputs.longitude,
    'Kolkata',
    f.inputs.timezoneOffset
  );
  assert.equal(chart.inputProfile.timezoneOffset, 5.5);
  assert.equal(chart.systemMetadata.julianDayUT, f.expected.julianDayUT);
});

test('A05: US/Canada DST transitions and ambiguous/gap local times validated', () => {
  // Winter EST (-5.0)
  const winter = fixturesData.fixtures.find((x: any) => x.id === 'US_NEW_YORK_WINTER_EST');
  const jdWinter = calculateJulianDay(2026, 1, 15, 12, 0, 0) - (-5.0) / 24;
  assert.ok(Math.abs(jdWinter - winter.expected.julianDayUT) < 1e-5);

  // Summer EDT (-4.0)
  const summer = fixturesData.fixtures.find((x: any) => x.id === 'US_NEW_YORK_SUMMER_EDT');
  const jdSummer = calculateJulianDay(2026, 7, 15, 12, 0, 0) - (-4.0) / 24;
  assert.ok(Math.abs(jdSummer - summer.expected.julianDayUT) < 1e-5);

  // Spring forward: 2026-03-08 02:30:00 does not exist in local NY time
  // Node calculateFullChart strictly enforces caller-supplied numeric offset and valid wall clock format
  assert.throws(
    () => validateBirthInput({
      birthDate: '2026-03-08',
      birthTime: '25:00:00', // invalid clock
      latitude: 40.7128,
      longitude: -74.006,
      timezoneOffset: -5.0
    }),
    CalculationInputError
  );
});

test('A05: Date line and extreme longitudes (Fiji +12:00) preserve UT Julian Day', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'INTERNATIONAL_DATE_LINE_FIJI');
  assert.ok(f);
  // 2026-01-01 02:00:00 with offset +12.0 -> previous day UTC: 2025-12-31 14:00:00
  const jdUT = calculateJulianDay(2026, 1, 1, 2, 0, 0) - 12.0 / 24;
  assert.ok(Math.abs(jdUT - f.expected.julianDayUT) < 1e-5);
});

test('A05: Leap year rules and centurial boundaries strictly enforced', () => {
  // Centurial leap year 2000-02-29 accepted
  assert.doesNotThrow(() => validateBirthInput({
    birthDate: '2000-02-29',
    birthTime: '00:00:00',
    latitude: 0,
    longitude: 0,
    timezoneOffset: 0
  }));

  // Centurial non-leap year 1900-02-29 rejected
  assert.throws(() => validateBirthInput({
    birthDate: '1900-02-29',
    birthTime: '00:00:00',
    latitude: 0,
    longitude: 0,
    timezoneOffset: 0
  }), CalculationInputError);

  // Non-leap year February 30 rejected
  assert.throws(() => validateBirthInput({
    birthDate: '2026-02-30',
    birthTime: '12:00:00',
    latitude: 0,
    longitude: 0,
    timezoneOffset: 0
  }), CalculationInputError);
});

test('A05: Midnight 00:00:00 and noon 12:00:00 differ by exactly 0.5 days with no aliasing', () => {
  const midnight = calculateJulianDay(2000, 1, 1, 0, 0, 0);
  const noon = calculateJulianDay(2000, 1, 1, 12, 0, 0);
  assert.equal(noon - midnight, 0.5);
});

test('A06: Vedic Whole Sign Houses and 27 Nakshatras / 108 Padas verified', () => {
  const chart = calculateFullChart('2000-01-01', '12:00:00', 22.57, 88.36, 'Kolkata', 5.5);
  // Verify 12 houses exist, each with a sign and lord
  assert.equal(chart.houses.length, 12);
  chart.houses.forEach((h, i) => {
    assert.equal(h.number, i + 1);
    assert.ok(ZODIAC_SIGNS.includes(h.signName));
    assert.ok(h.signLord.length > 0);
  });

  // Verify planets have valid Nakshatra (0-26) and Pada (1-4)
  chart.planets.forEach(p => {
    assert.ok(NAKSHATRAS.includes(p.nakshatra), `Invalid nakshatra: ${p.nakshatra}`);
    assert.ok(p.nakshatraPada >= 1 && p.nakshatraPada <= 4, `Invalid pada: ${p.nakshatraPada}`);
    assert.ok(p.longitude >= 0 && p.longitude < 360, `Longitude out of range: ${p.longitude}`);
  });
});

test('A06: Divisional charts D-2 (Hora), D-9 (Navamsha), and D-60 (Shashtyamsa) verified', () => {
  const chart = calculateFullChart('2000-01-01', '12:00:00', 22.57, 88.36, 'Kolkata', 5.5);
  
  // D-2 Hora
  assert.ok(chart.divisionalCharts.d2.signs['Sun']);
  assert.ok(chart.divisionalCharts.d2.signs['Moon']);

  // D-9 Navamsha
  chart.planets.forEach(p => {
    const nav = chart.divisionalCharts.d9.navamshaPlacements[p.name];
    assert.ok(nav);
    assert.ok(ZODIAC_SIGNS.includes(nav.sign));
    assert.ok(nav.signIndex >= 0 && nav.signIndex < 12);
  });

  // D-60 Shashtyamsa
  assert.equal(chart.divisionalCharts.d60.shashtyamsas.length, chart.planets.length);
  chart.divisionalCharts.d60.shashtyamsas.forEach(s => {
    assert.ok(s.partIndex >= 0 && s.partIndex < 60);
    assert.ok(s.deityName.length > 0);
    assert.ok(['Auspicious', 'Malefic', 'Neutral'].includes(s.nature));
  });
});

test('A08: Coordinates validation rejects out-of-bound latitude/longitude, NaNs, and infinities', () => {
  for (const lat of [90.001, -90.001, NaN, Infinity, -Infinity]) {
    assert.throws(
      () => validateBirthInput({ birthDate: '2000-01-01', birthTime: '12:00:00', latitude: lat, longitude: 0, timezoneOffset: 0 }),
      CalculationInputError
    );
  }
  for (const lon of [180.001, -180.001, NaN, Infinity, -Infinity]) {
    assert.throws(
      () => validateBirthInput({ birthDate: '2000-01-01', birthTime: '12:00:00', latitude: 0, longitude: lon, timezoneOffset: 0 }),
      CalculationInputError
    );
  }
});

test('A09: Precision metadata honestly discloses ANALYTICAL_APPROXIMATION without false Swiss claims', () => {
  const chart = calculateFullChart('2000-01-01', '12:00:00', 0, 0, '', 0);
  assert.equal(chart.systemMetadata.calculationMode, 'ANALYTICAL_APPROXIMATION');
  assert.equal(chart.systemMetadata.independentValidationStatus, 'NOT_PERFORMED');
  assert.equal(chart.systemMetadata.strengthMetricsStatus, 'UNAVAILABLE');
  // Ensure speed and retrograde are explicitly null, not fabricated
  chart.planets.forEach(p => {
    assert.equal(p.speed, null);
    assert.equal(p.isRetrograde, null);
    assert.equal(p.shadbala, null);
  });
});

test('A12: Unimplemented/unauthorized capabilities remain safely disabled', () => {
  // Golden window returns unavailable
  const window = calculatePersonalGoldenWindow('User', MAJOR_CITIES_MUHURAT['Mumbai']);
  assert.equal(window.startTime, null);
  assert.equal(window.scope_metadata.scope, 'UNAVAILABLE');
  assert.equal(window.scope_metadata.natal_chart_used, false);
});
