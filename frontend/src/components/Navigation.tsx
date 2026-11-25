/**
 * @license
 * MIT License
 * 
 * Clean, Unified Production Navigation Bar
 * Purged of all legacy prototype tabs (RVM Remedies, Living Room Games, Acquisition Demo).
 * Delivers laser-focused, high-converting product architecture.
 */

import React from 'react';

export type ActiveTab = 
  | 'auspicious-hub'      // Screen 1: 24-Hour Chrono-Dial, Golden Windows, GPS Location, AM/PM
  | 'planner'             // Screen 2: Multi-Horizon Planner (Day, Week, Month, Year)
  | 'remedies-attire'     // Screen 3: Action Guidance, Attire Colors & Footwear Shastric Matrix
  | 'ai-muhurat'          // Screen 4: AI Muhurat Chatbot & Instant Presets
  | 'science-audit';      // Screen 5: Science of Shubha Muhurat & Calculation Explainer

export const Navigation: React.FC<{
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}> = ({ activeTab, onTabChange }) => {
  const tabs: Array<[ActiveTab, string]> = [
    ['auspicious-hub', '⏱️ Auspicious Chrono-Dial'],
    ['planner', '📅 Multi-Horizon Planner'],
    ['remedies-attire', '🪔 Actions, Attire & Footwear'],
    ['ai-muhurat', '✨ AI Muhurat Assistant'],
    ['science-audit', '🔬 Science of Muhurat']
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-rose-950/70 bg-[#140307]/95 backdrop-blur-md shadow-xl">
      <div className="mx-auto max-w-7xl min-w-0 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Product Name */}
        <button
          className="flex items-center gap-2.5 font-serif text-lg sm:text-xl text-amber-300 font-bold tracking-tight hover:text-amber-200 transition-colors"
          onClick={() => onTabChange('auspicious-hub')}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-700 text-neutral-950 text-sm shadow-md">
            🕉️
          </span>
          <span>MyMomentOclock</span>
          <span className="hidden md:inline text-xs font-sans font-normal text-rose-300/70 border-l border-rose-900 pl-2.5 ml-1">
            Drik Ephemeris · 10M Precision Timing Platform
          </span>
        </button>

        {/* Live Status Tag */}
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-300">Edge Client Engine Active</span>
        </div>
      </div>

      {/* Main Tab Links */}
      <nav aria-label="Main navigation" className="mx-auto max-w-7xl min-w-0 w-full flex gap-3 sm:gap-6 overflow-x-auto px-4 pb-2.5 pt-1 text-xs sm:text-sm border-t border-rose-950/50">
        {tabs.map(([tab, label]) => (
          <button
            key={tab}
            aria-current={activeTab === tab ? 'page' : undefined}
            className={`whitespace-nowrap pb-1 font-medium transition-all ${
              activeTab === tab
                ? 'text-amber-300 font-bold border-b-2 border-amber-400 shadow-sm'
                : 'text-rose-200/70 hover:text-white'
            }`}
            onClick={() => onTabChange(tab)}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
};
