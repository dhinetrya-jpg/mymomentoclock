import React from 'react';
import {RvmEvaluationResult} from '../engine/rvmEngine';
export const RemediationView:React.FC<{rvmResult:RvmEvaluationResult}>=()=> <section className="rounded-xl border border-rose-900 bg-[#22070e] p-5"><h2 className="font-serif text-lg text-amber-300">Personal remedies unavailable</h2><p role="status">These recommendations have not been verified. No financial, health or personal outcome advice is generated.</p></section>;
