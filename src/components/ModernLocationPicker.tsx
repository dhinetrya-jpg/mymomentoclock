/**
 * @license
 * MIT License
 *
 * Modern Geolocation & Google Maps-Style Global Place Autocomplete Picker
 * - Entering 3+ characters triggers instant local + CSP-safe `/api/geo/search` place suggestions.
 * - Choosing any place autofills and visibly displays exact Latitude (°N/°S), Longitude (°E/°W),
 *   IANA Timezone, and DST-aware UTC offset for the active evaluation date.
 */

import React, { useState, useEffect, useRef } from 'react';
import { LocationCoordinates } from '../engine/zeroCostAstroEngine';
import { OfflineGeoResolver, OfflineCityRecord } from '../engine/offlineGeoData';

interface ModernLocationPickerProps {
  currentLocation: LocationCoordinates;
  selectedDate?: string;
  onLocationChange: (loc: LocationCoordinates) => void;
}

export const ModernLocationPicker: React.FC<ModernLocationPickerProps> = ({
  currentLocation,
  selectedDate,
  onLocationChange
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(0);
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'DETECTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string>('');
  const [isCustomCoordsOpen, setIsCustomCoordsOpen] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string>('');

  // Manual Coordinates State
  const [manualLat, setManualLat] = useState<string>(currentLocation.latitude.toString());
  const [manualLon, setManualLon] = useState<string>(currentLocation.longitude.toString());
  const [manualOffset, setManualOffset] = useState<string>(currentLocation.timezoneOffset.toString());
  const [manualCityName, setManualCityName] = useState<string>(currentLocation.cityName || 'Custom Location');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [searchResults, setSearchResults] = useState<OfflineCityRecord[]>(() =>
    OfflineGeoResolver.searchCities('', 10, selectedDate)
  );
  const [isGeoLoading, setIsGeoLoading] = useState<boolean>(false);

  // Sync manual form fields when external currentLocation updates
  useEffect(() => {
    setManualLat(currentLocation.latitude.toString());
    setManualLon(currentLocation.longitude.toString());
    setManualOffset(currentLocation.timezoneOffset.toString());
    setManualCityName(currentLocation.cityName || 'Custom Location');
  }, [currentLocation.latitude, currentLocation.longitude, currentLocation.timezoneOffset, currentLocation.cityName]);

  // Google Maps-style Autocomplete: instant 0ms catalog + 3+ letter global place lookup
  useEffect(() => {
    let isCancelled = false;
    const local = OfflineGeoResolver.searchCities(searchQuery, 10, selectedDate);
    setSearchResults(local);
    setHighlightedIdx(0);

    if (searchQuery.trim().length >= 3) {
      setIsGeoLoading(true);
      const timer = setTimeout(async () => {
        try {
          const unified = await OfflineGeoResolver.searchUnifiedPlaces(searchQuery, 10, selectedDate);
          if (!isCancelled) {
            setSearchResults(unified);
            setHighlightedIdx(0);
          }
        } catch {
          // Offline catalog stays active
        } finally {
          if (!isCancelled) setIsGeoLoading(false);
        }
      }, 180);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }
    setIsGeoLoading(false);
    return undefined;
  }, [searchQuery, selectedDate]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('ERROR');
      setGpsErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setGpsStatus('DETECTING');
    setGpsErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        const tz = OfflineGeoResolver.getDeviceTimezone();
        const nearest = OfflineGeoResolver.findNearestCity(lat, lon);
        const useNearest = nearest.distanceKm < 30;
        const ianaTz = useNearest ? nearest.city.timezone : tz.timezone;
        const resolvedOffset = OfflineGeoResolver.resolveTimezoneOffsetForDate(
          ianaTz,
          selectedDate,
          tz.utcOffsetHours
        );

        const detectedName = useNearest
          ? `${nearest.city.name}, ${nearest.city.country}`
          : `GPS Location (${OfflineGeoResolver.formatCoordinates(lat, lon, 2)})`;

        const newLoc: LocationCoordinates = {
          latitude: lat,
          longitude: lon,
          timezone: ianaTz,
          timezoneOffset: resolvedOffset,
          cityName: detectedName
        };

        onLocationChange(newLoc);
        setSearchQuery(detectedName);
        setIsSearching(false);
        setGpsStatus('SUCCESS');
        setTimeout(() => setGpsStatus('IDLE'), 4000);
      },
      (err) => {
        setGpsStatus('ERROR');
        setGpsErrorMsg(err.message || 'Unable to retrieve location. Search any city below.');
        setTimeout(() => setGpsStatus('IDLE'), 5000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectCity = (c: OfflineCityRecord) => {
    const baseOffset = c.defaultUtcOffset ?? c.timezoneOffset ?? 5.5;
    const resolvedOffset = OfflineGeoResolver.resolveTimezoneOffsetForDate(
      c.timezone,
      selectedDate,
      baseOffset
    );
    const label = `${c.name}, ${c.country}`;
    const newLoc: LocationCoordinates = {
      latitude: c.latitude,
      longitude: c.longitude,
      timezone: c.timezone,
      timezoneOffset: resolvedOffset,
      cityName: label
    };
    onLocationChange(newLoc);
    // Keep chosen city visible in search input like Google Maps so user sees autofilled place + Lat/Lon!
    setSearchQuery(label);
    setIsSearching(false);
    setManualError('');
  };

  const handleApplyManualCoords = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    const lat = Number(manualLat);
    const lon = Number(manualLon);
    const tz = Number(manualOffset);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setManualError('Latitude must be between -90° and +90°.');
      return;
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setManualError('Longitude must be between -180° and +180°.');
      return;
    }
    if (!Number.isFinite(tz) || tz < -12 || tz > 14) {
      setManualError('UTC Offset must be between -12 and +14 hours (e.g. +5.5, +5.75, -5).');
      return;
    }

    const label = manualCityName.trim() || `Coord (${OfflineGeoResolver.formatCoordinates(lat, lon, 2)})`;
    const newLoc: LocationCoordinates = {
      latitude: lat,
      longitude: lon,
      timezone: undefined,
      timezoneOffset: tz,
      cityName: label
    };

    onLocationChange(newLoc);
    setSearchQuery(label);
    setIsCustomCoordsOpen(false);
  };

  const formattedCoords = OfflineGeoResolver.formatCoordinates(currentLocation.latitude, currentLocation.longitude, 4);
  const utcBadge = `UTC${currentLocation.timezoneOffset >= 0 ? `+${currentLocation.timezoneOffset}` : currentLocation.timezoneOffset}h`;

  return (
    <div className="rounded-2xl border border-rose-950 bg-[#160408] p-4 text-xs space-y-3 shadow-md h-full flex flex-col justify-between" ref={dropdownRef}>
      {/* Top Header & Active Location Coordinates Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
            📍 Observer Location, Latitude &amp; Longitude
          </span>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-serif text-sm font-bold text-amber-100 truncate">
              {currentLocation.cityName || 'Selected City'}
            </span>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/30">
              {formattedCoords} · {utcBadge}
            </span>
          </div>
        </div>

        {/* GPS & Custom Lat/Lon Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleDetectGps}
            disabled={gpsStatus === 'DETECTING'}
            className="flex items-center gap-1 rounded-lg border border-emerald-500/60 bg-emerald-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-900/60 transition-all disabled:opacity-50"
          >
            <span>{gpsStatus === 'DETECTING' ? '⏳' : '🎯'}</span>
            <span>{gpsStatus === 'DETECTING' ? 'GPS...' : 'GPS'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCustomCoordsOpen(!isCustomCoordsOpen);
              setManualError('');
            }}
            className="rounded-lg border border-rose-800 bg-[#250711] px-2.5 py-1.5 text-[11px] text-rose-300 hover:text-white"
            title="Enter custom Latitude, Longitude, and UTC Offset"
          >
            ⚙️ Lat/Lon
          </button>
        </div>
      </div>

      {/* GPS Status Feedback */}
      {gpsStatus === 'SUCCESS' && (
        <div className="rounded-lg bg-emerald-950/80 border border-emerald-500/60 px-3 py-1.5 text-emerald-200 text-[11px] flex items-center gap-2 animate-fade-in">
          <span>✓</span>
          <span>Locked to GPS coordinates ({formattedCoords}). Solar Kaalas updated.</span>
        </div>
      )}
      {gpsStatus === 'ERROR' && (
        <div role="alert" className="rounded-lg bg-rose-950/80 border border-rose-600/60 px-3 py-1.5 text-rose-200 text-[11px] flex items-center gap-2 animate-fade-in">
          <span>⚠️</span>
          <span>{gpsErrorMsg}</span>
        </div>
      )}

      {/* Google Maps-Style Autocomplete Search Input */}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            aria-label="Search observer city or location"
            placeholder="Type 3+ letters to autofill city, Lat & Lon (e.g. Mum, New York, Sydney, Kathmandu)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearching(true);
            }}
            onFocus={() => setIsSearching(true)}
            onKeyDown={(e) => {
              if (!isSearching && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                setIsSearching(true);
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIdx((prev) => Math.min(searchResults.length - 1, prev + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIdx((prev) => Math.max(0, prev - 1));
              } else if (e.key === 'Enter' && isSearching && searchResults[highlightedIdx]) {
                e.preventDefault();
                handleSelectCity(searchResults[highlightedIdx]);
              } else if (e.key === 'Escape') {
                setIsSearching(false);
              }
            }}
            className="w-full rounded-xl border border-rose-900 bg-[#20060e] pl-3.5 pr-14 py-2.5 text-xs text-rose-100 placeholder-rose-400/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {isGeoLoading && (
            <span className="absolute right-8 top-2.5 text-amber-400 animate-spin text-xs">⏳</span>
          )}
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear location search"
              onClick={() => {
                setSearchQuery('');
                setIsSearching(true);
              }}
              className="absolute right-3 top-2.5 text-rose-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {isSearching && (
          <div
            role="listbox"
            aria-label="Location suggestions"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-amber-700/80 bg-[#1c050d] p-1.5 shadow-2xl space-y-0.5"
          >
            {searchResults.length > 0 ? (
              searchResults.map((c, idx) => {
                const off = c.timezoneOffset ?? c.defaultUtcOffset;
                return (
                  <button
                    key={c.id || `${c.name}-${c.latitude}-${c.longitude}`}
                    type="button"
                    role="option"
                    aria-selected={idx === highlightedIdx}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    onClick={() => handleSelectCity(c)}
                    className={`w-full text-left rounded-lg p-2.5 text-xs flex items-center justify-between transition-colors border-b border-rose-950/40 last:border-b-0 ${
                      idx === highlightedIdx ? 'bg-amber-950/70 text-amber-100' : 'hover:bg-amber-950/50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-amber-200 block text-xs">📍 {c.name}</span>
                      <span className="text-[11px] text-rose-300/70">
                        {c.state ? `${c.state}, ` : ''}{c.country}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-amber-400 font-mono font-medium block">
                        {OfflineGeoResolver.formatCoordinates(c.latitude, c.longitude, 2)}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-mono">
                        UTC{off >= 0 ? `+${off}` : off} ({c.timezone})
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-rose-400 text-xs">
                {isGeoLoading ? 'Searching global places...' : 'No matching place found. Click ⚙️ Lat/Lon to enter exact coordinates.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Custom Latitude/Longitude Override Form */}
      {isCustomCoordsOpen && (
        <form onSubmit={handleApplyManualCoords} noValidate className="rounded-xl border border-rose-900 bg-[#1e060f] p-3 text-xs space-y-3 animate-fade-in">
          <div className="flex justify-between items-center border-b border-rose-950 pb-2">
            <span className="font-semibold text-amber-300">Custom Geographic Coordinates</span>
            <button type="button" onClick={() => setIsCustomCoordsOpen(false)} className="text-rose-400 hover:text-white">✕</button>
          </div>

          {manualError && (
            <div role="alert" className="rounded-lg border border-rose-500/80 bg-rose-950/80 px-3 py-2 text-[11px] text-rose-100">
              ⚠️ {manualError}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label htmlFor="obs-manual-label" className="block text-[11px] text-rose-300 mb-1">Location Label:</label>
              <input
                id="obs-manual-label"
                type="text"
                value={manualCityName}
                onChange={(e) => setManualCityName(e.target.value)}
                placeholder="e.g. Varanasi"
                className="w-full rounded border border-rose-800 bg-[#140307] p-1.5 text-white"
              />
            </div>
            <div>
              <label htmlFor="obs-manual-lat" className="block text-[11px] text-rose-300 mb-1">Latitude (-90..90):</label>
              <input
                id="obs-manual-lat"
                type="number"
                step="any"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full rounded border border-rose-800 bg-[#140307] p-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="obs-manual-lon" className="block text-[11px] text-rose-300 mb-1">Longitude (-180..180):</label>
              <input
                id="obs-manual-lon"
                type="number"
                step="any"
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
                className="w-full rounded border border-rose-800 bg-[#140307] p-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="obs-manual-utc" className="block text-[11px] text-rose-300 mb-1">UTC Offset (-12..14):</label>
              <input
                id="obs-manual-utc"
                type="number"
                step="0.25"
                value={manualOffset}
                onChange={(e) => setManualOffset(e.target.value)}
                className="w-full rounded border border-rose-800 bg-[#140307] p-1.5 text-white font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCustomCoordsOpen(false)}
              className="rounded px-3 py-1 text-rose-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-amber-600 px-4 py-1 font-semibold text-neutral-950 hover:bg-amber-500"
            >
              Apply Exact Coordinates
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
