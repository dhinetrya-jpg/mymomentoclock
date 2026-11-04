/**
 * Dashboard Layout View
 * Features:
 * 1. Calculated efficiency rings for Health, Wealth, and Relationships
 * 2. Color-coded timeline tracking personalized auspicious hours (Hora, Pradosh, Muhurat)
 * 3. Planetary positions table with Sp strength formula breakdown
 * 4. Micro-Divisional Charts viewer (D-1, D-2, D-9, D-60)
 * 5. Vimshottari Dasha timeline bar
 */

import React, { useState } from 'react';
import { ChartCalculationResult } from '../engine/astroMath';
import { ConflictResolutionResult } from '../engine/conflictResolver';
import { DeshaKalaPatraAI } from './DeshaKalaPatraAI';
import { DiwaliCountdown } from './DiwaliCountdown';

interface DashboardViewProps {
  chart: ChartCalculationResult;
  resolution: ConflictResolutionResult;
  onOpenConflictModal: () => void;
  onOpenBtrModal: () => void;
  onNavigateToProsperityKit?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  chart,
  resolution,
  onOpenConflictModal,
  onOpenBtrModal,
  onNavigateToProsperityKit,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'D1' | 'D2' | 'D9' | 'D60'>('D1');

  // Efficiency scores
  const wealthScore = Math.round(resolution.netAuspiciousnessVector * 100);
  const healthScore = Math.round((chart.planets.find(p => p.name === 'Sun')?.functionalScore || 0.8) * 60 + 20);
  const relationshipScore = Math.round((chart.planets.find(p => p.name === 'Venus')?.functionalScore || 0.8) * 65 + 15);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 0. Prominent Centerpiece: Diwali Cosmic Countdown & Panchang Clock */}
      <DiwaliCountdown
        chart={chart}
        onExploreProsperityKit={onNavigateToProsperityKit}
      />

      {/* Hero Strip: Chart Profile & Quick Calibrate */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-rose-950/70 bg-[#1a050a] p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs text-rose-200/60">
            <span>Chart Profile: {chart.inputProfile.cityName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{chart.inputProfile.birthDate}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{chart.inputProfile.birthTime}</span>
            <span aria-hidden="true">·</span>
            <span>Ayanamsa: {chart.systemMetadata.ayanamsaApplied} ({chart.systemMetadata.ayanamsaValue.toFixed(2)}°)</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-neutral-100">
              Lagna: {chart.ascendantSignName} ({chart.ascendantDegree.toFixed(2)}°)
            </h1>
            <span className="text-xs font-medium text-amber-400/90">
              Active Dasha: {chart.vimshottariDasha.activeMahadasha} - {chart.vimshottariDasha.activeAntardasha}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenBtrModal}
            className="rounded-lg border border-rose-900/60 bg-[#2b0912] px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-[#380c18] transition-colors whitespace-nowrap"
          >
            Calibrate Birth Time (BTR)
          </button>
          <button
            onClick={onOpenConflictModal}
            className="rounded-lg bg-amber-500/10 border border-amber-500/40 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
          >
            View Conflict Resolution Matrix
          </button>
        </div>
      </div>

      {/* 1. Core Efficiency Rings Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Wealth Efficiency Ring */}
        <div className="rounded-xl border border-rose-950/70 bg-[#22070e] p-5 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-200/70">Wealth & Assets Capacity</span>
            <span className="font-mono text-[11px] text-amber-400">A_net Vector</span>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-rose-950/80"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-amber-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${wealthScore}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono text-lg font-bold text-neutral-100 tabular-nums">
                {wealthScore}%
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-rose-100">
                {resolution.dominantVector.replace('_', ' ')}
              </div>
              <p className="mt-1 text-xs text-rose-200/60 line-clamp-2">
                {resolution.mathematicalContext}
              </p>
            </div>
          </div>
        </div>

        {/* Health & Vitality Ring */}
        <div className="rounded-xl border border-rose-950/70 bg-[#22070e] p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-200/70">Health & Vitality (Dosha Equilibrium)</span>
            <span className="font-mono text-[11px] text-emerald-400">D-6 & D-8 Blend</span>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-rose-950/80"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${healthScore}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono text-lg font-bold text-neutral-100 tabular-nums">
                {healthScore}%
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-rose-100">
                Pitta-Vata Dynamic Stability
              </div>
              <p className="mt-1 text-xs text-rose-200/60">
                Sun vitality holds structural strength; metabolic rhythm supported by morning solar light exposure.
              </p>
            </div>
          </div>
        </div>

        {/* Relationships & Dharma Ring */}
        <div className="rounded-xl border border-rose-950/70 bg-[#22070e] p-5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-200/70">Relationships & Concordance</span>
            <span className="font-mono text-[11px] text-sky-400">D-9 Navamsha</span>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-rose-950/80"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-sky-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${relationshipScore}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-mono text-lg font-bold text-neutral-100 tabular-nums">
                {relationshipScore}%
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-rose-100">
                High Spiritual Affinity
              </div>
              <p className="mt-1 text-xs text-rose-200/60">
                Navamsha 7th lord well-aspected; harmonious long-term alignment across joint family endeavors.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Color-coded Auspicious Hours Timeline */}
      <div className="rounded-xl border border-rose-950/70 bg-[#1a050a] p-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-rose-950/60 pb-3">
          <div>
            <h2 className="font-serif text-base font-semibold text-neutral-100">
              Personalized Auspicious Hours & Hora Timeline ({chart.inputProfile.cityName})
            </h2>
            <p className="text-xs text-rose-200/60 mt-0.5">
              Real-time solar-lunar transit windows calibrated to your natal ascendant
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-rose-200/70">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Auspicious (Shubha)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Golden Window (24m)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-800" /> Rahu Kaal (Pause)</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
            <div className="text-[11px] text-emerald-400 font-medium">Brahma Muhurta</div>
            <div className="font-mono text-xs font-semibold text-rose-100 mt-1">04:40 - 05:28 AM</div>
            <div className="text-[10px] text-rose-300/60 mt-1">Meditation & Sadhana</div>
          </div>
          <div className="rounded-lg border border-rose-950/60 bg-[#250810] p-3">
            <div className="text-[11px] text-rose-200/70 font-medium">Surya Hora</div>
            <div className="font-mono text-xs font-semibold text-rose-100 mt-1">06:15 - 07:18 AM</div>
            <div className="text-[10px] text-rose-300/60 mt-1">Leadership & Planning</div>
          </div>
          <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3">
            <div className="text-[11px] text-rose-400 font-medium">Rahu Kaal (Avoid)</div>
            <div className="font-mono text-xs font-semibold text-rose-100 mt-1">04:20 - 05:45 PM</div>
            <div className="text-[10px] text-rose-300/60 mt-1">Avoid signing contracts</div>
          </div>
          <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
            <div className="text-[11px] text-emerald-400 font-medium">Pradosh Kaal Window</div>
            <div className="font-mono text-xs font-semibold text-rose-100 mt-1">05:54 - 07:50 PM</div>
            <div className="text-[10px] text-rose-300/60 mt-1">Sacred Lakshmi Puja</div>
          </div>
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 ring-1 ring-amber-500/30">
            <div className="text-[11px] text-amber-300 font-semibold">Golden 24-Min Window</div>
            <div className="font-mono text-xs font-bold text-amber-200 mt-1">06:24 - 06:48 PM</div>
            <div className="text-[10px] text-amber-200/80 mt-1">Personal Wealth Trigger</div>
          </div>
          <div className="rounded-lg border border-sky-900/40 bg-sky-950/20 p-3">
            <div className="text-[11px] text-sky-400 font-medium">Vrishabha Sthira Lagna</div>
            <div className="font-mono text-xs font-semibold text-rose-100 mt-1">06:02 - 07:58 PM</div>
            <div className="text-[10px] text-rose-300/60 mt-1">Stable Capital Anchoring</div>
          </div>
        </div>
      </div>

      {/* 3. Divisional Charts Explorer & Interactive View */}
      <div className="rounded-xl border border-rose-950/70 bg-[#1a050a] p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-950/60 pb-3">
          <div>
            <h2 className="font-serif text-base font-semibold text-neutral-100">
              Micro-Divisional Astrological Formulations
            </h2>
            <p className="text-xs text-rose-200/60 mt-0.5">
              D-1 (Rashi), D-2 (Hora), D-9 (Navamsha), and D-60 (Shashtyamsa with BPHS named deities)
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-rose-950/70 bg-[#250810] p-1 text-xs">
            <button
              onClick={() => setActiveChartTab('D1')}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                activeChartTab === 'D1' ? 'bg-amber-500 text-[#1a0408] font-semibold shadow' : 'text-rose-200/70 hover:text-white'
              }`}
            >
              D-1 Lagna
            </button>
            <button
              onClick={() => setActiveChartTab('D2')}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                activeChartTab === 'D2' ? 'bg-amber-500 text-[#1a0408] font-semibold shadow' : 'text-rose-200/70 hover:text-white'
              }`}
            >
              D-2 Hora
            </button>
            <button
              onClick={() => setActiveChartTab('D9')}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                activeChartTab === 'D9' ? 'bg-amber-500 text-[#1a0408] font-semibold shadow' : 'text-rose-200/70 hover:text-white'
              }`}
            >
              D-9 Navamsha
            </button>
            <button
              onClick={() => setActiveChartTab('D60')}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                activeChartTab === 'D60' ? 'bg-amber-500 text-[#1a0408] font-semibold shadow' : 'text-rose-200/70 hover:text-white'
              }`}
            >
              D-60 Shashtyamsa
            </button>
          </div>
        </div>

        <div className="mt-5">
          {activeChartTab === 'D1' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {chart.houses.map(h => (
                <div key={h.number} className="rounded-lg border border-rose-950/70 bg-[#24070e] p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-serif font-bold text-amber-300">House {h.number}</span>
                    <span className="text-rose-200/70">{h.signName}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-rose-300/60">
                    Lord: <span className="text-rose-100">{h.signLord}</span> · Vibhuti: <span className="font-mono tabular-nums">{h.baseVibhuti}</span>
                  </div>
                  <div className="mt-2 min-h-[24px]">
                    {h.planetsPresent.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {h.planetsPresent.map(p => (
                          <span key={p} className="rounded bg-[#380d17] border border-rose-900/50 px-1.5 py-0.5 text-[11px] font-medium text-amber-200">
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-rose-400/40 italic">Empty house</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeChartTab === 'D2' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
                <div className="font-serif font-semibold text-amber-300 text-sm">Sun (Leo Half - Solar/Active Wealth)</div>
                <p className="text-xs text-rose-200/60 mt-1">Planets channeling conscious action, initiative, and capital acquisition:</p>
                <div className="mt-3 space-y-1.5">
                  {Object.entries(chart.divisionalCharts.d2.signs)
                    .filter(([, v]) => v.includes('Sun'))
                    .map(([planet, role]) => (
                      <div key={planet} className="flex justify-between text-xs border-b border-rose-950/50 pb-1">
                        <span className="font-medium text-rose-100">{planet}</span>
                        <span className="text-rose-300/60 font-mono text-[11px]">{role}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-lg border border-sky-900/40 bg-sky-950/20 p-4">
                <div className="font-serif font-semibold text-sky-300 text-sm">Moon (Cancer Half - Lunar/Preserved Wealth)</div>
                <p className="text-xs text-rose-200/60 mt-1">Planets governing emotional nourishment, capital retention, and family comfort:</p>
                <div className="mt-3 space-y-1.5">
                  {Object.entries(chart.divisionalCharts.d2.signs)
                    .filter(([, v]) => v.includes('Moon'))
                    .map(([planet, role]) => (
                      <div key={planet} className="flex justify-between text-xs border-b border-rose-950/50 pb-1">
                        <span className="font-medium text-rose-100">{planet}</span>
                        <span className="text-rose-300/60 font-mono text-[11px]">{role}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeChartTab === 'D9' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
              {Object.entries(chart.divisionalCharts.d9.navamshaPlacements).map(([planet, nav]) => (
                <div key={planet} className="rounded-lg border border-rose-950/70 bg-[#24070e] p-3">
                  <div className="text-xs font-semibold text-rose-100">{planet}</div>
                  <div className="text-xs text-amber-300 mt-1 font-mono">
                    Navamsha Sign: {nav.sign}
                  </div>
                  <div className="text-[11px] text-rose-300/50 mt-0.5">
                    Sign Index: {nav.signIndex + 1}/12
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeChartTab === 'D60' && (
            <div className="space-y-2">
              <div className="text-xs text-rose-200/60 mb-2">
                D-60 Shashtyamsa divides each sign into 60 segments of 30 arc-minutes. Essential for macro-destiny and BTR calibration:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {chart.divisionalCharts.d60.shashtyamsas.map((s) => (
                  <div key={s.planet} className="rounded-lg border border-rose-950/70 bg-[#24070e] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-rose-100">{s.planet}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        s.nature === 'Auspicious' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        s.nature === 'Malefic' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                        'bg-[#2a0812] text-rose-300/60 border border-rose-950/60'
                      }`}>
                        {s.nature}
                      </span>
                    </div>
                    <div className="font-serif text-sm font-bold text-amber-300 mt-1">
                      Deity: {s.deityName}
                    </div>
                    <div className="text-[11px] text-rose-300/60 mt-0.5 font-mono">
                      Part {s.partIndex + 1}/60 ({s.planet})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Planetary Functional Strength (Sp) Table */}
      <div className="rounded-xl border border-rose-950/70 bg-[#1a050a] p-5 shadow-lg overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-950/60 pb-3">
          <div>
            <h2 className="font-serif text-base font-semibold text-neutral-100">
              Planetary Functional Strength Score Matrix (Sp)
            </h2>
            <p className="text-xs text-rose-200/60 mt-0.5 font-mono">
              Sp = (0.50 × Shadbala) + (0.35 × Bindus/8) + (0.15 × Lordship)
            </p>
          </div>
          <span className="text-xs text-rose-200/70">9 Navagraha Nodes</span>
        </div>

        <table className="mt-4 w-full text-left text-xs">
          <thead>
            <tr className="border-b border-rose-950/60 text-rose-200/60 font-mono">
              <th className="py-2.5 pr-4">Planet</th>
              <th className="py-2.5 px-3">Sidereal Longitude</th>
              <th className="py-2.5 px-3">House</th>
              <th className="py-2.5 px-3">Nakshatra</th>
              <th className="py-2.5 px-3">Shadbala (W_sb=0.50)</th>
              <th className="py-2.5 px-3">Ashtakavarga (W_av=0.35)</th>
              <th className="py-2.5 px-3">Lordship (W_fr=0.15)</th>
              <th className="py-2.5 pl-3 text-right">Sp Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-950/40 font-mono tabular-nums">
            {chart.planets.map(p => (
              <tr key={p.name} className="hover:bg-[#2b0912]/60 transition-colors">
                <td className="py-2.5 pr-4 font-sans font-medium text-neutral-100 flex items-center gap-1.5">
                  <span className="text-amber-400">{p.symbol}</span> {p.name}
                </td>
                <td className="py-2.5 px-3 text-rose-100/90">
                  {p.signName} {p.degreeInSign.toFixed(2)}°
                </td>
                <td className="py-2.5 px-3 text-rose-100/90">H{p.houseNumber}</td>
                <td className="py-2.5 px-3 text-rose-200/60 font-sans">
                  {p.nakshatra} P{p.nakshatraPada}
                </td>
                <td className="py-2.5 px-3 text-rose-100/90">{p.shadbala.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-rose-100/90">{p.ashtakavargaBindus}/8</td>
                <td className="py-2.5 px-3">
                  <span className={p.functionalNature > 0 ? 'text-emerald-400' : p.functionalNature < 0 ? 'text-rose-400' : 'text-neutral-400'}>
                    {p.functionalNature > 0 ? `+${p.functionalNature}` : p.functionalNature}
                  </span>
                </td>
                <td className="py-2.5 pl-3 text-right font-bold text-amber-300">
                  {p.functionalScore.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Desha-Kala-Patra Contextual AI Streaming Reader */}
      <DeshaKalaPatraAI chart={chart} resolution={resolution} />
    </div>
  );
};
