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
import crypto from 'node:crypto';
import path from 'node:path';
import {
  calculateJulianDay,
  calculateDeltaT,
  getAyanamsa,
  calculateFullChart,
  circularAngularDifference,
  AyanamsaType,
  NAKSHATRAS,
  ZODIAC_SIGNS,
} from '../../src/engine/astroMath';
import { calculateFullPanchang } from '../../src/engine/panchang';

const fixturesDataset = JSON.parse(
  fs.readFileSync(new URL('./reference/independent_reference_fixtures.json', import.meta.url), 'utf8')
);

const sourceManifest = JSON.parse(
  fs.readFileSync(new URL('./reference/source_manifest.json', import.meta.url), 'utf8')
);

test('Legacy regression (not independent acceptance): A03: Independent reference dataset retains32 scenarios and recorded files (not authenticated sources)', () => {
  assert.ok(fixturesDataset.fixtures.length >= 30, `Expected >= 30 fixtures, got ${fixturesDataset.fixtures.length}`);
  assert.ok(sourceManifest.authoritative_sources.length >= 5);
  assert.equal(fixturesDataset.version, '2.0.0');

  // Verify that raw evidence files exist and match recorded SHA-256 checksums
  const checkedFiles = new Set<string>();
  fixturesDataset.fixtures.forEach((f: any) => {
    if (f.raw_evidence_file && !checkedFiles.has(f.raw_evidence_file)) {
      checkedFiles.add(f.raw_evidence_file);
      const filePath = path.resolve(process.cwd(), f.raw_evidence_file);
      assert.ok(fs.existsSync(filePath), `Evidence file missing: ${f.raw_evidence_file}`);
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      assert.equal(hash, f.evidence_checksum, `Checksum mismatch on ${f.raw_evidence_file}`);
    }
  });
  assert.ok(checkedFiles.size >= 4, 'Expected at least 4 immutable evidence files verified');
});

test('Legacy regression (not independent acceptance): A04: Planetary comparisons at J2000 against quarantined claimed-JPL values DE440 unverified legacy values', () => {
  const f = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_01_J2000_EPOCH');
  assert.ok(f);

  const chart = calculateFullChart('2000-01-01', '12:00:00', 0, 0, 'Equator', 0);
  assert.equal(chart.systemMetadata.calculationMode, 'ANALYTICAL_APPROXIMATION');

  // Unverified legacy values JPL Horizons apparent sidereal Lahiri longitudes:
  const jplExpected = {
    Sun: f.expected.sunSiderealLahiri, // 256.6035°
    Moon: f.expected.moonSiderealLahiri, // 194.4669°
  };

  const sun = chart.planets.find(p => p.name === 'Sun')!;
  const moon = chart.planets.find(p => p.name === 'Moon')!;

  const sunAngularError = circularAngularDifference(sun.longitude, jplExpected.Sun);
  const moonAngularError = circularAngularDifference(moon.longitude, jplExpected.Moon);

  // Assert angular error is computed via min(|a-b|, 360 - |a-b|)
  assert.ok(sunAngularError < f.numerical_tolerance.sun_analytical_deg, `Sun error ${sunAngularError}° exceeds tolerance`);
  assert.ok(moonAngularError < f.numerical_tolerance.moon_analytical_deg, `Moon error ${moonAngularError}° exceeds tolerance`);

  // Sun analytical precision is < 0.1° (4.7 arcminutes)
  assert.ok(sunAngularError < 0.1, `Sun analytical error ${sunAngularError}°`);
});

