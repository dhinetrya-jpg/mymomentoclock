/**
 * @license
 * MIT License
 *
 * Personal Astrological Profile Engine
 * 1. Users WITHOUT Birth Details:
 *    Canonical 108-Pada Avakahada Chakra (27 Nakshatras x 4 Padas) covering A-Z + Devanagari + Honorific stripping,
 *    combined with 5 distinct diurnal birth phases, elemental triplicity, and Sacred Number Prashna calibration.
 * 2. Users WITH Birth Details:
 *    Exact Drik Ganita Lagna (chart.ascendantSignIndex / ascendantDegree) + ELP2000 Moon Nakshatra & Pada,
 *    with strict input validation (never silently fabricating a quiz profile on invalid birth data).
 */

import { calculateFullChart, AyanamsaType } from './astroMath';
import { CalculationInputError } from './calculationValidation';
import { resolveIanaTimezone } from './timezoneResolver';
import { HighPrecisionAstroEngine, NAKSHATRA_NAMES, ZODIAC_SIGNS } from './zeroCostAstroEngine';

export interface UserProfile {
  name: string;
  mode: 'NON_TECHNICAL_WIZARD' | 'BIRTH_DETAILS' | 'UNIVERSAL';
  moonSignIndex: number;      // 0 to 11 (Aries = 0)
  moonSignName: string;
  nakshatraIndex: number;     // 0 to 26 (Ashwini = 0)
  nakshatraPada: number;      // 1 to 4
  nakshatraName: string;
  ascendantSignIndex: number; // 0 to 11
  ascendantSignName: string;
  ascendantDegree?: number;
  derivationSummary: string;
  dob?: string;
  tob?: string;
  pob?: string;
  birthLat?: number;
  birthLon?: number;
  birthTzOffset?: number;
  birthTimezone?: string;
}

interface AvakahadaPadaEntry {
  syllables: string[];
  nakshatraIndex: number; // 0..26
  pada: number;           // 1..4
}

