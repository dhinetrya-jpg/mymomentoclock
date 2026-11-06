import type {Request,Response,RequestHandler} from 'express';
import {timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createAuthMTLSTransport,type PaymentTransport,type VerifiedSessionAdapter} from './paymentBoundary';
const SESSION='__Host-mmo-session',CSRF='__Host-mmo-csrf',CHALLENGE='__Host-mmo-challenge',LOGIN_CSRF='__Host-mmo-login-csrf';
const valid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function cookie(req:Request,name:string){const matches=(req.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));return matches.length===1?matches[0].slice(name.length+1):'';}
function equal(a:string,b:string){return valid(a)&&valid(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export interface AuthGateway {handler:RequestHandler;identity?:VerifiedSessionAdapter}
export function createAuthGateway(deps?:{publicOrigin:string;environment:string;transport:PaymentTransport}):AuthGateway{
 const unavailable:RequestHandler=(_req,res)=>{res.setHeader('Cache-Control','no-store');res.status(503).json({error:'AUTHENTICATION_UNAVAILABLE'});};
 if(!deps)return {handler:unavailable};const origin=new URL(deps.publicOrigin);if(origin.protocol!=='https:'||origin.origin!==deps.publicOrigin||!['local','test','sandbox','staging','production'].includes(deps.environment))throw Error('IDENTITY_ORIGIN_INVALID');
 const mutation=(req:Request,login=false)=>{const token=req.get('x-csrf-token')||'';if(req.get('origin')!==deps.publicOrigin||!equal(token,cookie(req,login?LOGIN_CSRF:CSRF)))throw Error('CSRF_INVALID');return token;};
 const identity:VerifiedSessionAdapter={productionReady:true,async verify(req){const token=cookie(req,SESSION);if(!valid(token))throw Error('UNAUTHENTICATED');let csrfToken:string|undefined;if(!['GET','HEAD','OPTIONS'].includes(req.method))csrfToken=mutation(req);const response=await deps.transport('GET','/internal/auth/session',undefined,token);if(response.status!==200||((response.body as any)?.authenticated!==true||(response.body as any)?.environment!==deps.environment))throw Error('UNAUTHENTICATED');return {bearerToken:token,csrfToken};}};
 const set=(res:Response,name:string,value:string,httpOnly:boolean,maxAge:number)=>res.cookie(name,value,{secure:true,httpOnly,sameSite:'lax',path:'/',maxAge});
 const clear=(res:Response,name:string)=>res.clearCookie(name,{secure:true,httpOnly:name!==CSRF&&name!==LOGIN_CSRF,sameSite:'lax',path:'/'});
 const handler:RequestHandler=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');const fail=(status:number,error:string)=>res.status(status).json({error});
  try{
   if(Object.keys(req.query).length)return void fail(422,'INVALID_REQUEST');const path=req.originalUrl.split('?')[0];
   if(path==='/api/auth/challenge'&&req.method==='POST'){
    if(req.get('origin')!==deps.publicOrigin)return void fail(403,'CSRF_INVALID');
    const r=await deps.transport('POST','/internal/auth/challenge',{},'');const c=r.body as any;if(r.status!==200||c?.environment!==deps.environment||!valid(c?.challenge)||!valid(c?.nonce)||!valid(c?.csrf))throw Error();
    set(res,CHALLENGE,c.challenge,true,300000);set(res,LOGIN_CSRF,c.csrf,false,300000);return void res.json({nonce:c.nonce,csrf:c.csrf});
   }
   if(path==='/api/auth/login'&&req.method==='POST'){
    const csrf=mutation(req,true),id=cookie(req,CHALLENGE);const b=req.body;if(!valid(id)||!b||Array.isArray(b)||Object.keys(b).some(k=>!['id_token','nonce'].includes(k))||typeof b.id_token!=='string'||b.id_token.length>16384||!valid(b.nonce))return void fail(422,'INVALID_REQUEST');
    const r=await deps.transport('POST','/internal/auth/login',{id_token:b.id_token,nonce:b.nonce,challenge:id,csrf},'');const s=r.body as any;if(r.status!==200)return void fail(401,'LOGIN_NOT_ACCEPTED');const expiry=Date.parse(s?.expires_at);if(s?.environment!==deps.environment||!valid(s?.session_token)||!Number.isFinite(expiry)||expiry<=Date.now()||expiry>Date.now()+3601000)throw Error();
    set(res,SESSION,s.session_token,true,expiry-Date.now());set(res,CSRF,csrf,false,expiry-Date.now());clear(res,CHALLENGE);clear(res,LOGIN_CSRF);return void res.json({authenticated:true});
   }
   if(path==='/api/auth/session'&&req.method==='GET'){await identity.verify(req);return void res.json({authenticated:true});}
   if(['/api/auth/logout','/api/auth/delete-account'].includes(path)&&req.method==='POST'){
    const csrf=mutation(req);const token=cookie(req,SESSION);if(!valid(token))return void fail(401,'UNAUTHENTICATED');if(path.endsWith('delete-account')&&(req.body?.confirm!=='disable-account'||Object.keys(req.body).some(k=>k!=='confirm')))return void fail(422,'CONFIRMATION_REQUIRED');
    const r=await deps.transport('POST',path.endsWith('logout')?'/internal/auth/logout':'/internal/auth/delete-account',{},token,csrf);if(r.status!==200)return void fail(401,'UNAUTHENTICATED');clear(res,SESSION);clear(res,CSRF);return void res.json({revoked:true,financial_records_deleted:false});
   }
   fail(404,'NOT_FOUND');
  }catch(error){if((error as Error)?.message==='UNAUTHENTICATED')return void fail(401,'UNAUTHENTICATED');if((error as Error)?.message==='CSRF_INVALID')return void fail(403,'CSRF_INVALID');fail(503,'AUTHENTICATION_UNAVAILABLE');}
 };
 return {handler,identity};
}
export function authGatewayFromEnvironment():AuthGateway{
 if(!process.env.PAYMENT_AUTH_CONFIG_FILE)return createAuthGateway();
 const c=JSON.parse(readFileSync(process.env.PAYMENT_AUTH_CONFIG_FILE,'utf8'));if(!c.approval_reference||!c.issuer||!c.audience||!['local','test','sandbox','staging','production'].includes(c.environment)||c.environment!==process.env.PAYMENT_MODE)throw Error('IDENTITY_CONFIGURATION_UNAPPROVED');
 const transport=createAuthMTLSTransport({url:process.env.PAYMENT_INTERNAL_URL||'',caFile:process.env.PAYMENT_INTERNAL_CA_FILE||'',certFile:process.env.PAYMENT_INTERNAL_CERT_FILE||'',keyFile:process.env.PAYMENT_INTERNAL_KEY_FILE||''});
 return createAuthGateway({publicOrigin:process.env.PAYMENT_PUBLIC_ORIGIN||'',environment:c.environment,transport});
}
