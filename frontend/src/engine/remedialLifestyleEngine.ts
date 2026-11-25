/**
 * @license
 * MIT License
 *
 * Remedial Lifestyle & Shastric Guidance Engine
 * 1. Vaara + Active Planetary Hora + Natal Lagna Trikona-Safe Gemstone Synthesis.
 * 2. Complete Actionable Guidance (Do's, Don'ts, Classical Emergency Mitigations) across:
 *    - All 8 Solar/Lunar Kaalas (including Wednesday Abhijit cancellation & distinct Amrit Kaal)
 *    - All 7 Choghadiya natures
 *    - All 7 Planetary Horas (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn)
 * 3. Dynamic Shastric Footwear Comparative Matrix (Sports vs Leather vs Wooden Paduka vs Canvas).
 */

import { SIGN_LORDS } from './astroMath';

export interface PlanetaryRemedialGuidance {
  planetName: string;
  sanskritName: string;
  primaryColors: string[];
  colorsToAvoid: string[];
  fabricsAndAttire: string;
  metals: string[];
  gemstone: string;
  alternativeGemstones: string[];
  gemstoneSafetyNote?: string;
  horaTacticalAccent?: string;
  footwearGuidance: {
    recommendedType: 'SPORTS' | 'LEATHER' | 'WOODEN_PADUKA_OR_BAREFOOT' | 'CANVAS_CASUAL';
    summary: string;
    leatherSuitability: string;
    sportsShoeSuitability: string;
    woodenPadukaSuitability: string;
  };
  spiritualMantra: string;
  donationCharity: string;
}

export interface WindowActionGuidance {
  windowType:
    | 'RAHU_KAAL'
    | 'YAMAGHANTA'
    | 'GULIKA_KAAL'
    | 'ABHIJIT'
    | 'ABHIJIT_WEDNESDAY_CANCELLED'
    | 'BRAHMA_MUHURTA'
    | 'AMRIT_KAAL'
    | 'VIJAYA_MUHURTA'
    | 'GODHULI'
    | 'SHUBH_CHOGHADIYA'
    | 'LABH_CHOGHADIYA'
    | 'AMRIT_CHOGHADIYA'
    | 'CHAR_CHOGHADIYA'
    | 'ROG_CHOGHADIYA'
    | 'KAAL_CHOGHADIYA'
    | 'UDVEG_CHOGHADIYA'
    | 'PLANETARY_HORA'
    | 'GENERAL_BENEFIC';
  title: string;
  auspiciousness: 'AUSPICIOUS' | 'INAUSPICIOUS' | 'NEUTRAL';
  recommendedActions: string[];
  prohibitedActions: string[];
  emergencyMitigation: string;
}

