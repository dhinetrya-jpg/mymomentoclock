/**
 * Onboarding Wizard Component (View 1 from UX Wireframes)
 * Supports:
 * - Global place search (120+ offline cities + `/api/geo/search` autocomplete + custom Lat/Lon)
 * - Automatic historical & DST IANA timezone resolution (`resolveIanaTimezone`) with spring-gap rejection & fall-fold disambiguation
 * - Birth date (1900..present) and birth time entry
 * - Ayanamsa selection (True Lahiri, KP, Raman) visible in both catalog and manual-coordinate modes
 * - Pre-hydrated values & Cancel action when editing an active natal profile
 */

import React, { useEffect, useId, useMemo, useState } from 'react';
import { AyanamsaType } from '../engine/astroMath';
import { CalculationInputError, validateBirthInput } from '../engine/calculationValidation';
import { MAJOR_CITIES_MUHURAT } from '../engine/diwaliData';
import { OfflineCityRecord, OfflineGeoResolver } from '../engine/offlineGeoData';
import { resolveIanaTimezone } from '../engine/timezoneResolver';

export interface BirthFormSubmission {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  cityName: string;
  ayanamsaType: AyanamsaType;
  timezoneOffset: number;
  timezone?: string;
  certainty?: string;
}

interface OnboardingWizardProps {
  onCalculate: (params: BirthFormSubmission) => void;
  onOpenQuickFestival: () => void;
  initialValues?: BirthFormSubmission;
  onCancel?: () => void;
}

