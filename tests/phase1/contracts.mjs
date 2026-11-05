import assert from 'node:assert/strict';
const web=process.env.PHASE1_WEB_URL||'http://127.0.0.1:3101',engine=process.env.PHASE1_ENGINE_URL||'http://127.0.0.1:18081';
const post=async(base,path,body)=>{const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
const birth={birth_date:'2000-01-01',birth_time:'17:30:00',latitude:0,longitude:0,timezone_offset:5.5};
const camel=p=>({birthDate:p.birth_date,birthTime:p.birth_time,latitude:p.latitude,longitude:p.longitude,timezoneOffset:p.timezone_offset});
for(const [label,change,code] of [['missing date',p=>delete p.birth_date,'MISSING_REQUIRED_BIRTH_DATA'],['invalid date',p=>p.birth_date='2026-02-30','INVALID_BIRTH_DATE'],['invalid time',p=>p.birth_time='25:90:00','INVALID_BIRTH_TIME'],['coordinates',p=>p.latitude=120,'INVALID_COORDINATES'],['timezone',p=>p.timezone_offset=99,'INVALID_TIMEZONE']]){
 const p={...birth};change(p);const a=await post(web,'/api/astro/calculate',camel(p)),b=await post(engine,'/api/v1/ephemeris/normalize',p);assert.equal(a.status,422);assert.equal(b.status,422);assert.equal(a.body.error,code);assert.equal(b.body.error,code);console.log('contract',label,'passed');
}
const milestones=[{type:'MARRIAGE_UNION',approxDate:'2020-01-01',confidence:'HIGH'}];
for(const [base,path] of [[web,'/api/v1/btr/rectify'],[engine,'/api/v1/btr/rectify']]){
 const r=await post(base,path,{base_payload:birth,milestones});assert.equal(r.status,503);assert.equal(r.body.error,'DASHA_CALCULATION_UNAVAILABLE');assert.equal(r.body.is_certified,false);assert.equal(r.body.candidate_fit_score,null);assert.equal(r.body.is_certified_true,undefined);
 const empty=await post(base,path,{base_payload:birth,milestones:[]});assert.equal(empty.status,422);assert.equal(empty.body.error,'MILESTONES_REQUIRED');
 for(const path of ['/api/v1/resolver/evaluate?user_id=other','/api/v1/graph/hydrate','/api/v1/webhook/payment']){const r=await post(base,path,{user_id:'other',amount:1});assert.equal(r.status,503);assert.equal(r.body.status,'UNAVAILABLE');assert.equal(r.body.is_certified,false);}
}
const native=await post(engine,'/api/v1/ephemeris/normalize',birth);assert.equal(native.status,200);for(const p of Object.values(native.body.coordinates)){assert.ok(p.library_version);assert.ok(p.returned_flags>0);assert.ok(['SWISS_FILE','MOSHIER','JPL'].includes(p.ephemeris_mode));assert.equal(p.time_scale,'UTC_AS_UT');}
const fileRequired=await post(engine,'/api/v1/ephemeris/normalize',{...birth,required_mode:'SWISS_FILE'});assert.equal(fileRequired.status,503);assert.equal(fileRequired.body.error,'EPHEMERIS_MODE_UNAVAILABLE');
console.log('cross-service certainty, ownership, payment and native-mode contracts passed');

if(process.env.PHASE1_NOCGO_ENGINE_URL){const base=process.env.PHASE1_NOCGO_ENGINE_URL;const ready=await fetch(base+'/ready');assert.equal(ready.status,503);assert.equal((await ready.json()).error,'NATIVE_EPHEMERIS_UNAVAILABLE');const r=await post(base,'/api/v1/ephemeris/normalize',birth);assert.equal(r.status,503);assert.equal(r.body.error,'NATIVE_EPHEMERIS_UNAVAILABLE');assert.equal(r.body.coordinates,undefined);console.log('non-CGO engine refuses synthetic positions and reports not ready');}