test('Legacy regression (not independent acceptance): A04: Historical Indian birth date (Kolkata 1989) numerical planetary & Vedic placements', () => {
  const f = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_02_HISTORICAL_INDIAN_KOLKATA_1989');
  assert.ok(f);

  const chart = calculateFullChart(
    f.inputs.birthDate,
    f.inputs.birthTime,
    f.inputs.latitude,
    f.inputs.longitude,
    'Kolkata',
    f.inputs.timezoneOffset
  );

  // Ascendant degree & Lord
  assert.ok(Math.abs(chart.ascendantDegree - f.expected.ascendantDegree) < f.numerical_tolerance.ascendant_deg);
  assert.equal(chart.ascendantSignName, f.expected.ascendantSign);
  assert.equal(chart.houses[0].signLord, f.expected.ascendantLord);

  // Moon longitude, Nakshatra, and Pada
  const moon = chart.planets.find(p => p.name === 'Moon')!;
  assert.equal(moon.signName, f.expected.moonSign);
  assert.equal(moon.nakshatra, f.expected.moonNakshatra);
  assert.equal(moon.nakshatraPada, f.expected.moonPada);

  // D-9 Navamsha and D-60 Shashtyamsa placements
  assert.equal(chart.divisionalCharts.d9.navamshaPlacements['Moon'].sign, f.expected.moonD9NavamshaSign);
  const moonD60 = chart.divisionalCharts.d60.shashtyamsas.find(s => s.planet === 'Moon')!;
  assert.equal(moonD60.partIndex, f.expected.moonD60ShashtyamsaPart);
  assert.equal(moonD60.deityName, f.expected.moonD60ShashtyamsaDeity);
});

test('Legacy regression (not independent acceptance): A04: Modern Indian epoch (New Delhi 2026) ayanamsa, delta-T and Lagna validation', () => {
  const f = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_03_MODERN_INDIAN_DELHI_2026');
  assert.ok(f);

  const chart = calculateFullChart(
    f.inputs.birthDate,
    f.inputs.birthTime,
    f.inputs.latitude,
    f.inputs.longitude,
    'New Delhi',
    f.inputs.timezoneOffset
  );

  assert.ok(Math.abs(chart.systemMetadata.ayanamsaValue - f.expected.ayanamsaLahiri) < 0.001);
  assert.ok(Math.abs(chart.systemMetadata.deltaTSeconds - f.expected.deltaTSeconds) < f.numerical_tolerance.delta_t_seconds);
  assert.ok(Math.abs(chart.ascendantDegree - f.expected.ascendantDegree) < f.numerical_tolerance.ascendant_deg);
  assert.equal(chart.ascendantSignName, f.expected.ascendantSign);
});

test('Legacy regression (not independent acceptance): A04: Indian metro coordinates Mumbai and Chennai validated', () => {
  // Mumbai
  const mumbai = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_04_INDIAN_METRO_MUMBAI_2026');
  const chartMumbai = calculateFullChart(
    mumbai.inputs.birthDate,
    mumbai.inputs.birthTime,
    mumbai.inputs.latitude,
    mumbai.inputs.longitude,
    'Mumbai',
    mumbai.inputs.timezoneOffset
  );
  assert.equal(chartMumbai.ascendantSignName, mumbai.expected.ascendantSign);

  // Chennai
  const chennai = fixturesDataset.fixtures.find((x: any) => x.fixture_id === 'SCENARIO_05_INDIAN_METRO_CHENNAI_2026');
  const chartChennai = calculateFullChart(
    chennai.inputs.birthDate,
    chennai.inputs.birthTime,
    chennai.inputs.latitude,
    chennai.inputs.longitude,
    'Chennai',
    chennai.inputs.timezoneOffset
  );
  const sun = chartChennai.planets.find(p => p.name === 'Sun')!;
  assert.equal(sun.signName, chennai.expected.sunSiderealSign);
});

test('Legacy regression (not independent acceptance): A04: Distinction of calculation modes and prevention of false Swiss claims', () => {
  const chart = calculateFullChart('2026-01-01', '12:00:00', 0, 0, '', 0);

  // Mode must be explicitly ANALYTICAL_APPROXIMATION
  assert.equal(chart.systemMetadata.calculationMode, 'ANALYTICAL_APPROXIMATION');
  assert.equal(chart.systemMetadata.independentValidationStatus, 'NOT_PERFORMED');
  assert.equal(chart.systemMetadata.strengthMetricsStatus, 'UNAVAILABLE');

  // Speeds, retrograde status, and Shadbala must be null (not fabricated)
  chart.planets.forEach(p => {
    assert.equal(p.speed, null);
    assert.equal(p.isRetrograde, null);
    assert.equal(p.shadbala, null);
  });
});