interface PlaceOption {
  key: string;
  label: string;
  cityName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  defaultOffset: number;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onCalculate,
  onOpenQuickFestival,
  initialValues,
  onCancel,
}) => {
  const formId = useId();

  // Merge MAJOR_CITIES_MUHURAT (preserving exact option values like "Kolkata") with global catalog
  const catalogOptions: PlaceOption[] = useMemo(() => {
    const seen = new Set<string>();
    const list: PlaceOption[] = [];
    for (const [key, meta] of Object.entries(MAJOR_CITIES_MUHURAT)) {
      seen.add(key.toLowerCase());
      list.push({
        key,
        label: `${key} (${meta.stateCountry})`,
        cityName: key,
        latitude: meta.lat,
        longitude: meta.lon,
        timezone: meta.timezone,
        defaultOffset: meta.utcOffset,
      });
    }
    for (const rec of OfflineGeoResolver.searchCities('', 150)) {
      if (seen.has(rec.name.toLowerCase())) continue;
      seen.add(rec.name.toLowerCase());
      list.push({
        key: rec.name,
        label: `${rec.name} (${rec.state ? `${rec.state}, ` : ''}${rec.country} · ${rec.timezone})`,
        cityName: `${rec.name}, ${rec.country}`,
        latitude: rec.latitude,
        longitude: rec.longitude,
        timezone: rec.timezone,
        defaultOffset: rec.defaultUtcOffset,
      });
    }
    return list;
  }, []);

  const initialCatalogMatch = useMemo(() => {
    if (!initialValues) return null;
    return (
      catalogOptions.find(
        (o) =>
          o.key === initialValues.cityName ||
          o.cityName === initialValues.cityName ||
          (Math.abs(o.latitude - initialValues.latitude) < 0.005 &&
            Math.abs(o.longitude - initialValues.longitude) < 0.005)
      ) || null
    );
  }, [catalogOptions, initialValues]);

  const [cityName, setCityName] = useState<string>(() => {
    if (!initialValues) return '';
    return initialCatalogMatch ? initialCatalogMatch.key : initialValues.cityName || 'Custom Coordinates';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [geoSuggestions, setGeoSuggestions] = useState<OfflineCityRecord[]>([]);
  const [customPlace, setCustomPlace] = useState<PlaceOption | null>(() => {
    if (!initialValues || initialCatalogMatch) return null;
    return {
      key: initialValues.cityName || 'Custom Place',
      label: `${initialValues.cityName || 'Custom Place'}${initialValues.timezone ? ` (${initialValues.timezone})` : ''}`,
      cityName: initialValues.cityName || 'Custom Place',
      latitude: initialValues.latitude,
      longitude: initialValues.longitude,
      timezone: initialValues.timezone || '',
      defaultOffset: initialValues.timezoneOffset,
    };
  });
  const [isManualCoords, setIsManualCoords] = useState<boolean>(() =>
    Boolean(initialValues && !initialCatalogMatch && !initialValues.cityName)
  );
  const [manualLat, setManualLat] = useState<string>(() =>
    initialValues ? String(initialValues.latitude) : ''
  );
  const [manualLon, setManualLon] = useState<string>(() =>
    initialValues ? String(initialValues.longitude) : ''
  );
  const [manualZone, setManualZone] = useState<string>(() =>
    initialValues?.timezone && initialValues.timezone !== 'UTC_OFFSET' ? initialValues.timezone : ''
  );

  const [birthDate, setBirthDate] = useState<string>(() => initialValues?.birthDate || '');
  const [birthTime, setBirthTime] = useState<string>(() => initialValues?.birthTime || '');
  const [ayanamsa, setAyanamsa] = useState<AyanamsaType>(
    () => initialValues?.ayanamsaType || AyanamsaType.TRUE_LAHIRI
  );

  const [offset, setOffset] = useState<string>(() =>
    initialValues && Number.isFinite(initialValues.timezoneOffset)
      ? String(initialValues.timezoneOffset)
      : ''
  );
  const [offsetAutoResolved, setOffsetAutoResolved] = useState<string>('');
  const [foldCandidates, setFoldCandidates] = useState<number[]>([]);
  const [certainty, setCertainty] = useState<string>(() => initialValues?.certainty || '');
  const [error, setError] = useState('');

  const activePlace: PlaceOption | null = useMemo(() => {
    if (isManualCoords) {
      const lat = Number(manualLat);
      const lon = Number(manualLon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        key: 'CUSTOM',
        label: cityName || 'Custom Coordinates',
        cityName: cityName || 'Custom Coordinates',
        latitude: lat,
        longitude: lon,
        timezone: manualZone.trim(),
        defaultOffset: Number(offset) || 0,
      };
    }
    if (customPlace && customPlace.key === cityName) return customPlace;
    return catalogOptions.find((o) => o.key === cityName) || null;
  }, [isManualCoords, manualLat, manualLon, manualZone, cityName, customPlace, catalogOptions, offset]);

  const effectiveIana =
    activePlace?.timezone && activePlace.timezone !== 'UTC_OFFSET' && activePlace.timezone !== 'Local'
      ? activePlace.timezone
      : '';

  // Global place autocomplete (`OfflineGeoResolver` + `/api/geo/search` when >= 3 chars)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setGeoSuggestions([]);
      return undefined;
    }
    let cancelled = false;
    setGeoSuggestions(OfflineGeoResolver.searchCities(q, 8, birthDate || undefined));
    if (q.length >= 3) {
      const timer = setTimeout(async () => {
        try {
          const unified = await OfflineGeoResolver.searchUnifiedPlaces(q, 8, birthDate || undefined);
          if (!cancelled) setGeoSuggestions(unified);
        } catch {
          // Offline catalog remains active
        }
      }, 180);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [searchQuery, birthDate]);

  // Automatic historical & DST IANA timezone resolution whenever valid IANA place + date + time are known
  useEffect(() => {
    setFoldCandidates([]);
    setOffsetAutoResolved('');
    if (!effectiveIana || !birthDate || !birthTime || certainty === 'UNKNOWN') return;
    try {
      const res = resolveIanaTimezone(birthDate, birthTime, effectiveIana);
      setOffset(String(res.offsetHours));
      setOffsetAutoResolved(`Auto-resolved from ${effectiveIana} (${res.isoUtc})`);
      setError('');
    } catch (err) {
      if (err instanceof CalculationInputError) {
        if (err.code === 'NONEXISTENT_LOCAL_TIME') {
          setOffset('');
          setError(`The local time ${birthTime} did not exist in ${effectiveIana} on ${birthDate} due to a Daylight Saving Time spring-forward jump.`);
        } else if (err.code === 'AMBIGUOUS_LOCAL_TIME') {
          const candidates: number[] = [];
          for (let cand = -12; cand <= 14; cand += 0.25) {
            try {
              resolveIanaTimezone(birthDate, birthTime, effectiveIana, cand);
              candidates.push(cand);
            } catch {
              // Ignore non-matching offsets
            }
          }
          setFoldCandidates(candidates);
          setOffset('');
          setError(`The local time ${birthTime} occurred twice in ${effectiveIana} on ${birthDate} (DST fall-back fold). Select the applicable UTC offset below.`);
        }
      }
    }
  }, [effectiveIana, birthDate, birthTime, certainty]);

  const handleSelectGeoSuggestion = (rec: OfflineCityRecord) => {
    const cleanZone = rec.timezone && rec.timezone !== 'UTC_OFFSET' ? rec.timezone : '';
    const picked: PlaceOption = {
      key: `${rec.name}, ${rec.country}`,
      label: `${rec.name}, ${rec.country} (${cleanZone || `UTC${rec.defaultUtcOffset >= 0 ? `+${rec.defaultUtcOffset}` : rec.defaultUtcOffset}`})`,
      cityName: `${rec.name}, ${rec.country}`,
      latitude: rec.latitude,
      longitude: rec.longitude,
      timezone: cleanZone,
      defaultOffset: rec.defaultUtcOffset,
    };
    setIsManualCoords(false);
    setCustomPlace(picked);
    setCityName(picked.key);
    setSearchQuery('');
    setGeoSuggestions([]);
    if (!cleanZone || !birthDate || !birthTime) {
      setOffset(String(rec.defaultUtcOffset));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (certainty === 'UNKNOWN') {
      setError('An exact chart is unavailable without a known birth time. Birth-time rectification is unavailable; no time is substituted.');
      return;
    }
    if (!activePlace) {
      setError('Select your birth city or enter exact birth coordinates.');
      return;
    }

    const parsedOffset = offset === '' ? undefined : Number(offset);
    try {
      if (effectiveIana && parsedOffset === undefined) {
        resolveIanaTimezone(birthDate, birthTime, effectiveIana);
      }
      validateBirthInput({
        birthDate,
        birthTime,
        latitude: activePlace.latitude,
        longitude: activePlace.longitude,
        birthTimeCertainty: certainty || undefined,
        timezoneOffset: parsedOffset,
        timezone: effectiveIana || undefined,
        ayanamsaType: ayanamsa,
      });
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    onCalculate({
      birthDate,
      birthTime,
      latitude: activePlace.latitude,
      longitude: activePlace.longitude,
      cityName: activePlace.cityName,
      ayanamsaType: ayanamsa,
      timezoneOffset: Number(offset),
      timezone: effectiveIana || undefined,
      certainty: certainty || undefined,
    });
  };

  return (
    <div className="min-w-0 break-words rounded-2xl border border-rose-950/70 bg-[#1c050b] p-6 lg:p-8 shadow-2xl max-w-2xl mx-auto">
      <div className="text-center space-y-1.5 border-b border-rose-950/60 pb-5">
        <span className="font-mono text-xs font-semibold text-amber-400 uppercase tracking-widest">
          Module 1 · Spatiotemporal Normalization Engine
        </span>
        <h2 className="font-serif text-2xl font-bold text-neutral-100">
          Initialize Your Vedic Natal Profile
        </h2>
        <p className="text-xs text-rose-300/60 max-w-md mx-auto">
          Calculates Julian Day, Ephemeris Delta-T, Ascendant degree, and sub-divisional charts (supported birth years: 1900 to present).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${formId}-date`} className="text-xs font-semibold text-rose-100">Birth Date</label>
            <input
              id={`${formId}-date`}
              type="date"
              min="1900-01-01"
              max={new Date().toISOString().slice(0, 10)}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className="mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-rose-900/60 bg-[#280812] px-3.5 py-2.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={`${formId}-time`} className="text-xs font-semibold text-rose-100">Birth Time (Local)</label>
            <input
              id={`${formId}-time`}
              aria-describedby={`${formId}-time-help`}
              disabled={certainty === 'UNKNOWN'}
              type="time"
              step="1"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              required={certainty !== 'UNKNOWN'}
              className="mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-rose-900/60 bg-[#280812] px-3.5 py-2.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none font-mono"
            />
            <span id={`${formId}-time-help`} className="text-[10px] text-rose-300/50 mt-1 block">
              Unknown birth time cannot produce an exact chart. Birth-time rectification is unavailable; no candidate time is generated.
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`${formId}-place-search`} className="text-xs font-semibold text-rose-100">
              Search Worldwide Birth Place (or choose from catalog below)
            </label>
            <button
              type="button"
              onClick={() => setIsManualCoords(!isManualCoords)}
              className="text-[11px] text-amber-300 hover:underline"
            >
              {isManualCoords ? 'Use City Selector' : 'Enter Exact Lat/Lon'}
            </button>
          </div>
          {!isManualCoords && (
            <div className="relative">
              <input
                id={`${formId}-place-search`}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type any town, city, or postal code worldwide (e.g. Varanasi, Boston, Toronto)..."
                className="w-full min-w-0 max-w-full rounded-lg border border-rose-900/60 bg-[#280812] px-3.5 py-2 text-xs text-rose-100 placeholder-rose-300/40 focus:border-amber-400 focus:outline-none"
              />
              {geoSuggestions.length > 0 && (
                <div role="listbox" aria-label="Birthplace search suggestions" className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-amber-600/60 bg-[#140308] p-1 space-y-0.5 shadow-xl">
                  {geoSuggestions.map((rec) => (
                    <button
                      key={rec.id || `${rec.name}-${rec.latitude}-${rec.longitude}`}
                      type="button"
                      onClick={() => handleSelectGeoSuggestion(rec)}
                      className="w-full text-left rounded px-2.5 py-1.5 text-xs text-rose-100 hover:bg-amber-950/60 flex items-center justify-between gap-2"
                    >
                      <span>{rec.name}{rec.state ? `, ${rec.state}` : ''}, {rec.country}</span>
                      <span className="font-mono text-[10px] text-amber-300">
                        {rec.timezone && rec.timezone !== 'UTC_OFFSET'
                          ? rec.timezone
                          : `UTC${rec.defaultUtcOffset >= 0 ? `+${rec.defaultUtcOffset}` : rec.defaultUtcOffset}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {isManualCoords ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-rose-900/60 bg-[#22060f] p-3 text-xs">
            <label className="block">Birth Latitude (-90..90)
              <input type="number" step="any" min="-89.9999" max="89.9999" required value={manualLat} onChange={(e) => setManualLat(e.target.value)} className="mt-1 block w-full rounded bg-rose-950 p-2 font-mono" />
            </label>
            <label className="block">Birth Longitude (-180..180)
              <input type="number" step="any" min="-180" max="180" required value={manualLon} onChange={(e) => setManualLon(e.target.value)} className="mt-1 block w-full rounded bg-rose-950 p-2 font-mono" />
            </label>
            <label className="block">IANA Timezone (optional)
              <input type="text" placeholder="e.g. Asia/Kolkata" value={manualZone} onChange={(e) => setManualZone(e.target.value)} className="mt-1 block w-full rounded bg-rose-950 p-2 font-mono" />
            </label>
          </div>
        ) : (
          <div>
            <label htmlFor={`${formId}-city`} className="text-xs font-semibold text-rose-100">City / Geographic Longitude</label>
            <select
              id={`${formId}-city`}
              value={cityName}
              onChange={(e) => {
                const val = e.target.value;
                setCityName(val);
                const found = catalogOptions.find((o) => o.key === val);
                if (found && (!birthDate || !birthTime || !found.timezone)) {
                  setOffset(String(found.defaultOffset));
                }
              }}
              className="mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-rose-900/60 bg-[#280812] px-3.5 py-2.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none"
            >
              <option value="">Select birth city</option>
              {customPlace && !catalogOptions.some((o) => o.key === customPlace.key) && (
                <option value={customPlace.key}>{customPlace.label}</option>
              )}
              {catalogOptions.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor={`${formId}-ayanamsa`} className="text-xs font-semibold text-rose-100">Ayanamsa Reference System</label>
          <select
            id={`${formId}-ayanamsa`}
            value={ayanamsa}
            onChange={(e) => setAyanamsa(e.target.value as AyanamsaType)}
            className="mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-rose-900/60 bg-[#280812] px-3.5 py-2.5 text-xs text-rose-100 focus:border-amber-400 focus:outline-none"
          >
            <option value={AyanamsaType.TRUE_LAHIRI}>True Lahiri (Chitrapaksha) - Global Baseline</option>
            <option value={AyanamsaType.KP}>KP (Krishnamurti Paddhati)</option>
            <option value={AyanamsaType.RAMAN}>B.V. Raman Ayanamsa</option>
          </select>
        </div>

        <label className="block text-xs">UTC offset at birth (hours)
          <input
            aria-label="UTC offset at birth"
            type="number"
            min="-12"
            max="14"
            step="any"
            required
            value={offset}
            onChange={(e) => setOffset(e.target.value)}
            className="my-2 block w-full min-w-0 max-w-full bg-rose-950 p-2 font-mono"
          />
          <span className="text-[11px] text-rose-300/80 block">
            {offsetAutoResolved || 'Automatically populated from the selected city’s historical IANA timezone when date and time are entered; verify manually when using approximate longitude offsets or born during a DST transition.'}
          </span>
        </label>

        {foldCandidates.length > 1 && (
          <div className="rounded-lg border border-amber-500/60 bg-amber-950/30 p-3 text-xs space-y-2">
            <p className="font-semibold text-amber-200">Disambiguate Repeated Fall-Back Birth Time:</p>
            <div className="flex flex-wrap gap-2">
              {foldCandidates.map((cand) => (
                <button
                  key={cand}
                  type="button"
                  onClick={() => {
                    setOffset(String(cand));
                    setError('');
                  }}
                  className="rounded bg-amber-500 px-3 py-1 font-mono font-bold text-neutral-950 hover:bg-amber-400"
                >
                  Use UTC{cand >= 0 ? `+${cand}` : cand}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p role="alert" className="rounded-lg border border-rose-500/70 bg-rose-950/60 p-3 text-xs text-rose-100">{error}</p>}

        <label className="block text-xs">Birth time certainty
          <select aria-label="Birth time certainty" required value={certainty} onChange={(e) => setCertainty(e.target.value)} className="my-2 block w-full min-w-0 max-w-full bg-rose-950 p-2">
            <option value="">Choose certainty</option>
            <option value="EXACT">Recorded time</option>
            <option value="APPROXIMATE">Approximate time</option>
            <option value="UNKNOWN">Unknown time (chart unavailable)</option>
          </select>
        </label>
        {certainty === 'UNKNOWN' && (
          <p role="status" className="text-sm text-amber-200">
            An exact chart is unavailable without a known birth time. Use the Birth-Time Uncertainty Explorer to inspect the whole local date without selecting an actual birth time.
          </p>
        )}

        <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-3">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-amber-500 py-3 px-5 text-xs font-bold text-neutral-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-950/50"
          >
            Compute chart preview
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-amber-500/50 bg-[#260812] px-4 py-3 text-xs font-semibold text-amber-200 hover:bg-amber-950/60 transition-colors"
            >
              Cancel · Return to Chart
            </button>
          )}

          <button
            type="button"
            onClick={onOpenQuickFestival}
            className="rounded-xl border border-rose-900/60 bg-[#25070f] px-5 py-3 text-xs font-semibold text-rose-200 hover:bg-[#340a15] transition-colors"
          >
            Skip to Festival Kit (No Birth Time)
          </button>
        </div>
      </form>
    </div>
  );
};
