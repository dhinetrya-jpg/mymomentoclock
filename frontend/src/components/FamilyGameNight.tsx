/**
 * Family Game Night Suite (Components 1 & 2 from Prompt PDF)
 * 1. Bollywood & Nostalgia Interactive Family Mega-Trivia
 * 2. Diwali Card Party Digital Tambola/Housie Engine with Cultural Audio Caller
 */

import React, { useState } from 'react';
import { HOUSIE_CALLS, TRIVIA_QUESTIONS, TriviaQuestion } from '../engine/diwaliData';

export const FamilyGameNight: React.FC = () => {
  const [activeGameTab, setActiveGameTab] = useState<'HOUSIE' | 'TRIVIA'>('HOUSIE');

  // Housie State
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [isCallingSpeech, setIsCallingSpeech] = useState(true);

  // Trivia State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [triviaFinished, setTriviaFinished] = useState(false);

  // Housie Generator / Caller
  const callNextNumber = () => {
    if (calledNumbers.length >= 90) return;
    const remaining = Array.from({ length: 90 }, (_, i) => i + 1).filter(n => !calledNumbers.includes(n));
    const randomNum = remaining[Math.floor(Math.random() * remaining.length)];

    setCurrentNumber(randomNum);
    setCalledNumbers(prev => [randomNum, ...prev]);

    // Speech synthesis announcement
    if (isCallingSpeech && 'speechSynthesis' in window) {
      try {
        const phrase = HOUSIE_CALLS[randomNum] || `Number ${randomNum}`;
        const utter = new SpeechSynthesisUtterance(`Number ${randomNum}. ${phrase}`);
        utter.rate = 0.95;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speech error
      }
    }
  };

  const resetHousie = () => {
    setCalledNumbers([]);
    setCurrentNumber(null);
  };

  // Trivia handler
  const handleSelectAnswer = (optionIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optionIdx);

    const q = TRIVIA_QUESTIONS[currentQuestionIdx];
    if (optionIdx === q.correctIndex) {
      setScore(prev => prev + 10);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    if (currentQuestionIdx + 1 < TRIVIA_QUESTIONS.length) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setTriviaFinished(true);
    }
  };

  const resetTrivia = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setScore(0);
    setTriviaFinished(false);
  };

  const currQ: TriviaQuestion = TRIVIA_QUESTIONS[currentQuestionIdx];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Game Mode Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-rose-950/70 bg-[#1c050b] p-5 shadow-lg">
        <div>
          <h1 className="font-serif text-xl font-bold text-neutral-100">
            Interactive Diwali Living Room Entertainment
          </h1>
          <p className="text-xs text-rose-300/60 mt-0.5">
            Zero-friction family entertainment bridging 10-year-olds with 75-year-old grandparents
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-rose-950/70 bg-[#250810] p-1 text-xs">
          <button
            onClick={() => setActiveGameTab('HOUSIE')}
            className={`rounded px-4 py-1.5 font-medium transition-colors ${
              activeGameTab === 'HOUSIE' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-rose-200/70'
            }`}
          >
            Digital Housie / Tambola Caller
          </button>
          <button
            onClick={() => setActiveGameTab('TRIVIA')}
            className={`rounded px-4 py-1.5 font-medium transition-colors ${
              activeGameTab === 'TRIVIA' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-rose-200/70'
            }`}
          >
            Bollywood & Nostalgia Trivia
          </button>
        </div>
      </div>

      {/* GAME 1: DIGITAL HOUSIE CALLER */}
      {activeGameTab === 'HOUSIE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Number Display & Draw Controls */}
          <div className="lg:col-span-5 rounded-xl border border-rose-950/70 bg-[#22070e] p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-rose-300/60">
                <span>Diwali Card Party Caller</span>
                <span className="font-mono text-amber-300">
                  {calledNumbers.length} / 90 Numbers Called
                </span>
              </div>

              {/* Big Number Circle */}
              <div className="my-8 flex flex-col items-center justify-center text-center">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-amber-400/80 bg-gradient-to-tr from-amber-600 to-yellow-400 text-neutral-950 shadow-2xl shadow-amber-950/60">
                  <span className="font-mono text-5xl font-black tabular-nums">
                    {currentNumber !== null ? currentNumber : '—'}
                  </span>
                </div>

                <div className="mt-4 font-serif text-lg font-bold text-amber-300 min-h-[3rem] px-2">
                  {currentNumber !== null ? HOUSIE_CALLS[currentNumber] : 'Ready to draw first number'}
                </div>
              </div>

              {/* Draw Controls */}
              <div className="space-y-3">
                <button
                  onClick={callNextNumber}
                  disabled={calledNumbers.length >= 90}
                  className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-neutral-950 hover:bg-amber-400 transition-colors disabled:opacity-50 shadow-lg shadow-amber-950/50"
                >
                  {calledNumbers.length >= 90 ? 'All 90 Numbers Called!' : 'Draw Next Number (बोलो नंबर!)'}
                </button>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 text-rose-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCallingSpeech}
                      onChange={(e) => setIsCallingSpeech(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>Speak Announcement (Audio Voice)</span>
                  </label>

                  <button
                    onClick={resetHousie}
                    className="text-rose-300/60 hover:text-rose-400 transition-colors"
                  >
                    Reset Board
                  </button>
                </div>
              </div>
            </div>

            {/* Printable Ticket Generator Preview */}
            <div className="mt-8 rounded-lg border border-rose-950/70 bg-[#160408] p-4 text-xs">
              <div className="font-semibold text-rose-100">Printable Housie Ticket Matrix</div>
              <p className="text-[11px] text-rose-300/60 mt-0.5">
                Each card generates unique 15-number grids ready to display on smartphone or print.
              </p>
              <div className="mt-3 grid grid-cols-9 gap-1 text-center font-mono text-[11px]">
                {[7, '', 24, '', 48, '', 62, '', 88].map((v, i) => (
                  <div key={i} className="h-6 rounded bg-[#280812] border border-rose-950/60 flex items-center justify-center font-bold text-amber-200">
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: 1-90 Numbers Grid */}
          <div className="lg:col-span-7 rounded-xl border border-rose-950/70 bg-[#22070e] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-rose-950/60 pb-3 mb-4">
              <span className="text-xs font-semibold text-rose-100">Called Numbers Board (1 - 90)</span>
              <span className="text-[11px] text-rose-300/50">Green = Called · Dark Maroon = Pending</span>
            </div>

            <div className="grid grid-cols-10 gap-1.5 text-center font-mono text-xs">
              {Array.from({ length: 90 }, (_, i) => i + 1).map(num => {
                const isCalled = calledNumbers.includes(num);
                const isLatest = currentNumber === num;

                return (
                  <div
                    key={num}
                    className={`h-8 rounded flex items-center justify-center font-semibold transition-all ${
                      isLatest
                        ? 'bg-amber-400 text-neutral-950 scale-110 shadow-lg shadow-amber-950/80 font-black ring-2 ring-white z-10'
                        : isCalled
                        ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold'
                        : 'bg-[#18050a] border border-rose-950/70 text-rose-300/40'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GAME 2: BOLLYWOOD & NOSTALGIA MEGA-TRIVIA */}
      {activeGameTab === 'TRIVIA' && (
        <div className="rounded-xl border border-rose-950/70 bg-[#22070e] p-6 sm:p-8 shadow-xl max-w-3xl mx-auto">
          {!triviaFinished ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-rose-950/60 pb-3">
                <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-300 font-mono">
                  Round: {currQ.round}
                </span>
                <span className="font-mono text-xs text-rose-200/80">
                  Question {currentQuestionIdx + 1} of {TRIVIA_QUESTIONS.length} · Score: {score} pts
                </span>
              </div>

              {/* Question */}
              <div className="font-serif text-lg sm:text-xl font-bold text-neutral-100 leading-snug">
                {currQ.question}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currQ.options.map((option, idx) => {
                  const isChosen = selectedOption === idx;
                  const isCorrect = idx === currQ.correctIndex;
                  const showResult = selectedOption !== null;

                  let btnStyle = 'border-rose-950/70 bg-[#1c050b] text-rose-100 hover:border-rose-800';
                  if (showResult) {
                    if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-semibold';
                    else if (isChosen) btnStyle = 'border-rose-500 bg-rose-950/40 text-rose-200';
                    else btnStyle = 'border-rose-950/40 bg-[#140407] text-rose-400/40';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={showResult}
                      className={`w-full text-left rounded-lg border p-3.5 text-xs sm:text-sm transition-all flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{option}</span>
                      {showResult && isCorrect && <span className="text-emerald-400 font-bold">✓ Correct</span>}
                      {showResult && isChosen && !isCorrect && <span className="text-rose-400 font-bold">✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Fun Fact reveal upon answer */}
              {selectedOption !== null && (
                <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 p-4 text-xs text-amber-200/90 leading-relaxed animate-fade-in">
                  <span className="font-bold">Intergenerational Fun Fact: </span>
                  {currQ.funFact}
                </div>
              )}

              {/* Next Button */}
              {selectedOption !== null && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNextQuestion}
                    className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors"
                  >
                    {currentQuestionIdx + 1 < TRIVIA_QUESTIONS.length ? 'Next Question →' : 'View Final Score'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="font-serif text-3xl font-bold text-amber-300">
                Trivia Complete!
              </div>
              <p className="text-rose-100 text-sm">
                You scored <span className="font-mono font-bold text-amber-400 text-xl">{score}</span> out of {TRIVIA_QUESTIONS.length * 10} points!
              </p>
              <p className="text-xs text-rose-300/70 max-w-md mx-auto leading-relaxed">
                Intergenerational laughter confirmed: Grandparents conquered the mythology, parents owned the 90s, and Gen-Z carried the tech!
              </p>
              <div className="pt-4">
                <button
                  onClick={resetTrivia}
                  className="rounded-lg bg-amber-500 px-6 py-2.5 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
