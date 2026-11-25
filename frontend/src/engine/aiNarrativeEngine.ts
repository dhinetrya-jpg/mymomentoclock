/**
 * @license
 * MIT License
 *
 * Client-Edge Natural Language Muhurat Scanner & Executive Narrative Engine
 * - 100% Client-Side ($0 API cost, zero exposed browser API keys, 100% CSP-compliant).
 * - Parses free-text user questions (activity intent + target day/horizon) AND 1-click presets.
 * - Scans real astronomical 15-minute intervals across 1 to 7 days using HighPrecisionAstroEngine
 *   and PersonalAuspiciousnessScoringEngine (incorporating NatalProfile Tara/Chandra/Lagna Bala),
 *   returning genuine un-inflated scores and exact 12-hour AM/PM Golden Windows.
 */

import { IntradayScoringSample, NatalProfile, PersonalAuspiciousnessScoringEngine } from './scoringEngine';
import { DayAnalysisResult, HighPrecisionAstroEngine, LocationCoordinates, ZODIAC_SIGNS } from './zeroCostAstroEngine';

export interface NarrativeSummary {
  executiveOneLiner: string;
  goldenWindowNotice: string;
  cautionaryNotice: string;
  source: 'CLIENT_EDGE_SHASTRIC_SCANNER' | 'OFFLINE_DETERMINISTIC_TEMPLATE';
}

export type MuhuratIntentCategory =
  | 'INTERVIEW'
  | 'SHOP_OPENING'
  | 'PROPOSE'
  | 'TRADING'
  | 'PROPERTY'
  | 'VEHICLE'
  | 'TRAVEL'
  | 'MEDICAL'
  | 'GOLD_PURCHASE'
  | 'SPIRITUAL'
  | 'CONTRACT'
  | 'GENERAL';

export interface MuhuratConsultationResult {
  intent: MuhuratIntentCategory;
  intentLabel: string;
  evaluatedQuery: string;
  verdict: string;
  score: number; // Genuine computed score (5..98), NEVER artificially floored!
  currentInstantScore: number;
  bestWindow: string;
  bestDate: string;
  advice: string;
  mitigation: string;
}

const INTENT_RULES: Record<
  MuhuratIntentCategory,
  {
    label: string;
    preferredHoras: string[];
    preferredChoghadiyas: string[];
    preferFixedLagna?: boolean;
    daytimeOnly: boolean;
    minHourLocal: number;
    maxHourLocal: number;
    advice: string;
    mitigation: string;
  }
