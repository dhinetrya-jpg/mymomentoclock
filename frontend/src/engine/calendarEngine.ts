/**
 * @license
 * MIT License
 *
 * Multimodal Calendar Engine (Lunar Month Heatmap & Astronomical Annual Solar Sankrantis)
 * 1. Month Grid: Evaluates exact lunar day Panchanga + Personal Natal Synastry (Tara Bala & Ashtama Chandra).
 * 2. Year Calendar: Solves true sidereal solar Rashi ingresses (0°, 30°, ..., 330°) via VSOP87 + Lahiri bisection
 *    formatted in observer local 12-hour AM/PM time.
 */

import { HighPrecisionAstroEngine, LocationCoordinates, ZODIAC_SIGNS } from './zeroCostAstroEngine';
import { NatalProfile, PersonalAuspiciousnessScoringEngine } from './scoringEngine';

export interface MonthLunarDaySummary {
  date: string;
  dayOfMonth: number;
  tithiIndex: number;
  tithiName: string;
  paksha: 'Shukla' | 'Krishna';
  nakshatraName: string;
  isEkadashi: boolean;
  isPradosham: boolean;
  isPurnima: boolean;
  isAmavasya: boolean;
  isAshtamaChandra: boolean;
  dailyScore: number;
  taraLabel?: string;
  primaryEnergyColor: string;
  auspiciousnessTier: 'AMRITHAM' | 'SHUBHA' | 'MADHYAMA' | 'VARJYA';
}

export interface SolarSankrantiEvent {
  zodiacSign: string;
  rashiIndex: number;
  ingressDate: string;
  ingressLocal12Hr: string;
  approximatePunyaKaalSpan: string;
  personalTransitHouse?: number;
  spiritualSignificance: string;
}

const SANKRANTI_SIGNIFICANCE: Record<number, { label: string; desc: string }> = {
  9: { label: 'Capricorn (Makara)', desc: 'Makar Sankranti: Solar transition into Uttarayana. Supreme window for charity, स्नान-दान (Snana-Daana), and dharmic beginnings.' },
  10: { label: 'Aquarius (Kumbha)', desc: 'Kumbha Sankranti: Sacred confluence energy cleansing karmic impediments and collective service.' },
  11: { label: 'Pisces (Meena)', desc: 'Meena Sankranti: Contemplative culmination of the solar cycle; defer weddings during Kharmas while deepening sadhana.' },
  0: { label: 'Aries (Mesha)', desc: 'Mesha Sankranti (Solar New Year): Sun enters exaltation sign Aries—powerful vitality, leadership, and new annual resolutions.' },
  1: { label: 'Taurus (Vrishabha)', desc: 'Vrishabha Sankranti: Grounded material stability, agricultural abundance, and treasury consolidation.' },
  2: { label: 'Gemini (Mithuna)', desc: 'Mithuna Sankranti (Raja Parba): Celebrates Earth fertility, intellectual trade, and communication.' },
  3: { label: 'Cancer (Karka)', desc: 'Karka Sankranti: Commencement of Dakshinayana; auspicious for ancestral reverence, Chaturmas vows, and inner reflection.' },
  4: { label: 'Leo (Simha)', desc: 'Simha Sankranti: Sun enters own royal sign Leo—favorable for authority, governance, and decisive execution.' },
  5: { label: 'Virgo (Kanya)', desc: 'Kanya Sankranti (Vishwakarma Puja): Blesses engineering, craftsmanship, tools, architecture, and analytical precision.' },
  6: { label: 'Libra (Tula)', desc: 'Tula Sankranti: Equinox harmony, balanced partnerships, and agricultural prosperity rites.' },
  7: { label: 'Scorpio (Vrischika)', desc: 'Vrischika Sankranti: Deep resilience, research, and devotional austerity.' },
  8: { label: 'Sagittarius (Dhanu)', desc: 'Dhanu Sankranti: Dhanurmasa spiritual study, morning temple worship, and philosophical clarity.' }
};

export class MultimodalCalendarEngine {
  /**
   * Generates a dynamic lunar month grid (28/29/30/31 days) personalized with optional NatalProfile
   */
  public static generateMonthGrid(
    year: number,
    month: number, // 1 to 12
    loc: LocationCoordinates,
    natal?: NatalProfile
  ): MonthLunarDaySummary[] {
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return [];
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const days: MonthLunarDaySummary[] = [];
    const tz = loc?.timezoneOffset ?? 5.5;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dayAnalysis = HighPrecisionAstroEngine.analyzeFullDay(dateStr, loc);
      const tithiIdx = dayAnalysis.panchanga.tithi.index;

      const isEkadashi = tithiIdx === 11 || tithiIdx === 26;
      const isPradosham = tithiIdx === 13 || tithiIdx === 28;
      const isPurnima = tithiIdx === 15;
      const isAmavasya = tithiIdx === 30;

      // Evaluate local 10:30 AM daytime window in the city's IANA timezone
      const midMorningMs = HighPrecisionAstroEngine.resolveLocalMinutesToUtcMs(
        dateStr,
        10 * 60 + 30,
        loc?.timezone,
        tz
      );
      const sample = PersonalAuspiciousnessScoringEngine.evaluateInstant(new Date(midMorningMs), dayAnalysis, natal);

      let score = sample.auspiciousnessScore;
      if (isPurnima || isEkadashi) score = Math.min(96, score + 8);
      if (isAmavasya) score = Math.max(20, score - 8);

      let tier: MonthLunarDaySummary['auspiciousnessTier'];
      let color: string;
      if (sample.isAshtamaChandra || score < 40) {
        tier = 'VARJYA';
        color = '#EF4444';
      } else if (score >= 75) {
        tier = 'AMRITHAM';
        color = '#10B981';
      } else if (score >= 55) {
        tier = 'SHUBHA';
        color = '#3B82F6';
      } else {
        tier = 'MADHYAMA';
        color = '#F59E0B';
      }

      days.push({
        date: dateStr,
        dayOfMonth: d,
        tithiIndex: tithiIdx,
        tithiName: dayAnalysis.panchanga.tithi.name,
        paksha: dayAnalysis.panchanga.tithi.paksha,
        nakshatraName: dayAnalysis.panchanga.nakshatra.name,
        isEkadashi,
        isPradosham,
        isPurnima,
        isAmavasya,
        isAshtamaChandra: sample.isAshtamaChandra,
        dailyScore: score,
        taraLabel: natal ? sample.taraBalaCategory.split(' ')[0] : undefined,
        primaryEnergyColor: color,
        auspiciousnessTier: tier
      });
    }