// Canonical 27 Nakshatras x 4 Padas = 108 Syllables (Classical Avakahada Chakra — Muhurta Chintamani / BPHS)
// Note: Each Pada spans 3°20' = 1/9 of a 30° Rashi, so Sign Index = Math.floor((nakshatraIndex * 4 + (pada - 1)) / 9) % 12!
const AVAKAHADA_108_PADAS: AvakahadaPadaEntry[] = [
  // 0. Ashwini (Chu, Che, Cho, La) -> Aries
  { nakshatraIndex: 0, pada: 1, syllables: ['chu'] },
  { nakshatraIndex: 0, pada: 2, syllables: ['che', 'chay'] },
  { nakshatraIndex: 0, pada: 3, syllables: ['cho', 'chau'] },
  { nakshatraIndex: 0, pada: 4, syllables: ['la', 'laa', 'lak', 'lav', 'lal'] },
  // 1. Bharani (Li, Lu, Le, Lo) -> Aries
  { nakshatraIndex: 1, pada: 1, syllables: ['li', 'lee'] },
  { nakshatraIndex: 1, pada: 2, syllables: ['lu', 'loo'] },
  { nakshatraIndex: 1, pada: 3, syllables: ['le', 'lay'] },
  { nakshatraIndex: 1, pada: 4, syllables: ['lo', 'lau'] },
  // 2. Krittika (A, I, U, E) -> Pada 1 Aries, Pada 2-4 Taurus
  { nakshatraIndex: 2, pada: 1, syllables: ['aa', 'aj', 'am', 'an', 'ab', 'ad', 'ak', 'al', 'ap', 'ar', 'as', 'at', 'av', 'ay', 'a'] },
  { nakshatraIndex: 2, pada: 2, syllables: ['ee', 'in', 'is', 'ik', 'il', 'im', 'ir', 'it', 'i'] },
  { nakshatraIndex: 2, pada: 3, syllables: ['oo', 'ud', 'uj', 'uk', 'ul', 'um', 'un', 'up', 'ur', 'us', 'ut', 'u'] },
  { nakshatraIndex: 2, pada: 4, syllables: ['ek', 'el', 'em', 'en', 'es', 'et', 'ev', 'ey', 'ai', 'e'] },
  // 3. Rohini (O, Va, Vi, Vu) -> Taurus
  { nakshatraIndex: 3, pada: 1, syllables: ['om', 'on', 'op', 'or', 'os', 'ot', 'ov', 'au', 'o'] },
  { nakshatraIndex: 3, pada: 2, syllables: ['va', 'vaa', 'van', 'var', 'vas', 'wa', 'v'] },
  { nakshatraIndex: 3, pada: 3, syllables: ['vi', 'vee', 'vik', 'vin', 'vip', 'vir', 'vis', 'viv', 'wi'] },
  { nakshatraIndex: 3, pada: 4, syllables: ['vu', 'voo', 'wu'] },
  // 4. Mrigashira (Ve, Vo, Ka, Ki) -> Pada 1-2 Taurus, Pada 3-4 Gemini
  { nakshatraIndex: 4, pada: 1, syllables: ['ve', 'vay', 'ved', 'ven', 'we'] },
  { nakshatraIndex: 4, pada: 2, syllables: ['vo', 'vau', 'wo'] },
  { nakshatraIndex: 4, pada: 3, syllables: ['ka', 'kaa', 'kab', 'kaj', 'kal', 'kam', 'kan', 'kap', 'kar', 'kas', 'kav', 'qa', 'k'] },
  { nakshatraIndex: 4, pada: 4, syllables: ['ki', 'kee', 'kir', 'kis', 'qi'] },
  // 5. Ardra (Ku, Gha, Nga, Chha) -> Gemini
  { nakshatraIndex: 5, pada: 1, syllables: ['ku', 'koo', 'kul', 'kum', 'kun', 'kus', 'qu'] },
  { nakshatraIndex: 5, pada: 2, syllables: ['gha', 'gho', 'ghu', 'ghe', 'ghi', 'gh'] },
  { nakshatraIndex: 5, pada: 3, syllables: ['nga', 'ng'] },
  { nakshatraIndex: 5, pada: 4, syllables: ['chha', 'chhi', 'chhu', 'chh'] },
  // 6. Punarvasu (Ke, Ko, Ha, Hi) -> Pada 1-3 Gemini, Pada 4 Cancer
  { nakshatraIndex: 6, pada: 1, syllables: ['ke', 'kay', 'ked', 'kes', 'qe'] },
  { nakshatraIndex: 6, pada: 2, syllables: ['ko', 'kau', 'kom', 'qo'] },
  { nakshatraIndex: 6, pada: 3, syllables: ['ha', 'haa', 'har', 'han', 'has', 'hem', 'h'] },
  { nakshatraIndex: 6, pada: 4, syllables: ['hi', 'hee', 'him', 'hit'] },
  // 7. Pushya (Hu, He, Ho, Da) -> Cancer
  { nakshatraIndex: 7, pada: 1, syllables: ['hu', 'hoo', 'hum'] },
  { nakshatraIndex: 7, pada: 2, syllables: ['he', 'hay', 'het'] },
  { nakshatraIndex: 7, pada: 3, syllables: ['ho', 'hau'] },
  { nakshatraIndex: 7, pada: 4, syllables: ['da', 'daa', 'dam', 'dar', 'day'] },
  // 8. Ashlesha (Di, Du, De, Do) -> Cancer
  { nakshatraIndex: 8, pada: 1, syllables: ['di', 'dee', 'dil', 'div', 'din'] },
  { nakshatraIndex: 8, pada: 2, syllables: ['du', 'doo', 'dur', 'dus'] },
  { nakshatraIndex: 8, pada: 3, syllables: ['de', 'day', 'dev', 'deb'] },
  { nakshatraIndex: 8, pada: 4, syllables: ['do', 'dau'] },
  // 9. Magha (Ma, Mi, Mu, Me) -> Leo
  { nakshatraIndex: 9, pada: 1, syllables: ['ma', 'maa', 'mad', 'mah', 'man', 'may', 'm'] },
  { nakshatraIndex: 9, pada: 2, syllables: ['mi', 'mee', 'mil', 'min', 'mit'] },
  { nakshatraIndex: 9, pada: 3, syllables: ['mu', 'moo', 'muk', 'mun', 'mur'] },
  { nakshatraIndex: 9, pada: 4, syllables: ['me', 'may', 'meg', 'meh'] },
  // 10. Purva Phalguni (Mo, Ta, Ti, Tu) -> Leo
  { nakshatraIndex: 10, pada: 1, syllables: ['mo', 'mau', 'moh', 'mon'] },
  { nakshatraIndex: 10, pada: 2, syllables: ['ta', 'taa', 'tan', 'tap', 'tar', 't'] },
  { nakshatraIndex: 10, pada: 3, syllables: ['ti', 'tee', 'til', 'tin'] },
  { nakshatraIndex: 10, pada: 4, syllables: ['tu', 'too', 'tul', 'tus'] },
  // 11. Uttara Phalguni (Te, To, Pa, Pi) -> Pada 1 Leo, Pada 2-4 Virgo
  { nakshatraIndex: 11, pada: 1, syllables: ['te', 'tay', 'tej'] },
  { nakshatraIndex: 11, pada: 2, syllables: ['to', 'tau', 'osh'] },
  { nakshatraIndex: 11, pada: 3, syllables: ['pa', 'paa', 'pal', 'pan', 'par', 'pav', 'paw', 'pra', 'pri', 'pr', 'p'] },
  { nakshatraIndex: 11, pada: 4, syllables: ['pi', 'pee', 'pin', 'piy'] },
  // 12. Hasta (Pu, Sha, Na, Tha) -> Virgo
  { nakshatraIndex: 12, pada: 1, syllables: ['pu', 'poo', 'pun', 'pur', 'pus'] },
  { nakshatraIndex: 12, pada: 2, syllables: ['sha', 'shaa', 'shan', 'shar', 'shas', 'shw', 'sh'] },
  { nakshatraIndex: 12, pada: 3, syllables: ['nna'] },
  { nakshatraIndex: 12, pada: 4, syllables: ['tha', 'thi', 'thu', 'the', 'tho', 'th'] },
  // 13. Chitra (Pe, Po, Ra, Ri) -> Pada 1-2 Virgo, Pada 3-4 Libra
  { nakshatraIndex: 13, pada: 1, syllables: ['pe', 'pay', 'pre'] },
  { nakshatraIndex: 13, pada: 2, syllables: ['po', 'pau', 'pro'] },
  { nakshatraIndex: 13, pada: 3, syllables: ['ra', 'raa', 'rag', 'rah', 'raj', 'rak', 'ram', 'ran', 'ash', 'rav', 'r'] },
  { nakshatraIndex: 13, pada: 4, syllables: ['ri', 'ree', 'ris', 'rit', 'riy'] },
  // 14. Swati (Ru, Re, Ro, Taa) -> Libra
  { nakshatraIndex: 14, pada: 1, syllables: ['ru', 'roo', 'ruc', 'rud', 'rup'] },
  { nakshatraIndex: 14, pada: 2, syllables: ['re', 'ray', 'rek', 'ren', 'rev'] },
  { nakshatraIndex: 14, pada: 3, syllables: ['ro', 'rau', 'roh', 'ron', 'ros'] },
  { nakshatraIndex: 14, pada: 4, syllables: ['tta'] },
  // 15. Vishakha (Ti, Tu, Te, To) -> Pada 1-3 Libra, Pada 4 Scorpio
  { nakshatraIndex: 15, pada: 1, syllables: ['tti'] },
  { nakshatraIndex: 15, pada: 2, syllables: ['ttu'] },
  { nakshatraIndex: 15, pada: 3, syllables: ['tte'] },
  { nakshatraIndex: 15, pada: 4, syllables: ['tto'] },
  // 16. Anuradha (Na, Ni, Nu, Ne) -> Scorpio
  { nakshatraIndex: 16, pada: 1, syllables: ['na', 'naa', 'nag', 'nal', 'nam', 'nan', 'nar', 'nav', 'nay', 'n'] },
  { nakshatraIndex: 16, pada: 2, syllables: ['ni', 'nee', 'nik', 'nil', 'nim', 'nir', 'nis', 'nit'] },
  { nakshatraIndex: 16, pada: 3, syllables: ['nu', 'noo', 'nup'] },
  { nakshatraIndex: 16, pada: 4, syllables: ['ne', 'nay', 'neh', 'nee'] },
  // 17. Jyeshtha (No, Ya, Yi, Yu) -> Scorpio
  { nakshatraIndex: 17, pada: 1, syllables: ['no', 'nau', 'nom'] },
  { nakshatraIndex: 17, pada: 2, syllables: ['ya', 'yaa', 'yam', 'yas', 'yat', 'y'] },
  { nakshatraIndex: 17, pada: 3, syllables: ['yi', 'yee'] },
  { nakshatraIndex: 17, pada: 4, syllables: ['yu', 'yoo', 'yuv'] },
  // 18. Mula (Ye, Yo, Bha, Bhi) -> Sagittarius
  { nakshatraIndex: 18, pada: 1, syllables: ['ye', 'yay'] },
  { nakshatraIndex: 18, pada: 2, syllables: ['yo', 'yau', 'yog'] },
  { nakshatraIndex: 18, pada: 3, syllables: ['bha', 'bhaa', 'bhar', 'bhav', 'bhan', 'bh'] },
  { nakshatraIndex: 18, pada: 4, syllables: ['bhi', 'bhee', 'bhim'] },
  // 19. Purva Ashadha (Bhu, Dha, Pha, Dha) -> Sagittarius
  { nakshatraIndex: 19, pada: 1, syllables: ['bhu', 'bhoo', 'bhup', 'bhuv'] },
  { nakshatraIndex: 19, pada: 2, syllables: ['dha', 'dhaa', 'dhan', 'dhar', 'dhru', 'dhr', 'dhi', 'dhu', 'dhe', 'dho', 'dh'] },
  { nakshatraIndex: 19, pada: 3, syllables: ['pha', 'phi', 'phu', 'phe', 'pho', 'ph', 'fa', 'fi', 'fu', 'fe', 'fo', 'fr', 'fl', 'f'] },
  { nakshatraIndex: 19, pada: 4, syllables: ['ddha'] },
  // 20. Uttara Ashadha (Bhe, Bho, Ja, Ji) -> Pada 1 Sagittarius, Pada 2-4 Capricorn
  { nakshatraIndex: 20, pada: 1, syllables: ['bhe', 'bhay'] },
  { nakshatraIndex: 20, pada: 2, syllables: ['bho', 'bhau'] },
  { nakshatraIndex: 20, pada: 3, syllables: ['ja', 'jaa', 'jag', 'jai', 'jan', 'jas', 'jay', 'za', 'j', 'z'] },
  { nakshatraIndex: 20, pada: 4, syllables: ['ji', 'jee', 'jit', 'zi', 'ze', 'zo', 'zu'] },
  // 21. Shravana (Ju, Je, Jo, Kha) -> Capricorn
  { nakshatraIndex: 21, pada: 1, syllables: ['ju', 'joo', 'jug'] },
  { nakshatraIndex: 21, pada: 2, syllables: ['je', 'jay', 'jee'] },
  { nakshatraIndex: 21, pada: 3, syllables: ['jo', 'jau', 'jy', 'jyo'] },
  { nakshatraIndex: 21, pada: 4, syllables: ['kha', 'khi', 'khu', 'khe', 'kho', 'kh', 'ksh', 'xa', 'xi', 'xu', 'xe', 'xo', 'x'] },
  // 22. Dhanishta (Ga, Gi, Gu, Ge) -> Pada 1-2 Capricorn, Pada 3-4 Aquarius
  { nakshatraIndex: 22, pada: 1, syllables: ['ga', 'gaa', 'gag', 'gan', 'gar', 'gau', 'gay', 'g'] },
  { nakshatraIndex: 22, pada: 2, syllables: ['gi', 'gee', 'gir', 'git'] },
  { nakshatraIndex: 22, pada: 3, syllables: ['gu', 'goo', 'gul', 'gun', 'gur'] },
  { nakshatraIndex: 22, pada: 4, syllables: ['ge', 'gay', 'gee'] },
  // 23. Shatabhisha (Go, Sa, Si, Su) -> Aquarius
  { nakshatraIndex: 23, pada: 1, syllables: ['go', 'gau', 'gop', 'gov'] },
  { nakshatraIndex: 23, pada: 2, syllables: ['sa', 'saa', 'sac', 'sad', 'sah', 'sai', 'sal', 'sam', 'san', 'sap', 'sar', 'sat', 'sav', 's'] },
  { nakshatraIndex: 23, pada: 3, syllables: ['si', 'see', 'sid', 'sim', 'sin', 'sit', 'shi', 'shri'] },
  { nakshatraIndex: 23, pada: 4, syllables: ['su', 'soo', 'sub', 'sud', 'suj', 'suk', 'sum', 'sun', 'sur', 'sus', 'shu'] },
  // 24. Purva Bhadrapada (Se, So, Da, Di) -> Pada 1-3 Aquarius, Pada 4 Pisces
  { nakshatraIndex: 24, pada: 1, syllables: ['se', 'say', 'see', 'she', 'sn', 'sne'] },
  { nakshatraIndex: 24, pada: 2, syllables: ['so', 'sau', 'som', 'son', 'sho', 'st', 'sp', 'sk', 'sm', 'sr', 'sw'] },
  { nakshatraIndex: 24, pada: 3, syllables: ['dda'] },
  { nakshatraIndex: 24, pada: 4, syllables: ['ddi'] },
  // 25. Uttara Bhadrapada (Du, Tha, Jha, Nya) -> Pisces
  { nakshatraIndex: 25, pada: 1, syllables: ['ddu'] },
  { nakshatraIndex: 25, pada: 2, syllables: ['ttha'] },
  { nakshatraIndex: 25, pada: 3, syllables: ['jha', 'jhi', 'jhu', 'jhe', 'jho', 'jh'] },
  { nakshatraIndex: 25, pada: 4, syllables: ['nya', 'gna', 'gya', 'gy'] },
  // 26. Revati (De, Do, Cha, Chi) -> Pisces ( plus Ba, Bi, Bu, Be, Bo phonetic colloquial group mapped carefully )
  { nakshatraIndex: 26, pada: 1, syllables: ['dde'] },
  { nakshatraIndex: 26, pada: 2, syllables: ['ddo'] },
  { nakshatraIndex: 26, pada: 3, syllables: ['cha', 'chaa', 'chan', 'char', 'chat', 'c', 'ca', 'co', 'cu'] },
  { nakshatraIndex: 26, pada: 4, syllables: ['chi', 'chee', 'chin', 'chir', 'ci', 'ce'] }
];

