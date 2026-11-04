/**
 * Targeted Blocker Remediation Screen (RVM Action Engine)
 * Surfaces non-commercial acoustic and behavioral habits when performance scores dip.
 * Features:
 * - Interactive countdown timer for daily focus windows
 * - Real-time HTML5 Web Audio Synthesizer for pure 147Hz, 432Hz, 528Hz resonant frequencies
 * - Checklist for behavioral wealth & vitality micro-habits
 */

import React, { useState, useEffect, useRef } from 'react';
import { RvmEvaluationResult, RemedialAction, AcousticToneSynthesizer } from '../engine/rvmEngine';

interface RemediationViewProps {
  rvmResult: RvmEvaluationResult;
}

export const RemediationView: React.FC<RemediationViewProps> = ({ rvmResult }) => {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [activeTimerAction, setActiveTimerAction] = useState<RemedialAction | null>(rvmResult.actions[0] || null);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(11 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeAcousticPlaying, setActiveAcousticPlaying] = useState<number | null>(null);

  const synthRef = useRef<AcousticToneSynthesizer | null>(null);

  useEffect(() => {
    synthRef.current = new AcousticToneSynthesizer();
    return () => {
      synthRef.current?.stopTone();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0) {
      setIsTimerRunning(false);
      synthRef.current?.stopTone();
      setActiveAcousticPlaying(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSecondsLeft]);

  const toggleTask = (id: string) => {
    setCompletedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectActionTimer = (action: RemedialAction) => {
    setActiveTimerAction(action);
    setTimerSecondsLeft(action.durationMinutes * 60);
    setIsTimerRunning(false);
    if (activeAcousticPlaying) {
      synthRef.current?.stopTone();
      setActiveAcousticPlaying(null);
    }
  };

  const toggleTone = (freqHz?: number) => {
    if (!freqHz) return;
    if (activeAcousticPlaying === freqHz) {
      synthRef.current?.stopTone();
      setActiveAcousticPlaying(null);
    } else {
      synthRef.current?.startTone(freqHz, 0.25);
      setActiveAcousticPlaying(freqHz);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="rounded-xl border border-rose-950/70 bg-[#1c050b] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-neutral-100">
                Remedial Vector Matrix (RVM) Action Engine
              </h1>
              <span className="text-xs text-rose-300/60">·</span>
              <span className="text-xs text-amber-400 font-mono">Chozhia Prasanam Protocol</span>
            </div>
            <p className="mt-1.5 text-xs text-rose-200/70 max-w-2xl">
              Targeted behavioral and acoustic adjustments calibrated to resolve planetary friction.
              Strictly non-commercial: Zero gemstone sales, zero merchandise upselling.
            </p>
          </div>

          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-2.5 text-right shrink-0">
            <div className="text-[11px] text-rose-300/60">Target Deficit Planet</div>
            <div className="font-mono text-base font-bold text-amber-300">
              {rvmResult.targetPlanet} ({(rvmResult.deficiencyIntensity * 100).toFixed(1)}% Strain)
            </div>
          </div>
        </div>

        {/* Non-Commercial Guarantee Notice */}
        <div className="mt-4 rounded-lg bg-emerald-950/30 border border-emerald-800/40 px-3.5 py-2 text-xs text-emerald-300 flex items-center gap-2">
          <span>✓</span>
          <span>{rvmResult.sanitizationCheck.zeroMonetizationGuarantee}</span>
        </div>
      </div>

      {/* Main Grid: Interactive Focus Timer & Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Timer & Acoustic Tone Player */}
        <div className="lg:col-span-5 rounded-xl border border-rose-950/70 bg-[#22070e] p-6 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-200/70">Daily Focus Window Timer</span>
              <span className="font-mono text-xs text-amber-400">
                {activeTimerAction?.planetTarget} HORA
              </span>
            </div>

            <div className="mt-6 text-center">
              <div className="font-serif text-base font-semibold text-rose-100">
                {activeTimerAction?.title}
              </div>
              <div className="mt-1 text-xs text-rose-300/60">
                Recommended Window: {activeTimerAction?.dailyWindow}
              </div>

              {/* Big Digital Countdown */}
              <div className="my-8 font-mono text-5xl sm:text-6xl font-bold tracking-tight text-amber-300 tabular-nums">
                {formatTimer(timerSecondsLeft)}
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="rounded-lg bg-amber-500 px-6 py-2.5 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-950/40"
                >
                  {isTimerRunning ? 'Pause Timer' : 'Start Focus Window'}
                </button>
                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSecondsLeft((activeTimerAction?.durationMinutes || 11) * 60);
                  }}
                  className="rounded-lg border border-rose-900/60 bg-[#2a0812] px-4 py-2.5 text-xs font-medium text-rose-200 hover:bg-[#360b18] transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Web Audio Synthesizer Controls */}
          {activeTimerAction?.frequencyHz && (
            <div className="mt-8 rounded-lg border border-rose-950/60 bg-[#160408] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-rose-100">
                    Acoustic Resonance Synthesizer
                  </div>
                  <div className="text-[11px] text-rose-300/60 mt-0.5">
                    Generates pure {activeTimerAction.frequencyHz}Hz continuous sine tone via Web Audio API
                  </div>
                </div>

                <button
                  onClick={() => toggleTone(activeTimerAction.frequencyHz)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                    activeAcousticPlaying === activeTimerAction.frequencyHz
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/50 animate-pulse'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {activeAcousticPlaying === activeTimerAction.frequencyHz
                    ? 'Stop Tone'
                    : `Play ${activeTimerAction.frequencyHz}Hz Tone`}
                </button>
              </div>

              {activeAcousticPlaying && (
                <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Acoustic resonance currently active. Use earphones for optimal bone conduction grounding.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Remedial Protocol Checklist */}
        <div className="lg:col-span-7 rounded-xl border border-rose-950/70 bg-[#22070e] p-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-rose-950/60 pb-3">
            <div>
              <h2 className="font-serif text-base font-semibold text-neutral-100">
                Actionable Remedial Directives
              </h2>
              <p className="text-xs text-rose-300/60 mt-0.5">
                Execute these targeted micro-tasks to balance planetary energy deficits
              </p>
            </div>
            <span className="text-xs text-rose-300/60">
              {Object.values(completedTasks).filter(Boolean).length} / {rvmResult.actions.length} Completed
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {rvmResult.actions.map(action => {
              const isDone = completedTasks[action.id] || false;
              const isSelected = activeTimerAction?.id === action.id;

              return (
                <div
                  key={action.id}
                  className={`rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-amber-500/50 bg-[#2f0b15]'
                      : 'border-rose-950/60 bg-[#1c050b] hover:border-rose-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTask(action.id)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          isDone
                            ? 'border-emerald-500 bg-emerald-500 text-neutral-950 font-bold'
                            : 'border-rose-900/60 bg-[#280812] hover:border-amber-500'
                        }`}
                      >
                        {isDone && '✓'}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isDone ? 'line-through text-rose-400/40' : 'text-rose-100'}`}>
                            {action.title}
                          </span>
                          <span className="text-xs text-rose-400/60 font-mono">[{action.modality}]</span>
                        </div>
                        <p className="mt-1 text-xs text-rose-100/90 leading-relaxed">
                          {action.directive}
                        </p>
                        <p className="mt-1 text-[11px] text-rose-300/50 italic">
                          Rationale: {action.scientificContext}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => selectActionTimer(action)}
                        className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          isSelected
                            ? 'bg-amber-400 text-neutral-950 font-semibold'
                            : 'bg-[#2a0812] text-rose-200 hover:bg-[#380d19]'
                        }`}
                      >
                        {isSelected ? 'Active Timer' : `${action.durationMinutes}m Window`}
                      </button>

                      {action.frequencyHz && (
                        <button
                          onClick={() => toggleTone(action.frequencyHz)}
                          className="text-[11px] font-mono text-emerald-400 hover:underline"
                        >
                          {activeAcousticPlaying === action.frequencyHz ? '■ Stop Hz' : `▶ ${action.frequencyHz}Hz`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
