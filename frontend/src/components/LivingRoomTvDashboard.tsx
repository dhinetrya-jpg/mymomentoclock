/**
 * Living Room TV & Ambient Puja Dashboard (Component 3 from Prompt PDF)
 * A high-definition interactive digital backdrop designed to run on the living room TV
 * during Lakshmi Puja and family dinner.
 * Features:
 * - Dynamic virtual moving oil diyas
 * - Om Jai Lakshmi Mata Aarti synchronized lyrics marquee (Bilingual Hindi + English)
 * - Pure ambient sitar/tanpura harmonic meditation drone
 */

import React, { useState, useEffect, useRef } from 'react';
import { AARTI_VERSES, AartiVerse } from '../engine/diwaliData';

export const LivingRoomTvDashboard: React.FC = () => {
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isAmbientAudioActive, setIsAmbientAudioActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const droneNodesRef = useRef<OscillatorNode[]>([]);

  // Auto-advance aarti verses
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAutoPlay) {
      timer = setInterval(() => {
        setCurrentVerseIndex(prev => (prev + 1) % AARTI_VERSES.length);
      }, 14000); // 14 seconds per verse
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoPlay]);

  // Ambient Sitar / Tanpura Harmonic Drone Synthesizer
  const toggleAmbientDrone = () => {
    if (isAmbientAudioActive) {
      droneNodesRef.current.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      droneNodesRef.current = [];
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      setIsAmbientAudioActive(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        // Tanpura root frequencies (Sa-Pa drone: C# 138.6Hz, 207.6Hz, 277.2Hz)
        const freqs = [138.6, 207.65, 277.2, 415.3];
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 2.0);
        gain.connect(ctx.destination);

        const oscs: OscillatorNode[] = [];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          osc.connect(gain);
          osc.start();
          oscs.push(osc);
        });

        droneNodesRef.current = oscs;
        setIsAmbientAudioActive(true);
      } catch (e) {
        console.warn('Ambient audio could not initialize:', e);
      }
    }
  };

  const verse: AartiVerse = AARTI_VERSES[currentVerseIndex];

  return (
    <div className="relative min-h-[580px] rounded-2xl overflow-hidden border border-rose-950/70 bg-[#180408] shadow-2xl flex flex-col justify-between p-6 sm:p-10 animate-fade-in">
      {/* Background Altar Artwork */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/diwali_lakshmi_altar_1791900494902.jpg"
          alt="Diwali Sacred Altar"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center opacity-40 filter brightness-75 contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#140407] via-[#1a050a]/70 to-[#120306]/80" />
      </div>

      {/* Top Header / TV Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-rose-950/60 pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-amber-400">
            TV Ambient Mode · Living Room Cast
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-neutral-100">
            Shree Mahalakshmi Aarti & Sacred Sanctuary
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAmbientDrone}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              isAmbientAudioActive
                ? 'bg-amber-400 text-neutral-950 shadow-lg shadow-amber-950/60 animate-pulse'
                : 'border border-rose-900/60 bg-[#280812]/90 text-rose-100 hover:bg-[#380d1a]'
            }`}
          >
            {isAmbientAudioActive ? '■ Sitar Drone Active' : '▶ Play Ambient Sitar Drone'}
          </button>

          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              isAutoPlay
                ? 'bg-emerald-500 text-neutral-950'
                : 'border border-rose-900/60 bg-[#280812]/90 text-rose-100 hover:bg-[#380d1a]'
            }`}
          >
            {isAutoPlay ? 'Auto-Advancing Lyrics' : 'Auto-Scroll Aarti'}
          </button>
        </div>
      </div>

      {/* Center: Synchronized Lyrics Marquee */}
      <div className="relative z-10 my-8 flex flex-col items-center text-center max-w-3xl mx-auto space-y-4">
        <div className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-mono text-amber-300">
          Verse {currentVerseIndex + 1} of {AARTI_VERSES.length}
        </div>

        {/* Hindi Shloka */}
        <div className="font-serif text-2xl sm:text-4xl font-bold text-amber-200 leading-snug drop-shadow-md whitespace-pre-line">
          {verse.hindi}
        </div>

        {/* English Phonetic */}
        <div className="text-sm sm:text-base font-sans text-rose-100/90 italic whitespace-pre-line">
          {verse.english}
        </div>

        {/* Meaning in English */}
        <div className="text-xs sm:text-sm text-rose-200/70 max-w-xl leading-relaxed pt-2">
          &quot;{verse.meaning}&quot;
        </div>

        {/* Dancing Diyas Animation */}
        <div className="flex items-center gap-6 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className="h-4 w-3 rounded-full bg-amber-400 shadow-[0_0_15px_#f59e0b] animate-bounce"
                style={{ animationDuration: `${0.8 + (i * 0.15)}s`, animationDelay: `${i * 0.1}s` }}
              />
              <div className="h-2 w-6 rounded-b-full bg-amber-900 border border-amber-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Verse Navigation Strip */}
      <div className="relative z-10 flex items-center justify-between border-t border-rose-950/60 pt-4 text-xs">
        <button
          onClick={() => setCurrentVerseIndex(prev => (prev - 1 + AARTI_VERSES.length) % AARTI_VERSES.length)}
          className="rounded border border-rose-900/60 bg-[#280812] px-3 py-1.5 text-rose-100 hover:bg-[#380d1a] transition-colors"
        >
          ← Previous Verse
        </button>

        <div className="flex gap-1.5">
          {AARTI_VERSES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentVerseIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                currentVerseIndex === idx ? 'w-6 bg-amber-400' : 'w-2 bg-rose-900/80 hover:bg-rose-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentVerseIndex(prev => (prev + 1) % AARTI_VERSES.length)}
          className="rounded border border-rose-900/60 bg-[#280812] px-3 py-1.5 text-rose-100 hover:bg-[#380d1a] transition-colors"
        >
          Next Verse →
        </button>
      </div>
    </div>
  );
};