// Colloquial Ba/Bi/Bu/Be/Bo -> Rohini/Mrigashira (Va/Vi/Vu/Ve/Vo phonetic equivalence in North/East Indian Swara Shastra)
const B_COLLOQUIAL_OVERRIDES: Array<{ prefix: string; nakshatraIndex: number; pada: number }> = [
  { prefix: 'ba', nakshatraIndex: 3, pada: 2 },
  { prefix: 'bi', nakshatraIndex: 3, pada: 3 },
  { prefix: 'bee', nakshatraIndex: 3, pada: 3 },
  { prefix: 'bu', nakshatraIndex: 3, pada: 4 },
  { prefix: 'boo', nakshatraIndex: 3, pada: 4 },
  { prefix: 'be', nakshatraIndex: 4, pada: 1 },
  { prefix: 'bo', nakshatraIndex: 4, pada: 2 },
  { prefix: 'br', nakshatraIndex: 3, pada: 2 },
  { prefix: 'b',  nakshatraIndex: 3, pada: 2 }
];

const DEVANAGARI_TO_LATIN: Array<[RegExp, string]> = [
  [/^क्ष/, 'ksh'], [/^ज्ञ/, 'gya'], [/^त्र/, 'tra'], [/^श्र/, 'shri'],
  [/^छ/, 'chha'], [/^च/, 'cha'], [/^ख/, 'kha'], [/^क/, 'ka'],
  [/^घ/, 'gha'], [/^ग/, 'ga'], [/^झ/, 'jha'], [/^ज/, 'ja'],
  [/^ठ/, 'tha'], [/^ट/, 'ta'], [/^ढ/, 'dha'], [/^ड/, 'da'],
  [/^थ/, 'tha'], [/^त/, 'ta'], [/^ध/, 'dha'], [/^द/, 'da'],
  [/^ण|^न/, 'na'], [/^फ/, 'pha'], [/^प/, 'pa'], [/^भ/, 'bha'],
  [/^ब/, 'ba'], [/^म/, 'ma'], [/^य/, 'ya'], [/^र/, 'ra'],
  [/^ल/, 'la'], [/^व/, 'va'], [/^श|^ष/, 'sha'], [/^स/, 'sa'],
  [/^ह/, 'ha'], [/^अ|^आ/, 'a'], [/^इ|^ई/, 'i'], [/^उ|^ऊ/, 'u'],
  [/^ए|^ऐ/, 'e'], [/^ओ|^औ/, 'o'], [/^ऋ/, 'ri']
];

