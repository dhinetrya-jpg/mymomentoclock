/**
 * @license
 * MIT License
 *
 * MyMomentOclock Production Application Root
 */

import React, { useState } from 'react';
import { Navigation, ActiveTab } from './components/Navigation';
import { AuspiciousMasterHub } from './components/AuspiciousMasterHub';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('auspicious-hub');

  return (
    <div className="min-h-screen bg-[#0d0206] text-rose-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-neutral-950"
      >
        Skip to main content
      </a>

      {/* Sticky Top Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 scroll-mt-28">
        <AuspiciousMasterHub
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </main>

      {/* Production Footer */}
      <footer className="mt-16 border-t border-rose-950/70 bg-[#0a0204] py-8 text-rose-300/60 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
            <span className="font-serif text-sm font-bold text-amber-300">MyMomentOclock Platform</span>
            <span>·</span>
            <span>Drik Precision Timing Engine</span>
            <span>·</span>
            <span className="text-emerald-400 font-mono">100% Client Edge ($0 Server Cost)</span>
          </div>

          <div className="text-center sm:text-right text-[11px] space-y-0.5 text-rose-400/60">
            <p>Calculations adhere to Meeus VSOP87 &amp; ELP2000 ephemerides and True Chitrapaksha Lahiri Ayanamsa.</p>
            <p>Empowering mindful decision-making across all life milestones.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
