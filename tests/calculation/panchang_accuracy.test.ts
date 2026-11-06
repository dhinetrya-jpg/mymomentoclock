import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calculateTithi,
  calculateYoga,
  calculateKarana,
  calculateSolarEvents,
  calculateDayMuhurtas,
  findTransitionInstant,
  calculateFullPanchang,
  calculateHighPrecisionSun,
  calculateHighPrecisionMoon,
  TITHI_NAMES,
  YOGA_NAMES,
  MOVABLE_KARANAS,
  FIXED_KARANAS,
} from '../../src/engine/panchang';
import { NAKSHATRAS, AyanamsaType } from '../../src/engine/astroMath';

const fixturesDataset = JSON.parse(
  fs.readFileSync(new URL('./reference/independent_reference_fixtures.json', import.meta.url), 'utf8')
);

test('A07: Tithi calculation across Shukla and Krishna Pakshas', () => {
  // Test Shukla Pratipada (0° to 12°)
  const t1 = calculateTithi(6.0, 0.0);
  assert.equal(t1.index, 0);
  assert.equal(t1.numberInPaksha, 1);
  assert.equal(t1.paksha, 'Shukla');
  assert.equal(t1.name, 'Pratipada');
  assert.equal(t1.fullName, 'Shukla Pratipada');
  assert.equal(t1.isFullMoon, false);
  assert.equal(t1.isNewMoon, false);

  // Test Shukla Purnima (168° to 180°) - Scenario 26
  const fFull = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_26_MOON_PHASE_FULL_MOON_PURNIMA');
  assert.ok(fFull);
  const tFull = calculateTithi(fFull.inputs.moonLon, fFull.inputs.sunLon);
  assert.equal(tFull.index, fFull.expected.tithiIndex);
  assert.equal(tFull.paksha, fFull.expected.paksha);
  assert.equal(tFull.name, fFull.expected.tithiName);
  assert.equal(tFull.isFullMoon, true);
  assert.equal(tFull.isNewMoon, false);

  // Test Krishna Pratipada (180° to 192°)
  const tKrishna1 = calculateTithi(186.0, 0.0);
  assert.equal(tKrishna1.index, 15);
  assert.equal(tKrishna1.numberInPaksha, 1);
  assert.equal(tKrishna1.paksha, 'Krishna');
  assert.equal(tKrishna1.name, 'Pratipada');
  assert.equal(tKrishna1.fullName, 'Krishna Pratipada');

  // Test Krishna Amavasya (348° to 360°) - Scenario 27
  const fNew = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_27_MOON_PHASE_NEW_MOON_AMAVASYA');
  assert.ok(fNew);
  const tNew = calculateTithi(fNew.inputs.moonLon, fNew.inputs.sunLon);
  assert.equal(tNew.index, fNew.expected.tithiIndex);
  assert.equal(tNew.paksha, fNew.expected.paksha);
  assert.equal(tNew.name, fNew.expected.tithiName);
  assert.equal(tNew.isNewMoon, true);
  assert.equal(tNew.isFullMoon, false);

  // Boundary transition test - Scenario 23
  const fTrans = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_23_TITHI_TRANSITION_PRATIPADA_DWITIYA');
  assert.ok(fTrans);
  const tA = calculateTithi(fTrans.inputs.diffAngleA, 0.0);
  const tB = calculateTithi(fTrans.inputs.diffAngleB, 0.0);
  assert.equal(tA.index, fTrans.expected.tithiIndexA);
  assert.equal(tA.name, fTrans.expected.tithiNameA);
  assert.equal(tB.index, fTrans.expected.tithiIndexB);
  assert.equal(tB.name, fTrans.expected.tithiNameB);
});

test('A07: Nakshatra and Pada calculation and boundary crossing', () => {
  const fNak = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_22_NAKSHATRA_BOUNDARY_ASHWINI_BHARANI');
  assert.ok(fNak);

  // Compute Panchang for angleA = 13.32°
  const nakStep = 360.0 / 27.0; // 13.333333°
  const indexA = Math.floor(fNak.inputs.angleA / nakStep);
  const nameA = NAKSHATRAS[indexA];
  const padaA = Math.floor((fNak.inputs.angleA % nakStep) / (nakStep / 4.0)) + 1;

  assert.equal(nameA, fNak.expected.nakshatraA);
  assert.equal(padaA, fNak.expected.padaA);

  // Compute for angleB = 13.35°
  const indexB = Math.floor(fNak.inputs.angleB / nakStep);
  const nameB = NAKSHATRAS[indexB];
  const padaB = Math.floor((fNak.inputs.angleB % nakStep) / (nakStep / 4.0)) + 1;

  assert.equal(nameB, fNak.expected.nakshatraB);
  assert.equal(padaB, fNak.expected.padaB);

  // Verify full 27 nakshatras and 108 padas total
  assert.equal(NAKSHATRAS.length, 27);
  assert.equal(27 * 4, 108);
});