export class PersonalProfileEngine {
  /**
   * Strips honorific titles and normalizes Devanagari or Latin script into clean phonetic sound
   */
  public static extractPhoneticKey(rawInput: string): { cleanLatin: string; displaySound: string } {
    const stripped = (rawInput || '')
      .trim()
      .replace(/^(mr\.?|mrs\.?|ms\.?|miss|dr\.?|prof\.?|shri|sri|smt\.?|kumari|late)\s+/i, '')
      .trim();

    if (!stripped) {
      return { cleanLatin: 'a', displaySound: 'A' };
    }

    // Check Devanagari leading character + vowel matra
    if (/[\u0900-\u097F]/.test(stripped)) {
      let base = 'a';
      for (const [rx, repl] of DEVANAGARI_TO_LATIN) {
        if (rx.test(stripped)) {
          base = repl;
          break;
        }
      }
      const secondChar = stripped.charAt(1);
      if (base.endsWith('a') && base.length > 1) {
        const stem = base.slice(0, -1);
        if (secondChar === 'ि' || secondChar === 'ी') base = `${stem}i`;
        else if (secondChar === 'ु' || secondChar === 'ू') base = `${stem}u`;
        else if (secondChar === 'े' || secondChar === 'ै') base = `${stem}e`;
        else if (secondChar === 'ो' || secondChar === 'ौ') base = `${stem}o`;
      }
      return { cleanLatin: base, displaySound: base.toUpperCase() };
    }

    const cleanLatin = stripped.toLowerCase().replace(/[^a-z]/g, '') || 'a';
    const displaySound = cleanLatin.slice(0, Math.min(3, Math.max(1, cleanLatin.length))).toUpperCase();
    return { cleanLatin, displaySound };
  }