export class RemedialLifestyleEngine {
  private static PLANETARY_GUIDE: Record<string, PlanetaryRemedialGuidance> = {
    Sun: {
      planetName: 'Sun',
      sanskritName: 'Surya',
      primaryColors: ['Ruby Red', 'Bright Saffron', 'Deep Gold', 'Copper Orange'],
      colorsToAvoid: ['Black', 'Dark Navy', 'Dull Charcoal'],
      fabricsAndAttire: 'Crisp pure cotton, raw silk, formal dignified silhouettes. Sharp collars, clean cuts, and vibrant solar elegance.',
      metals: ['Pure Copper (Tamra)', '24K Yellow Gold'],
      gemstone: 'Ruby (Manikya)',
      alternativeGemstones: ['Red Garnet', 'Spinel', 'Sunstone'],
      footwearGuidance: {
        recommendedType: 'CANVAS_CASUAL',
        summary: 'Opt for clean, dignified footwear in warm tones or neutral tan. Avoid dusty or scuffed shoes.',
        leatherSuitability: 'Clean brown, tan, or oxblood formal footwear acceptable for civic duty and leadership roles. Avoid black leather.',
        sportsShoeSuitability: 'Bright running trainers suitable for sunrise outdoor exercise and active work.',
        woodenPadukaSuitability: 'Ideal for morning Surya Namaskar, Gayatri prayer, and offering Arghya to the rising Sun.'
      },
      spiritualMantra: 'Om Hram Hreem Hroum Sah Suryaya Namaha',
      donationCharity: 'Wheat, jaggery (gur), copper vessel, or red flowers to teachers or temples.'
    },
    Moon: {
      planetName: 'Moon',
      sanskritName: 'Chandra',
      primaryColors: ['Pearl White', 'Cream', 'Silvery Grey', 'Pale Ivory'],
      colorsToAvoid: ['Fiery Crimson', 'Aggressive Neon Orange', 'Pitch Black'],
      fabricsAndAttire: 'Breathable lightweight linen, pure white mulmul, comfortable flowing silhouettes promoting mental tranquility.',
      metals: ['Pure Silver (Chandi)', 'White Gold'],
      gemstone: 'Natural Pearl (Moti)',
      alternativeGemstones: ['Moonstone', 'White Coral', 'Cultured Pearl'],
      footwearGuidance: {
        recommendedType: 'CANVAS_CASUAL',
        summary: 'Prioritize soft, breathable slip-ons or light loafers that soothe the nervous system.',
        leatherSuitability: 'Avoid heavy industrial leather. Soft light-toned vegan or cruelty-free loafers preferred.',
        sportsShoeSuitability: 'Cushioned walking sneakers in white or pastel colors are optimal for evening strolls.',
        woodenPadukaSuitability: 'Highly auspicious during evening Shiva puja, meditation, and calm home reflection.'
      },
      spiritualMantra: 'Om Shram Shreem Shroum Sah Chandraya Namaha',
      donationCharity: 'Milk, rice, white camphor, silver coin, or sweet curd.'
    },
    Mars: {
      planetName: 'Mars',
      sanskritName: 'Mangala',
      primaryColors: ['Coral Red', 'Scarlet', 'Crimson', 'Terracotta'],
      colorsToAvoid: ['Sea Green', 'Pastel Teal', 'Dull Grey'],
      fabricsAndAttire: 'Durable structured clothing, active sportswear, tailored jackets. Inspires valor, decisiveness, and vitality.',
      metals: ['Copper', 'Red Brass', 'Panchadhatu'],
      gemstone: 'Red Coral (Moonga)',
      alternativeGemstones: ['Carnelian', 'Red Jasper'],
      footwearGuidance: {
        recommendedType: 'SPORTS',
        summary: 'Mars governs kinetic athleticism. High-support athletic trainers and rugged boots resonate with martial vigor.',
        leatherSuitability: 'Tough, functional protective boots for fieldwork; avoid delicate formal shoes.',
        sportsShoeSuitability: 'Prime choice: High-performance sports shoes and running footwear channel Agni (fire) productively.',
        woodenPadukaSuitability: 'Wooden paduka worn during Hanuman Chalisa recitation grounds excess fiery restlessness.'
      },
      spiritualMantra: 'Om Kram Kreem Kroum Sah Bhaumaya Namaha',
      donationCharity: 'Red lentils (masoor dal), jaggery sweets, copper coins, or voluntary blood donation.'
    },
    Mercury: {
      planetName: 'Mercury',
      sanskritName: 'Budha',
      primaryColors: ['Emerald Green', 'Parakeet Green', 'Mint', 'Pastel Turquoise'],
      colorsToAvoid: ['Dark Murky Red', 'Heavy Rust'],
      fabricsAndAttire: 'Crisp smart casuals, modern clean cuts, light poplin or bamboo fabric. Intellect-enhancing style.',
      metals: ['Bronze (Kansa)', 'Brass', 'Green Gold'],
      gemstone: 'Emerald (Panna)',
      alternativeGemstones: ['Peridot', 'Green Tourmaline', 'Tsavorite'],
      footwearGuidance: {
        recommendedType: 'CANVAS_CASUAL',
        summary: 'Lightweight sneakers, driving loafers, or minimalist canvas shoes reflecting commercial agility.',
        leatherSuitability: 'Smart suede or polished loafers suitable for meetings and contract negotiations.',
        sportsShoeSuitability: 'Light agile sneakers ideal for commuting, active brainstorming, and office mobility.',
        woodenPadukaSuitability: 'Used during study sessions, Saraswati vandana, and focused contemplation.'
      },
      spiritualMantra: 'Om Bram Breem Broum Sah Budhaya Namaha',
      donationCharity: 'Green moong dal, green vegetables, educational books, or feeding green grass to cows (Go-Seva).'
    },
    Jupiter: {
      planetName: 'Jupiter',
      sanskritName: 'Guru',
      primaryColors: ['Turmeric Yellow', 'Canary Yellow', 'Mustard Gold', 'Warm Saffron'],
      colorsToAvoid: ['Cold Midnight Black', 'Drab Charcoal'],
      fabricsAndAttire: 'Dignified silk, handwoven khadi, elegant kurtas, suits, or sarees reflecting wisdom and auspicious abundance.',
      metals: ['22K/24K Yellow Gold', 'Pure Brass (Pital)'],
      gemstone: 'Yellow Sapphire (Pukhraj)',
      alternativeGemstones: ['Citrine (Sunela)', 'Yellow Topaz', 'Heliodor'],
      footwearGuidance: {
        recommendedType: 'WOODEN_PADUKA_OR_BAREFOOT',
        summary: 'Jupiter represents Guru and Sattva. Wooden Paduka or clean barefoot grounding honors spiritual sanctity.',
        leatherSuitability: 'Shastric caution: Avoid animal leather during religious ceremonies, learning, or temple visits.',
        sportsShoeSuitability: 'Ergonomic walking shoes in warm neutral tones for daily walks and travel.',
        woodenPadukaSuitability: 'Supreme recommendation: Handcrafted wooden Paduka preserves spiritual Ojas and stimulates sole meridians.'
      },
      spiritualMantra: 'Om Gram Greem Groum Sah Gurave Namaha',
      donationCharity: 'Chana dal (Bengal gram), turmeric, yellow sweets, saffron, or scholarly books.'
    },
    Venus: {
      planetName: 'Venus',
      sanskritName: 'Shukra',
      primaryColors: ['Radiant Snow White', 'Pastel Pink', 'Soft Lavender', 'Shimmering Silver'],
      colorsToAvoid: ['Muddy Brown', 'Faded Drab Olive'],
      fabricsAndAttire: 'Fine mulberry silk, satin, soft cotton, delicately scented garments (natural rose or sandalwood attar).',
      metals: ['Pure Silver', 'Platinum', 'White Gold'],
      gemstone: 'Diamond / White Sapphire',
      alternativeGemstones: ['White Zircon', 'Natural Opal', 'Clear Quartz'],
      footwearGuidance: {
        recommendedType: 'CANVAS_CASUAL',
        summary: 'Finely crafted, immaculate footwear with refined aesthetics—Venus governs grace and harmony.',
        leatherSuitability: 'Polished dress shoes or vegan-leather sandals for social galas and proposals.',
        sportsShoeSuitability: 'Clean minimalist white lifestyle sneakers.',
        woodenPadukaSuitability: 'Ideal for Lakshmi Puja, music/artistic sadhana, and domestic serenity.'
      },
      spiritualMantra: 'Om Dram Dreem Droum Sah Shukraya Namaha',
      donationCharity: 'Pure cow ghee, white sweets (Kheer), fragrant incense, or white garments.'
    },
    Saturn: {
      planetName: 'Saturn',
      sanskritName: 'Shani',
      primaryColors: ['Midnight Navy', 'Charcoal Grey', 'Deep Indigo', 'Slate Blue'],
      colorsToAvoid: ['Fiery Scarlet Red', 'Bright Neon Orange'],
      fabricsAndAttire: 'Durable denim, raw handloom cotton, understated disciplined workwear.',
      metals: ['Iron (Loha)', 'Stainless Steel', 'Panchadhatu'],
      gemstone: 'Amethyst (Jamuniya) / Blue Topaz (Safe Upratna)',
      alternativeGemstones: ['Iolite (Neeli)', 'Lapis Lazuli (Blue Sapphire ONLY if Saturn is Lagna Yogakaraka)'],
      footwearGuidance: {
        recommendedType: 'LEATHER',
        summary: 'Saturn governs the feet and endurance. Sturdy protective footwear supports long duty hours.',
        leatherSuitability: 'Durable work shoes resonate with Saturnian endurance, BUT avoid purchasing new leather shoes on Saturdays or during Rahu Kaal.',
        sportsShoeSuitability: 'Rugged all-weather cross-trainers with solid rubber tread for endurance.',
        woodenPadukaSuitability: 'Mandatory switch: Remove all leather strictly outside temples, Shani/Hanuman shrines, and puja rooms; use bare feet or wooden Paduka.'
      },
      spiritualMantra: 'Om Sham Shanaishcharaya Namaha',
      donationCharity: 'Black sesame seeds (til), mustard oil, dark blankets, or sturdy footwear to laborers.'
    }
  };

