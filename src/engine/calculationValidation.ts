/** Shared boundary validation with historical/DST IANA consistency check and FRD birth-date bounds. */
export class CalculationInputError extends Error {
  constructor(public code: string, message: string, public fields: string[] = []) { super(message); }
}
const fail = (code: string, message: string, fields: string[] = []): never => { throw new CalculationInputError(code, message, fields); };

export function validGregorianDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

function civilUtcMs(year: number, month: number, day: number, hour: number, minute: number, second: number): number {
  const dt = new Date(0);
  dt.setUTCFullYear(year, month - 1, day);
  dt.setUTCHours(hour, minute, second, 0);
  return dt.getTime();
}

function formatInIanaZone(utcDate: Date, timeZone: string): string {
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
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(utcDate)) parts[p.type] = p.value;
  const hr = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day} ${hr}:${parts.minute}:${parts.second}`;
}

export function validateBirthInput(input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('MISSING_REQUIRED_BIRTH_DATA', 'Supply birth data as an object.');
  const missing = ['birthDate', 'birthTime', 'latitude', 'longitude'].filter(k => input[k] === undefined || input[k] === null || input[k] === '');
  if (missing.length) fail('MISSING_REQUIRED_BIRTH_DATA', 'Birth date, time and coordinates are required; no defaults are substituted.', missing);
  if (!validGregorianDate(input.birthDate)) fail('INVALID_BIRTH_DATE', 'Use an existing Gregorian date in YYYY-MM-DD format.', ['birthDate']);

  const [y, m, d] = input.birthDate.split('-').map(Number);
  if (y < 1900) fail('INVALID_BIRTH_DATE', 'Birth year must be 1900 or later (supported range: 1900 to present).', ['birthDate']);

  if (typeof input.birthTime !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.birthTime)) {
    fail('INVALID_BIRTH_TIME', 'Use HH:MM[:SS], hours 00–23 and minutes/seconds 00–59.', ['birthTime']);
  }
  for (const [key, limit] of [['latitude', 90], ['longitude', 180]] as const) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || Math.abs(input[key]) > limit) {
      fail('INVALID_COORDINATES', `${key} must be a finite number within ±${limit}.`, [key]);
    }
  }
  if (typeof input.timezoneOffset !== 'number' || !Number.isFinite(input.timezoneOffset) || input.timezoneOffset < -12 || input.timezoneOffset > 14) {
    fail('INVALID_TIMEZONE', 'Supply the UTC offset in hours at the birth instant (−12 to +14).', ['timezoneOffset']);
  }

  const rawTime = input.birthTime.length === 5 ? `${input.birthTime}:00` : input.birthTime;
  const [hh, mm, ss] = rawTime.split(':').map(Number);
  const birthUtcMs = civilUtcMs(y, m, d, hh, mm, ss) - Math.round(input.timezoneOffset * 3600000);
  if (birthUtcMs > Date.now() + 60000) {
    fail('INVALID_BIRTH_DATE', 'Birth date and time cannot be in the future.', ['birthDate']);
  }

  // If an explicit IANA timezone was also supplied alongside timezoneOffset, verify historical/DST consistency
  if (input.timezone !== undefined && input.timezone !== null && input.timezone !== '') {
    if (typeof input.timezone !== 'string' || input.timezone === 'Local') {
      fail('INVALID_TIMEZONE', 'Supply a valid IANA timezone identifier.', ['timezone']);
    }
    if (input.timezone !== 'UTC_OFFSET') {
      try {
        const formatted = formatInIanaZone(new Date(birthUtcMs), input.timezone);
        if (formatted !== `${input.birthDate} ${rawTime}`) {
          fail(
            'INVALID_TIMEZONE',
            `Supplied UTC offset (${input.timezoneOffset}) does not match ${input.timezone} at ${input.birthDate} ${rawTime} (check historical/DST offset or nonexistent spring-forward hour).`,
            ['timezoneOffset', 'timezone']
          );
        }
      } catch (err) {
        if (err instanceof CalculationInputError) throw err;
        fail('INVALID_TIMEZONE', 'Unknown or unsupported IANA timezone.', ['timezone']);
      }
    }
  }

  if (input.ayanamsaType !== undefined && !['TRUE_LAHIRI', 'KP', 'RAMAN'].includes(input.ayanamsaType)) fail('INVALID_AYANAMSA', 'Choose TRUE_LAHIRI, KP or RAMAN.');
  if (input.birthTimeCertainty !== undefined && !['EXACT', 'APPROXIMATE', 'UNKNOWN'].includes(input.birthTimeCertainty)) fail('INVALID_BIRTH_TIME_CERTAINTY', 'Choose EXACT, APPROXIMATE or UNKNOWN.');
  if (input.birthTimeCertainty === 'UNKNOWN') fail('BIRTH_TIME_UNKNOWN', 'Exact ascendant and divisional charts are unavailable without a birth time.');
  if (input.cityName !== undefined && typeof input.cityName !== 'string') fail('INVALID_LOCATION', 'cityName must be text.');
}

export function validateMilestones(milestones: unknown, birthDate?: string): void {
  if (!Array.isArray(milestones) || milestones.length > 100) fail('INVALID_MILESTONES', 'Supply an array of at most 100 actual milestones.');
  const seen = new Set<string>();
  for (const ms of milestones as any[]) {
    if (!ms || !['CAREER_PROMOTION', 'MARRIAGE_UNION', 'RELOCATION_TRAVEL', 'HEALTH_PHYSICAL', 'FINANCIAL_ACQUISITION'].includes(ms.type)
      || !['HIGH', 'MEDIUM'].includes(ms.confidence) || typeof ms.approxDate !== 'string'
      || !validGregorianDate(ms.approxDate.length === 7 ? ms.approxDate + '-01' : ms.approxDate)) fail('INVALID_MILESTONES', 'Each milestone needs a supported type, HIGH/MEDIUM confidence and valid YYYY-MM[-DD] date.');
    const key = ms.type + ':' + ms.approxDate;
    if (seen.has(key)) fail('DUPLICATE_MILESTONE', 'Do not submit the same event twice.');
    seen.add(key);
    const precision = ms.approxDate.length === 7 ? 7 : 10;
    if ((birthDate && ms.approxDate < birthDate.slice(0, precision)) || ms.approxDate > new Date().toISOString().slice(0, precision)) fail('INVALID_MILESTONES', 'Events must occur between birth and today.');
  }
}

export const TIMEZONE_LIMITATION = 'Caller-supplied UTC offset; historical IANA timezone/DST conversion is not implemented on raw offset-only requests. Uncertain birth times do not establish exact ascendants or divisional charts.';
