import React,{useRef,useState,useEffect} from 'react';

type Certainty='EXACT'|'APPROXIMATE'|'RANGE'|'UNKNOWN';
type Factor={name:string;classification:'OBSERVED_STABLE_NOT_PROVEN'|'OBSERVED_VARIABLE'|'UNRESOLVED';observed_values:string[];note:string};
type Result={schema_version:number;status:string;contract_version:string;start_utc:string;end_utc:string;sample_count:number;factors:Factor[];transition_brackets:Array<{factor:string;from_value:string;to_value:string;from_utc:string;to_utc:string; evidence:string;intermediate_value?:string}>;limitations:string[];customer_timing_authorized:false;btr_status:string;house_system:string};
const label=(value:string)=>value==='OBSERVED_VARIABLE'?'Varies in samples':value==='UNRESOLVED'?'Unresolved':'Same in samples — not proven stable';
const classes=(value:string)=>value==='OBSERVED_VARIABLE'?'border-amber-500/70':'border-rose-900/60';
const rashiNames=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const meaning=(factor:string,value:string)=>{
 if(value==='UNAVAILABLE')return 'Not available';
 if(factor.endsWith('.rashi_chalit_difference'))return value==='true'?'Different placements':value==='false'?'Same house placement':value;
 const number=Number(value);
 if(!Number.isInteger(number))return value;
 if(factor.endsWith('.rashi')||factor.endsWith('.d9'))return rashiNames[number]??value;
 if(factor.includes('house'))return 'House '+number;
 if(factor.endsWith('.rashi_chalit_difference'))return value==='true'?'Different placements':'Same house placement';
 return value;
};
const factorTitle=(key:string)=>key.split('.').map(v=>v.replace(/_/g,' ')).join(' — ');


