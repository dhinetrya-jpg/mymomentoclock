/**
 * @license
 * MIT License
 *
 * MymomentOclock Production Application Root
 */

import { useEffect, useMemo, useState } from 'react';
import { Navigation, ActiveTab } from './components/Navigation';
import { AuspiciousMasterHub } from './components/AuspiciousMasterHub';
import { DailyTiming } from './components/DailyTiming';
import { OnboardingWizard, BirthFormSubmission } from './components/OnboardingWizard';
import { DashboardView } from './components/DashboardView';
import { BirthTimeExplorer } from './components/BirthTimeExplorer';
import { DiwaliProsperityKit } from './components/DiwaliProsperityKit';
import { LivingRoomTvDashboard } from './components/LivingRoomTvDashboard';
import { BtrModal } from './components/BtrModal';
import { ConflictResolverModal } from './components/ConflictResolverModal';
import { CheckoutModal } from './components/CheckoutModal';
import { PwaStatus } from './pwa/PwaStatus';
import { ChartCalculationResult, calculateFullChart } from './engine/astroMath';
import { resolvePillarConflict } from './engine/conflictResolver';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('auspicious-hub');
  const [natalChart, setNatalChart] = useState<ChartCalculationResult | null>(null);
  const [lastBirthInput, setLastBirthInput] = useState<BirthFormSubmission | undefined>(undefined);
  const [showBirthForm, setShowBirthForm] = useState<boolean>(true);
  const [isBtrOpen, setIsBtrOpen] = useState<boolean>(false);
  const [isConflictOpen, setIsConflictOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  // Reset scroll position above sticky header when switching tabs or opening/closing the birth form
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [activeTab, showBirthForm]);

  const conflictResolution = useMemo(
    () => (natalChart ? resolvePillarConflict(natalChart, 'Wealth') : null),
    [natalChart]
  );

  const handleEditBirthDetails = () => {
    setShowBirthForm(true);
    setActiveTab('natal-chart');
  };

  const handleCalculateBirthChart = async (params: BirthFormSubmission) => {
    setLastBirthInput(params);
    const payload = {
      birthDate: params.birthDate,
      birthTime: params.birthTime,
      latitude: params.latitude,
      longitude: params.longitude,
      cityName: params.cityName,
      ayanamsaType: params.ayanamsaType,
      timezoneOffset: params.timezoneOffset,
      timezone: params.timezone,
      birthTimeCertainty: params.certainty,
    };

    try {
      const resp = await fetch('/api/astro/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        const serverChart = (await resp.json()) as ChartCalculationResult;
        if (serverChart && Array.isArray(serverChart.planets) && serverChart.systemMetadata) {
          setNatalChart(serverChart);
          setShowBirthForm(false);
          return;
        }
      }
    } catch {
      // Offline / static bundle fallback
    }

    const localChart = calculateFullChart(
      params.birthDate,
      params.birthTime,
      params.latitude,
      params.longitude,
      params.cityName,
      params.timezoneOffset,
      params.ayanamsaType,
      params.timezone
    );
    setNatalChart(localChart);
    setShowBirthForm(false);
  };

  return (
    <div className="min-h-screen scroll-pt-28 bg-[#0d0206] text-rose-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-xs focus:font-bold text-neutral-950"
      >
        Skip to main content
      </a>

      {/* Sticky Top Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onEditBirthDetails={handleEditBirthDetails}
      />

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-6 lg:px-8 scroll-mt-28 focus:outline-none">
        {activeTab === 'daily-timing' ? (
          <DailyTiming />
        ) : activeTab === 'birth-explorer' ? (
          <BirthTimeExplorer />
        ) : activeTab === 'prosperity-kit' ? (
          <DiwaliProsperityKit
            chart={natalChart}
            onOpenQuickCheckout={() => setIsCheckoutOpen(true)}
          />
        ) : activeTab === 'living-room' ? (
          <LivingRoomTvDashboard />
        ) : activeTab === 'natal-chart' ? (
          showBirthForm || !natalChart ? (
            <div className="space-y-4">
              {!natalChart && (
                <p role="status" className="text-center text-xs font-mono text-rose-300/80">
                  No birth profile supplied · Enter recorded birth details below to compute an unvalidated chart preview.
                </p>
              )}
              <OnboardingWizard
                onCalculate={handleCalculateBirthChart}
                onOpenQuickFestival={() => setActiveTab('prosperity-kit')}
                initialValues={lastBirthInput}
                onCancel={natalChart ? () => setShowBirthForm(false) : undefined}
              />
            </div>
          ) : (
            <DashboardView
              chart={natalChart}
              resolution={conflictResolution!}
              onOpenConflictModal={() => setIsConflictOpen(true)}
              onOpenBtrModal={() => setIsBtrOpen(true)}
              onNavigateToProsperityKit={() => setActiveTab('prosperity-kit')}
            />
          )
        ) : (
          <AuspiciousMasterHub
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </main>

      {natalChart && conflictResolution && (
        <>
          <BtrModal
            isOpen={isBtrOpen}
            onClose={() => setIsBtrOpen(false)}
            chart={natalChart}
            onApplyRectifiedChart={(updated) => setNatalChart(updated)}
          />
          <ConflictResolverModal
            isOpen={isConflictOpen}
            onClose={() => setIsConflictOpen(false)}
            resolution={conflictResolution}
          />
        </>
      )}

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />

      {/* Production Footer */}
      <footer className="mt-16 border-t border-rose-950/70 bg-[#0a0204] py-8 text-rose-300/60 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-center sm:text-left">
              <span className="font-serif text-sm font-bold text-amber-300">MymomentOclock Platform</span>
              <span>·</span>
              <span>Fail-Closed Production Gate</span>
              <span>·</span>
              <span className="text-rose-300 font-mono">release_authorized: false</span>
            </div>

            <div className="text-center sm:text-right text-[11px] space-y-0.5 text-rose-400/70">
              <p>Personalized timing guidance is withheld by default until CORE-P0-01 Swiss/JPL ephemeris &amp; rule sign-off.</p>
              <p>Authoritative backend (/api/v1/timing/daily) reports HTTP 503 CORE_P0_01_NOT_VERIFIED (0 windows).</p>
            </div>
          </div>
          <PwaStatus />
        </div>
      </footer>
    </div>
  );
}
