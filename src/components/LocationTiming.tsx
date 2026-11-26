import React, { useEffect, useRef, useState } from 'react';
import {
  checkLocationTiming, LOCATION_TIMING_ACTIVITIES, LOCATION_TIMING_CITIES,
  type LocationActivity, type LocationTimingResult,
} from '../engine/locationTiming';

const prompts = ['What activity are you planning?', 'Which city will it be in?', 'What is the local date?'];
const control = 'w-full rounded border border-rose-700 bg-[#19060b] p-2 text-white';

export function LocationTiming() {
  const [guided, setGuided] = useState(false);
  const [step, setStep] = useState(0);
  const [city, setCity] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [date, setDate] = useState('');
  const [activity, setActivity] = useState<LocationActivity>('general');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LocationTimingResult | null>(null);
  const [error, setError] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const visibleCities = LOCATION_TIMING_CITIES.filter(
    option => option.city.toLowerCase().includes(cityQuery.trim().toLowerCase()),
  );
  const timezone = LOCATION_TIMING_CITIES.find(option => option.city === city)?.timezone;

  useEffect(() => () => pending.current?.abort(), []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (guided && step < prompts.length - 1) {
      setStep(step + 1);
      return;
    }
    const request = { schema_version: 1 as const, city, date, activity };
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setResult(null);
    setError(false);
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const value = await checkLocationTiming(request, controller.signal);
      if (!controller.signal.aborted) setResult(value);
    } catch {
      setError(true);
    } finally {
      clearTimeout(timeout);
      pending.current = null;
      setBusy(false);
    }
  }

  function clearResult() {
    setResult(null);
    setError(false);
  }

  return <section aria-labelledby="location-timing-title" className="space-y-5 text-rose-100">
    <h2 id="location-timing-title" className="font-serif text-2xl text-amber-300">Daily timing by location</h2>
    <div role="group" aria-label="Location timing input style" className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={!guided} disabled={busy} onClick={() => { setGuided(false); clearResult(); }}
        className="rounded border border-rose-700 px-3 py-2 aria-pressed:border-amber-300">Direct form</button>
      <button type="button" aria-pressed={guided} disabled={busy} onClick={() => { setGuided(true); setStep(0); clearResult(); }}
        className="rounded border border-rose-700 px-3 py-2 aria-pressed:border-amber-300">Guided chat</button>
    </div>
    {guided && <div className="space-y-1">
      <p className="text-sm">Guided template</p>
      <p aria-live="polite">{prompts[step]}</p>
    </div>}
    <form onSubmit={submit} onChange={clearResult} className="space-y-4">
      <fieldset disabled={busy} className="grid gap-4 rounded-lg border border-rose-800 p-4 sm:grid-cols-2">
        <legend>Activity location and date</legend>
        <div hidden={guided && step !== 1} className="min-w-0">
          <label htmlFor="location-timing-search" className="mb-1 block">Search supported cities</label>
          <input id="location-timing-search" name="city-search" type="search" maxLength={80}
            className={control} value={cityQuery} disabled={guided && step !== 1}
            onChange={event => {
              const query = event.target.value;
              setCityQuery(query);
              if (!city.toLowerCase().includes(query.trim().toLowerCase())) setCity('');
            }}/>
          <label htmlFor="location-timing-city" className="mt-3 mb-1 block">City</label>
          <select id="location-timing-city" required disabled={guided && step !== 1} name="city"
            className={control} value={city} onChange={event => setCity(event.target.value)}>
            <option value="">Choose a city</option>
            {visibleCities.map(option => <option key={option.city}>{option.city}</option>)}
          </select>
          {!visibleCities.length && <p role="status" className="mt-2 text-sm">No supported cities match. Try another search.</p>}
        </div>
        <div hidden={guided && step !== 2}>
          <label htmlFor="location-timing-date" className="mb-1 block">Local date</label>
          <input id="location-timing-date" required disabled={guided && step !== 2} name="date"
            type="date" min="2000-01-01" max="2100-12-31" className={control}
            value={date} onChange={event => setDate(event.target.value)}/>
        </div>
        <div hidden={guided && step !== 0}>
          <label htmlFor="location-timing-activity" className="mb-1 block">Activity</label>
          <select id="location-timing-activity" disabled={guided && step !== 0} name="activity"
            className={control} value={activity} onChange={event => setActivity(event.target.value as LocationActivity)}>
            {LOCATION_TIMING_ACTIVITIES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </div>
        {timezone && (!guided || step > 0) && <p className="self-end break-words text-sm">Time zone: {timezone}</p>}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        {guided && step > 0 && <button type="button" disabled={busy} onClick={() => { setStep(step - 1); clearResult(); }}
          className="rounded border border-rose-700 px-4 py-2">Back</button>}
        <button disabled={busy} className="rounded bg-amber-500 px-4 py-2 font-semibold text-neutral-950 disabled:opacity-50">
          {busy ? 'Checking availability…' : guided ? (step < prompts.length - 1 ? 'Next' : 'Send selections') : 'Check availability'}
        </button>
      </div>
    </form>
    {error && <p role="alert">Could not check timing availability. Try again.</p>}
    {result && <div role="status" className="space-y-2 rounded-lg border border-amber-600 p-4">
      <p>{result.city} · {result.date} · {result.timezone}</p>
      <p>{LOCATION_TIMING_ACTIVITIES.find(option => option.id === result.activity)?.label}</p>
      <p>Timing is unavailable for this selection. Reviewed rules and verified calendar inputs are still required.</p>
    </div>}
  </section>;
}
