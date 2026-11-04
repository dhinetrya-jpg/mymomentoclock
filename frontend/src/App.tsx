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
import { evaluateRemedialVectors, RvmEvaluationResult } from './engine/rvmEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('funnel');
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isBtrModalOpen, setIsBtrModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Initialize with baseline Kolkata birth profile (from Part 1 of specification)
  const [chart, setChart] = useState<ChartCalculationResult>(() =>
    calculateFullChart('1989-11-23', '04:30:00', 22.5726, 88.3639, 'Kolkata', 5.5, AyanamsaType.TRUE_LAHIRI)
  );

  const [resolution, setResolution] = useState<ConflictResolutionResult>(() =>
    resolvePillarConflict(chart, 'Wealth')
  );

  const [rvmResult, setRvmResult] = useState<RvmEvaluationResult>(() =>
    evaluateRemedialVectors(resolution.netAuspiciousnessVector, 'Wealth', 'SATURN')
  );

  const handleUpdateChart = (newChart: ChartCalculationResult) => {
    setChart(newChart);
    const newResolution = resolvePillarConflict(newChart, 'Wealth');
    setResolution(newResolution);
    setRvmResult(evaluateRemedialVectors(newResolution.netAuspiciousnessVector, 'Wealth', 'SATURN'));
  };

  const handleRecalculateFromWizard = (params: {
    birthDate: string;
    birthTime: string;
    latitude: number;
    longitude: number;
    cityName: string;
    ayanamsaType: AyanamsaType;
  }) => {
    const newChart = calculateFullChart(
      params.birthDate,
      params.birthTime,
      params.latitude,
      params.longitude,
      params.cityName,
      5.5,
      params.ayanamsaType
    );
    handleUpdateChart(newChart);
    setIsOnboardingOpen(false);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#140407] text-[#f5e6ea] flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* 1. Universal Top Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsOnboardingOpen(false);
        }}
        onOpenQuickCheckout={() => setIsCheckoutModalOpen(true)}
      />

      {/* Profile quick bar */}
      <div className="border-b border-rose-950/60 bg-[#1a050a] px-4 py-2 text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-rose-200/70">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-mono font-medium">Native Profile:</span>
            <span>{chart.inputProfile.cityName}</span>
            <span aria-hidden="true">·</span>
            <span>Lagna: <strong className="text-rose-100">{chart.ascendantSignName}</strong></span>
            <span aria-hidden="true">·</span>
            <span>A_net: <strong className="text-amber-300 font-mono">{(resolution.netAuspiciousnessVector * 100).toFixed(1)}%</strong></span>
          </div>

          <button
            onClick={() => setIsOnboardingOpen(!isOnboardingOpen)}
            className="text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            {isOnboardingOpen ? 'Close Editor' : 'Edit Birth Details'}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
        {activeTab === 'funnel' && (
          <ConversionFunnelView
            onNavigateToFullApp={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'dashboard' && (
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

        {activeTab === 'remediation' && (
          <RemediationView rvmResult={rvmResult} />
        )}

        {activeTab === 'ambient-games' && (
          <div className="space-y-10">
            <LivingRoomTvDashboard />
            <FamilyGameNight />
          </div>
        )}

        {activeTab === 'devops-uat' && (
          <UatAndStressSuite />
        )}
      </main>

      {/* Modals */}
      <ConflictResolverModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        resolution={resolution}
      />

      <BtrModal
        isOpen={isBtrModalOpen}
        onClose={() => setIsBtrModalOpen(false)}
        chart={chart}
        onApplyRectifiedChart={handleUpdateChart}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-16 border-t border-rose-950/70 bg-[#100306] py-8 text-rose-300/50 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-semibold text-rose-200/80">MymomentOclock Platform</span>
            <span>·</span>
            <span>Diwali 2026 & Samvat 2083 Suite</span>
          </div>

          <div className="text-center sm:text-right text-[11px] space-y-1">
            <p>Calculated via True Lahiri Sidereal Ephemeris & Symbolic Graph Reasoning.</p>
            <p className="text-rose-400/40">
              Guidance provided for cultural enrichment and mindful reflection under DPDP Act compliance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
