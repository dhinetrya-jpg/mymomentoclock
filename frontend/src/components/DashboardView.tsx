import React, { useState } from 'react';
import { ChartCalculationResult } from '../engine/astroMath';
import { ConflictResolutionResult } from '../engine/conflictResolver';
import { DiwaliCountdown } from './DiwaliCountdown';
import { DeshaKalaPatraAI } from './DeshaKalaPatraAI';
interface DashboardViewProps {chart:ChartCalculationResult;resolution:ConflictResolutionResult;onOpenConflictModal:()=>void;onOpenBtrModal:()=>void;onNavigateToProsperityKit?:()=>void;}
export const DashboardView:React.FC<DashboardViewProps>=({chart,resolution,onOpenConflictModal,onOpenBtrModal,onNavigateToProsperityKit})=>{
 const[division,setDivision]=useState<'D1'|'D2'|'D9'|'D60'>('D1');
 return <div className="space-y-8 animate-fade-in">
  <p role="status" className="text-xs text-amber-200">Analytical chart preview; independent accuracy validation has not been performed. Scores are unavailable, and personal timing is unavailable. Do not use this preview for financial, health or other outcome decisions.</p>
  <DiwaliCountdown chart={chart} onExploreProsperityKit={onNavigateToProsperityKit}/>
  <section className="rounded-xl border border-rose-950/70 bg-[#1a050a] p-5 space-y-4">
   <h1 className="font-serif text-2xl text-amber-300">Natal chart preview</h1>
   <p className="text-xs">{chart.inputProfile.cityName} · {chart.inputProfile.birthDate} · {chart.inputProfile.birthTime} · UTC offset {chart.inputProfile.timezoneOffset}</p>
   <p>Lagna: {chart.ascendantSignName} ({chart.ascendantDegree.toFixed(2)}°)</p>
   <p className="text-xs">Ayanamsa: {chart.systemMetadata.ayanamsaApplied}; caller-offset mode. Birth-time uncertainty affects these placements.</p>
   <div className="flex flex-wrap gap-3"><button className="rounded bg-rose-950 p-3" onClick={onOpenBtrModal}>Birth time preview (BTR)</button><button className="rounded bg-amber-950 p-3" onClick={onOpenConflictModal}>Conflict calculation status</button></div>
  </section>
  <section className="rounded-xl border border-rose-950/70 bg-[#22070e] p-5 overflow-x-auto">
   <h2 className="font-serif text-lg text-amber-300">Planetary position preview</h2>
   <table className="mt-4 w-full text-sm"><thead><tr><th className="text-left">Planet</th><th>Sign</th><th>Longitude</th><th>House</th></tr></thead><tbody>{chart.planets.map(p=><tr key={p.name} className="border-t border-rose-950"><td className="py-2">{p.name}</td><td className="text-center">{p.signName}</td><td className="text-center">{p.longitude.toFixed(2)}°</td><td className="text-center">{p.houseNumber}</td></tr>)}</tbody></table>
  </section>
  <section className="rounded-xl border border-rose-950/70 bg-[#22070e] p-5">
   <h2 className="font-serif text-lg text-amber-300">Divisional chart preview</h2>
   <div className="flex flex-wrap gap-2 my-4">{(['D1','D2','D9','D60'] as const).map(d=><button aria-pressed={division===d} key={d} onClick={()=>setDivision(d)} className="rounded border border-rose-900 px-4 py-2">{d}</button>)}</div>
   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{chart.planets.map(p=><div key={p.name} className="rounded border border-rose-900 p-3 text-xs"><strong>{p.name}</strong><p>{division==='D1'?p.signName:division==='D2'?chart.divisionalCharts.d2.signs[p.name]:division==='D9'?chart.divisionalCharts.d9.navamshaPlacements[p.name]?.sign:chart.divisionalCharts.d60.shashtyamsas.find(s=>s.planet===p.name)?.deityName}</p></div>)}</div>
  </section>
  <section className="rounded-xl border border-rose-950/70 p-5"><h2 className="text-amber-300">Dasha calculation unavailable</h2><p className="text-xs">Analytical lunar inputs; no validated rectification or outcome prediction.</p><p>No sub-periods or candidate fit scores are generated without a verified method.</p></section>
  <DeshaKalaPatraAI chart={chart} resolution={resolution}/>
 </div>;
};
