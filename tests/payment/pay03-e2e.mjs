// Test-only full session -> mTLS -> Go -> PostgreSQL -> provider fixture lifecycle.
import assert from 'node:assert/strict';
import express from 'express';
import https from 'node:https';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createAuthGateway} from '../../server/authGateway.ts';
import {createAuthMTLSTransport,createMTLSTransport,createPaymentBoundary} from '../../server/paymentBoundary.ts';
const [url,caFile,certFile,keyFile]=process.argv.slice(2),tls={ca:readFileSync(caFile),cert:readFileSync(certFile),key:readFileSync(keyFile),rejectUnauthorized:true,minVersion:'TLSv1.3'};
const cfg={url,caFile,certFile,keyFile},auth=createAuthGateway({publicOrigin:'https://app.fixture.invalid',environment:'test',transport:createAuthMTLSTransport(cfg)});
const app=express();app.use(express.json());app.use('/api/auth',auth.handler);app.use('/api/payment',createPaymentBoundary({identity:auth.identity,transport:createMTLSTransport(cfg),activationApproved:true}));
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin=`http://127.0.0.1:${server.address().port}`;
const privateCall=(path,body,token='')=>new Promise((resolve,reject)=>{const data=body===undefined?'':JSON.stringify(body);const req=https.request(new URL(path,url),{...tls,method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})}},res=>{const chunks=[];res.on('data',v=>chunks.push(v));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString()}));});req.on('error',reject);if(data)req.write(data);req.end();});
class Customer{cookies=new Map();async call(path,body){const csrf=this.cookies.get(path==='/api/auth/login'?'__Host-mmo-login-csrf':'__Host-mmo-csrf');const res=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{origin:'https://app.fixture.invalid','content-type':'application/json',cookie:[...this.cookies].map(([k,v])=>k+'='+v).join('; '),...(csrf?{'x-csrf-token':csrf}:{}),'x-user-id':'untrusted-customer-id'},...(body===undefined?{}:{body:JSON.stringify(body)})});for(const c of res.headers.getSetCookie()){const [name,value]=c.split(';')[0].split('=');if(value)this.cookies.set(name,value);else this.cookies.delete(name);}return {status:res.status,body:await res.json()};}async login(subject){const ch=await this.call('/api/auth/challenge',{});assert.equal(ch.status,200);const proof=await privateCall('/_fixture/token',{nonce:ch.body.nonce,subject});assert.equal(proof.status,200);const jwt=JSON.parse(proof.text).id_token;const session=await this.call('/api/auth/login',{nonce:ch.body.nonce,id_token:jwt});assert.equal(session.status,200);assert.deepEqual(session.body,{authenticated:true});}}
try{
 const a=new Customer(),b=new Customer();await a.login('pay03-customer-a');await b.login('pay03-customer-b');const catalog=await a.call('/api/payment/catalog');assert.equal(catalog.status,200);assert.equal(catalog.body.products.length,1);assert.equal(catalog.body.products[0].amount_minor,12345);
 const key=randomUUID(),start=performance.now();const created=await a.call('/api/payment/orders',{product_id:'fixture-product',idempotency_key:key});assert.equal(created.status,200);const id=created.body.order_id;
 // Duplicate checkout initiation is measured separately from real provider throughput.
 const times=[];const responses=await Promise.all(Array.from({length:20},async()=>{const began=performance.now();const r=await a.call('/api/payment/orders',{product_id:'fixture-product',idempotency_key:key});times.push(performance.now()-began);return r;}));for(const r of responses){assert.equal(r.status,200);assert.equal(r.body.order_id,id);}times.sort((x,y)=>x-y);
 assert.equal((await b.call('/api/payment/orders/'+id)).status,404);
 assert.equal((await privateCall('/fixture/protected',undefined,a.cookies.get('__Host-mmo-session'))).status,403);
 assert.equal((await privateCall('/_fixture/capture/'+id,{})).status,200);assert.equal((await privateCall('/_fixture/capture/'+id,{})).status,200);
 assert.ok((await a.call('/api/payment/entitlements')).body.entitlements.some(e=>e.source_order===id));assert.ok(!(await b.call('/api/payment/entitlements')).body.entitlements.some(e=>e.source_order===id));
 assert.equal((await privateCall('/fixture/protected',undefined,a.cookies.get('__Host-mmo-session'))).status,200);assert.equal((await privateCall('/fixture/protected',undefined,b.cookies.get('__Host-mmo-session'))).status,403);
 assert.equal((await privateCall('/_fixture/dispute/'+id,{})).status,200);assert.equal((await a.call('/api/payment/orders/'+id)).body.status,'PAYMENT_REVIEW');assert.equal((await privateCall('/fixture/protected',undefined,a.cookies.get('__Host-mmo-session'))).status,403);
 assert.equal((await privateCall('/_fixture/refund/'+id,{})).status,200);assert.equal((await a.call('/api/payment/orders/'+id)).body.status,'REFUNDED');assert.ok(!(await a.call('/api/payment/entitlements')).body.entitlements.some(e=>e.source_order===id));
 const old=a.cookies.get('__Host-mmo-session');assert.equal((await a.call('/api/auth/logout',{})).status,200);assert.equal((await privateCall('/fixture/protected',undefined,old)).status,401);
 console.log(JSON.stringify({local_fixture_only:true,concurrent_requests:20,duplicate_order_p95_ms:Number(times[Math.ceil(times.length*.95)-1].toFixed(2)),duplicate_order_mean_ms:Number((times.reduce((x,y)=>x+y,0)/times.length).toFixed(2)),full_flow_ms:Number((performance.now()-start).toFixed(2)),ownership:'passed',csrf_and_session:'passed',dispute_hold_refund:'passed',provider_orders:1}));
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
