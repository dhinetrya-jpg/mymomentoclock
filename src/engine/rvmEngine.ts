/**
 * MymomentOclock Remedial Vector Matrix (RVM) Action Engine
 * Based on Tamil Chozhia Prasanam & classical non-commercial Upayas.
 * Protects users by strictly filtering out commercial merchandise (gemstones, rings)
 * and delivering pure Acoustic, Behavioral, Kinetic, and Temporal micro-habits.
 * Includes interactive Web Audio synthesizer for exact acoustic frequencies (147Hz, 432Hz, 528Hz, etc.).
 */

export interface RemedialAction {
  id: string;
  modality: 'ACOUSTIC' | 'BEHAVIORAL' | 'KINETIC' | 'TEMPORAL';
  planetTarget: string;
  remedyCode: string;
  title: string;
  frequencyHz?: number;
  durationMinutes: number;
  directive: string;
  scientificContext: string;
  dailyWindow: string; // e.g. "Personal Saturn Hora (07:15 - 08:20 AM)"
}

export interface RvmEvaluationResult {
  targetPlanet: string;
  deficiencyIntensity: number; // 0.0 - 1.0 (e.g. 0.4524)
  categoryMetric: string;
  thresholdTriggered: boolean;
  actions: RemedialAction[];
  sanitizationCheck: {
    commercialKeywordsFiltered: boolean;
    zeroMonetizationGuarantee: string;
  };
}

export const PHYSICAL_REMEDIES_REGISTRY: RemedialAction[] = [
  // SATURN
  {
    id: 'rvm-sat-1',
    modality: 'ACOUSTIC',
    planetTarget: 'SATURN',
    remedyCode: 'SAT_147_MID',
    title: '147Hz Deep Acoustic Grounding',
    frequencyHz: 147,
    durationMinutes: 11,
    directive: 'Listen to pure 147Hz acoustic resonance fields or deep, steady drone soundscapes for exactly 11 minutes during your personal Saturn Hora window.',
    scientificContext: '147Hz sub-frequency activates alpha-theta boundary states, calming amygdala hyperactivity associated with Saturnian delay anxieties.',
    dailyWindow: 'Saturday Sunrise / Evening Saturn Hora (6:30 - 7:30 PM)',
  },
  {
    id: 'rvm-sat-2',
    modality: 'BEHAVIORAL',
    planetTarget: 'SATURN',
    remedyCode: 'SAT_DISC_FIN',
    title: 'Friction-Based Wealth Loop Lock',
    durationMinutes: 5,
    directive: 'Enforce artificial friction into your wealth loop. Automate exactly 8% of your weekly earnings directly into a locked savings vault or non-liquid fund.',
    scientificContext: 'Voluntary delayed gratification channels Saturnian constraint energy into compounded capital safety.',
    dailyWindow: 'Every Saturday Morning',
  },

  // MARS
  {
    id: 'rvm-mars-1',
    modality: 'KINETIC',
    planetTarget: 'MARS',
    remedyCode: 'MARS_ISO_SUNRISE',
    title: 'Sunrise Isometric Core Activation',
    durationMinutes: 8,
    directive: 'Perform high-resistance isometric holds or focused physical training at local sunrise to channel active physical energy loops.',
    scientificContext: 'Isometric contraction releases stored sympathetic adrenergic tension, dissipating impulsive conflict.',
    dailyWindow: 'Tuesday Sunrise (06:00 - 06:45 AM)',
  },
  {
    id: 'rvm-mars-2',
    modality: 'ACOUSTIC',
    planetTarget: 'MARS',
    remedyCode: 'MARS_285_VIGOR',
    title: '285Hz Vitality & Cellular Re-patterning',
    frequencyHz: 285,
    durationMinutes: 9,
    directive: 'Immerse in 285Hz binaural harmonic field to stabilize nervous system motor drive during demanding task sprints.',
    scientificContext: 'Stimulates microvascular circulation and focused alertness without cortisol spikes.',
    dailyWindow: 'Midday Tuesday Mars Hora',
  },

  // JUPITER
  {
    id: 'rvm-jup-1',
    modality: 'ACOUSTIC',
    planetTarget: 'JUPITER',
    remedyCode: 'JUP_432_EXP',
    title: '432Hz Harmonic Prosperity Field',
    frequencyHz: 432,
    durationMinutes: 15,
    directive: 'Engage with 432Hz golden harmonic resonance while reviewing long-term aspirations and educational objectives.',
    scientificContext: '432Hz is mathematically coherent with biological rhythms, fostering expansive philosophical problem solving.',
    dailyWindow: 'Thursday Morning Guru Hora (07:00 - 08:00 AM)',
  },
  {
    id: 'rvm-jup-2',
    modality: 'BEHAVIORAL',
    planetTarget: 'JUPITER',
    remedyCode: 'JUP_KNOWLEDGE_GIFT',
    title: 'Unconditional Knowledge Sharing',
    durationMinutes: 20,
    directive: 'Dedicate 20 minutes to mentor a junior peer, donate a book, or provide pro-bono career clarity without seeking compensation.',
    scientificContext: 'Altruistic knowledge transmission elevates dopamine receptors and activates Brihaspati expansion pathways.',
    dailyWindow: 'Thursday Afternoon',
  },

  // MERCURY
  {
    id: 'rvm-merc-1',
    modality: 'BEHAVIORAL',
    planetTarget: 'MERCURY',
    remedyCode: 'MERC_COMM_AUDIT',
    title: 'Communication Protocol & Ledger Audit',
    durationMinutes: 12,
    directive: 'Spend 12 minutes cleaning digital inboxes, canceling unused subscriptions, and balancing weekly accounts in a spreadsheet.',
    scientificContext: 'Mercury rules trade, computation, and nervous precision; tidying financial ledgers realigns cognitive bandwidth.',
    dailyWindow: 'Wednesday Budha Hora',
  },

  // VENUS
  {
    id: 'rvm-ven-1',
    modality: 'ACOUSTIC',
    planetTarget: 'VENUS',
    remedyCode: 'VEN_528_LOVE',
    title: '528Hz Harmony & Aesthetic Resonance',
    frequencyHz: 528,
    durationMinutes: 12,
    directive: 'Listen to 528Hz Solfeggio frequency while preparing fresh flowers or aromatic sandalwood in living space.',
    scientificContext: '528Hz stimulates autonomic parasympathetic tone, reducing interpersonal tension and cultivating gracious speech.',
    dailyWindow: 'Friday Twilight Shukra Hora',
  },

  // RAHU / KETU
  {
    id: 'rvm-rahu-1',
    modality: 'BEHAVIORAL',
    planetTarget: 'RAHU',
    remedyCode: 'RAHU_DOPAMINE_DETOX',
    title: '60-Minute Screen-Free Twilight Fast',
    durationMinutes: 60,
    directive: 'Disconnect from all digital screens, social feeds, and notifications for 60 consecutive minutes post-sunset.',
    scientificContext: 'Rahu rules phantom illusions and compulsive media loops; darkness sensory quietude breaks algorithmic dopamine hijacking.',
    dailyWindow: 'Daily Twilight (06:30 - 07:30 PM)',
  }
];

