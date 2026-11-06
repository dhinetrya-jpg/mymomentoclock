import type {Request, Response, RequestHandler} from 'express';
import https from 'node:https';
import {readFileSync} from 'node:fs';
import {ProductionPermit} from './releasePolicy';

export interface VerifiedSessionAdapter {
  productionReady: boolean;
  // Verify real issuer/audience/expiry/session; return the ORIGINAL bearer token for Go re-verification.
  verify(req: Request): Promise<{bearerToken: string;csrfToken?:string}>;
}
export type PaymentTransport = (method: string, path: string, body: object|undefined, token: string, csrfToken?:string,requestId?:string) => Promise<{status: number; body: unknown}>;
function makeMTLSTransport(config: {url: string; caFile: string; certFile: string; keyFile: string},authOnly=false): PaymentTransport {
  const base=new URL(config.url);
  if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/') throw Error('PAYMENT_CONFIGURATION_INVALID');
  const agent=new https.Agent({ca:readFileSync(config.caFile),cert:readFileSync(config.certFile),key:readFileSync(config.keyFile),rejectUnauthorized:true,minVersion:'TLSv1.3',keepAlive:true,maxSockets:8,timeout:5000});
  return (method,path,body,token,csrfToken,requestId)=>new Promise((resolve,reject)=>{
    if(!(authOnly?/^\/internal\/auth\/(challenge|login|session|logout|delete-account)$/.test(path):/^\/api\/payment\/(orders(?:\/[A-Za-z0-9_-]{1,200})?|entitlements|catalog)$/.test(path))||!['GET','POST'].includes(method)||(!token&&!['/internal/auth/challenge','/internal/auth/login'].includes(path))||/[\r\n]/.test(token)|| (csrfToken!==undefined&&!/^[a-f0-9]{64}$/.test(csrfToken))){reject(Error('INVALID_PAYMENT_REQUEST'));return;}
    const data=body===undefined?undefined:JSON.stringify(body);
    const request=https.request(new URL(path,base),{method,agent,headers:{...(token?{authorization:`Bearer ${token}`} :{}),...(csrfToken?{'x-csrf-token':csrfToken}:{}),...(requestId&&/^[a-f0-9-]{36}$/.test(requestId)?{'x-request-id':requestId}:{}),'content-type':'application/json',...(data?{'content-length':Buffer.byteLength(data)}:{})}},response=>{
      const chunks:Buffer[]=[];let size=0;
      response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>65536){response.destroy();reject(Error('PAYMENT_RESPONSE_INVALID'));return;}chunks.push(chunk);});
      response.on('error',()=>reject(Error('PAYMENT_SERVICE_UNAVAILABLE')));
      response.on('end',()=>{try{const status=response.statusCode||503;if(status>=300&&status<400)throw Error();resolve({status,body:JSON.parse(Buffer.concat(chunks).toString())});}catch{reject(Error('PAYMENT_RESPONSE_INVALID'));}});
    });
    request.setTimeout(5000,()=>request.destroy(Error('PAYMENT_TIMEOUT')));
    request.on('error',()=>reject(Error('PAYMENT_SERVICE_UNAVAILABLE')));
    if(data)request.write(data);request.end();
  });
}
export const createMTLSTransport=(config:{url:string;caFile:string;certFile:string;keyFile:string})=>makeMTLSTransport(config);
export const createAuthMTLSTransport=(config:{url:string;caFile:string;certFile:string;keyFile:string})=>makeMTLSTransport(config,true);
// No test identity/provider registry or environment flag exists in the running Node application.
// Test doubles are supplied by tests only, never a production configuration selector.
export function createPaymentBoundary(deps?:{identity:VerifiedSessionAdapter; transport:PaymentTransport; activationApproved:boolean;productionPermit?:ProductionPermit}):RequestHandler{
  return async(req:Request,res:Response)=>{
    res.setHeader('Cache-Control','no-store');
    const fail=(status:number,error:string)=>res.status(status).json({error,status:'UNAVAILABLE',request_id:res.locals.requestId,is_certified:false,is_graph_verified:false,vector_matrix:null});
    if(!deps?.activationApproved||!deps.identity.productionReady)return void fail(503,'PAYMENT_PROVIDER_UNAVAILABLE');
    try{
      if(Object.keys(req.query).length)return void fail(422,'INVALID_REQUEST');
      const path=req.originalUrl.split('?')[0];
      if(!/^\/api\/payment\/(orders(?:\/[A-Za-z0-9_-]{1,200})?|entitlements|catalog)$/.test(path)||!['GET','POST'].includes(req.method))return void fail(404,'NOT_FOUND');
      let body:object|undefined;
      if(req.method==='POST'){
        const input=req.body;
        if(path!=='/api/payment/orders'||!input||Array.isArray(input)||Object.keys(input).some(k=>!['product_id','idempotency_key'].includes(k))||typeof input.product_id!=='string'||typeof input.idempotency_key!=='string')return void fail(422,'INVALID_REQUEST');
        body={product_id:input.product_id,idempotency_key:input.idempotency_key};
      }
      let token:string;let csrfToken:string|undefined;
      try{const session=await deps.identity.verify(req);token=session.bearerToken;csrfToken=session.csrfToken;}catch(error){return void fail((error as Error)?.message==='CSRF_INVALID'?403:401,(error as Error)?.message==='CSRF_INVALID'?'CSRF_INVALID':'UNAUTHENTICATED');}
      const result=await deps.transport(req.method,path,body,token,csrfToken,res.locals.requestId);
      if(result.status!==200){const status=[401,404,409,422].includes(result.status)?result.status:503;return void fail(status,status===401?'UNAUTHENTICATED':status===404?'ORDER_NOT_FOUND':status===409?((result.body as any)?.error==='ALREADY_PURCHASED'?'ALREADY_PURCHASED':'PAYMENT_CONFLICT'):status===422?'INVALID_REQUEST':'PAYMENT_SERVICE_UNAVAILABLE');}
      // Explicit allowlist: never forward internal metadata, provider credentials, customer IDs or headers.
      const value=result.body as Record<string,unknown>;
      if(path==='/api/payment/catalog'){if(!Array.isArray(value?.products))throw Error();return void res.json({products:value.products.map((p:any)=>{if(typeof p.id!=='string'||typeof p.version!=='string'||typeof p.capability!=='string'||!Number.isSafeInteger(p.amount_minor)||p.amount_minor<=0||p.currency!=='INR')throw Error();return {id:p.id,version:p.version,capability_id:p.capability,amount_minor:p.amount_minor,currency:p.currency,commercial_policy:publicPolicy(p.commercial_policy)};})});}
      if(path==='/api/payment/entitlements'){
        if(!Array.isArray(value?.entitlements))throw Error();
        const entitlements=value.entitlements.map((v:any)=>{if(typeof v.capability_id!=='string'||typeof v.source_order!=='string')throw Error();return {capability_id:v.capability_id,source_order:v.source_order,...(typeof v.expires_at==='string'?{expires_at:v.expires_at}:{})};});
        return void res.json({entitlements});
      }
      if(!value||typeof value.order_id!=='string'||typeof value.product_id!=='string'||typeof value.status!=='string'||!Number.isSafeInteger(value.amount_minor)||Number(value.amount_minor)<=0||typeof value.currency!=='string'||!/^[A-Z]{3}$/.test(value.currency)||!['CREATED','PENDING','COMPLETED','FAILED','CANCELLED','EXPIRED','REFUNDED','REVERSED','PAYMENT_REVIEW'].includes(value.status)||typeof value.product_version!=='string'||typeof value.capability_id!=='string')throw Error();
      let checkout:object|undefined;
      if(value.checkout!==undefined){const c=value.checkout as any;const live=deps.productionPermit instanceof ProductionPermit&&deps.productionPermit.valid();if((live?c?.mode!=='production':c?.mode!=='sandbox')||typeof c.key_id!=='string'||!(live?/^rzp_live_[A-Za-z0-9]+$/:/^rzp_test_[A-Za-z0-9]+$/).test(c.key_id)||typeof c.provider_order_id!=='string'||!/^order_[A-Za-z0-9]+$/.test(c.provider_order_id))throw Error();checkout={mode:c.mode,key_id:c.key_id,provider_order_id:c.provider_order_id};}
      const policy=value.commercial_policy===undefined?undefined:publicPolicy(value.commercial_policy);
      res.json({... (checkout?{checkout}:{}),...(policy?{commercial_policy:policy}:{}),order_id:value.order_id,status:value.status,amount_minor:value.amount_minor,currency:value.currency,product_id:value.product_id,product_version:value.product_version,capability_id:value.capability_id});
    }catch{return void fail(503,'PAYMENT_SERVICE_UNAVAILABLE');}
  };
}

