/**
 * @license
 * MIT License
 *
 * Shubha Muhurat Mathematical & Shastric Calculation Explainer
 * Transparent 7-layer Drik astronomical & Vedic Jyotish breakdown with exact
 * scoring weights, 12-hour AM/PM live values, and hemisphere-accurate coordinates.
 */

import React, { useState } from 'react';
import { DayAnalysisResult, LocationCoordinates } from '../engine/zeroCostAstroEngine';
import { OfflineGeoResolver } from '../engine/offlineGeoData';

interface MuhuratCalculationExplainerProps {
  dayData: DayAnalysisResult;
  location: LocationCoordinates;
}

export const MuhuratCalculationExplainer: React.FC<MuhuratCalculationExplainerProps> = ({
  dayData,
  location
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const coordLabel = OfflineGeoResolver.formatCoordinates(location.latitude, location.longitude, 2);

  const steps = [
    {
      step: 1,
      title: '1. Topocentric Solar Coordinates & Atmospheric Refraction',
      short: 'Solar Position & Refraction',
      icon: '🌅',
      formula: "h_0 = -50' = -0.8333° (Geometric refraction -34' + Solar semidiameter -16')",
      explanation: `Earth rotates 1° every 4 minutes. Jean Meeus VSOP87 solar equations compute the Sun's apparent right ascension, declination, and Equation of Time, applying topocentric atmospheric refraction (-50') at ${coordLabel}.`,
      liveData: [
        { label: 'Computed Sunrise', val: dayData.solarMetrics.sunrise12Hr },
        { label: 'Computed Sunset', val: dayData.solarMetrics.sunset12Hr },
        { label: 'True Solar Noon', val: dayData.solarMetrics.solarNoon12Hr },
        { label: 'Total Day Span (D)', val: `${dayData.solarMetrics.dayLengthMinutes} mins (${(dayData.solarMetrics.dayLengthMinutes / 60).toFixed(2)} hrs)` }
      ]
    },
    {
      step: 2,
      title: '2. The 8 Solar & Lunar Kaalas (Daylight Octants + Amritadi Ghati)',
      short: '8 Kaalas & Rahu Kaal',
      icon: '🔴',
      formula: 'Kaala Octant = (Sunset - Sunrise) / 8 ≈ ' + Math.round(dayData.solarMetrics.dayLengthMinutes / 8) + ' minutes each',
      explanation: 'Daylight (D) is partitioned into 8 temporal octants for Rahu Kaal, Yamaghanta, and Gulika. Abhijit Muhurta spans the 8th diurnal Muhurta (D/15) centered on True Solar Noon (cancelled on Wednesdays due to midday Rahu overlap), while Amrit Kaal follows the classical 27-Nakshatra Amritadi Ghati table.',
      liveData: [
        { label: 'Rahu Kaal (-35 pts)', val: `${dayData.fixedKaalas.rahuKaal.start12Hr} – ${dayData.fixedKaalas.rahuKaal.end12Hr}` },
        {
          label: dayData.fixedKaalas.abhijitMuhurta.isValidOnThisDay ? 'Abhijit Muhurta (+25 pts)' : 'Abhijit (Cancelled Wed)',
          val: `${dayData.fixedKaalas.abhijitMuhurta.start12Hr} – ${dayData.fixedKaalas.abhijitMuhurta.end12Hr}`
        },
        { label: 'Brahma Muhurta (+15 pts)', val: `${dayData.fixedKaalas.brahmaMuhurta.start12Hr} – ${dayData.fixedKaalas.brahmaMuhurta.end12Hr}` },
        { label: 'Lunar Amrit Kaal (+15 pts)', val: `${dayData.fixedKaalas.amritKaal.start12Hr} – ${dayData.fixedKaalas.amritKaal.end12Hr}` }
      ]
    },
    {
      step: 3,
      title: '3. 16 Day & Night Choghadiyas + Pre-Sunrise Continuity',
      short: 'Choghadiya Spans',
      icon: '☀️',
      formula: 'Day Choghadiya = D / 8 | Night Choghadiya = N / 8 (with Pre-Sunrise Vedic Continuity)',
      explanation: 'Both daytime (Sunrise→Sunset) and nighttime (Sunset→Next Sunrise, plus Midnight→Sunrise from the preceding Vedic night) are divided into 8 spans: Amrit (+18), Shubh (+15), Labh (+14), Char (+6), Udveg (-15), Rog (-18), and Kaal (-20).',
      liveData: dayData.choghadiya.dayChoghadiya.slice(0, 4).map((c) => ({
        label: `${c.name} (${c.vedicLord})`,
        val: `${c.start12Hr} – ${c.end12Hr}`
      }))
    },
    {
      step: 4,
      title: '4. The 24 Planetary Horas (Chaldean Planetary Hours)',
      short: '24 Planetary Horas',
      icon: '🪐',
      formula: 'Hora 1 = Vaara Lord at Sunrise → Chaldean speed order (Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon)',
      explanation: 'Each Vedic day begins at local sunrise with the Vaara Lord and cycles through 12 diurnal and 12 nocturnal planetary hours. Jupiter (+12), Venus (+10), Mercury (+8), and Moon (+6) Horas uplift auspicious undertakings; Mars (-8) and Saturn (-10) Horas favor technical or audit work.',
      liveData: dayData.horas.slice(0, 4).map((h) => ({
        label: `Hora ${h.horaNumber} (${h.rulingPlanet})`,
        val: `${h.start12Hr} – ${h.end12Hr}`
      }))
    },
    {
      step: 5,
      title: '5. The 5 Limbs of Panchanga & 60-Karana Cycle (ELP2000 Moon)',
      short: '5 Limbs of Panchanga',
      icon: '🌙',
      formula: "Tithi = (Moon - Sun) / 12° | Nakshatra = Moon / 13°20' | Karana = 60 Half-Tithis",
      explanation: 'Evaluates Tithi, Nakshatra (4 Padas), Nitya Yoga, Vaara, and the exact 60-Karana sequence (4 fixed Karanas + 56 movable cycles), flagging Vishti (Bhadra) Karana (-12 pts) automatically.',
      liveData: [
        { label: 'Tithi', val: `${dayData.panchanga.tithi.name} (${dayData.panchanga.tithi.paksha} Paksha)` },
        { label: 'Nakshatra', val: `${dayData.panchanga.nakshatra.name} (Pada ${dayData.panchanga.nakshatra.pada}, Lord: ${dayData.panchanga.nakshatra.lord})` },
        { label: 'Nitya Yoga', val: `${dayData.panchanga.yoga.name} (Harmonic ${dayData.panchanga.yoga.index}/27)` },
        { label: 'Karana', val: `${dayData.panchanga.karana.name}${dayData.panchanga.karana.isVishtiBhadra ? ' (Vishti Caution)' : ''}` }
      ]
    },
    {
      step: 6,
      title: '6. Sripati Bhava Chalit 4-Quadrant Unequal Trisection',
      short: 'Sripati House Trisection',
      icon: '📐',
      formula: 'Quadrant Trisection: (IC - Asc)/3, (Desc - IC)/3, (MC - Desc)/3, (Asc - MC)/3',
      explanation: 'Computes live Local Sidereal Time (GMST + Observer Longitude) to solve instantaneous Sidereal Ascendant (Lagna) and Midheaven (MC), trisecting all 4 horizon-meridian quadrants into 12 unequal Sripati Bhavas and Sandhis.',
      liveData: [
        { label: 'Ayanamsa Standard', val: 'True Chitrapaksha Lahiri' },
        { label: 'Ayanamsa Value', val: `${dayData.ayanamsa.valueDegrees}°` },
        { label: 'Observer Coordinates', val: coordLabel },
        { label: 'UTC Offset', val: `UTC${location.timezoneOffset >= 0 ? `+${location.timezoneOffset}` : location.timezoneOffset}h` }
      ]
    },
    {
      step: 7,
      title: '7. Universal vs Personalized Composite Scoring Formula',
      short: 'Composite 5–98% Score',
      icon: '📊',
      formula: 'Score = clamp(5..98, Base(50) + Choghadiya(-20..+18) + Hora(-10..+12) + Kaalas(-35..+25) - Vishti(12) + TaraBala(-30..+25) + ChandraBala(-35..+15) + Lagna(-10..+8))',
      explanation: 'In Universal Mode, scores reflect pure topocentric Panchanga, Kaalas, Choghadiya, and Hora. When personalized (via 20-Sec Quiz or Exact Birth Details), real-time transit Moon Nakshatra Tara Bala, Chandra Bala (including -35 Ashtama Chandra protection), and transit Lagna harmony modulate every 15-minute window.',
      liveData: [
        { label: 'Amritham Tier', val: 'Score ≥ 75% (Peak Golden Window for Milestones)' },
        { label: 'Shubha Tier', val: 'Score 55% – 74% (Constructive & Supportive)' },
        { label: 'Madhyama Tier', val: 'Score 40% – 54% (Routine Execution)' },
        { label: 'Varjya / Caution', val: 'Score < 40% or Rahu / Ashtama Active' }
      ]
    }
  ];

  const cur = steps.find((s) => s.step === activeStep) || steps[0];

  return (
    <div className="rounded-2xl border border-amber-900/60 bg-[#140307] p-5 sm:p-6 text-rose-100 space-y-6 shadow-2xl scroll-mt-28">
      <div className="border-b border-rose-950 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔬</span>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-amber-300">
            The Science Behind Shubha Muhurat Calculation
          </h2>
        </div>
        <p className="text-xs text-rose-300/80 mt-1 max-w-3xl leading-relaxed">
          Transparent 7-layer mathematical derivation executed 100% on your device for {location.cityName || 'Observer Location'} ({coordLabel}).
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-rose-950">
        {steps.map((s) => (
          <button
            key={s.step}
            type="button"
            onClick={() => setActiveStep(s.step)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeStep === s.step
                ? 'bg-amber-500 text-neutral-950 shadow-md scale-[1.02]'
                : 'bg-[#22070e] text-rose-300 hover:bg-rose-950 border border-rose-950'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.short}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-rose-900 bg-[#1a050d] p-5 space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-950 pb-3">
          <h3 className="font-serif text-lg font-bold text-amber-200 flex items-center gap-2">
            <span>{cur.icon}</span>
            <span>{cur.title}</span>
          </h3>
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
            100% Client-Side Math
          </span>
        </div>

        <div className="rounded-lg bg-[#0e0205] border border-amber-900/40 p-3 font-mono text-xs text-amber-300/90 overflow-x-auto">
          <span className="text-[10px] text-rose-400 block font-sans font-semibold uppercase mb-0.5">Mathematical Derivation:</span>
          {cur.formula}
        </div>

        <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
          {cur.explanation}
        </p>

        <div className="pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block mb-2">
            Live Computed Values for {location.cityName || 'Selected Location'} ({coordLabel}) on {dayData.date}:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {cur.liveData.map((d, i) => (
              <div key={i} className="rounded-lg border border-rose-950 bg-[#22070e] p-2.5 space-y-1">
                <span className="text-[11px] text-rose-400 block font-medium">{d.label}</span>
                <strong className="text-amber-200 text-xs font-semibold block">{d.val}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-700/50 bg-gradient-to-r from-amber-950/40 via-[#260810] to-amber-950/30 p-4 text-xs space-y-2">
        <strong className="text-amber-300 font-serif text-sm flex items-center gap-2">
          <span>💡</span> Why Exact Latitude, Longitude &amp; DST Offset Matter:
        </strong>
        <p className="text-rose-200/90 leading-relaxed">
          Political timezones span thousands of kilometers—sunrise in Guwahati occurs over an hour earlier than in Dwarka on the same IST clock! Because Vedic Kaalas, Choghadiyas, Horas, and Lagna cusps are anchored to the true local horizon, recalculating topocentric solar geometry for {coordLabel} ensures genuine astronomical accuracy anywhere on Earth.
        </p>
      </div>
    </div>
  );
};