> = {
  INTERVIEW: {
    label: 'Job Interview & Career Pitch',
    preferredHoras: ['Mercury', 'Jupiter', 'Sun'],
    preferredChoghadiyas: ['Amrit', 'Shubh', 'Labh'],
    daytimeOnly: true,
    minHourLocal: 8,
    maxHourLocal: 18,
    advice: 'Prioritize Vijaya Muhurta, valid Abhijit Muhurta (non-Wednesday), or Mercury/Jupiter Hora. Wear crisp emerald green, saffron, or turmeric yellow accents; face East or North while speaking.',
    mitigation: 'If the employer fixed the slot during Rahu Kaalam: take a spoonful of sweet curd with jaggery before joining, pause for 3 steady breaths, and mentally invoke Lord Ganesha & Guru Brihaspati.'
  },
  SHOP_OPENING: {
    label: 'Shop, Office & Venture Launch',
    preferredHoras: ['Jupiter', 'Venus', 'Mercury'],
    preferredChoghadiyas: ['Amrit', 'Labh', 'Shubh'],
    preferFixedLagna: true,
    daytimeOnly: true,
    minHourLocal: 7,
    maxHourLocal: 17,
    advice: 'Inaugurate during Sthira (Fixed) Lagna—Taurus, Leo, Scorpio, or Aquarius—combined with Labh or Amrit Choghadiya in Shukla Paksha for enduring commercial stability.',
    mitigation: 'Light a pure cow-ghee lamp at the Northeast (Ishanya) corner, offer yellow flowers to Lord Ganesha & Goddess Lakshmi, and step across the threshold with the right foot first.'
  },
  PROPOSE: {
    label: 'Proposal, Engagement & Relationship Milestone',
    preferredHoras: ['Venus', 'Moon', 'Jupiter'],
    preferredChoghadiyas: ['Amrit', 'Shubh'],
    daytimeOnly: false,
    minHourLocal: 8,
    maxHourLocal: 21,
    advice: 'Venus (Shukra) or Jupiter Hora during Amrit/Shubh Choghadiya with strong Chandra Bala fosters lasting warmth, mutual respect, and emotional harmony. Wear white, pastel pink, or silver.',
    mitigation: 'Strictly avoid Mars Hora, Rahu Kaalam, and Ashtama Chandra to prevent misunderstandings; offer white sweets or fragrant flowers beforehand.'
  },
  TRADING: {
    label: 'Stock Trading & Financial Allocation',
    preferredHoras: ['Mercury', 'Jupiter', 'Venus'],
    preferredChoghadiyas: ['Labh', 'Amrit', 'Shubh'],
    daytimeOnly: true,
    minHourLocal: 9,
    maxHourLocal: 16,
    advice: 'Mercury (Budha) Hora in Labh Choghadiya sharpens analytical pricing and execution discipline. Gulika Kaalam is also supportive strictly for long-term SIP/index accumulation (never debt).',
    mitigation: 'Never trade on margin during Rahu Kaalam, Kaal/Rog Choghadiya, or Ashtama Chandra; enforce strict pre-defined risk limits.'
  },
  PROPERTY: {
    label: 'Property Lease, Deed Signing & Griha Pravesh',
    preferredHoras: ['Jupiter', 'Venus', 'Mercury'],
    preferredChoghadiyas: ['Shubh', 'Amrit', 'Labh'],
    preferFixedLagna: true,
    daytimeOnly: true,
    minHourLocal: 8,
    maxHourLocal: 17,
    advice: 'Real estate agreements and leases thrive in Fixed Lagna (Taurus/Leo/Aquarius) during Jupiter or Mercury Hora, avoiding Vishti (Bhadra) Karana and Tuesday/Saturday Rahu spans.',
    mitigation: 'Sign documents facing East or North, verify title clauses thoroughly, and offer yellow sweets or prayers to Bhoomi-Varaha / Lord Ganesha.'
  },
  VEHICLE: {
    label: 'Vehicle Booking & Delivery',
    preferredHoras: ['Venus', 'Moon', 'Mercury', 'Jupiter'],
    preferredChoghadiyas: ['Char', 'Amrit', 'Shubh', 'Labh'],
    daytimeOnly: true,
    minHourLocal: 8,
    maxHourLocal: 18,
    advice: 'Char (Dynamic) or Amrit Choghadiya ruled by Venus/Moon blesses safe, trouble-free mobility and mechanical longevity.',
    mitigation: 'Perform Vahana Puja with turmeric/kumkum swastika, place a fresh lemon under the front wheel before first roll-out, and avoid Rahu Kaalam & Yamaghantam.'
  },
  TRAVEL: {
    label: 'Journey, Flight & Outstation Departure',
    preferredHoras: ['Moon', 'Venus', 'Jupiter', 'Mercury'],
    preferredChoghadiyas: ['Char', 'Amrit', 'Shubh'],
    daytimeOnly: false,
    minHourLocal: 5,
    maxHourLocal: 22,
    advice: 'Char or Amrit Choghadiya outside Yamaghantam and Rahu Kaalam supports smooth transit and timely arrival.',
    mitigation: 'If ticketed departure falls in Rahu Kaalam or Yamaghantam, perform Prasthana (symbolic step-out with a small item + curd/cardamom) during an earlier Shubh window on the same day.'
  },
  MEDICAL: {
    label: 'Medical Consultation, Treatment & Wellness',
    preferredHoras: ['Sun', 'Jupiter', 'Moon', 'Mercury'],
    preferredChoghadiyas: ['Amrit', 'Shubh', 'Char'],
    daytimeOnly: true,
    minHourLocal: 7,
    maxHourLocal: 18,
    advice: 'Begin medicines and therapies during Amrit Kaal or Amrit Choghadiya for optimal recovery; never delay emergency medical care.',
    mitigation: 'Note: Emergency medical treatment transcends all Muhurat rules—remember Lord Dhanvantari ("Om Namo Bhagavate Vasudevaya Dhanvantaraye") and act immediately.'
  },
  GOLD_PURCHASE: {
    label: 'Gold, Silver & Precious Asset Purchase',
    preferredHoras: ['Jupiter', 'Venus', 'Sun'],
    preferredChoghadiyas: ['Amrit', 'Labh', 'Shubh'],
    daytimeOnly: true,
    minHourLocal: 9,
    maxHourLocal: 20,
    advice: 'Jupiter or Venus Hora combined with Labh/Amrit Choghadiya (or Gulika for compounding wealth) multiplies household prosperity.',
    mitigation: 'Avoid purchasing metal/iron/leather during Saturday Rahu Kaalam; consecrate new gold at the home altar before wearing.'
  },
  SPIRITUAL: {
    label: 'Puja, Mantra Initiation & Meditation',
    preferredHoras: ['Jupiter', 'Sun', 'Moon', 'Venus'],
    preferredChoghadiyas: ['Amrit', 'Shubh'],
    daytimeOnly: false,
    minHourLocal: 4,
    maxHourLocal: 21,
    advice: 'Brahma Muhurta (pre-dawn), Abhijit (non-Wednesday), and Godhuli Bela (sunset Sandhya) carry supreme Sattvic resonance.',
    mitigation: 'Use clean wooden Paduka or kuśa/wool mat (Asana) to preserve spiritual Ojas.'
  },
  CONTRACT: {
    label: 'Contract, Legal Agreement & Partnership Signing',
    preferredHoras: ['Mercury', 'Jupiter', 'Venus'],
    preferredChoghadiyas: ['Shubh', 'Labh', 'Amrit'],
    preferFixedLagna: true,
    daytimeOnly: true,
    minHourLocal: 9,
    maxHourLocal: 18,
    advice: 'Combine Mercury or Jupiter Hora with Shubh/Labh Choghadiya and favorable Tara Bala so obligations remain clear and mutually profitable.',
    mitigation: 'Avoid signing during Vishti (Bhadra) Karana, Rahu Kaalam, or Ashtama Chandra; review every clause calmly.'
  },
  GENERAL: {
    label: 'Important Personal & Strategic Milestone',
    preferredHoras: ['Jupiter', 'Venus', 'Mercury', 'Moon'],
    preferredChoghadiyas: ['Amrit', 'Shubh', 'Labh'],
    daytimeOnly: true,
    minHourLocal: 7,
    maxHourLocal: 19,
    advice: 'Align important decisions with Amritham or Shubha windows supported by Jupiter/Venus/Mercury Hora and positive Tara Bala.',
    mitigation: 'Pause during Rahu Kaalam and Yamaghantam; begin with 3 mindful breaths facing East.'
  }
};