  public static getPlanetaryGuidance(planetName: string): PlanetaryRemedialGuidance {
    const target = (planetName || 'Jupiter').replace(/\s*Hora$/i, '').trim();
    const key = Object.keys(this.PLANETARY_GUIDE).find(
      k => k.toLowerCase() === target.toLowerCase()
    ) || 'Jupiter';
    return this.PLANETARY_GUIDE[key];
  }

  public static getDayLordGuidance(dayOfWeek: number): PlanetaryRemedialGuidance {
    const lords = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const safeIdx = (typeof dayOfWeek === 'number' && !isNaN(dayOfWeek)) ? Math.abs(Math.floor(dayOfWeek)) % 7 : 0;
    return this.getPlanetaryGuidance(lords[safeIdx]);
  }

  /**
   * 3-Layer Dynamic Synthesis: Vaara Day Lord + Active Planetary Hora + Natal Lagna Trikona Gemstone Filter
   */
  public static getSynthesizedLifestyleGuidance(params: {
    dayIndex: number;
    activeHoraPlanet?: string;
    natalAscendantSignIndex?: number;
    isUniversalMode?: boolean;
    isRahuKaalActive?: boolean;
  }): PlanetaryRemedialGuidance {
    const base = this.getDayLordGuidance(params.dayIndex);
    const horaGuide = params.activeHoraPlanet ? this.getPlanetaryGuidance(params.activeHoraPlanet) : base;

    const horaTacticalAccent = `Active ${horaGuide.planetName} (${horaGuide.sanskritName}) Hora Accent: Pair today's ${base.primaryColors[0]} attire with a ${horaGuide.primaryColors[0]} accessory/pocket-square or ${horaGuide.metals[0]}. ${
      params.isRahuKaalActive
        ? '⚠️ Rahu Kaal is currently active: avoid buying new clothes, jewelry, or leather footwear until this window passes.'
        : `Footwear shift for this hour: ${horaGuide.footwearGuidance.summary}`
    }`;

    // Natal Lagna Trikona (1st, 5th, 9th house) Safe Gemstone Filter — never blindly prescribe Saturn Neelam!
    if (!params.isUniversalMode && typeof params.natalAscendantSignIndex === 'number') {
      const asc = ((params.natalAscendantSignIndex % 12) + 12) % 12;
      const lagnaLord = SIGN_LORDS[asc];
      const fifthLord = SIGN_LORDS[(asc + 4) % 12];
      const ninthLord = SIGN_LORDS[(asc + 8) % 12];
      const trikonaLords = [lagnaLord, fifthLord, ninthLord];

      if (trikonaLords.includes(base.planetName)) {
        return {
          ...base,
          horaTacticalAccent,
          gemstoneSafetyNote: `✓ Natal Harmony Verified: ${base.planetName} rules a benefic Trikona (1st/5th/9th) house for your Lagna—${base.gemstone} and ${base.alternativeGemstones[0]} are NATALLY SAFE.`
        };
      }

      const lagnaGuide = this.getPlanetaryGuidance(lagnaLord);
      const ninthGuide = this.getPlanetaryGuidance(ninthLord);
      return {
        ...base,
        gemstone: `${lagnaGuide.gemstone} (Your Lagna Ratna) or ${base.alternativeGemstones[0]} (Mild Upratna)`,
        horaTacticalAccent,
        gemstoneSafetyNote: `🛡️ Shastric Natal Protection: Today's Vaara Lord (${base.planetName}) is not a Trikona lord for your Lagna. Wear today's colors (${base.primaryColors.slice(0, 2).join(', ')}) freely, but prefer your natal Lagna/Bhagya stones (${lagnaGuide.gemstone}, ${ninthGuide.gemstone}) over heavy primary ${base.planetName} ratnas.`
      };
    }

    return {
      ...base,
      horaTacticalAccent,
      gemstoneSafetyNote: '🌍 Universal Mode Reference: Gentle Upratnas (Citrine, Moonstone, Peridot, Amethyst) are safe universally; personalize your profile above before wearing primary Maharatnas.'
    };
  }

