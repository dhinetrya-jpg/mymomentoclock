export const TIMING_VERSION='timing-v1';
export const TIMING_RULE_VERSION='timing-rules-v1';
export const TIMING_ACTIVITIES=[
 {id:'work',label:'Work, interviews and professional decisions'},
 {id:'purchases',label:'Purchases and important transactions'},
 {id:'travel',label:'Travel and journeys'},
 {id:'learning',label:'Learning, examinations and study'},
 {id:'family',label:'Family and personal occasions'},
 {id:'finance',label:'Financial planning and trading context'},
] as const;
export type TimingActivity=typeof TIMING_ACTIVITIES[number]['id'];
export interface TimingPlace {timezone:string;latitude:number;longitude:number}
export interface TimingRequest {
 schema_version:1;
 birth:TimingPlace&{date:string;time?:string;certainty:'EXACT'|'APPROXIMATE'|'UNKNOWN';utc_offset?:number;uncertainty_minutes?:number};
 target:TimingPlace&{date:string};activity:TimingActivity;rule_version:string;ephemeris_mode:'MOSHIER'|'SWISS_FILE'|'JPL';
}
export interface TimingWindow {start:string;end:string;duration_seconds:number;rank:number;rule_ids:string[];explanations:string[];classification:string}
export interface TimingResult {
 schema_version:1;status:'UNAVAILABLE'|'INSUFFICIENT_EVIDENCE'|'PROVISIONAL';code:string;activity:string;
 day?:{date:string;timezone:string;start:string;end:string;elapsed_seconds:number};windows:TimingWindow[];limitations:string[];
 provenance:{calculation_version:string;rule_version:string;ephemeris_mode:string;requested_ephemeris_mode:string;source:string;calculated_at:string;accuracy_status:string;release_authorized:false};
}
export async function calculateDailyTiming(request:TimingRequest,signal?:AbortSignal):Promise<TimingResult>{
 const response=await fetch('/api/v1/timing/daily',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),cache:'no-store',signal});
 const value=await response.json();
 if(![200,503].includes(response.status)||value?.schema_version!==1||!['UNAVAILABLE','INSUFFICIENT_EVIDENCE','PROVISIONAL'].includes(value.status)||!Array.isArray(value.windows)||value.provenance?.release_authorized!==false)throw Error('Timing data is unavailable. Check the input or try again.');
 // A fixture may only render as explicitly provisional. It can never be promoted to verified guidance.
 if(value.status==='PROVISIONAL'&&value.provenance?.accuracy_status!=='SYNTHETIC_NOT_ACCURACY_EVIDENCE')throw Error('Unverified timing response rejected.');
 if(value.status!=='PROVISIONAL'&&value.windows.length)throw Error('Unavailable response included unexpected windows.');
 const text=(s:unknown,max=2000)=>typeof s==='string'&&s.length<=max;
 if(value.activity!==request.activity||value.provenance.calculation_version!==TIMING_VERSION||value.provenance.rule_version!==request.rule_version||value.provenance.requested_ephemeris_mode!==request.ephemeris_mode||!text(value.provenance.source,200)||!Number.isFinite(Date.parse(value.provenance.calculated_at))||!text(value.provenance.ephemeris_mode,40)||!text(value.provenance.accuracy_status,80)||!Array.isArray(value.limitations)||value.limitations.length>32||!value.limitations.every((s:unknown)=>text(s))||value.windows.length>128)throw Error('Invalid timing contract.');
 const day=value.day;
 if(day&&(day.date!==request.target.date||day.timezone!==request.target.timezone||!Number.isFinite(Date.parse(day.start))||!Number.isFinite(Date.parse(day.end))||day.elapsed_seconds!==(Date.parse(day.end)-Date.parse(day.start))/1000||day.elapsed_seconds<72000||day.elapsed_seconds>100800))throw Error('Invalid day contract.');
 for(let i=0;i<value.windows.length;i++){const w=value.windows[i],a=Date.parse(w.start),b=Date.parse(w.end);if(!day||!Number.isFinite(a)||!Number.isFinite(b)||a>=b||a<Date.parse(day.start)||b>Date.parse(day.end)||w.duration_seconds!==(b-a)/1000||w.rank!==i+1||w.classification!=='PROVISIONAL_TRADITIONAL_FAVORABLE'||!Array.isArray(w.rule_ids)||w.rule_ids.length<1||w.rule_ids.length>64||!w.rule_ids.every((s:unknown)=>text(s,80))||!Array.isArray(w.explanations)||w.explanations.length>64||!w.explanations.every((s:unknown)=>text(s)))throw Error('Invalid window contract.');}
 return value;
}
