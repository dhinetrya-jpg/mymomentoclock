/**
 * @license
 * MIT License
 *
 * Clean, Unified Production Navigation Bar
 * Connects the Fail-Closed Muhurat Hub, Natal Birth Chart (OnboardingWizard -> DashboardView),
 * Birth-Time Uncertainty Explorer, Prosperity Kit, and Authoritative Daily Timing Boundary.
 */

import React from 'react';

export type ActiveTab =
  | 'auspicious-hub'      // Screen 1: Fail-Closed Muhurat Hub & Chrono-Dial
  | 'natal-chart'         // Audit 2 E2E Flow: Enter Birth Details -> Natal Chart Preview
  | 'birth-explorer'      // F01: Birth-Time Uncertainty Explorer
  | 'planner'             // Screen 2: Multi-Horizon Planner (Day, Week, Month, Year)
  | 'remedies-attire'     // Screen 3: Action Guidance, Attire Colors & Footwear Shastric Matrix
  | 'ai-muhurat'          // Screen 4: Shastric Rule Scanner & Instant Presets
  | 'prosperity-kit'      // Festival Preview & Sealed Envelope Kit
  | 'living-room'         // Ambient Puja TV Backdrop
  | 'science-audit'       // Screen 5: Science of Shubha Muhurat & Calculation Explainer
  | 'daily-timing';       // Screen 6: Authoritative Backend Boundary (/api/v1/timing/daily)

export const Navigation: React.FC<{
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onEditBirthDetails: () => void;
}> = ({ activeTab, onTabChange, onEditBirthDetails }) => {
  const tabs: Array<[ActiveTab, string]> = [
    ['auspicious-hub', '⏱️ Auspicious Chrono-Dial'],
    ['planner', '📅 Multi-Horizon Planner'],
    ['remedies-attire', '🪔 Actions, Attire & Footwear'],
    ['ai-muhurat', '✨ Shastric Scanner'],
    ['science-audit', '🔬 Science of Muhurat'],
    ['daily-timing', 'Daily Timing'],
    ['birth-explorer', 'Birth Time Explorer'],
    ['prosperity-kit', 'Prosperity Kit'],
    ['living-room', '📺 Puja Backdrop'],
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-rose-950/70 bg-[#140307]/95 backdrop-blur-md shadow-xl">
      <div className="mx-auto max-w-7xl min-w-0 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Product Name */}
        <button
          type="button"
          className="flex items-center gap-2.5 font-serif text-lg sm:text-xl text-amber-300 font-bold tracking-tight hover:text-amber-200 transition-colors"
          onClick={() => onTabChange('auspicious-hub')}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-700 text-neutral-950 text-sm shadow-md">
            🕉️
          </span>
          <span>MymomentOclock</span>
          <span className="hidden md:inline text-xs font-sans font-normal text-rose-300/70 border-l border-rose-900 pl-2.5 ml-1">
            Fail-Closed Gate · release_authorized: false
          </span>
        </button>

        {/* Natal Chart Entry & Explicit Release Scope Status Tag */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onEditBirthDetails}
            aria-current={activeTab === 'natal-chart' ? 'page' : undefined}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'natal-chart'
                ? 'border-amber-400 bg-amber-500 text-neutral-950'
                : 'border-amber-500/50 bg-[#260812] text-amber-200 hover:bg-amber-950/60'
            }`}
          >
            Edit Birth Details
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-[11px] font-mono text-rose-200">Fail-Closed · Backend Gate 503</span>
          </div>
        </div>
      </div>

      {/* Main Tab Links */}
      <nav aria-label="Main navigation" className="mx-auto max-w-7xl min-w-0 w-full flex gap-3 sm:gap-5 overflow-x-auto px-4 pb-2.5 pt-1 text-xs sm:text-sm border-t border-rose-950/50">
        {tabs.map(([tab, label]) => (
          <button
            key={tab}
            type="button"
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