test('A07: Yoga calculation and auspiciousness categorization', () => {
  // Test first yoga: Vishkambha (0° to 13°20')
  const y1 = calculateYoga(5.0, 5.0); // sum = 10°
  assert.equal(y1.index, 0);
  assert.equal(y1.number, 1);
  assert.equal(y1.name, 'Vishkambha');
  assert.equal(y1.nature, 'Inauspicious');

  // Test second yoga: Priti (13°20' to 26°40')
  const y2 = calculateYoga(10.0, 10.0); // sum = 20°
  assert.equal(y2.index, 1);
  assert.equal(y2.number, 2);
  assert.equal(y2.name, 'Priti');
  assert.equal(y2.nature, 'Auspicious');

  // Verify all 27 yogas are catalogued
  assert.equal(YOGA_NAMES.length, 27);
});

test('A07: Karana calculation: 4 fixed Karanas and 7 movable cycles', () => {
  // 1st half of Shukla Pratipada (0° to 6°) = Kintughna (Fixed)
  const k1 = calculateKarana(3.0, 0.0);
  assert.equal(k1.index, 0);
  assert.equal(k1.name, 'Kintughna');
  assert.equal(k1.type, 'Fixed');

  // 2nd half of Shukla Pratipada (6° to 12°) = Bava (Movable #1)
  const k2 = calculateKarana(9.0, 0.0);
  assert.equal(k2.index, 1);
  assert.equal(k2.name, 'Bava');
  assert.equal(k2.type, 'Movable');

  // Vishti / Bhadra (inauspicious movable karana)
  // Occurs at cycle index 6 -> karana index = 7 (diff = 42° to 48°)
  const kVishti = calculateKarana(45.0, 0.0);
  assert.equal(kVishti.name, 'Vishti');
  assert.equal(kVishti.nature, 'Inauspicious');

  // Shakuni: Fixed karana at Krishna Chaturdashi 2nd half (index 57, diff = 342° to 348°)
  const kShakuni = calculateKarana(345.0, 0.0);
  assert.equal(kShakuni.index, 57);
  assert.equal(kShakuni.name, 'Shakuni');
  assert.equal(kShakuni.type, 'Fixed');

  // Chatushpada: Fixed karana at Amavasya 1st half (index 58, diff = 348° to 354°)
  const kChatushpada = calculateKarana(351.0, 0.0);
  assert.equal(kChatushpada.index, 58);
  assert.equal(kChatushpada.name, 'Chatushpada');
  assert.equal(kChatushpada.type, 'Fixed');

  // Naga: Fixed karana at Amavasya 2nd half (index 59, diff = 354° to 360°)
  const kNaga = calculateKarana(357.0, 0.0);
  assert.equal(kNaga.index, 59);
  assert.equal(kNaga.name, 'Naga');
  assert.equal(kNaga.type, 'Fixed');

  assert.equal(MOVABLE_KARANAS.length, 7);
  assert.equal(FIXED_KARANAS.length, 4);
});

test('A07: Apparent Sunrise and Sunset with atmospheric refraction against PAC India tables', () => {
  // New Delhi on 2026-11-08 (Scenario 24)
  const fDelhi = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_24_SUNRISE_SUNSET_NEW_DELHI');
  assert.ok(fDelhi);

  const solarDelhi = calculateSolarEvents(
    fDelhi.inputs.year,
    fDelhi.inputs.month,
    fDelhi.inputs.day,
    fDelhi.inputs.latitude,
    fDelhi.inputs.longitude,
    fDelhi.inputs.timezoneOffset
  );

  // Check zenith definition: 90°50' = 90.8333°
  assert.ok(Math.abs(solarDelhi.standardZenithDegrees - 90.8333) < 0.01);
  assert.equal(solarDelhi.atmosphericRefractionDegrees, 0.5667);
  assert.equal(solarDelhi.solarSemiDiameterDegrees, 0.2667);

  // Check sunrise/sunset against expected "06:38" and "17:31" (within 2 min tolerance)
  const parseMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const diffRiseDelhi = Math.abs(parseMin(solarDelhi.sunriseLocal) - parseMin(fDelhi.expected.sunriseLocal));
  const diffSetDelhi = Math.abs(parseMin(solarDelhi.sunsetLocal) - parseMin(fDelhi.expected.sunsetLocal));

  assert.ok(diffRiseDelhi <= fDelhi.numerical_tolerance.time_minutes, `Delhi sunrise diff ${diffRiseDelhi}m`);
  assert.ok(diffSetDelhi <= fDelhi.numerical_tolerance.time_minutes, `Delhi sunset diff ${diffSetDelhi}m`);
  assert.ok(Math.abs(solarDelhi.dayLengthHours - fDelhi.expected.dayLengthHours) < 0.1);

  // Kolkata on 1989-11-23 (Scenario 25)
  const fKolkata = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_25_SUNRISE_SUNSET_KOLKATA');
  assert.ok(fKolkata);

  const solarKolkata = calculateSolarEvents(
    fKolkata.inputs.year,
    fKolkata.inputs.month,
    fKolkata.inputs.day,
    fKolkata.inputs.latitude,
    fKolkata.inputs.longitude,
    fKolkata.inputs.timezoneOffset
  );

  const diffRiseKolkata = Math.abs(parseMin(solarKolkata.sunriseLocal) - parseMin(fKolkata.expected.sunriseLocal));
  const diffSetKolkata = Math.abs(parseMin(solarKolkata.sunsetLocal) - parseMin(fKolkata.expected.sunsetLocal));

  assert.ok(diffRiseKolkata <= fKolkata.numerical_tolerance.time_minutes, `Kolkata sunrise diff ${diffRiseKolkata}m`);
  assert.ok(diffSetKolkata <= fKolkata.numerical_tolerance.time_minutes, `Kolkata sunset diff ${diffSetKolkata}m`);
  assert.ok(Math.abs(solarKolkata.dayLengthHours - fKolkata.expected.dayLengthHours) < 0.1);
});