export class AiNarrativeEngine {
  /**
   * Fast client-edge deterministic briefing (0ms, zero external network calls, 100% CSP safe)
   */
  public static generateOfflineFallback(
    activeSample: IntradayScoringSample,
    dayData: DayAnalysisResult
  ): NarrativeSummary {
    const score = activeSample.auspiciousnessScore;
    const rahuSpan = `${dayData.fixedKaalas.rahuKaal.start12Hr} – ${dayData.fixedKaalas.rahuKaal.end12Hr}`;

    if (activeSample.isRahuKaalActive || score < 40) {
      return {
        executiveOneLiner: activeSample.isRahuKaalActive
          ? `Rahu Kaalam is active (${rahuSpan}); current instant score is ${score}% (${activeSample.tier}).`
          : `Cautionary alignment at ${activeSample.localTime12Hr} (${score}% ${activeSample.tier}, ${activeSample.activeChoghadiya}).`,
        goldenWindowNotice: `Defer major signatures until the next Amritham/Shubha span outside Rahu Kaalam.`,
        cautionaryNotice: `Use this window for internal review, planning, or apply the Shastric mitigation if time-bound.`,
        source: 'OFFLINE_DETERMINISTIC_TEMPLATE'
      };
    }

    if (score >= 75) {
      return {
        executiveOneLiner: `Peak Amritham alignment (${score}%) at ${activeSample.localTime12Hr} with ${activeSample.activeChoghadiya} and ${activeSample.activeHora}.`,
        goldenWindowNotice: `Highly favorable for high-stakes agreements, purchases, and decisive execution.`,
        cautionaryNotice: `Note today's Rahu Kaalam (${rahuSpan}) for scheduling later tasks.`,
        source: 'OFFLINE_DETERMINISTIC_TEMPLATE'
      };
    }

    return {
      executiveOneLiner: `Constructive ${activeSample.tier} flow (${score}%) on ${dayData.panchanga.vaara.name} (${dayData.panchanga.tithi.name}, ${dayData.panchanga.nakshatra.name}).`,
      goldenWindowNotice: `Supportive for scheduled work; scan below for the highest-scoring Golden Window.`,
      cautionaryNotice: `Avoid scheduling new commitments inside Rahu Kaalam (${rahuSpan}).`,
      source: 'OFFLINE_DETERMINISTIC_TEMPLATE'
    };
  }

