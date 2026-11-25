/**
 * @license
 * MIT License
 *
 * Composite Personal Auspiciousness Scoring Engine (0 - 100%)
 * Combines Universal Astrological Factors (8 Kaalas, Epoch-matched Choghadiya & Hora, Vishti Karana)
 * with Personal Natal Factors (Exact Tara Bala, Drik Sidereal Moon Chandra Bala, Ashtama Shuddhi, Lagna Harmony).
 */

import { DayAnalysisResult, HighPrecisionAstroEngine } from './zeroCostAstroEngine';

export interface NatalProfile {
  natalMoonNakshatraIndex: number; // 1 to 27 (Ashwini = 1)
  natalMoonSignIndex: number;      // 0 to 11 (Aries = 0)
  natalAscendantSignIndex: number; // 0 to 11 (Aries = 0)
  natalNakshatraPada?: number;     // 1 to 4
}

export interface IntradayScoringSample {
  timestampIso: string;
  epochMs: number;
  localTimeStr: string;  // HH:MM (24h canonical)
  localTime12Hr: string; // hh:mm AM/PM
  auspiciousnessScore: number; // 5 to 98
  tier: 'AMRITHAM' | 'SHUBHA' | 'MADHYAMA' | 'VARJYA';
  colorHex: string;
  activeChoghadiya: string;
  activeChoghadiyaName: string;
  activeHora: string;
  activeHoraPlanet: string;
  isRahuKaalActive: boolean;
  isYamaghantaActive: boolean;
  isAbhijitActive: boolean;
  taraBalaCategory: string;
  chandraBalaHouse: number;
  isAshtamaChandra: boolean;
  executiveAdvice: string;
}

export class PersonalAuspiciousnessScoringEngine {
  private static readonly TARA_BALA_NAMES = [
    'Janma (Body/Caution)',
    'Sampat (Wealth/Prosperity)',
    'Vipat (Danger/Obstacle)',
    'Kshema (Well-being/Security)',
    'Pratyak (Opposition/Hurdles)',
    'Sadhana (Success/Achievement)',
    'Naidhana (Severe Affliction)',
    'Mitra (Friendly/Support)',
    'Parama Mitra (Supreme Ally)'
  ];

  /**
   * Computes Tara Bala (1 to 9) from 1-indexed Natal Moon Nakshatra (1..27) to 1-indexed Transit Moon Nakshatra (1..27)
   */
  public static calculateTaraBala(natalNakshatra: number, transitNakshatra: number): {
    taraIndex: number;
    name: string;
    isAuspicious: boolean;
    scoreWeight: number;
  } {
    const safeNatal = Math.min(27, Math.max(1, Math.round(natalNakshatra)));
    const safeTransit = Math.min(27, Math.max(1, Math.round(transitNakshatra)));
    const diff = (safeTransit - safeNatal + 27) % 27;
    const taraIndex = (diff % 9) + 1;

    let isAuspicious = false;
    let scoreWeight = 0;

    switch (taraIndex) {
      case 2: // Sampat
        isAuspicious = true;
        scoreWeight = 20;
        break;
      case 4: // Kshema
        isAuspicious = true;
        scoreWeight = 15;
        break;
      case 6: // Sadhana
        isAuspicious = true;
        scoreWeight = 25;
        break;
      case 8: // Mitra
        isAuspicious = true;
        scoreWeight = 15;
        break;
      case 9: // Parama Mitra
        isAuspicious = true;
        scoreWeight = 20;
        break;
      case 1: // Janma
        isAuspicious = false;
        scoreWeight = -5;
        break;
      case 3: // Vipat
        isAuspicious = false;
        scoreWeight = -20;
        break;
      case 5: // Pratyak
        isAuspicious = false;
        scoreWeight = -20;
        break;
      case 7: // Naidhana / Vadha
        isAuspicious = false;
        scoreWeight = -30;
        break;
    }

    return {
      taraIndex,
      name: this.TARA_BALA_NAMES[taraIndex - 1],
      isAuspicious,
      scoreWeight
    };
  }

