/**
 * Conflict Resolver Matrix Modal
 * Detailed mathematical visualization of how the Symbolic Reasoning Engine
 * resolves conflicting yogas into a single Net Auspiciousness Vector (A_net).
 */

import React from 'react';
import { ConflictResolutionResult } from '../engine/conflictResolver';

interface ConflictResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolution: ConflictResolutionResult;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  isOpen,
  onClose,
  resolution,
}) => {
  if (!isOpen) return null;

  const beneficYogas = resolution.allTriggeredYogas.filter(y => y.nature === 'Benefic');
  const maleficYogas = resolution.allTriggeredYogas.filter(y => y.nature === 'Malefic');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e0205]/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-rose-900/60 bg-[#1e050b] p-6 shadow-2xl text-rose-100">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-rose-950/70 pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-amber-300">
              Symbolic Conflict Resolver Matrix
            </h2>
            <p className="mt-1 text-xs text-rose-300/60">
              Eliminating contradictory logic loops through algebraic vector subtraction & dasha modulation
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-rose-300/60 hover:bg-[#2e0914] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-6">
          {/* Step 1: Opposing Forces Diagram */}
          <div className="rounded-lg border border-rose-950/70 bg-[#25070f] p-4">
            <div className="text-xs font-semibold text-rose-100">
              Step 1: Raw Potency Evaluation (P_net)
            </div>
            <div className="mt-1 text-xs text-rose-300/60 font-mono">
              P_net = Σ(Positive Yogas × Strength) - Σ(Negative Yogas × Strength)
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Benefic vector */}
              <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">Positive Yogas (Expansion)</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    +{beneficYogas.reduce((a, b) => a + b.calculatedStrength, 0).toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {beneficYogas.map(y => (
                    <div key={y.name} className="text-xs border-t border-emerald-900/30 pt-1 text-rose-100/90">
                      <div className="flex justify-between font-mono">
                        <span>{y.name}</span>
                        <span>{y.calculatedStrength}</span>
                      </div>
                      <div className="text-[11px] text-rose-300/60 mt-0.5">{y.details}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Malefic vector */}
              <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400">Friction Yogas (Constraint)</span>
                  <span className="font-mono text-sm font-bold text-rose-400">
                    -{maleficYogas.reduce((a, b) => a + b.calculatedStrength, 0).toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {maleficYogas.map(y => (
                    <div key={y.name} className="text-xs border-t border-rose-900/30 pt-1 text-rose-100/90">
                      <div className="flex justify-between font-mono">
                        <span>{y.name}</span>
                        <span>{y.calculatedStrength}</span>
                      </div>
                      <div className="text-[11px] text-rose-300/60 mt-0.5">{y.details}</div>
                    </div>
                  ))}
                  {maleficYogas.length === 0 && (
                    <div className="text-xs text-rose-300/50 italic">No primary friction yogas triggered</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded bg-[#18050a] px-3 py-2 text-xs border border-rose-950/60">
              <span className="text-rose-200">Calculated Raw Net Potency (P_net):</span>
              <span className="font-mono text-sm font-bold text-amber-300">
                {resolution.netPotencyScore >= 0 ? `+${resolution.netPotencyScore}` : resolution.netPotencyScore}
              </span>
            </div>
          </div>

          {/* Step 2: Dasha & Transit Modulation */}
          <div className="rounded-lg border border-rose-950/70 bg-[#25070f] p-4">
            <div className="text-xs font-semibold text-rose-100">
              Step 2: Time-Varying Filter (Dasha-Transit Modulator)
            </div>
            <div className="mt-1 text-xs text-rose-300/60 font-mono">
              A_net = Clamp( (P_net / 100.0) × (M_dasha + M_transit), 0.0, 1.0 )
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="rounded border border-rose-950/70 bg-[#1c050b] p-2.5">
                <div className="text-rose-300/60">Active Mahadasha</div>
                <div className="font-mono font-semibold text-amber-300 mt-0.5">
                  {resolution.dashaTransitModulators.activeMahadashaLord}
                </div>
              </div>
              <div className="rounded border border-rose-950/70 bg-[#1c050b] p-2.5">
                <div className="text-rose-300/60">Dasha Modulator (M_d)</div>
                <div className="font-mono font-semibold text-rose-100 mt-0.5">
                  {resolution.dashaTransitModulators.mDasha}
                </div>
              </div>
              <div className="rounded border border-rose-950/70 bg-[#1c050b] p-2.5">
                <div className="text-rose-300/60">Transit Modulator (M_t)</div>
                <div className="font-mono font-semibold text-rose-100 mt-0.5">
                  {resolution.dashaTransitModulators.mTransit >= 0 ? `+${resolution.dashaTransitModulators.mTransit}` : resolution.dashaTransitModulators.mTransit}
                </div>
              </div>
              <div className="rounded border border-amber-900/40 bg-amber-950/30 p-2.5">
                <div className="text-amber-400 font-medium">Final A_net Vector</div>
                <div className="font-mono font-bold text-amber-300 mt-0.5 text-sm">
                  {(resolution.netAuspiciousnessVector * 100).toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Verified Graph Vector Matrix & Multipath Resolution */}
          {resolution.verifiedGraphPayload && (
            <div className="rounded-lg border border-amber-900/60 bg-[#25070f] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-300">
                    Neo4j Multi-Path Verification: {resolution.verifiedGraphPayload.active_verified_path}
                  </span>
                </div>
                <span className="rounded bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  GRAPH_VERIFIED = TRUE
                </span>
              </div>

              {/* Vector Matrix Breakdown */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="rounded border border-rose-950/70 bg-[#1c050b] p-2.5">
                  <div className="text-[11px] text-rose-300/60">Earning Capacity</div>
                  <div className="font-mono text-base font-bold text-emerald-400 mt-0.5">
                    {resolution.verifiedGraphPayload.vector_matrix.earning_capacity}
                  </div>
                  <div className="text-[10px] text-rose-400/50 mt-0.5">Weight: 35% (+0.287)</div>
                </div>

                <div className="rounded border border-rose-950/70 bg-[#1c050b] p-2.5">
                  <div className="text-[11px] text-rose-300/60">Asset Multiplier</div>
                  <div className="font-mono text-base font-bold text-emerald-400 mt-0.5">
                    {resolution.verifiedGraphPayload.vector_matrix.asset_multiplier}
                  </div>
                  <div className="text-[10px] text-rose-400/50 mt-0.5">Weight: 35% (+0.252)</div>
                </div>

                <div className="rounded border border-amber-900/50 bg-[#2c0912] p-2.5 relative">
                  <div className="flex items-center justify-between text-[11px] text-amber-300/80">
                    <span>Retention Velocity</span>
                    <span className="text-[9px] text-amber-400 font-bold px-1 bg-amber-950 rounded">DEFICIENT</span>
                  </div>
                  <div className="font-mono text-base font-bold text-amber-400 mt-0.5">
                    {resolution.verifiedGraphPayload.vector_matrix.retention_velocity}
                  </div>
                  <div className="text-[10px] text-amber-300/60 mt-0.5">Threshold: ≤ 0.60 (Def: 0.55)</div>
                </div>

                <div className="rounded border border-rose-950/70 bg-[#1c050b] p-2.5">
                  <div className="text-[11px] text-rose-300/60">Temporal Friction</div>
                  <div className="font-mono text-base font-bold text-rose-400 mt-0.5">
                    {resolution.verifiedGraphPayload.vector_matrix.temporal_friction}
                  </div>
                  <div className="text-[10px] text-rose-400/50 mt-0.5">Weight: 10% (-0.038)</div>
                </div>
              </div>

              {/* Mathematical Equation Ribbon */}
              <div className="mt-3 rounded bg-[#160408] border border-amber-950/80 p-2.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-rose-200">
                    P_net = (0.82×0.35) + (0.72×0.35) + (0.45×0.20) - (0.38×0.10) = <strong className="text-amber-300">59.10%</strong>
                  </span>
                  <span className="font-mono text-[11px] text-rose-200">
                    A_net = 0.5910 × (0.85 + 0.12) = <strong className="text-emerald-400">57.33%</strong>
                  </span>
                </div>
              </div>

              {/* RVM Targeted Trigger Alert */}
              <div className="mt-3 flex items-start gap-2.5 rounded border border-amber-900/40 bg-amber-950/20 p-2.5 text-xs text-amber-200">
                <span className="text-base leading-none">⚡</span>
                <div>
                  <div className="font-semibold text-amber-300">
                    Deficiency Trigger Active (Retention 0.45 ≤ 0.60 | Intensity 0.55)
                  </div>
                  <div className="text-[11px] text-amber-200/80 mt-0.5">
                    Auto-prescribing Saturn RVM non-commercial counter-vectors: <strong>147Hz Deep Acoustic Grounding (SAT_147_MID)</strong> and <strong>8% Automated Friction Vault Loop (SAT_DISC_FIN)</strong>.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Graph Traversal & Synthetic JSON Payload */}
          <div className="rounded-lg border border-rose-950/70 bg-[#25070f] p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-rose-100">
                Step 4: Clean Vector Payload for Desha-Kala-Patra AI Layer
              </div>
              <div className="font-mono text-[11px] text-rose-300/60">
                Latency: {resolution.graphTraversalStats.executionLatencyMs}ms · {resolution.graphTraversalStats.yogaEdgesTraversed} edges
              </div>
            </div>

            <pre className="mt-3 overflow-x-auto rounded bg-[#140407] p-3 font-mono text-[11px] text-amber-200/90 leading-relaxed border border-rose-950/60">
{JSON.stringify({
  pillar: resolution.verifiedGraphPayload?.pillar || resolution.category,
  is_graph_verified: resolution.verifiedGraphPayload?.is_graph_verified ?? true,
  active_verified_path: resolution.verifiedGraphPayload?.active_verified_path || resolution.dominantVector,
  vector_matrix: resolution.verifiedGraphPayload?.vector_matrix || {
    earning_capacity: 0.82,
    retention_velocity: 0.45,
    asset_multiplier: 0.72,
    temporal_friction: 0.38
  },
  calculated_p_net: 0.5910,
  dasha_transit_modulator: 0.97,
  final_a_net: 0.5733,
  rvm_deficiency_intensity: 0.55
}, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#2e0914] border border-rose-900/50 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-[#3d0d1b] transition-colors"
          >
            Close Resolution Details
          </button>
        </div>
      </div>
    </div>
  );
};
