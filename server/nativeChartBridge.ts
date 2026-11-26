import {
  AyanamsaType,
  CalculationMode,
  ChartCalculationResult,
  assembleChartResult,
  buildPlanetPositionFromSidereal,
  calculateFullChart,
} from '../src/engine/astroMath';
import { CalculationInputError, validateBirthInput } from '../src/engine/calculationValidation';
import { norm360 } from '../src/engine/planetaryEphemeris';

function isAllowedInternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === '127.0.0.1' ||
    h === 'localhost' ||
    h === '[::1]' ||
    h === '::1' ||
    h === 'api' ||
    h === 'engine' ||
    h.endsWith('.internal') ||
    h.endsWith('.svc.cluster.local')
  );
}

export function resolveConfiguredNativeEngineUrl(): string | null {
  const raw = (process.env.NATIVE_ENGINE_URL || process.env.ASTRO_NATIVE_URL || '').trim();
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('NATIVE_ENGINE_URL_INVALID');
  }
  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('NATIVE_ENGINE_URL_INVALID');
  }
  if (!isAllowedInternalHost(parsed.hostname)) {
    throw new Error('NATIVE_ENGINE_URL_EXTERNAL_FORBIDDEN');
  }
  return parsed.origin;
}

function toUtcDateAndClock(birthDate: string, birthTime: string, timezoneOffset: number): { utcDate: string; utcClock: string } {
  const rawTime = birthTime.length === 5 ? `${birthTime}:00` : birthTime;
  const [y, m, d] = birthDate.split('-').map(Number);
  const [hh, mm, ss] = rawTime.split(':').map(Number);
  const dt = new Date(0);
  dt.setUTCFullYear(y, m - 1, d);
  dt.setUTCHours(hh, mm, ss, 0);
  const utc = new Date(dt.getTime() - Math.round(timezoneOffset * 3600000));
  const iso = utc.toISOString();
  return {
    utcDate: iso.slice(0, 10),
    utcClock: iso.slice(11, 19)
  };
}

function ayanamsaDeltaFromLahiri(type: AyanamsaType): number {
  switch (type) {
    case AyanamsaType.KP:
      return -(5.0 / 60.0 + 50.0 / 3600.0);
    case AyanamsaType.RAMAN:
      return -1.45;
    case AyanamsaType.TRUE_LAHIRI:
    default:
      return 0;
  }
}

/**
 * Computes a chart via the Go/CGo Swiss Ephemeris v2.10.03 native service (`/api/v1/astronomy/snapshot`)
 * when `NATIVE_ENGINE_URL` is configured and reachable, failing closed if `REQUIRE_NATIVE_SWISS=1`,
 * or falling back cleanly to the upgraded high-precision Meeus/VSOP87/ELP2000 analytical engine in standalone Node dev.
 */
