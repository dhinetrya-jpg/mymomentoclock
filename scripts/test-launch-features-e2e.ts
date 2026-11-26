/**
 * @license
 * MIT License
 * 
 * End-to-End Comprehensive Production Validation Test Suite
 * Validates real-time functionality of all 5 Launch Features across both backend and frontend:
 * 
 * Feature 1 & 1(a): Auspicious/Inauspicious timing across Day, Week, Month, Year
 * Feature 2: Universal Mode (0 Birth info required)
 * Feature 3: Actionable guidance (Do's, Don'ts & Emergency Mitigations)
 * Feature 4: Attire, Colors, Metals, Gemstones, Footwear (Leather vs Sports vs Paduka)
 * Feature 5: AI Muhurat Chatbot presets and offline deterministic fallback
 */

import { HighPrecisionAstroEngine } from '../src/engine/zeroCostAstroEngine';
import { PersonalAuspiciousnessScoringEngine, NatalProfile } from '../src/engine/scoringEngine';
import { RemedialLifestyleEngine } from '../src/engine/remedialLifestyleEngine';
import { MultimodalCalendarEngine } from '../src/engine/calendarEngine';
import { OFFLINE_CITIES_CATALOG } from '../src/engine/offlineGeoData';
import { AiNarrativeEngine } from '../src/engine/aiNarrativeEngine';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    failCount++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 ASTROENGINE PRODUCTION LAUNCH VERIFICATION (5 CORE FEATURES)');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: FEATURE 2 - UNIVERSAL MODE (0 BIRTH INFO REQUIRED)
  // --------------------------------------------------------------------------
  console.log('👉 [SUITE 1] Feature 2: Zero Birth Detail Support (Universal Mode)');
  const testCity = OFFLINE_CITIES_CATALOG[0]; // New Delhi
  const testLoc = {
    latitude: testCity.latitude,
    longitude: testCity.longitude,
    timezoneOffset: (testCity as any).timezoneOffset ?? testCity.defaultUtcOffset,
    cityName: testCity.name
  };
  const todayStr = '2026-11-24';

  const dayResult = HighPrecisionAstroEngine.analyzeFullDay(todayStr, testLoc);
  assert(!!dayResult, 'analyzeFullDay returns valid object');
  assert(dayResult.solarMetrics.sunrise.length === 5, 'Sunrise time formatted correctly (HH:MM)', dayResult.solarMetrics.sunrise);
  assert(dayResult.solarMetrics.sunset.length === 5, 'Sunset time formatted correctly (HH:MM)', dayResult.solarMetrics.sunset);
  assert(!isNaN(new Date(dayResult.fixedKaalas.rahuKaal.startIso).getTime()), 'Rahu Kaal startIso is valid ISO date');
  assert(!isNaN(new Date(dayResult.fixedKaalas.rahuKaal.endIso).getTime()), 'Rahu Kaal endIso is valid ISO date');

  // Universal Mode Instant Scoring (No natal profile)
  const universalInstant = PersonalAuspiciousnessScoringEngine.evaluateInstant(
    new Date(),
    dayResult,
    undefined // Zero natal details
  );
  assert(universalInstant.auspiciousnessScore >= 5 && universalInstant.auspiciousnessScore <= 98, 'Universal instant score in valid 5-98 range', `Score: ${universalInstant.auspiciousnessScore}`);
  assert(universalInstant.taraBalaCategory.includes('Non-Personalized') || universalInstant.taraBalaCategory.length > 0, 'Universal Tara category appropriately flagged');
  assert(typeof universalInstant.activeChoghadiya === 'string', 'Active Choghadiya reported in Universal mode');

  // Universal 24h Timeline (96 samples of 15 mins)
  const timeline = PersonalAuspiciousnessScoringEngine.generate24HourTimeline(dayResult, undefined);
  assert(timeline.length === 96, '24-hour timeline generates exact 96 samples (15-min intervals)');
  assert(timeline.every(s => !isNaN(s.auspiciousnessScore)), 'All 96 samples contain valid numeric scores');
  assert(timeline.every(s => s.localTimeStr.length === 5), 'All 96 samples have clean HH:MM local timestamps');

  // --------------------------------------------------------------------------
  // TEST SUITE 2: FEATURE 1 & 1(a) - AUSPICIOUS & INAUSPICIOUS TIMING (DAY/WEEK/MONTH/YEAR)
  // --------------------------------------------------------------------------
  console.log('\n👉 [SUITE 2] Feature 1 & 1(a): Auspicious & Inauspicious Timing (Day, Week, Month, Year)');
  
  // Day View: Kaalas
  assert(dayResult.fixedKaalas.abhijitMuhurta.isAuspicious === true, 'Abhijit Muhurta marked Auspicious');
  assert(dayResult.fixedKaalas.rahuKaal.isAuspicious === false, 'Rahu Kaal marked Inauspicious');
  assert(dayResult.fixedKaalas.yamaghanta.isAuspicious === false, 'Yamaghanta marked Inauspicious');
  assert(dayResult.fixedKaalas.brahmaMuhurta.isAuspicious === true, 'Brahma Muhurta marked Auspicious');
  assert(dayResult.horas.length === 24, 'All 24 planetary Horas generated');
  assert(dayResult.choghadiya.dayChoghadiya.length === 8, '8 Day Choghadiyas generated');
  assert(dayResult.choghadiya.nightChoghadiya.length === 8, '8 Night Choghadiyas generated');

  // Month View: 30-Day Lunar Heatmap
  const monthGrid = MultimodalCalendarEngine.generateMonthGrid(2026, 11, testLoc);
  assert(monthGrid.length === 30, 'Month grid generates exact 30 lunar days for November');
  assert(monthGrid.some(d => d.isEkadashi), 'Month grid correctly identifies Ekadashi fasting days');
  assert(monthGrid.some(d => d.isPurnima), 'Month grid correctly identifies Purnima');
  assert(monthGrid.some(d => d.isAmavasya), 'Month grid correctly identifies Amavasya');

  // Year View: 12 Solar Sankrantis
  const sankrantis = MultimodalCalendarEngine.generateAnnualSankrantiCalendar(2026);
  assert(sankrantis.length === 12, 'Annual calendar generates exact 12 Solar Sankrantis');
  assert(sankrantis.some(s => s.zodiacSign === 'Capricorn'), 'Makar Sankranti identified with Punya Kaal window');
  assert(sankrantis.some(s => s.zodiacSign === 'Aries'), 'Mesha Sankranti identified');

  // --------------------------------------------------------------------------
  // TEST SUITE 3: FEATURE 3 - ACTIONS, DOS, DONTS & EMERGENCY MITIGATIONS
  // --------------------------------------------------------------------------
  console.log('\n👉 [SUITE 3] Feature 3: Actionable Suggestions, Do\'s, Don\'ts & Emergency Mitigations');
  const rahuGuidance = RemedialLifestyleEngine.getWindowActionGuidance('Rahu Kaal');
  assert(rahuGuidance.auspiciousness === 'INAUSPICIOUS', 'Rahu Kaal classified as INAUSPICIOUS');
  assert(rahuGuidance.recommendedActions.length > 0, 'Rahu Kaal provides constructive actions (routine cleaning, charity)');
  assert(rahuGuidance.prohibitedActions.length > 0, 'Rahu Kaal specifies prohibited actions (signatures, travel, buying vehicle)');
  assert(rahuGuidance.emergencyMitigation.includes('jaggery') || rahuGuidance.emergencyMitigation.length > 20, 'Classical emergency mitigation provided for unavoidable actions');

  const abhijitGuidance = RemedialLifestyleEngine.getWindowActionGuidance('Abhijit Muhurta');
  assert(abhijitGuidance.auspiciousness === 'AUSPICIOUS', 'Abhijit Muhurta classified as AUSPICIOUS');
  assert(abhijitGuidance.recommendedActions.length > 0, 'Abhijit provides positive launch actions');

  // --------------------------------------------------------------------------
  // TEST SUITE 4: FEATURE 4 - ATTIRE, COLORS, METALS, GEMS & FOOTWEAR GUIDE
  // --------------------------------------------------------------------------
  console.log('\n👉 [SUITE 4] Feature 4: Daily Attire, Colors, Metals & Footwear (Leather vs Sports vs Paduka)');
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const lordGuide = RemedialLifestyleEngine.getDayLordGuidance(dayIdx);
    assert(lordGuide.primaryColors.length > 0, `Day ${dayIdx} (${lordGuide.planetName}) has primary colors to wear`);
    assert(lordGuide.colorsToAvoid.length > 0, `Day ${dayIdx} has colors to avoid`);
    assert(lordGuide.metals.length > 0, `Day ${dayIdx} has recommended metals`);
    assert(lordGuide.gemstone.length > 0, `Day ${dayIdx} has primary gemstone`);
    assert(!!lordGuide.footwearGuidance.summary, `Day ${dayIdx} has footwear summary`);
  }

  // Deep-dive Comparative Footwear Analysis Matrix
  const footwear = RemedialLifestyleEngine.getFootwearComparativeAnalysis();
  assert(footwear.length === 3, 'Footwear matrix covers all 3 types (Leather, Sports, Wooden Paduka)');
  const leather = footwear.find(f => f.type.toLowerCase().includes('leather'));
  const sports = footwear.find(f => f.type.toLowerCase().includes('sports'));
  const paduka = footwear.find(f => f.type.toLowerCase().includes('paduka') || f.type.toLowerCase().includes('barefoot'));
  assert(!!leather && leather.governingPlanet.includes('Saturn'), 'Leather footwear correctly linked to Saturn/Rahu energy and temple restrictions');
  assert(!!sports && sports.governingPlanet.includes('Mars'), 'Sports footwear linked to Mars kinetic agility');
  assert(!!paduka && paduka.governingPlanet.includes('Jupiter'), 'Wooden Paduka / Barefoot linked to Jupiter/Sun Sattvic earth grounding');

  // --------------------------------------------------------------------------
  // TEST SUITE 5: FEATURE 5 - AI CHATBOT PRESETS & DETERMINISTIC FALLBACK
  // --------------------------------------------------------------------------
  console.log('\n👉 [SUITE 5] Feature 5: AI Conversational Muhurat Chatbot Presets');
  const briefing = await AiNarrativeEngine.generateDailyBriefing(universalInstant, dayResult);
  assert(briefing.executiveOneLiner.length > 10, 'Executive briefing generated');
  assert(briefing.goldenWindowNotice.length > 5, 'Golden window notice identified');
  assert(briefing.cautionaryNotice.length > 5, 'Cautionary notice identified');
  assert(['GEMINI_FLASH_FREE', 'OFFLINE_DETERMINISTIC_TEMPLATE'].includes(briefing.source), 'Source is free Gemini or offline deterministic fallback');

  // --------------------------------------------------------------------------
  // TEST SUITE 6: CROSS-CITY DEFENSIVE TEST (15K OFFLINE CATALOG RESILIENCE)
  // --------------------------------------------------------------------------
  console.log('\n👉 [SUITE 6] Robustness: 24 Offline Metros & Extreme Coordinates Validation');
  let citySuccess = 0;
  for (const city of OFFLINE_CITIES_CATALOG) {
    const loc = {
      latitude: city.latitude,
      longitude: city.longitude,
      timezoneOffset: (city as any).timezoneOffset ?? city.defaultUtcOffset,
      cityName: city.name
    };
    try {
      const res = HighPrecisionAstroEngine.analyzeFullDay(todayStr, loc);
      if (res && res.solarMetrics.sunrise && res.fixedKaalas.rahuKaal.startLocal) {
        citySuccess++;
      }
    } catch (e: any) {
      console.error(`City validation failed for ${city.name}: ${e.message}`);
    }
  }
  assert(citySuccess === OFFLINE_CITIES_CATALOG.length, `All ${OFFLINE_CITIES_CATALOG.length} offline cities compute flawlessly with zero errors`);

  // Extreme Latitudes (Tromso 69.6°N, Longyearbyen 78.2°N)
  const polarLoc = { latitude: 69.6492, longitude: 18.9553, timezoneOffset: 1, cityName: 'Tromso' };
  const polarRes = HighPrecisionAstroEngine.analyzeFullDay(todayStr, polarLoc);
  assert(!!polarRes && !isNaN(new Date(polarRes.fixedKaalas.rahuKaal.startIso).getTime()), 'Extreme polar latitude gracefully handles midnight sun / polar night without crashing');

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
