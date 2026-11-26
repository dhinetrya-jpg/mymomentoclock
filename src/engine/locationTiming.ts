import { MAJOR_CITIES_MUHURAT } from './diwaliData';

export const LOCATION_TIMING_PATH = '/api/v1/timing/location-only';
export const LOCATION_TIMING_CITIES = Object.entries(MAJOR_CITIES_MUHURAT).map(
  ([city, entry]) => ({ city, timezone: entry.timezone }),
);
export const LOCATION_TIMING_ACTIVITIES = [
  { id: 'general', label: 'General timing' },
  { id: 'interview', label: 'Interview' },
  { id: 'shop_opening', label: 'Shop opening' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'trading', label: 'Trading' },
  { id: 'property_purchase', label: 'Property purchase' },
  { id: 'property_sale', label: 'Property sale' },
] as const;

export type LocationActivity = typeof LOCATION_TIMING_ACTIVITIES[number]['id'];

// Match complete phrases so mixed requests and negated activities require a choice.
const guidedActivityPhrases: Partial<Record<string, LocationActivity>> = {
  'interview': 'interview',
  'job interview': 'interview',
  'i have a job interview': 'interview',
  'shop opening': 'shop_opening',
  'open a shop': 'shop_opening',
  'open my shop': 'shop_opening',
  'proposal': 'proposal',
  'marriage proposal': 'proposal',
  'propose marriage': 'proposal',
  'trading': 'trading',
  'stock trading': 'trading',
  'trade stocks': 'trading',
  'property purchase': 'property_purchase',
  'buy a property': 'property_purchase',
  'buy a house': 'property_purchase',
  'property sale': 'property_sale',
  'sell a property': 'property_sale',
  'sell my property': 'property_sale',
  'sell my house': 'property_sale',
};

export function suggestLocationActivity(text: string): LocationActivity | undefined {
  const phrase = text.trim().toLowerCase().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
  return Object.hasOwn(guidedActivityPhrases, phrase) ? guidedActivityPhrases[phrase] : undefined;
}

export interface LocationTimingRequest {
  schema_version: 1;
  city: string;
  date: string;
  activity: LocationActivity;
}

export interface LocationTimingResult {
  schema_version: 1;
  mode: 'LOCATION_ONLY';
  status: 'UNAVAILABLE';
  code: 'LOCATION_RULES_UNAVAILABLE';
  city: string;
  date: string;
  timezone: string;
  activity: LocationActivity;
  windows: [];
}

export async function checkLocationTiming(
  request: LocationTimingRequest, signal?: AbortSignal,
): Promise<LocationTimingResult> {
  const response = await fetch(LOCATION_TIMING_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    cache: 'no-store',
    signal,
  });
  const result = await response.json();
  const location = LOCATION_TIMING_CITIES.find(option => option.city === request.city);
  if (!location || response.status !== 503 || result?.schema_version !== 1 ||
      result.mode !== 'LOCATION_ONLY' || result.status !== 'UNAVAILABLE' ||
      result.code !== 'LOCATION_RULES_UNAVAILABLE' || result.city !== request.city ||
      result.date !== request.date || result.activity !== request.activity ||
      result.timezone !== location.timezone || !Array.isArray(result.windows) || result.windows.length !== 0) {
    throw new Error('Location timing response unavailable.');
  }
  return result;
}
