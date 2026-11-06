import type {RequestHandler} from 'express';
import https from 'node:https';
import {readFileSync} from 'node:fs';
import {TIMING_ACTIVITIES,TIMING_RULE_VERSION,TIMING_VERSION,type TimingRequest} from '../src/engine/timingClient';
export type TimingTransport=(method:string,path:string,body?:TimingRequest)=>Promise<{status:number;body:any}>;
const paths=['/api/v1/timing/activities','/api/v1/timing/capability','/api/v1/timing/daily'];
const unavailable={schema_version:1,status:'UNAVAILABLE',code:'CORE_P0_01_NOT_VERIFIED',windows:[],limitations:['Personalized guidance requires independently verified native/Panchang inputs and owner-approved timing rules and release.','Traditional timing is not a scientific prediction or a guarantee of success or investment returns.']};
function keys(value:any,required:string[],optional:string[]=[]){return value&&typeof value==='object'&&!Array.isArray(value)&&required.every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>required.includes(k)||optional.includes(k));}
function date(value:unknown,min:number,max:number){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value&&d.getUTCFullYear()>=min&&d.getUTCFullYear()<=max;}
function place(p:any){if(typeof p.timezone!=='string'||p.timezone==='Local'||p.timezone.length>100||!Number.isFinite(p.latitude)||Math.abs(p.latitude)>90||!Number.isFinite(p.longitude)||Math.abs(p.longitude)>180)return false;try{new Intl.DateTimeFormat('en',{timeZone:p.timezone});return true;}catch{return false;}}
export function validTimingRequest(b:any):b is TimingRequest {
 if(!keys(b,['schema_version','birth','target','activity','rule_version','ephemeris_mode'])||b.schema_version!==1||b.rule_version!==TIMING_RULE_VERSION||!TIMING_ACTIVITIES.some(a=>a.id===b.activity)||!['MOSHIER','SWISS_FILE','JPL'].includes(b.ephemeris_mode))return false;
 if(!keys(b.birth,['date','certainty','timezone','latitude','longitude'],['time','utc_offset','uncertainty_minutes'])||!keys(b.target,['date','timezone','latitude','longitude'])||!place(b.birth)||!place(b.target)||!date(b.birth.date,1900,2100)||!date(b.target.date,2000,2100))return false;
 const birth=b.birth;
 if(birth.certainty==='UNKNOWN')return birth.time===undefined&&birth.utc_offset===undefined&&(birth.uncertainty_minutes===undefined||birth.uncertainty_minutes===0);
 if(!['EXACT','APPROXIMATE'].includes(birth.certainty)||typeof birth.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(birth.time))return false;
 if(birth.utc_offset!==undefined&&(!Number.isFinite(birth.utc_offset)||birth.utc_offset< -12||birth.utc_offset>14))return false;
 return birth.certainty==='EXACT'?(birth.uncertainty_minutes===undefined||birth.uncertainty_minutes===0):(Number.isInteger(birth.uncertainty_minutes)&&birth.uncertainty_minutes>=1&&birth.uncertainty_minutes<=1440);
}
export function createTimingGateway(transport?:TimingTransport):RequestHandler{return async(req,res)=>{
 res.set('Cache-Control','no-store');
 const fail=(status:number,code:string)=>res.status(status).json({...unavailable,code});
 const path=req.originalUrl.split('?')[0];
 if(Object.keys(req.query).length)return void fail(422,'URL_PARAMETERS_NOT_ALLOWED');
 if(!paths.includes(path))return void fail(404,'NOT_FOUND');
 if(path.endsWith('/activities')){if(req.method!=='GET')return void fail(405,'METHOD_NOT_ALLOWED');return void res.json({schema_version:1,rule_version:TIMING_RULE_VERSION,activities:TIMING_ACTIVITIES.map(a=>({...a,rule_version:TIMING_RULE_VERSION,status:'UNAVAILABLE',sources:[{reference:'OWNER_RULE_SOURCE_REQUIRED',locator:'Exact edition/passage and applicability not supplied',review_status:'UNAPPROVED'}],limitation:a.id==='finance'?'Traditional timing context only; no guaranteed profit, investment advantage or scientifically established predictive accuracy.':'Activity rules require source and owner review.'}))});}
 if(path.endsWith('/capability')){if(req.method!=='GET')return void fail(405,'METHOD_NOT_ALLOWED');return void res.json({schema_version:1,status:'UNAVAILABLE',calculation_version:TIMING_VERSION,rule_version:TIMING_RULE_VERSION,accuracy_status:'NOT_VERIFIED',release_authorized:false,missing_dependencies:['CORE_P0_01_NATIVE_REFERENCE_ACCEPTANCE','VERIFIED_PANCHANG_AND_SOLAR_EVENTS','OWNER_APPROVED_ACTIVITY_RULES','PERSONAL_TIMING_RELEASE_AUTHORIZATION']});}
 if(req.method!=='POST')return void fail(405,'METHOD_NOT_ALLOWED');
 if(Buffer.byteLength(JSON.stringify(req.body??null))>16384)return void fail(413,'REQUEST_TOO_LARGE');
 if(!validTimingRequest(req.body))return void fail(422,'INVALID_TIMING_REQUEST');
 const provenance={calculation_version:TIMING_VERSION,rule_version:TIMING_RULE_VERSION,ephemeris_mode:'UNAVAILABLE',requested_ephemeris_mode:req.body.ephemeris_mode,source:'NATIVE_SWISS_CONTRACT_UNAVAILABLE',calculated_at:new Date().toISOString(),accuracy_status:'NOT_VERIFIED',release_authorized:false};
 if(!transport)return void res.status(503).json({...unavailable,...(req.body.birth.certainty!=='EXACT'?{status:'INSUFFICIENT_EVIDENCE',code:'BIRTH_TIME_EVIDENCE_INSUFFICIENT'}:{}),activity:req.body.activity,provenance});
 try{
  const r=await transport('POST',path,req.body),b=r.body;
  if(r.status===422&&/^([A-Z][A-Z0-9_]{0,79})$/.test(b?.code))return void fail(422,b.code);
  // This deployed gateway never releases fixtures, or treats a remote status flag as accuracy authorization.
  if(r.status!==503||!['UNAVAILABLE','INSUFFICIENT_EVIDENCE'].includes(b?.status)||b.schema_version!==1||!Array.isArray(b.windows)||b.windows.length||b.provenance?.release_authorized!==false||!/^([A-Z][A-Z0-9_]{0,79})$/.test(b.code))throw Error();
  let day:undefined|object;
  if(b.day){const d=b.day,start=Date.parse(d.start),end=Date.parse(d.end);if(d.date!==req.body.target.date||d.timezone!==req.body.target.timezone||!Number.isFinite(start)||!Number.isFinite(end)||end-start<72000000||end-start>100800000||d.elapsed_seconds!==(end-start)/1000)throw Error();day={date:d.date,timezone:d.timezone,start:new Date(start).toISOString(),end:new Date(end).toISOString(),elapsed_seconds:d.elapsed_seconds};}
  res.status(503).json({...unavailable,status:b.status,code:b.code,activity:req.body.activity,provenance,...(day?{day}:{})});
 }catch{fail(503,'TIMING_SERVICE_UNAVAILABLE');}
};}
export function timingGatewayFromEnvironment():RequestHandler{
 const raw=process.env.TIMING_INTERNAL_URL;if(!raw)return createTimingGateway();
 const base=new URL(raw);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/'||!(base.hostname==='localhost'||base.hostname.endsWith('.internal')||base.hostname.endsWith('.svc.cluster.local')))throw Error('TIMING_TRANSPORT_CONFIGURATION_INVALID');
 const agent=new https.Agent({ca:readFileSync(process.env.TIMING_INTERNAL_CA_FILE||''),cert:readFileSync(process.env.TIMING_INTERNAL_CERT_FILE||''),key:readFileSync(process.env.TIMING_INTERNAL_KEY_FILE||''),rejectUnauthorized:true,maxSockets:4,keepAlive:true});
 const transport:TimingTransport=(method,path,body)=>new Promise((resolve,reject)=>{
  if(method!=='POST'||path!=='/api/v1/timing/daily')return reject(Error());
  const bytes=Buffer.from(JSON.stringify(body));const request=https.request(new URL(path,base),{method,agent,timeout:3500,headers:{'content-type':'application/json','content-length':bytes.length}},r=>{let size=0;const chunks:Buffer[]=[];r.on('data',chunk=>{size+=chunk.length;if(size>65536){r.destroy();reject(Error());}else chunks.push(chunk);});r.on('error',reject);r.on('end',()=>{try{resolve({status:r.statusCode||503,body:JSON.parse(Buffer.concat(chunks).toString())});}catch{reject(Error());}});});const deadline=setTimeout(()=>request.destroy(Error()),4000);request.once('close',()=>clearTimeout(deadline));request.on('timeout',()=>request.destroy(Error()));request.on('error',reject);request.end(bytes);
 });return createTimingGateway(transport);
}
