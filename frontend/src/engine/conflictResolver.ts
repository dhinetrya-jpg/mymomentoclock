import { ChartCalculationResult } from './astroMath';
export interface ConflictResolutionResult {
  assessment_status: 'UNAVAILABLE';
  conflict_status: 'CALCULATION_UNAVAILABLE';
  metric: string; category: 'Wealth'|'Health'|'Career'|'Relationship';
  netPotencyScore: null; netAuspiciousnessVector: null; conflictResolved: false;
  dominantVector: 'UNAVAILABLE'; suppressedVector: 'UNAVAILABLE'; mathematicalContext: string;
  allTriggeredYogas: never[]; verifiedGraphPayload?: never;
  graphTraversalStats: {planetNodesEvaluated: number;houseNodesEvaluated:number;yogaEdgesTraversed:number;executionLatencyMs:number};
}
/** No reviewed decision rules or authenticated graph evidence exist. Do not manufacture a modulator or score. */
export function resolvePillarConflict(_chart: ChartCalculationResult, category: ConflictResolutionResult['category'], _transitOverride?: number): ConflictResolutionResult {
  return {assessment_status:'UNAVAILABLE',conflict_status:'CALCULATION_UNAVAILABLE',metric:'unavailable',category,
    netPotencyScore:null,netAuspiciousnessVector:null,conflictResolved:false,dominantVector:'UNAVAILABLE',suppressedVector:'UNAVAILABLE',
    mathematicalContext:'Personal decision rules and graph evidence have not been verified.',allTriggeredYogas:[],
    graphTraversalStats:{planetNodesEvaluated:0,houseNodesEvaluated:0,yogaEdgesTraversed:0,executionLatencyMs:0}};
}
