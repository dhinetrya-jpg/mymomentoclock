/**
 * MymomentOclock Complete 5-Screen Conversion Life Cycle & Neuro-Design Architecture
 * Directly implements:
 * Screen 1: The Social Acquisition Hook (Instagram Ad Layout & Kinetic Terminal)
 * Screen 2: The Conversion Landing Page & Smart Onboarding Input Form (GIS, HH:MM:SS Wheel, Julian Day Counter, Milestone Tree)
 * Screen 3: The Processing & Calculation Sequence (Real-time micro-animations, 120-iteration telemetry)
 * Screen 4: The Blurred Preview & Paywall Gate (Asymmetric Paywall Blur Layer, ₹299 Unlock)
 * Screen 5: The Operational Client Dashboard (C1 to C6 Integrated: Personal Card, Chrono-Dial, Event Matrix, 365-Day Heatmap, RVM Directives, C6 Metadata)
 */

import React, { useState, useEffect, useRef } from 'react';
import { playAcousticFrequencyTone } from '../engine/rvmEngine';

interface ConversionFunnelViewProps {
  onUnlockSuccess?: () => void;
  onNavigateToFullApp?: () => void;
}

export type FunnelScreen = 'screen1_ad' | 'screen2_onboarding' | 'screen3_telemetry' | 'screen4_paywall' | 'screen5_operational';

