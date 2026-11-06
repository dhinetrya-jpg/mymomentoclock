import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {generateKeyPairSync,sign} from 'node:crypto';
import {ProductionPermit} from '../../server/releasePolicy';
import {createAuthGateway} from '../../server/authGateway';
import {createPaymentBoundary,type PaymentTransport} from '../../server/paymentBoundary';
const origin='https://app.fixture.invalid',token='b'.repeat(64),csrf='c'.repeat(64),nonce='a'.repeat(64),challenge='d'.repeat(64);
async function serve(run:(base:string)=>Promise<void>){let active=true;let writes=0;const transport:PaymentTransport=async(method,path,body,bearer,antiCSRF)=>{
 if(path==='/internal/auth/challenge')return {status:200,body:{challenge,nonce,csrf,environment:'test'}};
 if(path==='/internal/auth/login'){assert.equal((body as any).challenge,challenge);return {status:200,body:{session_token:token,expires_at:new Date(Date.now()+1800000).toISOString(),environment:'test'}};}
 if(path==='/internal/auth/session')return {status:active&&bearer===token?200:401,body:{authenticated:active&&bearer===token,environment:'test'}};
 if(path==='/internal/auth/logout'||path==='/internal/auth/delete-account'){if(antiCSRF!==csrf)return {status:403,body:{}};active=false;return {status:200,body:{revoked:true}};}
 if(method==='POST'){writes++;if(antiCSRF!==csrf)return {status:403,body:{error:'CSRF_INVALID'}};}
 return {status:200,body:{order_id:'fixtureorder',status:'PENDING',product_id:'fixture',product_version:'v1',capability_id:'fixture',amount_minor:12345,currency:'INR'}};
 };
 const gateway=createAuthGateway({publicOrigin:origin,environment:'test',transport});const app=express();app.use(express.json());app.use('/api/auth',gateway.handler);app.use('/api/payment',createPaymentBoundary({identity:gateway.identity!,transport,activationApproved:true}));app.get('/fixture-writes',(_req,res)=>res.json({writes}));
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));try{await run('http://127.0.0.1:'+(server.address() as any).port);}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}
const cookie=`__Host-mmo-session=${token}; __Host-mmo-csrf=${csrf}`;
test('session exchange sets secure HttpOnly host-only cookie and never returns bearer to browser JSON',()=>serve(async base=>{
 const ch=await fetch(base+'/api/auth/challenge',{method:'POST',headers:{origin}});assert.equal(ch.status,200);const challengeCookies=ch.headers.getSetCookie();assert.ok(challengeCookies.some(v=>v.startsWith('__Host-mmo-challenge=')&&v.includes('HttpOnly')&&v.includes('Secure')));
 const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/json','x-csrf-token':csrf,cookie:`__Host-mmo-challenge=${challenge}; __Host-mmo-login-csrf=${csrf}`},body:JSON.stringify({id_token:'fixture-token-verified-by-test-transport',nonce})});assert.equal(r.status,200);assert.deepEqual(await r.json(),{authenticated:true});const session=r.headers.getSetCookie().find(s=>s.startsWith('__Host-mmo-session='))!;assert.match(session,/HttpOnly/);assert.match(session,/Secure/);assert.match(session,/SameSite=Lax/);assert.doesNotMatch(session,/Domain=/);
}));
test('cookie mutation requires exact Origin, double-submit token and downstream session binding',()=>serve(async base=>{
 for(const headers of [{cookie},{cookie,origin:'https://attacker.invalid','x-csrf-token':csrf},{cookie,origin,'x-csrf-token':'e'.repeat(64)}]){const r=await fetch(base+'/api/payment/orders',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({product_id:'fixture',idempotency_key:'fixture-idempotency-key'})});assert.equal(r.status,403);}
 assert.equal((await(await fetch(base+'/fixture-writes')).json()).writes,0);
 const valid=await fetch(base+'/api/payment/orders',{method:'POST',headers:{cookie,origin,'x-csrf-token':csrf,'content-type':'application/json','x-user-id':'attacker'},body:JSON.stringify({product_id:'fixture',idempotency_key:'fixture-idempotency-key'})});assert.equal(valid.status,200);assert.doesNotMatch(await valid.text(),/attacker/);
}));
test('duplicate session cookies and forged public identities do not authenticate',()=>serve(async base=>{
 for(const value of ['__Host-mmo-session=forged',`__Host-mmo-session=${token}; __Host-mmo-session=${token}`]){const r=await fetch(base+'/api/auth/session',{headers:{cookie:value,'x-user-id':'customer-a'}});assert.equal(r.status,401);}
}));
test('logout revokes through Go and clears host session cookies',()=>serve(async base=>{
 const r=await fetch(base+'/api/auth/logout',{method:'POST',headers:{origin,cookie,'x-csrf-token':csrf}});assert.equal(r.status,200);assert.ok(r.headers.getSetCookie().some(c=>c.startsWith('__Host-mmo-session=;')));assert.equal((await fetch(base+'/api/auth/session',{headers:{cookie}})).status,401);
}));
test('account deactivation requires explicit confirmation and never accepts another customer ID',()=>serve(async base=>{
 const denied=await fetch(base+'/api/auth/delete-account',{method:'POST',headers:{origin,cookie,'x-csrf-token':csrf,'content-type':'application/json'},body:JSON.stringify({confirm:'disable-account',customer_id:'other'})});assert.equal(denied.status,422);
 const accepted=await fetch(base+'/api/auth/delete-account',{method:'POST',headers:{origin,cookie,'x-csrf-token':csrf,'content-type':'application/json'},body:JSON.stringify({confirm:'disable-account'})});assert.equal(accepted.status,200);assert.equal((await accepted.json()).financial_records_deleted,false);
}));
function manifest(){const issued=new Date(Date.now()-60000);return {schema_version:1,environment:'production',artifact_digest:'a'.repeat(64),gateway_digest:'b'.repeat(64),config_digest:'c'.repeat(64),catalog_digest:'d'.repeat(64),merchant_account:'acc_fixture',identity_issuer:'https://identity.fixture.invalid',approval_reference:'ephemeral-test-approval',issued_at:issued.toISOString(),expires_at:new Date(Date.now()+3600000).toISOString(),gates:Object.fromEntries(Array.from({length:26},(_,i)=>['G'+String(i+1).padStart(2,'0'),{status:'PASS',evidence:'ephemeral-test-evidence'}]))};}
const pair=generateKeyPairSync('ed25519'),pub=pair.publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex');
test('signed readiness is artifact/config bound; no default production approval exists',()=>{const m=manifest(),raw=Buffer.from(JSON.stringify(m));const permit=ProductionPermit.verify(raw,sign(null,raw,pair.privateKey),pub,m.gateway_digest,m.config_digest);assert.equal(permit.valid(),true);assert.throws(()=>ProductionPermit.verify(raw,sign(null,raw,pair.privateKey),'',m.gateway_digest,m.config_digest));assert.throws(()=>ProductionPermit.verify(raw,sign(null,raw,pair.privateKey),pub,'e'.repeat(64),m.config_digest));assert.throws(()=>ProductionPermit.verify(Buffer.concat([raw,Buffer.from(' ')]),sign(null,raw,pair.privateKey),pub,m.gateway_digest,m.config_digest));});
for(let i=1;i<=26;i++)test(`blocked G${String(i).padStart(2,'0')} prevents production permit`,()=>{const m=manifest();m.gates['G'+String(i).padStart(2,'0')].status='BLOCKED_EXTERNAL_DEPENDENCY';const raw=Buffer.from(JSON.stringify(m));assert.throws(()=>ProductionPermit.verify(raw,sign(null,raw,pair.privateKey),pub,m.gateway_digest,m.config_digest));});
