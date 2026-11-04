/**
 * Onboarding Wizard Component (View 1 from UX Wireframes)
 * Supports:
 * - Geolocated city search with auto-coordinate filling
 * - Birth date and birth time entry
 * - Ayanamsa selection (True Lahiri, KP, Raman)
 * - Quick switch between Full Astrology Edition and Festival & Reflection Edition
 */

import React, { useState } from 'react';
import { AyanamsaType } from '../engine/astroMath';
import { MAJOR_CITIES_MUHURAT } from '../engine/diwaliData';

interface OnboardingWizardProps {
  onCalculate: (params: {
    birthDate: string;
    birthTime: string;
    latitude: number;
    longitude: number;
    cityName: string;
    ayanamsaType: AyanamsaType;
  }) => void;
  onOpenQuickFestival: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onCalculate,
  onOpenQuickFestival,
}) => {
  const [cityName, setCityName] = useState('Kolkata');
  const [birthDate, setBirthDate] = useState('1989-11-23');
  const [birthTime, setBirthTime] = useState('04:30:00');
  const [ayanamsa, setAyanamsa] = useState<AyanamsaType>(AyanamsaType.TRUE_LAHIRI);

  const handleCityChange = (newCity: string) => {
    setCityName(newCity);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cityMeta = MAJOR_CITIES_MUHURAT[cityName] || MAJOR_CITIES_MUHURAT['Kolkata'];
    onCalculate({
      birthDate,
      birthTime,
      latitude: cityMeta.lat,
      longitude: cityMeta.lon,
      cityName,
      ayanamsaType: ayanamsa,
    });
  };

  return (
    <div className="rounded-2xl border border-rose-950/70 bg-[#1c050b] p-6 lg:p-8 shadow-2xl max-w-2xl mx-auto">
      <div className="text-center space-y-1.5 border-b border-rose-950/60 pb-5">
        <span className="font-mono text-xs font-semibold text-amber-400 uppercase tracking-widest">
          Module 1 · Spatiotemporal Normalization Engine
        </span>
        <h2 className="font-serif text-2xl font-bold text-neutral-100">
          Initialize Your Vedic Natal Profile
        </h2>
        <p className="text-xs text-rose-300/60 max-w-md mx-auto">
          Calculates Julian Day, Ephemeris Delta-T, Ascendant degree, and sub-divisional charts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-rose-100">Birth Date</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-rose-900/60 bg-[#280812] px-3.5 py-2.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-rose-100">Birth Time (Local)</label>
            <input
              type="time"
              step="1"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-rose-900/60 bg-[#280812] px-3.5 py-2.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none font-mono"
            />
            <span className="text-[10px] text-rose-300/50 mt-1 block">
              Unsure of seconds? Automated BTR will calibrate afterwards.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-rose-100">City / Geographic Longitude</label>
            <select
              value={cityName}
              onChange={(e) => handleCityChange(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-rose-900/60 bg-[#280812] px-3.5 py-2.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none"
            >
              {Object.keys(MAJOR_CITIES_MUHURAT).map((c) => (
                <option key={c} value={c}>{c} ({MAJOR_CITIES_MUHURAT[c].stateCountry})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-rose-100">Ayanamsa Reference System</label>
            <select
              value={ayanamsa}
              onChange={(e) => setAyanamsa(e.target.value as AyanamsaType)}
              className="mt-1.5 w-full rounded-lg border border-rose-900/60 bg-[#280812] px-3.5 py-2.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none"
            >
              <option value={AyanamsaType.TRUE_LAHIRI}>True Lahiri (Chitrapaksha) - Global Baseline</option>
              <option value={AyanamsaType.KP}>KP (Krishnamurti Paddhati)</option>
              <option value={AyanamsaType.RAMAN}>B.V. Raman Ayanamsa</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-amber-500 py-3 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-950/50"
          >
            Compute High-Precision Chart & Sp Matrix
          </button>

          <button
            type="button"
            onClick={onOpenQuickFestival}
            className="rounded-xl border border-rose-900/60 bg-[#25070f] px-5 py-3 text-xs font-semibold text-rose-200 hover:bg-[#340a15] transition-colors"
          >
            Skip to Festival Kit (No Birth Time)
          </button>
        </div>
      </form>
    </div>
  );
};