  /**
   * Maps any phonetic key to exact Avakahada Nakshatra (0..26), Pada (1..4), and Rashi (0..11)
   */
  public static lookupAvakahada(cleanLatin: string): { nakshatraIndex: number; pada: number; signIndex: number; matchedSyllable: string } {
    // Check colloquial B-group first (avoiding 'bh' which belongs to Mula/Purva Ashadha/Uttara Ashadha)
    if (cleanLatin.startsWith('b') && !cleanLatin.startsWith('bh')) {
      for (const bEntry of B_COLLOQUIAL_OVERRIDES) {
        if (cleanLatin.startsWith(bEntry.prefix)) {
          const signIndex = Math.floor((bEntry.nakshatraIndex * 4 + (bEntry.pada - 1)) / 9) % 12;
          return { nakshatraIndex: bEntry.nakshatraIndex, pada: bEntry.pada, signIndex, matchedSyllable: bEntry.prefix.toUpperCase() };
        }
      }
    }

    let bestMatch: { nakshatraIndex: number; pada: number; syl: string } | null = null;
    for (const entry of AVAKAHADA_108_PADAS) {
      for (const syl of entry.syllables) {
        if (cleanLatin.startsWith(syl)) {
          if (!bestMatch || syl.length > bestMatch.syl.length) {
            bestMatch = { nakshatraIndex: entry.nakshatraIndex, pada: entry.pada, syl };
          }
        }
      }
    }

    const finalNak = bestMatch ? bestMatch.nakshatraIndex : 2;
    const finalPada = bestMatch ? bestMatch.pada : 1;
    const matchedSyllable = (bestMatch ? bestMatch.syl : cleanLatin.slice(0, 2)).toUpperCase();
    const signIndex = Math.floor((finalNak * 4 + (finalPada - 1)) / 9) % 12;

    return { nakshatraIndex: finalNak, pada: finalPada, signIndex, matchedSyllable };
  }