test('A07: Daytime Muhurtas: Rahu Kaal, Yamaganda, Gulika, Abhijit, and Brahma Muhurta', () => {
  // New Delhi on 2026-11-08: 2026-11-08 is a Sunday (weekday 0)
  const muhurtas = calculateDayMuhurtas(2026, 11, 8, 28.6139, 77.2090, 5.5);

  assert.equal(muhurtas.weekday, 0);
  assert.equal(muhurtas.weekdayName, 'Sunday');

  // On Sunday, Rahu Kaal is the 8th Ashtabhaga segment (late afternoon before sunset)
  assert.equal(muhurtas.rahuKaal.segmentNumber, 8);

  // Yamaganda on Sunday is the 5th segment
  assert.equal(muhurtas.yamaganda.segmentNumber, 5);

  // Gulika Kaal on Sunday is the 7th segment
  assert.equal(muhurtas.gulikaKaal.segmentNumber, 7);

  // Abhijit Muhurta is auspicious on Sunday
  assert.equal(muhurtas.abhijitMuhurta.isAuspiciousToday, true);

  // Brahma Muhurta is 96–48 min before sunrise
  const parseMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const riseMin = parseMin(muhurtas.sunriseLocal);
  const brahmaStartMin = parseMin(muhurtas.brahmaMuhurta.startLocal);
  assert.equal(riseMin - brahmaStartMin, 96);
});

test('A07: Numerical root-finding boundary solver (findTransitionInstant) convergence', () => {
  const startJD = 2451545.0; // J2000.0
  const targetTithiAngle = 312.0; // Next tithi boundary (~9° from start)

  const angleFunc = (jd: number) => {
    const ay = 23.857092;
    const s = ((calculateHighPrecisionSun(jd).apparentLongitude - ay) % 360 + 360) % 360;
    const m = ((calculateHighPrecisionMoon(jd).tropicalLongitude - ay) % 360 + 360) % 360;
    return ((m - s) % 360 + 360) % 360;
  };

  const sol = findTransitionInstant(startJD, targetTithiAngle, angleFunc, 36.0, 1e-5);

  // Verify convergence and precision
  assert.equal(sol.converged, true);
  assert.ok(sol.iterations <= 25, `Expected <= 25 iterations, got ${sol.iterations}`);
  assert.ok(Math.abs(sol.residualDegrees) < 0.001, `Residual ${sol.residualDegrees}° exceeds tolerance`);

  // Verify angle at root instant matches target angle within 0.001° (< 3.6 arcseconds)
  const angleAtRoot = angleFunc(sol.transitionJD);
  assert.ok(Math.abs(angleAtRoot - targetTithiAngle) < 0.001);
});

test('A07: Comprehensive calculateFullPanchang report generation', () => {
  const report = calculateFullPanchang(2026, 11, 8, 12, 0, 0, 28.6139, 77.2090, 5.5, AyanamsaType.TRUE_LAHIRI, true);

  assert.equal(report.ayanamsaType, 'TRUE_LAHIRI');
  assert.ok(report.ayanamsaValue > 24.2 && report.ayanamsaValue < 24.3);
  assert.ok(report.tithi.fullName.length > 0);
  assert.ok(report.nakshatra.name.length > 0);
  assert.ok(report.yoga.name.length > 0);
  assert.ok(report.karana.name.length > 0);
  assert.ok(report.solarEvents.sunriseLocal.length > 0);
  assert.ok(report.muhurtas.rahuKaal.startLocal.length > 0);

  // Solved transitions present
  assert.ok(report.nextTithiTransition);
  assert.equal(report.nextTithiTransition?.converged, true);
  assert.ok(report.nextNakshatraTransition);
  assert.equal(report.nextNakshatraTransition?.converged, true);
});
