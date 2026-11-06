import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import express from 'express';
import {readFileSync} from 'node:fs';
import {createTimingGateway,validTimingRequest,timingGatewayFromEnvironment,type TimingTransport} from '../../server/timingBoundary';
import {DailyTiming,TimingTimeline} from '../../src/components/DailyTiming';
import {TIMING_ACTIVITIES,type TimingRequest,type TimingResult} from '../../src/engine/timingClient';
const request:TimingRequest={schema_version:1,birth:{date:'2000-01-01',time:'12:00',certainty:'EXACT',timezone:'Asia/Kolkata',latitude:22.57,longitude:88.36},target:{date:'2026-03-08',timezone:'America/New_York',latitude:40.71,longitude:-74},activity:'work',rule_version:'timing-rules-v1',ephemeris_mode:'MOSHIER'};
async function serve(run:(base:string)=>Promise<void>,transport?:TimingTransport){const app=express();app.use(express.json({limit:'64kb'}));app.use('/api/v1/timing',createTimingGateway(transport));const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));try{await run('http://127.0.0.1:'+(server.address() as any).port);}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}}
const post=(base:string,body:unknown)=>fetch(base+'/api/v1/timing/daily',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
for(const activity of TIMING_ACTIVITIES)test(`versioned activity ${activity.id} cannot activate personal results`,()=>{assert.ok(validTimingRequest({...request,activity:activity.id}));});
test('strict request schema rejects profiles, facts, approval flags and invalid civil data',()=>{
 for(const b of [{...request,customer_id:'other'},{...request,facts:[]},{...request,release_authorized:true},{...request,ephemeris_mode:'BROWSER'},{...request,rule_version:'unapproved'},{...request,target:{...request.target,date:'2026-02-30'}},{...request,birth:{...request.birth,latitude:91}},{...request,birth:{...request.birth,time:'25:00'}},{...request,birth:{...request.birth,timezone:'Local'}},{...request,birth:{...request.birth,certainty:'APPROXIMATE'}}])assert.equal(validTimingRequest(b),false);
});
test('default gateway always returns typed unavailable without personal echoes',()=>serve(async base=>{
 const r=await post(base,request);assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');const b=await r.json();assert.equal(b.status,'UNAVAILABLE');assert.deepEqual(b.windows,[]);assert.equal(b.provenance.release_authorized,false);assert.doesNotMatch(JSON.stringify(b),/2000-01-01|22\.57|88\.36/);
}));
test('query parameters and oversized bodies are rejected',()=>serve(async base=>{
 assert.equal((await fetch(base+'/api/v1/timing/daily?birthDate=private')).status,422);
 assert.equal((await post(base,{...request,padding:'x'.repeat(17000)})).status,413);
 assert.equal((await fetch(base+'/api/v1/timing/daily')).status,405);
 assert.equal((await post(base,{...request,user_id:'other'})).status,422);
}));
test('capability and registry remain explicitly blocked',()=>serve(async base=>{
 const c=await(await fetch(base+'/api/v1/timing/capability')).json();assert.equal(c.release_authorized,false);assert.equal(c.accuracy_status,'NOT_VERIFIED');assert.equal(c.missing_dependencies.length,4);
 const a=await(await fetch(base+'/api/v1/timing/activities')).json();assert.deepEqual(a.activities.map((v:any)=>v.id),TIMING_ACTIVITIES.map(v=>v.id));assert.ok(a.activities.every((v:any)=>v.status==='UNAVAILABLE'));assert.match(a.activities.find((v:any)=>v.id==='finance').limitation,/no guaranteed profit/);
}));
test('upstream fixtures, fake approval or response birth details cannot leak through gateway',()=>serve(async base=>{
 const r=await post(base,request);assert.equal(r.status,503);assert.equal((await r.json()).code,'TIMING_SERVICE_UNAVAILABLE');
},async()=>({status:200,body:{schema_version:1,status:'PROVISIONAL',windows:[{start:'private'}],provenance:{release_authorized:true},birth:request.birth}})));
test('upstream blocked response is projected and stripped of extras',()=>serve(async base=>{
 const b=await(await post(base,request)).json();assert.equal(b.code,'REQUIRED_FACT_COVERAGE_MISSING');assert.equal(b.birth,undefined);assert.equal(b.day.elapsed_seconds,82800);
},async()=>({status:503,body:{schema_version:1,status:'INSUFFICIENT_EVIDENCE',code:'REQUIRED_FACT_COVERAGE_MISSING',windows:[],provenance:{release_authorized:false},birth:request.birth,day:{date:'2026-03-08',timezone:'America/New_York',start:'2026-03-08T05:00:00Z',end:'2026-03-09T04:00:00Z',elapsed_seconds:82800}}})));
test('daily screen has no stored natal defaults or verified recommendation',()=>{const html=renderToStaticMarkup(<DailyTiming/>);assert.match(html,/Birth IANA timezone/);assert.match(html,/Unknown time/);assert.match(html,/Financial categories/);assert.doesNotMatch(html,/localStorage|value="2000-|Verified recommendation|confidence/);});
test('timeline renders DST elapsed hours and escapes explanation markup',()=>{
 const result:TimingResult={schema_version:1,status:'PROVISIONAL',code:'SYNTHETIC_ALGORITHM_ONLY',activity:'work',day:{date:'2026-03-08',timezone:'America/New_York',start:'2026-03-08T05:00:00Z',end:'2026-03-09T04:00:00Z',elapsed_seconds:82800},windows:[{start:'2026-03-08T06:00:00Z',end:'2026-03-08T08:00:00Z',duration_seconds:7200,rank:1,rule_ids:['fixture'],explanations:['<img src=x onerror=alert(1)>'],classification:'PROVISIONAL_TRADITIONAL_FAVORABLE'}],limitations:[],provenance:{calculation_version:'timing-v1',rule_version:'timing-rules-v1',ephemeris_mode:'SYNTHETIC',requested_ephemeris_mode:'MOSHIER',source:'fixture',calculated_at:'2026-01-01T00:00:00Z',accuracy_status:'SYNTHETIC_NOT_ACCURACY_EVIDENCE',release_authorized:false}};
 const html=renderToStaticMarkup(<TimingTimeline result={result}/>);assert.match(html,/23 elapsed hours/);assert.match(html,/GMT-5/);assert.match(html,/GMT-4/);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
});
test('mirrored timing client and UI are identical',()=>{for(const name of ['engine/timingClient.ts','components/DailyTiming.tsx'])assert.equal(readFileSync(new URL('../../src/'+name,import.meta.url),'utf8'),readFileSync(new URL('../../frontend/src/'+name,import.meta.url),'utf8'));});
test('remote public URLs cannot become personal-data transport',()=>{const old=process.env.TIMING_INTERNAL_URL;try{process.env.TIMING_INTERNAL_URL='https://external.example/';assert.throws(()=>timingGatewayFromEnvironment(),/CONFIGURATION/);}finally{if(old===undefined)delete process.env.TIMING_INTERNAL_URL;else process.env.TIMING_INTERNAL_URL=old;}});

test('browser client rejects verified claims, invalid windows and mismatched provenance',async()=>{
 const {calculateDailyTiming}=await import('../../src/engine/timingClient');
 const original=globalThis.fetch;
 const valid:any={schema_version:1,status:'PROVISIONAL',code:'SYNTHETIC_ALGORITHM_ONLY',activity:'work',day:{date:'2026-03-08',timezone:'America/New_York',start:'2026-03-08T05:00:00Z',end:'2026-03-09T04:00:00Z',elapsed_seconds:82800},windows:[{start:'2026-03-08T06:00:00Z',end:'2026-03-08T08:00:00Z',duration_seconds:7200,rank:1,rule_ids:['fixture'],explanations:['Synthetic only'],classification:'PROVISIONAL_TRADITIONAL_FAVORABLE'}],limitations:['Synthetic only'],provenance:{calculation_version:'timing-v1',rule_version:'timing-rules-v1',ephemeris_mode:'SYNTHETIC',requested_ephemeris_mode:'MOSHIER',source:'fixture',calculated_at:'2026-01-01T00:00:00Z',accuracy_status:'SYNTHETIC_NOT_ACCURACY_EVIDENCE',release_authorized:false}};
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify(valid),{status:200});assert.equal((await calculateDailyTiming(request)).status,'PROVISIONAL');
  for(const mutate of [(b:any)=>b.status='VERIFIED',(b:any)=>b.provenance.release_authorized=true,(b:any)=>b.windows[0].end='not-an-instant',(b:any)=>b.windows[0].duration_seconds=1,(b:any)=>b.day.timezone='UTC',(b:any)=>b.provenance.requested_ephemeris_mode='JPL',(b:any)=>b.windows[0].explanations=null]){const b=structuredClone(valid);mutate(b);globalThis.fetch=async()=>new Response(JSON.stringify(b),{status:200});await assert.rejects(calculateDailyTiming(request));}
 }finally{globalThis.fetch=original;}
});