    return days;
  }

  public static generateAnnualSolarSankrantis(
    year: number,
    loc?: LocationCoordinates,
    natal?: NatalProfile
  ): SolarSankrantiEvent[] {
    return this.generateAnnualSankrantiCalendar(year, loc, natal);
  }

  /**
   * Astronomically solves all 12 Sidereal Solar Rashi Ingresses (Sankrantis) in `year`
   * using 32-step binary search on VSOP87 Sun - True Lahiri Ayanamsa (~1 second precision).
   */
  public static generateAnnualSankrantiCalendar(
    year: number,
    loc?: LocationCoordinates,
    natal?: NatalProfile
  ): SolarSankrantiEvent[] {
    const safeYear = Number.isFinite(year) && year > 1800 && year < 2300 ? Math.floor(year) : new Date().getFullYear();
    const tz = loc?.timezoneOffset ?? 5.5;

    // Order of the 12 Sankrantis Jan -> Dec: Makara (9), Kumbha (10), Meena (11), Mesha (0)..Dhanu (8)
    const monthTargets: Array<{ approxMonth: number; rashiIdx: number }> = [
      { approxMonth: 1, rashiIdx: 9 },
      { approxMonth: 2, rashiIdx: 10 },
      { approxMonth: 3, rashiIdx: 11 },
      { approxMonth: 4, rashiIdx: 0 },
      { approxMonth: 5, rashiIdx: 1 },
      { approxMonth: 6, rashiIdx: 2 },
      { approxMonth: 7, rashiIdx: 3 },
      { approxMonth: 8, rashiIdx: 4 },
      { approxMonth: 9, rashiIdx: 5 },
      { approxMonth: 10, rashiIdx: 6 },
      { approxMonth: 11, rashiIdx: 7 },
      { approxMonth: 12, rashiIdx: 8 }
    ];

    const siderealSunAtMs = (ms: number): number => {
      const jd = HighPrecisionAstroEngine.julianDayFromEpochMs(ms);
      const trop = HighPrecisionAstroEngine.calculateSunLongitude(jd).longitude;
      const ayan = HighPrecisionAstroEngine.getTrueLahiriAyanamsa(jd);
      return HighPrecisionAstroEngine.normalizeDegrees(trop - ayan);
    };

    const signedAngleDiff = (a: number, target: number): number => {
      return ((a - target + 540.0) % 360.0) - 180.0;
    };

    return monthTargets.map(({ approxMonth, rashiIdx }) => {
      const targetDeg = rashiIdx * 30.0;
      let loMs = Date.UTC(safeYear, approxMonth - 1, 8, 0, 0, 0);
      let hiMs = Date.UTC(safeYear, approxMonth - 1, 22, 0, 0, 0);

      for (let iter = 0; iter < 32; iter++) {
        const midMs = 0.5 * (loMs + hiMs);
        const diff = signedAngleDiff(siderealSunAtMs(midMs), targetDeg);
        if (diff < 0) {
          loMs = midMs;
        } else {
          hiMs = midMs;
        }
      }

      const ingressMs = Math.round(0.5 * (loMs + hiMs));
      const ingressWall = HighPrecisionAstroEngine.getWallTimeInZone(ingressMs, loc?.timezone, tz, true);
      const ingressDate = ingressWall.dateStr;
      const ingressLocal12Hr = ingressWall.hhmm12;

      // Classical Punya Kaal window (~16 Ghatis = 6h 24m centered/bounded around solar ingress)
      const pStartWall = HighPrecisionAstroEngine.getWallTimeInZone(ingressMs - 192 * 60000, loc?.timezone, tz, true);
      const pEndWall = HighPrecisionAstroEngine.getWallTimeInZone(ingressMs + 192 * 60000, loc?.timezone, tz, true);
      const punyaSpan = `${pStartWall.hhmm12} – ${pEndWall.hhmm12}`;

      const meta = SANKRANTI_SIGNIFICANCE[rashiIdx] || {
        label: ZODIAC_SIGNS[rashiIdx],
        desc: 'Solar sidereal ingress marking auspicious Punya Kaal.'
      };

      const personalHouse = natal
        ? ((rashiIdx - natal.natalMoonSignIndex + 12) % 12) + 1
        : undefined;

      return {
        zodiacSign: meta.label,
        rashiIndex: rashiIdx,
        ingressDate,
        ingressLocal12Hr,
        approximatePunyaKaalSpan: `${punyaSpan} (Exact Ingress: ${ingressLocal12Hr})`,
        personalTransitHouse: personalHouse,
        spiritualSignificance: meta.desc
      };
    });
  }
}