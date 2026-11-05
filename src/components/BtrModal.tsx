/**
 * Birth Time Rectification (BTR) Calibration Modal
 * Module 2: AI Lifecycle Milestone Calibrator
 * Runs candidate charts through a bounded search window using 15-second validation intervals
 * across ±15 minutes to find the birth time that best matches past life events.
 */

import React, { useState } from 'react';
import { executeBirthTimeRectification, LifeMilestone, RectificationResult } from '../engine/btrProcessor';
import { ChartCalculationResult } from '../engine/astroMath';

interface BtrModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: ChartCalculationResult;
  onApplyRectifiedChart: (rectifiedChart: ChartCalculationResult) => void;
}

export const BtrModal: React.FC<BtrModalProps> = ({
  isOpen,
  onClose,
  chart,
  onApplyRectifiedChart,
}) => {
  const [milestones, setMilestones] = useState<LifeMilestone[]>([]);
  const [btrResult, setBtrResult] = useState<RectificationResult | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<LifeMilestone['type']>('CAREER_PROMOTION');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRunCalibration = () => {
    setIsCalibrating(true);
    setTimeout(() => {
      try {
      const res = executeBirthTimeRectification(
        chart.inputProfile.birthDate,
        chart.inputProfile.birthTime,
        chart.inputProfile.latitude,
        chart.inputProfile.longitude,
        chart.inputProfile.cityName,
        milestones, 15, 15, chart.inputProfile.timezoneOffset, chart.systemMetadata.ayanamsaApplied
      );
      setBtrResult(res);
      } catch (e) { setError((e as Error).message); } finally { setIsCalibrating(false); }
    }, 500);
  };

  const handleApply = () => {
    if (btrResult) {
      onApplyRectifiedChart(btrResult.rectifiedChart);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e0205]/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-rose-900/60 bg-[#1e050b] p-6 shadow-2xl text-rose-100">
        <div className="flex items-start justify-between border-b border-rose-950/70 pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-amber-300">
              Janma Lagna Shodhana (Birth Time Rectification)
            </h2>
            <p className="mt-1 text-xs text-rose-300/60">
              Heuristic candidate search only; no independent birth-time or D-60 validation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-rose-300/60 hover:bg-[#2e0914] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Milestone Checkpoints */}
          <div className="rounded-lg border border-rose-950/70 bg-[#25070f] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-100">Actual Lifecycle Milestones Required</span>
              <span className="text-[11px] text-rose-300/60 font-mono">{milestones.length} supplied milestones</span>
            </div>

            <p className="mt-3">Add only events that actually occurred. No sample events are substituted. Fit scores are internal heuristics, not probabilities.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input aria-label="Milestone date" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-rose-950 p-2" />
              <select aria-label="Milestone type" value={eventType} onChange={e => setEventType(e.target.value as LifeMilestone['type'])} className="bg-rose-950 p-2">
                <option value="CAREER_PROMOTION">Career promotion</option><option value="MARRIAGE_UNION">Marriage</option><option value="RELOCATION_TRAVEL">Relocation</option><option value="HEALTH_PHYSICAL">Health event</option><option value="FINANCIAL_ACQUISITION">Asset acquisition</option>
              </select>
              <button disabled={!eventDate || milestones.length >= 100} onClick={() => { setMilestones([...milestones, {id: String(milestones.length), type: eventType, title: eventType, approxDate: eventDate, description: 'User supplied event', confidence: 'MEDIUM'}]); setBtrResult(null); }} className="text-amber-300">Add event</button>
            </div>
            {error && <p role="alert">{error}</p>}
            <div className="mt-3 space-y-2.5">
              {milestones.map((ms) => (
                <div key={ms.id} className="rounded border border-rose-950/70 bg-[#1c050b] p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-rose-100">{ms.title}</div>
                    <div className="text-[11px] text-rose-300/60 mt-0.5">{ms.description}</div>
                  </div>
                  <div className="flex items-center gap-3 font-mono shrink-0">
                    <span className="text-amber-300">{ms.approxDate}</span>
                    <span className="text-[10px] rounded bg-[#2e0914] px-2 py-0.5 text-rose-200">
                      {ms.confidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleRunCalibration}
                disabled={isCalibrating || milestones.length === 0}
                className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-md shadow-amber-950/40"
              >
                {isCalibrating ? 'Evaluating 120 Candidate Charts...' : 'Execute 15-Second Calibration Search'}
              </button>
            </div>
          </div>

          {/* Results Display */}
          {btrResult && (
            <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-5 text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-900/30 pb-3">
                <span className="font-serif font-bold text-emerald-300 text-sm">
                  Rectification Results & Concordance
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {(btrResult.concordanceRating * 100).toFixed(1)} / 100 internal fit
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded bg-[#160408] p-3 border border-rose-950/60">
                  <div className="text-rose-300/60 text-[11px]">Original Input Time</div>
                  <div className="font-mono text-base font-bold text-rose-100 mt-1">
                    {btrResult.originalInputTime}
                  </div>
                </div>
                <div className="rounded bg-[#160408] p-3 border border-rose-950/60">
                  <div className="text-emerald-400 text-[11px] font-semibold">Candidate Birth Time</div>
                  <div className="font-mono text-base font-bold text-amber-300 mt-1">
                    {btrResult.rectifiedTrueTime}
                  </div>
                </div>
                <div className="rounded bg-[#160408] p-3 border border-rose-950/60">
                  <div className="text-rose-300/60 text-[11px]">Clock Offset</div>
                  <div className="font-mono text-base font-bold text-rose-100 mt-1">
                    {btrResult.offsetSeconds >= 0 ? `+${btrResult.offsetSeconds}s` : `${btrResult.offsetSeconds}s`}
                  </div>
                </div>
              </div>

              <div className="rounded bg-[#140407] p-3 font-mono text-[11px] text-rose-100 leading-relaxed border border-rose-950/60">
                {btrResult.verificationSummary}
              </div>

              {/* Top candidates list */}
              <div>
                <div className="font-semibold text-rose-200 mb-2">Top Concordant Search Candidates:</div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {btrResult.topCandidates.map((c, i) => (
                    <div key={i} className="flex justify-between border-b border-rose-950/40 pb-1">
                      <span>Candidate {i + 1}: {c.testTimeStr} ({c.offsetSeconds >= 0 ? `+${c.offsetSeconds}s` : `${c.offsetSeconds}s`})</span>
                      <span className="text-emerald-400 font-bold">{(c.concordanceScore * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-rose-950/70 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#2e0914] border border-rose-900/50 px-4 py-2 text-xs font-medium text-rose-200 hover:bg-[#3d0d1b]"
          >
            Cancel
          </button>
          {btrResult && (
            <button
              onClick={handleApply}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/50"
            >
              Apply Candidate Time ({btrResult.rectifiedTrueTime})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
