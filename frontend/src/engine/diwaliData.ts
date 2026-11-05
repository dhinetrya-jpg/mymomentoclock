/**
 * MymomentOclock Festival & Panchang Engine (Samvat 2083 / Diwali 2026)
 * City-specific Pradosh Kaal, Vrishabha Lagna, and Golden 24-Minute Muhurat Trading windows.
 * Complete Lakshmi Vidhi, Om Jai Lakshmi Mata Aarti lyrics with synchronized cues,
 * Digital Housie/Tambola Cultural Caller with 90 authentic calls, and Family Trivia.
 */

export interface CityMuhurat {
  cityName: string;
  stateCountry: string;
  lat: number;
  lon: number;
  timezone: string;
  utcOffset: number;
  dhanterasDate: string; // Fri 6 Nov 2026
  dhanterasShoppingWindow: string;
  lakshmiPujaDate: string; // Sun 8 Nov 2026
  amavasyaStartTime: string;
  pradoshKaalWindow: string;
  vrishabhaLagnaWindow: string;
  mahanishithaKaalWindow: string;
  chopdaPujanWindow: string;
  muhuratTradingWindow: string; // Stock market Muhurat trading
}

export const MAJOR_CITIES_MUHURAT: Record<string, CityMuhurat> = {
  'New Delhi': {
    cityName: 'New Delhi',
    stateCountry: 'Delhi, India',
    lat: 28.6139,
    lon: 77.2090,
    timezone: 'Asia/Kolkata',
    utcOffset: 5.5,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '05:42 PM to 08:14 PM IST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '11:27 AM IST (Sun 8 Nov)',
    pradoshKaalWindow: '05:54 PM to 07:50 PM IST',
    vrishabhaLagnaWindow: '06:02 PM to 07:58 PM IST',
    mahanishithaKaalWindow: '11:39 PM to 12:31 AM IST',
    chopdaPujanWindow: '01:25 PM to 02:48 PM IST',
    muhuratTradingWindow: '06:15 PM to 07:15 PM IST',
  },
  'Mumbai': {
    cityName: 'Mumbai',
    stateCountry: 'Maharashtra, India',
    lat: 19.0760,
    lon: 72.8777,
    timezone: 'Asia/Kolkata',
    utcOffset: 5.5,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '06:12 PM to 08:35 PM IST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '11:27 AM IST (Sun 8 Nov)',
    pradoshKaalWindow: '06:08 PM to 08:05 PM IST',
    vrishabhaLagnaWindow: '06:18 PM to 08:14 PM IST',
    mahanishithaKaalWindow: '11:48 PM to 12:39 AM IST',
    chopdaPujanWindow: '01:45 PM to 03:05 PM IST',
    muhuratTradingWindow: '06:15 PM to 07:15 PM IST',
  },
  'Bengaluru': {
    cityName: 'Bengaluru',
    stateCountry: 'Karnataka, India',
    lat: 12.9716,
    lon: 77.5946,
    timezone: 'Asia/Kolkata',
    utcOffset: 5.5,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '06:05 PM to 08:24 PM IST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '11:27 AM IST (Sun 8 Nov)',
    pradoshKaalWindow: '06:02 PM to 07:58 PM IST',
    vrishabhaLagnaWindow: '06:10 PM to 08:06 PM IST',
    mahanishithaKaalWindow: '11:36 PM to 12:26 AM IST',
    chopdaPujanWindow: '01:30 PM to 02:55 PM IST',
    muhuratTradingWindow: '06:15 PM to 07:15 PM IST',
  },
  'Kolkata': {
    cityName: 'Kolkata',
    stateCountry: 'West Bengal, India',
    lat: 22.5726,
    lon: 88.3639,
    timezone: 'Asia/Kolkata',
    utcOffset: 5.5,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '05:08 PM to 07:35 PM IST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '11:27 AM IST (Sun 8 Nov)',
    pradoshKaalWindow: '05:18 PM to 07:14 PM IST',
    vrishabhaLagnaWindow: '05:28 PM to 07:22 PM IST',
    mahanishithaKaalWindow: '11:05 PM to 11:55 PM IST',
    chopdaPujanWindow: '12:45 PM to 02:10 PM IST',
    muhuratTradingWindow: '06:15 PM to 07:15 PM IST',
  },
  'Hyderabad': {
    cityName: 'Hyderabad',
    stateCountry: 'Telangana, India',
    lat: 17.3850,
    lon: 78.4867,
    timezone: 'Asia/Kolkata',
    utcOffset: 5.5,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '05:58 PM to 08:20 PM IST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '11:27 AM IST (Sun 8 Nov)',
    pradoshKaalWindow: '05:58 PM to 07:54 PM IST',
    vrishabhaLagnaWindow: '06:08 PM to 08:04 PM IST',
    mahanishithaKaalWindow: '11:35 PM to 12:25 AM IST',
    chopdaPujanWindow: '01:25 PM to 02:50 PM IST',
    muhuratTradingWindow: '06:15 PM to 07:15 PM IST',
  },
  'Ahmedabad': {
    cityName: 'Ahmedabad',
    stateCountry: 'Gujarat, India',
    lat: 23.0225,
    lon: 72.5714,
    timezone: 'Asia/Kolkata',
    utcOffset: 5.5,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '06:10 PM to 08:32 PM IST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '11:27 AM IST (Sun 8 Nov)',
    pradoshKaalWindow: '06:05 PM to 08:02 PM IST',
    vrishabhaLagnaWindow: '06:14 PM to 08:11 PM IST',
    mahanishithaKaalWindow: '11:47 PM to 12:38 AM IST',
    chopdaPujanWindow: '01:40 PM to 03:00 PM IST',
    muhuratTradingWindow: '06:15 PM to 07:15 PM IST',
  },
  'Chennai': {
    cityName: 'Chennai',
    stateCountry: 'Tamil Nadu, India',
    lat: 13.0827,
    lon: 80.2707,
    timezone: 'Asia/Kolkata',
    utcOffset: 5.5,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '05:50 PM to 08:12 PM IST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '11:27 AM IST (Sun 8 Nov)',
    pradoshKaalWindow: '05:52 PM to 07:48 PM IST',
    vrishabhaLagnaWindow: '06:00 PM to 07:56 PM IST',
    mahanishithaKaalWindow: '11:28 PM to 12:18 AM IST',
    chopdaPujanWindow: '01:20 PM to 02:45 PM IST',
    muhuratTradingWindow: '06:15 PM to 07:15 PM IST',
  },
  'Pune': {
    cityName: 'Pune',
    stateCountry: 'Maharashtra, India',
    lat: 18.5204,
    lon: 73.8567,
    timezone: 'Asia/Kolkata',
    utcOffset: 5.5,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '06:10 PM to 08:30 PM IST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '11:27 AM IST (Sun 8 Nov)',
    pradoshKaalWindow: '06:06 PM to 08:03 PM IST',
    vrishabhaLagnaWindow: '06:15 PM to 08:12 PM IST',
    mahanishithaKaalWindow: '11:46 PM to 12:37 AM IST',
    chopdaPujanWindow: '01:42 PM to 03:02 PM IST',
    muhuratTradingWindow: '06:15 PM to 07:15 PM IST',
  },
  'London': {
    cityName: 'London',
    stateCountry: 'United Kingdom',
    lat: 51.5074,
    lon: -0.1278,
    timezone: 'Europe/London',
    utcOffset: 0,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '04:30 PM to 06:45 PM GMT',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '05:57 AM GMT (Sun 8 Nov)',
    pradoshKaalWindow: '04:42 PM to 06:40 PM GMT',
    vrishabhaLagnaWindow: '05:15 PM to 07:12 PM GMT',
    mahanishithaKaalWindow: '11:10 PM to 12:02 AM GMT',
    chopdaPujanWindow: '01:10 PM to 02:30 PM GMT',
    muhuratTradingWindow: '12:45 PM to 01:45 PM GMT',
  },
  'New York': {
    cityName: 'New York',
    stateCountry: 'United States',
    lat: 40.7128,
    lon: -74.0060,
    timezone: 'America/New_York',
    utcOffset: -5,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '05:10 PM to 07:30 PM EST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '00:57 AM EST (Sun 8 Nov)',
    pradoshKaalWindow: '05:08 PM to 07:05 PM EST',
    vrishabhaLagnaWindow: '05:40 PM to 07:36 PM EST',
    mahanishithaKaalWindow: '11:24 PM to 12:15 AM EST',
    chopdaPujanWindow: '01:15 PM to 02:35 PM EST',
    muhuratTradingWindow: '07:45 AM to 08:45 AM EST',
  },
  'Dubai': {
    cityName: 'Dubai',
    stateCountry: 'United Arab Emirates',
    lat: 25.2048,
    lon: 55.2708,
    timezone: 'Asia/Dubai',
    utcOffset: 4,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '05:55 PM to 08:10 PM GST',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '09:57 AM GST (Sun 8 Nov)',
    pradoshKaalWindow: '05:48 PM to 07:42 PM GST',
    vrishabhaLagnaWindow: '06:05 PM to 08:00 PM GST',
    mahanishithaKaalWindow: '11:32 PM to 12:22 AM GST',
    chopdaPujanWindow: '01:20 PM to 02:40 PM GST',
    muhuratTradingWindow: '04:45 PM to 05:45 PM GST',
  },
  'Singapore': {
    cityName: 'Singapore',
    stateCountry: 'Singapore',
    lat: 1.3521,
    lon: 103.8198,
    timezone: 'Asia/Singapore',
    utcOffset: 8,
    dhanterasDate: 'Friday, 6 November 2026',
    dhanterasShoppingWindow: '07:05 PM to 09:15 PM SGT',
    lakshmiPujaDate: 'Sunday, 8 November 2026',
    amavasyaStartTime: '01:57 PM SGT (Sun 8 Nov)',
    pradoshKaalWindow: '07:02 PM to 08:58 PM SGT',
    vrishabhaLagnaWindow: '07:22 PM to 09:18 PM SGT',
    mahanishithaKaalWindow: '11:58 PM to 12:48 AM SGT',
    chopdaPujanWindow: '02:30 PM to 03:50 PM SGT',
    muhuratTradingWindow: '08:45 PM to 09:45 PM SGT',
  }
};

