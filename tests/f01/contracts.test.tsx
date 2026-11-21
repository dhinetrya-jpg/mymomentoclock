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
