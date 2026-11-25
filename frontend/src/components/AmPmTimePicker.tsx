/**
 * @license
 * MIT License
 *
 * 12-Hour AM/PM Time Selector & Observer-City Wall-Clock Synchronizer
 * - Crisp 12-Hour AM/PM primary display (`12:00 AM` midnight, `12:00 PM` noon)
 * - "🕒 Now" snaps to the SELECTED OBSERVER CITY'S current wall-clock minute
 */

import React, { useState } from 'react';

interface AmPmTimePickerProps {
  currentMinutes: number; // 0 to 1439
  onChangeMinutes: (mins: number) => void;
  timezoneLabel?: string;
  timezoneOffset?: number;
}

export const AmPmTimePicker: React.FC<AmPmTimePickerProps> = ({
  currentMinutes,
  onChangeMinutes,
  timezoneLabel = 'Local Time',
  timezoneOffset
}) => {
  const totalMins = Math.max(0, Math.min(1439, Math.floor(currentMinutes)));
  const hour24 = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;

  const isPm = hour24 >= 12;
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;

  const [isInteractive, setIsInteractive] = useState<boolean>(false);

  const handleSnapToNow = () => {
    const offsetHrs = typeof timezoneOffset === 'number' && Number.isFinite(timezoneOffset)
      ? timezoneOffset
      : -new Date().getTimezoneOffset() / 60.0;
    const observerNow = new Date(Date.now() + Math.round(offsetHrs * 3600000));
    const mins = observerNow.getUTCHours() * 60 + observerNow.getUTCMinutes();
    onChangeMinutes(mins);
  };

  const handleHourChange = (newH12: number) => {
    let newH24: number;
    if (isPm) {
      newH24 = newH12 === 12 ? 12 : newH12 + 12;
    } else {
      newH24 = newH12 === 12 ? 0 : newH12;
    }
    onChangeMinutes(newH24 * 60 + minutes);
  };

  const handleMinuteChange = (newM: number) => {
    onChangeMinutes(hour24 * 60 + newM);
  };

  const handleAmPmToggle = (targetPm: boolean) => {
    if (targetPm === isPm) return;
    let newH24 = hour24;
    if (targetPm && hour24 < 12) {
      newH24 = hour24 + 12;
    } else if (!targetPm && hour24 >= 12) {
      newH24 = hour24 - 12;
    }
    onChangeMinutes(newH24 * 60 + minutes);
  };

  const formatted12 = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;

  return (
    <div className="rounded-2xl border border-rose-950 bg-[#160408] p-4 text-xs space-y-3 shadow-md h-full flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
            ⏱️ Local Clock (12-Hour AM / PM)
          </span>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-amber-200">
              {formatted12}
            </span>
            <span className="rounded bg-rose-950/80 px-2 py-0.5 text-[10px] font-mono text-rose-300 border border-rose-900 truncate max-w-[150px]">
              {timezoneLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-lg border border-rose-900 bg-[#250711] p-0.5">
            <button
              type="button"
              onClick={() => handleAmPmToggle(false)}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all ${
                !isPm ? 'bg-amber-500 text-neutral-950 shadow-md' : 'text-rose-300 hover:text-white'
              }`}
            >
              ☀️ AM
            </button>
            <button
              type="button"
              onClick={() => handleAmPmToggle(true)}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all ${
                isPm ? 'bg-amber-500 text-neutral-950 shadow-md' : 'text-rose-300 hover:text-white'
              }`}
            >
              🌙 PM
            </button>
          </div>

          <button
            type="button"
            onClick={handleSnapToNow}
            className="flex items-center gap-1 rounded-lg border border-amber-600/70 bg-[#270712] px-2.5 py-1.5 font-semibold text-amber-200 hover:bg-amber-900/50 hover:text-white transition-all active:scale-[0.98]"
            title="Snap to current local wall-clock time in the selected observer city"
          >
            <span>🕒</span>
            <span>Now</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInteractive(!isInteractive)}
            className="rounded-lg border border-rose-800 bg-[#250711] px-2.5 py-1.5 text-rose-300 hover:text-white"
            title="Expand Hour & Minute Controls"
          >
            {isInteractive ? '▲ Hide' : '▼ Adjust'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-rose-950/80">
        <span className="text-[10px] text-rose-400 font-semibold mr-0.5">Slots:</span>
        {[
          { label: '12:00 AM', mins: 0 },
          { label: '06:00 AM', mins: 6 * 60 },
          { label: '09:00 AM', mins: 9 * 60 },
          { label: '12:00 PM', mins: 12 * 60 },
          { label: '03:00 PM', mins: 15 * 60 },
          { label: '06:30 PM', mins: 18 * 60 + 30 },
          { label: '11:30 PM', mins: 23 * 60 + 30 }
        ].map((slot) => (
          <button
            key={slot.label}
            type="button"
            onClick={() => onChangeMinutes(slot.mins)}
            className={`rounded-full px-2 py-0.5 text-[10px] border transition-colors ${
              totalMins === slot.mins
                ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                : 'bg-[#20060e] hover:bg-rose-900/60 text-rose-200 border-rose-950'
            }`}
          >
            {slot.label}
          </button>
        ))}
      </div>

      {isInteractive && (
        <div className="rounded-xl border border-rose-900 bg-[#1c050d] p-3 text-xs space-y-3 animate-fade-in">
          <div>
            <div className="flex justify-between text-rose-300 text-[11px] mb-1">
              <span>Hour (1 to 12):</span>
              <strong className="text-amber-300">{hour12.toString().padStart(2, '0')} {isPm ? 'PM' : 'AM'}</strong>
            </div>
            <input
              type="range"
              aria-label="Evaluation hour (1 to 12)"
              min="1"
              max="12"
              step="1"
              value={hour12}
              onChange={(e) => handleHourChange(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-rose-300 text-[11px] mb-1">
              <span>Minute (00 to 59):</span>
              <strong className="text-amber-300">:{minutes.toString().padStart(2, '0')}</strong>
            </div>
            <input
              type="range"
              aria-label="Evaluation minute (0 to 59)"
              min="0"
              max="59"
              step="1"
              value={minutes}
              onChange={(e) => handleMinuteChange(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
