import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import https from 'node:https';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createPaymentBoundary,createMTLSTransport,type VerifiedSessionAdapter,type PaymentTransport} from '../../server/paymentBoundary';
import {checkoutMessage} from '../../src/engine/paymentClient';
import {checkoutMessage as alternateCheckoutMessage} from '../../frontend/src/engine/paymentClient';

const session:VerifiedSessionAdapter={productionReady:true,async verify(req){if(req.get('Authorization')!=='Bearer verified-test-session')throw Error();return {bearerToken:'verified-test-session'};}};
async function boundary(run:(url:string)=>Promise<void>,transport?:PaymentTransport,identity=session,approved=true){
 const app=express();app.use(express.json());app.use('/api/payment',createPaymentBoundary(transport?{identity,transport,activationApproved:approved}:undefined));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address() as {port:number};
 try{await run(`http://127.0.0.1:${address.port}`);}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
const request=(url:string,path:string,body?:object,headers:Record<string,string>={})=>fetch(url+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',Authorization:'Bearer verified-test-session',...headers},...(body?{body:JSON.stringify(body)}:{})});
for(const path of ['/api/payment/orders','/api/payment/orders/other','/api/payment/entitlements'])test(`default unavailable: ${path}`,()=>boundary(async url=>{const r=await request(url,path);assert.equal(r.status,503);assert.equal((await r.json()).error,'PAYMENT_PROVIDER_UNAVAILABLE');}));
test('no approval or unready identity cannot call transport',async()=>{
 for(const [identity,approved] of [[session,false],[{...session,productionReady:false},true]] as const){await boundary(async url=>assert.equal((await request(url,'/api/payment/entitlements')).status,503),async()=>{throw Error('must never call');},identity,approved);}
});
test('forged identity/header does not forward',()=>boundary(async url=>assert.equal((await request(url,'/api/payment/entitlements',undefined,{Authorization:'Bearer forged','X-User-ID':'customer-a'})).status,401),async()=>{throw Error('must never call');}));
test('body and query tampering rejected before forwarding',()=>boundary(async url=>{
 for(const extra of [{amount_minor:1},{currency:'USD'},{customer_id:'other'},{status:'COMPLETED'}])assert.equal((await request(url,'/api/payment/orders',{product_id:'p',idempotency_key:'test-idempotency-key',...extra})).status,422);
 assert.equal((await request(url,'/api/payment/entitlements?customer_id=other')).status,422);
},async()=>{throw Error('must never call');}));
test('transport receives verified bearer, fixed safe contract and no caller IDs',()=>boundary(async url=>{
 const response=await request(url,'/api/payment/orders',{product_id:'p',idempotency_key:'test-idempotency-key'},{'X-User-ID':'forged'});assert.equal(response.status,200);const body=await response.json();assert.equal(body.customer_id,undefined);assert.equal(body.provider_secret,undefined);assert.equal(body.amount_minor,12345);
},async(method,path,body,token)=>{assert.equal(method,'POST');assert.equal(path,'/api/payment/orders');assert.deepEqual(body,{product_id:'p',idempotency_key:'test-idempotency-key'});assert.equal(token,'verified-test-session');return {status:200,body:{order_id:'order',product_id:'p',product_version:'v1',capability_id:'cap',status:'PENDING',currency:'INR',amount_minor:12345,customer_id:'never-forward',provider_secret:'never-forward'}};}));
test('failures never fall back to paid',()=>boundary(async url=>{const response=await request(url,'/api/payment/orders/order');assert.equal(response.status,503);assert.equal((await response.json()).status,'UNAVAILABLE');},async()=>{throw Error('internal secret must not leak');}));
test('entitlement response strips internal identifiers',()=>boundary(async url=>{const response=await request(url,'/api/payment/entitlements');assert.deepEqual(await response.json(),{entitlements:[{capability_id:'cap',source_order:'order'}]});},async()=>({status:200,body:{entitlements:[{capability_id:'cap',source_order:'order',customer_id:'private',provider_secret:'private'}]}})));
test('mutual TLS transport verifies both peers and sends bounded safe requests',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'pay-mtls-'));
 const openssl=(...args:string[])=>execFileSync('openssl',args,{cwd:dir,stdio:'ignore'});
 try{
 openssl('req','-x509','-newkey','rsa:2048','-nodes','-keyout','ca.key','-out','ca.pem','-days','1','-subj','/CN=isolated-payment-test-ca');
 for(const name of ['server','client']){openssl('req','-newkey','rsa:2048','-nodes','-keyout',`${name}.key`,'-out',`${name}.csr`,'-subj',`/CN=${name}`);writeFileSync(join(dir,`${name}.ext`),`subjectAltName=DNS:${name==='server'?'localhost':'payment-web.internal'}\nextendedKeyUsage=${name==='server'?'serverAuth':'clientAuth'}\n`);openssl('x509','-req','-in',`${name}.csr`,'-CA','ca.pem','-CAkey','ca.key','-CAcreateserial','-out',`${name}.pem`,'-days','1','-extfile',`${name}.ext`);}
 const server=https.createServer({ca:readFileSync(join(dir,'ca.pem')),cert:readFileSync(join(dir,'server.pem')),key:readFileSync(join(dir,'server.key')),requestCert:true,rejectUnauthorized:true,minVersion:'TLSv1.3'},(req,res)=>{assert.equal(req.headers.authorization,'Bearer verified-test-session');assert.equal(req.headers['x-user-id'],undefined);res.setHeader('content-type','application/json');res.end(JSON.stringify({entitlements:[]}));});
 server.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const port=(server.address() as {port:number}).port;
 try{
 const transport=createMTLSTransport({url:`https://localhost:${port}/`,caFile:join(dir,'ca.pem'),certFile:join(dir,'client.pem'),keyFile:join(dir,'client.key')});
 const result=await transport('GET','/api/payment/entitlements',undefined,'verified-test-session');assert.equal(result.status,200);assert.deepEqual(result.body,{entitlements:[]});
 await assert.rejects(transport('GET','https://other.example/private',undefined,'verified-test-session'));
 const wrongPeer=createMTLSTransport({url:`https://127.0.0.1:${port}/`,caFile:join(dir,'ca.pem'),certFile:join(dir,'client.pem'),keyFile:join(dir,'client.key')});await assert.rejects(wrongPeer('GET','/api/payment/entitlements',undefined,'verified-test-session'));
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('production entry contains no test adapter activation or identity fallback',()=>{
 const source=readFileSync('server.ts','utf8');assert.ok(source.includes('createPaymentBoundary()'));assert.ok(!source.includes('X-User-ID'));assert.ok(!source.includes('PAYMENT_TEST_ADAPTER'));assert.throws(()=>createMTLSTransport({url:'http://internal/',caFile:'unused',certFile:'unused',keyFile:'unused'}));
});
test('both checkout models keep browser callbacks from authorizing access',()=>{
 for(const status of ['CREATED','PENDING','COMPLETED','FAILED','CANCELLED','EXPIRED','REFUNDED','REVERSED','ALREADY_PURCHASED','UNAVAILABLE'] as const){assert.deepEqual(checkoutMessage(status),alternateCheckoutMessage(status));assert.equal((checkoutMessage(status) as any).unlocked,undefined);}
 assert.match(checkoutMessage('COMPLETED').message,/Access is checked separately/);assert.match(checkoutMessage('REFUNDED').message,/revoked/);
});
