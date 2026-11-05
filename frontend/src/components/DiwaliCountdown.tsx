/**
 * Diwali Countdown & Vedic Panchang Engine
 * Dynamically computes real-time countdown to the next upcoming Diwali (Lakshmi Puja)
 * and the 5-Day Festival Sequence using authentic Kartik Amavasya Panchang parameters.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChartCalculationResult } from '../engine/astroMath';

interface DiwaliEvent {
  id: string;
  name: string;
  sanskritName: string;
  targetDate: string; // ISO string
  tithi: string;
  paksha: string;
  nakshatra: string;
  deity: string;
  muhurta: string;
  muhurtaPeriod: string;
  lagna: string;
  significance: string;
}

interface DiwaliCountdownProps {
  chart?: ChartCalculationResult;
  onExploreProsperityKit?: () => void;
}

// Multi-year catalog of accurate astronomical Kartik Amavasya & 5-Day Festival dates
const DIWALI_YEARS_SCHEDULE: Record<number, DiwaliEvent[]> = {
  2026: [
    {
      id: 'dhanteras',
      name: 'Dhanteras',
      sanskritName: 'Dhana Trayodashi',
      targetDate: '2026-11-06T18:15:00+05:30',
      tithi: 'Kartik Krishna Trayodashi',
      paksha: 'Krishna Paksha',
      nakshatra: 'Hasta',
      deity: 'Lord Dhanvantari & Lord Kubera',
      muhurta: '18:15 - 20:20 IST',
      muhurtaPeriod: 'Pradosh Kaal (Vrishabha Lagna)',
      lagna: 'Vrishabha (Fixed)',
      significance: 'Gold, silver, brass utensils purchase and 13 deepams for Yamaraj.',
    },
    {
      id: 'choti-diwali',
      name: 'Narak Chaturdashi',
      sanskritName: 'Choti Diwali / Roop Chaudas',
      targetDate: '2026-11-07T05:22:00+05:30',
      tithi: 'Kartik Krishna Chaturdashi',
      paksha: 'Krishna Paksha',
      nakshatra: 'Chitra',
      deity: 'Lord Krishna & Mahakali',
      muhurta: '05:22 - 06:44 IST',
      muhurtaPeriod: 'Abhyanga Snan Muhurta',
      lagna: 'Tula',
      significance: 'Eradication of ignorance, ritual sesame oil bath, and twilight Yamadeep daan.',
    },
    {
      id: 'lakshmi-puja',
      name: 'Diwali (Lakshmi Puja)',
      sanskritName: 'Deepawali / Maha Lakshmi Pujan',
      targetDate: '2026-11-08T17:48:00+05:30',
      tithi: 'Kartik Krishna Amavasya',
      paksha: 'Krishna Paksha',
      nakshatra: 'Swati',
      deity: 'Goddess Mahalakshmi & Lord Ganesha',
      muhurta: '17:48 - 19:42 IST',
      muhurtaPeriod: 'Pradosh Kaal & Vrishabha Sthira Lagna',
      lagna: 'Vrishabha (22.5° Taurus - Fixed Stable Lagna)',
      significance: 'Apex festival of illumination; invokes permanent wealth, auspiciousness & joy.',
    },
    {
      id: 'govardhan',
      name: 'Govardhan Puja',
      sanskritName: 'Annakut / Bali Pratipada',
      targetDate: '2026-11-09T06:40:00+05:30',
      tithi: 'Kartik Shukla Pratipada',
      paksha: 'Shukla Paksha',
      nakshatra: 'Vishakha',
      deity: 'Lord Krishna (Giriraj)',
      muhurta: '06:40 - 08:52 IST',
      muhurtaPeriod: 'Pratahkal Shubh Muhurta',
      lagna: 'Vrishchika',
      significance: 'Gratitude to Mother Nature, Govardhan mountain offering with 56 Bhog.',
    },
    {
      id: 'bhai-dooj',
      name: 'Bhai Dooj',
      sanskritName: 'Yama Dwitiya / Bhratri Dooj',
      targetDate: '2026-11-10T13:12:00+05:30',
      tithi: 'Kartik Shukla Dwitiya',
      paksha: 'Shukla Paksha',
      nakshatra: 'Anuradha',
      deity: 'Yamaraj & Yamuna Devi',
      muhurta: '13:12 - 15:24 IST',
      muhurtaPeriod: 'Aparahna Kaal',
      lagna: 'Kumbha',
      significance: 'Sacred fraternal bonding, longevity blessings & Chitragupta invocation.',
    },
  ],
  2027: [
    {
      id: 'lakshmi-puja',
      name: 'Diwali (Lakshmi Puja)',
      sanskritName: 'Deepawali 2027',
      targetDate: '2027-10-29T18:02:00+05:30',
      tithi: 'Kartik Krishna Amavasya',
      paksha: 'Krishna Paksha',
      nakshatra: 'Swati',
      deity: 'Mahalakshmi',
      muhurta: '18:02 - 19:58 IST',
      muhurtaPeriod: 'Pradosh Kaal',
      lagna: 'Vrishabha',
      significance: 'Kartik Amavasya Maha Lakshmi Puja.',
    },
  ],
};

export const DiwaliCountdown: React.FC<DiwaliCountdownProps> = ({
  chart,
  onExploreProsperityKit,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedFestivalId, setSelectedFestivalId] = useState<string>('lakshmi-puja');
  const [isPanchangExpanded, setIsPanchangExpanded] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // High precision 1000ms clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current calendar year and select relevant festival list
  const currentYear = now.getFullYear();
  const festivalList = useMemo(() => {
    if (DIWALI_YEARS_SCHEDULE[currentYear]) {
      return DIWALI_YEARS_SCHEDULE[currentYear];
    }
    // Default to 2026 schedule if in 2026 or fallback
    return DIWALI_YEARS_SCHEDULE[2026];
  }, [currentYear]);

  // Target event selected
  const activeEvent = useMemo(() => {
    return festivalList.find((e) => e.id === selectedFestivalId) || festivalList[2];
  }, [festivalList, selectedFestivalId]);

  // Time remaining calculation
  const targetTime = useMemo(() => new Date(activeEvent.targetDate).getTime(), [activeEvent]);
  const diffMs = Math.max(0, targetTime - now.getTime());

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);


  // Static festival data cannot establish natal timing alignment.
  const lagnaMatchNote = chart ? 'Unverified static festival preview. Natal timing alignment is unavailable for this chart.' : 'Unverified static festival preview. No natal chart supplied.';

  const handleCopyMuhurta = () => {
    const text = `🪔 ${activeEvent.name} (${activeEvent.sanskritName}) 🪔\n` +
      `Date: ${new Date(activeEvent.targetDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `Auspicious Muhurta: ${activeEvent.muhurta}\n` +
      `Tithi: ${activeEvent.tithi} (${activeEvent.paksha})\n` +
      `Nakshatra: ${activeEvent.nakshatra}\n` +
      `Fixed Lagna: ${activeEvent.lagna}\n` +
      `Deity: ${activeEvent.deity}\n` +
      `Calculated via Swiss Ephemeris MymomentOclock`;
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#24060e] via-[#1c050b] to-[#160408] p-6 shadow-2xl shadow-rose-950/40">
      {/* Decorative celestial background highlights */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-rose-600/10 blur-3xl" />

      {/* Top Banner: Status + Festival Selector Tabs */}
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-rose-950/70 pb-5">
        <div className="flex items-center gap-3">
          {/* Shimmering animated Diya Icon */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-rose-950/80 shadow-md shadow-amber-950/40">
            <span className="text-xl animate-pulse select-none">🪔</span>
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 ring-4 ring-amber-400/20 animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-amber-300 uppercase border border-amber-500/20">
                Panchang Cosmic Clock
              </span>
              <span className="text-xs text-rose-300/60 font-mono">
                Kartik Mahotsav
              </span>
            </div>
            <h2 className="mt-0.5 font-serif text-xl sm:text-2xl font-bold tracking-tight text-amber-100 flex items-center gap-2">
              <span>{activeEvent.name}</span>
              <span className="text-sm font-normal text-rose-300/70 hidden sm:inline">
                ({activeEvent.sanskritName})
              </span>
            </h2>
          </div>
        </div>

        {/* 5-Day Festival Sequence Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-rose-950/80 bg-[#140407]/90 p-1 no-scrollbar text-xs">
          {festivalList.map((fest) => {
            const isSelected = fest.id === selectedFestivalId;
            return (
              <button
                key={fest.id}
                onClick={() => setSelectedFestivalId(fest.id)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-semibold shadow-sm'
                    : 'text-rose-200/70 hover:text-amber-200 hover:bg-rose-950/40'
                }`}
              >
                {fest.id === 'lakshmi-puja' ? '★ Diwali' : fest.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Countdown Display Grid */}
      <div className="relative z-10 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: 4-Segment Countdown Timer */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="text-xs font-medium tracking-wide uppercase text-amber-400/80 mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Time Remaining Until Auspicious Muhurta</span>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {/* Days */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-rose-900/40 bg-[#280812] p-3 sm:p-4 text-center shadow-inner group hover:border-amber-400/50 transition-colors">
              <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-amber-300 tabular-nums drop-shadow-sm">
                {String(days).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] sm:text-xs font-semibold tracking-wider text-rose-300/70 uppercase">
                Days
              </span>
            </div>

            {/* Hours */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-rose-900/40 bg-[#280812] p-3 sm:p-4 text-center shadow-inner group hover:border-amber-400/50 transition-colors">
              <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-amber-300 tabular-nums drop-shadow-sm">
                {String(hours).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] sm:text-xs font-semibold tracking-wider text-rose-300/70 uppercase">
                Hours
              </span>
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-rose-900/40 bg-[#280812] p-3 sm:p-4 text-center shadow-inner group hover:border-amber-400/50 transition-colors">
              <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-amber-300 tabular-nums drop-shadow-sm">
                {String(minutes).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] sm:text-xs font-semibold tracking-wider text-rose-300/70 uppercase">
                Minutes
              </span>
            </div>

            {/* Seconds */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-amber-500/40 bg-[#320a16] p-3 sm:p-4 text-center shadow-inner ring-1 ring-amber-400/20 group hover:border-amber-400 transition-colors">
              <span className="font-mono text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-amber-400 tabular-nums animate-pulse">
                {String(seconds).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] sm:text-xs font-semibold tracking-wider text-amber-300/80 uppercase">
                Seconds
              </span>
            </div>
          </div>

          {/* Quick Target Date & Astro Highlights */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-rose-200/80">
            <div className="flex items-center gap-1.5 bg-[#170408] px-3 py-1.5 rounded-lg border border-rose-950/80">
              <span className="text-amber-400">📅 Date:</span>
              <span className="font-medium text-rose-100">
                {new Date(activeEvent.targetDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#170408] px-3 py-1.5 rounded-lg border border-rose-950/80">
              <span className="text-amber-400">⭐ Shubh Muhurta:</span>
              <span className="font-semibold text-amber-300 font-mono">
                {activeEvent.muhurta}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#170408] px-3 py-1.5 rounded-lg border border-rose-950/80">
              <span className="text-amber-400">🕉️ Deity:</span>
              <span className="text-rose-100">{activeEvent.deity}</span>
            </div>
          </div>

          {lagnaMatchNote && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200/90">
              <span className="text-amber-400 shrink-0">✦</span>
              <span>{lagnaMatchNote}</span>
            </div>
          )}
        </div>

        {/* Right: Muhurta Window & Panchang Card */}
        <div className="lg:col-span-5 rounded-xl border border-rose-900/50 bg-[#1f060f] p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-rose-950/80 pb-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-rose-300/80">
                Vedic Panchang Metrics
              </span>
              <span className="rounded bg-rose-950/80 px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-rose-900/60">
                Kartik Masa
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-rose-300/70">Tithi:</span>
                <span className="font-medium text-rose-100">{activeEvent.tithi}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rose-300/70">Paksha:</span>
                <span className="font-medium text-rose-100">{activeEvent.paksha}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rose-300/70">Nakshatra:</span>
                <span className="font-medium text-amber-300">{activeEvent.nakshatra}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rose-300/70">Auspicious Lagna:</span>
                <span className="font-medium text-amber-300 font-mono">{activeEvent.lagna}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-rose-300/70">Puja Window:</span>
                <span className="font-medium text-rose-100">{activeEvent.muhurtaPeriod}</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 border-t border-rose-950/80 flex items-center gap-2">
            <button
              onClick={handleCopyMuhurta}
              className="flex-1 rounded-lg border border-rose-900/60 bg-[#280812] px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-[#350a18] transition-colors flex items-center justify-center gap-1.5"
            >
              {copiedSuccess ? (
                <>
                  <span className="text-emerald-400">✓</span>
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy Muhurta Details</span>
                </>
              )}
            </button>

            {onExploreProsperityKit && (
              <button
                onClick={onExploreProsperityKit}
                className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 transition-colors shrink-0 shadow-md shadow-amber-950/40"
              >
                Open ₹99 Kit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Panchang Deep Dive Toggle */}
      <div className="relative z-10 mt-5 pt-4 border-t border-rose-950/70">
        <button
          onClick={() => setIsPanchangExpanded(!isPanchangExpanded)}
          className="flex items-center justify-between w-full text-xs text-rose-300/70 hover:text-amber-300 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>{isPanchangExpanded ? '▾' : '▸'}</span>
            <span className="font-medium">Astronomical Significance & Pradosh Kaal Calculations</span>
          </span>
          <span className="text-[11px] underline underline-offset-2">
            {isPanchangExpanded ? 'Hide Details' : 'View Deep Planetary Metrics'}
          </span>
        </button>

        {isPanchangExpanded && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-rose-950/80 bg-[#160408]/90 p-4 text-xs animate-fade-in">
            <div>
              <h4 className="font-semibold text-amber-300 mb-1">Why Vrishabha Sthira Lagna?</h4>
              <p className="text-rose-200/70 leading-relaxed">
                Diwali Lakshmi Pujan is classically performed during Vrishabha (Taurus) Lagna because Taurus is a
                <strong> Sthira (Fixed)</strong> zodiac sign ruled by Venus (Shukra). Wealth, harmony, and prosperity
                anchored during this lagna are believed to remain fixed in the household rather than fluctuating.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-amber-300 mb-1">Pradosh Kaal Overlap</h4>
              <p className="text-rose-200/70 leading-relaxed">
                Pradosh Kaal encompasses the approximately 2 hours and 24 minutes following sunset. When Pradosh Kaal
                intersects with Kartik Amavasya Tithi, the cosmic gateway for invoking Goddess Mahalakshmi reaches its
                highest auspiciousness vector (A_net &gt; 92%).
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-amber-300 mb-1">Festival Significance</h4>
              <p className="text-rose-200/70 leading-relaxed">
                {activeEvent.significance}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