  /**
   * Generates actionable Do's, Don'ts, and Classical Emergency Mitigations across
   * all 8 Kaalas (with Wednesday Abhijit rule), all 7 Choghadiyas, and all 7 Planetary Horas.
   */
  public static getWindowActionGuidance(windowName: string, isWednesday: boolean = false): WindowActionGuidance {
    const norm = (windowName || '').trim().toUpperCase();

    if (norm.includes('RAHU')) {
      return {
        windowType: 'RAHU_KAAL',
        title: 'Rahu Kaalam (Inauspicious Shadow Period of Rahu)',
        auspiciousness: 'INAUSPICIOUS',
        recommendedActions: [
          'Routine maintenance, debugging, auditing, and clearing pending backlogs.',
          'Pranayama, silent meditation, and chanting Durga or Shiva mantras.',
          'Charitable donations and organizing existing workspaces.'
        ],
        prohibitedActions: [
          'Signing new contracts, property deeds, or financial commitments.',
          'Initiating journeys, product launches, or inaugural ceremonies.',
          'Purchasing gold, vehicles, or new leather footwear.'
        ],
        emergencyMitigation: 'If urgent action cannot be delayed during Rahu Kaal: Take a spoonful of sweet curd or jaggery with water, pause for 3 calm breaths facing East, mentally recite Gayatri or Maha Mrityunjaya Mantra 3 times, and step forward with the right foot.'
      };
    }

    if (norm.includes('YAMA')) {
      return {
        windowType: 'YAMAGHANTA',
        title: 'Yamaghantam (Cautionary Period of Yama)',
        auspiciousness: 'INAUSPICIOUS',
        recommendedActions: [
          'Quiet introspection, ancestral remembrance (Tarpan), and disciplined review.',
          'Rest, recovery, detox routines, and concluding old obligations.'
        ],
        prohibitedActions: [
          'Commencing long-distance travel (especially Southward).',
          'Opening new retail storefronts or initiating elective surgeries.',
          'Extending loans or borrowing capital.'
        ],
        emergencyMitigation: 'If travel or urgent commitment cannot be postponed: Face North for 2 minutes, chew a green cardamom pod or clove, offer silent salutations to Lord Shiva, and donate a coin before departing.'
      };
    }

    if (norm.includes('GULIKA')) {
      return {
        windowType: 'GULIKA_KAAL',
        title: 'Gulika Kaalam (Period of Constructive Repetition)',
        auspiciousness: 'NEUTRAL',
        recommendedActions: [
          'Actions you wish to repeat & compound: Investing into savings/SIPs, buying gold, planting trees, acquiring knowledge.',
          'Starting disciplined fitness, study, and meditation habits.'
        ],
        prohibitedActions: [
          'Taking debt/loans, litigation, or surgeries (avoid actions you never want repeated).',
          'Funeral or mourning rites.'
        ],
        emergencyMitigation: 'Remember Lord Vishnu, maintain calm speech, and channel Gulika strictly toward wealth accumulation or learning.'
      };
    }

    if (norm.includes('ABHIJIT')) {
      if (isWednesday) {
        return {
          windowType: 'ABHIJIT_WEDNESDAY_CANCELLED',
          title: 'Abhijit Muhurta — Cancelled Today (Wednesday Midday Rahu Overlap)',
          auspiciousness: 'INAUSPICIOUS',
          recommendedActions: [
            'Defer major contract signings and southward departures until after Wednesday Rahu Kaalam.',
            'Use midday strictly for internal review, preparation, and routine desk work.',
            'Switch to Vijaya Muhurta or a benefic Jupiter/Mercury Hora outside Rahu Kaalam.'
          ],
          prohibitedActions: [
            'Do NOT treat Wednesday midday as auspicious Abhijit—classical Muhurta Chintamani cancels Abhijit on Wednesdays because it collides with the 5th-octant Rahu Kaalam.',
            'Avoid southward travel, new investments, and inaugural ceremonies.'
          ],
          emergencyMitigation: 'Wait until Rahu Kaalam ends (~01:30 PM local) or use afternoon Vijaya Muhurta. If forced to attend a scheduled midday meeting, consume tulsi/green moong or sweet curd beforehand and invoke Lord Narayana.'
        };
      }
      return {
        windowType: 'ABHIJIT',
        title: 'Abhijit Muhurta (The Supreme Victorious Midday Window)',
        auspiciousness: 'AUSPICIOUS',
        recommendedActions: [
          'Signing major contracts, launching ventures, and high-stakes client pitches.',
          'Purchasing property, precious metals, or vehicles.',
          'Executive interviews, investor meetings, and important departures.'
        ],
        prohibitedActions: [
          'Avoid deceitful or harsh speech—conduct all agreements ethically.'
        ],
        emergencyMitigation: 'Shastric aphorism: "Abhijit sarva-dosha-ghnam"—Abhijit naturally neutralizes minor transit afflictions. Invoke Lord Narayana and proceed with confidence.'
      };
    }

    if (norm.includes('BRAHMA')) {
      return {
        windowType: 'BRAHMA_MUHURTA',
        title: 'Brahma Muhurta (The Creator’s Ambrosial Pre-Dawn Hour)',
        auspiciousness: 'AUSPICIOUS',
        recommendedActions: [
          'Deep meditation, Yoga Asanas, Pranayama, and mantra japa.',
          'Strategic architecture, study, research, and creative writing.',
          'Setting clear life intentions in pure Sattvic stillness.'
        ],
        prohibitedActions: [
          'Heavy meals, arguments, or doom-scrolling immediately upon waking.'
        ],
        emergencyMitigation: 'If on night/shift schedule, dedicate your first 10 waking minutes to hydration and silent breath awareness.'
      };
    }

    if (norm.includes('VIJAY')) {
      return {
        windowType: 'VIJAYA_MUHURTA',
        title: 'Vijaya Muhurta (The Afternoon Conqueror’s Window)',
        auspiciousness: 'AUSPICIOUS',
        recommendedActions: [
          'Job interviews, negotiations, legal filings, and competitive presentations.',
          'Closing commercial deals and overcoming operational bottlenecks.'
        ],
        prohibitedActions: [
          'Unethical shortcuts or impulsive confrontation.'
        ],
        emergencyMitigation: 'Naturally victorious window—pause for 3 calm breaths and visualize a fair, mutually prosperous outcome.'
      };
    }

    if (norm.includes('GODHULI')) {
      return {
        windowType: 'GODHULI',
        title: 'Godhuli Bela (Sacred Sunset Sandhya Window)',
        auspiciousness: 'AUSPICIOUS',
        recommendedActions: [
          'Lighting the evening ghee diya, Sandhya vandana, Aarti, and family harmony.',
          'Welcoming guests, ceremonial auspicious gatherings, and gratitude reflection.'
        ],
        prohibitedActions: [
          'Sleeping at sunset twilight or lending cash across the threshold at dusk.'
        ],
        emergencyMitigation: 'Light a brass or clay lamp at the home/office altar to uplift Sandhya vibrations.'
      };
    }

    if (norm.includes('AMRIT KAAL') || norm === 'AMRIT_KAAL') {
      return {
        windowType: 'AMRIT_KAAL',
        title: 'Lunar Amrit Kaal (Nakshatra Nectar Ghati Window)',
        auspiciousness: 'AUSPICIOUS',
        recommendedActions: [
          'Beginning wellness regimens, administering medicines, and holistic healing.',
          'Purchasing ornaments, initiating savings, and harmonious family decisions.',
          'Long-term education, spiritual initiation, and creative launches.'
        ],
        prohibitedActions: [
          'Check that Rahu Kaalam does not overlap on your chosen weekday before signing legal deeds.'
        ],
        emergencyMitigation: 'Blessed lunar nectar span—begin with gratitude and clean Sankalpa (intention).'
      };
    }

    // 7 Planetary Horas (24 Daily Spans)
    if (norm.includes('HORA')) {
      if (norm.includes('JUPITER') || norm.includes('GURU')) {
        return {
          windowType: 'PLANETARY_HORA',
          title: 'Jupiter (Guru) Hora — Supreme Wisdom, Wealth & Expansion',
          auspiciousness: 'AUSPICIOUS',
          recommendedActions: ['Treasury & banking decisions, property deeds, marriages, higher education, and mentorship.', 'Signing long-term institutional partnerships and dharmic initiatives.'],
          prohibitedActions: ['Dishonesty, disrespect toward elders/mentors, or reckless debt.'],
          emergencyMitigation: 'Highly benefic planetary hour. Wear/carry a touch of yellow or gold and proceed ethically.'
        };
      }
      if (norm.includes('VENUS') || norm.includes('SHUKRA')) {
        return {
          windowType: 'PLANETARY_HORA',
          title: 'Venus (Shukra) Hora — Harmony, Proposals, Luxury & Diplomacy',
          auspiciousness: 'AUSPICIOUS',
          recommendedActions: ['Marriage proposals, romantic conversations, diplomatic peace-making, and creative design.', 'Buying vehicles, apparel, jewelry, art, or home decor.'],
          prohibitedActions: ['Harsh arguments or coarse speech.'],
          emergencyMitigation: 'Benefic hour for relationship warmth and aesthetic ventures.'
        };
      }
      if (norm.includes('MERCURY') || norm.includes('BUDHA')) {
        return {
          windowType: 'PLANETARY_HORA',
          title: 'Mercury (Budha) Hora — Commerce, Trading, Coding & Contracts',
          auspiciousness: 'AUSPICIOUS',
          recommendedActions: ['Stock/financial analysis, software releases, contract drafting, interviews, and exams.', 'Commercial negotiations, accounting, and publishing.'],
          prohibitedActions: ['Signing unread fine print without verification.'],
          emergencyMitigation: 'Verify figures twice; Mercury rewards analytical clarity.'
        };
      }
      if (norm.includes('MOON') || norm.includes('CHANDRA')) {
        return {
          windowType: 'PLANETARY_HORA',
          title: 'Moon (Chandra) Hora — Public Goodwill, Travel & Hospitality',
          auspiciousness: 'AUSPICIOUS',
          recommendedActions: ['Customer-facing launches, food/hospitality, short travel, community building, and counseling.'],
          prohibitedActions: ['Making irreversible decisions while emotionally reactive.'],
          emergencyMitigation: 'Drink pure water and keep a calm, receptive mind.'
        };
      }
      if (norm.includes('SUN') || norm.includes('SURYA')) {
        return {
          windowType: 'PLANETARY_HORA',
          title: 'Sun (Surya) Hora — Executive Authority & Government Filings',
          auspiciousness: 'NEUTRAL',
          recommendedActions: ['Meeting senior officials, regulatory/government submissions, and leadership directives.'],
          prohibitedActions: ['Ego clashes, delicate romantic compromises, or housewarming (Griha Pravesh).'],
          emergencyMitigation: 'Lead with humility and transparency facing East.'
        };
      }
      if (norm.includes('MARS') || norm.includes('MANGAL')) {
        return {
          windowType: 'PLANETARY_HORA',
          title: 'Mars (Mangala) Hora — Technical Execution, Athletics & Courage',
          auspiciousness: 'INAUSPICIOUS',
          recommendedActions: ['Engineering/mechanical work, workouts, land/site inspection, and decisive problem-solving.'],
          prohibitedActions: ['Peace talks, marriage proposals, gentle partnerships, or impulsive road rage.'],
          emergencyMitigation: 'If negotiating during Mars Hora, speak slowly, sip cool water, and channel energy into constructive execution.'
        };
      }
      if (norm.includes('SATURN') || norm.includes('SHANI')) {
        return {
          windowType: 'PLANETARY_HORA',
          title: 'Saturn (Shani) Hora — Deep Audit, Discipline & Long-Term Infrastructure',
          auspiciousness: 'INAUSPICIOUS',
          recommendedActions: ['Code/financial audits, compliance, deep solo work, machinery maintenance, and decluttering.'],
          prohibitedActions: ['Fast-turnaround launches, weddings, borrowing money, or speculative trades.'],
          emergencyMitigation: 'Practice patience, double-check safety margins, and chant "Om Sham Shanaishcharaya Namaha" silently.'
        };
      }
    }

    if (norm.includes('AMRIT') || norm.includes('AMRITHAM')) {
      return {
        windowType: 'AMRIT_CHOGHADIYA',
        title: 'Amrit Choghadiya (Lunar Nectar Choghadiya)',
        auspiciousness: 'AUSPICIOUS',
        recommendedActions: [
          'Inaugurating stores, taking charge of key roles, proposing marriage, and purchasing gold.',
          'Signing enduring contracts and wellness milestones.'
        ],
        prohibitedActions: ['Wasteful arguments or procrastination.'],
        emergencyMitigation: 'Prime benefic Choghadiya (provided Rahu Kaalam does not overlap).'
      };
    }

    if (norm.includes('SHUBH')) {
      return {
        windowType: 'SHUBH_CHOGHADIYA',
        title: 'Shubh Choghadiya (Jovian Auspicious Prosperity Span)',
        auspiciousness: 'AUSPICIOUS',
        recommendedActions: [
          'Ceremonies, educational milestones, family agreements, and client proposals.'
        ],
        prohibitedActions: ['Careless or unethical shortcuts.'],
        emergencyMitigation: 'Benefic Jupiter-ruled Choghadiya.'
      };
    }

    if (norm.includes('LABH')) {
      return {
        windowType: 'LABH_CHOGHADIYA',
        title: 'Labh Choghadiya (Mercurial Commercial Gain Span)',
        auspiciousness: 'AUSPICIOUS',
        recommendedActions: [
          'Commercial transactions, trading, investor pitches, inventory orders, and revenue launches.'
        ],
        prohibitedActions: ['Uncalculated gambling without risk controls.'],
        emergencyMitigation: 'Strong commercial momentum—keep clear written records.'
      };
    }

    if (norm.includes('CHAR') || norm.includes('CHAL')) {
      return {
        windowType: 'CHAR_CHOGHADIYA',
        title: 'Char Choghadiya (Venusian Dynamic Mobility Span)',
        auspiciousness: 'AUSPICIOUS',
        recommendedActions: [
          'Journeys, vehicle delivery, logistics, relocations, and software deployments.'
        ],
        prohibitedActions: ['Prefer fixed (Shubh/Labh) windows for permanent foundation stones.'],
        emergencyMitigation: 'Inspect travel checklists and depart mindfully.'
      };
    }

    if (norm.includes('ROG')) {
      return {
        windowType: 'ROG_CHOGHADIYA',
        title: 'Rog Choghadiya (Martial Obstacle & Remediation Span)',
        auspiciousness: 'INAUSPICIOUS',
        recommendedActions: ['Medical checkups, pest/bug elimination, sanitization, and resolving technical debt.'],
        prohibitedActions: ['New commercial launches, partnerships, or celebratory ceremonies.'],
        emergencyMitigation: 'Sip warm water with tulsi/ginger and remember Lord Dhanvantari before urgent tasks.'
      };
    }

    if (norm === 'KAAL' || norm.startsWith('KAAL ') || norm.includes('KAAL CHOG')) {
      return {
        windowType: 'KAAL_CHOGHADIYA',
        title: 'Kaal Choghadiya (Saturnian Friction & Audit Span)',
        auspiciousness: 'INAUSPICIOUS',
        recommendedActions: ['Filing compliance/taxes, dismantling obsolete systems, and disciplined solo work.'],
        prohibitedActions: ['Signing new commercial alliances, taking loans, or hosting celebrations.'],
        emergencyMitigation: 'Practice patience, offer food to birds/stray animals, and avoid confrontation.'
      };
    }

    if (norm.includes('UDVEG')) {
      return {
        windowType: 'UDVEG_CHOGHADIYA',
        title: 'Udveg Choghadiya (Solar Agitation & Administrative Span)',
        auspiciousness: 'INAUSPICIOUS',
        recommendedActions: ['Routine government/administrative paperwork and physical exercise.'],
        prohibitedActions: ['Sensitive relationship talks or high-stakes negotiations.'],
        emergencyMitigation: 'Take 10 slow breaths, drink cool water, and defer emotional decisions.'
      };
    }

    return {
      windowType: 'GENERAL_BENEFIC',
      title: `${windowName} Guidance`,
      auspiciousness: 'NEUTRAL',
      recommendedActions: ['Conduct scheduled responsibilities with steady mindfulness and ethical clarity.'],
      prohibitedActions: ['Impulsive unverified commitments.'],
      emergencyMitigation: 'Center your breath and verify key details before proceeding.'
    };
  }

