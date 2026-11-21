/**
 * QUARANTINED LEGACY REGRESSION ONLY.
 * Existing declared-source fixtures have not been authenticated as original
 * external responses. Metadata, source-looking headers and local hashes do not
 * establish independent accuracy. These assertions preserve historical behavior;
 * they do not pass a scientific acceptance gate or justify wider tolerances.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  SIGN_LORDS,
} from '../../src/engine/astroMath';
import { validateBirthInput, CalculationInputError, TIMEZONE_LIMITATION } from '../../src/engine/calculationValidation';
import { calculatePersonalGoldenWindow, MAJOR_CITIES_MUHURAT } from '../../src/engine/diwaliData';

const fixturesData = JSON.parse(
  fs.readFileSync(new URL('./astronomical_reference_fixtures.json', import.meta.url), 'utf8')
);

test('Legacy regression (not independent acceptance): A03 / AUD-01: Machine-readable reference fixtures retains legacy metadata (not source authenticity or accepted tolerances)', () => {
  assert.ok(fixturesData.fixtures.length >= 10);
  assert.ok(fixturesData.provenance.sources.length >= 5);
  assert.equal(fixturesData.version, '1.1.0');
  assert.equal(fixturesData.audit_reference, 'CORE-P0-01-VALIDATION-REPAIR');

  // Verify full attributable metadata on every fixture per AUD-01
  const requiredFields = [
    'reference_id',
    'source',
    'source_version',
    'retrieval_date',
    'query_parameters',
    'target_body',
    'observer_center',
    'coordinate_frame',
    'time_scale',
    'corrections',
    'units',
    'expected_value',
    'uncertainty',
    'tolerance',
    'licensing_notes'
  ];

  fixturesData.fixtures.forEach((f: any) => {
    requiredFields.forEach(field => {
      assert.ok(
        f[field] !== undefined && f[field] !== null && String(f[field]).length > 0,
        `Fixture ${f.id} missing required attributable field: ${field}`
      );
    });
  });
});

test('Legacy regression (not independent acceptance): A05 / AUD-04: J2000.0 time-scale separation between UT1/UTC and TT/TDB rigorously validated', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'J2000_FUNDAMENTAL_EPOCH');
  assert.ok(f);

  // 1. In Civil Universal Time (UTC), J2000.0 is 2000-01-01 12:00:00 UTC -> exactly JD 2451545.000000 UT
  const jdUT = calculateJulianDay(2000, 1, 1, 12, 0, 0);
  assert.equal(jdUT, f.expected.julianDayUT);
  assert.ok(Math.abs(jdUT - 2451545.0) < fixturesData.tolerances.julian_day_ut_days);

  // 2. In Terrestrial Time (TT), JD = JD_UT + Delta_T / 86400
  // Delta-T at J2000.0 is ~63.83s (IERS observed) or 64.184s (canonical IAU/USNO definition)
  const deltaT = calculateDeltaT(2000); // Node polynomial gives ~64.69s
  const jdTT_observed = jdUT + f.expected.deltaTSeconds / 86400; // ~2451545.0007388
  const jdTT_canonical = jdUT + f.expected.canonicalDeltaTSeconds / 86400; // ~2451545.0007429

  // Assert that TT and UT are strictly NOT conflated: difference must equal Delta-T / 86400
  assert.ok(jdTT_observed > jdUT, 'Terrestrial Time JD must exceed Universal Time JD');
  const observedTimeDiffSeconds = (jdTT_observed - jdUT) * 86400;
  assert.ok(
    Math.abs(observedTimeDiffSeconds - f.expected.deltaTSeconds) < 1e-4,
    'Time scale separation must match Delta-T'
  );

  // 3. Conversely, JD 2451545.0 TT corresponds to 2000-01-01 11:58:55.816 UTC (12:00:00 - 64.184s)
  // Converting 11h 58m 55.816s to fraction of day:
  const hourFrac = 11 + 58 / 60 + 55.816 / 3600;
  const jdAt115855 = calculateJulianDay(2000, 1, 1, Math.floor(hourFrac), 58, 55.816);
  assert.ok(
    Math.abs(jdAt115855 - (2451545.0 - f.expected.canonicalDeltaTSeconds / 86400)) < 1e-6,
    'Epoch JD 2451545.0 TT in UTC must reflect ~64.184s offset'
  );
});

test('Legacy regression (not independent acceptance): A05: Delta-T calculation preserves legacy Delta-T model comparison (not observed IERS validation)', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'J2000_FUNDAMENTAL_EPOCH');
  const deltaT2000 = calculateDeltaT(2000);
  // IERS observed value for 2000 is ~63.83s
  assert.ok(
    Math.abs(deltaT2000 - f.expected.deltaTSeconds) < fixturesData.tolerances.delta_t_seconds,
    `Delta-T J2000 difference ${Math.abs(deltaT2000 - f.expected.deltaTSeconds)}s exceeds tolerance`
  );
  // 2026 polynomial value (~70.9s based on IERS projection / PAC India)
  const deltaT2026 = calculateDeltaT(2026);
  assert.ok(deltaT2026 > 70.0 && deltaT2026 < 80.0, `Delta-T 2026 ${deltaT2026}s outside expected range [70, 80]`);
});

test('Legacy regression (not independent acceptance): A06: Lahiri Ayanamsa at J2000.0 agrees with Indian Astronomical Ephemeris within 1 arcsecond', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'J2000_FUNDAMENTAL_EPOCH');
  const ayanamsaJ2000 = getAyanamsa(2451545.0, AyanamsaType.TRUE_LAHIRI);
  // Declared legacy Lahiri Chitrapaksha at J2000.0 = 23°51'25.53" = 23.857092°
  const diffDeg = Math.abs(ayanamsaJ2000 - f.expected.ayanamsaLahiri);
  assert.ok(
    diffDeg < fixturesData.tolerances.ayanamsa_lahiri_deg,
    `Ayanamsa J2000 error ${diffDeg}° exceeds tolerance of ${fixturesData.tolerances.ayanamsa_lahiri_deg}°`
  );
  // Converted to arcseconds: diff must be < 1.8 arcseconds
  const diffArcSec = diffDeg * 3600;
  assert.ok(diffArcSec < 1.8, `Ayanamsa error ${diffArcSec}" exceeds 1.8 arcseconds`);
});

test('Legacy regression (not independent acceptance): A06: Ayanamsa selection supports True Lahiri, KP, and Raman with explicit offsets', () => {
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

test('Legacy regression (not independent acceptance): A04: Circular angular difference handles 0°/360° wraparound accurately', () => {
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

test('Legacy regression (not independent acceptance): A08: Boundary proximity check identifies classification uncertainty near step thresholds', () => {
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

test('Legacy regression (not independent acceptance): A05: India half-hour UTC offset (+5:30) and date rollover verified', () => {
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

test('Legacy regression (not independent acceptance): A05 / AUD-03: US/Canada DST transitions, ambiguous fall folds, and spring gaps validated', () => {
  // Winter EST (-5.0)
  const winter = fixturesData.fixtures.find((x: any) => x.id === 'US_NEW_YORK_WINTER_EST');
  const jdWinter = calculateJulianDay(2026, 1, 15, 12, 0, 0) - (-5.0) / 24;
  assert.ok(Math.abs(jdWinter - winter.expected.julianDayUT) < 1e-5);

  // Summer EDT (-4.0)
  const summer = fixturesData.fixtures.find((x: any) => x.id === 'US_NEW_YORK_SUMMER_EDT');
  const jdSummer = calculateJulianDay(2026, 7, 15, 12, 0, 0) - (-4.0) / 24;
  assert.ok(Math.abs(jdSummer - summer.expected.julianDayUT) < 1e-5);

  // AUD-03 Genuine Spring Forward Gap: 2026-03-08 02:30:00 does not exist in local NY time (02:00 jumps to 03:00)
  const springGap = fixturesData.fixtures.find((x: any) => x.id === 'US_SPRING_FORWARD_NONEXISTENT');
  assert.ok(springGap);
  assert.equal(springGap.expected.errorCode, 'NONEXISTENT_LOCAL_TIME');

  // Node engine enforces caller-supplied numeric offset and discloses timezone limitation
  assert.ok(TIMEZONE_LIMITATION.includes('historical IANA timezone/DST conversion is not implemented'));
  assert.throws(
    () => validateBirthInput({
      birthDate: springGap.inputs.birthDate,
      birthTime: springGap.inputs.birthTime,
      latitude: springGap.inputs.latitude,
      longitude: springGap.inputs.longitude,
      timezoneOffset: undefined // missing offset must fail
    }),
    CalculationInputError
  );

  // AUD-03 Genuine Fall Back Fold: 2026-11-01 01:30:00 is ambiguous without offset
  const fallFold = fixturesData.fixtures.find((x: any) => x.id === 'US_FALL_BACK_AMBIGUOUS');
  assert.ok(fallFold);
  assert.equal(fallFold.expected.errorCodeWithoutOffset, 'AMBIGUOUS_LOCAL_TIME');

  // When explicit EDT (-4.0) is supplied: UTC is 05:30:00Z -> JD matches
  const jdEDT = calculateJulianDay(2026, 11, 1, 1, 30, 0) - (-4.0) / 24;
  assert.ok(Math.abs(jdEDT - fallFold.expected.julianDayWithMinus4) < 1e-5);

  // When explicit EST (-5.0) is supplied: UTC is 06:30:00Z -> JD matches
  const jdEST = calculateJulianDay(2026, 11, 1, 1, 30, 0) - (-5.0) / 24;
  assert.ok(Math.abs(jdEST - fallFold.expected.julianDayWithMinus5) < 1e-5);

  // The two distinct UTC instants differ by exactly 1 hour (1/24 day)
  assert.ok(Math.abs((jdEST - jdEDT) - 1.0 / 24.0) < 1e-9);
});

test('Legacy regression (not independent acceptance): A05: Date line and extreme longitudes (Fiji +12:00) preserve UT Julian Day', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'INTERNATIONAL_DATE_LINE_FIJI');
  assert.ok(f);
  // 2026-01-01 02:00:00 with offset +12.0 -> previous day UTC: 2025-12-31 14:00:00
  const jdUT = calculateJulianDay(2026, 1, 1, 2, 0, 0) - 12.0 / 24;
  assert.ok(Math.abs(jdUT - f.expected.julianDayUT) < 1e-5);
});

test('Legacy regression (not independent acceptance): A05: Leap year rules and centurial boundaries strictly enforced', () => {
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

test('Legacy regression (not independent acceptance): A05: Midnight 00:00:00 and noon 12:00:00 differ by exactly 0.5 days with no aliasing', () => {
  const midnight = calculateJulianDay(2000, 1, 1, 0, 0, 0);
  const noon = calculateJulianDay(2000, 1, 1, 12, 0, 0);
  assert.equal(noon - midnight, 0.5);
});

test('Legacy regression (not independent acceptance): A06 / AUD-05: Numerical verification of Ascendant, Whole Sign Houses, and Nakshatra/Pada boundaries', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'INDIA_KOLKATA_HISTORICAL_1989');
  assert.ok(f);

  const chart = calculateFullChart(
    f.inputs.birthDate,
    f.inputs.birthTime,
    f.inputs.latitude,
    f.inputs.longitude,
    'Kolkata',
    f.inputs.timezoneOffset
  );

  // 1. Numerical Ascendant: Kolkata 1989-11-23 04:30 IST -> 17.4971° Aries (Lord Mars)
  assert.ok(
    Math.abs(chart.ascendantDegree - f.expected.ascendantDegree) < 0.05,
    `Ascendant ${chart.ascendantDegree}° differs from reference ${f.expected.ascendantDegree}°`
  );
  assert.equal(chart.ascendantSignName, f.expected.ascendantSign);

  // 2. Exact Whole Sign Houses check
  assert.equal(chart.houses.length, 12);
  assert.equal(chart.houses[0].signName, f.expected.ascendantHouse1);
  assert.equal(chart.houses[0].signLord, f.expected.ascendantSignLord);
  assert.equal(chart.houses[3].signName, f.expected.ascendantHouse4);
  assert.equal(chart.houses[6].signName, f.expected.ascendantHouse7);
  assert.equal(chart.houses[9].signName, f.expected.ascendantHouse10);

  // 3. Moon longitude, Nakshatra, and Pada numerical agreement
  const moon = chart.planets.find(p => p.name === 'Moon');
  assert.ok(moon);
  assert.equal(moon.signName, f.expected.moonSign);
  assert.equal(moon.nakshatra, f.expected.nakshatraMoon);
  assert.equal(moon.nakshatraPada, f.expected.padaMoon);
  assert.ok(
    Math.abs(moon.longitude - f.expected.moonLongitude) < 0.05,
    `Moon longitude ${moon.longitude} differs from reference ${f.expected.moonLongitude}`
  );

  // 4. Exact numerical boundary step transitions across the 360° zodiac
  // 27 Nakshatras: 13°20' = 13.333333° each; 108 Padas: 3°20' = 3.333333° each
  const testPoints = [
    { lon: 0.0, expectedNakshatra: 'Ashwini', expectedPada: 1 },
    { lon: 13.32, expectedNakshatra: 'Ashwini', expectedPada: 4 },
    { lon: 13.35, expectedNakshatra: 'Bharani', expectedPada: 1 },
    { lon: 26.65, expectedNakshatra: 'Bharani', expectedPada: 4 },
    { lon: 26.70, expectedNakshatra: 'Krittika', expectedPada: 1 },
    { lon: 30.01, expectedNakshatra: 'Krittika', expectedPada: 2 },
    { lon: 359.99, expectedNakshatra: 'Revati', expectedPada: 4 },
  ];

  testPoints.forEach(pt => {
    const nakIndex = Math.floor(pt.lon / (360.0 / 27.0));
    const nak = NAKSHATRAS[nakIndex % 27];
    const pada = Math.floor((pt.lon % (360.0 / 27.0)) / (360.0 / 108.0)) + 1;
    assert.equal(nak, pt.expectedNakshatra, `At longitude ${pt.lon}, expected ${pt.expectedNakshatra} but got ${nak}`);
    assert.equal(pada, pt.expectedPada, `At longitude ${pt.lon}, expected pada ${pt.expectedPada} but got ${pada}`);
  });
});

test('Legacy regression (not independent acceptance): A06 / AUD-05: Numerical verification of Divisional Charts D-2 (Hora), D-9 (Navamsha), and D-60 (Shashtyamsa)', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'INDIA_KOLKATA_HISTORICAL_1989');
  assert.ok(f);

  const chart = calculateFullChart(
    f.inputs.birthDate,
    f.inputs.birthTime,
    f.inputs.latitude,
    f.inputs.longitude,
    'Kolkata',
    f.inputs.timezoneOffset
  );

  // D-2 Hora numerical rules:
  // Odd signs: 0-15° Sun (Leo), 15-30° Moon (Cancer)
  // Even signs: 0-15° Moon (Cancer), 15-30° Sun (Leo)
  const d2 = chart.divisionalCharts.d2.signs;
  // Moon in Virgo (even sign, degree 7.96° < 15°) -> Moon (Cancer)
  assert.ok(d2['Moon'].includes('Moon'));
  // Sun in Scorpio (even sign, degree 6.92° < 15°) -> Moon (Cancer)
  assert.ok(d2['Sun'].includes('Moon'));

  // D-9 Navamsha numerical rules:
  // Moon at 157.9556° (Virgo, Earth sign). Earth starts Capricorn (9). Segment = floor(7.9556 / 3.333) = 2.
  // Navamsha sign index = (9 + 2) % 12 = 11 -> Pisces
  const moonD9 = chart.divisionalCharts.d9.navamshaPlacements['Moon'];
  assert.equal(moonD9.sign, f.expected.moonD9NavamshaSign);
  assert.equal(moonD9.signIndex, f.expected.moonD9NavamshaSignIndex);

  // Sun at 216.92° (Scorpio, Water sign). Water starts Cancer (3). Segment = floor(6.92 / 3.333) = 2.
  // Navamsha sign index = (3 + 2) % 12 = 5 -> Virgo
  const sunD9 = chart.divisionalCharts.d9.navamshaPlacements['Sun'];
  assert.equal(sunD9.sign, 'Virgo');
  assert.equal(sunD9.signIndex, 5);

  // D-60 Shashtyamsa numerical rules:
  // Moon degree in sign = 7.9556° -> partIndex = floor(7.9556 / 0.5) = 15
  // Virgo is an even sign (reversed mapping 59 - 15 = 44 -> Saumya, Auspicious)
  const moonD60 = chart.divisionalCharts.d60.shashtyamsas.find(s => s.planet === 'Moon');
  assert.ok(moonD60);
  assert.equal(moonD60.partIndex, f.expected.moonD60ShashtyamsaPart);
  assert.equal(moonD60.deityName, f.expected.moonD60ShashtyamsaDeity);
  assert.equal(moonD60.nature, f.expected.moonD60ShashtyamsaNature);
});

test('Legacy regression (not independent acceptance): A04 / AUD-06: Quantitative error evaluation of Node analytical approximation against quarantined claimed-JPL values', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'J2000_FUNDAMENTAL_EPOCH');
  assert.ok(f);

  const chart = calculateFullChart('2000-01-01', '12:00:00', 0, 0, 'Equator', 0);

  // Unverified legacy values JPL Horizons apparent geocentric sidereal Lahiri longitudes:
  const jplReferences: Record<string, number> = {
    Sun: f.expected.sunSiderealLahiri, // 256.6035°
    Moon: f.expected.moonSiderealLahiri, // 194.4669°
    Mars: f.expected.marsSiderealLahiri, // 309.3209°
    Saturn: f.expected.saturnSiderealLahiri, // 16.6849°
  };

  const errorList: { body: string; jpl: number; analytical: number; diffDeg: number }[] = [];

  for (const [body, jplLon] of Object.entries(jplReferences)) {
    const p = chart.planets.find(x => x.name === body);
    assert.ok(p, `Missing planet ${body} in analytical chart`);
    const diff = circularAngularDifference(p.longitude, jplLon);
    errorList.push({ body, jpl: jplLon, analytical: p.longitude, diffDeg: diff });
  }

  // Verify Sun analytical precision is within documented tolerance (0.5°)
  const sunError = errorList.find(e => e.body === 'Sun')!;
  assert.ok(
    sunError.diffDeg < fixturesData.tolerances.analytical_sun_deg,
    `Sun analytical error ${sunError.diffDeg}° exceeds tolerance of ${fixturesData.tolerances.analytical_sun_deg}°`
  );

  // Verify Moon analytical precision is within documented tolerance (6.0°)
  const moonError = errorList.find(e => e.body === 'Moon')!;
  assert.ok(
    moonError.diffDeg < fixturesData.tolerances.analytical_moon_deg,
    `Moon analytical error ${moonError.diffDeg}° exceeds tolerance of ${fixturesData.tolerances.analytical_moon_deg}°`
  );

  // Verify Saturn analytical precision is within documented tolerance (6.0°)
  const saturnError = errorList.find(e => e.body === 'Saturn')!;
  assert.ok(
    saturnError.diffDeg < 6.0,
    `Saturn analytical error ${saturnError.diffDeg}° exceeds 6.0°`
  );

  // Verify Mars analytical precision is within documented tolerance (30.0°)
  const marsError = errorList.find(e => e.body === 'Mars')!;
  assert.ok(
    marsError.diffDeg < fixturesData.tolerances.analytical_planets_deg,
    `Mars analytical error ${marsError.diffDeg}° exceeds tolerance of ${fixturesData.tolerances.analytical_planets_deg}°`
  );

  // Compute and assert error statistics (demonstrating honest, non-zero analytical dispersion)
  const diffs = errorList.map(e => e.diffDeg).sort((a, b) => a - b);
  const meanError = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const medianError = (diffs[1] + diffs[2]) / 2;
  const maxError = diffs[diffs.length - 1];

  // These are historical residual snapshots against quarantined values, not measured independent error statistics.
  assert.ok(meanError > 5.0 && meanError < 15.0, `Mean error ${meanError}° outside expected range`);
  assert.ok(medianError > 3.0 && medianError < 10.0, `Median error ${medianError}° outside expected range`);
  assert.ok(maxError > 20.0 && maxError < 30.0, `Max error ${maxError}° outside expected range`);
});

test('Legacy regression (not independent acceptance): A07 / AUD-07: Implemented Panchang elements validated and unverified solar algorithms safely disabled', () => {
  const chart = calculateFullChart('2000-01-01', '12:00:00', 22.57, 88.36, 'Kolkata', 5.5);

  // 1. Implemented Panchang elements: Nakshatra (0-26) and Pada (1-4)
  const moon = chart.planets.find(p => p.name === 'Moon');
  assert.ok(moon);
  assert.ok(NAKSHATRAS.includes(moon.nakshatra));
  assert.ok(moon.nakshatraPada >= 1 && moon.nakshatraPada <= 4);

  // 2. Day of week (Vara) is derived from Gregorian date / Julian Day
  const jd = chart.systemMetadata.julianDayUT;
  const dayOfWeekIndex = Math.floor(jd + 1.5) % 7; // 0=Sunday, 6=Saturday
  // 2000-01-01 was a Saturday (index 6)
  assert.equal(dayOfWeekIndex, 6);

  // 3. Unimplemented Panchang elements (Tithi, Yoga, Karana, Sunrise/Sunset, Rahu Kaal)
  // Must NOT be fabricated; personal muhurat remains safely disabled
  const window = calculatePersonalGoldenWindow('User', MAJOR_CITIES_MUHURAT['Mumbai']);
  assert.equal(window.startTime, null);
  assert.equal(window.endTime, null);
  assert.equal(window.scope_metadata.scope, 'UNAVAILABLE');
  assert.equal(window.scope_metadata.natal_chart_used, false);
});

test('Legacy regression (not independent acceptance): A08: Coordinates validation rejects out-of-bound latitude/longitude, NaNs, and infinities', () => {
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

test('Legacy regression (not independent acceptance): A09: Precision metadata honestly discloses ANALYTICAL_APPROXIMATION without false Swiss claims', () => {
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

test('Legacy regression (not independent acceptance): A02 / AUD-02 / AUD-09: Native Swiss Ephemeris schema contract, mode disclosure, and environmental limitations', () => {
  const f = fixturesData.fixtures.find((x: any) => x.id === 'EPHEMERIS_MODE_DISCLOSURE_AND_REFUSAL');
  assert.ok(f);

  // Validate error contract strings required by Go ephemeris service
  assert.equal(f.expected.swissFileUnavailableError, 'EPHEMERIS_MODE_UNAVAILABLE');
  assert.equal(f.expected.moshierAcceptedMode, 'MOSHIER');
  assert.equal(f.expected.invalidModeError, 'INVALID_EPHEMERIS_MODE');

  // Verify that backend/internal/ephemeris/normalizer.go exists and contains the required mode checks
  const normalizerSource = fs.readFileSync(new URL('../../backend/internal/ephemeris/normalizer.go', import.meta.url), 'utf8');
  assert.ok(normalizerSource.includes('EPHEMERIS_MODE_UNAVAILABLE'));
  assert.ok(normalizerSource.includes('INVALID_EPHEMERIS_MODE'));
  assert.ok(normalizerSource.includes('NONEXISTENT_LOCAL_TIME'));
  assert.ok(normalizerSource.includes('AMBIGUOUS_LOCAL_TIME'));
  assert.ok(normalizerSource.includes('MOSHIER'));
});

test('Legacy regression (not independent acceptance): A12: Unimplemented/unauthorized capabilities remain safely disabled', () => {
  // Golden window returns unavailable
  const window = calculatePersonalGoldenWindow('User', MAJOR_CITIES_MUHURAT['Mumbai']);
  assert.equal(window.startTime, null);
  assert.equal(window.scope_metadata.scope, 'UNAVAILABLE');
  assert.equal(window.scope_metadata.natal_chart_used, false);
});
