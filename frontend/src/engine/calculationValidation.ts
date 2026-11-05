/** Shared boundary validation; no geocoding or historical timezone inference. */
export class CalculationInputError extends Error {
  constructor(public code: string, message: string, public fields: string[] = []) { super(message); }
}
const fail = (code: string, message: string, fields: string[] = []): never => { throw new CalculationInputError(code, message, fields); };
export function validGregorianDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split('-').map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= [31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
}
export function validateBirthInput(input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('MISSING_REQUIRED_BIRTH_DATA', 'Supply birth data as an object.');
  const missing = ['birthDate','birthTime','latitude','longitude'].filter(k => input[k] === undefined || input[k] === null || input[k] === '');
  if (missing.length) fail('MISSING_REQUIRED_BIRTH_DATA', 'Birth date, time and coordinates are required; no defaults are substituted.', missing);
  if (!validGregorianDate(input.birthDate)) fail('INVALID_BIRTH_DATE', 'Use an existing Gregorian date in YYYY-MM-DD format.');
  if (typeof input.birthTime !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.birthTime)) fail('INVALID_BIRTH_TIME', 'Use HH:MM[:SS], hours 00–23 and minutes/seconds 00–59.');
  for (const [key,limit] of [['latitude',90],['longitude',180]] as const) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || Math.abs(input[key]) > limit) fail('INVALID_COORDINATES', `${key} must be a finite number within ±${limit}.`, [key]);
  }
  if (typeof input.timezoneOffset !== 'number' || !Number.isFinite(input.timezoneOffset) || input.timezoneOffset < -12 || input.timezoneOffset > 14) fail('INVALID_TIMEZONE', 'Supply the UTC offset in hours at the birth instant (−12 to +14). Historical timezone conversion is not implemented.');
  if (input.ayanamsaType !== undefined && !['TRUE_LAHIRI','KP','RAMAN'].includes(input.ayanamsaType)) fail('INVALID_AYANAMSA', 'Choose TRUE_LAHIRI, KP or RAMAN.');
  if (input.birthTimeCertainty !== undefined && !['EXACT','APPROXIMATE','UNKNOWN'].includes(input.birthTimeCertainty)) fail('INVALID_BIRTH_TIME_CERTAINTY', 'Choose EXACT, APPROXIMATE or UNKNOWN.');
  if (input.birthTimeCertainty === 'UNKNOWN') fail('BIRTH_TIME_UNKNOWN', 'Exact ascendant and divisional charts are unavailable without a birth time.');
  if (input.cityName !== undefined && typeof input.cityName !== 'string') fail('INVALID_LOCATION', 'cityName must be text.');
}
export function validateMilestones(milestones: unknown): void {
  if (!Array.isArray(milestones) || milestones.length > 100) fail('INVALID_MILESTONES', 'Supply an array of at most 100 actual milestones.');
  for (const ms of milestones as any[]) {
    if (!ms || !['CAREER_PROMOTION','MARRIAGE_UNION','RELOCATION_TRAVEL','HEALTH_PHYSICAL','FINANCIAL_ACQUISITION'].includes(ms.type)
      || !['HIGH','MEDIUM'].includes(ms.confidence) || typeof ms.approxDate !== 'string'
      || !validGregorianDate(ms.approxDate.length === 7 ? ms.approxDate+'-01' : ms.approxDate)) fail('INVALID_MILESTONES', 'Each milestone needs a supported type, HIGH/MEDIUM confidence and valid YYYY-MM[-DD] date.');
  }
}
export const TIMEZONE_LIMITATION = 'Caller-supplied UTC offset; historical IANA timezone/DST conversion is not implemented. Uncertain birth times do not establish exact ascendants or divisional charts.';