  public static getFootwearComparativeAnalysis() {
    return [
      {
        type: 'Sports / Athletic Footwear',
        governingPlanet: 'Mars (Mangala) & Sun (Surya)',
        element: 'Agni (Fire) & Vayu (Air)',
        idealScenarios: 'Outdoor commuting, active fieldwork, workouts, rapid errands, and kinetic productivity.',
        shastricSignificance: 'Enhances stamina, supports circulation, and channels Mars/Sun Hora energy constructively.',
        precaution: 'Never wear outdoor trainers inside puja rooms, dining mats, or temple sanctums.'
      },
      {
        type: 'Leather Footwear (Formal / Duty)',
        governingPlanet: 'Saturn (Shani) & Rahu',
        element: 'Prithvi (Earth) & Tamas (Endurance)',
        idealScenarios: 'Executive boardrooms, formal civic/industrial duty, and long standing hours.',
        shastricSignificance: 'Associated with Saturnian protection and material durability.',
        precaution: 'STRICTLY PROHIBITED in temples, shrines, and altars. Avoid buying new leather shoes on Saturdays or during Rahu Kaal.'
      },
      {
        type: 'Barefoot / Wooden Paduka (Khadau)',
        governingPlanet: 'Jupiter (Guru) & Venus (Shukra)',
        element: 'Akasha (Ether) & Sattva (Purity)',
        idealScenarios: 'Morning Puja, Brahma Muhurta meditation, scriptural study, meals, and temple worship.',
        shastricSignificance: 'Wood insulates spiritual Ojas/Prana during prayer and stimulates sole acupressure points.',
        precaution: 'Keep clean and oiled with natural sandalwood or neem oil.'
      },
      {
        type: 'Canvas / Cruelty-Free Loafers',
        governingPlanet: 'Mercury (Budha) & Moon (Chandra)',
        element: 'Jala (Water) & Prithvi (Earth)',
        idealScenarios: 'Daily office casuals, commercial meetings, travel, and creative collaboration.',
        shastricSignificance: 'Supports Ahimsa (non-harm), mental lightness, and Mercurial agility.',
        precaution: 'Keep fabric clean, dry, and well-maintained.'
      }
    ];
  }
}