  public static async generateDailyBriefing(
    activeSample: IntradayScoringSample,
    dayData: DayAnalysisResult
  ): Promise<NarrativeSummary> {
    return this.generateOfflineFallback(activeSample, dayData);
  }

  /**
   * Parses natural language intent from either a preset ID or any free-text user question
   */
  public static detectIntent(input: string): MuhuratIntentCategory {
    const u = (input || '').trim().toUpperCase();
    if (u in INTENT_RULES) return u as MuhuratIntentCategory;

    const q = (input || '').toLowerCase();
    if (/\b(lease|house|home|flat|apartment|property|land|plot|real estate|deed|registry|griha|rent)\b/.test(q)) return 'PROPERTY';
    if (/\b(interview|job|resume|career|offer|promotion|exam|pitch|presentation)\b/.test(q)) return 'INTERVIEW';
    if (/\b(shop|store|office|business|company|startup|launch|inaugurat|vyapar)\b/.test(q)) return 'SHOP_OPENING';
    if (/\b(propos|marry|marriage|wedding|ring|engagement|love|date|bride|groom|roka)\b/.test(q)) return 'PROPOSE';
    if (/\b(stock|trade|trading|invest|crypto|market|ipo|mutual fund|sip|finance)\b/.test(q)) return 'TRADING';
    if (/\b(car|vehicle|bike|scooter|delivery|automobile|truck)\b/.test(q)) return 'VEHICLE';
    if (/\b(travel|flight|trip|journey|train|depart|vacation|visa)\b/.test(q)) return 'TRAVEL';
    if (/\b(doctor|surgery|medical|hospital|health|medicine|therapy|checkup)\b/.test(q)) return 'MEDICAL';
    if (/\b(gold|silver|jewel|ornament|dhanteras|diamond)\b/.test(q)) return 'GOLD_PURCHASE';
    if (/\b(puja|pooja|mantra|meditat|temple|havan|spiritual|sadhana)\b/.test(q)) return 'SPIRITUAL';
    if (/\b(contract|sign|agreement|mou|legal|partnership|deal|loan)\b/.test(q)) return 'CONTRACT';
    return 'GENERAL';
  }

  /**
   * Resolves target candidate dates from natural language temporal cues ("tomorrow", "next Tuesday", "this Friday", "this week")
   */
  public static resolveCandidateDates(query: string, baseDateStr: string): string[] {
    const safeBase = /^\d{4}-\d{2}-\d{2}$/.test(baseDateStr) ? baseDateStr : HighPrecisionAstroEngine.getObserverDateString(5.5);
    const [by, bm, bd] = safeBase.split('-').map(Number);
    const baseUtc = new Date(Date.UTC(by, bm - 1, bd));

    const addDays = (offset: number): string => {
      const d = new Date(Date.UTC(baseUtc.getUTCFullYear(), baseUtc.getUTCMonth(), baseUtc.getUTCDate() + offset));
      return d.toISOString().split('T')[0];
    };

    const q = (query || '').toLowerCase();

    if (/\btoday\b|\bright now\b|\btonight\b/.test(q)) {
      return [safeBase];
    }
    if (/\btomorrow\b/.test(q)) {
      return [addDays(1)];
    }

    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let w = 0; w < 7; w++) {
      if (new RegExp(`\\b${weekdays[w]}\\b`).test(q)) {
        const curDow = baseUtc.getUTCDay();
        let delta = (w - curDow + 7) % 7;
        if (delta === 0 && /\bnext\b/.test(q)) delta = 7;
        else if (/\bnext\s+/.test(q) && delta < 3) delta += 7;
        return [addDays(delta)];
      }
    }