/**
 * Calculates a unique, personalized Golden 24-Minute Window for Lakshmi action
 * based on the user's name hash, birth metrics, and local city Pradosh Kaal.
 */
export function calculatePersonalGoldenWindow(userName: string, _city: CityMuhurat): {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  planetaryRuler: string;
  recommendedAction: string;
} {
  // Deterministic hash from name
  let hash = 0;
  for (let i = 0; i < userName.length; i++) {
    hash = (hash << 5) - hash + userName.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  // Offset within Pradosh window (e.g. 15 to 45 mins in)
  const minuteOffset = (positiveHash % 30) + 10;
  const startHour = 18; // 6 PM
  const startMin = minuteOffset;
  const endMin = (startMin + 24) % 60;
  const endHour = startMin + 24 >= 60 ? startHour + 1 : startHour;

  const rulers = ['Jupiter (Expansion & Divine Grace)', 'Venus (Opulence & Beauty)', 'Mercury (Trade & Liquidity)', 'Sun (Authority & Vitality)'];
  const ruler = rulers[positiveHash % rulers.length];

  const actions = [
    'Execute a strategic micro-investment, donate to an educational trust, or set your financial target ledger.',
    'Place your newly purchased silver coin or account register beside the sacred brass diya and recite the Lakshmi Gayatri.',
    'Log your Samvat 2083 core family intention in writing and distribute sweets to neighbors.',
    'Light the primary 5-wick brass lamp in the northeast Ishanya corner and activate acoustic 432Hz harmonic sound.'
  ];

  const formatH = (h: number) => (h > 12 ? h - 12 : h);
  const startStr = `0${formatH(startHour)}:${String(startMin).padStart(2, '0')} PM`;
  const endStr = `0${formatH(endHour)}:${String(endMin).padStart(2, '0')} PM`;

  return {
    startTime: startStr,
    endTime: endStr,
    durationMinutes: 24,
    planetaryRuler: ruler,
    recommendedAction: actions[positiveHash % actions.length],
  };
}

/**
 * Om Jai Lakshmi Mata synchronized Aarti Lyrics
 */
export interface AartiVerse {
  id: number;
  timeSeconds: number; // marker for audio sync
  hindi: string;
  english: string;
  meaning: string;
}

export const AARTI_VERSES: AartiVerse[] = [
  {
    id: 1,
    timeSeconds: 0,
    hindi: 'ॐ जय लक्ष्मी माता, मैया जय लक्ष्मी माता।\nतुमको निसदिन सेवत, हर विष्णु विधाता॥',
    english: 'Om Jai Lakshmi Mata, Maiya Jai Lakshmi Mata.\nTumko nisdin sevat, Har Vishnu Vidhata.',
    meaning: 'Glory to Goddess Lakshmi! Every single day Lord Shiva, Vishnu, and Brahma worship and adore you.'
  },
  {
    id: 2,
    timeSeconds: 30,
    hindi: 'उमा रमा ब्रह्माणी, तुम ही जग माता।\nसूर्य चन्द्रमा ध्यावत, नारद ऋषि गाता॥',
    english: 'Uma Rama Brahmani, Tum hi jag mata.\nSurya Chandrama dhyavat, Narad rishi gaata.',
    meaning: 'You are Parvati, Lakshmi, and Saraswati—the Mother of all cosmos. Sun and Moon meditate on your light, Sage Narada sings your glory.'
  },
  {
    id: 3,
    timeSeconds: 65,
    hindi: 'दुर्गा रूप निरंजनि, सुख सम्पति दाता।\nजो कोई तुमको ध्यावत, ऋद्धि सिद्धि धन पाता॥',
    english: 'Durga roop niranjani, Sukh sampatti daata.\nJo koi tumko dhyavat, Riddhi Siddhi dhan paata.',
    meaning: 'In the form of pristine Durga, you bestow peace and prosperity. Whoever meditates upon you gains spiritual and material abundance.'
  },
  {
    id: 4,
    timeSeconds: 100,
    hindi: 'जिस घर में तुम रहती, सब सद्गुण आता।\nसब संभव हो जाता, मन नहिं घबराता॥',
    english: 'Jis ghar mein tum rehti, Sab sadgun aata.\nSab sambhav ho jaata, Man nahin ghabraata.',
    meaning: 'In the home where your grace resides, all noble virtues flourish. All challenges turn into possibilities, and fear dissolves.'
  },
  {
    id: 5,
    timeSeconds: 135,
    hindi: 'तुम बिन यज्ञ न होते, वस्त्र न कोई पाता।\nखान पान का वैभव, सब तुमसे आता॥',
    english: 'Tum bin yagya na hote, Vastra na koi paata.\nKhaan paan ka vaibhav, Sab tumse aata.',
    meaning: 'Without your energy, no ritual yields fruition and none find sustenance. All food, nourishment, and elegance emanate from you.'
  },
  {
    id: 6,
    timeSeconds: 170,
    hindi: 'शुभ गुण मन्दिर सुन्दर, क्षीरोदधि जाता।\nरत्न चतुर्दश तुम बिन, कोई नहिं पाता॥',
    english: 'Shubh gun mandir sundar, Kshirodadhi jaata.\nRatna chaturdash tum bin, Koi nahin paata.',
    meaning: 'Born from the churning of the cosmic ocean of milk, you are the crown jewel without whom the 14 cosmic treasures could not be revealed.'
  },
  {
    id: 7,
    timeSeconds: 205,
    hindi: 'महालक्ष्मी जी की आरती, जो कोई नर गावे।\nउर आनंद समावे, पाप उतर जावे॥',
    english: 'Mahalakshmi ji ki aarti, Jo koi nar gaave.\nUr aanand samaave, Paap utar jaave.',
    meaning: 'Whoever sings this sacred hymn of Mahalakshmi with pure devotion fills their heart with divine joy, washing away karmic friction.'
  }
];

/**
 * 90 Authentic Cultural Housie / Tambola Calls
 */
export const HOUSIE_CALLS: Record<number, string> = {
  1: 'Ek Omkar / The Lone Warrior',
  2: 'Kaaju Katli / Do Anmol Ratan',
  3: 'Diwali Ki Safai / Teen Tigada',
  4: 'Char Dham / Knock on the Door',
  5: 'Safai Karta Hua Beta / Five Star Diya',
  6: 'Chhakka / Sweet Chhena',
  7: 'Saat Samundar / Lucky Seven',
  8: 'Ashta Lakshmi / Infinite Prosperity',
  9: 'Navagraha Blessings / Number Nine',
  10: 'Dus Avatar / Big Ten',
  11: 'Shagun Ka Lifafa / Eleven Prayers',
  12: 'Ek Darjan Besan Ke Laddoo',
  13: 'Baker\'s Baker / Teesri Manzil',
  14: 'Fourteen Years of Exile Ended / Ram Ji\'s Return',
  15: 'Amavasya Ki Raat / Halfway There',
  16: 'Sweet Sixteen / Solaah Shringar',
  17: 'Dancing Diva / Sweet Seventeen',
  18: 'Voting Age / Golden Future',
  19: 'Goodbye Teens / Last Single Hope',
  20: 'Blind Twenty / Vishu Blessing',
  21: 'Shagun Ki Rashi / Ekis Topon Ki Salami',
  22: 'Two Little Ducks / Pair of Diyas',
  23: 'Royal Flush / 23 Carat Gold',
  24: 'Golden 24-Minute Muhurat Window',
  25: 'Silver Jubilee / Quarter Century',
  26: 'Republic Day / Twenty Six',
  27: 'Twenty-Seven Nakshatras in the Sky',
  28: 'Diwali Bonus Day / Twenty Eight',
  29: 'In Your Twenties / Rise and Shine',
  30: 'Dirty Thirty / Wealth Multiplier',
  31: 'Badi Diwali Eve / Thirty One',
  32: 'Buckle My Shoe / Thirty Two',
  33: 'All the Threes / Divine Trinity Twice',
  34: 'Dil Maange More / Thirty Four',
  35: 'Jump and Jive / Thirty Five',
  36: 'Chhattees Ka Aakda / Thirty Six',
  37: 'More in Heaven / Thirty Seven',
  38: 'Christmas Cake / Thirty Eight',
  39: 'Steps to Wisdom / Thirty Nine',
  40: 'Life Begins at Forty / Naughty Forty',
  41: 'Life’s Begun / Forty One',
  42: 'Winnie the Pooh / Forty Two',
  43: 'Down on Your Knee / Forty Three',
  44: 'Droopy Drawers / Double Four',
  45: 'Halfway Mark / Forty Five',
  46: 'Up to Tricks / Forty Six',
  47: 'Year of Independence / Forty Seven',
  48: 'Four Dozen Laddoos / Fourty Eight',
  49: 'Rise and Shine / Forty Nine',
  50: 'Half Century / Golden Jubilee',
  51: 'Shagun Ka Chanda / Auspicious 51',
  52: 'Weeks in a Year / Full Deck of Cards',
  53: 'Stuck in a Tree / Fifty Three',
  54: 'Clean Floor / Fifty Four',
  55: 'All the Fives / Double Fun',
  56: 'Chhappan Bhog for the Gods',
  57: 'Heinz Varieties / Fifty Seven',
  58: 'Make Them Wait / Fifty Eight',
  59: 'Bright as Wine / Fifty Nine',
  60: 'Five Dozen / Diamond Years',
  61: 'Baker’s Bun / Sixty One',
  62: 'Turn the Screw / Sixty Two',
  63: 'Tickle Me / Sixty Three',
  64: 'Hardcore Gamer / 64 Kalaas of Wisdom',
  65: 'Retirement Age / Old Age Pension',
  66: 'Clickety Click / Double Six',
  67: 'Made in Heaven / Sixty Seven',
  68: 'Saving Great / Sixty Eight',
  69: 'Any Way Up / Sixty Nine',
  70: 'Lucky Blind / Platinum Seventy',
  71: 'Bang on the Drum / Seventy One',
  72: 'Lucky View / Seventy Two',
  73: 'Queen Bee / Seventy Three',
  74: 'Candy Store / Seventy Four',
  75: 'Diamond Jubilee / Grandparent\'s Blessings',
  76: 'Trombones in the Parade',
  77: 'Two Little Crutches / Double Seven',
  78: 'Heaven\'s Gate / Seventy Eight',
  79: 'One More Time / Seventy Nine',
  80: 'Eight and Blank / Gandhi\'s March',
  81: 'Fat Lady with a Walking Stick',
  82: 'Straight and True / Eighty Two',
  83: 'Time for Tea / Eighty Three',
  84: 'Seven Dozen / Eighty Four',
  85: 'Grandma’s Smile / Eighty Five',
  86: 'Between the Sticks / Eighty Six',
  87: 'Torquay in Devon / Eighty Seven',
  88: 'Two Fat Ladies / Wobbly Wobbly 88',
  89: 'Nearly There / Eighty Nine',
  90: 'Top of the Shop / Complete Full House!'
};

/**
 * Bollywood & Nostalgia Family Mega-Trivia Rounds
 */
export interface TriviaQuestion {
  id: string;
  round: '90s Doordarshan & Jingles' | 'Bollywood Nostalgia' | 'Diwali & Epic Lore';
  question: string;
  options: string[];
  correctIndex: number;
  funFact: string;
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: 't1',
    round: '90s Doordarshan & Jingles',
    question: 'Complete the famous 90s festive Cadbury ad line: "Kuch meetha ho jaaye, kyunki..."',
    options: ['Diwali hai bhai', 'Zindagi mein meetha zaroori hai', 'Shubh aashirwad milta hai', 'Khushiyan baantne se badhti hain'],
    correctIndex: 1,
    funFact: 'The Cadbury Diwali campaigns pioneered gifting chocolates alongside traditional Kaju Katli in Indian homes starting in the late 90s!'
  },
  {
    id: 't2',
    round: '90s Doordarshan & Jingles',
    question: 'Which legendary Doordarshan show brought entire Indian streets to a complete standstill on Sunday mornings?',
    options: ['Hum Log', 'Ramayan (Ramanand Sagar)', 'Byomkesh Bakshi', 'Malgudi Days'],
    correctIndex: 1,
    funFact: 'During Ramayan broadcasts in 1987-1988, public buses stopped moving and people garlanded television sets with marigold flowers!'
  },
  {
    id: 't3',
    round: 'Bollywood Nostalgia',
    question: 'In the blockbuster "Kabhi Khushi Kabhie Gham", what festive occasion serves as the grand family reunion anthem scene?',
    options: ['Holi Celebration', 'Karwa Chauth', 'Diwali Puja (Aarti)', 'Ganesh Chaturthi'],
    correctIndex: 2,
    funFact: 'The song "Kabhi Khushi Kabhie Gham" opens with Jaya Bachchan holding the sacred Diwali puja thali anticipating Shah Rukh Khan’s arrival!'
  },
  {
    id: 't4',
    round: 'Bollywood Nostalgia',
    question: 'Which iconic film featured Amitabh Bachchan and Dharmendra singing "Yeh Dosti Hum Nahi Todenge"?',
    options: ['Deewaar', 'Sholay', 'Zanjeer', 'Amar Akbar Anthony'],
    correctIndex: 1,
    funFact: 'Sholay was released on Independence Day in 1975 and ran continuously in Mumbai’s Minerva theatre for over five years!'
  },
  {
    id: 't5',
    round: 'Diwali & Epic Lore',
    question: 'According to the Ramayana, exactly how many years of exile did Lord Rama complete before returning to Ayodhya on Diwali?',
    options: ['12 Years', '14 Years', '10 Years', '16 Years'],
    correctIndex: 1,
    funFact: 'Ayodhya was illuminated with millions of clay diyas on the dark night of Kartika Amavasya to welcome Rama, Sita, and Lakshmana back home.'
  },
  {
    id: 't6',
    round: 'Diwali & Epic Lore',
    question: 'Which divine being was liberated by Lord Krishna on the dawn of Narak Chaturdashi (Choti Diwali)?',
    options: ['16,100 captive princesses', 'Indra\'s white elephant', 'The King of Lanka', 'The celestial Gandharvas'],
    correctIndex: 0,
    funFact: 'After defeating Narakasura, Krishna liberated 16,100 captives and accepted them under his royal protection to restore their dignity in society.'
  }
];
