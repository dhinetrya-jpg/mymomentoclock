import assert from 'node:assert/strict';
import express from 'express';
import https from 'node:https';
import {readFileSync} from 'node:fs';
import {f01GatewayFromEnvironment} from '../../server/f01Boundary.ts';
const [url,ca,cert,key]=process.argv.slice(2);
Object.assign(process.env,{F01_INTERNAL_URL:url,F01_INTERNAL_CA_FILE:ca,F01_INTERNAL_CERT_FILE:cert,F01_INTERNAL_KEY_FILE:key});
const app=express();app.use(express.json({limit:'64kb'}));app.use('/api/v1/f01',f01GatewayFromEnvironment());
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const base='http://127.0.0.1:'+server.address().port;
const request={schema_version:1,birth_date:'2000-01-01',birth_time:'09:00',certainty:'EXACT',timezone:'Asia/Kolkata',latitude:22.57,longitude:88.36};
const post=async(body)=>{const response=await fetch(base+'/api/v1/f01/explore',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json(),cache:response.headers.get('cache-control')};};
try {
 // Validate missing-certificate rejection from Node with the genuine server CA.
 await assert.rejects(new Promise((resolve,reject)=>{const req=https.get(new URL('/api/v1/f01/explore',url),{ca:readFileSync(ca),rejectUnauthorized:true},response=>{response.resume();resolve(response.statusCode);});req.on('error',reject);}));
 const nativeMalformed=await new Promise((resolve,reject)=>{
  const req=https.request(new URL('/api/v1/f01/explore',url),{method:'POST',ca:readFileSync(ca),cert:readFileSync(cert),key:readFileSync(key),rejectUnauthorized:true,headers:{'content-type':'application/json'}},response=>{response.resume();resolve(response.statusCode);});
  req.on('error',reject);req.end(JSON.stringify({...request,unknown_birth_field:'refuse'}));
 });
 assert.equal(nativeMalformed,422);
 for(const input of [request,{...request,certainty:'APPROXIMATE',uncertainty_minutes:30},{...request,birth_time:undefined,certainty:'RANGE',earliest_time:'08:30',latest_time:'09:30'},{...request,birth_time:undefined,certainty:'UNKNOWN'}]) {
  const result=await post(input);
  assert.equal(result.status,200,JSON.stringify(result.body));
  assert.equal(result.cache,'no-store');
  assert.equal(result.body.status,'COMPUTED_UNVERIFIED');
  assert.equal(result.body.customer_timing_authorized,false);
  assert.equal(result.body.btr_status,'UNAVAILABLE_UNVALIDATED_DASHA_METHOD');
  assert.equal(result.body.geometry_check.status,'GEOMETRY_CONSISTENT_NOT_EXTERNALLY_VERIFIED');
  assert.equal(result.body.samples,undefined);assert.equal(result.body.birth_input,undefined);assert.equal(result.body.authority,undefined);
  assert.equal(result.body.sample_count,input.certainty==='EXACT'?1:17);
  assert.ok(result.body.factors.length>0);
  assert.match(result.body.limitations.join(' '),/NOT birth-time rectification/);
  console.log(`${input.certainty}: real pinned SWISS_FILE → verified mTLS → Node fixed projection; ${result.body.sample_count} samples, no customer authorization`);
 }
 assert.equal((await post({...request,birth_date:'2000-02-30'})).status,422);
 assert.equal((await post({...request,birth_input:{secret:'never forward'}})).status,422);
 console.log('Malformed requests and missing client certificate refused; raw natal samples/authority excluded. Exploratory geometry only; no independent scientific admission.');
} finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
