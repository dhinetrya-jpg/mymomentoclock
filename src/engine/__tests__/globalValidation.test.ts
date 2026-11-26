/**
 * @license
 * MIT License
 *
 * 10-City Global Ephemeris Cross-Validation Test Suite
 * Validates astronomical integrity across distinct global latitudes,
 * longitudes, hemispheres, and DST-aware IANA timezones.
 */

import { HighPrecisionAstroEngine, LocationCoordinates } from '../zeroCostAstroEngine';

export interface CityValidationResult {
  cityName: string;
  country: string;
  passed: boolean;
  sunriseLocal: string;
  sunsetLocal: string;
  solarNoonLocal: string;
  dayLengthMinutes: number;
  tithiName: string;
  nakshatraName: string;
  rahuKaalSpan: string;
  abhijitSpan: string;
}

export function runGlobal10CityValidation(): {
  allPassed: boolean;
  passCount: number;
  totalCities: number;
  results: CityValidationResult[];
} {
  const testDate = '2026-10-24';

  const cities: Array<LocationCoordinates & { country: string }> = [
    { cityName: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata', timezoneOffset: 5.5 },
    { cityName: 'Mumbai', country: 'India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata', timezoneOffset: 5.5 },
    { cityName: 'Bengaluru', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata', timezoneOffset: 5.5 },
    { cityName: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', timezoneOffset: 1.0 },
    { cityName: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York', timezoneOffset: -4.0 },
    { cityName: 'San Francisco', country: 'USA', latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles', timezoneOffset: -7.0 },
    { cityName: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo', timezoneOffset: 9.0 },
    { cityName: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney', timezoneOffset: 11.0 },
    { cityName: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai', timezoneOffset: 4.0 },
    { cityName: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore', timezoneOffset: 8.0 }
  ];

  const results: CityValidationResult[] = [];

  for (const c of cities) {
    const analysis = HighPrecisionAstroEngine.analyzeFullDay(testDate, c);

    const isDayLenValid = analysis.solarMetrics.dayLengthMinutes >= 540 && analysis.solarMetrics.dayLengthMinutes <= 900;
    const isChronologyValid = analysis.solarMetrics.sunriseMs < analysis.solarMetrics.sunsetMs;
    const isRahuValid =
      analysis.fixedKaalas.rahuKaal.startMs >= analysis.solarMetrics.sunriseMs &&
      analysis.fixedKaalas.rahuKaal.endMs <= analysis.solarMetrics.sunsetMs;
    const isPanchangValid =
      analysis.panchanga.tithi.index >= 1 &&
      analysis.panchanga.tithi.index <= 30 &&
      analysis.panchanga.nakshatra.index >= 1 &&
      analysis.panchanga.nakshatra.index <= 27 &&
      analysis.panchanga.tithi.endMs > analysis.solarMetrics.sunriseMs &&
      analysis.panchanga.nakshatra.endMs > analysis.solarMetrics.sunriseMs &&
      analysis.panchanga.yoga.endMs > analysis.solarMetrics.sunriseMs &&
      analysis.panchanga.karana.endMs > analysis.solarMetrics.sunriseMs;

    const nakDurationMs = analysis.panchanga.nakshatra.endMs - analysis.panchanga.nakshatra.startMs;
    const varjyamDurMs = analysis.fixedKaalas.varjyam.endMs - analysis.fixedKaalas.varjyam.startMs;
    // When sunrise Nakshatra's Varjyam already ended before sunrise, Varjyam advances to the next Nakshatra's 4-Ghati span
    const isSameNakshatraVarjyam = analysis.fixedKaalas.varjyam.startMs < analysis.panchanga.nakshatra.endMs;
    const isVarjyamExact = isSameNakshatraVarjyam
      ? Math.abs(varjyamDurMs - nakDurationMs / 15.0) <= 5000
      : varjyamDurMs >= 72 * 60000 && varjyamDurMs <= 108 * 60000;

    const passed = isDayLenValid && isChronologyValid && isRahuValid && isPanchangValid && isVarjyamExact;

    results.push({
      cityName: c.cityName || '',
      country: c.country,
      passed,
      sunriseLocal: analysis.solarMetrics.sunrise,
      sunsetLocal: analysis.solarMetrics.sunset,
      solarNoonLocal: analysis.solarMetrics.solarNoon,
      dayLengthMinutes: analysis.solarMetrics.dayLengthMinutes,
      tithiName: `${analysis.panchanga.tithi.name} (${analysis.panchanga.tithi.paksha})`,
      nakshatraName: analysis.panchanga.nakshatra.name,
      rahuKaalSpan: `${analysis.fixedKaalas.rahuKaal.startLocal}–${analysis.fixedKaalas.rahuKaal.endLocal}`,
      abhijitSpan: `${analysis.fixedKaalas.abhijitMuhurta.startLocal}–${analysis.fixedKaalas.abhijitMuhurta.endLocal}`
    });
  }

  const passCount = results.filter((r) => r.passed).length;
  return {
    allPassed: passCount === cities.length,
    passCount,
    totalCities: cities.length,
    results
  };
}