export function sandboxPaymentBoundaryFromEnvironment(identity?:VerifiedSessionAdapter):RequestHandler {
  if(process.env.PAYMENT_MODE!=='sandbox'||process.env.RAZORPAY_SANDBOX_APPROVED!=='owner-approved'||!identity?.productionReady)return createPaymentBoundary();
  const required=['PAYMENT_INTERNAL_URL','PAYMENT_INTERNAL_CA_FILE','PAYMENT_INTERNAL_CERT_FILE','PAYMENT_INTERNAL_KEY_FILE'] as const;
  if(required.some(k=>!process.env[k]))throw Error('SANDBOX_TRANSPORT_CONFIGURATION_INVALID');
  const transport=createMTLSTransport({url:process.env.PAYMENT_INTERNAL_URL!,caFile:process.env.PAYMENT_INTERNAL_CA_FILE!,certFile:process.env.PAYMENT_INTERNAL_CERT_FILE!,keyFile:process.env.PAYMENT_INTERNAL_KEY_FILE!});
  return createPaymentBoundary({identity,transport,activationApproved:true});
}

function publicPolicy(raw:unknown){const p=raw as Record<string,unknown>;const result:Record<string,string>={};for(const k of ['description','access_disclosure','tax_disclosure','refund_disclosure','billing_model']){if(typeof p?.[k]!=='string'||(p[k] as string).length>1000)throw Error('INVALID_COMMERCIAL_POLICY');result[k]=p[k] as string;}if(result.billing_model!=='one_time')throw Error('INVALID_COMMERCIAL_POLICY');return result;}
