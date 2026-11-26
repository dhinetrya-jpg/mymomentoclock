/**
 * @license
 * MIT License
 *
 * Composite Personal Auspiciousness Scoring Engine (0 - 100%)
 * - Uses the unified 60-term Meeus Ch. 47 Moon + VSOP87 Sun core at the exact event instant.
 * - Supports explicit Chandra Bala conventions (`CLASSICAL_STRICT` vs `SHUKLA_WAXING_RELAXED`)
 *   accounting for waxing (Shukla Paksha) vs waning (Krishna Paksha) lunar strength.
 * - Documents classical Shastric citations for every weight (`SCORING_WEIGHT_GOVERNANCE`),
 *   marked explicitly as `PROVISIONAL_UNAPPROVED` pending formal Jyotishi sign-off.
 */

import { DayAnalysisResult, HighPrecisionAstroEngine } from './zeroCostAstroEngine';

export type ChandraBalaConvention = 'CLASSICAL_STRICT' | 'SHUKLA_WAXING_RELAXED';

export interface ScoringOptions {
  chandraBalaConvention?: ChandraBalaConvention;
}

export interface WeightCitationRecord {
  factorId: string;
  weightRange: string;
  classicalSource: string;
  textualBasis: string;
  approvalStatus: 'PROVISIONAL_UNAPPROVED';
}

export const SCORING_WEIGHT_GOVERNANCE: {
  ruleVersion: 'scoring-weights-v1-provisional';
  approvalStatus: 'PROVISIONAL_UNAPPROVED';
  requiresJyotishiSignOff: true;
  disclaimer: string;
  citations: WeightCitationRecord[];
} = {
  ruleVersion: 'scoring-weights-v1-provisional',
  approvalStatus: 'PROVISIONAL_UNAPPROVED',
  requiresJyotishiSignOff: true,
  disclaimer:
    'Numeric weights convert qualitative Shastric categories (Shubha / Madhyama / Varjya) into a 0–100 index for visual comparison; exact numeric magnitudes are provisional engineering heuristics awaiting formal Jyotishi sign-off.',
  citations: [
    {
      factorId: 'tara_bala',
      weightRange: '+25 (Sadhana), +20 (Sampat/Parama Mitra), +15 (Kshema/Mitra), -5 (Janma), -20 (Vipat/Pratyak), -30 (Naidhana)',
      classicalSource: 'Muhurta Chintamani (Ch. 2, Nakshatra Prakarana) & Kalaprakashika',
      textualBasis: '9-fold Janma-to-Parama-Mitra Nakshatra triads; 3rd (Vipat), 5th (Pratyak), and 7th (Naidhana/Vadha) excluded for auspicious commencements.',
      approvalStatus: 'PROVISIONAL_UNAPPROVED',
    },
    {
      factorId: 'chandra_bala',
      weightRange: '+25 (11th), +20 (3rd/10th), +15 (1st/6th/7th), -5/+5 (2nd/5th/9th in Shukla Paksha), -15 (12th), -35 (8th Ashtama)',
      classicalSource: 'Muhurta Chintamani (Ch. 11, Gochara Prakarana, v. 22–25) & Brihat Samhita',
      textualBasis: 'Moon favorable in 1, 3, 6, 7, 10, 11 from Janma Rashi; 8th (Ashtama Chandra) strictly avoided; Shukla Paksha waxing Moon mitigates 2nd, 5th, and 9th houses.',
      approvalStatus: 'PROVISIONAL_UNAPPROVED',
    },
    {
      factorId: 'ashtabhaga_kaalas',
      weightRange: '-30 (Rahu Kaal), -20 (Yamaghanta), -10 (Gulika), -22 (Varjyam/Tyajya), -15 (Vishti/Bhadra), -8 (Panchak)',
      classicalSource: 'Muhurta Chintamani (Ch. 1–3) & South/North Indian Panchanga Sampradaya',
      textualBasis: '8-fold diurnal solar division for Rahu/Yamaghanta/Gulika; 4-Ghati Nakshatra Vishaghati (Varjyam); Karana Vishti; Dhanishta-to-Revati 5-star Panchak.',
      approvalStatus: 'PROVISIONAL_UNAPPROVED',
    },
    {
      factorId: 'choghadiya_and_hora',
      weightRange: '+25 (Amrit), +20 (Shubh), +15 (Labh), +8 (Char), -20 (Rog/Kaal/Udveg); ±10 (Chaldean Hora)',
      classicalSource: 'Jyotirnibandha & Brihat Parashara Hora Shastra (Kala Chakra / Hora)',
      textualBasis: '8-fold diurnal/nocturnal Choghadiya and 24 Chaldean Horas anchored to local sunrise Vaaraesha.',
      approvalStatus: 'PROVISIONAL_UNAPPROVED',
    },
    {
      factorId: 'abhijit_vijaya_amrit',
      weightRange: '+25 (Abhijit, non-Wednesday), +15 (Vijaya), +14 (Amrit Kalam), +18 (Brahma Muhurta)',
      classicalSource: 'Muhurta Chintamani (Ch. 4, Dinamana Muhurtas)',
      textualBasis: '8th of 15 diurnal Muhurtas centered on local apparent solar noon (excluded on Wednesdays for South travel / general commencements).',
      approvalStatus: 'PROVISIONAL_UNAPPROVED',
    },
  ],
};

