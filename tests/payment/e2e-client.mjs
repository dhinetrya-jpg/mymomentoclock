// Invoked only by Go's _test.go TLS fixture. No production executable registers fixture routes.
import assert from 'node:assert/strict';
import express from 'express';
import https from 'node:https';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createPaymentBoundary,createMTLSTransport} from '../../server/paymentBoundary.ts';
const [url,caFile,certFile,keyFile]=process.argv.slice(2);
const transport=createMTLSTransport({url,caFile,certFile,keyFile});
const identity={productionReady:true,async verify(req){if(!['Bearer customer-a-session','Bearer customer-b-session'].includes(req.get('authorization')))throw Error();return {bearerToken:req.get('authorization').slice(7)};}};
const app=express();app.use(express.json());app.use('/api/payment',createPaymentBoundary({identity,transport,activationApproved:true}));
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const call=async(path,who='a',body)=>{const response=await fetch(origin+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer customer-${who}-session`,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};};
const fixture=path=>new Promise((resolve,reject)=>{const request=https.request(new URL(path,url),{method:'POST',ca:readFileSync(caFile),cert:readFileSync(certFile),key:readFileSync(keyFile),rejectUnauthorized:true,minVersion:'TLSv1.3'},response=>{response.resume();response.on('end',()=>response.statusCode===200?resolve():reject(Error('fixture failed')));});request.on('error',reject);request.end();});
try{
const key=randomUUID();const created=await call('/api/payment/orders','a',{product_id:'fixture-product',idempotency_key:key});assert.equal(created.status,200);assert.equal(created.body.status,'PENDING');assert.equal(created.body.amount_minor,12345);const id=created.body.order_id;
const retry=await call('/api/payment/orders','a',{product_id:'fixture-product',idempotency_key:key});assert.equal(retry.body.order_id,id);
assert.equal((await call('/api/payment/orders/'+id,'b')).status,404);
await fixture('/_fixture/complete/'+id);
assert.equal((await call('/api/payment/orders/'+id)).body.status,'COMPLETED');
assert.ok((await call('/api/payment/entitlements')).body.entitlements.some(e=>e.source_order===id));
assert.ok(!(await call('/api/payment/entitlements','b')).body.entitlements.some(e=>e.source_order===id));
await fixture('/_fixture/complete/'+id);
assert.equal((await call('/api/payment/entitlements')).body.entitlements.filter(e=>e.source_order===id).length,1);
await fixture('/_fixture/refund/'+id);
assert.equal((await call('/api/payment/orders/'+id)).body.status,'REFUNDED');
assert.ok(!(await call('/api/payment/entitlements')).body.entitlements.some(e=>e.source_order===id));
console.log('Node -> mutual TLS -> Go -> PostgreSQL lifecycle passed: idempotent order, ownership, completion, one grant, duplicate, refund and revocation');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
