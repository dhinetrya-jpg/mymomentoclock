/**
 * @license
 * MIT License
 *
 * Auspicious Chrono-Dial & Real-Time Vedic Panchang Interface
 * - Clickable 96-segment 24-hour SVG Chronometer formatted in 12-Hour AM/PM
 * - Live Topocentric Sripati Bhava Chalit cusps computed from real-time Sidereal Ascendant & Midheaven
 * - Interactive 16 Choghadiyas + 24 Planetary Horas clicking directly into Do's & Don'ts
 */

import React, { useState, useEffect, useMemo } from 'react';
import { HighPrecisionAstroEngine, LocationCoordinates, DayAnalysisResult, BhavaCusp } from '../engine/zeroCostAstroEngine';
import { PersonalAuspiciousnessScoringEngine, NatalProfile, IntradayScoringSample } from '../engine/scoringEngine';

export const MAJOR_PWA_CITIES: Record<string, LocationCoordinates> = {
  'New Delhi': { latitude: 28.6139, longitude: 77.2090, cityName: 'New Delhi, India', timezone: 'Asia/Kolkata', timezoneOffset: 5.5 },
  'Mumbai': { latitude: 19.0760, longitude: 72.8777, cityName: 'Mumbai, India', timezone: 'Asia/Kolkata', timezoneOffset: 5.5 },
  'Bengaluru': { latitude: 12.9716, longitude: 77.5946, cityName: 'Bengaluru, India', timezone: 'Asia/Kolkata', timezoneOffset: 5.5 },
  'Kolkata': { latitude: 22.5726, longitude: 88.3639, cityName: 'Kolkata, India', timezone: 'Asia/Kolkata', timezoneOffset: 5.5 },
  'London': { latitude: 51.5074, longitude: -0.1278, cityName: 'London, UK', timezone: 'Europe/London', timezoneOffset: 0.0 },
  'New York': { latitude: 40.7128, longitude: -74.0060, cityName: 'New York, USA', timezone: 'America/New_York', timezoneOffset: -5.0 },
  'San Francisco': { latitude: 37.7749, longitude: -122.4194, cityName: 'San Francisco, USA', timezone: 'America/Los_Angeles', timezoneOffset: -8.0 },
  'Dubai': { latitude: 25.2048, longitude: 55.2708, cityName: 'Dubai, UAE', timezone: 'Asia/Dubai', timezoneOffset: 4.0 },
  'Singapore': { latitude: 1.3521, longitude: 103.8198, cityName: 'Singapore', timezone: 'Asia/Singapore', timezoneOffset: 8.0 }
};

interface AuspiciousChronoDialProps {
  selectedDate?: string;
  location?: LocationCoordinates;
  natal?: NatalProfile;
  currentMinutesOfDay?: number;
  onMinutesChange?: (mins: number) => void;
  onSelectWindow?: (windowName: string, timeSpan?: string) => void;
}

