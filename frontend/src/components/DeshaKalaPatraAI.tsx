import React from 'react';
import { ChartCalculationResult } from '../engine/astroMath';
import { ConflictResolutionResult } from '../engine/conflictResolver';
export const DeshaKalaPatraAI:React.FC<{chart:ChartCalculationResult;resolution:ConflictResolutionResult}>=()=> <section className="rounded-xl border border-rose-900 bg-[#22070e] p-5 space-y-3"><h2 className="font-serif text-lg text-amber-300">Private AI explanation</h2><p role="status">Private chat is not available yet. Your birth details and questions are not sent to an AI provider.</p><button disabled className="rounded bg-rose-950 p-3 opacity-60">AI readings unavailable</button></section>;
