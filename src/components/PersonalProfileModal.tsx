/**
 * @license
 * MIT License
 *
 * Personal Astrological Profile Modal
 * 1. Users WITHOUT birth details: 20-second non-technical quiz (108-Pada Avakahada Chakra + Diurnal + Tattva + Prashna #1-9).
 * 2. Users WITH birth details: Exact Drik Birth Kundali (12-Hour AM/PM, Google Maps-style Place of Birth autofill + historical/DST UTC offset).
 * 3. Universal Mode: Pure macrocosmic city timings with zero personal birth data required.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PersonalProfileEngine, UserProfile } from '../engine/personalProfileEngine';
import { OfflineGeoResolver, OfflineCityRecord } from '../engine/offlineGeoData';
import { LocationCoordinates } from '../engine/zeroCostAstroEngine';
import { resolveIanaTimezone } from '../engine/timezoneResolver';
import { useModalFocus } from './useModalFocus';

export type ProfileModalTab = 'WIZARD' | 'EXACT' | 'UNIVERSAL';

interface PersonalProfileModalProps {
  isOpen: boolean;
  initialTab?: ProfileModalTab;
  onClose: () => void;
  currentProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  observerLocation: LocationCoordinates;
}

const parseInitialHour12 = (tob?: string): number => {
  if (!tob) return 10;
  const h = parseInt(tob.split(':')[0], 10);
  if (Number.isNaN(h)) return 10;
  return h % 12 === 0 ? 12 : h % 12;
};

const parseInitialMinute = (tob?: string): number => {
  if (!tob) return 30;
  const parts = tob.split(':');
  const m = parts.length > 1 ? parseInt(parts[1], 10) : 30;
  return Number.isNaN(m) ? 30 : Math.max(0, Math.min(59, m));
};

const parseInitialAmPm = (tob?: string): 'AM' | 'PM' => {
  if (!tob) return 'AM';
  const h = parseInt(tob.split(':')[0], 10);
  if (Number.isNaN(h)) return 'AM';
  return h >= 12 ? 'PM' : 'AM';
};

export const PersonalProfileModal: React.FC<PersonalProfileModalProps> = ({
  isOpen,
  initialTab,
  onClose,
  currentProfile,
  onSaveProfile,
  observerLocation
}) => {
  const deriveTab = (profile: UserProfile, preferred?: ProfileModalTab): ProfileModalTab => {
    if (preferred) return preferred;
    if (profile.mode === 'BIRTH_DETAILS') return 'EXACT';
    if (profile.mode === 'NON_TECHNICAL_WIZARD') return 'WIZARD';
    return 'WIZARD';
  };

  // ALL React hooks MUST execute unconditionally before any early return!
  const [activeTab, setActiveTab] = useState<ProfileModalTab>(() => deriveTab(currentProfile, initialTab));
  const dialogRef = useModalFocus(isOpen, onClose);

  // Tab 1: 20-Sec Non-Technical Quiz State
  const [wizardName, setWizardName] = useState<string>(() =>
    currentProfile.mode === 'NON_TECHNICAL_WIZARD' ? currentProfile.name : ''
  );
  const [diurnalPhase, setDiurnalPhase] = useState<'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'UNKNOWN'>('MORNING');
  const [personalityDrive, setPersonalityDrive] = useState<'FIRE_LEADER' | 'EARTH_BUILDER' | 'AIR_THINKER' | 'WATER_EMPATH'>('EARTH_BUILDER');
  const [sacredNumber, setSacredNumber] = useState<number>(5);
  const [showShastricExplainer, setShowShastricExplainer] = useState<boolean>(false);

  // Tab 2: Exact Birth Details State
  const [exactName, setExactName] = useState<string>(() =>
    currentProfile.mode === 'BIRTH_DETAILS' ? currentProfile.name : ''
  );
  const [birthDate, setBirthDate] = useState<string>(() => currentProfile.dob || '1995-08-15');
  const [birthHour12, setBirthHour12] = useState<number>(() => parseInitialHour12(currentProfile.tob));
  const [birthMinute, setBirthMinute] = useState<number>(() => parseInitialMinute(currentProfile.tob));
  const [birthAmPm, setBirthAmPm] = useState<'AM' | 'PM'>(() => parseInitialAmPm(currentProfile.tob));

  // Place of Birth Autocomplete & Coordinates
  const defaultCityName = currentProfile.pob || observerLocation.cityName || 'New Delhi, India';
  const defaultLat = currentProfile.birthLat ?? observerLocation.latitude ?? 28.6139;
  const defaultLon = currentProfile.birthLon ?? observerLocation.longitude ?? 77.2090;
  const defaultTz = currentProfile.birthTimezone || observerLocation.timezone || 'Asia/Kolkata';
  const defaultOffset = currentProfile.birthTzOffset ?? observerLocation.timezoneOffset ?? 5.5;

  const [birthCityQuery, setBirthCityQuery] = useState<string>(defaultCityName);
  const [isCitySearching, setIsCitySearching] = useState<boolean>(false);
  const [selectedBirthCity, setSelectedBirthCity] = useState<{
    cityName: string;
    latitude: number;
    longitude: number;
    timezone: string;
    defaultOffset: number;
    timezoneOffset: number;
  }>({
    cityName: defaultCityName,
    latitude: defaultLat,
    longitude: defaultLon,
    timezone: defaultTz,
    defaultOffset,
    timezoneOffset: defaultOffset
  });

  const [isManualCoordsOpen, setIsManualCoordsOpen] = useState<boolean>(false);
  const [hasCustomOffset, setHasCustomOffset] = useState<boolean>(false);
  const [manualLat, setManualLat] = useState<string>(defaultLat.toString());
  const [manualLon, setManualLon] = useState<string>(defaultLon.toString());
  const [manualOffset, setManualOffset] = useState<string>(defaultOffset.toString());
  const [exactValidationError, setExactValidationError] = useState<string>('');
  const [gpsNotice, setGpsNotice] = useState<string>('');

  const [citySearchResults, setCitySearchResults] = useState<OfflineCityRecord[]>(() =>
    OfflineGeoResolver.searchCities('', 8, currentProfile.dob || '1995-08-15')
  );
  const [isCityGeoLoading, setIsCityGeoLoading] = useState<boolean>(false);

  const pobDropdownRef = useRef<HTMLDivElement>(null);

  // Sync state whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(deriveTab(currentProfile, initialTab));
    setExactValidationError('');
    setGpsNotice('');

    if (currentProfile.mode === 'NON_TECHNICAL_WIZARD') {
      setWizardName(currentProfile.name || '');
    } else if (currentProfile.mode === 'BIRTH_DETAILS') {
      setExactName(currentProfile.name || '');
      if (currentProfile.dob) setBirthDate(currentProfile.dob);
      setBirthHour12(parseInitialHour12(currentProfile.tob));
      setBirthMinute(parseInitialMinute(currentProfile.tob));
      setBirthAmPm(parseInitialAmPm(currentProfile.tob));

      const cName = currentProfile.pob || observerLocation.cityName || 'New Delhi, India';
      const cLat = currentProfile.birthLat ?? observerLocation.latitude ?? 28.6139;
      const cLon = currentProfile.birthLon ?? observerLocation.longitude ?? 77.2090;
      const cTz = currentProfile.birthTimezone || observerLocation.timezone || 'Asia/Kolkata';
      const cOff = currentProfile.birthTzOffset ?? observerLocation.timezoneOffset ?? 5.5;

      setSelectedBirthCity({
        cityName: cName,
        latitude: cLat,
        longitude: cLon,
        timezone: cTz,
        defaultOffset: cOff,
        timezoneOffset: cOff
      });
      setBirthCityQuery(cName);
      setManualLat(cLat.toString());
      setManualLon(cLon.toString());
      setManualOffset(cOff.toString());
      setHasCustomOffset(false);
    }
  }, [isOpen, initialTab, currentProfile, observerLocation]);

  // Close Place of Birth dropdown when clicking outside & close modal on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (pobDropdownRef.current && !pobDropdownRef.current.contains(e.target as Node)) {
        setIsCitySearching(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCitySearching) setIsCitySearching(false);
        else onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isCitySearching, onClose]);

  // Automatically update historical / DST birth timezone offset when birthDate or birthTime changes (unless user typed a manual override)
  useEffect(() => {
    if (!isOpen || hasCustomOffset) return;
    if (selectedBirthCity.timezone && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      let hour24 = birthHour12 % 12;
      if (birthAmPm === 'PM') hour24 += 12;
      const wallTime = `${hour24.toString().padStart(2, '0')}:${birthMinute.toString().padStart(2, '0')}:00`;
      let resolved = OfflineGeoResolver.resolveTimezoneOffsetForDate(
        selectedBirthCity.timezone,
        birthDate,
        selectedBirthCity.defaultOffset
      );
      if (selectedBirthCity.timezone !== 'UTC_OFFSET' && selectedBirthCity.timezone !== 'Local') {
        try {
          resolved = resolveIanaTimezone(birthDate, wallTime, selectedBirthCity.timezone).offsetHours;
        } catch {
          // Spring-forward gap or fall-back fold will be caught explicitly on form submit
        }
      }
      setSelectedBirthCity(prev => ({ ...prev, timezoneOffset: resolved }));
      setManualOffset(resolved.toString());
    }
  }, [isOpen, birthDate, birthHour12, birthMinute, birthAmPm, selectedBirthCity.timezone, selectedBirthCity.defaultOffset, hasCustomOffset]);

  // Google Maps-style 3+ character Place of Birth autocomplete (0ms local + CSP-safe /api/geo/search)
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    const local = OfflineGeoResolver.searchCities(birthCityQuery, 8, birthDate);
    setCitySearchResults(local);

    if (birthCityQuery.trim().length >= 3) {
      setIsCityGeoLoading(true);
      const timer = setTimeout(async () => {
        try {
          const unified = await OfflineGeoResolver.searchUnifiedPlaces(birthCityQuery, 10, birthDate);
          if (!isCancelled) {
            setCitySearchResults(unified);
          }
        } catch {
          // Offline catalog remains active
        } finally {
          if (!isCancelled) setIsCityGeoLoading(false);
        }
      }, 180);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }
    setIsCityGeoLoading(false);
    return undefined;
  }, [isOpen, birthCityQuery, birthDate]);

  // Live Preview for Tab 1 (20-Sec Quiz)
  const wizardPreview: UserProfile = useMemo(() => {
    return PersonalProfileEngine.resolveFromNonTechnicalQuestions({
      fullName: wizardName || 'Seeker',
      dayOrNightBorn: diurnalPhase,
      corePersonalityDrive: personalityDrive,
      sacredNumber
    });
  }, [wizardName, diurnalPhase, personalityDrive, sacredNumber]);

  // Early return strictly AFTER all hooks!
  if (!isOpen) return null;

  const handleSaveWizard = () => {
    const finalProfile = PersonalProfileEngine.resolveFromNonTechnicalQuestions({
      fullName: wizardName.trim() || 'Seeker',
      dayOrNightBorn: diurnalPhase,
      corePersonalityDrive: personalityDrive,
      sacredNumber
    });
    onSaveProfile(finalProfile);
    onClose();
  };

  const handleSelectBirthCityRecord = (city: OfflineCityRecord) => {
    const baseOffset = city.defaultUtcOffset ?? city.timezoneOffset ?? 5.5;
    const resolvedOffset = OfflineGeoResolver.resolveTimezoneOffsetForDate(
      city.timezone,
      birthDate,
      baseOffset
    );
    const label = `${city.name}, ${city.country}`;
    setSelectedBirthCity({
      cityName: label,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone || 'UTC',
      defaultOffset: baseOffset,
      timezoneOffset: resolvedOffset
    });
    setBirthCityQuery(label);
    setManualLat(city.latitude.toString());
    setManualLon(city.longitude.toString());
    setManualOffset(resolvedOffset.toString());
    setHasCustomOffset(false);
    setExactValidationError('');
    setIsCitySearching(false);
  };

  const handleSaveExact = () => {
    setExactValidationError('');

    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setExactValidationError('Please enter a valid Date of Birth (YYYY-MM-DD).');
      return;
    }

    const parsedLat = Number(manualLat);
    const parsedLon = Number(manualLon);
    const parsedOffset = Number(manualOffset);

    if (!Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setExactValidationError('Birth Latitude must be a valid number between -90° and +90°.');
      return;
    }
    if (!Number.isFinite(parsedLon) || parsedLon < -180 || parsedLon > 180) {
      setExactValidationError('Birth Longitude must be a valid number between -180° and +180°.');
      return;
    }
    if (!Number.isFinite(parsedOffset) || parsedOffset < -12 || parsedOffset > 14) {
      setExactValidationError('Birth Timezone UTC Offset must be between -12 and +14 hours (e.g. +5.5 for India, +5.75 for Nepal, -5 for EST).');
      return;
    }

    let hour24 = birthHour12 % 12;
    if (birthAmPm === 'PM') hour24 += 12;
    const timeStr = `${hour24.toString().padStart(2, '0')}:${birthMinute.toString().padStart(2, '0')}`;

    try {
      const finalProfile = PersonalProfileEngine.resolveFromBirthDetails({
        fullName: exactName.trim() || 'Native',
        birthDate,
        birthTime: timeStr,
        birthCityName: selectedBirthCity.cityName || 'Custom Coordinates',
        latitude: parsedLat,
        longitude: parsedLon,
        timezoneOffset: parsedOffset,
        timezone: selectedBirthCity.timezone,
        explicitOffsetOverride: hasCustomOffset
      });
      onSaveProfile(finalProfile);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to compute birth Kundali. Please verify birth date, time, and coordinates.';
      if (/occurred twice|UTC offset/i.test(msg)) {
        setIsManualCoordsOpen(true);
      }
      setExactValidationError(msg);
    }
  };

  const handleSaveUniversal = () => {
    onSaveProfile(PersonalProfileEngine.createUniversalProfile());
    onClose();
  };

  const displayLat = Number.isFinite(Number(manualLat)) ? Number(manualLat) : selectedBirthCity.latitude;
  const displayLon = Number.isFinite(Number(manualLon)) ? Number(manualLon) : selectedBirthCity.longitude;
  const displayOff = Number.isFinite(Number(manualOffset)) ? Number(manualOffset) : selectedBirthCity.timezoneOffset;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-profile-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-3xl rounded-2xl border border-amber-600/50 bg-[#160409] text-rose-100 shadow-2xl overflow-hidden my-6 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/60 bg-gradient-to-r from-[#2a0713] via-[#1a040b] to-[#2a0713] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-xl border border-amber-500/40">
              👤
            </span>
            <div>
              <h2 id="personal-profile-modal-title" className="font-serif text-lg sm:text-xl text-amber-200 font-bold">
                Personalize Your Auspicious Timings
              </h2>
              <p className="text-xs text-rose-300/80">
                Individualized Tara Bala, Chandra Bala &amp; Lagna harmony — with or without birth details
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close profile customization dialog"
            onClick={onClose}
            className="rounded-lg p-2 text-rose-400 hover:bg-rose-950/60 hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="grid grid-cols-3 border-b border-amber-900/40 bg-[#110206] text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('WIZARD')}
            className={`py-3 px-2 sm:px-4 text-center transition-all border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'WIZARD'
                ? 'border-amber-400 bg-amber-950/40 text-amber-200 font-bold'
                : 'border-transparent text-rose-400/80 hover:text-rose-200 hover:bg-rose-950/30'
            }`}
          >
            <span className="text-sm">🌟</span>
            <span>No Birth Details</span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">20-Sec Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXACT')}
            className={`py-3 px-2 sm:px-4 text-center transition-all border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'EXACT'
                ? 'border-amber-400 bg-amber-950/40 text-amber-200 font-bold'
                : 'border-transparent text-rose-400/80 hover:text-rose-200 hover:bg-rose-950/30'
            }`}
          >
            <span className="text-sm">📜</span>
            <span>With Birth Details</span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">DOB + TOB</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('UNIVERSAL')}
            className={`py-3 px-2 sm:px-4 text-center transition-all border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
              activeTab === 'UNIVERSAL'
                ? 'border-amber-400 bg-amber-950/40 text-amber-200 font-bold'
                : 'border-transparent text-rose-400/80 hover:text-rose-200 hover:bg-rose-950/30'
            }`}
          >
            <span className="text-sm">🌍</span>
            <span>Universal Mode</span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">City-Wide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* ========================================================================= */}
          {/* TAB 1: QUICK 20-SEC NON-TECHNICAL QUIZ (NO BIRTH DETAILS)                */}
          {/* ========================================================================= */}
          {activeTab === 'WIZARD' && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 sm:p-4 text-xs text-rose-200 flex items-start gap-3">
                <span className="text-xl">✨</span>
                <div className="space-y-1">
                  <div className="font-semibold text-amber-300">
                    108-Pada Avakahada Swara Shastra — Zero Birth Certificate Needed
                  </div>
                  <p className="text-rose-300/90 leading-relaxed">
                    Resolves your <em>Naam Nakshatra</em>, Pada (1–4), Rashi, and Prashna Lagna from your calling name syllable (English or Devanagari), diurnal phase, elemental instinct, and sacred number (1–9).
                  </p>
                </div>
              </div>

              {/* Question 1: Calling Name */}
              <div className="space-y-2">
                <label htmlFor="wizard-calling-name" className="block text-xs font-semibold text-amber-200 uppercase tracking-wide">
                  1. What is your Calling Name? (What friends &amp; family call you)
                </label>
                <div className="relative">
                  <input
                    id="wizard-calling-name"
                    type="text"
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    placeholder="e.g., Rohit, Priya, Omkar, Zoya, अजय..."
                    className="w-full rounded-xl border border-amber-700/60 bg-[#21060f] px-4 py-3 text-sm text-white placeholder-rose-400/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  {wizardName.trim().length > 0 && (
                    <div className="mt-1.5 sm:mt-0 sm:absolute sm:right-3 sm:top-2.5 inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      🎵 {wizardPreview.nakshatraName} (Pada {wizardPreview.nakshatraPada}) · {wizardPreview.moonSignName}
                    </div>
                  )}
                </div>
              </div>

              {/* Question 2: Diurnal Birth Phase */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-amber-200 uppercase tracking-wide">
                  2. Approximately what time of day were you born?
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: 'MORNING', icon: '🌅', label: 'Morning', sub: 'Sunrise - 12 PM' },
                      { id: 'AFTERNOON', icon: '☀️', label: 'Afternoon', sub: '12 PM - 5 PM' },
                      { id: 'EVENING', icon: '🌇', label: 'Evening', sub: '5 PM - 8 PM' },
                      { id: 'NIGHT', icon: '🌙', label: 'Night', sub: '8 PM - Sunrise' },
                      { id: 'UNKNOWN', icon: '❓', label: 'Unknown', sub: 'Not sure at all' }
                    ] as const
                  ).map((phase) => (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => setDiurnalPhase(phase.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        diurnalPhase === phase.id
                          ? 'border-amber-400 bg-amber-950/60 text-amber-200 shadow-md ring-1 ring-amber-400'
                          : 'border-rose-950 bg-[#21060f]/60 text-rose-300/80 hover:border-amber-800 hover:text-white'
                      }`}
                    >
                      <div className="text-lg">{phase.icon}</div>
                      <div className="text-xs font-medium mt-1">{phase.label}</div>
                      <div className="text-[10px] text-rose-400/60">{phase.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Core Personality Instinct */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-amber-200 uppercase tracking-wide">
                  3. What is your natural core instinct in life &amp; work?
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(
                    [
                      {
                        id: 'FIRE_LEADER',
                        icon: '⚡',
                        title: 'Bold Leader & Initiator (Fire / Agni)',
                        desc: 'Driven by high energy, quick action, pioneering ideas, and taking charge.'
                      },
                      {
                        id: 'EARTH_BUILDER',
                        icon: '🏛️',
                        title: 'Practical Builder & Creator (Earth / Prithvi)',
                        desc: 'Grounded, patient, focused on long-term wealth, reliability, and tangible execution.'
                      },
                      {
                        id: 'AIR_THINKER',
                        icon: '💡',
                        title: 'Strategic Thinker & Innovator (Air / Vayu)',
                        desc: 'Curious, intellectual, fast communicator, adaptable, love connecting ideas.'
                      },
                      {
                        id: 'WATER_EMPATH',
                        icon: '🌊',
                        title: 'Intuitive Empath & Visionary (Water / Jala)',
                        desc: 'Deep emotional wisdom, artistic resonance, perceptive, highly attuned to vibes.'
                      }
                    ] as const
                  ).map((drive) => (
                    <button
                      key={drive.id}
                      type="button"
                      onClick={() => setPersonalityDrive(drive.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        personalityDrive === drive.id
                          ? 'border-amber-400 bg-amber-950/60 text-amber-200 shadow-md ring-1 ring-amber-400'
                          : 'border-rose-950 bg-[#21060f]/60 text-rose-300/80 hover:border-amber-800 hover:text-white'
                      }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{drive.icon}</span>
                      <div>
                        <div className="text-xs font-semibold text-amber-300">{drive.title}</div>
                        <div className="text-[11px] text-rose-300/70 mt-0.5 leading-snug">{drive.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 4: Sacred Resonance Number */}
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-amber-200 uppercase tracking-wide">
                  4. Choose your Sacred Prashna Number (1 to 9):
                </span>
                <div className="flex items-center justify-between gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSacredNumber(num)}
                      className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border text-sm font-bold transition-all flex items-center justify-center ${
                        sacredNumber === num
                          ? 'border-amber-400 bg-amber-500 text-black shadow-lg scale-105'
                          : 'border-rose-950 bg-[#21060f] text-rose-300 hover:border-amber-700 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 sm:p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <span>✨</span> Your Derived Personal Cosmic Harmonic:
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono">
                    108-Pada Live Preview
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="rounded-lg bg-black/40 p-2 border border-emerald-900/40">
                    <span className="text-rose-400/80 block text-[10px]">Naam Nakshatra:</span>
                    <strong className="text-white text-xs">
                      {wizardPreview.nakshatraName} (Pada {wizardPreview.nakshatraPada})
                    </strong>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-emerald-900/40">
                    <span className="text-rose-400/80 block text-[10px]">Moon Sign (Rashi):</span>
                    <strong className="text-amber-300 text-xs">{wizardPreview.moonSignName}</strong>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2 border border-emerald-900/40">
                    <span className="text-rose-400/80 block text-[10px]">Prashna Ascendant (Lagna):</span>
                    <strong className="text-rose-200 text-xs">{wizardPreview.ascendantSignName}</strong>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-200/90 italic pt-1">
                  {wizardPreview.derivationSummary}
                </p>
              </div>

              {/* Shastric Explainer Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowShastricExplainer(!showShastricExplainer)}
                  className="text-xs text-amber-400/90 hover:text-amber-300 underline flex items-center gap-1"
                >
                  <span>{showShastricExplainer ? '▼ Hide' : '▶ Learn More:'}</span>
                  <span>How does the 108-Pada Avakahada Chakra personalize without birth time?</span>
                </button>
                {showShastricExplainer && (
                  <div className="mt-2 rounded-xl border border-amber-900/40 bg-black/50 p-3 text-[11px] text-rose-300/90 space-y-1.5 leading-relaxed">
                    <p>
                      <strong>1. Akshara-Pada Mapping:</strong> Each of the 27 Nakshatras has 4 Padas (108 sound syllables total). Your calling syllable maps to a unique 3°20&apos; arc of the sidereal zodiac, determining both Naam Nakshatra and Rashi.
                    </p>
                    <p>
                      <strong>2. Diurnal + Tattva + Prashna Lagna:</strong> Your birth time-of-day, elemental drive, and sacred number (1–9) calibrate your functional Lagna so Tara Bala, Chandra Bala, and Lagna harmony adapt dynamically.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveWizard}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-black shadow-xl hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>Activate My Personalized Profile Now</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: EXACT BIRTH DETAILS (DOB + TOB + POB)                             */}
          {/* ========================================================================= */}
          {activeTab === 'EXACT' && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 sm:p-4 text-xs text-rose-200 flex items-start gap-3">
                <span className="text-xl">📜</span>
                <div className="space-y-1">
                  <div className="font-semibold text-blue-300">
                    Exact Drik Ganita Birth Kundali (True Chitrapaksha Lahiri Ayanamsa)
                  </div>
                  <p className="text-rose-300/90 leading-relaxed">
                    Enter your Date, 12-Hour AM/PM Time, and Place of Birth. Typing 3+ letters autofills global coordinates and automatically resolves historical/DST UTC offset for your birth date.
                  </p>
                </div>
              </div>

              {exactValidationError && (
                <div role="alert" className="rounded-xl border border-rose-500/80 bg-rose-950/80 px-4 py-3 text-xs text-rose-100 flex items-start gap-2">
                  <span className="text-base leading-none">⚠️</span>
                  <span>{exactValidationError}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="exact-full-name" className="block text-xs font-semibold text-amber-200 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  id="exact-full-name"
                  type="text"
                  value={exactName}
                  onChange={(e) => setExactName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-amber-700/60 bg-[#21060f] px-4 py-3 text-sm text-white placeholder-rose-400/40 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Date of Birth & Time of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="exact-birth-date" className="block text-xs font-semibold text-amber-200 uppercase tracking-wide">
                    Date of Birth
                  </label>
                  <input
                    id="exact-birth-date"
                    type="date"
                    value={birthDate}
                    onChange={(e) => {
                      setBirthDate(e.target.value);
                      setExactValidationError('');
                    }}
                    className="w-full rounded-xl border border-amber-700/60 bg-[#21060f] px-4 py-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold text-amber-200 uppercase tracking-wide">
                    Time of Birth (12-Hour AM/PM)
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Birth hour"
                      value={birthHour12}
                      onChange={(e) => setBirthHour12(Number(e.target.value))}
                      className="rounded-xl border border-amber-700/60 bg-[#21060f] px-3 py-3 text-sm text-white focus:border-amber-400 focus:outline-none flex-1"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                        <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span className="text-amber-400 font-bold">:</span>
                    <select
                      aria-label="Birth minute"
                      value={birthMinute}
                      onChange={(e) => setBirthMinute(Number(e.target.value))}
                      className="rounded-xl border border-amber-700/60 bg-[#21060f] px-3 py-3 text-sm text-white focus:border-amber-400 focus:outline-none flex-1"
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <div className="flex rounded-xl border border-amber-700/60 bg-[#21060f] p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setBirthAmPm('AM')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          birthAmPm === 'AM' ? 'bg-amber-500 text-black shadow' : 'text-rose-400 hover:text-white'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setBirthAmPm('PM')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          birthAmPm === 'PM' ? 'bg-amber-500 text-black shadow' : 'text-rose-400 hover:text-white'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Place of Birth & Coordinates */}
              <div className="space-y-3" ref={pobDropdownRef}>
                <div className="flex items-center justify-between">
                  <label htmlFor="exact-birth-place" className="block text-xs font-semibold text-amber-200 uppercase tracking-wide">
                    Place of Birth (Type 3+ Letters for Global Autofill)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        setGpsNotice('Browser geolocation is unavailable.');
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const lat = Number(pos.coords.latitude.toFixed(4));
                          const lon = Number(pos.coords.longitude.toFixed(4));
                          const nearest = OfflineGeoResolver.findNearestCity(lat, lon);
                          const devTz = OfflineGeoResolver.getDeviceTimezone();
                          const useNearest = nearest.distanceKm < 30;
                          const tzName = useNearest ? nearest.city.timezone : devTz.timezone;
                          const baseOff = useNearest ? nearest.city.defaultUtcOffset : devTz.utcOffsetHours;
                          const resolvedOff = OfflineGeoResolver.resolveTimezoneOffsetForDate(tzName, birthDate, baseOff);
                          const name = useNearest
                            ? `${nearest.city.name}, ${nearest.city.country} (GPS)`
                            : `GPS (${OfflineGeoResolver.formatCoordinates(lat, lon, 2)})`;

                          setSelectedBirthCity({
                            cityName: name,
                            latitude: lat,
                            longitude: lon,
                            timezone: tzName,
                            defaultOffset: baseOff,
                            timezoneOffset: resolvedOff
                          });
                          setBirthCityQuery(name);
                          setManualLat(lat.toString());
                          setManualLon(lon.toString());
                          setManualOffset(resolvedOff.toString());
                          setHasCustomOffset(false);
                          setGpsNotice(`Locked to ${name} (${OfflineGeoResolver.formatCoordinates(lat, lon, 4)})`);
                        },
                        () => setGpsNotice('Location permission denied; search any city below or enter Lat/Lon manually.')
                      );
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline"
                  >
                    <span>📍</span>
                    <span>Use Device GPS</span>
                  </button>
                </div>

                {gpsNotice && (
                  <p className="text-[11px] text-emerald-300 font-mono">{gpsNotice}</p>
                )}

                <div className="relative">
                  <input
                    id="exact-birth-place"
                    type="text"
                    value={birthCityQuery}
                    onChange={(e) => {
                      setBirthCityQuery(e.target.value);
                      setIsCitySearching(true);
                    }}
                    onFocus={() => setIsCitySearching(true)}
                    placeholder="Type 3+ letters (e.g. Mum, Varanasi, Kathmandu, New York, Sydney)..."
                    className="w-full rounded-xl border border-amber-700/60 bg-[#21060f] pl-4 pr-16 py-3 text-sm text-white placeholder-rose-400/40 focus:border-amber-400 focus:outline-none"
                  />
                  {isCityGeoLoading && (
                    <span className="absolute right-9 top-3.5 text-amber-400 animate-spin text-xs">⏳</span>
                  )}
                  {birthCityQuery && (
                    <button
                      type="button"
                      aria-label="Clear birth city search"
                      onClick={() => {
                        setBirthCityQuery('');
                        setIsCitySearching(true);
                      }}
                      className="absolute right-3 top-3 text-rose-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}

                  {/* Autocomplete Dropdown */}
                  {isCitySearching && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-amber-700/80 bg-[#160409] p-1.5 shadow-2xl space-y-0.5">
                      {citySearchResults.length > 0 ? (
                        citySearchResults.map((city: OfflineCityRecord) => {
                          const offset = city.timezoneOffset ?? city.defaultUtcOffset ?? 5.5;
                          return (
                            <button
                              key={`${city.id}-${city.latitude}-${city.longitude}`}
                              type="button"
                              onClick={() => handleSelectBirthCityRecord(city)}
                              className="w-full text-left px-3 py-2.5 rounded-lg text-xs text-rose-200 hover:bg-amber-950/60 hover:text-amber-200 flex items-center justify-between transition-colors border-b border-rose-950/30 last:border-b-0"
                            >
                              <div>
                                <span className="font-semibold text-white block text-xs">📍 {city.name}</span>
                                <span className="text-[11px] text-rose-300/70">
                                  {city.state ? `${city.state}, ` : ''}{city.country}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-amber-300 font-mono font-medium block">
                                  {OfflineGeoResolver.formatCoordinates(city.latitude, city.longitude, 2)}
                                </span>
                                <span className="text-[9px] text-emerald-400 font-mono">
                                  UTC{offset >= 0 ? `+${offset}` : offset} ({city.timezone})
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-rose-400 text-xs">
                          {isCityGeoLoading
                            ? 'Searching global coordinates...'
                            : 'No matching city found. Use ⚙️ Edit Exact Lat / Lon below.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Autofilled Birth Coordinates Telemetry Card */}
                <div className="rounded-xl border border-blue-800/50 bg-blue-950/25 p-3 text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300 block">
                        ✓ Autofilled Birth Location Coordinates ({selectedBirthCity.cityName}):
                      </span>
                      <span className="font-mono text-amber-300 font-bold text-xs block">
                        Latitude / Longitude: {OfflineGeoResolver.formatCoordinates(displayLat, displayLon, 4)} · UTC{displayOff >= 0 ? `+${displayOff}` : displayOff}h ({selectedBirthCity.timezone})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsManualCoordsOpen(!isManualCoordsOpen)}
                      className="shrink-0 rounded-lg border border-amber-600/50 bg-[#290812] px-2.5 py-1 text-[11px] font-medium text-amber-200 hover:bg-amber-900/40 transition-colors"
                    >
                      {isManualCoordsOpen ? 'Hide Coordinate Inputs' : '⚙️ Edit Exact Lat / Lon'}
                    </button>
                  </div>

                  {isManualCoordsOpen && (
                    <div className="mt-3 pt-3 border-t border-blue-900/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-fade-in">
                      <div>
                        <label htmlFor="manual-birth-lat" className="block text-[10px] text-rose-300 font-medium mb-1">
                          Latitude (-90 to +90):
                        </label>
                        <input
                          id="manual-birth-lat"
                          type="number"
                          step="0.0001"
                          value={manualLat}
                          onChange={(e) => {
                            setManualLat(e.target.value);
                            setExactValidationError('');
                          }}
                          className="w-full rounded-lg border border-amber-700/60 bg-[#21060f] p-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label htmlFor="manual-birth-lon" className="block text-[10px] text-rose-300 font-medium mb-1">
                          Longitude (-180 to +180):
                        </label>
                        <input
                          id="manual-birth-lon"
                          type="number"
                          step="0.0001"
                          value={manualLon}
                          onChange={(e) => {
                            setManualLon(e.target.value);
                            setExactValidationError('');
                          }}
                          className="w-full rounded-lg border border-amber-700/60 bg-[#21060f] p-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label htmlFor="manual-birth-offset" className="block text-[10px] text-rose-300 font-medium mb-1">
                          UTC Offset at Birth (-12 to +14):
                        </label>
                        <input
                          id="manual-birth-offset"
                          type="number"
                          step="0.25"
                          value={manualOffset}
                          onChange={(e) => {
                            setManualOffset(e.target.value);
                            setHasCustomOffset(true);
                            setExactValidationError('');
                          }}
                          className="w-full rounded-lg border border-amber-700/60 bg-[#21060f] p-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveExact}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                <span>🔮</span>
                <span>Compute Exact Kundali &amp; Harmonize</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: UNIVERSAL MODE (NO INDIVIDUAL FILTERING)                           */}
          {/* ========================================================================= */}
          {activeTab === 'UNIVERSAL' && (
            <div className="space-y-6 animate-fade-in text-center py-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-3xl border border-emerald-500/40">
                🌍
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-base font-serif font-bold text-amber-200">
                  Switch to Pure Universal City Timings
                </h3>
                <p className="text-xs text-rose-300/80 leading-relaxed">
                  Displays pure macrocosmic timings (Abhijit Muhurta, Rahu Kaal, Yamaghanta, 16 Choghadiyas, 24 Horas, and 5-Limb Panchang) strictly anchored to your chosen city&apos;s topocentric sunrise and sunset without personal birth filtering.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveUniversal}
                className="rounded-xl border border-emerald-500/60 bg-emerald-950/50 px-6 py-3 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 transition-all shadow-lg"
              >
                Set to Universal City Mode
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-amber-900/60 bg-[#110206] px-5 py-3 text-center text-[11px] text-rose-400/60 flex items-center justify-between">
          <span>🔒 100% Client-Edge Calculation · $0 Cloud Compute</span>
          <button
            type="button"
            onClick={onClose}
            className="text-rose-300 hover:text-white underline text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