export const AuspiciousChronoDial: React.FC<AuspiciousChronoDialProps> = ({
  selectedDate: propDate,
  location: propLocation,
  natal: propNatal,
  currentMinutesOfDay: propMinutes,
  onMinutesChange,
  onSelectWindow
}) => {
  const [selectedCityKey, setSelectedCityKey] = useState<string>('New Delhi');
  const [internalDate, setInternalDate] = useState<string>(() => HighPrecisionAstroEngine.getObserverDateString(5.5));
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'DIAL' | 'CHOGHADIYA' | 'HORAS' | 'BHAVA_CHALIT'>('DIAL');

  const selectedDate = propDate || internalDate;
  const city = propLocation || MAJOR_PWA_CITIES[selectedCityKey] || MAJOR_PWA_CITIES['New Delhi'];

  const [sampleNatal] = useState<NatalProfile>({
    natalMoonNakshatraIndex: 4,
    natalMoonSignIndex: 1,
    natalAscendantSignIndex: 0
  });

  const activeNatal = propLocation !== undefined ? propNatal : (isPersonalized ? sampleNatal : undefined);

  const dayData: DayAnalysisResult = useMemo(() => {
    return HighPrecisionAstroEngine.analyzeFullDay(selectedDate, city);
  }, [selectedDate, city]);

  const timeline: IntradayScoringSample[] = useMemo(() => {
    return PersonalAuspiciousnessScoringEngine.generate24HourTimeline(dayData, activeNatal);
  }, [dayData, activeNatal]);

  const [internalMinutesOfDay, setInternalMinutesOfDay] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const activeMinutes = propMinutes !== undefined ? propMinutes : internalMinutesOfDay;

  useEffect(() => {
    if (propMinutes !== undefined) return;
    const timer = setInterval(() => {
      const now = new Date();
      setInternalMinutesOfDay(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, [propMinutes]);

  const fallbackSample: IntradayScoringSample = {
    timestampIso: new Date().toISOString(),
    epochMs: Date.now(),
    localTimeStr: '12:00',
    localTime12Hr: '12:00 PM',
    auspiciousnessScore: 75,
    tier: 'SHUBHA',
    colorHex: '#3B82F6',
    activeChoghadiya: 'Shubh (Auspicious)',
    activeChoghadiyaName: 'Shubh',
    activeHora: 'Jupiter Hora',
    activeHoraPlanet: 'Jupiter',
    isRahuKaalActive: false,
    isYamaghantaActive: false,
    isAbhijitActive: true,
    taraBalaCategory: 'Universal Mode',
    chandraBalaHouse: 1,
    isAshtamaChandra: false,
    executiveAdvice: 'Constructive planetary alignment. Favorable for daily initiatives.'
  };

  // Exact evaluation at activeMinutes (supports minute-level resolution when slider/clock changes)
  const activeSample: IntradayScoringSample = useMemo(() => {
    try {
      const [y, m, d] = dayData.date.split('-').map(Number);
      const tz = city.timezoneOffset ?? 5.5;
      const evalInstant = new Date(Date.UTC(y, m - 1, d, 0, activeMinutes - Math.round(tz * 60)));
      return PersonalAuspiciousnessScoringEngine.evaluateInstant(evalInstant, dayData, activeNatal);
    } catch {
      return timeline[Math.min(timeline.length - 1, Math.max(0, Math.floor(activeMinutes / 15)))] || fallbackSample;
    }
  }, [dayData, city.timezoneOffset, activeMinutes, activeNatal, timeline]);

  // Live Topocentric Sidereal Ascendant & Midheaven -> 12 Sripati Bhava Chalit Cusps
  const liveAngles = useMemo(() => {
    return HighPrecisionAstroEngine.calculateLiveAngles(activeSample.epochMs, city.latitude, city.longitude);
  }, [activeSample.epochMs, city.latitude, city.longitude]);

  const bhavaCusps: BhavaCusp[] = useMemo(() => {
    return HighPrecisionAstroEngine.calculateBhavaChalitCusps(liveAngles.siderealAscendant, liveAngles.siderealMidheaven);
  }, [liveAngles.siderealAscendant, liveAngles.siderealMidheaven]);

  const radius = 140;
  const strokeWidth = 24;
  const center = 160;

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180.0);
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  const needleAngle = (activeMinutes / 1440.0) * 360.0;
  const needleCoords = polarToCartesian(center, center, radius - 15, needleAngle);
  const isAbhijitValid = dayData.fixedKaalas.abhijitMuhurta.isValidOnThisDay;

  return (
    <div className="rounded-2xl border border-amber-900/60 bg-[#140307] p-4 md:p-6 text-rose-100 shadow-2xl space-y-6 scroll-mt-28">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-950 pb-4">
        <div>
          <h2 className="font-serif text-2xl text-amber-300 flex flex-wrap items-center gap-2">
            <span>⏱️</span> Auspicious 24-Hour Chrono-Dial
            <span className="text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/50 bg-emerald-950/60 text-emerald-300 font-sans">
              Click Any Ring Segment to Jump Time
            </span>
          </h2>
          <p className="text-xs text-rose-300/80 mt-1">
            Meeus VSOP87 + ELP2000 Engine · Topocentric Refraction Corrected · Live {bhavaCusps[0]?.rashiName || 'Aries'} Lagna ({liveAngles.siderealAscendant.toFixed(1)}°)
          </p>
        </div>

        {!propDate && !propLocation && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCityKey}
              onChange={(e) => setSelectedCityKey(e.target.value)}
              className="rounded-lg border border-amber-700/60 bg-[#1f060d] px-3 py-1.5 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {Object.keys(MAJOR_PWA_CITIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <input
              type="date"
              value={internalDate}
              onChange={(e) => {
                if (e.target.value) setInternalDate(e.target.value);
              }}
              className="rounded-lg border border-amber-700/60 bg-[#1f060d] px-3 py-1.5 text-xs text-amber-200 focus:outline-none"
            />

            <button
              type="button"
              onClick={() => setIsPersonalized(!isPersonalized)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isPersonalized
                  ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300'
                  : 'border-rose-800 bg-rose-950/50 text-rose-300'
              }`}
            >
              {isPersonalized ? '✓ Sample Tara Bala' : '○ Universal View'}
            </button>
          </div>
        )}
      </div>

      {/* Polar Latitude Warning Banner (e.g. Tromsø in June / December) */}
      {dayData.solarMetrics.isPolar && (
        <div role="status" className="rounded-xl border border-amber-500/60 bg-amber-950/40 px-4 py-3 text-xs text-amber-200 flex items-center gap-2.5">
          <span className="text-lg">🧭</span>
          <span>
            <strong>High-Latitude Solar Notice ({dayData.solarMetrics.polarCondition === 'POLAR_DAY' ? 'Midnight Sun / Continuous Daylight' : 'Polar Night / No Horizon Sunrise'}):</strong>{' '}
            Classical equal-octant Deshantara solar approximation anchored to True Solar Noon ({dayData.solarMetrics.solarNoon12Hr}).
          </span>
        </div>
      )}

      {/* Main Dial & Live Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: SVG 24-Hour Circular Chrono-Dial */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-2">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80">
            <svg viewBox="0 0 320 320" className="w-full h-full transform -rotate-90" role="img" aria-label="24-hour auspicious timing dial">
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#2a0812"
                strokeWidth={strokeWidth}
              />

              {/* 96 Clickable Timeline Arcs (15-min segments) */}
              {timeline.map((sample, idx) => {
                const startAngle = (idx / timeline.length) * 360.0;
                const endAngle = ((idx + 1) / timeline.length) * 360.0;
                return (
                  <path
                    key={idx}
                    d={describeArc(center, center, radius, startAngle, endAngle)}
                    fill="none"
                    stroke={sample.colorHex}
                    strokeWidth={strokeWidth}
                    opacity={0.88}
                    onClick={() => {
                      if (onMinutesChange) onMinutesChange(idx * 15);
                      else setInternalMinutesOfDay(idx * 15);
                    }}
                    className="cursor-pointer hover:opacity-100 transition-opacity"
                  >
                    <title>{`${sample.localTime12Hr} — ${sample.auspiciousnessScore}% (${sample.tier}) · ${sample.activeChoghadiya}`}</title>
                  </path>
                );
              })}

              {/* 12 AM, 6 AM, 12 PM, 6 PM Markers */}
              {[0, 6, 12, 18].map((hour) => {
                const angle = (hour / 24.0) * 360.0;
                const ptOuter = polarToCartesian(center, center, radius + 14, angle);
                const ptInner = polarToCartesian(center, center, radius - 14, angle);
                return (
                  <line
                    key={hour}
                    x1={ptInner.x}
                    y1={ptInner.y}
                    x2={ptOuter.x}
                    y2={ptOuter.y}
                    stroke="#D4AF37"
                    strokeWidth={2}
                    opacity={0.75}
                    className="pointer-events-none"
                  />
                );
              })}

              {/* Live Time Rotating Needle */}
              <line
                x1={center}
                y1={center}
                x2={needleCoords.x}
                y2={needleCoords.y}
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
                className="pointer-events-none drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              />
              <circle cx={center} cy={center} r={6} fill="#D4AF37" className="pointer-events-none" />
            </svg>

            {/* Center Dial Hub Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-serif font-bold text-amber-200 tracking-tight">
                {activeSample.auspiciousnessScore}%
              </span>
              <span
                className="text-xs font-semibold tracking-wider px-2.5 py-0.5 rounded-full mt-1"
                style={{
                  backgroundColor: `${activeSample.colorHex}22`,
                  color: activeSample.colorHex,
                  border: `1px solid ${activeSample.colorHex}66`
                }}
              >
                {activeSample.tier}
              </span>
              <span className="text-xs font-mono text-amber-100 mt-1 font-semibold">
                {activeSample.localTime12Hr}
              </span>
              <span className="text-[10px] text-rose-300/80">
                {bhavaCusps[0]?.rashiName} Lagna
              </span>
            </div>
          </div>

          {/* Quick Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs mt-3 text-rose-300">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Amritham (&ge;75%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span> Shubha (55-74%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> Madhyama</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> Rahu / Varjya</span>
          </div>
        </div>

        {/* Right: Live Telemetry & Executive Verdict */}
        <div className="lg:col-span-6 space-y-4">
          <div
            className="rounded-xl border p-4 transition-all"
            style={{
              borderColor: `${activeSample.colorHex}55`,
              backgroundColor: `${activeSample.colorHex}10`
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📢</span>
                <h3 className="font-semibold text-amber-200 text-sm">
                  Real-Time Guidance ({activeSample.localTime12Hr})
                </h3>
              </div>
              {activeSample.isAshtamaChandra && (
                <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-600 text-[10px] font-bold text-rose-200">
                  ⚠️ Ashtama Chandra (8th Moon)
                </span>
              )}
            </div>
            <p className="text-sm mt-2 leading-relaxed text-rose-100">
              {activeSample.executiveAdvice}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => onSelectWindow?.(`${activeSample.activeChoghadiyaName} Choghadiya`, activeSample.localTime12Hr)}
                className="px-2.5 py-1 rounded-md bg-[#19050b] border border-rose-900 text-amber-300 hover:border-amber-400 transition-colors"
              >
                Choghadiya: {activeSample.activeChoghadiya} ↗
              </button>
              <button
                type="button"
                onClick={() => onSelectWindow?.(activeSample.activeHora, activeSample.localTime12Hr)}
                className="px-2.5 py-1 rounded-md bg-[#19050b] border border-rose-900 text-amber-300 hover:border-amber-400 transition-colors"
              >
                Hora: {activeSample.activeHora} ↗
              </button>
              {activeSample.isRahuKaalActive && (
                <button
                  type="button"
                  onClick={() => onSelectWindow?.('Rahu Kaalam')}
                  className="px-2.5 py-1 rounded-md bg-rose-950 border border-rose-600 text-rose-200 font-bold"
                >
                  ⚠️ Rahu Kaal Active
                </button>
              )}
              {activeSample.isAbhijitActive && (
                <button
                  type="button"
                  onClick={() => onSelectWindow?.('Abhijit Muhurta')}
                  className="px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-500 text-emerald-200 font-bold"
                >
                  🌟 Abhijit Muhurta Active
                </button>
              )}
            </div>
          </div>

          {/* 5-Limb Panchang Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-lg border border-rose-950 bg-[#1d060e] p-2.5">
              <span className="text-rose-400 block">Tithi ({dayData.panchanga.tithi.paksha})</span>
              <strong className="text-amber-200 text-sm">{dayData.panchanga.tithi.name}</strong>
              <span className="block text-[10px] text-rose-400 mt-0.5">{dayData.panchanga.tithi.degreeInSpan}° / 12°</span>
            </div>
            <div className="rounded-lg border border-rose-950 bg-[#1d060e] p-2.5">
              <span className="text-rose-400 block">Nakshatra (Pada {dayData.panchanga.nakshatra.pada})</span>
              <strong className="text-amber-200 text-sm">{dayData.panchanga.nakshatra.name}</strong>
              <span className="block text-[10px] text-rose-400 mt-0.5">Lord: {dayData.panchanga.nakshatra.lord}</span>
            </div>
            <div className="rounded-lg border border-rose-950 bg-[#1d060e] p-2.5">
              <span className="text-rose-400 block">Nitya Yoga</span>
              <strong className="text-amber-200 text-sm">{dayData.panchanga.yoga.name}</strong>
              <span className="block text-[10px] text-rose-400 mt-0.5">Harmonic {dayData.panchanga.yoga.index}/27</span>
            </div>
            <div className="rounded-lg border border-rose-950 bg-[#1d060e] p-2.5">
              <span className="text-rose-400 block">Karana (Half-Tithi)</span>
              <strong className="text-amber-200 text-sm">{dayData.panchanga.karana.name}</strong>
              <span className="block text-[10px] text-rose-400 mt-0.5">
                {dayData.panchanga.karana.isVishtiBhadra ? '⚠️ Vishti Bhadra Caution' : `Span ${dayData.panchanga.karana.degreeInSpan}° / 6°`}
              </span>
            </div>
            <div className="rounded-lg border border-rose-950 bg-[#1d060e] p-2.5">
              <span className="text-rose-400 block">Vaara (Solar Day)</span>
              <strong className="text-amber-200 text-sm">{dayData.panchanga.vaara.name}</strong>
              <span className="block text-[10px] text-rose-400 mt-0.5">Lord: {dayData.panchanga.vaara.lord}</span>
            </div>
            <div className="rounded-lg border border-rose-950 bg-[#1d060e] p-2.5">
              <span className="text-rose-400 block">Ayanamsa</span>
              <strong className="text-amber-200 text-sm">Chitrapaksha</strong>
              <span className="block text-[10px] text-rose-400 mt-0.5">{dayData.ayanamsa.valueDegrees}°</span>
            </div>
          </div>

          {/* Key Solar Windows Strip (12-Hour AM/PM) */}
          <div className="rounded-xl border border-rose-950 bg-[#19050c] p-3 text-xs space-y-2">
            <span className="font-semibold text-amber-300 block">Core Solar Windows (12-Hour Local Time)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-rose-400 block">🌅 Sunrise</span>
                <span className="text-rose-100 font-medium">{dayData.solarMetrics.sunrise12Hr}</span>
              </div>
              <div>
                <span className="text-rose-400 block">🌇 Sunset</span>
                <span className="text-rose-100 font-medium">{dayData.solarMetrics.sunset12Hr}</span>
              </div>
              <div>
                <span className="text-rose-400 block">🔴 Rahu Kaal</span>
                <span className="text-rose-200 font-semibold">
                  {dayData.fixedKaalas.rahuKaal.start12Hr} – {dayData.fixedKaalas.rahuKaal.end12Hr}
                </span>
              </div>
              <div>
                <span className="text-rose-400 block">
                  {isAbhijitValid ? '🌟 Abhijit' : '⚠️ Abhijit (Wed)'}
                </span>
                <span className={isAbhijitValid ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                  {isAbhijitValid
                    ? `${dayData.fixedKaalas.abhijitMuhurta.start12Hr} – ${dayData.fixedKaalas.abhijitMuhurta.end12Hr}`
                    : 'Cancelled (Rahu Overlap)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multimodal Sub-Tabs */}
      <div className="border-t border-rose-950 pt-4">
        <div className="flex flex-wrap gap-2 border-b border-rose-950 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('DIAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'DIAL' ? 'bg-amber-600 text-neutral-950' : 'text-rose-300 hover:bg-rose-950'
            }`}
          >
            Chrono Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CHOGHADIYA')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'CHOGHADIYA' ? 'bg-amber-600 text-neutral-950' : 'text-rose-300 hover:bg-rose-950'
            }`}
          >
            ☀️ Choghadiya Matrix (16 Spans)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HORAS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'HORAS' ? 'bg-amber-600 text-neutral-950' : 'text-rose-300 hover:bg-rose-950'
            }`}
          >
            🪐 24 Planetary Horas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BHAVA_CHALIT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'BHAVA_CHALIT' ? 'bg-amber-600 text-neutral-950' : 'text-rose-300 hover:bg-rose-950'
            }`}
          >
            📐 Sripati Bhava Chalit Cusps
          </button>
        </div>

        {/* Tab 2: 16 Day & Night Choghadiyas (Clickable -> Do's & Don'ts) */}
        {activeTab === 'CHOGHADIYA' && (
          <div className="mt-4 space-y-3 text-xs animate-fade-in">
            <p className="text-[11px] text-amber-300/90">
              Click any Choghadiya span below to open its Shastric Do&apos;s, Don&apos;ts &amp; Emergency Mitigation:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-rose-950 p-3 bg-[#18040a]">
                <h4 className="font-semibold text-amber-300 mb-2">☀️ Day Choghadiya (Sunrise to Sunset)</h4>
                <div className="space-y-1.5">
                  {dayData.choghadiya.dayChoghadiya.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSelectWindow?.(`${c.name} Choghadiya`, `${c.start12Hr} – ${c.end12Hr}`)}
                      className="w-full flex justify-between items-center py-1.5 px-2 rounded hover:bg-amber-950/40 border-b border-rose-950/50 transition-colors text-left"
                    >
                      <span className="font-medium text-rose-100">{c.name} ({c.vedicLord})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${c.isAuspicious ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                        {c.isAuspicious ? 'Auspicious' : 'Caution'}
                      </span>
                      <span className="font-mono text-amber-200/90">{c.start12Hr} – {c.end12Hr}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-rose-950 p-3 bg-[#18040a]">
                <h4 className="font-semibold text-amber-300 mb-2">🌙 Night Choghadiya (Sunset to Next Sunrise)</h4>
                <div className="space-y-1.5">
                  {dayData.choghadiya.nightChoghadiya.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSelectWindow?.(`${c.name} Choghadiya`, `${c.start12Hr} – ${c.end12Hr}`)}
                      className="w-full flex justify-between items-center py-1.5 px-2 rounded hover:bg-amber-950/40 border-b border-rose-950/50 transition-colors text-left"
                    >
                      <span className="font-medium text-rose-100">{c.name} ({c.vedicLord})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${c.isAuspicious ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                        {c.isAuspicious ? 'Auspicious' : 'Caution'}
                      </span>
                      <span className="font-mono text-amber-200/90">{c.start12Hr} – {c.end12Hr}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 24 Planetary Horas (Clickable -> Do's & Don'ts) */}
        {activeTab === 'HORAS' && (
          <div className="mt-4 rounded-xl border border-rose-950 p-4 bg-[#18040a] text-xs space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-semibold text-amber-300">🪐 24 Chaldean Planetary Horas (Sunrise to Next Sunrise)</h4>
              <span className="text-[11px] text-amber-400">Click any Hora for tactical Do&apos;s &amp; Don&apos;ts</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {dayData.horas.map((h) => (
                <button
                  key={h.horaNumber}
                  type="button"
                  onClick={() => onSelectWindow?.(`${h.rulingPlanet} Hora`, `${h.start12Hr} – ${h.end12Hr}`)}
                  className="flex items-center justify-between rounded-lg border border-rose-950 bg-[#120307] px-3 py-2 hover:border-amber-500/70 hover:bg-amber-950/30 transition-all text-left"
                >
                  <div>
                    <span className="font-semibold text-amber-200 block">
                      Hora {h.horaNumber}: {h.rulingPlanet}
                    </span>
                    <span className="font-mono text-[11px] text-rose-300">
                      {h.start12Hr} – {h.end12Hr}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    h.isAuspicious ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                  }`}>
                    {h.isAuspicious ? 'Benefic' : 'Discipline'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Live Sripati Bhava Chalit Table */}
        {activeTab === 'BHAVA_CHALIT' && (
          <div className="mt-4 rounded-xl border border-rose-950 p-4 bg-[#18040a] text-xs space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-semibold text-amber-300">
                🪐 Live Sripati Bhava Chalit 12-House Cuspal Matrix ({activeSample.localTime12Hr})
              </h4>
              <span className="font-mono text-[11px] text-emerald-300">
                Sidereal Lagna: {liveAngles.siderealAscendant.toFixed(2)}° · MC: {liveAngles.siderealMidheaven.toFixed(2)}°
              </span>
            </div>
            <p className="text-rose-300/80">
              Recomputed dynamically for {city.cityName || 'Observer Location'} at {activeSample.localTime12Hr}. Adjusting clock time or city rotates all 12 Sripati cusps in real time.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse mt-2">
                <thead>
                  <tr className="border-b border-rose-900 text-amber-300">
                    <th className="py-1.5 px-2">Bhava</th>
                    <th className="py-1.5 px-2">Sign (Rashi)</th>
                    <th className="py-1.5 px-2">Bhava Madhya (Midpoint)</th>
                    <th className="py-1.5 px-2">Sandhi Start</th>
                    <th className="py-1.5 px-2">Sandhi End</th>
                  </tr>
                </thead>
                <tbody>
                  {bhavaCusps.map((c) => (
                    <tr key={c.bhavaNumber} className="border-b border-rose-950/60 hover:bg-rose-950/30">
                      <td className="py-1.5 px-2 font-bold text-amber-200">House {c.bhavaNumber}</td>
                      <td className="py-1.5 px-2">{c.rashiName}</td>
                      <td className="py-1.5 px-2 font-mono text-emerald-300">{c.madhyaLongitude}°</td>
                      <td className="py-1.5 px-2 font-mono text-rose-400">{c.sandhiStartLongitude}°</td>
                      <td className="py-1.5 px-2 font-mono text-rose-400">{c.sandhiEndLongitude}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