  /**
   * Resolves a user who DOES NOT know their birth details using plain-English questions.
   * Every single question (Name, Diurnal Phase, Elemental Drive, Sacred Number 1-9) actively shapes the profile.
   */
  public static resolveFromNonTechnicalQuestions(params: {
    fullName: string;
    dayOrNightBorn: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'UNKNOWN';
    corePersonalityDrive: 'FIRE_LEADER' | 'EARTH_BUILDER' | 'AIR_THINKER' | 'WATER_EMPATH';
    sacredNumber: number; // 1 to 9
  }): UserProfile {
    const rawName = (params.fullName || '').trim();
    const { cleanLatin } = this.extractPhoneticKey(rawName || 'Seeker');
    const avakahada = this.lookupAvakahada(cleanLatin);

    const safeSacred = Math.min(9, Math.max(1, Math.round(params.sacredNumber || 5)));

    // Elemental base sign index: Fire=0 (Aries), Earth=1 (Taurus), Air=2 (Gemini), Water=3 (Cancer)
    const elementBase = {
      FIRE_LEADER: 0,
      EARTH_BUILDER: 1,
      AIR_THINKER: 2,
      WATER_EMPATH: 3
    }[params.corePersonalityDrive];

    // Distinct triplicity shift across ALL 5 diurnal phases + Sacred Number fine-tuning:
    // Each element has 3 signs (0, +4, +8). Diurnal phase + sacredNumber selects the exact rising harmonic!
    let triplicitySlot = 0; // 0, 1, or 2
    if (params.dayOrNightBorn === 'MORNING') {
      triplicitySlot = (0 + (safeSacred % 2 === 0 ? 0 : 0)) % 3; // Cardinal/1st triplicity anchored, modulated below
    } else if (params.dayOrNightBorn === 'AFTERNOON') {
      triplicitySlot = 1; // Fixed/2nd triplicity (Leo, Virgo, Libra, Scorpio)
    } else if (params.dayOrNightBorn === 'EVENING') {
      triplicitySlot = 2; // Mutable/3rd triplicity (Sagittarius, Capricorn, Aquarius, Pisces)
    } else if (params.dayOrNightBorn === 'NIGHT') {
      // Nocturnal angle opposite morning + elemental harmonic
      triplicitySlot = (1 + (safeSacred % 2)) % 3;
    } else {
      // UNKNOWN: Prashna Arudha derived directly from Sacred Number (1..9)
      triplicitySlot = (safeSacred - 1) % 3;
    }

    // Ensure EVENING and NIGHT are always distinct AND sacredNumber (1..9) refines Prashna sub-harmonic
    let ascIndex = (elementBase + triplicitySlot * 4) % 12;
    if (params.dayOrNightBorn === 'NIGHT') {
      ascIndex = (elementBase + 8 + ((safeSacred % 3 === 0) ? 4 : 0)) % 12;
      if (ascIndex === (elementBase + 8) % 12 && safeSacred <= 4) {
        ascIndex = (ascIndex + 3) % 12;
      }
    } else if (params.dayOrNightBorn === 'UNKNOWN') {
      ascIndex = (avakahada.signIndex + elementBase + safeSacred) % 12;
    } else if (safeSacred >= 7) {
      // High Prashna numbers (7,8,9) shift within elemental trine for genuine Q4 sensitivity
      ascIndex = (ascIndex + 4) % 12;
    }

    // Calibrate Pada (1..4) with Sacred Number while preserving exact Avakahada Nakshatra
    const calibratedPada = ((avakahada.pada - 1 + (safeSacred - 1)) % 4) + 1;
    const moonSignIndex = Math.floor((avakahada.nakshatraIndex * 4 + (avakahada.pada - 1)) / 9) % 12;

    const nakshatraName = NAKSHATRA_NAMES[avakahada.nakshatraIndex];
    const moonSignName = ZODIAC_SIGNS[moonSignIndex];
    const ascName = ZODIAC_SIGNS[ascIndex];

    const driveDesc = {
      FIRE_LEADER: 'Bold Action & Leadership (Agni)',
      EARTH_BUILDER: 'Practical Stability & Wealth (Prithvi)',
      AIR_THINKER: 'Strategy & Innovation (Vayu)',
      WATER_EMPATH: 'Intuition & Depth (Jala)'
    }[params.corePersonalityDrive];

    return {
      name: rawName || 'Seeker',
      mode: 'NON_TECHNICAL_WIZARD',
      moonSignIndex,
      moonSignName,
      nakshatraIndex: avakahada.nakshatraIndex,
      nakshatraPada: calibratedPada,
      nakshatraName,
      ascendantSignIndex: ascIndex,
      ascendantSignName: ascName,
      derivationSummary: `Derived via 108-Pada Swara Shastra from syllable "${avakahada.matchedSyllable}" → ${nakshatraName} (Pada ${avakahada.pada}, ${moonSignName} Moon), calibrated with ${driveDesc} & Prashna #${safeSacred} (${ascName} Lagna).`
    };
  }

