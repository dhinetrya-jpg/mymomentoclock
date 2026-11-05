import { validateBirthInput, validateMilestones, CalculationInputError } from './calculationValidation';
import { AyanamsaType } from './astroMath';
/**
 * Legacy BTR compatibility contract — execution unavailable until Dasha is verified
 * Evaluates candidate charts using 15-second discrete steps across a ±15-minute window
 * (120 candidate time evaluations) to align micro-divisional charts (D-9, D-60)
 * and Vimshottari Dasha sub-periods against verified real-world lifecycle milestones.
 */

import { ChartCalculationResult } from './astroMath';

export interface LifeMilestone {
  id: string;
  type: 'CAREER_PROMOTION' | 'MARRIAGE_UNION' | 'RELOCATION_TRAVEL' | 'HEALTH_PHYSICAL' | 'FINANCIAL_ACQUISITION';
  title: string;
  approxDate: string; // YYYY-MM or YYYY-MM-DD
  description: string;
  confidence: 'HIGH' | 'MEDIUM';
}

export interface CandidateEvaluation {
  offsetSeconds: number;
  testTimeStr: string;
  concordanceScore: number; // 0.0 - 1.0
  d60MatchDetails: string;
  d9MatchDetails: string;
  dashaMatchDetails: string;
}

export interface RectificationResult {
  assessment_status: 'HEURISTIC_CANDIDATE';
  method_id: string;
  method_version: string;
  candidate_birth_time: string;
  candidate_fit_score: number;
  candidate_fit_score_definition: string;
  milestone_count: number;
  independent_validation_status: 'NOT_PERFORMED';
  limitations: string[];
  /** Legacy aliases below describe a candidate, not a verified time. */
  originalInputTime: string;
  rectifiedTrueTime: string;
  offsetSeconds: number;
  concordanceRating: number; // e.g. 0.88 - 0.94
  testedCandidatesCount: number;
  bestCandidate: CandidateEvaluation;
  topCandidates: CandidateEvaluation[];
  rectifiedChart: ChartCalculationResult;
  verificationSummary: string;
}

export const SAMPLE_MILESTONES: LifeMilestone[] = [
  {
    id: 'm1',
    type: 'CAREER_PROMOTION',
    title: 'First Major Senior Role / Career Breakthrough',
    approxDate: '2016-08-15',
    description: 'Promoted to lead engineer / key organizational mandate',
    confidence: 'HIGH',
  },
  {
    id: 'm2',
    type: 'MARRIAGE_UNION',
    title: 'Marriage / Long-term Life Partnership',
    approxDate: '2019-11-20',
    description: 'Entered formal matrimonial union / life co-habitation',
    confidence: 'HIGH',
  },
  {
    id: 'm3',
    type: 'RELOCATION_TRAVEL',
    title: 'Major City Relocation / Foreign Travel',
    approxDate: '2021-04-10',
    description: 'Relocated domicile across borders or major metropolitan shift',
    confidence: 'MEDIUM',
  },
  {
    id: 'm4',
    type: 'FINANCIAL_ACQUISITION',
    title: 'Major Asset / First Property Investment',
    approxDate: '2023-10-24',
    description: 'Acquired residential property or long-term financial cornerstone',
    confidence: 'HIGH',
  }
];

/**
 * Iterates through candidate times in 15-second intervals across ±15 minutes ([-900s, +900s])
 * Computes concordance with milestones.
 */
export function executeBirthTimeRectification(
  birthDate: string,
  rawTime: string,
  latitude: number,
  longitude: number,
  _cityName: string,
  milestones: LifeMilestone[] = [],
  searchWindowMinutes: number = 15,
  intervalSeconds: number = 15,
  timezoneOffset: number = Number.NaN,
  ayanamsaType: AyanamsaType = AyanamsaType.TRUE_LAHIRI
): RectificationResult {
  validateBirthInput({birthDate, birthTime: rawTime, latitude, longitude, timezoneOffset, ayanamsaType});
  validateMilestones(milestones,birthDate);
  if (!milestones.length) throw new CalculationInputError('MILESTONES_REQUIRED', 'Supply actual lifecycle milestones; sample events are never substituted.');
  if (!Number.isFinite(searchWindowMinutes) || searchWindowMinutes <= 0 || searchWindowMinutes > 15 || !Number.isFinite(intervalSeconds) || intervalSeconds < 15) throw new CalculationInputError('INVALID_SEARCH_WINDOW', 'Use a positive search window up to 15 minutes and interval of at least 15 seconds.');
  throw new CalculationInputError('DASHA_CALCULATION_UNAVAILABLE','Birth-time rectification is unavailable because its Dasha method has not been verified. Your original time is preserved.');
}