    // Explicit YYYY-MM-DD in query
    const isoMatch = q.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoMatch) return [isoMatch[1]];

    // If "this week" / "next week" / open-ended "when should I...", scan next 5 days starting from baseDateStr
    if (/\bweek\b|\bwhen\b|\bbest day\b|\bbest time\b/.test(q)) {
      return [0, 1, 2, 3, 4, 5, 6].map(addDays);
    }

    return [safeBase, addDays(1), addDays(2)];
  }

  /**
   * Evaluates either a 1-click preset OR any custom natural language question across real astronomical windows
   */
  public static evaluateMuhuratQuery(params: {
    queryOrPreset: string;
    customText?: string;
    selectedDate: string;
    currentMinutesOfDay: number;
    location: LocationCoordinates;
    natal?: NatalProfile;
  }): MuhuratConsultationResult {
    const isPresetKey = params.queryOrPreset.toUpperCase() in INTENT_RULES && !params.customText;
    const intent = this.detectIntent(params.customText || params.queryOrPreset);
    const rule = INTENT_RULES[intent];

    const presetPrompts: Record<MuhuratIntentCategory, string> = {
      INTERVIEW: 'What is the best auspicious Muhurat for a high-stakes Job Interview?',
      SHOP_OPENING: 'What is the best Fixed-Lagna Muhurat for Opening a Shop or Office?',
      PROPOSE: 'When is the most harmonious Venus/Jupiter Muhurat to Propose or discuss marriage?',
      TRADING: 'What is the optimal Budha/Labh window for Stock Trading & investments?',
      PROPERTY: 'When should I sign a Real Estate Lease, Property Deed, or Griha Pravesh?',
      VEHICLE: 'What is the best Char/Amrit Muhurat to take delivery of a New Vehicle?',
      TRAVEL: 'When is the safest auspicious window to depart for travel?',
      MEDICAL: 'What is the best Amrit window to begin medical consultation or wellness therapy?',
      GOLD_PURCHASE: 'When is the best auspicious Hora to purchase Gold or precious assets?',
      SPIRITUAL: 'What is the purest Sattvic window for Puja or mantra meditation?',
      CONTRACT: 'When should I sign an important legal contract or partnership agreement?',
      GENERAL: 'What is the highest-scoring auspicious Golden Window for my milestone?'
    };

    const evaluatedQuery = isPresetKey ? presetPrompts[intent] : (params.customText || params.queryOrPreset).trim();
    const candidateDates = this.resolveCandidateDates(evaluatedQuery, params.selectedDate);
    const tz = params.location?.timezoneOffset ?? 5.5;

    // Current instant score on selectedDate for honest transparency
    const todayData = HighPrecisionAstroEngine.analyzeFullDay(params.selectedDate, params.location);
    const [sy, sm, sd] = todayData.date.split('-').map(Number);
    const curInstant = new Date(Date.UTC(sy, sm - 1, sd, 0, params.currentMinutesOfDay - Math.round(tz * 60)));
    const curSample = PersonalAuspiciousnessScoringEngine.evaluateInstant(curInstant, todayData, params.natal);

    let bestCandidate: {
      date: string;
      dayName: string;
      start12Hr: string;
      end12Hr: string;
      rawScore: number;
      domainRank: number;
      chog: string;
      hora: string;
      lagnaName: string;
      tithi: string;
      nakshatra: string;
      tara: string;
    } | null = null;

    for (const dStr of candidateDates) {
      const dData = HighPrecisionAstroEngine.analyzeFullDay(dStr, params.location);
      const timeline = PersonalAuspiciousnessScoringEngine.generate24HourTimeline(dData, params.natal);

      for (let i = 0; i < timeline.length; i++) {
        const s = timeline[i];
        const hourLocal = Math.floor((i * 15) / 60);
        if (hourLocal < rule.minHourLocal || hourLocal >= rule.maxHourLocal) continue;
        if (s.isRahuKaalActive || s.isYamaghantaActive || s.isAshtamaChandra) continue;

        let domainRank = s.auspiciousnessScore;
        if (rule.preferredHoras.includes(s.activeHoraPlanet)) domainRank += 12;
        if (rule.preferredChoghadiyas.includes(s.activeChoghadiyaName)) domainRank += 10;

        const angles = HighPrecisionAstroEngine.calculateLiveAngles(
          s.epochMs,
          params.location.latitude,
          params.location.longitude
        );
        const lagnaIdx = Math.floor(angles.siderealAscendant / 30.0) % 12;
        if (rule.preferFixedLagna && [1, 4, 7, 10].includes(lagnaIdx)) {
          domainRank += 10; // Taurus, Leo, Scorpio, Aquarius Sthira Lagna
        }

        if (!bestCandidate || domainRank > bestCandidate.domainRank) {
          // Extend contiguous good block up to 60 mins if adjacent slots are also clean & high-scoring
          let endIdx = i;
          while (
            endIdx + 1 < timeline.length &&
            endIdx - i < 3 &&
            !timeline[endIdx + 1].isRahuKaalActive &&
            !timeline[endIdx + 1].isYamaghantaActive &&
            timeline[endIdx + 1].auspiciousnessScore >= 65
          ) {
            endIdx++;
          }
          const endMins = ((endIdx + 1) * 15) % 1440;
          const end24 = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

          bestCandidate = {
            date: dData.date,
            dayName: dData.panchanga.vaara.name,
            start12Hr: s.localTime12Hr,
            end12Hr: HighPrecisionAstroEngine.format24To12Hr(end24),
            rawScore: s.auspiciousnessScore,
            domainRank,
            chog: s.activeChoghadiyaName,
            hora: s.activeHoraPlanet,
            lagnaName: ZODIAC_SIGNS[lagnaIdx],
            tithi: `${dData.panchanga.tithi.paksha} ${dData.panchanga.tithi.name}`,
            nakshatra: dData.panchanga.nakshatra.name,
            tara: s.taraBalaCategory
          };
        }
      }
    }

    if (!bestCandidate) {
      return {
        intent,
        intentLabel: rule.label,
        evaluatedQuery,
        verdict: `Heavy affliction (such as Ashtama Chandra or narrow hours) detected on ${todayData.date} (${curSample.auspiciousnessScore}%). Prefer postponing by 24–48 hours or apply emergency mitigation.`,
        score: curSample.auspiciousnessScore,
        currentInstantScore: curSample.auspiciousnessScore,
        bestWindow: `${todayData.fixedKaalas.vijayaMuhurta.start12Hr} – ${todayData.fixedKaalas.vijayaMuhurta.end12Hr} (Vijaya Muhurta fallback)`,
        bestDate: todayData.date,
        advice: rule.advice,
        mitigation: rule.mitigation
      };
    }

    const bestWindow = `${bestCandidate.dayName}, ${bestCandidate.date} · ${bestCandidate.start12Hr} – ${bestCandidate.end12Hr} (${bestCandidate.chog} Choghadiya · ${bestCandidate.hora} Hora · ${bestCandidate.lagnaName} Lagna)`;
    const synastryNote = params.natal ? ` Personalized Tara Bala: ${bestCandidate.tara}.` : ' Evaluated in Universal City Mode.';
    const currentNote = curSample.isRahuKaalActive
      ? ` (Note: Your currently selected clock instant ${curSample.localTime12Hr} is inside Rahu Kaalam at ${curSample.auspiciousnessScore}%—wait for the Golden Window above!)`
      : ` (Selected clock ${curSample.localTime12Hr} currently scores ${curSample.auspiciousnessScore}%.)`;

    return {
      intent,
      intentLabel: rule.label,
      evaluatedQuery,
      verdict: `Optimal ${rule.label} window identified for ${params.location.cityName || 'your location'} on ${bestCandidate.dayName} (${bestCandidate.tithi}, ${bestCandidate.nakshatra} Nakshatra) with a genuine ${bestCandidate.rawScore}% auspiciousness alignment.${synastryNote}${currentNote}`,
      score: bestCandidate.rawScore,
      currentInstantScore: curSample.auspiciousnessScore,
      bestWindow,
      bestDate: bestCandidate.date,
      advice: rule.advice,
      mitigation: rule.mitigation
    };
  }
}
