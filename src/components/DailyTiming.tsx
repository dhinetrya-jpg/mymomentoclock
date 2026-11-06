import React,{useEffect,useRef,useState} from 'react';
import {calculateDailyTiming,TIMING_ACTIVITIES,TIMING_RULE_VERSION,type TimingRequest,type TimingResult} from '../engine/timingClient';

function localTime(instant:string,zone:string){return new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(new Date(instant));}
export function TimingTimeline({result}:{result:TimingResult}){
 const day=result.day;
 if(!day)return <p className="text-rose-200" role="status">No calculated day or windows are available.</p>;
 const start=Date.parse(day.start),end=Date.parse(day.end),span=end-start;
 if(!Number.isFinite(span)||span<=0)return <p role="alert">The calculated day is unavailable.</p>;
 return <section aria-label="Daily timing results" className="space-y-4">
  <h3 className="font-serif text-lg text-amber-300">{day.date} · {day.timezone}</h3>
  <p>00:00–24:00 local clock · {day.elapsed_seconds/3600} elapsed hours. Clock changes may repeat or skip an hour.</p>
  <div role="img" aria-label={`Local-day timeline, ${day.elapsed_seconds/3600} elapsed hours, ${result.windows.length} provisional windows`} className="relative h-16 rounded-lg border border-rose-700 bg-rose-950/40 overflow-hidden">
   {result.windows.map((w,i)=>{const a=Date.parse(w.start),b=Date.parse(w.end);if(!Number.isFinite(a)||!Number.isFinite(b)||a<start||b>end||a>=b)return null;return <div key={`${w.start}-${w.end}`} title={`Rank ${w.rank}: ${localTime(w.start,day.timezone)} to ${localTime(w.end,day.timezone)}`} className="absolute top-3 h-7 min-w-px rounded border border-amber-200 bg-amber-500 text-neutral-950 text-xs text-center" style={{left:`${(a-start)/span*100}%`,width:`${(b-a)/span*100}%`}}>{i+1}</div>;})}
  </div>
  <div className="flex justify-between text-xs" aria-hidden="true"><span>00:00</span><span>End of local day</span></div>
  {!result.windows.length?<p role="status">No candidate windows. No favorable time is inferred.</p>:<ol className="space-y-3">{result.windows.map(w=><li key={`${w.start}-${w.end}`} className="rounded-lg border border-rose-800 p-3 break-words"><h4 className="text-amber-200">Rank {w.rank} · {localTime(w.start,day.timezone)}–{localTime(w.end,day.timezone)}</h4><p>{w.duration_seconds/60} minutes · provisional traditional classification</p><ul className="list-disc pl-5">{w.explanations.map((ex,i)=><li key={i}>{ex}</li>)}</ul></li>)}</ol>}
 </section>;
}
export function DailyTiming(){
 const [certainty,setCertainty]=useState('EXACT'),[busy,setBusy]=useState(false),[result,setResult]=useState<TimingResult|null>(null),[error,setError]=useState('');
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setError('');setResult(null);setBusy(true);
  const data=new FormData(event.currentTarget),str=(k:string)=>String(data.get(k)||''),num=(k:string)=>Number(str(k));
  const request:TimingRequest={schema_version:1,birth:{date:str('birth-date'),certainty:certainty as TimingRequest['birth']['certainty'],timezone:str('birth-zone'),latitude:num('birth-lat'),longitude:num('birth-lon'),...(certainty==='UNKNOWN'?{}:{time:str('birth-time'),...(str('birth-offset')?{utc_offset:num('birth-offset')}:{})}),...(certainty==='APPROXIMATE'?{uncertainty_minutes:num('uncertainty')}:{})},target:{date:str('target-date'),timezone:str('target-zone'),latitude:num('target-lat'),longitude:num('target-lon')},activity:str('activity') as TimingRequest['activity'],rule_version:TIMING_RULE_VERSION,ephemeris_mode:'SWISS_FILE'};
  const current=new AbortController();controller.current?.abort();controller.current=current;const timeout=setTimeout(()=>current.abort(),8000);
  try{const value=await calculateDailyTiming(request,current.signal);if(!current.signal.aborted)setResult(value);}catch{if(controller.current===current)setError('Timing is unavailable. Check your details or try again. No recommendation has been created.');}finally{clearTimeout(timeout);if(controller.current===current){controller.current=null;setBusy(false);}}
 };
 const field=(name:string,label:string,type='text',props:React.InputHTMLAttributes<HTMLInputElement>={})=><label className="flex flex-col gap-1" key={name}><span>{label}</span><input name={name} type={type} required className="w-full rounded border border-rose-700 bg-[#19060b] p-2 text-white" {...props}/></label>;
 return <section aria-labelledby="daily-title" className="mx-auto max-w-3xl space-y-5 text-rose-100">
  <h2 id="daily-title" className="font-serif text-2xl text-amber-300">Personalized daily timing</h2>
  <p role="status" className="rounded-lg border border-amber-600 p-3">Personal guidance is unavailable while astronomical inputs and activity rules await independent review.</p>
  <p className="text-sm">Enter details only for this request. They are not saved to a profile or sent to analytics. Coordinates and IANA timezones are explicit; no location is guessed.</p>
  <form onSubmit={submit} onChange={()=>{setResult(null);setError('');}} className="space-y-4">
   <fieldset disabled={busy} className="rounded-lg border border-rose-800 p-4"><legend>Birth details</legend><div className="grid gap-3 sm:grid-cols-2">
    {field('birth-date','Birth date','date',{min:'1900-01-01',max:'2100-12-31'})}
    <label className="flex flex-col gap-1">Birth-time certainty<select aria-label="Birth-time certainty" name="certainty" value={certainty} onChange={e=>setCertainty(e.target.value)} className="rounded border border-rose-700 bg-[#19060b] p-2"><option value="EXACT">Known time</option><option value="APPROXIMATE">Approximate time</option><option value="UNKNOWN">Unknown time</option></select></label>
    {certainty!=='UNKNOWN'&&field('birth-time','Birth local time','time',{step:1})}
    {certainty!=='UNKNOWN'&&field('birth-offset','Birth UTC offset (optional, hours)','number',{required:false,min:-12,max:14,step:'any',placeholder:'For a repeated DST time, e.g. -4 or -5'})}
    {certainty==='APPROXIMATE'&&field('uncertainty','Uncertainty (± minutes)','number',{min:1,max:1440,step:1})}
    {field('birth-zone','Birth IANA timezone','text',{placeholder:'Asia/Kolkata',maxLength:100})}
    {field('birth-lat','Birth latitude','number',{min:-90,max:90,step:'any'})}{field('birth-lon','Birth longitude','number',{min:-180,max:180,step:'any'})}
   </div><p className="mt-2 text-xs">For a repeated DST birth time, supply its recorded UTC offset. Missing or inconsistent offsets are rejected rather than guessed.</p></fieldset>
   <fieldset disabled={busy} className="rounded-lg border border-rose-800 p-4"><legend>Activity date and location</legend><div className="grid gap-3 sm:grid-cols-2">
    {field('target-date','Activity date','date',{min:'2000-01-01',max:'2100-12-31'})}{field('target-zone','Activity IANA timezone','text',{placeholder:'America/Toronto',maxLength:100})}
    {field('target-lat','Activity latitude','number',{min:-90,max:90,step:'any'})}{field('target-lon','Activity longitude','number',{min:-180,max:180,step:'any'})}
    <label className="flex flex-col gap-1">Activity<select aria-label="Activity" name="activity" className="w-full rounded border border-rose-700 bg-[#19060b] p-2">{TIMING_ACTIVITIES.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
   </div></fieldset>
   <p className="text-sm">Financial categories provide traditional context only, with no guaranteed profit, investment advantage or scientific predictive claim.</p>
   <button disabled={busy} className="rounded bg-amber-500 px-4 py-2 font-semibold text-neutral-950 disabled:opacity-50">{busy?'Checking timing evidence…':'Check daily timing'}</button>
  </form>
  {error&&<p role="alert">{error}</p>}
  {result&&<div className="space-y-4" aria-live="polite"><p role="status" className="rounded border border-amber-500 p-3">{result.status==='PROVISIONAL'?'Synthetic algorithm demonstration only — not personal guidance.':result.status==='INSUFFICIENT_EVIDENCE'?'Insufficient evidence to calculate personal windows.':'Personal timing remains unavailable.'}</p><TimingTimeline result={result}/><ul className="list-disc pl-5">{result.limitations.map((v,i)=><li key={i}>{v}</li>)}</ul><p className="break-words text-xs">{result.provenance.calculation_version} · {result.provenance.rule_version} · requested {result.provenance.requested_ephemeris_mode} · actual {result.provenance.ephemeris_mode} · {result.provenance.accuracy_status} · {result.provenance.calculated_at}</p></div>}
 </section>;
}
