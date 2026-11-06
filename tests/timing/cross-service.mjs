import assert from 'node:assert/strict';
import express from 'express';
import {timingGatewayFromEnvironment} from '../../server/timingBoundary.ts';
const [url,ca,cert,key]=process.argv.slice(2);
Object.assign(process.env,{TIMING_INTERNAL_URL:url,TIMING_INTERNAL_CA_FILE:ca,TIMING_INTERNAL_CERT_FILE:cert,TIMING_INTERNAL_KEY_FILE:key});
const app=express();app.use(express.json({limit:'64kb'}));app.use('/api/v1/timing',timingGatewayFromEnvironment());
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
const request={schema_version:1,birth:{date:'2000-01-01',time:'12:00',certainty:'EXACT',timezone:'Asia/Kolkata',latitude:22.57,longitude:88.36},target:{date:'2026-03-08',timezone:'America/New_York',latitude:40.71,longitude:-74},activity:'work',rule_version:'timing-rules-v1',ephemeris_mode:'MOSHIER'};
const post=async(body)=>{const r=await fetch(base+'/api/v1/timing/daily',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
try{
 for(const [zone,date,hours] of [['Asia/Kolkata','2026-03-08',24],['America/New_York','2026-03-08',23],['America/Toronto','2026-11-01',25]]){const r=await post({...request,target:{...request.target,timezone:zone,date}});assert.equal(r.status,503);assert.equal(r.body.day.elapsed_seconds,hours*3600);assert.equal(r.body.provenance.release_authorized,false);assert.deepEqual(r.body.windows,[]);assert.doesNotMatch(JSON.stringify(r.body),/2000-01-01|22\.57|88\.36/);}
 const birth={...request.birth,date:'2026-11-01',time:'01:30',timezone:'America/Toronto'};const target={...request.target,date:'2026-11-02'};
 assert.equal((await post({...request,birth,target})).body.code,'AMBIGUOUS_LOCAL_TIME');assert.equal((await post({...request,birth:{...birth,utc_offset:-4},target})).status,503);
 assert.equal((await post({...request,birth:{...request.birth,date:'2026-02-30'}})).status,422);
 assert.equal((await post({...request,birth:{...request.birth,certainty:'APPROXIMATE',uncertainty_minutes:15}})).body.status,'INSUFFICIENT_EVIDENCE');
 console.log('Node → verified mTLS → real Go civil-time/gate: India24h, US23h, Canada25h; DST fold/offset, invalid date, uncertainty and no fixture leakage passed. No astronomical accuracy claim.');
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
