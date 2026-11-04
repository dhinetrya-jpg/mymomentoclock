/**
 * Diwali Prosperity Kit & "Mera Diwali 2026" Experience
 * Features:
 * - Sealed Vedic Wax Envelope reveal gate with countdown timer & wax fracture celebration
 * - City-specific Lakshmi Puja Muhurat & Personal Golden 24-Minute Window
 * - Dual Editions: Personal Astrology Edition vs Festival & Reflection Edition
 * - Custom Printable/Shareable Diwali Blessing Card with personalized family name
 * - 1-Click Instant UPI Checkout simulator with WhatsApp delivery hook
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MAJOR_CITIES_MUHURAT, calculatePersonalGoldenWindow, CityMuhurat } from '../engine/diwaliData';
import { ChartCalculationResult } from '../engine/astroMath';

interface DiwaliProsperityKitProps {
  chart: ChartCalculationResult;
  onOpenQuickCheckout: () => void;
}

export const DiwaliProsperityKit: React.FC<DiwaliProsperityKitProps> = ({
  chart,
  onOpenQuickCheckout,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('New Delhi');
  const [isSealBroken, setIsSealBroken] = useState(false);
  const [activeEdition, setActiveEdition] = useState<'ASTROLOGY' | 'FESTIVAL'>('ASTROLOGY');
  const [familyName, setFamilyName] = useState('Sharma');
  const [customIntention, setCustomIntention] = useState('Abundance in health, righteous business growth, and family harmony');

  // Countdown to Diwali 2026 Lakshmi Puja (Sun 8 Nov 2026, 17:54:00)
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 26,
    hours: 10,
    minutes: 47,
    seconds: 12,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const cityData: CityMuhurat = MAJOR_CITIES_MUHURAT[selectedCity] || MAJOR_CITIES_MUHURAT['New Delhi'];
  const goldenWindow = calculatePersonalGoldenWindow(familyName, cityData);

  const handleBreakSeal = () => {
    setIsSealBroken(true);
    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#fef08a', '#d97706', '#dc2626'],
      });
    } catch {
      // confetti fallback safe
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. The Sealed Vedic Wax Envelope Reveal Gate */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-950/70 bg-gradient-to-b from-[#25070f] via-[#1d050c] to-[#150408] p-6 lg:p-8 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Envelope Artwork & Wax Seal */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-amber-500/30 shadow-2xl bg-[#1e060c] group">
              <img
                src="/src/assets/images/diwali_sealed_wax_envelope_1791900494959.jpg"
                alt="Sealed Vedic Wax Envelope"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Dynamic Interactive Wax Seal overlay if not broken */}
              {!isSealBroken ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#180408]/60 backdrop-blur-[2px] p-4 text-center">
                  <div className="rounded-full bg-amber-500/20 p-2 ring-2 ring-amber-400/80 animate-pulse">
                    <button
                      onClick={handleBreakSeal}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 text-xs font-serif font-bold text-neutral-950 shadow-xl shadow-amber-950/80 hover:scale-105 active:scale-95 transition-transform"
                    >
                      Break Seal
                    </button>
                  </div>
                  <span className="mt-3 font-serif text-sm font-semibold text-amber-200 drop-shadow">
                    Click to Open Destiny Envelope
                  </span>
                  <span className="text-[11px] text-rose-200/80 mt-0.5">
                    Synchronized with Diwali Muhurat
                  </span>
                </div>
              ) : (
                <div className="absolute top-3 right-3 rounded-full bg-emerald-950/90 border border-emerald-500 px-3 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur-md">
                  ✓ Seal Unlocked
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Countdown Clock & Value Proposition */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-mono">
                Diwali 2026 · Samvat 2083 Auspicious Release
              </span>
              <h1 className="mt-1 font-serif text-2xl lg:text-3xl font-bold text-neutral-100">
                Personalized Diwali Prosperity & Lakshmi Blessing Pack
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-rose-200/70 leading-relaxed">
                A festival-specific digital keepsake engineered for the Indian living room.
                Bypasses generic astrology with verified city-specific timings, personal Lakshmi windows,
                and shareable family keepsakes.
              </p>
            </div>

            {/* Countdown Clock */}
            <div className="rounded-xl border border-rose-950/70 bg-[#17050a]/90 p-4">
              <div className="text-[11px] font-semibold text-rose-300/70 uppercase tracking-wider">
                Time Remaining to Diwali Lakshmi Puja (Sun 8 Nov 2026)
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <div className="rounded bg-[#2a0812] border border-rose-950/60 p-2">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-amber-300 tabular-nums">
                    {timeLeft.days}
                  </div>
                  <div className="text-[10px] text-rose-300/60 uppercase">Days</div>
                </div>
                <div className="rounded bg-[#2a0812] border border-rose-950/60 p-2">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-amber-300 tabular-nums">
                    {timeLeft.hours}
                  </div>
                  <div className="text-[10px] text-rose-300/60 uppercase">Hours</div>
                </div>
                <div className="rounded bg-[#2a0812] border border-rose-950/60 p-2">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-amber-300 tabular-nums">
                    {timeLeft.minutes}
                  </div>
                  <div className="text-[10px] text-rose-300/60 uppercase">Minutes</div>
                </div>
                <div className="rounded bg-[#2a0812] border border-rose-950/60 p-2">
                  <div className="font-mono text-xl sm:text-2xl font-bold text-amber-300 tabular-nums">
                    {timeLeft.seconds}
                  </div>
                  <div className="text-[10px] text-rose-300/60 uppercase">Seconds</div>
                </div>
              </div>
            </div>

            {/* City Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-medium text-rose-100/90 whitespace-nowrap">
                Select Your Festival City:
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="rounded border border-rose-900/60 bg-[#280812] px-3 py-1.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none"
              >
                {Object.keys(MAJOR_CITIES_MUHURAT).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Personalized Muhurat & Golden 24-Minute Window */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* City Panchang Timings */}
        <div className="rounded-xl border border-rose-950/70 bg-[#1c050b] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-rose-950/60 pb-3">
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-100">
                Official Festival Muhurat for {cityData.cityName}
              </h2>
              <p className="text-xs text-rose-300/60 mt-0.5 font-mono">{cityData.stateCountry}</p>
            </div>
            <span className="font-mono text-xs text-amber-400">Drik Verified</span>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between border-b border-rose-950/40 pb-2">
              <span className="text-rose-300/60">Dhanteras Shopping Window:</span>
              <span className="font-mono font-medium text-rose-100">{cityData.dhanterasShoppingWindow}</span>
            </div>
            <div className="flex justify-between border-b border-rose-950/40 pb-2">
              <span className="text-rose-300/60">Lakshmi Puja (Pradosh Kaal):</span>
              <span className="font-mono font-medium text-amber-300">{cityData.pradoshKaalWindow}</span>
            </div>
            <div className="flex justify-between border-b border-rose-950/40 pb-2">
              <span className="text-rose-300/60">Vrishabha Sthira Lagna (Fixed):</span>
              <span className="font-mono font-medium text-rose-100">{cityData.vrishabhaLagnaWindow}</span>
            </div>
            <div className="flex justify-between border-b border-rose-950/40 pb-2">
              <span className="text-rose-300/60">Chopda Pujan (Accounts Window):</span>
              <span className="font-mono font-medium text-rose-100">{cityData.chopdaPujanWindow}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-rose-300/60">NSE/BSE Muhurat Trading:</span>
              <span className="font-mono font-medium text-emerald-400">{cityData.muhuratTradingWindow}</span>
            </div>
          </div>
        </div>

        {/* Personalized Golden 24-Minute Window */}
        <div className="rounded-xl border border-amber-500/30 bg-[#22070e] p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-rose-950/60 pb-3">
            <div>
              <h2 className="font-serif text-base font-semibold text-amber-300">
                Your Personal Golden 24-Minute Window
              </h2>
              <p className="text-xs text-rose-300/60 mt-0.5">
                Calculated for family: &quot;{familyName}&quot; in {cityData.cityName}
              </p>
            </div>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-300">
              Personalized
            </span>
          </div>

          <div className="mt-4">
            <div className="rounded-lg bg-[#160408] p-4 border border-amber-900/40">
              <div className="text-[11px] text-rose-300/60 uppercase font-mono">
                Exact Golden Trigger Window (Diwali Evening)
              </div>
              <div className="font-mono text-2xl font-bold text-amber-300 mt-1">
                {goldenWindow.startTime} - {goldenWindow.endTime}
              </div>
              <div className="mt-2 text-xs text-rose-200">
                Governed by: <span className="font-medium text-amber-200">{goldenWindow.planetaryRuler}</span>
              </div>
            </div>

            <div className="mt-4 text-xs text-rose-200">
              <span className="font-semibold text-rose-100">Recommended Prosperity Action:</span>
              <p className="mt-1 leading-relaxed text-rose-300/70">
                {goldenWindow.recommendedAction}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dual Editions Toggle & Shareable Blessing Card */}
      <div className="rounded-xl border border-rose-950/70 bg-[#1c050b] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-950/60 pb-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-neutral-100">
              Personalized Keepsake & Blessing Card
            </h2>
            <p className="text-xs text-rose-300/60 mt-0.5">
              Beautiful shareable digital card designed for WhatsApp sharing and family gifting
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-rose-950/70 bg-[#250810] p-1 text-xs">
            <button
              onClick={() => setActiveEdition('ASTROLOGY')}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                activeEdition === 'ASTROLOGY' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-rose-200/70'
              }`}
            >
              Personal Astrology Edition
            </button>
            <button
              onClick={() => setActiveEdition('FESTIVAL')}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                activeEdition === 'FESTIVAL' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-rose-200/70'
              }`}
            >
              Festival & Reflection Edition
            </button>
          </div>
        </div>

        {/* Card Customization & Preview */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            <div>
              <label className="text-rose-300/70 font-medium">Recipient / Family Name:</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="e.g. Verma Family, Priya"
                className="mt-1 w-full rounded border border-rose-900/60 bg-[#280812] px-3 py-2 text-rose-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-rose-300/70 font-medium">Custom Samvat 2083 Intention:</label>
              <textarea
                rows={3}
                value={customIntention}
                onChange={(e) => setCustomIntention(e.target.value)}
                className="mt-1 w-full rounded border border-rose-900/60 bg-[#280812] px-3 py-2 text-rose-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="rounded-lg bg-[#24070e] p-3 border border-rose-950/60 text-[11px] text-rose-300/70 space-y-1">
              <div>• Instant mobile-optimized download post-checkout</div>
              <div>• WhatsApp-native blessing format with high-resolution artwork</div>
              <div>• Complete Hindi & English dual-language text</div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onOpenQuickCheckout}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-950/40"
              >
                Instant UPI Checkout (₹99)
              </button>
            </div>
          </div>

          {/* Card Preview Screen */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-amber-500/40 shadow-2xl bg-[#280710] text-center p-6 text-neutral-100">
              <div className="relative h-44 w-full rounded-xl overflow-hidden mb-4">
                <img
                  src="/src/assets/images/diwali_blessing_card_art_1791900494610.jpg"
                  alt="Auspicious Diwali Art"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#280710]/90 via-transparent to-transparent" />
                <div className="absolute bottom-2 inset-x-0 font-serif text-lg font-bold text-amber-200">
                  शुभ दीपावली
                </div>
              </div>

              <div className="font-serif text-xl font-bold text-amber-300">
                {familyName} & Family
              </div>

              <div className="mt-2 text-xs text-rose-100/90 italic leading-relaxed px-2">
                &quot;{customIntention}&quot;
              </div>

              <div className="mt-4 pt-3 border-t border-rose-950/60 flex justify-between text-[11px] font-mono text-rose-300/60">
                <span>Diwali 2026 · Samvat 2083</span>
                <span>{cityData.cityName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