export function BirthTimeExplorer(){
 const [certainty,setCertainty]=useState<Certainty>('APPROXIMATE');
 const [date,setDate]=useState('');
 const [clock,setClock]=useState('');
 const [uncertainty,setUncertainty]=useState(30);
 const [timezone,setTimezone]=useState('');
 const [lat,setLat]=useState('');
 const [lon,setLon]=useState('');
 const [offset,setOffset]=useState('');
 const [earliest,setEarliest]=useState('');
 const [latest,setLatest]=useState('');
 const [latestDate,setLatestDate]=useState('');
 const [earliestOffset,setEarliestOffset]=useState('');
 const [latestOffset,setLatestOffset]=useState('');
 const [result,setResult]=useState<Result|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [showAll,setShowAll]=useState(false);
 const abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>abort.current?.abort(),[]);
 const update=()=>{setResult(null);setError('')};
 const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();abort.current?.abort();setResult(null);setError('');setBusy(true);
  const c=new AbortController();abort.current=c;
  const timeout=setTimeout(()=>c.abort(),12000);
  const request={schema_version:1,birth_date:date,certainty,timezone,latitude:Number(lat),longitude:Number(lon),
   ...(certainty==='RANGE'?{earliest_time:earliest,latest_time:latest,...(latestDate?{latest_date:latestDate}:{}),...(earliestOffset?{earliest_utc_offset:Number(earliestOffset)}:{}),...(latestOffset?{latest_utc_offset:Number(latestOffset)}:{})}:certainty==='UNKNOWN'?{}:{birth_time:clock,...(offset?{utc_offset:Number(offset)}:{})}),
   ...(certainty==='APPROXIMATE'?{uncertainty_minutes:uncertainty}:{})};
  try{
   const res=await fetch('/api/v1/f01/explore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:c.signal,cache:'no-store'});
   const body=await res.json();
   if(!res.ok)throw Error(typeof body.code==='string'?body.code:'F01_UNAVAILABLE');
   if(body.status!=='COMPUTED_UNVERIFIED'||body.customer_timing_authorized!==false||body.btr_status!=='UNAVAILABLE_UNVALIDATED_DASHA_METHOD'||!Array.isArray(body.factors)||!Array.isArray(body.transition_brackets)||!Array.isArray(body.limitations))throw Error('INVALID_F01_RESPONSE');
   if(!c.signal.aborted)setResult(body);
  }catch(e){if(!c.signal.aborted)setError((e as Error).message)}finally{clearTimeout(timeout);if(abort.current===c){abort.current=null;setBusy(false)}}
 };
 const inputClass='w-full rounded-lg border border-rose-700 bg-[#19060b] px-3 py-2 text-rose-100';
 return <section aria-labelledby="f01-title" className="mx-auto max-w-4xl space-y-5 text-rose-100">
  <header className="space-y-2"><h1 id="f01-title" className="font-serif text-2xl text-amber-300">Birth-Time Uncertainty Explorer</h1>
  <p className="text-sm">Compare possible Rashi and Sripati Bhava placements. This does not estimate your actual birth time, verify astrology predictions or authorize auspicious-time recommendations.</p></header>
  <form onSubmit={submit} onChange={update} className="space-y-4">
   <fieldset disabled={busy} className="grid grid-cols-1 gap-4 rounded-xl border border-rose-900 p-4 sm:grid-cols-2">
    <legend className="px-2 text-amber-200">Birth details</legend>
    <label className="space-y-1 text-sm"><span className="block">Birth date</span><input className={inputClass} type="date" min="1900-01-01" max="2100-12-31" required value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label className="space-y-1 text-sm"><span className="block">Birth-time knowledge</span><select className={inputClass} value={certainty} onChange={e=>setCertainty(e.target.value as Certainty)}><option value="EXACT">Recorded time (not independently verified)</option><option value="APPROXIMATE">Approximate time ± minutes</option><option value="RANGE">Known earliest / latest range</option><option value="UNKNOWN">Unknown — entire local date</option></select></label>
    {certainty!=='UNKNOWN'&&certainty!=='RANGE'&&<label className="space-y-1 text-sm"><span className="block">Recorded local time</span><input type="time" required className={inputClass} value={clock} onChange={e=>setClock(e.target.value)}/></label>}
    {certainty==='APPROXIMATE'&&<label className="space-y-1 text-sm"><span className="block">Uncertainty (± minutes)</span><input className={inputClass} type="number" required min={1} max={1440} step={1} value={uncertainty} onChange={e=>setUncertainty(Number(e.target.value))}/></label>}
    {certainty!=='UNKNOWN'&&certainty!=='RANGE'&&<label className="space-y-1 text-sm"><span className="block">UTC offset in hours (optional; required for repeated DST hour)</span><input className={inputClass} type="number" min={-12} max={14} step="any" placeholder="e.g. -4 or -5" value={offset} onChange={e=>setOffset(e.target.value)}/></label>}
        {certainty==='RANGE'&&<>
     <label className="space-y-1 text-sm"><span className="block">Earliest birth time</span><input className={inputClass} type="time" value={earliest} onChange={e=>setEarliest(e.target.value)} required/></label>
     <label className="space-y-1 text-sm"><span className="block">Latest birth time</span><input className={inputClass} type="time" value={latest} onChange={e=>setLatest(e.target.value)} required/></label>
     <label className="space-y-1 text-sm"><span className="block">Latest date (optional, if next day)</span><input className={inputClass} type="date" value={latestDate} onChange={e=>setLatestDate(e.target.value)}/></label>
     <label className="space-y-1 text-sm"><span className="block">Earliest UTC offset (if DST fold)</span><input className={inputClass} type="number" min={-12} max={14} step="any" value={earliestOffset} onChange={e=>setEarliestOffset(e.target.value)}/></label>
     <label className="space-y-1 text-sm"><span className="block">Latest UTC offset (if DST fold)</span><input className={inputClass} type="number" min={-12} max={14} step="any" value={latestOffset} onChange={e=>setLatestOffset(e.target.value)}/></label>
    </>}