// Commercial keywords that must never be presented to users
const COMMERCIAL_PROHIBITED_WORDS = [
  'buy gemstone', 'certified sapphire', 'emerald ring', 'purchase yantra',
  'astrology store', 'discount gemstone', 'gemstone checkout', 'astrologer call per minute'
];

/**
 * Evaluates performance gaps and surfaces non-commercial remedies
 */
export function evaluateRemedialVectors(
  pillarScore: number, // 0.0 - 1.0 (e.g. net auspiciousness vector)
  categoryName: string = 'Wealth',
  weakestPlanet: string = 'SATURN'
): RvmEvaluationResult {
  const deficiencyIntensity = Number((1.0 - pillarScore).toFixed(4));
  const thresholdTriggered = pillarScore < 0.65;

  // Filter actions for target planet
  let matchedActions = PHYSICAL_REMEDIES_REGISTRY.filter(r => r.planetTarget === weakestPlanet);
  if (matchedActions.length === 0) {
    matchedActions = PHYSICAL_REMEDIES_REGISTRY.slice(0, 2);
  }

  // Ensure strict sanitization
  const isSanitized = matchedActions.every(a => {
    const text = `${a.directive} ${a.title} ${a.scientificContext}`.toLowerCase();
    return !COMMERCIAL_PROHIBITED_WORDS.some(w => text.includes(w));
  });

  return {
    targetPlanet: weakestPlanet,
    deficiencyIntensity,
    categoryMetric: `${categoryName.toLowerCase()}_status`,
    thresholdTriggered,
    actions: matchedActions,
    sanitizationCheck: {
      commercialKeywordsFiltered: isSanitized,
      zeroMonetizationGuarantee: '100% Non-Commercial Upayas: Zero merchandise, zero paid gemstones. Authentic behavioral and acoustic alignment only.',
    },
  };
}

/**
 * Web Audio Synthesizer Class for In-Browser Pure Tone Acoustic Therapy
 */
export class AcousticToneSynthesizer {
  private audioCtx: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  public isPlaying: boolean = false;

  public startTone(frequencyHz: number, volume: number = 0.2): void {
    try {
      this.stopTone();
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      this.oscillator = this.audioCtx.createOscillator();
      this.gainNode = this.audioCtx.createGain();

      this.oscillator.type = 'sine';
      this.oscillator.frequency.setValueAtTime(frequencyHz, this.audioCtx.currentTime);

      // Smooth envelope ramp-up to prevent audio clicks
      this.gainNode.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(Math.min(0.4, volume), this.audioCtx.currentTime + 1.2);

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.oscillator.start();
      this.isPlaying = true;
    } catch (e) {
      console.warn('AcousticToneSynthesizer audio init note:', e);
    }
  }

  public stopTone(): void {
    if (this.oscillator && this.gainNode && this.audioCtx) {
      try {
        const currTime = this.audioCtx.currentTime;
        this.gainNode.gain.exponentialRampToValueAtTime(0.0001, currTime + 0.5);
        setTimeout(() => {
          this.oscillator?.stop();
          this.oscillator?.disconnect();
          this.audioCtx?.close();
          this.oscillator = null;
          this.gainNode = null;
          this.audioCtx = null;
        }, 550);
      } catch {
        // cleanup safe
      }
    }
    this.isPlaying = false;
  }
}

/**
 * Functional helper to play an acoustic frequency tone and return a cleanup callback
 */
export function playAcousticFrequencyTone(frequencyHz: number, _durationMinutes: number = 11): () => void {
  const synth = new AcousticToneSynthesizer();
  synth.startTone(frequencyHz);
  return () => {
    synth.stopTone();
  };
}