export interface NatalProfile {
  natalMoonNakshatraIndex: number; // 1 to 27 (Ashwini = 1)
  natalMoonSignIndex: number;      // 0 to 11 (Aries = 0)
  natalAscendantSignIndex: number; // 0 to 11 (Aries = 0)
  natalNakshatraPada?: number;     // 1 to 4
}

export interface IntradayScoringSample {
  timestampIso: string;
  epochMs: number;
  localTimeStr: string;
  localTime12Hr: string;
  utcOffsetHours: number;
  utcOffsetLabel: string;
  auspiciousnessScore: number;
  tier: 'AMRITHAM' | 'SHUBHA' | 'MADHYAMA' | 'VARJYA';
  colorHex: string;
  activeChoghadiya: string;
  activeChoghadiyaName: string;
  activeHora: string;
  activeHoraPlanet: string;
  isRahuKaalActive: boolean;
  isYamaghantaActive: boolean;
  isVarjyamActive: boolean;
  isVishtiActive: boolean;
  isPanchakActive: boolean;
  isAbhijitActive: boolean;
  taraBalaCategory: string;
  chandraBalaHouse: number;
  chandraBalaConvention: ChandraBalaConvention;
  lunarPakshaAtInstant: 'Shukla' | 'Krishna';
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
      case 2:
        isAuspicious = true;
        scoreWeight = 20;
        break;
      case 4:
        isAuspicious = true;
        scoreWeight = 15;
        break;
      case 6:
        isAuspicious = true;
        scoreWeight = 25;
        break;
      case 8:
        isAuspicious = true;
        scoreWeight = 15;
        break;
      case 9:
        isAuspicious = true;
        scoreWeight = 20;
        break;
      case 1:
        isAuspicious = false;
        scoreWeight = -5;
        break;
      case 3:
        isAuspicious = false;
        scoreWeight = -20;
        break;
      case 5:
        isAuspicious = false;
        scoreWeight = -20;
        break;
      case 7:
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
   * Computes Chandra Bala at the event instant, honoring explicit waxing (`Shukla`) vs waning (`Krishna`)
   * Moon conventions per Muhurta Chintamani Ch. 11:
   * - `CLASSICAL_STRICT`: Houses 1, 3, 6, 7, 10, 11 favorable regardless of Paksha; 8th (Ashtama) severely malefic.
   * - `SHUKLA_WAXING_RELAXED`: During Shukla Paksha (waxing Moon), houses 2, 5, and 9 gain benefic lunar strength (+5),
   *   whereas during Krishna Paksha (waning Moon) only 1, 3, 6, 7, 10, 11 remain favorable.
   */
  public static calculateChandraBala(
    natalMoonSign: number,
    transitMoonSign: number,
    paksha: 'Shukla' | 'Krishna' = 'Shukla',
    convention: ChandraBalaConvention = 'CLASSICAL_STRICT'
  ): {
    houseFromNatal: number;
    isAuspicious: boolean;
    scoreWeight: number;
    description: string;
  } {
    const safeNatal = ((Math.floor(natalMoonSign) % 12) + 12) % 12;
    const safeTransit = ((Math.floor(transitMoonSign) % 12) + 12) % 12;
    const houseFromNatal = ((safeTransit - safeNatal + 12) % 12) + 1;

    switch (houseFromNatal) {
      case 1:
        return { houseFromNatal, isAuspicious: true, scoreWeight: 15, description: 'Good health and personal energy' };
      case 3:
        return { houseFromNatal, isAuspicious: true, scoreWeight: 20, description: 'High courage, valor and victory in endeavors' };
      case 6:
        return { houseFromNatal, isAuspicious: true, scoreWeight: 15, description: 'Overcoming obstacles, disputes and competition' };
      case 7:
        return { houseFromNatal, isAuspicious: true, scoreWeight: 15, description: 'Supportive partnerships, negotiations and public favor' };
      case 10:
        return { houseFromNatal, isAuspicious: true, scoreWeight: 20, description: 'Career authority, managerial leadership, prestige' };
      case 11:
        return { houseFromNatal, isAuspicious: true, scoreWeight: 25, description: 'Maximum gains, revenue expansion, goal fruition' };
      case 8:
        return {
          houseFromNatal,
          isAuspicious: false,
          scoreWeight: -35,
          description: 'Ashtama Chandra: Vulnerability, unexpected delays. Avoid major new commitments.'
        };
      case 12:
        return {
          houseFromNatal,
          isAuspicious: false,
          scoreWeight: paksha === 'Krishna' ? -18 : -15,
          description: 'Expenditure and scattered attention'
        };
      case 2:
      case 5:
      case 9:
        if (convention === 'SHUKLA_WAXING_RELAXED' && paksha === 'Shukla') {
          return {
            houseFromNatal,
            isAuspicious: true,
            scoreWeight: 5,
            description: `Shukla Paksha waxing Moon supports House ${houseFromNatal} (Muhurta Chintamani Shukla-mitigation convention)`
          };
        }
        return {
          houseFromNatal,
          isAuspicious: false,
          scoreWeight: -5,
          description: `House ${houseFromNatal} lunar transit (${paksha} Paksha · ${convention})`
        };
      default: // House 4
        return {
          houseFromNatal,
          isAuspicious: false,
          scoreWeight: paksha === 'Krishna' ? -10 : -5,
          description: 'Chaturtha Chandra: Domestic caution; verify Tara Bala support'
        };
    }
  }

