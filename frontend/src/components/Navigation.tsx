/**
 * Top Bar Navigation complying with the strict Top Bar Contract:
 * [Zone 1: Wordmark] - [Zone 2: 4-5 single-line nav links] - [Zone 3: 1 primary CTA]
 */

import React from 'react';

export type ActiveTab = 'funnel' | 'dashboard' | 'prosperity-kit' | 'remediation' | 'ambient-games' | 'devops-uat';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenQuickCheckout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenQuickCheckout,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-rose-950/70 bg-[#160408]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onTabChange('funnel')}
          className="font-serif text-lg font-semibold tracking-wide text-amber-300 hover:text-amber-200 transition-colors whitespace-nowrap shrink-0 text-left"
        >
          MymomentOclock · Platform
        </button>

        {/* Zone 2: Clean single-line text links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-rose-100/80">
          <button
            onClick={() => onTabChange('funnel')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-amber-300 ${
              activeTab === 'funnel' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400/80' : 'text-rose-200/70'
            }`}
          >
            Acquisition Funnel
          </button>
          <button
            onClick={() => onTabChange('dashboard')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-amber-300 ${
              activeTab === 'dashboard' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400/80' : 'text-rose-200/70'
            }`}
          >
            Astro Dashboard
          </button>
          <button
            onClick={() => onTabChange('prosperity-kit')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-amber-300 ${
              activeTab === 'prosperity-kit' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400/80' : 'text-rose-200/70'
            }`}
          >
            Prosperity Kit
          </button>
          <button
            onClick={() => onTabChange('remediation')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-amber-300 ${
              activeTab === 'remediation' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400/80' : 'text-rose-200/70'
            }`}
          >
            RVM Remedies
          </button>
          <button
            onClick={() => onTabChange('ambient-games')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-amber-300 ${
              activeTab === 'ambient-games' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400/80' : 'text-rose-200/70'
            }`}
          >
            Living Room & Games
          </button>
          <button
            onClick={() => onTabChange('devops-uat')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-amber-300 ${
              activeTab === 'devops-uat' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-400/80' : 'text-rose-200/70'
            }`}
          >
            UAT & Benchmarks
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenQuickCheckout}
            className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 transition-colors hover:bg-amber-400 active:scale-98 whitespace-nowrap shrink-0 shadow-md shadow-amber-950/40"
          >
            Get ₹99 Diwali Kit
          </button>
        </div>
      </div>

      {/* Mobile nav strip */}
      <div className="flex md:hidden overflow-x-auto border-t border-rose-950/70 bg-[#160408] px-4 py-2 gap-4 text-xs font-medium text-rose-200/80 no-scrollbar">
        <button
          onClick={() => onTabChange('funnel')}
          className={`whitespace-nowrap py-1 ${activeTab === 'funnel' ? 'text-amber-400 font-semibold' : ''}`}
        >
          Funnel Flow
        </button>
        <button
          onClick={() => onTabChange('dashboard')}
          className={`whitespace-nowrap py-1 ${activeTab === 'dashboard' ? 'text-amber-400 font-semibold' : ''}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onTabChange('prosperity-kit')}
          className={`whitespace-nowrap py-1 ${activeTab === 'prosperity-kit' ? 'text-amber-400 font-semibold' : ''}`}
        >
          Prosperity Kit
        </button>
        <button
          onClick={() => onTabChange('remediation')}
          className={`whitespace-nowrap py-1 ${activeTab === 'remediation' ? 'text-amber-400 font-semibold' : ''}`}
        >
          Remedies
        </button>
        <button
          onClick={() => onTabChange('ambient-games')}
          className={`whitespace-nowrap py-1 ${activeTab === 'ambient-games' ? 'text-amber-400 font-semibold' : ''}`}
        >
          Aarti & Housie
        </button>
        <button
          onClick={() => onTabChange('devops-uat')}
          className={`whitespace-nowrap py-1 ${activeTab === 'devops-uat' ? 'text-amber-400 font-semibold' : ''}`}
        >
          DevOps & Tests
        </button>
      </div>
    </header>
  );
};
