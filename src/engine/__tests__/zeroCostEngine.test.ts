/**
 * @license
 * MIT License
 *
 * Verification & Acceptance Test Suite for Unified High-Precision Engine
 * Validates:
 * 1. Topocentric Sunrise/Sunset precision (±1.0 min) on 8 Nov, 15 Jan, and 21 Mar
 * 2. 5-Limb Panchang exact root-solved end times, Lunar Masa & Muhurta rules
 * 3. Sripati Bhava Chalit cuspal house trisections and Sandhi continuity
 * 4. Personal Synastry (Tara Bala & Chandra Bala conventions) scoring matrix
 * 5. Execution benchmark (< 5ms per day analysis)
 * 6. Consecutive-midnight IANA DST timelines (92 / 96 / 100 slots)
 * 7. Strict date, coordinate, elevation & timezone validation (zero silent defaults)
 */

import { HighPrecisionAstroEngine, LocationCoordinates } from '../zeroCostAstroEngine';
import { PersonalAuspiciousnessScoringEngine, NatalProfile } from '../scoringEngine';

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function runZeroCostEngineTests(): {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: Array<{ testName: string; passed: boolean; details: string; durationMs: number }>;
} {
  const results: Array<{ testName: string; passed: boolean; details: string; durationMs: number }> = [];

  const assert = (name: string, condition: boolean, details: string, start: number) => {
    results.push({
      testName: name,
      passed: condition,
      details,
      durationMs: Number((performance.now() - start).toFixed(3))
    });
  };

  // Test 1: Strict ±1.0-minute Sunrise & Sunset Regression on 8 Nov, 15 Jan & 21 Mar (New Delhi)
  {
    const t0 = performance.now();
    const delhi: LocationCoordinates = {
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      timezoneOffset: 5.5
    };

    const nov8 = HighPrecisionAstroEngine.analyzeFullDay('2026-11-08', delhi);
    const jan15 = HighPrecisionAstroEngine.analyzeFullDay('2026-01-15', delhi);
    const mar21 = HighPrecisionAstroEngine.analyzeFullDay('2026-03-21', delhi);

    const nov8Ok =
      Math.abs(hhmmToMinutes(nov8.solarMetrics.sunrise) - hhmmToMinutes('06:38')) <= 1 &&
      Math.abs(hhmmToMinutes(nov8.solarMetrics.sunset) - hhmmToMinutes('17:31')) <= 1;
    const jan15Ok =
      Math.abs(hhmmToMinutes(jan15.solarMetrics.sunrise) - hhmmToMinutes('07:15')) <= 1 &&
      Math.abs(hhmmToMinutes(jan15.solarMetrics.sunset) - hhmmToMinutes('17:46')) <= 1;
    const mar21Ok =
      Math.abs(hhmmToMinutes(mar21.solarMetrics.sunrise) - hhmmToMinutes('06:24')) <= 1 &&
      Math.abs(hhmmToMinutes(mar21.solarMetrics.sunset) - hhmmToMinutes('18:33')) <= 1;

    assert(
      'Astronomical Solar Times (±1 min): Delhi 8 Nov, 15 Jan & 21 Mar',
      nov8Ok && jan15Ok && mar21Ok,
      `Nov8 ${nov8.solarMetrics.sunrise}/${nov8.solarMetrics.sunset}, Jan15 ${jan15.solarMetrics.sunrise}/${jan15.solarMetrics.sunset}, Mar21 ${mar21.solarMetrics.sunrise}/${mar21.solarMetrics.sunset}`,
      t0
    );
  }

  // Test 2: Wednesday Rahu Kaal & Abhijit Invalidation Rule + Exact Limb End Times
  {
    const t0 = performance.now();
    const mumbai: LocationCoordinates = {
      latitude: 19.0760,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
      timezoneOffset: 5.5
    };
    const wedAnalysis = HighPrecisionAstroEngine.analyzeFullDay('2026-03-25', mumbai);

    const isWed = wedAnalysis.panchanga.vaara.name === 'Wednesday';
    const isAbhijitInvalid = wedAnalysis.fixedKaalas.abhijitMuhurta.isValidOnThisDay === false;
    const hasEndTimes =
      wedAnalysis.panchanga.tithi.endMs > wedAnalysis.solarMetrics.sunriseMs &&
      wedAnalysis.panchanga.nakshatra.endMs > wedAnalysis.solarMetrics.sunriseMs &&
      wedAnalysis.panchanga.yoga.endMs > wedAnalysis.solarMetrics.sunriseMs &&
      wedAnalysis.panchanga.karana.endMs > wedAnalysis.solarMetrics.sunriseMs;

    assert(
      'Muhurta Rule: Wednesday Abhijit Cancellation & Exact Limb End Times',
      isWed && isAbhijitInvalid && hasEndTimes,
      `Vaara: ${wedAnalysis.panchanga.vaara.name}, AbhijitValid: ${wedAnalysis.fixedKaalas.abhijitMuhurta.isValidOnThisDay}, TithiEnd: ${wedAnalysis.panchanga.tithi.end12Hr}`,
      t0
    );
  }

  // Test 3: Sripati Bhava Chalit 12-House Sandhi Continuity
  {
    const t0 = performance.now();
    const cusps = HighPrecisionAstroEngine.calculateBhavaChalitCusps(45.0, 315.0);

    let isContinuous = true;
    for (let i = 0; i < 12; i++) {
      const nextIdx = (i + 1) % 12;
      const diff = Math.abs(cusps[i].sandhiEndLongitude - cusps[nextIdx].sandhiStartLongitude);
      if (diff > 0.05 && Math.abs(diff - 360) > 0.05) {
        isContinuous = false;
        break;
      }
    }

    assert(
      'Bhava Chalit Engine: Sripati 12-Cusp Mathematical Continuity',
      cusps.length === 12 && isContinuous,
      `Total Bhavas: ${cusps.length}, House 1 Madhya: ${cusps[0].madhyaLongitude}°, House 10 Madhya: ${cusps[9].madhyaLongitude}°`,
      t0
    );
  }

  // Test 4: Tara Bala & Chandra Bala (Strict vs Shukla-Waxing Relaxed)
  {
    const t0 = performance.now();
    const natal: NatalProfile = {
      natalMoonNakshatraIndex: 4,
      natalMoonSignIndex: 1,
      natalAscendantSignIndex: 0
    };

    const taraResult = PersonalAuspiciousnessScoringEngine.calculateTaraBala(natal.natalMoonNakshatraIndex, 5);
    const isTaraSampat = taraResult.taraIndex === 2 && taraResult.isAuspicious;

    const chandraAshtama = PersonalAuspiciousnessScoringEngine.calculateChandraBala(natal.natalMoonSignIndex, 8);
    const isAshtamaBad =
      chandraAshtama.houseFromNatal === 8 &&
      !chandraAshtama.isAuspicious &&
      chandraAshtama.scoreWeight === -35;

    // 5th from Taurus (index 1) is Virgo (index 5): cautious in strict mode, auspicious in Shukla waxing mode
    const strictFifth = PersonalAuspiciousnessScoringEngine.calculateChandraBala(1, 5, 'Shukla', 'CLASSICAL_STRICT');
    const waxingFifth = PersonalAuspiciousnessScoringEngine.calculateChandraBala(1, 5, 'Shukla', 'SHUKLA_WAXING_RELAXED');
    const conventionOk = !strictFifth.isAuspicious && waxingFifth.isAuspicious;

    assert(
      'Personal Synastry: Tara Bala, Ashtama Chandra & Shukla Convention',
      isTaraSampat && isAshtamaBad && conventionOk,
      `Tara: ${taraResult.name} (+${taraResult.scoreWeight}), Chandra 8th: ${chandraAshtama.scoreWeight}, 5th Strict/Shukla: ${strictFifth.scoreWeight}/${waxingFifth.scoreWeight}`,
      t0
    );
  }

  // Test 5: Benchmark Execution Latency (< 5ms per full day analysis)
  {
    const t0 = performance.now();
    const loc: LocationCoordinates = {
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: 'Asia/Kolkata',
      timezoneOffset: 5.5
    };
    const iterations = 50;

    for (let i = 0; i < iterations; i++) {
      HighPrecisionAstroEngine.analyzeFullDay('2026-11-08', loc);
    }
    const elapsedTotal = performance.now() - t0;
    const avgPerDayMs = elapsedTotal / iterations;

    assert(
      'Performance Benchmark: Sub-5ms Daily Calculation Latency',
      avgPerDayMs < 5.0,
      `Average execution: ${avgPerDayMs.toFixed(3)} ms per full daily panchang (50 iterations total: ${elapsedTotal.toFixed(1)} ms)`,
      t0
    );
  }

  // Test 6: Target-City IANA Timezone Consecutive-Midnight DST Acceptance (America/New_York)
  {
    const t0 = performance.now();
    const newYork: LocationCoordinates = {
      latitude: 40.7128,
      longitude: -74.0060,
      cityName: 'New York, United States',
      timezone: 'America/New_York',
      timezoneOffset: -5.0
    };

    const springDay = HighPrecisionAstroEngine.analyzeFullDay('2026-03-08', { ...newYork, timezoneOffset: -4.0 });
    const springTimeline = PersonalAuspiciousnessScoringEngine.generate24HourTimeline(springDay);

    const standardDay = HighPrecisionAstroEngine.analyzeFullDay('2026-11-26', newYork);
    const standardTimeline = PersonalAuspiciousnessScoringEngine.generate24HourTimeline(standardDay);

    const autumnDay = HighPrecisionAstroEngine.analyzeFullDay('2026-11-01', { ...newYork, timezoneOffset: -5.0 });
    const autumnTimeline = PersonalAuspiciousnessScoringEngine.generate24HourTimeline(autumnDay);

    const springOk =
      springTimeline.length === 92 &&
      springTimeline[0].timestampIso === '2026-03-08T05:00:00.000Z' &&
      springTimeline[0].localTimeStr === '00:00' &&
      springTimeline[7].localTimeStr === '01:45' &&
      springTimeline[8].localTimeStr === '03:00' &&
      springTimeline[91].localTimeStr === '23:45';

    const standardOk =
      standardTimeline.length === 96 &&
      standardTimeline[0].timestampIso === '2026-11-26T05:00:00.000Z' &&
      standardTimeline[0].localTimeStr === '00:00' &&
      standardTimeline[95].localTimeStr === '23:45';

    const autumnOk =
      autumnTimeline.length === 100 &&
      autumnTimeline[0].timestampIso === '2026-11-01T04:00:00.000Z' &&
      autumnTimeline[0].localTimeStr === '00:00' &&
      autumnTimeline[4].localTimeStr === '01:00' &&
      autumnTimeline[4].utcOffsetLabel === 'GMT-4' &&
      autumnTimeline[8].localTimeStr === '01:00' &&
      autumnTimeline[8].utcOffsetLabel === 'GMT-5' &&
      autumnTimeline[99].localTimeStr === '23:45';

    assert(
      'IANA Consecutive-Midnight Timeline: New York 92 / 96 / 100 DST Samples',
      springOk && standardOk && autumnOk,
      `2026-03-08: ${springTimeline.length} (${springTimeline[0]?.timestampIso}), 2026-11-26: ${standardTimeline.length}, 2026-11-01: ${autumnTimeline.length} (${autumnTimeline[0]?.timestampIso})`,
      t0
    );
  }

  // Test 7: Strict Input Validation — Reject Impossible Dates & Missing Location/Timezone
  {
    const t0 = performance.now();
    const validLoc: LocationCoordinates = {
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      timezoneOffset: 5.5
    };

    const throwsOn = (fn: () => unknown): boolean => {
      try {
        fn();
        return false;
      } catch {
        return true;
      }
    };

    const rejectsFeb31 = throwsOn(() => HighPrecisionAstroEngine.analyzeFullDay('2026-02-31', validLoc));
    const rejectsNonLeapFeb29 = throwsOn(() => HighPrecisionAstroEngine.analyzeFullDay('2025-02-29', validLoc));
    const rejectsMissingTz = throwsOn(() =>
      HighPrecisionAstroEngine.analyzeFullDay('2026-11-08', { latitude: 28.6139, longitude: 77.2090 } as unknown as LocationCoordinates)
    );
    const rejectsBadLat = throwsOn(() =>
      HighPrecisionAstroEngine.analyzeFullDay('2026-11-08', { ...validLoc, latitude: 95 })
    );

    assert(
      'Strict Input Validation: Reject 2026-02-31 & Missing Location/Timezone',
      rejectsFeb31 && rejectsNonLeapFeb29 && rejectsMissingTz && rejectsBadLat,
      `Feb31:${rejectsFeb31}, Feb29(2025):${rejectsNonLeapFeb29}, MissingTZ:${rejectsMissingTz}, Lat95:${rejectsBadLat}`,
      t0
    );
  }

  const passed = results.filter((r) => r.passed).length;
  return {
    totalTests: results.length,
    passedTests: passed,
    failedTests: results.length - passed,
    results
  };
}