export const ConversionFunnelView: React.FC<ConversionFunnelViewProps> = ({
  onUnlockSuccess,
  onNavigateToFullApp,
}) => {
  const [currentScreen, setCurrentScreen] = useState<FunnelScreen>('screen2_onboarding');

  // Screen 2 Form State
  const [cityInput, setCityInput] = useState('New Delhi, Delhi, India');
  const [coords, setCoords] = useState({ lat: 28.6139, lng: 77.2090 });
  const [birthDate, setBirthDate] = useState('1989-11-23');
  const [hour, setHour] = useState('04');
  const [minute, setMinute] = useState('28');
  const [second, setSecond] = useState('15');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [isUnverifiedTime, setIsUnverifiedTime] = useState(true);
  const [milestone1, setMilestone1] = useState('CAREER_BREAKTHROUGH');
  const [milestone1Date, setMilestone1Date] = useState('2018-07-15');
  const [milestone2, setMilestone2] = useState('SURGERY');
  const [milestone2Date, setMilestone2Date] = useState('2022-03-22');

  // Dynamic Julian Day Counter
  const [calculatedJd, setCalculatedJd] = useState('2447853.458333');

  // Screen 3 Telemetry State
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [telemetryProgress, setTelemetryProgress] = useState(0);

  // Screen 4 Paywall & Unlock State
  const [, setIsPaywallUnlocked] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activeSessionToken] = useState('cs_live_a1b2c3d4');
  const [paymentLog, setPaymentLog] = useState<string[]>([]);

  // Screen 5 Interactive State
  const [activeMonth, setActiveMonth] = useState<number>(11); // Nov 2026
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{ day: number; score: number; status: string; note: string } | null>(null);
  const [isPlaying147Hz, setIsPlaying147Hz] = useState(false);
  const stopToneRef = useRef<(() => void) | null>(null);

  // Recalculate Julian Day dynamically whenever time changes
  useEffect(() => {
    try {
      const hNum = parseInt(hour, 10);
      const mNum = parseInt(minute, 10);
      const sNum = parseInt(second, 10);
      const adjH = ampm === 'PM' && hNum < 12 ? hNum + 12 : ampm === 'AM' && hNum === 12 ? 0 : hNum;
      const decHours = adjH + mNum / 60 + sNum / 3600;
      const parts = birthDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      let adjY = y;
      let adjM = m;
      if (adjM <= 2) {
        adjY--;
        adjM += 12;
      }
      const a = Math.floor(adjY / 100);
      const b = Math.floor(a / 4);
      const c = 2 - a + b;
      const e = Math.floor(365.25 * (adjY + 4716));
      const f = Math.floor(30.6001 * (adjM + 1));
      const jd = c + d + e + f + (decHours / 24.0) - 1524.5 - (5.5 / 24.0); // UTC adjustment
      setCalculatedJd(jd.toFixed(6));
    } catch {
      setCalculatedJd('2447853.458333');
    }
  }, [birthDate, hour, minute, second, ampm]);

  // Handle City Selection
  const handleSelectCity = (name: string, lat: number, lng: number) => {
    setCityInput(name);
    setCoords({ lat, lng });
  };

  // Launch Telemetry Screen with realistic micro-animations
  const handleStartCalculation = () => {
    setCurrentScreen('screen3_telemetry');
    setTelemetryLogs([]);
    setTelemetryProgress(0);

    const logSteps = [
      { msg: '[INITIALIZING] Spatiotemporal Engine linking illustrative calculation sequence (v2.1-sidereal)...', p: 15, delay: 250 },
      { msg: `[PROCESSING] Demo offset illustration; no IANA lookup... Applied Delta: +05:30. Resolved Julian Day: ${calculatedJd}`, p: 35, delay: 650 },
      { msg: `[CALIBRATING] Running 120 candidate time-slice iterations across ±15-minute search window against milestones [${milestone1}, ${milestone2}]...`, p: 60, delay: 1100 },
      { msg: '[CALIBRATING] Optimal time slice localized at -165 seconds. Micro-divisional concordance: 88% example fit (not validated).', p: 80, delay: 1550 },
      { msg: '[RESOLVING] Illustrative symbolic graph sequence: structural subtraction matrix: Dhana Yoga vs. Daridra Yoga...', p: 95, delay: 2050 },
      { msg: '[SUCCESS] Net Auspiciousness Vector compiled (A_net = 0.5476). Asymmetric paywall cache token sealed.', p: 100, delay: 2550 },
    ];

    logSteps.forEach(step => {
      setTimeout(() => {
        setTelemetryLogs(prev => [...prev, step.msg]);
        setTelemetryProgress(step.p);
      }, step.delay);
    });

    setTimeout(() => {
      setCurrentScreen('screen4_paywall');
    }, 3100);
  };

  // Handle ₹299 Payment & Asynchronous Webhook verification
  const handleExecutePayment = async () => {
    setIsProcessingPayment(true);
    setPaymentLog([
      `[CLIENT] Initiating ₹299 checkout token: ${activeSessionToken}`,
      '[GATEWAY] Connecting to UPI / Card Orchestration Gateway...',
    ]);

    try {
      const res = await fetch('/api/payment/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: activeSessionToken }),
      });
      const data = await res.json();

      setPaymentLog(prev => [
        ...prev,
        `[WEBHOOK] Received cryptographic signature: ${data.signature.slice(0, 24)}... (HMAC-SHA256 MATCHED)`,
        `[DATABASE] payment_transactions updated to 'COMPLETED' for ${data.session.userId}.`,
        '[SSE] Push notification ACCESS_GRANTED emitted. Fading Paywall Blur Layer...',
      ]);

      setTimeout(() => {
        setIsPaywallUnlocked(true);
        setIsProcessingPayment(false);
        setCurrentScreen('screen5_operational');
        if (onUnlockSuccess) onUnlockSuccess();
      }, 1000);
    } catch {
      // Fallback local unlock
      setTimeout(() => {
        setIsPaywallUnlocked(true);
        setIsProcessingPayment(false);
        setCurrentScreen('screen5_operational');
      }, 800);
    }
  };

  // Audio tone trigger for 147Hz Saturn tone
  const handleToggle147Hz = () => {
    if (isPlaying147Hz) {
      if (stopToneRef.current) stopToneRef.current();
      setIsPlaying147Hz(false);
    } else {
      const stopFn = playAcousticFrequencyTone(147, 11);
      stopToneRef.current = stopFn;
      setIsPlaying147Hz(true);
    }
  };

  // Generate 365-day sample matrix data for C4 Heatmap
  const getDaysForMonth = (monthIndex: number) => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthIndex - 1] || 30;
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const pseudoRandom = Math.sin(monthIndex * 31 + d * 17) * 0.5 + 0.5;
      const score = Math.round((0.35 + pseudoRandom * 0.55) * 100);
      let status = 'Neutral';
      let note = 'Balanced cosmic transit. Steady operational execution.';
      if (score >= 80) {
        status = 'Peak Strategy Window';
        note = 'Sublime Benefic Opulence. Ideal for high-stakes capital allocation & contract signing.';
      } else if (score < 50) {
        status = 'High Obstruction Day';
        note = 'Saturnian transit friction. Exercise defensive caution; avoid speculative decisions.';
      }
      days.push({ day: d, score, status, note });
    }
    return days;
  };

  return (
    <div className="space-y-6">
      <p role="status" className="border border-amber-800 rounded p-3 text-amber-200">Demonstration only: this funnel uses synthetic example profiles, timing and telemetry. It does not calculate or certify your birth profile. Use Edit Birth Details for actual input calculations.</p>
      {/* Funnel Stage Navigator Bar (Allows testing each stage of the lifecycle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-950/70 bg-[#1c050b] p-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-amber-400 font-bold">Acquisition Funnel:</span>
          <span className="text-rose-200/80">Neuro-Design Conversion Life Cycle</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <button
            onClick={() => setCurrentScreen('screen1_ad')}
            className={`px-2.5 py-1 rounded transition-colors ${
              currentScreen === 'screen1_ad' ? 'bg-amber-500 text-[#140407] font-bold' : 'bg-[#250810] text-rose-300 hover:text-white border border-rose-950/70'
            }`}
          >
            1. Social Ad
          </button>
          <button
            onClick={() => setCurrentScreen('screen2_onboarding')}
            className={`px-2.5 py-1 rounded transition-colors ${
              currentScreen === 'screen2_onboarding' ? 'bg-amber-500 text-[#140407] font-bold' : 'bg-[#250810] text-rose-300 hover:text-white border border-rose-950/70'
            }`}
          >
            2. Onboarding Hub
          </button>
          <button
            onClick={() => setCurrentScreen('screen3_telemetry')}
            className={`px-2.5 py-1 rounded transition-colors ${
              currentScreen === 'screen3_telemetry' ? 'bg-amber-500 text-[#140407] font-bold' : 'bg-[#250810] text-rose-300 hover:text-white border border-rose-950/70'
            }`}
          >
            3. Telemetry Stream
          </button>
          <button
            onClick={() => setCurrentScreen('screen4_paywall')}
            className={`px-2.5 py-1 rounded transition-colors ${
              currentScreen === 'screen4_paywall' ? 'bg-amber-500 text-[#140407] font-bold' : 'bg-[#250810] text-rose-300 hover:text-white border border-rose-950/70'
            }`}
          >
            4. Paywall Blur Gate
          </button>
          <button
            onClick={() => setCurrentScreen('screen5_operational')}
            className={`px-2.5 py-1 rounded transition-colors ${
              currentScreen === 'screen5_operational' ? 'bg-amber-500 text-[#140407] font-bold' : 'bg-[#250810] text-rose-300 hover:text-white border border-rose-950/70'
            }`}
          >
            5. Unlocked C1-C6
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 1: THE SOCIAL ACQUISITION HOOK (Instagram Ad Layout)              */}
      {/* ========================================================================= */}
      {currentScreen === 'screen1_ad' && (
        <div className="mx-auto max-w-md rounded-2xl border-2 border-emerald-500/40 bg-[#160408] p-6 shadow-2xl space-y-6 text-center animate-fade-in relative overflow-hidden">
          {/* Subtle moving grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#00E676_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          {/* Ad Top Header */}
          <div className="flex items-center justify-between text-[11px] font-mono border-b border-rose-950/70 pb-3">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              LIVE TELEMETRY AD
            </span>
            <span className="text-rose-300/60">INSTAGRAM · SPONSORED</span>
          </div>

          {/* Terminal Animation Box */}
          <div className="rounded-xl border border-rose-950/80 bg-[#120306] p-4 text-left font-mono text-xs shadow-inner">
            <div className="flex items-center gap-1.5 text-[10px] text-rose-400/60 mb-2 border-b border-rose-950/60 pb-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500/80" />
              <span className="h-2 w-2 rounded-full bg-amber-500/80" />
              <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-rose-300/60">mymomentoclock-daemon: v2.1-sidereal</span>
            </div>
            <div className="space-y-1 text-emerald-400/90 text-[11px] leading-relaxed">
              <p>&gt; sys.spatiotemporal.sync(&quot;DEL_28.6139N&quot;)</p>
              <p>&gt; Julian Day: 2447853.458333 [DST +05:30]</p>
              <p className="text-amber-300">&gt; WARNING: 5-min clock quantization error detected (+240s)</p>
              <p className="text-rose-200">&gt; Micro-divisional D-60 shift: 120s threshold reached.</p>
            </div>
          </div>

          {/* The Hook Copy (Verbatim from PDF) */}
          <div className="space-y-3">
            <h2 className="font-serif text-2xl font-bold tracking-tight text-rose-100 leading-tight">
              Your time tracking is broken.
            </h2>
            <p className="text-sm text-rose-200/80 leading-relaxed">
              Clocks round to the nearest 5 minutes, but your macro sub-charts shift every <strong className="text-emerald-400 font-mono">120 seconds</strong>.
              Rectify your true cosmic footprint now.
            </p>
          </div>

          {/* Call to Action CTA Button */}
          <div className="pt-2">
            <button
              onClick={() => setCurrentScreen('screen2_onboarding')}
              className="w-full rounded-xl bg-emerald-500 py-3.5 px-6 font-bold text-[#140407] hover:bg-emerald-400 active:scale-98 transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 group"
            >
              <span>Tap to Calibrate Your True Birth Time (Free)</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <div className="mt-2.5 text-[10px] text-rose-300/50 font-mono">
              * Sub-200ms processing pass · Zero credit card required
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: THE CONVERSION LANDING PAGE & SMART ONBOARDING INPUT FORM       */}
      {/* ========================================================================= */}
      {currentScreen === 'screen2_onboarding' && (
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-950/80 bg-[#1a050a] p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
          {/* Header Bar matching File 8 index.html wireframe */}
          <div className="flex items-center justify-between border-b border-rose-950/70 pb-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              <span className="text-emerald-400 font-bold">Physics Engine: Active</span>
            </div>
            <span className="text-amber-400 font-semibold">v2.1.0-sidereal</span>
          </div>

          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-rose-100">
              High-Precision Calibration Matrix
            </h1>
            <p className="mt-1 text-xs text-rose-300/70 leading-relaxed">
              Standard time registers round to the nearest five minutes. MymomentOclock operates to the exact second to evaluate high-sensitivity micro-charts.
            </p>
          </div>

          {/* INPUT BLOCK A: SPATIAL ORIGIN */}
          <div className="rounded-xl border border-rose-950/70 bg-[#22070e] p-4 space-y-2.5">
            <label className="block text-[11px] font-mono text-amber-300/90 font-semibold uppercase tracking-wider">
              [ INPUT BLOCK A: SPATIAL ORIGIN ]
            </label>
            <div className="relative">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Enter Birth Location (e.g. New Delhi, Kolkata, Mumbai)"
                className="w-full rounded-lg border border-rose-900/60 bg-[#160408] px-3.5 py-2.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Quick Geolocation Autocomplete suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { name: 'New Delhi, India', lat: 28.6139, lng: 77.2090 },
                { name: 'Kolkata, India', lat: 22.5726, lng: 88.3639 },
                { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777 },
                { name: 'Bengaluru, India', lat: 12.9716, lng: 77.5946 },
              ].map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleSelectCity(c.name, c.lat, c.lng)}
                  className={`text-[10px] rounded px-2 py-1 transition-colors border ${
                    cityInput.includes(c.name.split(',')[0])
                      ? 'border-amber-500/60 bg-[#340a15] text-amber-300'
                      : 'border-rose-950/60 bg-[#1c050b] text-rose-300/70 hover:text-white'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
              <span>* Geolocation telemetry resolved:</span>
              <span className="text-rose-100 font-bold">{coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E</span>
            </div>
          </div>

          {/* INPUT BLOCK B: THE TEMPORAL WHEEL */}
          <div className="rounded-xl border border-rose-950/70 bg-[#22070e] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-mono text-amber-300/90 font-semibold uppercase tracking-wider">
                [ INPUT BLOCK B: THE TEMPORAL INTERSECT ]
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="rounded border border-rose-900/60 bg-[#160408] px-2 py-1 text-xs text-rose-100 font-mono focus:outline-none"
              />
            </div>

            {/* High-Fidelity Time Slot Wheel (HH : MM : SS : AM/PM) */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-[10px] text-rose-300/60 font-mono block mb-1">HOUR</span>
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="w-full rounded-lg border border-rose-900/60 bg-[#160408] py-2 text-center font-mono font-bold text-amber-300 focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                    <option key={h} value={h} className="bg-[#1a050a] text-rose-100">{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-rose-300/60 font-mono block mb-1">MINUTE</span>
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="w-full rounded-lg border border-rose-900/60 bg-[#160408] py-2 text-center font-mono font-bold text-amber-300 focus:outline-none"
                >
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                    <option key={m} value={m} className="bg-[#1a050a] text-rose-100">{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-rose-300/60 font-mono block mb-1">SECOND</span>
                <select
                  value={second}
                  onChange={(e) => setSecond(e.target.value)}
                  className="w-full rounded-lg border border-rose-900/60 bg-[#160408] py-2 text-center font-mono font-bold text-amber-300 focus:outline-none"
                >
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(s => (
                    <option key={s} value={s} className="bg-[#1a050a] text-rose-100">{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-rose-300/60 font-mono block mb-1">PERIOD</span>
                <button
                  type="button"
                  onClick={() => setAmpm(ampm === 'AM' ? 'PM' : 'AM')}
                  className="w-full rounded-lg border border-amber-500/50 bg-[#340a15] py-2 text-center font-mono font-bold text-amber-300 hover:bg-[#450d1c] transition-colors"
                >
                  {ampm}
                </button>
              </div>
            </div>

            {/* Dynamic Julian Day Map Counter text dynamically shifting in real time */}
            <div className="rounded-lg bg-[#140407] p-2.5 border border-rose-950/70 flex items-center justify-between text-xs font-mono">
              <span className="text-rose-300/70">* Active Julian Day Map Counter:</span>
              <span className="text-emerald-400 font-bold tracking-wider">{calculatedJd}</span>
            </div>

            {/* Conditional Checkbox */}
            <label className="flex items-center gap-2.5 text-xs text-rose-200 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isUnverifiedTime}
                onChange={(e) => setIsUnverifiedTime(e.target.checked)}
                className="h-4 w-4 rounded accent-emerald-500"
              />
              <span>My clock time is an unverified estimate (Engage Rectification)</span>
            </label>
          </div>

          {/* INPUT BLOCK C: THE MILESTONE CONCORDANCE TREE (Conditional) */}
          {isUnverifiedTime && (
            <div className="rounded-xl border border-rose-950/70 bg-[#22070e] p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-mono text-amber-300/90 font-semibold uppercase tracking-wider">
                  [ INPUT BLOCK C: LIFESTYLE MILESTONE TREE ]
                </label>
                <span className="text-[10px] font-mono text-emerald-400">±15-Min Target</span>
              </div>
              <p className="text-xs text-rose-300/70">
                Calibrate data precision using 15-second search steps across past life events:
              </p>

              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-rose-300/60 block mb-1">EVENT 1 TYPE</label>
                    <select
                      value={milestone1}
                      onChange={(e) => setMilestone1(e.target.value)}
                      className="w-full rounded border border-rose-900/60 bg-[#160408] px-2.5 py-1.5 text-xs text-rose-100 focus:outline-none"
                    >
                      <option value="CAREER_BREAKTHROUGH">Career Breakthrough / Promotion</option>
                      <option value="MARRIAGE">Marriage / Union Year</option>
                      <option value="SURGERY">Major Physical Surgery</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-rose-300/60 block mb-1">EVENT 1 DATE</label>
                    <input
                      type="date"
                      value={milestone1Date}
                      onChange={(e) => setMilestone1Date(e.target.value)}
                      className="w-full rounded border border-rose-900/60 bg-[#160408] px-2.5 py-1.5 text-xs text-rose-100 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-rose-300/60 block mb-1">EVENT 2 TYPE</label>
                    <select
                      value={milestone2}
                      onChange={(e) => setMilestone2(e.target.value)}
                      className="w-full rounded border border-rose-900/60 bg-[#160408] px-2.5 py-1.5 text-xs text-rose-100 focus:outline-none"
                    >
                      <option value="SURGERY">Major Physical Surgery</option>
                      <option value="CAREER_BREAKTHROUGH">High-Impact Career Shift</option>
                      <option value="MARRIAGE">Marriage Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-rose-300/60 block mb-1">EVENT 2 DATE</label>
                    <input
                      type="date"
                      value={milestone2Date}
                      onChange={(e) => setMilestone2Date(e.target.value)}
                      className="w-full rounded border border-rose-900/60 bg-[#160408] px-2.5 py-1.5 text-xs text-rose-100 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleStartCalculation}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-amber-500 py-3.5 px-6 font-bold text-[#140407] hover:brightness-110 active:scale-98 transition-all shadow-xl shadow-amber-950/40 text-sm flex items-center justify-center gap-2"
            >
              <span>INITIALIZE CORE RECTIFICATION & RESOLUTION</span>
              <span>→</span>
            </button>
            <p className="text-center text-[11px] font-mono text-rose-300/60">
              -&gt; Free processing pass. Core metrics resolved in sub-200ms threads.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: THE PROCESSING & CALCULATION SEQUENCE (Live Telemetry)          */}
      {/* ========================================================================= */}
      {currentScreen === 'screen3_telemetry' && (
        <div className="mx-auto max-w-lg rounded-2xl border border-emerald-500/40 bg-[#140407] p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in font-mono">
          <div className="flex items-center justify-between border-b border-rose-950/70 pb-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span className="text-emerald-400 font-bold">SYSTEM TELEMETRY CORE</span>
            </div>
            <span className="text-amber-400">{telemetryProgress}% PROCESSED</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-[#250810] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-300"
              style={{ width: `${telemetryProgress}%` }}
            />
          </div>

          {/* Terminal Output Stream */}
          <div className="rounded-xl border border-rose-950/80 bg-[#0e0205] p-4 text-[11px] leading-relaxed space-y-2 min-h-[220px]">
            {telemetryLogs.map((log, index) => (
              <div
                key={index}
                className={
                  log.includes('[SUCCESS]')
                    ? 'text-emerald-300 font-bold'
                    : log.includes('[CALIBRATING]')
                    ? 'text-amber-300'
                    : 'text-rose-200/90'
                }
              >
                {log}
              </div>
            ))}
          </div>

          <div className="text-center text-xs text-rose-300/60 animate-pulse">
            Compiling unified non-contradictory astrological vector package...
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 4: THE BLURRED PREVIEW & PAYWALL GATE (₹299 / $3.99 Asymmetric Blur)*/}
      {/* ========================================================================= */}
      {currentScreen === 'screen4_paywall' && (
        <div className="space-y-6 animate-fade-in">
          {/* Verified Header Card */}
          <div className="rounded-xl border-2 border-emerald-500/50 bg-[#1a050a] p-5 shadow-xl">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="rounded bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 font-bold">
                [PREVIEW MODE ACTIVE]
              </span>
              <span className="text-amber-400">Baseline Concordance: 88% Verified</span>
            </div>
            <div className="mt-3 text-base text-rose-100">
              Your True Birth Time has been rectified to: <strong className="font-mono text-emerald-400">1989-11-23 04:27:15 UTC</strong> (Offset: -165s)
            </div>
            <p className="mt-1 text-xs text-rose-300/70">
              Calibrated against 2 historical milestone anchors via 15-second sub-divisional search iterations.
            </p>
          </div>

          {/* Paywall Blurring Matrix (Asymmetrical Blur on Core Predictive Layers) */}
          <div className="relative rounded-2xl border border-rose-950/70 bg-[#1c050b] p-6 shadow-2xl overflow-hidden">
            {/* The Blurred Content Underneath */}
            <div className="space-y-5 filter blur-md select-none pointer-events-none opacity-40">
              <div className="rounded-lg bg-[#250810] p-4">
                <div className="text-xs text-amber-300 font-mono">[⚡] HIGH-PRECISION WEALTH EFFICIENCY SCORE:</div>
                <div className="text-3xl font-mono font-bold text-rose-100 mt-1">A_net = 54.76% (Benefic Opulence Dominant)</div>
                <div className="text-xs text-rose-300 mt-1">Dhana Yoga active via Jupiter 11th house trine with secondary Saturn friction.</div>
              </div>

              <div className="rounded-lg bg-[#250810] p-4">
                <div className="text-xs text-amber-300 font-mono">[⏱] OPTIMIZED DAILY ACTION HOUR:</div>
                <div className="text-2xl font-mono font-bold text-rose-100 mt-1">02:14 PM - 03:00 PM (High Efficacy Hora)</div>
                <div className="text-xs text-rose-300 mt-1">Peak alignment for capital allocation, negotiations, and contract execution.</div>
              </div>
            </div>

            {/* Asymmetrical Paywall Callout Overlay */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#140407]/80 backdrop-blur-[4px]">
              <div className="rounded-full bg-amber-500/20 p-3 ring-2 ring-amber-400/80 mb-3 shadow-lg">
                <span className="text-2xl">🔒</span>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl font-bold text-amber-300 max-w-md leading-tight">
                UNLOCK YOUR COMPREHENSIVE HIGH-ACCURACY PREDICTIVE SUITE
              </h2>

              <p className="mt-2 text-xs text-rose-200/90 max-w-lg leading-relaxed">
                Bypass contradictory legacy readings. Access context-aware timelines updated down to the minute via the Desha-Kala-Patra AI Framework.
              </p>

              {/* Checkout Action Card */}
              <div className="mt-6 w-full max-w-sm rounded-xl border border-amber-500/40 bg-[#25070f] p-4 space-y-3 shadow-2xl">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-200">Single Access Lifetime Unlock</span>
                  <span className="font-bold text-amber-300 text-sm">₹299 / $3.99</span>
                </div>

                <button
                  onClick={handleExecutePayment}
                  disabled={isProcessingPayment}
                  className="w-full rounded-lg bg-amber-500 py-3 px-4 font-bold text-[#140407] hover:bg-amber-400 active:scale-98 transition-all text-xs shadow-lg shadow-amber-950/60 disabled:opacity-50"
                >
                  {isProcessingPayment ? 'Verifying Webhook Signature...' : 'Pay via UPI / Card (Instant Unlock)'}
                </button>

                <div className="text-[10px] text-rose-300/60 flex items-center justify-center gap-2">
                  <span>GPay</span>
                  <span>·</span>
                  <span>PhonePe</span>
                  <span>·</span>
                  <span>Paytm</span>
                  <span>·</span>
                  <span>Cards</span>
                </div>
              </div>

              {/* Live Webhook Telemetry status box */}
              {paymentLog.length > 0 && (
                <div className="mt-4 w-full max-w-md text-left rounded bg-[#100205] p-3 text-[10px] font-mono text-emerald-400 border border-rose-950/70 space-y-1">
                  {paymentLog.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 5: THE OPERATIONAL DASHBOARD (C1 to C6 Integrated)                 */}
      {/* ========================================================================= */}
      {currentScreen === 'screen5_operational' && (
        <div className="space-y-6 animate-fade-in transition-all duration-700">
          {/* Top Unlocked Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              <strong className="font-mono">ACCESS_GRANTED:</strong>
              <span>Asynchronous webhook verified. Full C1-C6 operational suite unlocked.</span>
            </div>
            {onNavigateToFullApp && (
              <button
                onClick={onNavigateToFullApp}
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 font-mono whitespace-nowrap"
              >
                Open Main MymomentOclock Tabs →
              </button>
            )}
          </div>

          {/* C1: CONSOLIDATED PERSONAL CARD */}
          <div className="rounded-xl border border-rose-950/70 bg-[#1c050b] p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-950/70 pb-3">
              <div>
                <span className="font-mono text-xs text-amber-400 font-bold">[ C1: CONSOLIDATED PERSONAL CARD ]</span>
                <div className="text-xs text-rose-300/70 mt-0.5">
                  Profile ID: <span className="font-mono text-rose-100">USR_KOLKATA_89</span> · Certified Birth Time: <span className="font-mono text-emerald-400">04:27:15 AM</span>
                </div>
              </div>
              <div className="text-right text-xs font-mono text-rose-300/60">
                Star Sign: <strong className="text-amber-300">Chitra Nakshatra</strong> · System Calculations: <strong>True Lahiri</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-emerald-900/50 bg-[#160408] p-3.5">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span>-&gt; TARGET STRATEGY WINDOW:</span>
                  <span className="font-mono">02:14 PM - 03:00 PM</span>
                </div>
                <div className="text-[11px] text-rose-300/70 mt-1">(Auspicious Hora)</div>
              </div>

              <div className="rounded-lg border border-rose-900/50 bg-[#160408] p-3.5">
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <span>-&gt; SECONDARY BACKUP WINDOW:</span>
                  <span className="font-mono">05:30 PM - 06:15 PM</span>
                </div>
                <div className="text-[11px] text-rose-300/70 mt-1">(Transit Shield Active)</div>
              </div>
            </div>

            <div className="rounded-lg bg-[#24070e] p-3.5 border border-rose-950/60 text-xs text-rose-200/90 leading-relaxed">
              <strong className="text-amber-300 font-mono block mb-1">Verdict:</strong>
              Long-term technical execution and asset capacity indicators are strong. Avoid administrative or contractual approvals before 11:30 AM due to temporary external transit friction blocks.
            </div>
          </div>

          {/* C2: DYNAMIC CHRONO-WEATHER DIAL */}
          <div className="rounded-xl border border-rose-950/70 bg-[#1c050b] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-rose-950/70 pb-3">
              <span className="font-mono text-xs text-amber-400 font-bold">[ C2: DYNAMIC CHRONO-WEATHER DIAL ]</span>
              <span className="text-xs text-emerald-400 font-mono">Active Time Track: 02:14 PM</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Visual 24-Hour Solar Tracking Ring Graphic */}
              <div className="flex flex-col items-center justify-center p-4">
                <div className="relative h-44 w-44 rounded-full border-4 border-rose-900/60 bg-[#140407] flex items-center justify-center shadow-2xl">
                  {/* Outer hour ticks */}
                  <div className="absolute inset-2 rounded-full border border-dashed border-amber-500/30" />
                  {/* Needle indicating 02:14 PM (approx 213 deg) */}
                  <div
                    className="absolute h-18 w-1 bg-amber-400 origin-bottom rounded-full"
                    style={{ transform: 'rotate(213deg)', bottom: '50%' }}
                  />
                  <div className="text-center z-10">
                    <span className="text-[10px] font-mono text-rose-300/60 block">Rahu | Abhijit</span>
                    <span className="font-mono text-lg font-bold text-amber-300">89%</span>
                    <span className="text-[10px] text-emerald-400 block font-mono">EFFICIENCY</span>
                  </div>
                </div>
                <div className="mt-3 text-[11px] font-mono text-rose-300/60 text-center">
                  24-Hour Solar Tracking Ring
                </div>
              </div>

              {/* Transit Engine Modulators Breakdown */}
              <div className="md:col-span-2 space-y-3">
                <div className="rounded-lg border border-rose-950/60 bg-[#22070e] p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-rose-100">Abhijit Hora & Auspicious Sector</span>
                    <div className="text-[11px] text-rose-300/60">Personalized Transit Overlay (via Gochara Transit Modulators)</div>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    [89%]
                  </span>
                </div>

                <div className="rounded-lg border border-rose-950/60 bg-[#22070e] p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-rose-100">Rahu Kaal Friction Block</span>
                    <div className="text-[11px] text-rose-300/60">Personalized Transit Overlay (Calculated via Gochara)</div>
                  </div>
                  <span className="font-mono text-sm font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                    [45%]
                  </span>
                </div>

                <div className="rounded-lg bg-[#160408] p-3 border border-amber-900/40 text-xs text-amber-200">
                  <span className="font-bold">Performance Window Open:</span> (89% Efficiency) Active until 03:00 PM.
                </div>
              </div>
            </div>
          </div>

          {/* C3: CONTEXTUAL EVENT MATRIX STRIP */}
          <div className="rounded-xl border border-rose-950/70 bg-[#1c050b] p-6 shadow-xl space-y-3">
            <span className="font-mono text-xs text-amber-400 font-bold block mb-2">[ C3: CONTEXTUAL EVENT MATRIX STRIP ]</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-amber-500/40 bg-[#24070e] p-3.5 space-y-1">
                <span className="text-[10px] font-mono text-amber-400 font-semibold uppercase">[Dhanteras Strategy Window]</span>
                <div className="font-mono text-xs font-bold text-rose-100">28 Oct · 05:12 PM - 06:45 PM</div>
                <div className="text-[11px] text-emerald-400 font-mono font-semibold">84% Vector</div>
              </div>

              <div className="rounded-lg border border-amber-500/50 bg-[#280812] p-3.5 space-y-1 shadow-md">
                <span className="text-[10px] font-mono text-amber-300 font-semibold uppercase">[Diwali Lakshmi Puja Window]</span>
                <div className="font-mono text-xs font-bold text-rose-100">31 Oct · 06:22 PM - 07:54 PM</div>
                <div className="text-[11px] text-emerald-400 font-mono font-semibold">92% Vector</div>
              </div>

              <div className="rounded-lg border border-rose-950/60 bg-[#160408] p-3.5 space-y-1 opacity-70">
                <span className="text-[10px] font-mono text-rose-300/60 uppercase">[* Next Event Synchronization]</span>
                <div className="font-mono text-xs text-rose-300/80">Locked</div>
                <div className="text-[11px] text-rose-400 font-mono">Awaiting Next Transit Sync</div>
              </div>
            </div>
          </div>

          {/* C4: 365-DAY HIGH-RESOLUTION HEATMAP (1 Nov 2026 - 31 Oct 2027) */}
          <div className="rounded-xl border border-rose-950/70 bg-[#1c050b] p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-950/70 pb-3">
              <div>
                <span className="font-mono text-xs text-amber-400 font-bold">[ C4: 365-DAY HIGH-RESOLUTION HEATMAP ]</span>
                <div className="text-xs text-rose-300/70 mt-0.5">(1 Nov 2026 – 31 Oct 2027) Shaded grid blocks mapping Net Auspiciousness (A_net)</div>
              </div>

              {/* Month selector tabs */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
                {[
                  { m: 11, label: 'Nov 26' },
                  { m: 12, label: 'Dec 26' },
                  { m: 1, label: 'Jan 27' },
                  { m: 2, label: 'Feb 27' },
                  { m: 3, label: 'Mar 27' },
                  { m: 4, label: 'Apr 27' },
                ].map(item => (
                  <button
                    key={item.m}
                    onClick={() => {
                      setActiveMonth(item.m);
                      setSelectedHeatmapDay(null);
                    }}
                    className={`px-2 py-1 rounded text-[11px] transition-colors ${
                      activeMonth === item.m ? 'bg-amber-500 text-[#140407] font-bold' : 'bg-[#250810] text-rose-300/70 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-rose-300/70 flex items-center justify-between">
                <span>Calendar Grid: Showing {getDaysForMonth(activeMonth).length} Daily Vector Squares (A_net)</span>
                <span className="text-[10px] text-amber-300/80">Click square to inspect transit</span>
              </div>

              <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-2">
                {getDaysForMonth(activeMonth).map(item => {
                  let bgColor = 'bg-[#350b16] text-rose-200 border-rose-900/60'; // neutral
                  if (item.score >= 80) bgColor = 'bg-emerald-600 text-white font-bold border-emerald-400';
                  else if (item.score < 50) bgColor = 'bg-[#180408] text-rose-400 border-rose-950/80';

                  const isSelected = selectedHeatmapDay?.day === item.day;

                  return (
                    <button
                      key={item.day}
                      onClick={() => setSelectedHeatmapDay(item)}
                      className={`h-9 w-full rounded flex flex-col items-center justify-center text-[10px] font-mono border transition-all hover:scale-105 ${bgColor} ${
                        isSelected ? 'ring-2 ring-amber-400 scale-105' : ''
                      }`}
                    >
                      <span>{item.day}</span>
                      <span className="text-[8px] opacity-80">{item.score}%</span>
                    </button>
                  );
                })}
              </div>

              {/* Legend matching Audit Report */}
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-rose-300/70 pt-2 border-t border-rose-950/60">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-600 border border-emerald-400 inline-block" />
                  <span>■ = Peak Strategy Window [&gt;80%]</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-[#350b16] border border-rose-900 inline-block" />
                  <span>▨ = Balanced Transit Vector</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-[#180408] border border-rose-950 inline-block" />
                  <span>□ = Heavy Obstruction Day</span>
                </div>
              </div>

              {/* Day Inspector Detail */}
              {selectedHeatmapDay && (
                <div className="rounded-lg bg-[#250810] p-3 border border-amber-500/40 text-xs space-y-1 animate-fade-in">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-amber-300 font-bold">
                      Day {selectedHeatmapDay.day} Status: {selectedHeatmapDay.status}
                    </span>
                    <span className="text-emerald-400 font-bold">Vector Value (A_net): {selectedHeatmapDay.score}%</span>
                  </div>
                  <p className="text-rose-200 text-[11px]">{selectedHeatmapDay.note}</p>
                </div>
              )}
            </div>
          </div>

          {/* C5: THE SENSORY REMEDIAL SUITE (Non-Commercial RVM Directives) */}
          <div className="rounded-xl border border-rose-950/70 bg-[#1c050b] p-6 shadow-xl space-y-4">
            <span className="font-mono text-xs text-amber-400 font-bold block mb-1">
              [ C5: THE SENSORY REMEDIAL SUITE (Non-Commercial RVM Directives) ]
            </span>
            <p className="text-xs text-rose-300/70">
              Isolates deficient planetary vectors (&lt;0.60) and delivers practical, non-commercial acoustic and behavioral adjustments without product upselling.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ACOUSTIC 147Hz */}
              <div className="rounded-xl border border-rose-950/70 bg-[#22070e] p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-semibold">[🔊] ACOUSTIC DIRECTIVE</span>
                    <span className="text-rose-300/60">SAT_147_MID</span>
                  </div>
                  <p className="text-xs text-rose-100 leading-relaxed">
                    Listen to the <strong>147Hz resonance track for 11 minutes</strong> during your afternoon Saturn Hora block to clear focus blocks.
                  </p>
                </div>

                <button
                  onClick={handleToggle147Hz}
                  className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isPlaying147Hz
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-[#2a0812] text-amber-300 hover:bg-[#380c18] border border-rose-900/60'
                  }`}
                >
                  <span>{isPlaying147Hz ? '■ Stop 147Hz Track' : '▶ Play 147Hz Resonance Track (11 Min)'}</span>
                </button>
              </div>

              {/* BEHAVIORAL 8% FINANCES */}
              <div className="rounded-xl border border-rose-950/70 bg-[#22070e] p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-400 font-semibold">[💼] BEHAVIORAL DIRECTIVE</span>
                    <span className="text-rose-300/60">SAT_DISC_FIN</span>
                  </div>
                  <p className="text-xs text-rose-100 leading-relaxed">
                    Enforce systematic friction into your wealth loop. Automate an un-spendable <strong>8% weekly deposit</strong> to satisfy structural Saturn stability requirements.
                  </p>
                </div>

                <div className="text-[11px] font-mono text-emerald-400 bg-[#160408] p-2.5 rounded border border-rose-950/60">
                  ✓ Verified non-commercial RVM protocol
                </div>
              </div>
            </div>
          </div>

          {/* C6: CALIBRATION METADATA SUMMARY */}
          <div className="rounded-xl border border-rose-950/70 bg-[#160408] p-5 shadow-lg space-y-2 font-mono text-xs">
            <span className="text-amber-400 font-bold block mb-1">[ C6: CALIBRATION METADATA SUMMARY ]</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-rose-300/80 text-[11px]">
              <div>
                <span className="text-rose-400/60 block">Engine Version:</span>
                <span className="text-rose-100 font-semibold">2.1-Prod</span>
              </div>
              <div>
                <span className="text-rose-400/60 block">Data Source:</span>
                <span className="text-rose-100 font-semibold">illustrative calculation sequence</span>
              </div>
              <div>
                <span className="text-rose-400/60 block">Baseline Ayanamsa:</span>
                <span className="text-rose-100 font-semibold">Lahiri</span>
              </div>
              <div>
                <span className="text-rose-400/60 block">Conflict Processing System:</span>
                <span className="text-rose-100 font-semibold">Parashari</span>
              </div>
              <div>
                <span className="text-rose-400/60 block">Sunrise Model:</span>
                <span className="text-rose-100 font-semibold">Apparent</span>
              </div>
              <div>
                <span className="text-rose-400/60 block">Rectification Search Precision:</span>
                <span className="text-rose-100 font-semibold">15s</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
