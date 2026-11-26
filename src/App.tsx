import {DailyTiming} from './components/DailyTiming';
import {LocationTiming} from './components/LocationTiming';
import {BirthTimeExplorer} from './components/BirthTimeExplorer';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navigation, ActiveTab } from './components/Navigation';
import { ConversionFunnelView } from './components/ConversionFunnelView';
import { DashboardView } from './components/DashboardView';
import { DiwaliProsperityKit } from './components/DiwaliProsperityKit';
import { RemediationView } from './components/RemediationView';
import { LivingRoomTvDashboard } from './components/LivingRoomTvDashboard';
import { FamilyGameNight } from './components/FamilyGameNight';
import { UatAndStressSuite } from './components/UatAndStressSuite';
import { ConflictResolverModal } from './components/ConflictResolverModal';
import { BtrModal } from './components/BtrModal';
import { CheckoutModal } from './components/CheckoutModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { calculateFullChart, AyanamsaType, ChartCalculationResult } from './engine/astroMath';
import { resolvePillarConflict, ConflictResolutionResult } from './engine/conflictResolver';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily-timing');
  const [personalTiming, setPersonalTiming] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isBtrModalOpen, setIsBtrModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const [chart, setChart] = useState<ChartCalculationResult | null>(null);
  const [resolution, setResolution] = useState<ConflictResolutionResult | null>(null);

  const handleUpdateChart = (newChart: ChartCalculationResult) => {
    setChart(newChart);
    const newResolution = resolvePillarConflict(newChart, 'Wealth');
    setResolution(newResolution);
  };

  const handleRecalculateFromWizard = (params: {
    birthDate: string;
    birthTime: string;
    latitude: number;
    longitude: number;
    cityName: string;
    ayanamsaType: AyanamsaType;
    timezoneOffset: number;
  }) => {
    const newChart = calculateFullChart(
      params.birthDate,
      params.birthTime,
      params.latitude,
      params.longitude,
      params.cityName,
      params.timezoneOffset,
      params.ayanamsaType
    );
    handleUpdateChart(newChart);
    setIsOnboardingOpen(false);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#140407] text-[#f5e6ea] flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-amber-300 focus:p-3 focus:text-neutral-950">Skip to main content</a>
      {/* 1. Universal Top Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'daily-timing') setPersonalTiming(false);
          setIsOnboardingOpen(false);
        }}
        onOpenQuickCheckout={() => setIsCheckoutModalOpen(true)}
      />

      {/* Profile quick bar */}
      {activeTab !== 'daily-timing' && <div className="border-b border-rose-950/60 bg-[#1a050a] px-4 py-2 text-xs">
        <div className="mx-auto flex min-w-0 max-w-7xl flex-wrap items-center justify-between gap-3 text-rose-200/70">
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <span className="text-amber-400 font-mono font-medium">Native Profile:</span>
            <span>{chart?.inputProfile.cityName || "No birth profile supplied"}</span>
            <span aria-hidden="true">·</span>
            <span>Lagna: <strong className="text-rose-100">{chart?.ascendantSignName || 'Unavailable'}</strong></span>
            <span aria-hidden="true">·</span>
            <span>A_net: <strong className="text-amber-300 font-mono">{'Unavailable'}</strong></span>
          </div>

          <button
            onClick={() => setIsOnboardingOpen(!isOnboardingOpen)}
            className="text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            {isOnboardingOpen ? 'Close Editor' : 'Edit Birth Details'}
          </button>
        </div>
      </div>}

      {!import.meta.env?.DEV && ['funnel','devops-uat'].includes(activeTab) && <p role="status" className="p-5 text-amber-200">This demonstration is not available in production. Use Birth Details or Festival Kit to continue.</p>}
      {/* Main Container */}
      <main id="main-content" tabIndex={-1} className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Onboarding Wizard (Collapsible or Triggered) */}
        {isOnboardingOpen ? (
          <div className="mb-8">
            <OnboardingWizard
              onCalculate={handleRecalculateFromWizard}
              onOpenQuickFestival={() => {
                setIsOnboardingOpen(false);
                setActiveTab('prosperity-kit');
              }}
            />
          </div>
        ) : null}

        {/* Dynamic View Routing */}
        {activeTab === 'daily-timing' && <div className="mx-auto max-w-3xl space-y-5">
          <button type="button" onClick={() => setPersonalTiming(!personalTiming)}
            className="rounded border border-rose-700 px-3 py-2 text-sm text-rose-100">
            {personalTiming ? 'Use location only' : 'Use personal timing'}
          </button>
          {personalTiming ? <DailyTiming/> : <LocationTiming/>}
        </div>}
        {activeTab === 'birth-time-explorer' && <BirthTimeExplorer/>}
        {!chart && activeTab === 'dashboard' && <div role="status" className="rounded-xl border border-rose-900 p-6">Enter your birth details to calculate a chart. <button className="text-amber-300 underline" onClick={() => setIsOnboardingOpen(true)}>Open birth profile</button></div>}
        {activeTab === 'funnel' && import.meta.env?.DEV && (
          <ConversionFunnelView
            onNavigateToFullApp={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'dashboard' && chart && resolution && (
          <DashboardView
            chart={chart}
            resolution={resolution}
            onOpenConflictModal={() => setIsConflictModalOpen(true)}
            onOpenBtrModal={() => setIsBtrModalOpen(true)}
            onNavigateToProsperityKit={() => setActiveTab('prosperity-kit')}
          />
        )}

        {activeTab === 'prosperity-kit' && (
          <DiwaliProsperityKit
            chart={chart}
            onOpenQuickCheckout={() => setIsCheckoutModalOpen(true)}
          />
        )}

        {activeTab === 'remediation' && <RemediationView />}

        {activeTab === 'ambient-games' && (
          <div className="space-y-10">
            <LivingRoomTvDashboard />
            <FamilyGameNight />
          </div>
        )}

        {activeTab === 'devops-uat' && import.meta.env?.DEV && (
          <UatAndStressSuite />
        )}
      </main>

      {/* Modals */}
      {resolution && <ConflictResolverModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        resolution={resolution}
      />}

      {chart && <BtrModal
        isOpen={isBtrModalOpen}
        onClose={() => setIsBtrModalOpen(false)}
        chart={chart}
        onApplyRectifiedChart={handleUpdateChart}
      />}

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-16 border-t border-rose-950/70 bg-[#100306] py-8 text-rose-300/50 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 text-center">
            <span className="font-serif text-sm font-semibold text-rose-200/80">MymomentOclock Platform</span>
            <span>·</span>
            <span>Astrology & city-local timing preview</span>
          </div>

          <div className="text-center sm:text-right text-[11px] space-y-1">
            <p>Analytical chart previews and cultural festival content.</p>
            <p className="text-rose-400/40">
              Guidance provided for cultural enrichment and mindful reflection without a predictive guarantee.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