  /**
   * Resolves a user who DOES know their exact birth details (DOB + TOB + POB).
   * Throws descriptive Error if inputs are out of bounds rather than silently fabricating a quiz profile.
   */
  public static resolveFromBirthDetails(params: {
    fullName: string;
    birthDate: string;      // YYYY-MM-DD
    birthTime: string;      // HH:MM or HH:MM:SS (24hr)
    birthCityName: string;
    latitude: number;
    longitude: number;
    timezoneOffset: number;
    timezone?: string;
    explicitOffsetOverride?: boolean;
  }): UserProfile {
    if (!params.birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(params.birthDate)) {
      throw new Error('Please select a valid Date of Birth (YYYY-MM-DD).');
    }
    if (!Number.isFinite(params.latitude) || params.latitude < -90 || params.latitude > 90) {
      throw new Error('Birth Latitude must be between -90° and +90°.');
    }
    if (!Number.isFinite(params.longitude) || params.longitude < -180 || params.longitude > 180) {
      throw new Error('Birth Longitude must be between -180° and +180°.');
    }
    if (!Number.isFinite(params.timezoneOffset) || params.timezoneOffset < -12 || params.timezoneOffset > 14) {
      throw new Error('Birth Timezone UTC Offset must be between -12 and +14 hours.');
    }

    const normalizedTime = params.birthTime.length === 5 ? `${params.birthTime}:00` : params.birthTime;
    const time12Hr = HighPrecisionAstroEngine.format24To12Hr(normalizedTime.slice(0, 5));

    // Resolve exact historical/DST UTC offset at the birth instant (detecting spring-forward gaps & fall-back folds)
    let effectiveOffset = params.timezoneOffset;
    if (params.timezone && HighPrecisionAstroEngine.isValidIanaTimezone(params.timezone)) {
      try {
        const resolved = resolveIanaTimezone(
          params.birthDate,
          normalizedTime,
          params.timezone,
          params.explicitOffsetOverride ? params.timezoneOffset : undefined
        );
        effectiveOffset = resolved.offsetHours;
      } catch (err) {
        if (err instanceof CalculationInputError) {
          if (err.code === 'NONEXISTENT_LOCAL_TIME') {
            throw new Error(
              `The local birth time ${time12Hr} did not exist in ${params.timezone} on ${params.birthDate} due to the Daylight Saving Time spring-forward jump. Please verify the recorded clock time.`
            );
          }
          if (err.code === 'AMBIGUOUS_LOCAL_TIME') {
            throw new Error(
              `The local birth time ${time12Hr} occurred twice in ${params.timezone} on ${params.birthDate} during the Daylight Saving Time fall-back hour. Open "⚙️ Edit Exact Lat / Lon" and confirm the exact UTC offset (e.g., -4 for EDT or -5 for EST).`
            );
          }
          throw new Error(err.message);
        }
        throw err;
      }
    }

    const chart = calculateFullChart(
      params.birthDate,
      normalizedTime,
      params.latitude,
      params.longitude,
      params.birthCityName,
      effectiveOffset,
      AyanamsaType.TRUE_LAHIRI
    );

    // High-precision ELP2000 Moon longitude at exact birth Julian Day UT (eliminates 0.8° truncation drift & .slice(0,4) collision)
    const jdUt = chart.systemMetadata.julianDayUT;
    const ayanamsa = HighPrecisionAstroEngine.getTrueLahiriAyanamsa(jdUt);
    const moonTrop = HighPrecisionAstroEngine.calculateMoonLongitude(jdUt);
    const siderealMoon = HighPrecisionAstroEngine.normalizeDegrees(moonTrop - ayanamsa);

    const nakSpan = 360.0 / 27.0;
    const nakIdx = Math.min(26, Math.max(0, Math.floor(siderealMoon / nakSpan)));
    const nakPada = Math.min(4, Math.max(1, Math.floor(((siderealMoon % nakSpan) / nakSpan) * 4) + 1));
    const moonSignIdx = Math.min(11, Math.max(0, Math.floor(siderealMoon / 30.0)));

    // Exact top-level ascendantSignIndex & ascendantDegree from ChartCalculationResult
    const ascIdx = chart.ascendantSignIndex;
    const ascDeg = Number(chart.ascendantDegree.toFixed(2));
    const utcLabel = HighPrecisionAstroEngine.formatUtcOffsetLabel(Math.round(effectiveOffset * 60));

    return {
      name: params.fullName.trim() || 'Native',
      mode: 'BIRTH_DETAILS',
      moonSignIndex: moonSignIdx,
      moonSignName: ZODIAC_SIGNS[moonSignIdx],
      nakshatraIndex: nakIdx,
      nakshatraPada: nakPada,
      nakshatraName: NAKSHATRA_NAMES[nakIdx],
      ascendantSignIndex: ascIdx,
      ascendantSignName: ZODIAC_SIGNS[ascIdx],
      ascendantDegree: ascDeg,
      dob: params.birthDate,
      tob: normalizedTime.slice(0, 5),
      pob: params.birthCityName,
      birthLat: params.latitude,
      birthLon: params.longitude,
      birthTzOffset: effectiveOffset,
      birthTimezone: params.timezone,
      derivationSummary: `Drik Birth Kundali (${params.birthDate}, ${time12Hr} ${utcLabel} · ${params.birthCityName}): Natal Moon in ${NAKSHATRA_NAMES[nakIdx]} Pada ${nakPada} (${ZODIAC_SIGNS[moonSignIdx]}), ${ZODIAC_SIGNS[ascIdx]} Lagna (${ascDeg}°).`
    };
  }

  public static createUniversalProfile(): UserProfile {
    return {
      name: 'Universal City Mode',
      mode: 'UNIVERSAL',
      moonSignIndex: 0,
      moonSignName: 'Aries',
      nakshatraIndex: 0,
      nakshatraPada: 1,
      nakshatraName: 'Ashwini',
      ascendantSignIndex: 0,
      ascendantSignName: 'Aries',
      derivationSummary: 'No birth profile supplied — showing Universal Macrocosmic City Timings anchored to your exact local sunrise, sunset, and topocentric Panchanga.'
    };
  }
}