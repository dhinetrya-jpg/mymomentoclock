import { CalculationInputError, validGregorianDate } from './calculationValidation';

/**
 * Result of resolving a civil wall-clock date and time in an IANA timezone or explicit offset.
 */
export interface ResolvedTimeResult {
  utcDate: Date;
  isoUtc: string;
  julianDayUT: number;
  julianDayTT: number;
  deltaTSeconds: number;
  offsetHours: number;
  timezone: string;
  isAmbiguous: boolean;
  isDstGap: boolean;
}

/**
 * Standard TT - UT timescale conversion.
 * TT = UT + DeltaT (where DeltaT is in seconds).
 * JD(TT) = JD(UT) + DeltaT / 86400
 */
export function calculateJulianDayTT(jdUT: number, deltaTSeconds: number): number {
  return jdUT + deltaTSeconds / 86400;
}

/**
 * Formats a Date object in a given IANA timezone as "YYYY-MM-DD HH:mm:ss"
 */
function formatInZone(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  // 'en-CA' outputs "YYYY-MM-DD, HH:mm:ss" or similar
  const parts = dtf.formatToParts(date);
  const partMap: Record<string, string> = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });
  return `${partMap.year}-${partMap.month}-${partMap.day} ${partMap.hour}:${partMap.minute}:${partMap.second}`;
}

/**
 * Resolves an IANA timezone or caller-supplied UTC offset.
 * Detects and rejects daylight saving gaps (NONEXISTENT_LOCAL_TIME)
 * and fall-back folds (AMBIGUOUS_LOCAL_TIME) unless disambiguated.
 */
export function resolveIanaTimezone(
  birthDate: string,
  birthTime: string,
  timezone: string,
  callerOffset?: number,
  deltaTSeconds: number = 69.184
): ResolvedTimeResult {
  if (!birthDate || !birthTime) {
    throw new CalculationInputError('MISSING_REQUIRED_BIRTH_DATA', 'Birth date and time are required.');
  }

  if (!validGregorianDate(birthDate)) {
    throw new CalculationInputError('INVALID_BIRTH_DATE', 'Use an existing Gregorian date in YYYY-MM-DD format.');
  }

  const rawTime = birthTime.length === 5 ? `${birthTime}:00` : birthTime;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(rawTime)) {
    throw new CalculationInputError('INVALID_BIRTH_TIME', 'Use HH:MM[:SS], hours 00–23 and minutes/seconds 00–59.');
  }

  const wallClockTarget = `${birthDate} ${rawTime}`;

  // If caller supplied explicit numeric offset
  if (callerOffset !== undefined && callerOffset !== null && !Number.isNaN(callerOffset)) {
    if (callerOffset < -12 || callerOffset > 14) {
      throw new CalculationInputError('INVALID_TIMEZONE', 'Supply the UTC offset in hours (−12 to +14).');
    }

    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour, min, sec] = rawTime.split(':').map(Number);

    // Compute UTC time in milliseconds
    const naiveUtcMs = Date.UTC(year, month - 1, day, hour, min, sec);
    const targetUtcMs = naiveUtcMs - Math.round(callerOffset * 3600 * 1000);
    const utcDate = new Date(targetUtcMs);

    // If IANA zone was also provided, check for consistency
    if (timezone) {
      try {
        const formatted = formatInZone(utcDate, timezone);
        if (formatted !== wallClockTarget) {
          throw new CalculationInputError(
            'INVALID_TIMEZONE',
            `Supplied timezone offset ${callerOffset} does not match ${timezone} at ${wallClockTarget}`
          );
        }
      } catch (e) {
        if (e instanceof CalculationInputError) throw e;
        throw new CalculationInputError('INVALID_TIMEZONE', `Invalid IANA timezone: ${timezone}`);
      }
    }

    const jdUT = calculateJdFromDate(utcDate);
    const jdTT = calculateJulianDayTT(jdUT, deltaTSeconds);

    return {
      utcDate,
      isoUtc: utcDate.toISOString(),
      julianDayUT: jdUT,
      julianDayTT: jdTT,
      deltaTSeconds,
      offsetHours: callerOffset,
      timezone: timezone || 'UTC_OFFSET',
      isAmbiguous: false,
      isDstGap: false,
    };
  }

  // Pure IANA timezone resolution
  if (!timezone) {
    throw new CalculationInputError('INVALID_TIMEZONE', 'Timezone name or UTC offset must be provided.');
  }

  try {
    // Validate timezone name
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch (_e) {
    throw new CalculationInputError('INVALID_TIMEZONE', `Unknown or unsupported IANA timezone: ${timezone}`);
  }

  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, min, sec] = rawTime.split(':').map(Number);
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, min, sec);

  // Probe possible offsets within +/- 48 hours to collect potential transition states
  const candidateOffsets = new Set<number>();
  for (let h = -48; h <= 48; h += 3) {
    const probe = new Date(naiveUtcMs + h * 3600 * 1000);
    const formatted = formatInZone(probe, timezone);
    // Parse the offset between probe (UTC) and formatted (local)
    const [pDate, pTime] = formatted.split(' ');
    const [pY, pM, pD] = pDate.split('-').map(Number);
    const [pH, pMin, pS] = pTime.split(':').map(Number);
    const localMs = Date.UTC(pY, pM - 1, pD, pH, pMin, pS);
    const offsetSec = Math.round((localMs - probe.getTime()) / 1000);
    candidateOffsets.add(offsetSec);
  }

  const matchingDates: { utc: Date; offsetHours: number }[] = [];
  for (const offSec of candidateOffsets) {
    const candidateUtc = new Date(naiveUtcMs - offSec * 1000);
    const formatted = formatInZone(candidateUtc, timezone);
    if (formatted === wallClockTarget) {
      matchingDates.push({
        utc: candidateUtc,
        offsetHours: offSec / 3600,
      });
    }
  }

  if (matchingDates.length === 0) {
    throw new CalculationInputError(
      'NONEXISTENT_LOCAL_TIME',
      `Local wall-clock time '${wallClockTarget}' does not exist in timezone '${timezone}' due to daylight saving transition gap.`
    );
  }

  if (matchingDates.length > 1) {
    throw new CalculationInputError(
      'AMBIGUOUS_LOCAL_TIME',
      `Local wall-clock time '${wallClockTarget}' is ambiguous in timezone '${timezone}' due to daylight saving fall-back fold. Provide explicit UTC offset.`
    );
  }

  const resolved = matchingDates[0];
  const jdUT = calculateJdFromDate(resolved.utc);
  const jdTT = calculateJulianDayTT(jdUT, deltaTSeconds);

  return {
    utcDate: resolved.utc,
    isoUtc: resolved.utc.toISOString(),
    julianDayUT: jdUT,
    julianDayTT: jdTT,
    deltaTSeconds,
    offsetHours: resolved.offsetHours,
    timezone,
    isAmbiguous: false,
    isDstGap: false,
  };
}

function calculateJdFromDate(d: Date): number {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 + d.getUTCMilliseconds() / 3600000;

  let yCalc = y;
  let mCalc = m;
  if (mCalc <= 2) {
    yCalc -= 1;
    mCalc += 12;
  }

  const A = Math.floor(yCalc / 100);
  const B = Math.floor(A / 4);
  const C = 2 - A + B;
  const E = Math.floor(365.25 * (yCalc + 4716));
  const F = Math.floor(30.6001 * (mCalc + 1));

  return C + day + E + F + hour / 24.0 - 1524.5;
}