<label className="space-y-1 text-sm"><span className="block">Historical IANA timezone</span><input className={inputClass} required maxLength={100} value={timezone} onChange={e=>setTimezone(e.target.value)}/></label>
    <label className="space-y-1 text-sm"><span className="block">Birthplace latitude</span><input className={inputClass} type="number" min={-89.9999} max={89.9999} step="any" required value={lat} onChange={e=>setLat(e.target.value)}/></label>
    <label className="space-y-1 text-sm"><span className="block">Birthplace longitude</span><input className={inputClass} type="number" min={-180} max={180} step="any" required value={lon} onChange={e=>setLon(e.target.value)}/></label>
   </fieldset>
   <p className="text-xs text-rose-200/80">Birthplace is not inferred from your current device location. Inputs are submitted for this calculation only; this screen does not save a profile.</p>
   <button disabled={busy} className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-neutral-950 disabled:opacity-50">{busy?'Inspecting possible charts…':'Explore birth-time possibilities'}</button>
  </form>
  {error&&<div role="alert" className="rounded-lg border border-amber-600 p-4">Unable to calculate: {error}. Checked configurations or astronomical data may be unavailable. No estimate was substituted.</div>}
  {result&&<div aria-live="polite" className="space-y-4">
   <div role="status" className="rounded-xl border border-amber-600 p-4"><strong>Exploratory calculation — not independently approved</strong><p className="text-sm mt-2">Sampled {result.sample_count} birth instants from {new Date(result.start_utc).toLocaleString()} to {new Date(result.end_utc).toLocaleString()}. These dates are shown in your browser timezone; calculations use UTC and the supplied birth timezone.</p><p className="mt-2 text-xs">House system: {result.house_system}. Rectification: unavailable. Personal timing: disabled.</p></div>
   <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-xl text-amber-300">Rashi and Bhava Chalit comparison</h2>
   <button type="button" className="rounded border border-rose-700 px-3 py-2 text-sm" onClick={()=>setShowAll(!showAll)}>{showAll?'Show observed changes only':'Show every sampled factor'}</button></div>
   <p className="text-sm">A matching value across the sample grid is not proof that it never changes between samples. Confirmed transitions and certified stability require additional independent validation.</p>
   {!showAll&&!result.factors.some(f=>f.classification==='OBSERVED_VARIABLE')&&<p className="text-sm">No sampled classification changes were observed. This does not prove a factor is stable. Use “Show every sampled factor” for details.</p>}
   <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
   {result.factors.filter(f=>showAll||f.classification==='OBSERVED_VARIABLE').slice(0,60).map(f=><article key={f.name} className={'rounded-xl border p-4 '+classes(f.classification)}><h3 className="font-medium break-words">{factorTitle(f.name)}</h3><p className="mt-1 text-sm text-amber-300">{label(f.classification)}</p><p className="mt-2 text-sm">Values observed: {f.observed_values.map(v=>meaning(f.name,v)).join(', ')}</p><p className="mt-2 text-xs text-rose-200/70">{f.note}</p></article>)}
   </div>
   <section className="rounded-lg border border-rose-900 p-4 space-y-2"><h2 className="font-serif text-lg text-amber-300">Observed change intervals</h2>
 <p className="text-sm">Changes are bracketed by the samples, not exact transition times. Unobserved changes remain possible.</p>
 {result.transition_brackets.length===0?<p>No changes observed. Stability is not proven.</p>:<ul className="space-y-1 text-sm">{result.transition_brackets.slice(0,60).map((t,i)=><li key={i}>{t.factor}: {t.from_value} to {t.to_value}, between {t.from_utc} and {t.to_utc}{t.intermediate_value?` (intermediate state: ${t.intermediate_value}; unresolved)` : ''}</li>)}</ul>}
 {result.transition_brackets.length>60&&<p>Additional brackets are omitted from this view.</p>}
 </section>
 <section className="rounded-lg border border-rose-900 p-4 space-y-2"><h2 className="font-serif text-lg text-amber-300">Limitations</h2><ul className="list-disc space-y-1 pl-5 text-sm">{result.limitations.map((v,i)=><li key={i}>{v}</li>)}</ul></section>
  </div>}
 </section>;
}
