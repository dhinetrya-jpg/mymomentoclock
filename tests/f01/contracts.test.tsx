import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {f01Gateway,f01GatewayFromEnvironment} from '../../server/f01Boundary';
import {BirthTimeExplorer} from '../../src/components/BirthTimeExplorer';

const request={schema_version:1,birth_date:'2000-01-01',certainty:'APPROXIMATE',birth_time:'09:00',uncertainty_minutes:30,timezone:'Asia/Kolkata',latitude:28.6,longitude:77.2};
async function serve(run:(base:string)=>Promise<void>,transport?:any) {
 const app=express();app.use(express.json({limit:'64kb'}));app.use('/api/v1/f01',f01Gateway(transport));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 try{await run('http://127.0.0.1:'+(server.address() as any).port);}
 finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
async function post(base:string,body:unknown){return fetch(base+'/api/v1/f01/explore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
test('fail-closed without authenticated native transport',()=>serve(async base=>{
 const r=await post(base,request);assert.equal(r.status,503);
 const body=await r.json();assert.equal(body.customer_timing_authorized,false);
 assert.equal(body.btr_status,'UNAVAILABLE_UNVALIDATED_DASHA_METHOD');
 assert.doesNotMatch(JSON.stringify(body),/2000-01-01|28\.6|77\.2/);
}));
test('strict request shapes and validation',()=>serve(async base=>{
 for(const bad of [
 {...request,release_authorized:true},{...request,timezone:'Local'},
 {...request,uncertainty_minutes:0},{...request,birth_date:'2000-02-30'},
 {...request,latitude:91},{...request,certainty:'RANGE'},
 {...request,certainty:'UNKNOWN',birth_time:undefined,uncertainty_minutes:30},
 ]){assert.equal((await post(base,bad)).status,422);}
 assert.equal((await fetch(base+'/api/v1/f01/explore?birth=2000')).status,422);
 assert.equal((await fetch(base+'/api/v1/f01/explore')).status,405);
}));
test('RANGE contract, DST offset fields and midnight rollover',()=>serve(async base=>{
 const good={schema_version:1,birth_date:'2000-01-01',certainty:'RANGE',earliest_time:'23:30',latest_time:'00:30',latest_date:'2000-01-02',timezone:'Asia/Kolkata',latitude:28.6,longitude:77.2};
 const r=await post(base,good);assert.equal(r.status,503);assert.equal((await r.json()).code,'NATIVE_F01_SERVICE_UNAVAILABLE');
 assert.equal((await post(base,{...good,latest_date:'2000-01-03'})).status,422);
 assert.equal((await post(base,{...good,latest_utc_offset:15})).status,422);
 assert.equal((await post(base,{...good,birth_time:'00:00'})).status,422);
}));
test('reject forged upstream customer authorization and malformed evidence',()=>serve(async base=>{
 const r=await post(base,request);assert.equal(r.status,503);assert.equal((await r.json()).code,'F01_RESULT_NOT_ACCEPTED');
},async()=>({status:200,body:{status:'COMPUTED_UNVERIFIED',customer_timing_authorized:true,btr_status:'RECTIFIED'}})));
test('responsive F01 screen does not imply certified rectification',()=>{
 const html=renderToStaticMarkup(React.createElement(BirthTimeExplorer));
 assert.match(html,/Birth-Time Uncertainty Explorer/);
 assert.match(html,/Known earliest/);
 assert.match(html,/entire local date/);
 assert.doesNotMatch(html,/rectifiedTrueTime|success probability|guaranteed profit/);
});
test('mirror frontends retain matching F01 source',()=>{
 assert.equal(readFileSync(new URL('../../src/components/BirthTimeExplorer.tsx',import.meta.url),'utf8'),readFileSync(new URL('../../frontend/src/components/BirthTimeExplorer.tsx',import.meta.url),'utf8'));
});
test('public F01 URL is not allowed as an internal service',()=>{
 const old=process.env.F01_INTERNAL_URL;try{
 process.env.F01_INTERNAL_URL='https://external.example/';
 assert.throws(()=>f01GatewayFromEnvironment(),/CONFIGURATION/);
 }finally{if(old===undefined)delete process.env.F01_INTERNAL_URL;else process.env.F01_INTERNAL_URL=old;}
});

test('geometry cross-check is mandatory and cannot be promoted to independent proof',()=>serve(async base=>{
 const response=await post(base,request);
 assert.equal(response.status,503);
 assert.equal((await response.json()).code,'F01_RESULT_NOT_ACCEPTED');
},async()=>({status:200,body:{
 schema_version:1,contract_version:'f01-sensitivity-v1',status:'COMPUTED_UNVERIFIED',
 customer_timing_authorized:false,btr_status:'UNAVAILABLE_UNVALIDATED_DASHA_METHOD',
 authority:{production_eligible:false},house_system:'SWISS_S_SIDEREAL_LAHIRI',
 sample_count:1,samples:[{}],factors:[],transition_brackets:[],limitations:[],
 geometry_check:{status:'INDEPENDENTLY_VERIFIED',tolerance_degrees:0.000001,max_angular_error_degrees:0,source:'fabricated'}
}})));
test('valid geometry evidence is projected without raw chart or personal data',()=>serve(async base=>{
 const response=await post(base,request);
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.geometry_check.status,'GEOMETRY_CONSISTENT_NOT_EXTERNALLY_VERIFIED');
 assert.equal(result.samples,undefined);
 assert.equal(result.birth_input,undefined);
 assert.equal(result.customer_timing_authorized,false);
},async()=>({status:200,body:{
 schema_version:1,contract_version:'f01-sensitivity-v1',status:'COMPUTED_UNVERIFIED',
 customer_timing_authorized:false,btr_status:'UNAVAILABLE_UNVALIDATED_DASHA_METHOD',
 authority:{production_eligible:false},house_system:'SWISS_S_SIDEREAL_LAHIRI',
 timezone_database:'IANA@e29969d3f327f129ec4aebaa9c7aee96c46f8e3b',start_utc:'2000-01-01T03:00:00Z',end_utc:'2000-01-01T04:00:00Z',sample_count:1,samples:[{private_birth:'secret'}],factors:[],transition_brackets:[],limitations:[],
 geometry_check:{status:'GEOMETRY_CONSISTENT_NOT_EXTERNALLY_VERIFIED',tolerance_degrees:0.000001,max_angular_error_degrees:0,source:'INTERNAL_PORPHYRY_MIDPOINT_CROSSCHECK_NOT_INDEPENDENT_ASTRONOMICAL_REFERENCE'},
 hidden_birth:{name:'secret'}
}})));

function validNativeResult():any{return {
 schema_version:1,contract_version:'f01-sensitivity-v1',status:'COMPUTED_UNVERIFIED',
 customer_timing_authorized:false,btr_status:'UNAVAILABLE_UNVALIDATED_DASHA_METHOD',
 authority:{production_eligible:false},house_system:'SWISS_S_SIDEREAL_LAHIRI',
 timezone_database:'IANA@e29969d3f327f129ec4aebaa9c7aee96c46f8e3b',
 start_utc:'2000-01-01T03:00:00Z',end_utc:'2000-01-01T04:00:00Z',
 sample_count:1,samples:[{}],factors:[],transition_brackets:[],limitations:[],
 geometry_check:{status:'GEOMETRY_CONSISTENT_NOT_EXTERNALLY_VERIFIED',tolerance_degrees:0.000001,max_angular_error_degrees:0,source:'INTERNAL_PORPHYRY_MIDPOINT_CROSSCHECK_NOT_INDEPENDENT_ASTRONOMICAL_REFERENCE'}
};}
test('nested geometry metadata is never forwarded',()=>serve(async base=>{
 const response=await post(base,request);assert.equal(response.status,200);
 const result=await response.json();
 assert.deepEqual(Object.keys(result.geometry_check).sort(),['max_angular_error_degrees','source','status','tolerance_degrees']);
 assert.doesNotMatch(JSON.stringify(result),/private_birth|secret/);
},async()=>{const body=validNativeResult();body.geometry_check.birth_input={private_birth:'secret'};return {status:200,body};}));
test('reject non-scalar or unbound native interval and timezone metadata',async()=>{
 for(const patch of [
  {timezone_database:{birth_input:'secret'}},{timezone_database:'unknown'},
  {start_utc:{birth_input:'secret'}},{end_utc:['secret']},
  {start_utc:'2000-02-30T03:00:00Z'},
  {start_utc:'2000-01-02T03:00:00Z',end_utc:'2000-01-02T04:00:00Z'},
  {start_utc:'2000-01-01T03:00:00Z',end_utc:'2000-01-01T05:00:00Z'},
  {transition_brackets:[{factor:'moon',from_value:'a',to_value:'b',from_utc:'1999-12-31T00:00:00Z',to_utc:'2000-01-01T03:30:00Z',evidence:'OBSERVED_CHANGE_BOUNDED_BY_SAMPLES_NOT_EXACT_TRANSITION'}]},
 ])await serve(async base=>{const response=await post(base,request);assert.equal(response.status,503);assert.equal((await response.json()).code,'F01_RESULT_NOT_ACCEPTED');},async()=>({status:200,body:{...validNativeResult(),...patch}}));
});
test('native endpoints bind EXACT, RANGE, UNKNOWN and explicit DST offsets',async()=>{
 const cases=[
  [{...request,certainty:'EXACT',uncertainty_minutes:undefined},'2000-01-01T03:30:00Z','2000-01-01T03:30:00Z'],
  [{schema_version:1,birth_date:'2000-01-01',certainty:'RANGE',earliest_time:'23:30',latest_time:'00:30',latest_date:'2000-01-02',timezone:'Asia/Kolkata',latitude:28.6,longitude:77.2},'2000-01-01T18:00:00Z','2000-01-01T19:00:00Z'],
  [{schema_version:1,birth_date:'2024-11-03',certainty:'RANGE',earliest_time:'01:15',latest_time:'01:45',earliest_utc_offset:-4,latest_utc_offset:-5,timezone:'America/New_York',latitude:40,longitude:-74},'2024-11-03T05:15:00Z','2024-11-03T06:45:00Z'],
  [{...request,certainty:'UNKNOWN',birth_time:undefined,uncertainty_minutes:undefined},'1999-12-31T18:30:00Z','2000-01-01T18:30:00Z'],
 ] as const;
 for(const [input,start_utc,end_utc] of cases){
  await serve(async base=>assert.equal((await post(base,input)).status,200),async()=>({status:200,body:{...validNativeResult(),start_utc,end_utc}}));
  await serve(async base=>assert.equal((await post(base,input)).status,503),async()=>({status:200,body:{...validNativeResult(),start_utc:new Date(Date.parse(start_utc)+86400000).toISOString(),end_utc:new Date(Date.parse(end_utc)+86400000).toISOString()}}));
 }
});