  /**
   * Computes Chandra Bala (Transit Moon sign 0..11 offset from Natal Moon sign 0..11)
   */
  public static calculateChandraBala(natalMoonSign: number, transitMoonSign: number): {
    houseFromNatal: number;
    isAuspicious: boolean;
    scoreWeight: number;
    description: string;
  } {
    const safeNatal = ((Math.floor(natalMoonSign) % 12) + 12) % 12;
    const safeTransit = ((Math.floor(transitMoonSign) % 12) + 12) % 12;
    const houseFromNatal = ((safeTransit - safeNatal + 12) % 12) + 1;

    let isAuspicious = false;
    let scoreWeight = 0;
    let description = '';

    switch (houseFromNatal) {
      case 1:
        isAuspicious = true;
        scoreWeight = 15;
        description = 'Good health and personal energy';
        break;
      case 3:
        isAuspicious = true;
        scoreWeight = 20;
        description = 'High courage, valor and victory in endeavors';
        break;
      case 6:
        isAuspicious = true;
        scoreWeight = 15;
        description = 'Overcoming obstacles, disputes and competition';
        break;
      case 7:
        isAuspicious = true;
        scoreWeight = 15;
        description = 'Supportive partnerships, negotiations and public favor';
        break;
      case 10:
        isAuspicious = true;
        scoreWeight = 20;
        description = 'Career authority, managerial leadership, prestige';
        break;
      case 11:
        isAuspicious = true;
        scoreWeight = 25;
        description = 'Maximum gains, revenue expansion, goal fruition';
        break;
      case 8:
        isAuspicious = false;
        scoreWeight = -35;
        description = 'Ashtama Chandra: Vulnerability, unexpected delays. Avoid major new commitments.';
        break;
      case 12:
        isAuspicious = false;
        scoreWeight = -15;
        description = 'Expenditure and scattered attention';
        break;
      default:
        isAuspicious = false;
        scoreWeight = -5;
        description = 'Moderate or mixed lunar support';
        break;
    }

    return { houseFromNatal, isAuspicious, scoreWeight, description };
  }