export async function computeChartWithNativeBridge(input: {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  cityName?: string;
  timezoneOffset: number;
  timezone?: string;
  ayanamsaType?: AyanamsaType;
}): Promise<{ chart: ChartCalculationResult; nativeUsed: boolean }> {
  const ayanamsaType = input.ayanamsaType || AyanamsaType.TRUE_LAHIRI;
  validateBirthInput({ ...input, ayanamsaType });

  const nativeOrigin = resolveConfiguredNativeEngineUrl();
  const requireNative = process.env.REQUIRE_NATIVE_SWISS === '1';

  if (!nativeOrigin) {
    if (requireNative) {
      throw new CalculationInputError('NATIVE_EPHEMERIS_UNAVAILABLE', 'Native Swiss Ephemeris service is required and not configured.');
    }
    return {
      chart: calculateFullChart(
        input.birthDate,
        input.birthTime,
        input.latitude,
        input.longitude,
        input.cityName || '',
        input.timezoneOffset,
        ayanamsaType,
        input.timezone
      ),
      nativeUsed: false,
    };
  }

  const { utcDate, utcClock } = toUtcDateAndClock(input.birthDate, input.birthTime, input.timezoneOffset);
  const requiredMode = process.env.NATIVE_REQUIRED_MODE || 'MOSHIER';

  try {
    const resp = await fetch(`${nativeOrigin}/api/v1/astronomy/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        schema_version: 1,
        civil: {
          birth_date: utcDate,
          birth_time: utcClock,
          timezone: 'UTC',
          latitude: input.latitude,
          longitude: input.longitude,
          birth_time_certainty: 'EXACT',
          required_mode: requiredMode,
        },
        elevation_meters: 0,
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      if (resp.status === 422 && typeof errBody?.code === 'string') {
        throw new CalculationInputError(errBody.code, 'Native Swiss Ephemeris rejected the supplied coordinates or epoch.');
      }
      throw new Error(`NATIVE_HTTP_${resp.status}`);
    }

    const body = await resp.json() as any;
    const nat = body?.native;
    if (!nat?.planets || !nat?.houses || !Number.isFinite(nat?.ayanamsa_degrees)) {
      throw new Error('NATIVE_RESPONSE_MALFORMED');
    }

    const deltaFromLahiri = ayanamsaDeltaFromLahiri(ayanamsaType);
    const effectiveAyanamsa = nat.ayanamsa_degrees + deltaFromLahiri;
    const siderealAsc = ayanamsaType === AyanamsaType.TRUE_LAHIRI
      ? norm360(nat.houses.sidereal_ascendant)
      : norm360(nat.houses.tropical_ascendant - effectiveAyanamsa);
    const ascQuant = Number(siderealAsc.toFixed(4)) % 360;
    const ascSignIdx = Math.min(11, Math.max(0, Math.floor(ascQuant / 30)));

    const keyMap: ReadonlyArray<readonly [string, string]> = [
      ['Sun', 'sun'],
      ['Moon', 'moon'],
      ['Mars', 'mars'],
      ['Mercury', 'mercury'],
      ['Jupiter', 'jupiter'],
      ['Venus', 'venus'],
      ['Saturn', 'saturn'],
      ['Rahu', 'mean_node'],
    ];

    const planets = keyMap.map(([displayName, swissKey]) => {
      const sp = nat.planets[swissKey];
      if (!sp) throw new Error(`MISSING_NATIVE_BODY_${swissKey}`);
      const sidLon = ayanamsaType === AyanamsaType.TRUE_LAHIRI
        ? norm360(sp.sidereal_longitude)
        : norm360(sp.tropical_longitude - effectiveAyanamsa);
      return buildPlanetPositionFromSidereal(displayName, sidLon, ascSignIdx, {
        speed: Number(Number(sp.sidereal_longitude_speed_deg_per_day).toFixed(4)),
        isRetrograde: Boolean(sp.retrograde),
      });
    });

    const rahuNode = nat.planets.mean_node;
    const rahuSid = ayanamsaType === AyanamsaType.TRUE_LAHIRI
      ? norm360(rahuNode.sidereal_longitude)
      : norm360(rahuNode.tropical_longitude - effectiveAyanamsa);
    planets.push(
      buildPlanetPositionFromSidereal('Ketu', norm360(rahuSid + 180.0), ascSignIdx, {
        speed: Number(Number(rahuNode.sidereal_longitude_speed_deg_per_day).toFixed(4)),
        isRetrograde: Boolean(rahuNode.retrograde),
      })
    );

    const actualMode: string = nat.actual_mode || requiredMode;
    const calcMode: CalculationMode =
      actualMode === 'SWISS_FILE'
        ? 'SWISS_EPHEMERIS_FILE'
        : actualMode === 'JPL'
        ? 'SWISS_EPHEMERIS_JPL'
        : 'SWISS_EPHEMERIS_MOSHIER';

    const chart = assembleChartResult({
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      latitude: input.latitude,
      longitude: input.longitude,
      cityName: input.cityName || '',
      timezoneOffset: input.timezoneOffset,
      timezone: input.timezone,
      ayanamsaType,
      ayanamsaVal: effectiveAyanamsa,
      jdUT: Number(nat.epoch?.julian_day_ut1 ?? nat.epoch?.julian_day_utc_nominal),
      deltaT: Number(nat.epoch?.delta_t_seconds ?? 0),
      ascDegree: ascQuant,
      planets,
      calculationMode: calcMode,
      engineVersion: `swisseph-${nat.library_version || '2.10.03'}`,
      nativeLibraryVersion: nat.library_version,
      nativeSourceCommit: nat.source_commit,
    });

    return { chart, nativeUsed: true };
  } catch (err) {
    if (err instanceof CalculationInputError) throw err;
    if (requireNative) {
      throw new CalculationInputError('NATIVE_EPHEMERIS_UNAVAILABLE', 'Native Swiss Ephemeris CGo service is unreachable.');
    }
    return {
      chart: calculateFullChart(
        input.birthDate,
        input.birthTime,
        input.latitude,
        input.longitude,
        input.cityName || '',
        input.timezoneOffset,
        ayanamsaType,
        input.timezone
      ),
      nativeUsed: false,
    };
  }
}
