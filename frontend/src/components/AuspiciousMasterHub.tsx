/**
 * @license
 * MIT License
 *
 * Auspicious Master Hub - Production Launch Interface
 * Unifies all 5 core user launch features with 100% client-edge mathematical integrity:
 * - Screen 1 (auspicious-hub): 3-Path Onboarding, 24h Chrono-Dial, All 8 Interactive Solar/Lunar Kaalas (Modal + Inline Do's & Don'ts).
 * - Screen 2 (planner): Multi-Horizon Planner (96-slot Day, 7-day UTC-safe Week, Natal Month Grid, Astronomical 12-Sankranti Year).
 * - Screen 3 (remedies-attire): Synthesized Vaara + Active Hora + Natal Lagna Gemstone Safety + Footwear Shastric Matrix.
 * - Screen 4 (ai-muhurat): Real Astronomical Multi-Day Muhurat Scanner (Free-text form + 6 Presets, genuine un-inflated scores).
 * - Screen 5 (science-audit): 7-Layer Mathematical & Shastric Explainer.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { HighPrecisionAstroEngine, LocationCoordinates, DayAnalysisResult } from '../engine/zeroCostAstroEngine';
import { PersonalAuspiciousnessScoringEngine, NatalProfile, IntradayScoringSample } from '../engine/scoringEngine';
import { RemedialLifestyleEngine, PlanetaryRemedialGuidance, WindowActionGuidance } from '../engine/remedialLifestyleEngine';
import { MultimodalCalendarEngine, MonthLunarDaySummary, SolarSankrantiEvent } from '../engine/calendarEngine';
import { AuspiciousChronoDial } from './AuspiciousChronoDial';
import { AiNarrativeEngine, MuhuratConsultationResult } from '../engine/aiNarrativeEngine';
import { ModernLocationPicker } from './ModernLocationPicker';
import { AmPmTimePicker } from './AmPmTimePicker';
import { MuhuratCalculationExplainer } from './MuhuratCalculationExplainer';
import { PersonalProfileEngine, UserProfile } from '../engine/personalProfileEngine';
import { PersonalProfileModal, ProfileModalTab } from './PersonalProfileModal';
import { OfflineGeoResolver } from '../engine/offlineGeoData';
import { ActiveTab } from './Navigation';

export type TimeHorizon = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

const STORAGE_PROFILE_KEY = 'mmo_saved_profile_v1';
const STORAGE_LOCATION_KEY = 'mmo_saved_location_v1';

const DEFAULT_LOCATION: LocationCoordinates = {
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: 'Asia/Kolkata',
  timezoneOffset: 5.5,
  cityName: 'New Delhi, India'
};

const readStoredProfile = (): { profile: UserProfile; fromStorage: boolean } => {
  if (typeof window === 'undefined') {
    return { profile: PersonalProfileEngine.createUniversalProfile(), fromStorage: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      if (parsed && parsed.mode && typeof parsed.moonSignIndex === 'number') {
        return { profile: parsed, fromStorage: true };
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return { profile: PersonalProfileEngine.createUniversalProfile(), fromStorage: false };
};

const readStoredLocation = (): { location: LocationCoordinates; fromStorage: boolean } => {
  if (typeof window === 'undefined') {
    return { location: DEFAULT_LOCATION, fromStorage: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_LOCATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocationCoordinates;
      if (parsed && Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) {
        return { location: parsed, fromStorage: true };
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return { location: DEFAULT_LOCATION, fromStorage: false };
};

interface AuspiciousMasterHubProps {
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
}

export const AuspiciousMasterHub: React.FC<AuspiciousMasterHubProps> = ({
  activeTab = 'auspicious-hub',
  onTabChange
}) => {
  const [initialProfileState] = useState(readStoredProfile);
  const [initialLocationState] = useState(readStoredLocation);

  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfileState.profile);
  const [locCoords, setLocCoords] = useState<LocationCoordinates>(initialLocationState.location);
  const [hasSavedBrowserData, setHasSavedBrowserData] = useState<boolean>(
    initialProfileState.fromStorage || initialLocationState.fromStorage
  );

  const [horizon, setHorizon] = useState<TimeHorizon>('DAY');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    HighPrecisionAstroEngine.getObserverDateString(initialLocationState.location.timezoneOffset)
  );

  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<ProfileModalTab | undefined>(undefined);

  const [currentMinutesOfDay, setCurrentMinutesOfDay] = useState<number>(() => {
    const off = initialLocationState.location.timezoneOffset ?? 5.5;
    const obsNow = new Date(Date.now() + Math.round(off * 3600000));
    return obsNow.getUTCHours() * 60 + obsNow.getUTCMinutes();
  });

  const [selectedWindowName, setSelectedWindowName] = useState<string>('Abhijit Muhurta');
  const [selectedWindowSpan, setSelectedWindowSpan] = useState<string>('');
  const [isWindowDialogOpen, setIsWindowDialogOpen] = useState<boolean>(false);

  const [chatQuery, setChatQuery] = useState<string>('When is the best time for a high-stakes job interview this week?');
  const [chatResponse, setChatResponse] = useState<MuhuratConsultationResult | null>(null);

  useEffect(() => {
    if (!locCoords.timezone) return;
    const resolved = OfflineGeoResolver.resolveTimezoneOffsetForDate(
      locCoords.timezone,
      selectedDate,
      locCoords.timezoneOffset
    );
    if (resolved !== locCoords.timezoneOffset) {
      setLocCoords((prev) => ({ ...prev, timezoneOffset: resolved }));
    }
  }, [selectedDate, locCoords.timezone, locCoords.timezoneOffset]);

  useEffect(() => {
    if (!isWindowDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsWindowDialogOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isWindowDialogOpen]);

  const handlePersistProfile = (nextProfile: UserProfile) => {
    setUserProfile(nextProfile);
    try {
      window.localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(nextProfile));
      setHasSavedBrowserData(true);
    } catch {
      // Ignore private-browsing quota errors
    }
  };

  const handlePersistLocation = (nextLoc: LocationCoordinates) => {
    setLocCoords(nextLoc);
    try {
      window.localStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(nextLoc));
      setHasSavedBrowserData(true);
    } catch {
      // Ignore private-browsing quota errors
    }
  };

  const handleResetSavedData = () => {
    try {
      window.localStorage.removeItem(STORAGE_PROFILE_KEY);
      window.localStorage.removeItem(STORAGE_LOCATION_KEY);
    } catch {
      // Ignore storage errors
    }
    setUserProfile(PersonalProfileEngine.createUniversalProfile());
    setLocCoords(DEFAULT_LOCATION);
    setSelectedDate(HighPrecisionAstroEngine.getObserverDateString(DEFAULT_LOCATION.timezoneOffset));
    setHasSavedBrowserData(false);
  };

  const openProfileModal = (tab?: ProfileModalTab) => {
    setProfileModalInitialTab(tab);
    setIsProfileModalOpen(true);
  };

  const shiftSelectedDateByDays = (deltaDays: number) => {
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
      ? selectedDate
      : HighPrecisionAstroEngine.getObserverDateString(locCoords.timezoneOffset);
    const [y, m, d] = safe.split('-').map(Number);
    const shifted = new Date(Date.UTC(y, m - 1, d + deltaDays));
    setSelectedDate(shifted.toISOString().split('T')[0]);
  };

  const handleOpenWindowGuidance = (windowName: string, timeSpan?: string) => {
    setSelectedWindowName(windowName);
    setSelectedWindowSpan(timeSpan || '');
    setIsWindowDialogOpen(true);
  };

  const dayData: DayAnalysisResult = useMemo(() => {
    return HighPrecisionAstroEngine.analyzeFullDay(selectedDate, locCoords);
  }, [selectedDate, locCoords]);

  const isWednesday = dayData.dayOfWeekIndex === 3;
  const isAbhijitValid = dayData.fixedKaalas.abhijitMuhurta.isValidOnThisDay;

  const natalProfile: NatalProfile | undefined = useMemo(() => {
    if (userProfile.mode === 'UNIVERSAL') return undefined;
    return {
      natalMoonSignIndex: userProfile.moonSignIndex,
      natalMoonNakshatraIndex: userProfile.nakshatraIndex + 1,
      natalAscendantSignIndex: userProfile.ascendantSignIndex,
      natalNakshatraPada: userProfile.nakshatraPada
    };
  }, [userProfile]);

  const timeline: IntradayScoringSample[] = useMemo(() => {
    return PersonalAuspiciousnessScoringEngine.generate24HourTimeline(dayData, natalProfile);
  }, [dayData, natalProfile]);

  const currentInstant = useMemo(() => {
    const [y, m, d] = dayData.date.split('-').map(Number);
    const tzMins = Math.round((locCoords.timezoneOffset ?? 5.5) * 60);
    return new Date(Date.UTC(y, m - 1, d, 0, currentMinutesOfDay - tzMins));
  }, [dayData.date, currentMinutesOfDay, locCoords.timezoneOffset]);

  const currentSample: IntradayScoringSample = useMemo(() => {
    return PersonalAuspiciousnessScoringEngine.evaluateInstant(currentInstant, dayData, natalProfile);
  }, [currentInstant, dayData, natalProfile]);

  const dayLordGuidance: PlanetaryRemedialGuidance = useMemo(() => {
    const dayIdx = dayData.panchanga.vaara.dayIndex ?? dayData.dayOfWeekIndex;
    return RemedialLifestyleEngine.getSynthesizedLifestyleGuidance({
      dayIndex: dayIdx,
      activeHoraPlanet: currentSample.activeHoraPlanet,
      natalAscendantSignIndex: userProfile.ascendantSignIndex,
      isUniversalMode: userProfile.mode === 'UNIVERSAL',
      isRahuKaalActive: currentSample.isRahuKaalActive
    });
  }, [dayData, currentSample.activeHoraPlanet, currentSample.isRahuKaalActive, userProfile.ascendantSignIndex, userProfile.mode]);

  const activeWindowGuidance: WindowActionGuidance = useMemo(() => {
    return RemedialLifestyleEngine.getWindowActionGuidance(selectedWindowName, isWednesday);
  }, [selectedWindowName, isWednesday]);

  const footwearAnalysis = useMemo(() => {
    return RemedialLifestyleEngine.getFootwearComparativeAnalysis();
  }, []);

  const allKaalaCards = useMemo(() => {
    const fk = dayData.fixedKaalas;
    return [
      {
        key: 'Abhijit Muhurta',
        icon: isAbhijitValid ? '✨' : '⚠️',
        title: 'Abhijit Muhurta',
        badge: isAbhijitValid ? 'Auspicious' : 'Cancelled (Wed)',
        span12Hr: `${fk.abhijitMuhurta.start12Hr} – ${fk.abhijitMuhurta.end12Hr}`,
        desc: isAbhijitValid
          ? 'Midday solar victor window neutralizing minor transit obstacles.'
          : 'Cancelled on Wednesdays per Muhurta Chintamani due to midday Rahu Kaal overlap.',
        tone: isAbhijitValid ? 'emerald' : 'amber'
      },
      {
        key: 'Brahma Muhurta',
        icon: '🧘',
        title: 'Brahma Muhurta',
        badge: 'Spiritual',
        span12Hr: `${fk.brahmaMuhurta.start12Hr} – ${fk.brahmaMuhurta.end12Hr}`,
        desc: 'Pre-dawn ambrosial creator hour for meditation, clarity, and deep study.',
        tone: 'blue'
      },
      {
        key: 'Vijaya Muhurta',
        icon: '🏆',
        title: 'Vijaya Muhurta',
        badge: 'Victory',
        span12Hr: `${fk.vijayaMuhurta.start12Hr} – ${fk.vijayaMuhurta.end12Hr}`,
        desc: 'Afternoon conqueror window for interviews, pitches, and negotiations.',
        tone: 'emerald'
      },
      {
        key: 'Rahu Kaalam',
        icon: '🔴',
        title: 'Rahu Kaalam',
        badge: 'Inauspicious',
        span12Hr: `${fk.rahuKaal.start12Hr} – ${fk.rahuKaal.end12Hr}`,
        desc: 'Shadow avoidance octant—postpone new contracts, launches, and departures.',
        tone: 'rose'
      },
      {
        key: 'Amrit Kaal',
        icon: '🍯',
        title: 'Lunar Amrit Kaal',
        badge: 'Nectar Span',
        span12Hr: `${fk.amritKaal.start12Hr} – ${fk.amritKaal.end12Hr}`,
        desc: `Nakshatra Amritadi Ghati window (${dayData.panchanga.nakshatra.name}) for healing & prosperity.`,
        tone: 'emerald'
      },
      {
        key: 'Godhuli Kaal',
        icon: '🌇',
        title: 'Godhuli Bela',
        badge: 'Sandhya',
        span12Hr: `${fk.godhuliKaal.start12Hr} – ${fk.godhuliKaal.end12Hr}`,
        desc: 'Sacred sunset twilight window auspicious for lamps, prayer, and homecoming.',
        tone: 'blue'
      },
      {
        key: 'Gulika Kaal',
        icon: '🪙',
        title: 'Gulika Kaalam',
        badge: 'Compounding',
        span12Hr: `${fk.gulikaKaal.start12Hr} – ${fk.gulikaKaal.end12Hr}`,
        desc: 'Constructive repetition span—favorable for savings & gold; avoid taking debt.',
        tone: 'amber'
      },
      {
        key: 'Yamaghanta',
        icon: '⚡',
        title: 'Yamaghantam',
        badge: 'Inauspicious',
        span12Hr: `${fk.yamaghanta.start12Hr} – ${fk.yamaghanta.end12Hr}`,
        desc: 'Cautionary Yama octant—avoid commencing travel, loans, or store openings.',
        tone: 'rose'
      }
    ] as const;
  }, [dayData, isAbhijitValid]);

  const monthDays: MonthLunarDaySummary[] = useMemo(() => {
    if (horizon !== 'MONTH') return [];
    const [y, m] = dayData.date.split('-').map(Number);
    return MultimodalCalendarEngine.generateMonthGrid(y, m, locCoords, natalProfile);
  }, [horizon, dayData.date, locCoords, natalProfile]);

  const yearSankrantis: SolarSankrantiEvent[] = useMemo(() => {
    if (horizon !== 'YEAR') return [];
    const [y] = dayData.date.split('-').map(Number);
    return MultimodalCalendarEngine.generateAnnualSankrantiCalendar(y, locCoords, natalProfile);
  }, [horizon, dayData.date, locCoords, natalProfile]);

  const weekDays = useMemo(() => {
    if (horizon !== 'WEEK') return [];
    const [y, m, d] = dayData.date.split('-').map(Number);
    const baseUtc = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = baseUtc.getUTCDay();
    const startUtc = new Date(Date.UTC(y, m - 1, d - dayOfWeek));
    const tzMins = Math.round((locCoords.timezoneOffset ?? 5.5) * 60);

    return Array.from({ length: 7 }, (_, i) => {
      const curUtc = new Date(Date.UTC(startUtc.getUTCFullYear(), startUtc.getUTCMonth(), startUtc.getUTCDate() + i));
      const curStr = curUtc.toISOString().split('T')[0];
      const [cy, cm, cd] = curStr.split('-').map(Number);
      const dAnalysis = HighPrecisionAstroEngine.analyzeFullDay(curStr, locCoords);
      const evalUtc = new Date(Date.UTC(cy, cm - 1, cd, 0, 10 * 60 + 30 - tzMins));
      const score = PersonalAuspiciousnessScoringEngine.evaluateInstant(evalUtc, dAnalysis, natalProfile);
      const abhijitValid = dAnalysis.fixedKaalas.abhijitMuhurta.isValidOnThisDay;

      return {
        date: curStr,
        dayName: dAnalysis.panchanga.vaara.name.split(' ')[0],
        tithi: `${dAnalysis.panchanga.tithi.paksha} ${dAnalysis.panchanga.tithi.name}`,
        nakshatra: dAnalysis.panchanga.nakshatra.name,
        score: score.auspiciousnessScore,
        tier: score.tier,
        abhijit: abhijitValid
          ? `${dAnalysis.fixedKaalas.abhijitMuhurta.start12Hr} – ${dAnalysis.fixedKaalas.abhijitMuhurta.end12Hr}`
          : 'Cancelled (Wed)',
        rahuKaal: `${dAnalysis.fixedKaalas.rahuKaal.start12Hr} – ${dAnalysis.fixedKaalas.rahuKaal.end12Hr}`
      };
    });
  }, [horizon, dayData.date, locCoords, natalProfile]);

  const handleQuickPreset = (presetId: string) => {
    const result = AiNarrativeEngine.evaluateMuhuratQuery({
      queryOrPreset: presetId,
      selectedDate: dayData.date,
      currentMinutesOfDay,
      location: locCoords,
      natal: natalProfile
    });
    setChatQuery(result.evaluatedQuery);
    setChatResponse(result);
  };

  const handleCustomAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatQuery.trim() || 'What is the best auspicious Golden Window today?';
    const result = AiNarrativeEngine.evaluateMuhuratQuery({
      queryOrPreset: trimmed,
      customText: trimmed,
      selectedDate: dayData.date,
      currentMinutesOfDay,
      location: locCoords,
      natal: natalProfile
    });
    setChatResponse(result);
  };

  return (
    <div className="space-y-8 animate-fade-in text-rose-100">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch scroll-mt-28">
        <div className="lg:col-span-5">
          <ModernLocationPicker
            currentLocation={locCoords}
            selectedDate={dayData.date}
            onLocationChange={handlePersistLocation}
          />
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-rose-950 bg-[#160408] p-4 text-xs space-y-3 shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
              📅 Evaluation Date
            </span>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="font-serif text-base font-bold text-amber-100">
                {dayData.panchanga.vaara.name}
              </span>
              <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/30">
                {dayData.panchanga.tithi.paksha} {dayData.panchanga.tithi.name}
              </span>
            </div>
          </div>

          <input
            type="date"
            aria-label="Global evaluation date"
            value={dayData.date}
            onChange={(e) => {
              if (e.target.value && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
                setSelectedDate(e.target.value);
              }
            }}
            className="w-full rounded-xl border border-rose-900 bg-[#20060e] px-3 py-2 text-xs text-rose-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
          />

          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-rose-950/80">
            <button
              type="button"
              onClick={() => shiftSelectedDateByDays(-1)}
              className="rounded-lg bg-[#20060e] hover:bg-rose-900/60 py-1 text-[11px] text-rose-200 border border-rose-950 transition-colors"
            >
              ◀ Prev
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(HighPrecisionAstroEngine.getObserverDateString(locCoords.timezoneOffset))}
              className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 py-1 text-[11px] font-bold text-amber-200 border border-amber-500/40 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftSelectedDateByDays(1)}
              className="rounded-lg bg-[#20060e] hover:bg-rose-900/60 py-1 text-[11px] text-rose-200 border border-rose-950 transition-colors"
            >
              Next ▶
            </button>
          </div>
        </div>

        <div className="lg:col-span-4">
          <AmPmTimePicker
            currentMinutes={currentMinutesOfDay}
            onChangeMinutes={setCurrentMinutesOfDay}
            timezoneLabel={locCoords.cityName}
            timezoneOffset={locCoords.timezoneOffset}
          />
        </div>
      </div>

      {activeTab === 'auspicious-hub' && (
        <div className="space-y-8 animate-fade-in">
          <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-[#280713] via-[#1a050d] to-[#280713] p-5 shadow-2xl space-y-4 scroll-mt-28">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-950 pb-4">
              <div className="flex items-start sm:items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl border border-amber-500/40">
                  {userProfile.mode === 'UNIVERSAL' ? '🌍' : '👤'}
                </span>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-amber-200">
                      {userProfile.mode === 'UNIVERSAL'
                        ? 'Universal City Timing Mode'
                        : `Auspicious Timings Personalized for ${userProfile.name}`}
                    </h2>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-mono text-emerald-300">
                      {userProfile.mode === 'NON_TECHNICAL_WIZARD' && '🌟 108-Pada Swara Shastra'}
                      {userProfile.mode === 'BIRTH_DETAILS' && '📜 Exact Drik Birth Kundali'}
                      {userProfile.mode === 'UNIVERSAL' && '🌍 Macrocosmic Solar Alignment'}
                    </span>
                  </div>
                  <p className="text-xs text-rose-300/80">
                    {userProfile.derivationSummary}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openProfileModal()}
                  className="rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black hover:from-amber-400 hover:to-amber-500 transition-all shadow-md flex items-center gap-1.5"
                >
                  <span>✏️</span>
                  <span>Customize Profile</span>
                </button>
                {userProfile.mode !== 'UNIVERSAL' && (
                  <button
                    type="button"
                    onClick={() => handlePersistProfile(PersonalProfileEngine.createUniversalProfile())}
                    className="rounded-xl border border-rose-800/60 bg-[#160408] px-3 py-2 text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/60 transition-all"
                  >
                    Switch to Universal Mode
                  </button>
                )}
                {hasSavedBrowserData && (
                  <button
                    type="button"
                    onClick={handleResetSavedData}
                    className="rounded-xl border border-rose-800/60 bg-[#160408] px-3 py-2 text-xs font-medium text-rose-300 hover:text-rose-100 hover:border-rose-500 transition-all"
                    title="Clear saved profile & location from browser storage"
                  >
                    🗑️ Reset Saved Data
                  </button>
                )}
              </div>
            </div>

            {userProfile.mode === 'UNIVERSAL' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => openProfileModal('WIZARD')}
                  className="text-left rounded-xl border border-amber-500/40 bg-amber-950/25 hover:bg-amber-950/45 p-3.5 space-y-1 transition-all"
                >
                  <span className="font-bold text-amber-300 flex items-center justify-between">
                    <span>🌟 Path 1: No Birth Details?</span>
                    <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">20-Sec Quiz →</span>
                  </span>
                  <p className="text-[11px] text-rose-200/80 leading-relaxed">
                    Derive your Naam Nakshatra (108-Pada Avakahada), Rashi &amp; Prashna Lagna from your calling name and behavioral Tattva.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => openProfileModal('EXACT')}
                  className="text-left rounded-xl border border-blue-500/40 bg-blue-950/25 hover:bg-blue-950/45 p-3.5 space-y-1 transition-all"
                >
                  <span className="font-bold text-blue-300 flex items-center justify-between">
                    <span>📜 Path 2: Have Birth Details?</span>
                    <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-200">DOB + TOB →</span>
                  </span>
                  <p className="text-[11px] text-rose-200/80 leading-relaxed">
                    Enter Date, 12-Hour AM/PM Time &amp; Place of Birth for exact Drik Lagna and ELP2000 Janma Nakshatra synastry.
                  </p>
                </button>

                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 space-y-1">
                  <span className="font-bold text-emerald-300 flex items-center justify-between">
                    <span>🌍 Path 3: Universal City Mode</span>
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">✓ Active</span>
                  </span>
                  <p className="text-[11px] text-rose-200/80 leading-relaxed">
                    Zero personal input required—pure topocentric solar Kaalas, Choghadiyas, and Horas for {locCoords.cityName}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-amber-900/40 bg-black/40 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-rose-400/80 block">
                    Your Personal Harmonic
                  </span>
                  <div className="text-sm font-bold text-amber-300">
                    {userProfile.nakshatraName} (Pada {userProfile.nakshatraPada})
                  </div>
                  <div className="text-[11px] text-rose-200/90">
                    Moon in <span className="text-white font-medium">{userProfile.moonSignName}</span> · {userProfile.ascendantSignName} Lagna
                  </div>
                </div>

                <div className="rounded-xl border border-amber-900/40 bg-black/40 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-rose-400/80 block">
                    Active Tara Bala ({currentSample.localTime12Hr})
                  </span>
                  <div className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>{currentSample.taraBalaCategory}</span>
                  </div>
                  <div className="text-[11px] text-rose-200/90">
                    Evaluated against instantaneous transit Moon Nakshatra
                  </div>
                </div>

                <div className="rounded-xl border border-amber-900/40 bg-black/40 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-rose-400/80 block">
                    Active Chandra Bala
                  </span>
                  <div className="text-sm font-bold text-amber-200">
                    House {currentSample.chandraBalaHouse} from Natal Moon
                  </div>
                  <div className={`text-[11px] font-medium ${
                    currentSample.isAshtamaChandra
                      ? 'text-rose-400 font-bold'
                      : [1, 3, 6, 7, 10, 11].includes(currentSample.chandraBalaHouse)
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }`}>
                    {currentSample.isAshtamaChandra
                      ? '⚠️ Ashtama Chandra (8th House Caution)'
                      : [1, 3, 6, 7, 10, 11].includes(currentSample.chandraBalaHouse)
                      ? '✓ Auspicious Lunar Transit'
                      : '⚡ Moderate Lunar Transit'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <AuspiciousChronoDial
            selectedDate={dayData.date}
            location={locCoords}
            natal={natalProfile}
            currentMinutesOfDay={currentMinutesOfDay}
            onMinutesChange={setCurrentMinutesOfDay}
            onSelectWindow={handleOpenWindowGuidance}
          />

          <section className="rounded-2xl border border-rose-950 bg-[#160408] p-5 sm:p-6 space-y-5 shadow-xl scroll-mt-28">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-950 pb-3">
              <div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-amber-300 flex items-center gap-2">
                  <span>⏱️</span> Today&apos;s Solar Kaalas &amp; Muhurta Windows
                </h3>
                <p className="text-xs text-rose-300/80">
                  Calculated for {locCoords.cityName} on {dayData.date} (Sunrise: {dayData.solarMetrics.sunrise12Hr} · Sunset: {dayData.solarMetrics.sunset12Hr})
                </p>
              </div>
              <span className="text-[11px] text-amber-300 font-mono bg-amber-500/15 border border-amber-500/40 px-3 py-1 rounded-full">
                👆 Click any window to open Do&apos;s &amp; Don&apos;ts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {allKaalaCards.map((card) => {
                const isSelected = selectedWindowName.toLowerCase().includes(card.key.toLowerCase().slice(0, 5));
                const toneClasses =
                  card.tone === 'emerald'
                    ? 'border-emerald-700/60 bg-[#0d2215]/60 hover:border-emerald-400 text-emerald-100'
                    : card.tone === 'blue'
                    ? 'border-blue-700/60 bg-[#0c182a]/60 hover:border-blue-400 text-blue-100'
                    : card.tone === 'amber'
                    ? 'border-amber-600/60 bg-[#291808]/60 hover:border-amber-400 text-amber-100'
                    : 'border-rose-700/60 bg-[#2b080f]/60 hover:border-rose-400 text-rose-100';

                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => handleOpenWindowGuidance(card.key, card.span12Hr)}
                    className={`text-left rounded-xl border p-3.5 space-y-1.5 transition-all cursor-pointer hover:scale-[1.01] ${toneClasses} ${
                      isSelected ? 'ring-2 ring-amber-400 shadow-xl' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-amber-200 text-xs flex items-center gap-1.5">
                        <span>{card.icon}</span>
                        <span>{card.title}</span>
                      </span>
                      <span className="text-[10px] bg-black/50 px-2 py-0.5 rounded font-bold border border-white/10">
                        {card.badge}
                      </span>
                    </div>
                    <div className="font-mono text-sm sm:text-base font-bold text-white">
                      {card.span12Hr}
                    </div>
                    <p className="text-[11px] opacity-85 leading-snug">
                      {card.desc}
                    </p>
                    <div className="pt-1 text-[10px] font-semibold text-amber-300 flex items-center justify-between border-t border-white/10">
                      <span>📋 View Do&apos;s, Don&apos;ts &amp; Remedy</span>
                      <span>→</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/50 bg-[#1a050d] p-4 sm:p-5 space-y-4 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-950 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-lg border border-amber-500/40">
                    📋
                  </span>
                  <div>
                    <h4 className="font-serif text-sm sm:text-base font-bold text-amber-200">
                      Do&apos;s, Don&apos;ts &amp; Mitigations: {activeWindowGuidance.title}
                    </h4>
                    <p className="text-[11px] text-rose-300/80">
                      {selectedWindowSpan ? `${selectedWindowSpan} · ` : ''}{dayData.date} ({locCoords.cityName})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    activeWindowGuidance.auspiciousness === 'AUSPICIOUS'
                      ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
                      : activeWindowGuidance.auspiciousness === 'INAUSPICIOUS'
                      ? 'border-rose-600 bg-rose-950 text-rose-200'
                      : 'border-amber-600 bg-amber-950 text-amber-300'
                  }`}>
                    {activeWindowGuidance.auspiciousness}
                  </span>
                  {onTabChange && (
                    <button
                      type="button"
                      onClick={() => onTabChange('remedies-attire')}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
                    >
                      Full Lifestyle &amp; Attire Matrix →
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-emerald-900/60 bg-[#0c1f13]/60 p-3.5 space-y-2">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                    <span>✅</span> Recommended Actions (Do&apos;s):
                  </span>
                  <ul className="space-y-1.5 list-disc pl-4 text-emerald-100/90 leading-relaxed text-[11px]">
                    {activeWindowGuidance.recommendedActions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-rose-900/60 bg-[#25070e]/60 p-3.5 space-y-2">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                    <span>❌</span> Prohibited Actions (Don&apos;ts):
                  </span>
                  <ul className="space-y-1.5 list-disc pl-4 text-rose-100/90 leading-relaxed text-[11px]">
                    {activeWindowGuidance.prohibitedActions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-amber-600/40 bg-[#260914] p-3.5 text-xs space-y-1">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🛡️</span> Classical Shastric Emergency Mitigation:
                </span>
                <p className="text-amber-100/90 leading-relaxed pl-5 text-[11px]">
                  {activeWindowGuidance.emergencyMitigation}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'planner' && (
        <div className="space-y-6 animate-fade-in scroll-mt-28">
          <div className="rounded-2xl border border-rose-950 bg-[#160408] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-amber-300">
                  Multi-Horizon Auspicious Timing Planner
                </h2>
                <p className="text-[11px] text-rose-300/80">
                  {userProfile.mode === 'UNIVERSAL'
                    ? `Universal Macrocosmic Calendar for ${locCoords.cityName}`
                    : `Personalized with ${userProfile.name}'s ${userProfile.nakshatraName} Tara & Chandra Bala`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl bg-[#22070e] p-1 border border-rose-950">
                {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as TimeHorizon[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorizon(h)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      horizon === h
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                        : 'text-rose-200/70 hover:text-white'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {horizon === 'DAY' && (
            <div className="rounded-2xl border border-rose-950 bg-[#160408] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-serif text-base font-bold text-amber-300">
                  96 Intraday 15-Minute Windows for {dayData.date} ({locCoords.cityName})
                </h3>
                <span className="text-[11px] text-rose-300">Click any row to set evaluation clock</span>
              </div>
              <div className="max-h-96 overflow-y-auto rounded-xl border border-rose-950 bg-[#110307]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-[#20060e] border-b border-rose-900 text-amber-300">
                    <tr>
                      <th className="py-2 px-3">Local Time</th>
                      <th className="py-2 px-3">Score</th>
                      <th className="py-2 px-3">Tier</th>
                      <th className="py-2 px-3">Choghadiya</th>
                      <th className="py-2 px-3">Hora</th>
                      <th className="py-2 px-3">Executive Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-950/60 text-rose-200">
                    {timeline.map((s, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setCurrentMinutesOfDay(idx * 15)}
                        className="hover:bg-amber-950/30 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 font-mono font-semibold text-amber-200 whitespace-nowrap">{s.localTime12Hr}</td>
                        <td className="py-2 px-3 font-bold" style={{ color: s.colorHex }}>{s.auspiciousnessScore}%</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${s.colorHex}22`, color: s.colorHex }}>
                            {s.tier}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-rose-300">{s.activeChoghadiya}</td>
                        <td className="py-2 px-3 text-rose-300">{s.activeHora}</td>
                        <td className="py-2 px-3 text-rose-100 text-[11px]">{s.executiveAdvice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {horizon === 'WEEK' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
              {weekDays.map((w) => (
                <button
                  key={w.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(w.date);
                    setHorizon('DAY');
                  }}
                  className={`text-left rounded-2xl border p-4 space-y-2.5 transition-all hover:scale-[1.02] ${
                    w.tier === 'AMRITHAM'
                      ? 'border-emerald-600/50 bg-[#0c2415]/50'
                      : w.tier === 'SHUBHA'
                      ? 'border-blue-600/50 bg-[#0d1c2d]/50'
                      : w.tier === 'VARJYA'
                      ? 'border-rose-700/50 bg-[#28080f]/50'
                      : 'border-amber-700/50 bg-[#251508]/50'
                  } ${w.date === dayData.date ? 'ring-2 ring-amber-400' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-200 text-sm">{w.dayName}</span>
                    <span className="text-[10px] font-mono text-rose-300">{w.date.slice(5)}</span>
                  </div>
                  <div className="font-bold text-2xl text-white font-serif">{w.score}%</div>
                  <div className="text-[11px] text-rose-200 space-y-0.5">
                    <p><strong className="text-amber-300">Tithi:</strong> {w.tithi}</p>
                    <p><strong className="text-amber-300">Nakshatra:</strong> {w.nakshatra}</p>
                  </div>
                  <div className="border-t border-rose-950 pt-2 text-[10px] space-y-1">
                    <p className="text-emerald-300 font-semibold">✨ Abhijit: {w.abhijit}</p>
                    <p className="text-rose-300">⚠️ Rahu: {w.rahuKaal}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {horizon === 'MONTH' && (
            <div className="rounded-2xl border border-rose-950 bg-[#160408] p-5 space-y-4">
              <h3 className="font-serif text-base font-bold text-amber-300">
                Lunar Month Calendar &amp; Daily Auspiciousness Heatmap ({dayData.date.slice(0, 7)})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-xs">
                {monthDays.map((m) => (
                  <button
                    key={m.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(m.date);
                      setHorizon('DAY');
                    }}
                    className={`text-left rounded-xl border p-3 space-y-1.5 transition-all hover:border-amber-400 ${
                      m.date === dayData.date ? 'ring-2 ring-amber-400 bg-[#2a0915]' : 'border-rose-950 bg-[#220710]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-200">Day {m.dayOfMonth}</span>
                      <span className="text-[10px] font-bold font-mono" style={{ color: m.primaryEnergyColor }}>
                        {m.dailyScore}%
                      </span>
                    </div>
                    <p className="font-semibold text-rose-100 text-xs truncate">{m.paksha} {m.tithiName}</p>
                    <p className="text-[10px] text-rose-300/80 truncate">⭐ {m.nakshatraName}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {m.taraLabel && <span className="rounded bg-black/40 text-amber-200 px-1 text-[9px]">{m.taraLabel}</span>}
                      {m.isAshtamaChandra && <span className="rounded bg-rose-600/30 text-rose-200 px-1 text-[9px] font-bold">Ashtama</span>}
                      {m.isEkadashi && <span className="rounded bg-amber-500/30 text-amber-200 px-1 text-[9px] font-bold">Ekadashi</span>}
                      {m.isPradosham && <span className="rounded bg-blue-500/30 text-blue-200 px-1 text-[9px] font-bold">Pradosham</span>}
                      {m.isPurnima && <span className="rounded bg-emerald-500/30 text-emerald-200 px-1 text-[9px] font-bold">Purnima</span>}
                      {m.isAmavasya && <span className="rounded bg-rose-500/30 text-rose-200 px-1 text-[9px] font-bold">Amavasya</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {horizon === 'YEAR' && (
            <div className="rounded-2xl border border-rose-950 bg-[#160408] p-5 space-y-4">
              <h3 className="font-serif text-base font-bold text-amber-300">
                12 Astronomical Solar Sankrantis &amp; Local Punya Kaal Windows ({dayData.date.slice(0, 4)})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                {yearSankrantis.map((s) => (
                  <button
                    key={s.zodiacSign}
                    type="button"
                    onClick={() => {
                      setSelectedDate(s.ingressDate);
                      setHorizon('DAY');
                    }}
                    className="text-left rounded-xl border border-amber-900/50 bg-[#220710] p-4 space-y-2 hover:border-amber-400 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-sm">{s.zodiacSign}</span>
                      <span className="font-mono text-rose-300 text-xs">{s.ingressDate}</span>
                    </div>
                    <div className="text-[11px] text-emerald-300 font-semibold">
                      🌊 Punya Kaal: {s.approximatePunyaKaalSpan}
                    </div>
                    {s.personalTransitHouse && (
                      <div className="text-[10px] font-mono text-amber-200">
                        Natal Moon Transit: House {s.personalTransitHouse}
                      </div>
                    )}
                    <p className="text-rose-200/90 text-[11px] leading-relaxed">
                      {s.spiritualSignificance}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'remedies-attire' && (
        <div className="space-y-6 animate-fade-in scroll-mt-28">
          <section className="rounded-2xl border border-amber-800/80 bg-gradient-to-br from-[#21060f] to-[#120308] p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-950 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-amber-300 flex items-center gap-2">
                  <span>📋</span> Actions &amp; Shastric Mitigations: {activeWindowGuidance.title}
                </h3>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Select any solar Kaala or planetary Hora below to inspect its Do&apos;s, Don&apos;ts &amp; Remedy:
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border self-start sm:self-center ${
                activeWindowGuidance.auspiciousness === 'AUSPICIOUS'
                  ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
                  : activeWindowGuidance.auspiciousness === 'INAUSPICIOUS'
                  ? 'border-rose-600 bg-rose-950 text-rose-200'
                  : 'border-amber-600 bg-amber-950 text-amber-300'
              }`}>
                {activeWindowGuidance.auspiciousness}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                'Abhijit Muhurta',
                'Brahma Muhurta',
                'Vijaya Muhurta',
                'Rahu Kaalam',
                'Yamaghanta',
                'Gulika Kaal',
                'Amrit Kaal',
                'Godhuli Kaal',
                currentSample.activeHora,
                `${currentSample.activeChoghadiyaName} Choghadiya`
              ].map((wName) => (
                <button
                  key={wName}
                  type="button"
                  onClick={() => setSelectedWindowName(wName)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                    selectedWindowName === wName
                      ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                      : 'bg-[#170409] text-rose-200 border-rose-900 hover:border-amber-600'
                  }`}
                >
                  {wName}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-emerald-900/60 bg-[#0c1f13]/60 p-4 space-y-2">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                  <span>✅</span> Recommended Actions (Do&apos;s):
                </span>
                <ul className="space-y-1.5 list-disc pl-4 text-emerald-100/90 leading-relaxed">
                  {activeWindowGuidance.recommendedActions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-rose-900/60 bg-[#25070e]/60 p-4 space-y-2">
                <span className="font-bold text-rose-300 flex items-center gap-1.5 text-sm">
                  <span>❌</span> Prohibited Actions (Don&apos;ts):
                </span>
                <ul className="space-y-1.5 list-disc pl-4 text-rose-100/90 leading-relaxed">
                  {activeWindowGuidance.prohibitedActions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-amber-600/50 bg-[#240a13] p-4 text-xs space-y-1">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>🛡️</span> Classical Shastric Emergency Mitigation:
              </span>
              <p className="text-amber-100/90 leading-relaxed pl-5">
                {activeWindowGuidance.emergencyMitigation}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-900/60 bg-[#18040a] p-6 space-y-6">
            <div className="border-b border-rose-950 pb-3 space-y-1">
              <h2 className="font-serif text-xl font-bold text-amber-300 flex items-center gap-2">
                <span>🎨</span> Daily Attire, Live Hora Accent, Metals &amp; Footwear Guide
              </h2>
              <p className="text-xs text-rose-300/80">
                Vaara Lord: <strong className="text-amber-200">{dayLordGuidance.planetName} ({dayLordGuidance.sanskritName})</strong> · Active Clock Hora ({currentSample.localTime12Hr}): <strong className="text-emerald-300">{currentSample.activeHora}</strong>
              </p>
            </div>

            {dayLordGuidance.horaTacticalAccent && (
              <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/25 p-3.5 text-xs text-emerald-100">
                ⏱️ <strong>Real-Time Hora Styling ({currentSample.localTime12Hr}):</strong> {dayLordGuidance.horaTacticalAccent}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border border-amber-800/60 bg-[#220710] p-4 space-y-3">
                <span className="font-bold text-amber-300 block text-sm">👔 Recommended Colors &amp; Attire</span>
                <div>
                  <span className="text-[11px] text-emerald-400 font-semibold block mb-1">Auspicious Colors to Wear:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dayLordGuidance.primaryColors.map((color) => (
                      <span key={color} className="rounded-md bg-amber-500/20 px-2.5 py-1 text-amber-200 font-medium">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-rose-400 font-semibold block mb-1">Colors to Avoid:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dayLordGuidance.colorsToAvoid.map((color) => (
                      <span key={color} className="rounded-md bg-rose-950/60 px-2 py-0.5 text-rose-300 line-through">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-rose-200/90 leading-relaxed text-[11px] pt-1">
                  {dayLordGuidance.fabricsAndAttire}
                </p>
              </div>

              <div className="rounded-xl border border-amber-800/60 bg-[#220710] p-4 space-y-3">
                <span className="font-bold text-amber-300 block text-sm">💍 Metals &amp; Lagna-Safe Gemstones</span>
                <div>
                  <span className="text-[11px] text-amber-300 font-semibold block mb-1">Recommended Metals:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dayLordGuidance.metals.map((m) => (
                      <span key={m} className="rounded-md bg-amber-950 px-2.5 py-1 text-amber-200 font-medium border border-amber-700/40">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-amber-300 font-semibold block mb-1">Recommended Ratna / Upratna:</span>
                  <span className="inline-block rounded-md bg-rose-950 px-2.5 py-1 text-rose-100 font-bold border border-rose-700/50">
                    {dayLordGuidance.gemstone}
                  </span>
                </div>
                {dayLordGuidance.gemstoneSafetyNote && (
                  <p className="rounded-lg bg-black/40 border border-amber-900/40 p-2 text-[11px] text-amber-200/90 leading-snug">
                    {dayLordGuidance.gemstoneSafetyNote}
                  </p>
                )}
                <div className="border-t border-rose-950 pt-2 text-[10px] text-rose-400">
                  <span>Mantra: </span>
                  <code className="text-amber-300">{dayLordGuidance.spiritualMantra}</code>
                </div>
              </div>

              <div className="rounded-xl border border-amber-800/60 bg-[#220710] p-4 space-y-3">
                <span className="font-bold text-amber-300 block text-sm">👞 Footwear: Leather vs Sports vs Paduka</span>
                <div className="rounded-lg bg-[#18040a] p-2.5 border border-rose-950">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Today&apos;s Best Match:</span>
                  <span className="font-semibold text-rose-100 text-xs">{dayLordGuidance.footwearGuidance.summary}</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-rose-200">
                  <p><strong className="text-amber-200">🏃 Sports Shoes:</strong> {dayLordGuidance.footwearGuidance.sportsShoeSuitability}</p>
                  <p><strong className="text-amber-200">👞 Leather Shoes:</strong> {dayLordGuidance.footwearGuidance.leatherSuitability}</p>
                  <p><strong className="text-amber-200">🪵 Barefoot/Paduka:</strong> {dayLordGuidance.footwearGuidance.woodenPadukaSuitability}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-rose-950 bg-[#1b050d] p-4 overflow-x-auto text-xs">
              <h4 className="font-serif font-bold text-amber-300 mb-3 text-sm">
                Shastric Footwear Comparative Matrix (Why &amp; When to Wear Each)
              </h4>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-rose-900 text-rose-300 font-semibold">
                    <th className="py-2 pr-3">Footwear Type</th>
                    <th className="py-2 pr-3">Governing Planet &amp; Element</th>
                    <th className="py-2 pr-3">Ideal Scenarios</th>
                    <th className="py-2 pr-3">Shastric Energetic Impact</th>
                    <th className="py-2">Critical Restrictions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-950 text-rose-200/90">
                  {footwearAnalysis.map((f) => (
                    <tr key={f.type} className="hover:bg-rose-950/30">
                      <td className="py-2.5 pr-3 font-semibold text-amber-200">{f.type}</td>
                      <td className="py-2.5 pr-3 text-rose-300">{f.governingPlanet} ({f.element})</td>
                      <td className="py-2.5 pr-3">{f.idealScenarios}</td>
                      <td className="py-2.5 pr-3 text-[11px]">{f.shastricSignificance}</td>
                      <td className="py-2.5 text-rose-400 text-[11px] font-medium">{f.precaution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'ai-muhurat' && (
        <div className="space-y-6 animate-fade-in scroll-mt-28">
          <section className="rounded-2xl border border-amber-800/70 bg-[#1a050c] p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-950 pb-3">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-amber-300 flex items-center gap-2">
                  <span>🤖</span> AI Muhurat Assistant &amp; Multi-Day Astronomical Scanner
                </h2>
                <p className="text-xs text-rose-300/80 mt-1">
                  Ask any natural-language timing question (e.g., &ldquo;next Tuesday&rdquo;, &ldquo;tomorrow&rdquo;, &ldquo;house lease&rdquo;) or choose a 1-click life milestone preset.
                </p>
              </div>
              <span className="text-[11px] text-emerald-300 font-mono bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800">
                100% Client-Edge Ephemeris Scanner
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { id: 'INTERVIEW', label: '💼 Job Interview', desc: 'Vijaya & Budha/Guru' },
                { id: 'SHOP_OPENING', label: '🏪 Shop Opening', desc: 'Fixed Lagna + Labh' },
                { id: 'PROPOSE', label: '💍 Propose / Marriage', desc: 'Venus Hora + Shubh' },
                { id: 'TRADING', label: '📈 Stock Trading', desc: 'Budha Hora + Labh' },
                { id: 'PROPERTY', label: '🏡 Property / Lease', desc: 'Fixed Lagna + Guru' },
                { id: 'VEHICLE', label: '🚗 Vehicle Delivery', desc: 'Char / Amrit Span' }
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleQuickPreset(preset.id)}
                  className="flex flex-col text-left rounded-xl border border-amber-900/80 bg-[#240812] p-3 hover:border-amber-500/80 hover:bg-[#330b19] transition-all hover:scale-[1.02]"
                >
                  <span className="text-xs font-semibold text-amber-200">{preset.label}</span>
                  <span className="text-[10px] text-rose-300/70">{preset.desc}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleCustomAiSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                aria-label="Ask any timing question"
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Ask any timing question (e.g. When should I sign a house lease next Tuesday?)..."
                className="flex-1 rounded-xl border border-rose-900 bg-[#22070e] px-4 py-2.5 text-xs text-rose-100 placeholder-rose-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:from-amber-400 hover:to-amber-500 transition-all"
              >
                Ask AI
              </button>
            </form>

            {chatResponse && (
              <div className="rounded-xl border border-amber-600/60 bg-gradient-to-br from-[#250711] to-[#160309] p-5 text-xs space-y-3.5 animate-fade-in shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-950 pb-2.5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
                      Evaluated Domain: {chatResponse.intentLabel} · Query: &ldquo;{chatResponse.evaluatedQuery}&rdquo;
                    </span>
                    <span className="font-semibold text-amber-200 text-sm block">
                      🌟 Recommended Golden Window: {chatResponse.bestWindow}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-950 px-3 py-1 text-emerald-300 font-mono font-bold text-xs border border-emerald-700/50">
                      Window Score: {chatResponse.score}%
                    </span>
                    <span className="rounded-full bg-[#1f060e] px-2.5 py-1 text-rose-300 font-mono text-[11px] border border-rose-900">
                      Selected Clock: {chatResponse.currentInstantScore}%
                    </span>
                  </div>
                </div>

                <p className="text-sm font-medium text-rose-100 leading-relaxed">
                  📢 {chatResponse.verdict}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="rounded-lg bg-[#19040a] p-3.5 border border-amber-900/40 space-y-1">
                    <strong className="text-amber-300 block">🎯 Strategic Action Checklist:</strong>
                    <p className="text-rose-200/90 leading-relaxed">{chatResponse.advice}</p>
                  </div>

                  <div className="rounded-lg bg-[#19040a] p-3.5 border border-rose-900/40 space-y-1">
                    <strong className="text-rose-300 block">🛡️ Emergency Shastric Mitigation:</strong>
                    <p className="text-rose-200/90 leading-relaxed">{chatResponse.mitigation}</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'science-audit' && (
        <div className="space-y-6 animate-fade-in">
          <MuhuratCalculationExplainer
            dayData={dayData}
            location={locCoords}
          />
        </div>
      )}

      {isWindowDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="window-guidance-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWindowDialogOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-amber-500/60 bg-[#160409] text-rose-100 shadow-2xl overflow-hidden my-6">
            <div className="flex items-start justify-between gap-3 border-b border-amber-900/60 bg-gradient-to-r from-[#2a0713] via-[#1a040b] to-[#2a0713] p-4 sm:p-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg">📋</span>
                  <h3 id="window-guidance-modal-title" className="font-serif text-base sm:text-lg font-bold text-amber-200">
                    {activeWindowGuidance.title}
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    activeWindowGuidance.auspiciousness === 'AUSPICIOUS'
                      ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                      : activeWindowGuidance.auspiciousness === 'INAUSPICIOUS'
                      ? 'border-rose-500 bg-rose-950 text-rose-200'
                      : 'border-amber-500 bg-amber-950 text-amber-300'
                  }`}>
                    {activeWindowGuidance.auspiciousness}
                  </span>
                </div>
                <p className="text-xs text-rose-300 font-mono">
                  {selectedWindowSpan ? `Window: ${selectedWindowSpan} · ` : ''}{locCoords.cityName} · {dayData.date}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close window Do's and Don'ts dialog"
                onClick={() => setIsWindowDialogOpen(false)}
                className="rounded-lg p-2 text-rose-400 hover:bg-rose-950/60 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 max-h-[72vh] overflow-y-auto text-xs">
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-rose-950">
                {allKaalaCards.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setSelectedWindowName(c.key);
                      setSelectedWindowSpan(c.span12Hr);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition-all border ${
                      selectedWindowName === c.key
                        ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                        : 'bg-[#21060f] text-rose-200 border-rose-900 hover:border-amber-600'
                    }`}
                  >
                    {c.icon} {c.title}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-xl border border-emerald-900/60 bg-[#0c1f13]/70 p-4 space-y-2">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-sm">
                    <span>✅</span> Recommended Actions (Do&apos;s)
                  </span>
                  <ul className="space-y-1.5 list-disc pl-4 text-emerald-100/95 leading-relaxed">
                    {activeWindowGuidance.recommendedActions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-rose-900/60 bg-[#25070e]/70 p-4 space-y-2">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5 text-sm">
                    <span>❌</span> Prohibited Actions (Don&apos;ts)
                  </span>
                  <ul className="space-y-1.5 list-disc pl-4 text-rose-100/95 leading-relaxed">
                    {activeWindowGuidance.prohibitedActions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-amber-600/50 bg-[#260914] p-4 space-y-1.5">
                <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <span>🛡️</span> Classical Shastric Emergency Mitigation (If action cannot be postponed):
                </span>
                <p className="text-amber-100/95 leading-relaxed">
                  {activeWindowGuidance.emergencyMitigation}
                </p>
              </div>
            </div>

            <div className="border-t border-amber-900/60 bg-[#110206] px-5 py-3 flex items-center justify-between gap-2 text-xs">
              {onTabChange ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsWindowDialogOpen(false);
                    onTabChange('remedies-attire');
                  }}
                  className="text-amber-300 hover:text-amber-200 underline font-semibold"
                >
                  Open Full Attire, Gemstones &amp; Footwear Matrix →
                </button>
              ) : <span />}
              <button
                type="button"
                onClick={() => setIsWindowDialogOpen(false)}
                className="rounded-lg bg-amber-500 px-4 py-1.5 font-bold text-neutral-950 hover:bg-amber-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <PersonalProfileModal
        isOpen={isProfileModalOpen}
        initialTab={profileModalInitialTab}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={userProfile}
        onSaveProfile={handlePersistProfile}
        observerLocation={locCoords}
      />
    </div>
  );
};