  /**
   * Evaluates the unified score for a specific instant of time
   */
  public static evaluateInstant(
    instantDate: Date,
    dayData: DayAnalysisResult,
    natal?: NatalProfile
  ): IntradayScoringSample {
    const rawMs = instantDate?.getTime?.();
    const instantMs = Number.isFinite(rawMs) ? rawMs : dayData.solarMetrics.sunriseMs;
    const safeDate = new Date(instantMs);
    let baseScore = 50;

    // 1. All 8 Solar/Lunar Kaala Windows (Epoch-accurate)
    const k = dayData.fixedKaalas;
    const inWindow = (w?: { startMs?: number; endMs?: number; startIso: string; endIso: string }) => {
      if (!w) return false;
      const s = Number.isFinite(w.startMs) ? (w.startMs as number) : new Date(w.startIso).getTime();
      const e = Number.isFinite(w.endMs) ? (w.endMs as number) : new Date(w.endIso).getTime();
      return instantMs >= s && instantMs < e;
    };

    const isRahuKaalActive = inWindow(k.rahuKaal);
    const isYamaghantaActive = inWindow(k.yamaghanta);
    const isGulikaActive = inWindow(k.gulikaKaal);
    const isAbhijitActive = inWindow(k.abhijitMuhurta) && k.abhijitMuhurta.isValidOnThisDay;
    const isBrahmaActive = inWindow(k.brahmaMuhurta);
    const isVijayaActive = inWindow(k.vijayaMuhurta);
    const isAmritKaalActive = inWindow(k.amritKaal) && !isRahuKaalActive && !isYamaghantaActive;
    const isGodhuliActive = inWindow(k.godhuliKaal) && !isRahuKaalActive;

    if (isRahuKaalActive) baseScore += k.rahuKaal.scoreImpact;       // -30
    if (isYamaghantaActive) baseScore += k.yamaghanta.scoreImpact;   // -20
    if (isGulikaActive) baseScore += k.gulikaKaal.scoreImpact;       // -10
    if (isAbhijitActive) baseScore += k.abhijitMuhurta.scoreImpact;  // +25
    if (isBrahmaActive) baseScore += 18;
    if (isVijayaActive && !isRahuKaalActive) baseScore += 15;
    if (isAmritKaalActive) baseScore += 14;
    if (isGodhuliActive) baseScore += 10;

    // 2. Instantaneous Lunar Position & Vishti (Bhadra) Karana Check
    const jdInstant = HighPrecisionAstroEngine.julianDayFromEpochMs(instantMs);
    const ayanamsa = HighPrecisionAstroEngine.getTrueLahiriAyanamsa(jdInstant);
    const sidSun = HighPrecisionAstroEngine.normalizeDegrees(
      HighPrecisionAstroEngine.calculateSunLongitude(jdInstant).longitude - ayanamsa
    );
    const sidMoon = HighPrecisionAstroEngine.normalizeDegrees(
      HighPrecisionAstroEngine.calculateMoonLongitude(jdInstant) - ayanamsa
    );
    const lunarSep = HighPrecisionAstroEngine.normalizeDegrees(sidMoon - sidSun);
    const instantKaranaIdx = Math.min(60, Math.floor(lunarSep / 6.0) + 1);
    const isVishtiActive = HighPrecisionAstroEngine.getKaranaNameByIndex(instantKaranaIdx).includes('Vishti');
    if (isVishtiActive) baseScore -= 12;

    // 3. Epoch-Backed Active Choghadiya (handles midnight 23:xx -> 00:xx & pre-sunrise 00:00..Sunrise)
    const tz = dayData.location?.timezoneOffset ?? 5.5;
    const localTimeStr = new Date(instantMs + Math.round(tz * 3600000)).toISOString().substring(11, 16);
    const localTime12Hr = HighPrecisionAstroEngine.format24To12Hr(localTimeStr);

    const allChoghadiyas = [
      ...(dayData.choghadiya.preSunriseChoghadiya || []),
      ...dayData.choghadiya.dayChoghadiya,
      ...dayData.choghadiya.nightChoghadiya
    ];
    const activeChog =
      allChoghadiyas.find(c => instantMs >= c.startMs && instantMs < c.endMs) ||
      dayData.choghadiya.dayChoghadiya[0];
    baseScore += activeChog.scoreImpact;

    // 4. Epoch-Backed Active Planetary Hora (handles midnight & pre-sunrise accurately)
    const allHoras = [
      ...(dayData.preSunriseHoras || []),
      ...dayData.horas
    ];
    const activeHora =
      allHoras.find(h => instantMs >= h.startMs && instantMs < h.endMs) ||
      dayData.horas[0];
    baseScore += activeHora.isAuspicious ? 10 : -10;

    // 5. Personal Natal Synastry (Tara Bala + Exact Drik Moon Chandra Bala + Live Lagna Harmony)
    let taraCategory = 'General Timing (Non-Personalized)';
    let chandraHouse = 1;
    let isAshtamaChandra = false;

    if (natal) {
      const transitNakshatra = Math.min(27, Math.floor(sidMoon / (360.0 / 27.0)) + 1);
      const tara = this.calculateTaraBala(natal.natalMoonNakshatraIndex, transitNakshatra);
      taraCategory = tara.name;
      baseScore += tara.scoreWeight;

      const transitMoonSign = Math.floor(sidMoon / 30.0) % 12;
      const chandra = this.calculateChandraBala(natal.natalMoonSignIndex, transitMoonSign);
      chandraHouse = chandra.houseFromNatal;
      isAshtamaChandra = chandraHouse === 8;
      baseScore += chandra.scoreWeight;

      // Live Transit Ascendant (Lagna) vs Natal Ascendant Harmony
      const liveAngles = HighPrecisionAstroEngine.calculateLiveAngles(
        instantMs,
        dayData.location?.latitude ?? 28.6139,
        dayData.location?.longitude ?? 77.2090
      );
      const transitAscSign = Math.floor(liveAngles.siderealAscendant / 30.0) % 12;
      const lagnaHouse = ((transitAscSign - natal.natalAscendantSignIndex + 12) % 12) + 1;
      if ([1, 5, 9, 10, 11].includes(lagnaHouse)) {
        baseScore += 6;
      } else if ([8, 12].includes(lagnaHouse)) {
        baseScore -= 6;
      }
    }

    const finalScore = Math.max(5, Math.min(98, Math.round(baseScore)));

    let tier: 'AMRITHAM' | 'SHUBHA' | 'MADHYAMA' | 'VARJYA';
    let colorHex: string;
    let executiveAdvice: string;

    if (finalScore >= 75 && !isRahuKaalActive && !isAshtamaChandra) {
      tier = 'AMRITHAM';
      colorHex = '#10B981';
      executiveAdvice = 'Supreme golden window. Highly favorable for contract signatures, purchases, and major decisions.';
    } else if (finalScore >= 55 && !isRahuKaalActive) {
      tier = 'SHUBHA';
      colorHex = '#3B82F6';
      executiveAdvice = 'Supportive window. Suitable for productive meetings, negotiations, and scheduled initiatives.';
    } else if (finalScore >= 40 && !isRahuKaalActive) {
      tier = 'MADHYAMA';
      colorHex = '#F59E0B';
      executiveAdvice = 'Mixed planetary energy. Proceed mindfully with routine work; defer high-stakes commitments.';
    } else {
      tier = 'VARJYA';
      colorHex = '#EF4444';
      executiveAdvice = isRahuKaalActive
        ? `Rahu Kaal active (${k.rahuKaal.start12Hr} – ${k.rahuKaal.end12Hr}). Postpone new contracts, investments, and departures.`
        : isAshtamaChandra
        ? 'Ashtama Chandra (8th-house Moon transit) active for your profile. Prioritize caution and routine tasks.'
        : isYamaghantaActive
        ? `Yamaghantam active (${k.yamaghanta.start12Hr} – ${k.yamaghanta.end12Hr}). Avoid commencing long journeys or new ventures.`
        : 'Inauspicious planetary confluence. Exercise restraint and wait for the next Shubha or Amritham window.';
    }

    return {
      timestampIso: safeDate.toISOString(),
      epochMs: instantMs,
      localTimeStr,
      localTime12Hr,
      auspiciousnessScore: finalScore,
      tier,
      colorHex,
      activeChoghadiya: `${activeChog.name} (${activeChog.isAuspicious ? 'Auspicious' : 'Inauspicious'})`,
      activeChoghadiyaName: activeChog.name,
      activeHora: `${activeHora.rulingPlanet} Hora`,
      activeHoraPlanet: activeHora.rulingPlanet,
      isRahuKaalActive,
      isYamaghantaActive,
      isAbhijitActive,
      taraBalaCategory: taraCategory,
      chandraBalaHouse: chandraHouse,
      isAshtamaChandra,
      executiveAdvice
    };
  }

  /**
   * Generates a 24-hour timeline at 15-minute intervals for the Chrono-Dial UI
   */
  public static generate24HourTimeline(
    dayData: DayAnalysisResult,
    natal?: NatalProfile
  ): IntradayScoringSample[] {
    const samples: IntradayScoringSample[] = [];
    const safeDateStr = /^\d{4}-\d{2}-\d{2}$/.test(dayData.date)
      ? dayData.date
      : HighPrecisionAstroEngine.getObserverDateString(dayData.location?.timezoneOffset ?? 5.5);
    const [y, m, d] = safeDateStr.split('-').map(Number);

    const tz = dayData.location?.timezoneOffset ?? 5.5;
    for (let minuteOfDay = 0; minuteOfDay < 1440; minuteOfDay += 15) {
      const totalUtcMinutes = minuteOfDay - Math.round(tz * 60);
      const sampleDate = new Date(Date.UTC(y, m - 1, d, 0, totalUtcMinutes));
      samples.push(this.evaluateInstant(sampleDate, dayData, natal));
    }

    return samples;
  }
}