  public static evaluateInstant(
    instantDate: Date,
    dayData: DayAnalysisResult,
    natal?: NatalProfile,
    options?: ScoringOptions
  ): IntradayScoringSample {
    const rawMs = instantDate?.getTime?.();
    const instantMs = Number.isFinite(rawMs) ? rawMs : dayData.solarMetrics.sunriseMs;
    const safeDate = new Date(instantMs);
    const convention: ChandraBalaConvention = options?.chandraBalaConvention || 'CLASSICAL_STRICT';
    let baseScore = 50;

    const k = dayData.fixedKaalas;
    const inWindow = (w?: { startMs?: number; endMs?: number; startIso: string; endIso: string } | null) => {
      if (!w) return false;
      const s = Number.isFinite(w.startMs) ? (w.startMs as number) : new Date(w.startIso).getTime();
      const e = Number.isFinite(w.endMs) ? (w.endMs as number) : new Date(w.endIso).getTime();
      return instantMs >= s && instantMs < e;
    };

    const isRahuKaalActive = inWindow(k.rahuKaal);
    const isYamaghantaActive = inWindow(k.yamaghanta);
    const isGulikaActive = inWindow(k.gulikaKaal);
    const isVarjyamActive = inWindow(k.varjyam);
    const isAbhijitActive = inWindow(k.abhijitMuhurta) && k.abhijitMuhurta.isValidOnThisDay;
    const isBrahmaActive = inWindow(k.brahmaMuhurta);
    const isVijayaActive = inWindow(k.vijayaMuhurta);
    const isAmritKaalActive = inWindow(k.amritKaal) && !isRahuKaalActive && !isYamaghantaActive && !isVarjyamActive;
    const isGodhuliActive = inWindow(k.godhuliKaal) && !isRahuKaalActive;

    if (isRahuKaalActive) baseScore += k.rahuKaal.scoreImpact;
    if (isYamaghantaActive) baseScore += k.yamaghanta.scoreImpact;
    if (isGulikaActive) baseScore += k.gulikaKaal.scoreImpact;
    if (isVarjyamActive) baseScore += k.varjyam.scoreImpact;
    if (isAbhijitActive) baseScore += k.abhijitMuhurta.scoreImpact;
    if (isBrahmaActive) baseScore += 18;
    if (isVijayaActive && !isRahuKaalActive) baseScore += 15;
    if (isAmritKaalActive) baseScore += 14;
    if (isGodhuliActive) baseScore += 10;

    // Exact Event-Moment Sidereal Sun & 60-Term Moon
    const { siderealSun: sidSun, siderealMoon: sidMoon } = HighPrecisionAstroEngine.siderealSunMoonAtMs(instantMs);
    const lunarSep = HighPrecisionAstroEngine.normalizeDegrees(sidMoon - sidSun);
    const lunarPakshaAtInstant: 'Shukla' | 'Krishna' = lunarSep < 180.0 ? 'Shukla' : 'Krishna';
    const instantKaranaIdx = Math.min(60, Math.floor(lunarSep / 6.0) + 1);
    const isVishtiActive = HighPrecisionAstroEngine.getKaranaNameByIndex(instantKaranaIdx).includes('Vishti');
    const isPanchakActive = sidMoon >= 300.0;

    if (isVishtiActive) baseScore -= 15;
    if (isPanchakActive) baseScore -= 8;

    const tz = dayData.location.timezoneOffset;
    const wall = HighPrecisionAstroEngine.getWallTimeInZone(
      instantMs,
      dayData.location.timezone,
      tz,
      false
    );
    const localTimeStr = wall.hhmm24;
    const isDstDay = Boolean(dayData.localDayBounds?.isDstTransition);
    const localTime12Hr = isDstDay ? `${wall.hhmm12} (${wall.offsetLabel})` : wall.hhmm12;

    const allChoghadiyas = [
      ...(dayData.choghadiya.preSunriseChoghadiya || []),
      ...dayData.choghadiya.dayChoghadiya,
      ...dayData.choghadiya.nightChoghadiya
    ];
    const activeChog =
      allChoghadiyas.find(c => instantMs >= c.startMs && instantMs < c.endMs) ||
      dayData.choghadiya.dayChoghadiya[0];
    baseScore += activeChog.scoreImpact;

    const allHoras = [
      ...(dayData.preSunriseHoras || []),
      ...dayData.horas
    ];
    const activeHora =
      allHoras.find(h => instantMs >= h.startMs && instantMs < h.endMs) ||
      dayData.horas[0];
    baseScore += activeHora.isAuspicious ? 10 : -10;

    let taraCategory = 'General Timing (Non-Personalized)';
    let chandraHouse = 1;
    let isAshtamaChandra = false;

    if (natal) {
      const transitNakshatra = Math.min(27, Math.floor(sidMoon / (360.0 / 27.0)) + 1);
      const tara = this.calculateTaraBala(natal.natalMoonNakshatraIndex, transitNakshatra);
      taraCategory = tara.name;
      baseScore += tara.scoreWeight;

      const transitMoonSign = Math.floor(sidMoon / 30.0) % 12;
      const chandra = this.calculateChandraBala(
        natal.natalMoonSignIndex,
        transitMoonSign,
        lunarPakshaAtInstant,
        convention
      );
      chandraHouse = chandra.houseFromNatal;
      isAshtamaChandra = chandraHouse === 8;
      baseScore += chandra.scoreWeight;

      const liveAngles = HighPrecisionAstroEngine.calculateLiveAngles(
        instantMs,
        dayData.location.latitude,
        dayData.location.longitude
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

    if (finalScore >= 75 && !isRahuKaalActive && !isVarjyamActive && !isVishtiActive && !isAshtamaChandra) {
      tier = 'AMRITHAM';
      colorHex = '#10B981';
      executiveAdvice = 'Supreme golden window. Highly favorable for contract signatures, purchases, and major decisions.';
    } else if (finalScore >= 55 && !isRahuKaalActive && !isVarjyamActive) {
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
        : isVarjyamActive
        ? `Nakshatra Varjyam (Tyajya) active (${k.varjyam.start12Hr} – ${k.varjyam.end12Hr}). Defer auspicious initiations.`
        : isVishtiActive
        ? 'Vishti (Bhadra) Karana active. Avoid commencing new ventures during this half-tithi.'
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
      utcOffsetHours: wall.offsetHours,
      utcOffsetLabel: wall.offsetLabel,
      auspiciousnessScore: finalScore,
      tier,
      colorHex,
      activeChoghadiya: `${activeChog.name} (${activeChog.isAuspicious ? 'Auspicious' : 'Inauspicious'})`,
      activeChoghadiyaName: activeChog.name,
      activeHora: `${activeHora.rulingPlanet} Hora`,
      activeHoraPlanet: activeHora.rulingPlanet,
      isRahuKaalActive,
      isYamaghantaActive,
      isVarjyamActive,
      isVishtiActive,
      isPanchakActive,
      isAbhijitActive,
      taraBalaCategory: taraCategory,
      chandraBalaHouse: chandraHouse,
      chandraBalaConvention: convention,
      lunarPakshaAtInstant,
      isAshtamaChandra,
      executiveAdvice
    };
  }

  public static generate24HourTimeline(
    dayData: DayAnalysisResult,
    natal?: NatalProfile,
    options?: ScoringOptions
  ): IntradayScoringSample[] {
    const samples: IntradayScoringSample[] = [];
    const tz = dayData.location.timezoneOffset;
    const ianaTz = dayData.location.timezone;
    const bounds = dayData.localDayBounds?.date === dayData.date && dayData.localDayBounds?.timezone === ianaTz
      ? dayData.localDayBounds
      : HighPrecisionAstroEngine.getLocalDayUtcBounds(dayData.date, ianaTz, tz);

    const stepMs = 15 * 60 * 1000;
    for (let sampleMs = bounds.startUtcMs; sampleMs < bounds.endUtcMs; sampleMs += stepMs) {
      samples.push(this.evaluateInstant(new Date(sampleMs), dayData, natal, options));
    }

    return samples;
  }
}
