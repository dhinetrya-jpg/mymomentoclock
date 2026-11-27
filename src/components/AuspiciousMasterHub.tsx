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
import { HighPrecisionAstroEngine, LocationCoordinates, DayAnalysisResult, LunarMonthSystem } from '../engine/zeroCostAstroEngine';
import { PersonalAuspiciousnessScoringEngine, NatalProfile, IntradayScoringSample, ChandraBalaConvention, SCORING_WEIGHT_GOVERNANCE } from '../engine/scoringEngine';
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
import { useModalFocus } from './useModalFocus';

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
  // Cold-start state: never writes to localStorage on initial mount; defaults to Universal Mode ("No birth profile supplied")
  const [initialProfileState] = useState(readStoredProfile);
  const [initialLocationState] = useState(readStoredLocation);

  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfileState.profile);
  const [locCoords, setLocCoords] = useState<LocationCoordinates>(initialLocationState.location);
  const [hasSavedBrowserData, setHasSavedBrowserData] = useState<boolean>(
    initialProfileState.fromStorage || initialLocationState.fromStorage
  );

  const [horizon, setHorizon] = useState<TimeHorizon>('DAY');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    HighPrecisionAstroEngine.getObserverDateString(
      initialLocationState.location.timezoneOffset,
      Date.now(),
      initialLocationState.location.timezone
    )
  );

  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<ProfileModalTab | undefined>(undefined);
  const [lunarMonthSystem, setLunarMonthSystem] = useState<LunarMonthSystem>('AMANTA');
  const [chandraBalaConvention, setChandraBalaConvention] = useState<ChandraBalaConvention>('CLASSICAL_STRICT');
  const [elevationMeters, setElevationMeters] = useState<number>(() => initialLocationState.location.elevationMeters ?? 0);

  // Explicit Release Decision Governance (Option 1 — Fail-Closed Production Gate, Server-Driven):
  // Public production has NO client-side unlock button and strictly follows `/api/v1/timing/capability` (`release_authorized`).
  // QA / Staging builds only show an unlock form when the server explicitly sets `qa_preview_available: true` and verifies an HttpOnly QA session.
  const [backendCapabilityStatus, setBackendCapabilityStatus] = useState<{
    checked: boolean;
    releaseAuthorized: boolean;
    qaPreviewAvailable: boolean;
    qaPreviewUnlocked: boolean;
    code: string;
    accuracyStatus: string;
  }>({
    checked: false,
    releaseAuthorized: false,
    qaPreviewAvailable: false,
    qaPreviewUnlocked: false,
    code: 'CORE_P0_01_NOT_VERIFIED',
    accuracyStatus: 'NOT_VERIFIED'
  });
  const [qaTokenInput, setQaTokenInput] = useState<string>('');
  const [qaAuthError, setQaAuthError] = useState<string>('');

  const enforceBackendReleaseGate = !(
    backendCapabilityStatus.releaseAuthorized || backendCapabilityStatus.qaPreviewUnlocked
  );

  // Observer-city current wall-clock minute (0..1439) + optional exact UTC epoch override (for DST repeated hours)
  const [currentMinutesOfDay, setCurrentMinutesOfDay] = useState<number>(() => {
    const off = initialLocationState.location.timezoneOffset ?? 5.5;
    const w = HighPrecisionAstroEngine.getWallTimeInZone(Date.now(), initialLocationState.location.timezone, off, false);
    return w.minutesOfDay;
  });
  const [selectedEpochOverrideMs, setSelectedEpochOverrideMs] = useState<number | null>(null);

  // Interactive Window Do's & Don'ts State (both Modal Dialog + Inline Card!)
  const [selectedWindowName, setSelectedWindowName] = useState<string>('Abhijit Muhurta');
  const [selectedWindowSpan, setSelectedWindowSpan] = useState<string>('');
  const [isWindowDialogOpen, setIsWindowDialogOpen] = useState<boolean>(false);

  // Screen 4: AI / Shastric Natural Language Muhurat Scanner State
  const [chatQuery, setChatQuery] = useState<string>('When is the best time for a high-stakes job interview this week?');
  const [chatResponse, setChatResponse] = useState<MuhuratConsultationResult | null>(null);

  const refreshCapabilityFromServer = async () => {
    try {
      const r = await fetch('/api/v1/timing/capability', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      if (!data) return;
      setBackendCapabilityStatus({
        checked: true,
        releaseAuthorized: Boolean(data.release_authorized),
        qaPreviewAvailable: Boolean(data.qa_preview_available),
        qaPreviewUnlocked: Boolean(data.qa_preview_unlocked),
        code: typeof data.code === 'string' ? data.code : 'CORE_P0_01_NOT_VERIFIED',
        accuracyStatus: typeof data.accuracy_status === 'string' ? data.accuracy_status : 'NOT_VERIFIED'
      });
    } catch {
      // Offline / static mode: remain fail-closed (enforceBackendReleaseGate = true)
    }
  };

  // Check live backend /api/v1/timing/capability release gate (read-only, zero personal data)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/timing/capability', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setBackendCapabilityStatus({
          checked: true,
          releaseAuthorized: Boolean(data.release_authorized),
          qaPreviewAvailable: Boolean(data.qa_preview_available),
          qaPreviewUnlocked: Boolean(data.qa_preview_unlocked),
          code: typeof data.code === 'string' ? data.code : 'CORE_P0_01_NOT_VERIFIED',
          accuracyStatus: typeof data.accuracy_status === 'string' ? data.accuracy_status : 'NOT_VERIFIED'
        });
      })
      .catch(() => {
        // Offline / static mode: remain fail-closed (enforceBackendReleaseGate = true)
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleQaUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQaAuthError('');
    try {
      const r = await fetch('/api/v1/timing/qa-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token: qaTokenInput }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setQaAuthError(typeof err.message === 'string' ? err.message : 'QA preview unlock denied by server.');
        return;
      }
      setQaTokenInput('');
      await refreshCapabilityFromServer();
    } catch {
      setQaAuthError('Unable to reach server QA unlock endpoint.');
    }
  };

  const handleQaRelock = async () => {
    try {
      await fetch('/api/v1/timing/qa-lock', { method: 'POST' });
    } catch {
      // Ignore network errors and refresh state
    }
    await refreshCapabilityFromServer();
  };

  // Reset exact epoch override when date or city changes
  useEffect(() => {
    setSelectedEpochOverrideMs(null);
  }, [selectedDate, locCoords.latitude, locCoords.longitude, locCoords.timezone]);

  // Keep DST-aware timezoneOffset synchronized when selectedDate changes on a known IANA timezone
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

  // WAI-ARIA modal keyboard trap, Escape handler & inert background management
  const windowDialogRef = useModalFocus(isWindowDialogOpen, () => setIsWindowDialogOpen(false));

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
    setSelectedDate(HighPrecisionAstroEngine.getObserverDateString(DEFAULT_LOCATION.timezoneOffset, Date.now(), DEFAULT_LOCATION.timezone));
    setSelectedEpochOverrideMs(null);
    setHasSavedBrowserData(false);
  };

  const openProfileModal = (tab?: ProfileModalTab) => {
    setProfileModalInitialTab(tab);
    setIsProfileModalOpen(true);
  };

  const shiftSelectedDateByDays = (deltaDays: number) => {
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
      ? selectedDate
      : HighPrecisionAstroEngine.getObserverDateString(locCoords.timezoneOffset, Date.now(), locCoords.timezone);
    const [y, m, d] = safe.split('-').map(Number);
    const shifted = new Date(Date.UTC(y, m - 1, d + deltaDays));
    setSelectedDate(shifted.toISOString().split('T')[0]);
  };

  const handleMinutesPickerChange = (mins: number) => {
    setSelectedEpochOverrideMs(null);
    setCurrentMinutesOfDay(mins);
  };

  const handleSelectExactEpoch = (epochMs: number, wallMins: number) => {
    setSelectedEpochOverrideMs(epochMs);
    setCurrentMinutesOfDay(wallMins);
  };

  const handleOpenWindowGuidance = (windowName: string, timeSpan?: string) => {
    setSelectedWindowName(windowName);
    setSelectedWindowSpan(timeSpan || '');
    setIsWindowDialogOpen(true);
  };

  // 1. Full Day Astronomical Analysis (100% Client-Edge, Unified 60-Term Moon + RA-EoT Solar Core)
  const dayData: DayAnalysisResult = useMemo(() => {
    const strictOrExplicitLoc = locCoords.timezone
      ? {
          latitude: locCoords.latitude,
          longitude: locCoords.longitude,
          cityName: locCoords.cityName,
          timezone: locCoords.timezone,
        }
      : locCoords;
    return HighPrecisionAstroEngine.analyzeFullDay(selectedDate, strictOrExplicitLoc, {
      lunarMonthSystem,
      elevationMeters
    });
  }, [selectedDate, locCoords, lunarMonthSystem, elevationMeters]);

  const isWednesday = dayData.dayOfWeekIndex === 3;
  const isAbhijitValid = dayData.fixedKaalas.abhijitMuhurta.isValidOnThisDay;

  // 2. Natal Profile (1-indexed Nakshatra 1..27 for ScoringEngine; suppressed when Strict Backend Gate is enforced)
  const natalProfile: NatalProfile | undefined = useMemo(() => {
    if (enforceBackendReleaseGate || userProfile.mode === 'UNIVERSAL') return undefined;
    return {
      natalMoonSignIndex: userProfile.moonSignIndex,
      natalMoonNakshatraIndex: userProfile.nakshatraIndex + 1,
      natalAscendantSignIndex: userProfile.ascendantSignIndex,
      natalNakshatraPada: userProfile.nakshatraPada
    };
  }, [enforceBackendReleaseGate, userProfile]);

  // 3. Consecutive-Midnight Local-Day Intraday Timeline (92 / 96 / 100 samples)
  const timeline: IntradayScoringSample[] = useMemo(() => {
    return PersonalAuspiciousnessScoringEngine.generate24HourTimeline(dayData, natalProfile, {
      chandraBalaConvention
    });
  }, [dayData, natalProfile, chandraBalaConvention]);

  // 4. Observer-Timezone-Accurate Evaluation Instant (supports DST jumps & folds)
  const currentInstant = useMemo(() => {
    if (selectedEpochOverrideMs !== null && Number.isFinite(selectedEpochOverrideMs)) {
      return new Date(selectedEpochOverrideMs);
    }
    const resolvedMs = HighPrecisionAstroEngine.resolveLocalMinutesToUtcMs(
      dayData.date,
      currentMinutesOfDay,
      locCoords.timezone,
      locCoords.timezoneOffset ?? 5.5
    );
    return new Date(resolvedMs);
  }, [selectedEpochOverrideMs, dayData.date, currentMinutesOfDay, locCoords.timezone, locCoords.timezoneOffset]);

  const currentSample: IntradayScoringSample = useMemo(() => {
    return PersonalAuspiciousnessScoringEngine.evaluateInstant(currentInstant, dayData, natalProfile, {
      chandraBalaConvention
    });
  }, [currentInstant, dayData, natalProfile, chandraBalaConvention]);

  // 5. Synthesized Vaara + Active Hora + Natal Lagna Gemstone Safety Guidance
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

  // 6. Active Window Action Guidance (respecting Wednesday Abhijit cancellation!)
  const activeWindowGuidance: WindowActionGuidance = useMemo(() => {
    return RemedialLifestyleEngine.getWindowActionGuidance(selectedWindowName, isWednesday);
  }, [selectedWindowName, isWednesday]);

  const footwearAnalysis = useMemo(() => {
    return RemedialLifestyleEngine.getFootwearComparativeAnalysis();
  }, []);

  // All 8 Daily Kaala Cards Metadata
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
      },
      {
        key: 'Varjyam',
        icon: '⛔',
        title: 'Varjyam (Tyajya)',
        badge: 'Vishaghati',
        span12Hr: `${fk.varjyam.start12Hr} – ${fk.varjyam.end12Hr}`,
        desc: `Root-solved 4-Ghati Nakshatra exclusion (${dayData.panchanga.nakshatra.name})—avoid major beginnings.`,
        tone: 'rose'
      },
      {
        key: 'Pradosh Kaal',
        icon: '🪔',
        title: 'Pradosh Kaal',
        badge: '6-Ghati Dusk',
        span12Hr: `${fk.pradoshKaal.start12Hr} – ${fk.pradoshKaal.end12Hr}`,
        desc: 'Post-sunset 6-Ghati Shiva & Lakshmi Puja twilight span.',
        tone: 'blue'
      }
    ] as const;
  }, [dayData, isAbhijitValid]);

  // Screen 2: Month Grid (personalized with NatalProfile)
  const monthDays: MonthLunarDaySummary[] = useMemo(() => {
    if (horizon !== 'MONTH') return [];
    const [y, m] = dayData.date.split('-').map(Number);
    return MultimodalCalendarEngine.generateMonthGrid(y, m, { ...locCoords, elevationMeters }, natalProfile);
  }, [horizon, dayData.date, locCoords, elevationMeters, natalProfile]);

  // Screen 2: Astronomical Year Sankrantis (Observer local 12h AM/PM + Natal house)
  const yearSankrantis: SolarSankrantiEvent[] = useMemo(() => {
    if (horizon !== 'YEAR') return [];
    const [y] = dayData.date.split('-').map(Number);
    return MultimodalCalendarEngine.generateAnnualSankrantiCalendar(y, { ...locCoords, elevationMeters }, natalProfile);
  }, [horizon, dayData.date, locCoords, elevationMeters, natalProfile]);

  // Screen 2: UTC-Safe 7-Day Week Comparative Matrix
  const weekDays = useMemo(() => {
    if (horizon !== 'WEEK') return [];
    const [y, m, d] = dayData.date.split('-').map(Number);
    const baseUtc = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = baseUtc.getUTCDay();
    const startUtc = new Date(Date.UTC(y, m - 1, d - dayOfWeek));

    return Array.from({ length: 7 }, (_, i) => {
      const curUtc = new Date(Date.UTC(startUtc.getUTCFullYear(), startUtc.getUTCMonth(), startUtc.getUTCDate() + i));
      const curStr = curUtc.toISOString().split('T')[0];
      const dAnalysis = HighPrecisionAstroEngine.analyzeFullDay(curStr, locCoords, {
        lunarMonthSystem,
        elevationMeters
      });
      // Evaluate 10:30 AM observer local time in the target city's IANA timezone
      const evalMs = HighPrecisionAstroEngine.resolveLocalMinutesToUtcMs(
        curStr,
        10 * 60 + 30,
        locCoords.timezone,
        locCoords.timezoneOffset ?? 5.5
      );
      const score = PersonalAuspiciousnessScoringEngine.evaluateInstant(new Date(evalMs), dAnalysis, natalProfile, {
        chandraBalaConvention
      });
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
  }, [horizon, dayData.date, locCoords, lunarMonthSystem, elevationMeters, natalProfile, chandraBalaConvention]);

  // Screen 4: 1-Click Preset Handler (updates query to preset prompt & runs real scanner)
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

  // Screen 4: Custom Free-Text Submit Handler (NEVER overwrites user's typed question!)
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
      {/* ========================================================================= */}
      {/* SERVER-DRIVEN RELEASE GATE & QA UNVALIDATED_PREVIEW WATERMARK BANNER       */}
      {/* ========================================================================= */}
      <div
        role="status"
        aria-label="Release authorization and analytical preview scope notice"
        className={`rounded-2xl border px-4 py-3.5 text-xs text-rose-100 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${enforceBackendReleaseGate
            ? 'border-rose-600/70 bg-[#1e050b]'
            : backendCapabilityStatus.qaPreviewUnlocked && !backendCapabilityStatus.releaseAuthorized
              ? 'border-amber-400 bg-amber-950/70 ring-2 ring-amber-400/60'
              : 'border-emerald-500/60 bg-[#0d1f17]'
          }`}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold border ${enforceBackendReleaseGate
                ? 'bg-rose-600/25 border-rose-500/60 text-rose-200'
                : backendCapabilityStatus.qaPreviewUnlocked && !backendCapabilityStatus.releaseAuthorized
                  ? 'bg-amber-400 text-neutral-950 border-amber-300'
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
              }`}>
              {enforceBackendReleaseGate
                ? 'PRODUCTION GATE LOCKED · HTTP 503 PARITY'
                : backendCapabilityStatus.qaPreviewUnlocked && !backendCapabilityStatus.releaseAuthorized
                  ? 'UNVALIDATED_PREVIEW · QA / STAGING BUILD ONLY — NOT PRODUCTION'
                  : 'RELEASE_AUTHORIZED · VERIFIED TIMING'}
            </span>
            <span className="rounded bg-rose-950 border border-rose-700 px-2 py-0.5 font-mono text-[10px] text-rose-200">
              Backend /api/v1/timing/daily: {backendCapabilityStatus.code} · release_authorized: {String(backendCapabilityStatus.releaseAuthorized)}
            </span>
          </div>
          <p className="text-[11px] text-rose-100 leading-relaxed">
            {enforceBackendReleaseGate ? (
              <>
                Personalized and intraday Muhurat windows are <strong>locked in production (HTTP 503, 0 windows)</strong> until ~100 city-date reference exit tests, CI tolerance checks, Moon/Tara-Bala verification, and Jyotishi rule sign-off set <code className="text-amber-200">release_authorized: true</code> on the server.
              </>
            ) : backendCapabilityStatus.qaPreviewUnlocked && !backendCapabilityStatus.releaseAuthorized ? (
              <>
                <strong>UNVALIDATED_PREVIEW (QA / Tester Session):</strong> Production remains locked (<code className="text-amber-200">release_authorized: false</code>). These day-part intervals and Tara Bala calculations are visible solely via server-verified QA session for tolerance review—never treat screenshots of this view as production-authorized guidance.
              </>
            ) : (
              <>
                Server-authorized traditional timing windows active (<code className="text-emerald-200">release_authorized: true</code>).
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {backendCapabilityStatus.qaPreviewUnlocked && !backendCapabilityStatus.releaseAuthorized && (
            <button
              type="button"
              onClick={handleQaRelock}
              className="rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-[11px] font-bold text-white border border-rose-400 shadow transition-colors"
            >
              🔒 End QA Preview Session
            </button>
          )}
          {onTabChange && (
            <button
              type="button"
              onClick={() => onTabChange('daily-timing')}
              className="rounded-lg bg-[#140307] hover:bg-rose-950/60 px-3 py-1.5 text-[11px] font-medium text-rose-200 border border-rose-800 transition-colors"
            >
              Inspect Backend Gate →
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERSISTENT GLOBAL CONTROL BAR: LOCATION + GLOBAL DATE + 12-HR AM/PM       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch scroll-mt-28">
        <div className="lg:col-span-5">
          <ModernLocationPicker
            currentLocation={locCoords}
            selectedDate={dayData.date}
            onLocationChange={handlePersistLocation}
          />
        </div>

        {/* Global Date Navigator */}
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
                {enforceBackendReleaseGate
                  ? `${dayData.localDayBounds.elapsedHours}h · ${dayData.localDayBounds.sampleCount15Min} slots`
                  : `${dayData.panchanga.tithi.paksha} ${dayData.panchanga.tithi.name}`}
              </span>
            </div>
          </div>

          <input
            id="hub-evaluation-date"
            name="hubEvaluationDate"
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
              onClick={() => setSelectedDate(HighPrecisionAstroEngine.getObserverDateString(locCoords.timezoneOffset, Date.now(), locCoords.timezone))}
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
            onChangeMinutes={handleMinutesPickerChange}
            timezoneLabel={locCoords.cityName}
            timezoneOffset={locCoords.timezoneOffset}
            ianaTimezone={locCoords.timezone}
          />
        </div>
      </div>

      {/* Topocentric Horizon & Regional Sampradaya Settings Bar */}
      <div className="rounded-2xl border border-rose-950 bg-[#140307] px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-rose-200">
            <span className="font-semibold text-amber-300">🏔️ Elevation (m):</span>
            <input
              id="hub-elevation-meters"
              name="hubElevationMeters"
              type="number"
              min={-400}
              max={8849}
              step={10}
              aria-label="Observer elevation in meters"
              value={elevationMeters}
              onChange={(e) => {
                const v = Number(e.target.value);
                setElevationMeters(Number.isFinite(v) ? Math.max(-400, Math.min(8849, v)) : 0);
              }}
              className="w-20 rounded-lg border border-rose-900 bg-[#20060e] px-2 py-1 font-mono text-rose-100"
            />
          </label>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-amber-300">🌙 Masa System:</span>
            {(['AMANTA', 'PURNIMANTA'] as LunarMonthSystem[]).map((sys) => (
              <button
                key={sys}
                type="button"
                onClick={() => setLunarMonthSystem(sys)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-colors ${lunarMonthSystem === sys
                    ? 'bg-amber-500 text-neutral-950 border-amber-400'
                    : 'bg-[#20060e] text-rose-200 border-rose-900 hover:border-amber-600'
                  }`}
              >
                {sys === 'AMANTA' ? 'Amanta' : 'Purnimanta'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-amber-300">🔭 Chandra Bala:</span>
            {([
              { id: 'CLASSICAL_STRICT', label: 'Strict (1,3,6,7,10,11)' },
              { id: 'SHUKLA_WAXING_RELAXED', label: 'Shukla-Waxing Relaxed (+2,5,9)' }
            ] as Array<{ id: ChandraBalaConvention; label: string }>).map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setChandraBalaConvention(conv.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-colors ${chandraBalaConvention === conv.id
                    ? 'bg-amber-500 text-neutral-950 border-amber-400'
                    : 'bg-[#20060e] text-rose-200 border-rose-900 hover:border-amber-600'
                  }`}
              >
                {conv.label}
              </button>
            ))}
          </div>
        </div>

        <span className="font-mono text-[11px] text-rose-300">
          Zone: <strong className="text-amber-200">{locCoords.timezone || `UTC${locCoords.timezoneOffset}`}</strong> · Dip: {elevationMeters}m
        </span>
      </div>

      {/* Timezone / DST / Input Normalization Notes Banner (`dayData.inputNotes`) */}
      {dayData.inputNotes.length > 0 && (
        <div
          role="status"
          aria-label="Timezone and input normalization notes"
          className="rounded-xl border border-amber-600/60 bg-amber-950/35 px-4 py-2.5 text-xs text-amber-100 space-y-1"
        >
          {dayData.inputNotes.map((note, idx) => (
            <p key={idx} className="leading-relaxed">
              <strong className="text-amber-300">Timezone Note:</strong> {note}
            </p>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FAIL-CLOSED GATE PANEL FOR ALL GUIDANCE TABS WHEN RELEASE IS UNAUTHORIZED */}
      {/* ========================================================================= */}
      {enforceBackendReleaseGate && activeTab !== 'science-audit' && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-600/70 bg-gradient-to-br from-[#24060e] via-[#160308] to-[#24060e] p-6 sm:p-8 space-y-6 text-xs text-rose-100 shadow-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-900/70 pb-3">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-amber-300">
              🔒 Personalized Muhurat Windows Pending Verification ({backendCapabilityStatus.code})
            </h2>
            <span className="font-mono text-[11px] bg-rose-950 border border-rose-600 px-2.5 py-0.5 rounded text-rose-200">
              HTTP 503 · windows: 0 · release_authorized: false
            </span>
          </div>

          <p className="leading-relaxed text-rose-200 text-xs sm:text-sm">
            Intraday Muhurat windows (Panchang Shuddhi, Planetary Hora, Choghadiya, and Natal Tara Bala) are built on the server (<code className="text-amber-200">POST /api/v1/timing/daily</code>) and intentionally withheld in public production so visitors never act on unverified timing intervals.
          </p>

          {/* What Is Coming (Exit-Test Checklist) */}
          <div className="rounded-xl border border-rose-900/70 bg-black/35 p-4 space-y-2">
            <h3 className="font-semibold text-amber-200 text-xs uppercase tracking-wider">
              What Unlocks Personalized Timing (Release Exit Criteria)
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-rose-200/90 text-xs">
              <li><strong>100-City Reference Exit Test:</strong> Cross-checking Sunrise, Sunset, Tithi, Nakshatra, Yoga, and Karana boundaries across ~100 global city-date pairs (including DST &amp; high-latitude cases) in CI.</li>
              <li><strong>Lunar &amp; Nakshatra Exit Gate for Tara Bala:</strong> Independent verification of natal Moon longitude so cusp births never shift Tara Bala classification.</li>
              <li><strong>Domain Sign-Off:</strong> Classical Jyotishi review of activity-specific Hora, Choghadiya, and Ashtabhaga exclusion rules (<code className="text-amber-200">timing-rules-v1</code>).</li>
            </ul>
            <div className="pt-2 border-t border-rose-950 font-mono text-[11px] text-rose-300 space-y-0.5">
              <div>Selected Target Day: <span className="text-amber-200">{dayData.date}</span> · Zone: <span className="text-amber-200">{locCoords.timezone || `UTC${locCoords.timezoneOffset}`}</span> ({dayData.localDayBounds.elapsedHours}h · {dayData.localDayBounds.sampleCount15Min} × 15m slots)</div>
              <div>Profile State: <span className="text-rose-100">{userProfile.mode === 'UNIVERSAL' ? 'No birth profile supplied' : `${userProfile.name} (withheld under strict gate)`}</span> · Authorized Windows: <span className="text-rose-400 font-bold">0</span></div>
            </div>
          </div>

          {/* What Already Works Today */}
          {onTabChange && (
            <div className="space-y-2.5">
              <h3 className="font-semibold text-amber-200 text-xs uppercase tracking-wider">
                Available Today While Timing Windows Complete Verification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => onTabChange('natal-chart')}
                  className="text-left rounded-xl border border-amber-500/50 bg-[#260812] hover:bg-amber-950/50 p-3.5 space-y-1 transition-colors"
                >
                  <div className="font-bold text-amber-300 text-xs">📜 Natal Birth Chart Preview</div>
                  <p className="text-[11px] text-rose-200/80">Enter birth date, time &amp; worldwide city for Lagna, 9 planets, and D1/D2/D9/D60 vargas.</p>
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('birth-explorer')}
                  className="text-left rounded-xl border border-rose-800 bg-[#1b050c] hover:bg-rose-950/60 p-3.5 space-y-1 transition-colors"
                >
                  <div className="font-bold text-amber-200 text-xs">🧭 Birth-Time Explorer</div>
                  <p className="text-[11px] text-rose-200/80">Inspect whole-day Rashi &amp; varga sensitivity when birth time is approximate or unknown.</p>
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('science-audit')}
                  className="text-left rounded-xl border border-rose-800 bg-[#1b050c] hover:bg-rose-950/60 p-3.5 space-y-1 transition-colors"
                >
                  <div className="font-bold text-amber-200 text-xs">🔬 Science of Muhurat</div>
                  <p className="text-[11px] text-rose-200/80">Read the 7-layer astronomical &amp; Shastric mathematical formulation.</p>
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('daily-timing')}
                  className="text-left rounded-xl border border-rose-800 bg-[#1b050c] hover:bg-rose-950/60 p-3.5 space-y-1 transition-colors"
                >
                  <div className="font-bold text-amber-200 text-xs">🛡️ Daily Timing Boundary</div>
                  <p className="text-[11px] text-rose-200/80">Verify the live stateless <code className="text-amber-200">/api/v1/timing/daily</code> contract.</p>
                </button>
              </div>
            </div>
          )}

          {/* Server-Checked QA / Staging Sign-In ONLY when enabled on the server (never rendered in public production) */}
          {backendCapabilityStatus.qaPreviewAvailable && (
            <form onSubmit={handleQaUnlockSubmit} className="rounded-xl border border-amber-500/50 bg-amber-950/25 p-3.5 space-y-2">
              <div className="font-mono text-[11px] font-bold text-amber-300">
                QA / STAGING ENVIRONMENT DETECTED · SERVER-VERIFIED TESTER UNLOCK
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={qaTokenInput}
                  onChange={(e) => setQaTokenInput(e.target.value)}
                  placeholder="Enter server QA preview token"
                  aria-label="QA preview token"
                  required
                  className="flex-1 rounded-lg border border-amber-600/50 bg-[#160409] px-3 py-1.5 text-xs text-rose-100 font-mono"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-1.5 text-xs font-bold text-neutral-950 transition-colors"
                >
                  Verify QA Session (UNVALIDATED_PREVIEW)
                </button>
              </div>
              {qaAuthError && <p className="text-[11px] text-rose-300">{qaAuthError}</p>}
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: AUSPICIOUS CHRONO-DIAL & INTERACTIVE KAALA WINDOWS              */}
      {/* ========================================================================= */}
      {!enforceBackendReleaseGate && activeTab === 'auspicious-hub' && (
        <div className="space-y-8 animate-fade-in">
          {/* 3-Path Personalization & Privacy Banner */}
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

              {/* Action Buttons */}
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

            {/* 3-Path Onboarding Cards (when in Universal Mode) OR Personal Harmonic Telemetry (when Personalized) */}
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
                  <div className={`text-[11px] font-medium ${currentSample.isAshtamaChandra
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

          {/* Consecutive-Midnight Local-Day Chrono-Dial */}
          {enforceBackendReleaseGate ? (
            <div role="alert" className="rounded-2xl border border-rose-600/70 bg-rose-950/40 p-6 space-y-3 text-xs text-rose-100 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-serif text-lg font-bold text-amber-300">
                  🔒 Strict Backend Release Gate Active (CORE_P0_01_NOT_VERIFIED)
                </h3>
                <span className="font-mono text-[11px] bg-rose-950 border border-rose-600 px-2.5 py-0.5 rounded text-rose-200">
                  HTTP 503 · windows: 0 · release_authorized: false
                </span>
              </div>
              <p className="leading-relaxed text-rose-200">
                Personalized timing recommendations are withheld because the authoritative backend (<code className="text-amber-200">POST /api/v1/timing/daily</code>) reports <code className="text-amber-200">{backendCapabilityStatus.code}</code>. Switch back to <strong>Client Analytical Preview</strong> in the banner above only to inspect unvalidated traditional Panchang intervals.
              </p>
            </div>
          ) : (
            <AuspiciousChronoDial
              selectedDate={dayData.date}
              location={locCoords}
              natal={natalProfile}
              currentMinutesOfDay={currentMinutesOfDay}
              activeEpochMs={currentInstant.getTime()}
              onMinutesChange={handleMinutesPickerChange}
              onSelectEpochMs={handleSelectExactEpoch}
              onSelectWindow={handleOpenWindowGuidance}
            />
          )}

          {/* ========================================================================= */}
          {/* 5-LIMB PANCHANGA EXACT END TIMES, LUNAR MASA, VISHTI/PANCHAK & FESTIVALS  */}
          {/* ========================================================================= */}
          <section className="rounded-2xl border border-rose-950 bg-[#160408] p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-950 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-amber-300">
                  📜 Drik Panchanga Exact End Times &amp; Lunar Masa ({dayData.lunarMasa.activeSystem})
                </h3>
                <p className="text-xs text-rose-300/80">
                  Root-solved transitions via unified 60-term Meeus Ch. 47 Moon + VSOP87 Sun (True Chitrapaksha Lahiri {dayData.ayanamsa.valueDegrees}°)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-200">
                  🌙 {dayData.lunarMasa.displayName} Masa
                </span>
                {dayData.panchanga.tithi.tithiAnomaly !== 'NORMAL' && (
                  <span className="rounded-full bg-rose-600/30 border border-rose-500 px-2.5 py-1 text-[11px] font-mono font-bold text-rose-200">
                    {dayData.panchanga.tithi.tithiAnomaly} TITHI{dayData.panchanga.tithi.kshayaTithiName ? `: ${dayData.panchanga.tithi.kshayaTithiName}` : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-rose-900/70 bg-[#1f060e] p-3.5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-rose-400">Udaya Tithi</span>
                <div className="font-bold text-amber-200 text-sm">
                  {dayData.panchanga.tithi.paksha} {dayData.panchanga.tithi.name}
                </div>
                <div className="font-mono text-[11px] text-emerald-300">
                  Ends: {dayData.panchanga.tithi.end12Hr}{dayData.panchanga.tithi.endsAfterNextSunrise ? ' (+1d)' : ''}
                </div>
              </div>

              <div className="rounded-xl border border-rose-900/70 bg-[#1f060e] p-3.5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-rose-400">Nakshatra &amp; Pada</span>
                <div className="font-bold text-amber-200 text-sm">
                  {dayData.panchanga.nakshatra.name} (Pada {dayData.panchanga.nakshatra.pada})
                </div>
                <div className="font-mono text-[11px] text-emerald-300">
                  Ends: {dayData.panchanga.nakshatra.end12Hr}{dayData.panchanga.nakshatra.endsAfterNextSunrise ? ' (+1d)' : ''}
                </div>
              </div>

              <div className="rounded-xl border border-rose-900/70 bg-[#1f060e] p-3.5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-rose-400">Nitya Yoga</span>
                <div className="font-bold text-amber-200 text-sm">
                  {dayData.panchanga.yoga.name}
                </div>
                <div className="font-mono text-[11px] text-emerald-300">
                  Ends: {dayData.panchanga.yoga.end12Hr}{dayData.panchanga.yoga.endsAfterNextSunrise ? ' (+1d)' : ''}
                </div>
              </div>

              <div className="rounded-xl border border-rose-900/70 bg-[#1f060e] p-3.5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-rose-400">Karana</span>
                <div className="font-bold text-amber-200 text-sm">
                  {dayData.panchanga.karana.name}
                </div>
                <div className="font-mono text-[11px] text-emerald-300">
                  Ends: {dayData.panchanga.karana.end12Hr}{dayData.panchanga.karana.endsAfterNextSunrise ? ' (+1d)' : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-rose-900/60 bg-black/30 p-3 space-y-1">
                <span className="font-semibold text-rose-300">⚠️ Vishti (Bhadra) Windows Today:</span>
                {dayData.vishtiWindows.length === 0 ? (
                  <p className="text-[11px] text-emerald-300 font-mono">None active in local day</p>
                ) : (
                  dayData.vishtiWindows.map((vw, idx) => (
                    <p key={idx} className="text-[11px] text-rose-200 font-mono">
                      {vw.start12Hr} – {vw.end12Hr}
                    </p>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-rose-900/60 bg-black/30 p-3 space-y-1">
                <span className="font-semibold text-amber-300">🌠 Panchak Status (300°–360°):</span>
                {dayData.panchak.isActive && dayData.panchak.window ? (
                  <p className="text-[11px] text-amber-200 font-mono">
                    Active ({dayData.panchak.nakshatraName}): {dayData.panchak.window.start12Hr} – {dayData.panchak.window.end12Hr}
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-300 font-mono">Inactive today</p>
                )}
              </div>

              <div className="rounded-xl border border-rose-900/60 bg-black/30 p-3 space-y-1">
                <span className="font-semibold text-amber-300">🪔 Parva / Festival Rules ({dayData.festivalObservances.ruleSetVersion}):</span>
                {dayData.festivalObservances.matched.length === 0 ? (
                  <p className="text-[11px] text-rose-300/80">No major tracked Parva on this civil date</p>
                ) : (
                  dayData.festivalObservances.matched.map((fest) => (
                    <p key={fest.id} className="text-[11px] text-amber-200">
                      <strong>{fest.name}</strong> ({fest.observanceWindow12Hr}) — <span className="font-mono text-[10px] text-rose-300">{dayData.festivalObservances.approvalStatus}</span>
                    </p>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 px-3.5 py-2.5 text-[11px] text-rose-200/90 flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>Scoring Provenance ({SCORING_WEIGHT_GOVERNANCE.ruleVersion} · {SCORING_WEIGHT_GOVERNANCE.approvalStatus}):</strong>{' '}
                {SCORING_WEIGHT_GOVERNANCE.disclaimer}
              </span>
              <span className="font-mono text-[10px] text-amber-300">
                {SCORING_WEIGHT_GOVERNANCE.citations.length} Shastric citations logged
              </span>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* ALL 10 INTERACTIVE SOLAR & LUNAR KAALA WINDOWS (OPENS MODAL + INLINE)     */}
          {/* ========================================================================= */}
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

            {/* 8 Interactive Window Cards */}
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
                    className={`text-left rounded-xl border p-3.5 space-y-1.5 transition-all cursor-pointer hover:scale-[1.01] ${toneClasses} ${isSelected ? 'ring-2 ring-amber-400 shadow-xl' : ''
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

            {/* Inline Do's, Don'ts & Shastric Mitigation Panel */}
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
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${activeWindowGuidance.auspiciousness === 'AUSPICIOUS'
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

      {/* ========================================================================= */}
      {/* SCREEN 2: MULTI-HORIZON PLANNER (DAY, WEEK, MONTH, YEAR)                  */}
      {/* ========================================================================= */}
      {!enforceBackendReleaseGate && activeTab === 'planner' && (
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
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${horizon === h
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

          {/* DAY VIEW: Consecutive-midnight clickable 15-minute rows (92 / 96 / 100 samples) */}
          {horizon === 'DAY' && (
            <div className="rounded-2xl border border-rose-950 bg-[#160408] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-serif text-base font-bold text-amber-300">
                  {timeline.length} Intraday 15-Minute Windows ({dayData.localDayBounds.elapsedHours}h Local Day{dayData.localDayBounds.isDstTransition ? ` · DST ${dayData.localDayBounds.startOffsetLabel} → ${dayData.localDayBounds.endOffsetLabel}` : ` · ${dayData.localDayBounds.startOffsetLabel}`}) for {dayData.date} ({locCoords.cityName})
                </h3>
                <span className="text-[11px] text-rose-300">Click any row to set exact evaluation instant</span>
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
                      <th className="py-2 px-3">Analytical Preview Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-950/60 text-rose-200">
                    {timeline.map((s, idx) => {
                      const [sh, sm] = s.localTimeStr.split(':').map(Number);
                      const rowWallMins = (Number.isFinite(sh) ? sh : 0) * 60 + (Number.isFinite(sm) ? sm : 0);
                      return (
                        <tr
                          key={idx}
                          onClick={() => handleSelectExactEpoch(s.epochMs, rowWallMins)}
                          className={`hover:bg-amber-950/30 cursor-pointer transition-colors ${currentSample.epochMs === s.epochMs ? 'bg-amber-950/40 ring-1 ring-inset ring-amber-500/60' : ''
                            }`}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WEEK VIEW: 7-Day UTC-safe comparative matrix */}
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
                  className={`text-left rounded-2xl border p-4 space-y-2.5 transition-all hover:scale-[1.02] ${w.tier === 'AMRITHAM'
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

          {/* MONTH VIEW: Lunar Phase & Personal Synastry Heatmap */}
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
                    className={`text-left rounded-xl border p-3 space-y-1.5 transition-all hover:border-amber-400 ${m.date === dayData.date ? 'ring-2 ring-amber-400 bg-[#2a0915]' : 'border-rose-950 bg-[#220710]'
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

          {/* YEAR VIEW: 12 Astronomical Sidereal Solar Sankrantis */}
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

      {/* ========================================================================= */}
      {/* SCREEN 3: ACTIONS, REMEDIES, ATTIRE & FOOTWEAR MATRIX                     */}
      {/* ========================================================================= */}
      {!enforceBackendReleaseGate && activeTab === 'remedies-attire' && (
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
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border self-start sm:self-center ${activeWindowGuidance.auspiciousness === 'AUSPICIOUS'
                  ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
                  : activeWindowGuidance.auspiciousness === 'INAUSPICIOUS'
                    ? 'border-rose-600 bg-rose-950 text-rose-200'
                    : 'border-amber-600 bg-amber-950 text-amber-300'
                }`}>
                {activeWindowGuidance.auspiciousness}
              </span>
            </div>

            {/* Quick Window Selector Strip */}
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
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${selectedWindowName === wName
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

          {/* Daily Attire, Live Hora Accent, Lagna-Safe Gemstones & Footwear */}
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

            {/* Footwear Shastric Comparative Matrix */}
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

      {/* ========================================================================= */}
      {/* SCREEN 4: AI MUHURAT ASSISTANT & ASTRONOMICAL WINDOW SCANNER              */}
      {/* ========================================================================= */}
      {!enforceBackendReleaseGate && activeTab === 'ai-muhurat' && (
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

            {/* 1-Click Preset Buttons */}
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

            {/* Custom Natural-Language Form (Preserves User Input!) */}
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

            {/* Consultation Result Box */}
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

      {/* ========================================================================= */}
      {/* SCREEN 5: SCIENCE OF SHUBHA MUHURAT CALCULATION                           */}
      {/* ========================================================================= */}
      {activeTab === 'science-audit' && (
        <div className="space-y-6 animate-fade-in">
          <MuhuratCalculationExplainer
            dayData={dayData}
            location={locCoords}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP MODAL: INTERACTIVE WINDOW DO'S, DON'TS & SHASTRIC MITIGATION       */}
      {/* ========================================================================= */}
      {isWindowDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWindowDialogOpen(false);
          }}
        >
          <div
            ref={windowDialogRef as React.RefObject<HTMLDivElement>}
            role="dialog"
            aria-modal="true"
            aria-labelledby="window-guidance-modal-title"
            tabIndex={-1}
            className="relative w-full max-w-2xl rounded-2xl border border-amber-500/60 bg-[#160409] text-rose-100 shadow-2xl overflow-hidden my-6 focus:outline-none"
          >
            <div className="flex items-start justify-between gap-3 border-b border-amber-900/60 bg-gradient-to-r from-[#2a0713] via-[#1a040b] to-[#2a0713] p-4 sm:p-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg">📋</span>
                  <h3 id="window-guidance-modal-title" className="font-serif text-base sm:text-lg font-bold text-amber-200">
                    {activeWindowGuidance.title}
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${activeWindowGuidance.auspiciousness === 'AUSPICIOUS'
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
              {/* Quick Switcher inside Modal across all 8 Kaalas */}
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-rose-950">
                {allKaalaCards.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setSelectedWindowName(c.key);
                      setSelectedWindowSpan(c.span12Hr);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition-all border ${selectedWindowName === c.key
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

      {/* Personalized Profile Setup & Non-Technical Wizard Modal */}
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
