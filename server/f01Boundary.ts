import type {RequestHandler} from 'express';
import https from 'node:https';
import {readFileSync} from 'node:fs';

const API='/api/v1/f01/explore';
const unavailable=(code:string)=>({status:'UNAVAILABLE',code,contract_version:'f01-sensitivity-v1',customer_timing_authorized:false,btr_status:'UNAVAILABLE_UNVALIDATED_DASHA_METHOD'});
function valid(input:any):boolean {
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 const required=['schema_version','birth_date','certainty','timezone','latitude','longitude'];
 const optional=['birth_time','uncertainty_minutes','utc_offset'];
 if(!Object.keys(input).every(k=>required.includes(k)||optional.includes(k))||!required.every(k=>Object.hasOwn(input,k)))return false;
 if(input.schema_version!==1||typeof input.birth_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.birth_date))return false;
 const d=new Date(input.birth_date+'T00:00:00Z');
 if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==input.birth_date||d.getUTCFullYear()<1900||d.getUTCFullYear()>2100)return false;
 if(!Number.isFinite(input.latitude)||Math.abs(input.latitude)>=89.999999||!Number.isFinite(input.longitude)||Math.abs(input.longitude)>180)return false;
 if(typeof input.timezone!=='string'||!input.timezone||input.timezone==='Local'||input.timezone.length>100||input.timezone.trim()!==input.timezone)return false;
 try {new Intl.DateTimeFormat('en',{timeZone:input.timezone})}catch{return false}
 if(input.certainty==='UNKNOWN')return input.birth_time===undefined&&input.uncertainty_minutes===undefined&&input.utc_offset===undefined;
 if(!['EXACT','APPROXIMATE'].includes(input.certainty)||typeof input.birth_time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.birth_time))return false;
 if(input.utc_offset!==undefined&&(!Number.isFinite(input.utc_offset)||input.utc_offset< -12||input.utc_offset>14))return false;
 if(input.certainty==='EXACT')return input.uncertainty_minutes===undefined||input.uncertainty_minutes===0;
 return Number.isInteger(input.uncertainty_minutes)&&input.uncertainty_minutes>=1&&input.uncertainty_minutes<=1440;
}
function validResponse(r:any,request:any):boolean{
 if(!r||r.schema_version!==1||r.contract_version!=='f01-sensitivity-v1'||r.status!=='COMPUTED_UNVERIFIED'||r.customer_timing_authorized!==false||r.btr_status!=='UNAVAILABLE_UNVALIDATED_DASHA_METHOD'||r.authority?.production_eligible!==false)return false;
 if(r.birth_input?.birth_date!==request.birth_date||r.birth_input?.certainty!==request.certainty||r.birth_input?.timezone!==request.timezone||r.birth_input?.latitude!==request.latitude||r.birth_input?.longitude!==request.longitude)return false;
 if(!Array.isArray(r.samples)||r.samples.length>97||r.samples.length<1||r.sample_count!==r.samples.length||!Array.isArray(r.factors)||r.factors.length>100||!Array.isArray(r.limitations)||r.limitations.length>20)return false;
 if(r.house_system!=='SWISS_S_SIDEREAL_LAHIRI'||!r.factors.every((f:any)=>typeof f.name==='string'&&f.name.length<=80&&['OBSERVED_STABLE_NOT_PROVEN','OBSERVED_VARIABLE','UNRESOLVED'].includes(f.classification)&&Array.isArray(f.observed_values)&&f.observed_values.length<=97))return false;
 return true;
}
type Transport=(data:any)=>Promise<{status:number;body:any}>;
export function f01Gateway(transport?:Transport):RequestHandler{return async(req,res)=>{
 res.set('Cache-Control','no-store');
 const fail=(status:number,code:string)=>res.status(status).json(unavailable(code));
 if(req.originalUrl.split('?')[0]!==API)return void fail(404,'NOT_FOUND');
 if(Object.keys(req.query).length)return void fail(422,'URL_PARAMETERS_NOT_ALLOWED');
 if(req.method!=='POST')return void fail(405,'METHOD_NOT_ALLOWED');
 if(!valid(req.body))return void fail(422,'INVALID_F01_REQUEST');
 if(!transport)return void fail(503,'NATIVE_F01_SERVICE_UNAVAILABLE');
 try{
  const r=await transport(req.body);
  if(r.status!==200||!validResponse(r.body,req.body))return void fail(503,'F01_RESULT_NOT_ACCEPTED');
  res.status(200).json(r.body);
 }catch{fail(503,'NATIVE_F01_SERVICE_UNAVAILABLE')}
};}
export function f01GatewayFromEnvironment():RequestHandler{
 const raw=process.env.F01_INTERNAL_URL;
 if(!raw)return f01Gateway();
 const base=new URL(raw);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/'||!(base.hostname==='localhost'||base.hostname.endsWith('.internal')||base.hostname.endsWith('.svc.cluster.local')))throw Error('F01_TRANSPORT_CONFIGURATION_INVALID');
 const ca=process.env.F01_INTERNAL_CA_FILE,cert=process.env.F01_INTERNAL_CERT_FILE,key=process.env.F01_INTERNAL_KEY_FILE;
 if(!ca||!cert||!key)throw Error('F01_TRANSPORT_CONFIGURATION_INVALID');
 const agent=new https.Agent({ca:readFileSync(ca),cert:readFileSync(cert),key:readFileSync(key),rejectUnauthorized:true,keepAlive:true,maxSockets:2});
 const transport:Transport=(body)=>new Promise((resolve,reject)=>{
  const bytes=Buffer.from(JSON.stringify(body));
  const req=https.request(new URL(API,base),{agent,method:'POST',timeout:9000,headers:{'Content-Type':'application/json','Content-Length':bytes.length}},response=>{
   const chunks:Buffer[]=[];let total=0;
   response.on('data',(b:Buffer)=>{total+=b.length;if(total>300000){response.destroy();reject(Error('OVERSIZE'))}else chunks.push(b)});
   response.on('error',reject);
   response.on('end',()=>{try{resolve({status:response.statusCode||503,body:JSON.parse(Buffer.concat(chunks).toString())})}catch{reject(Error('INVALID_RESPONSE'))}});
  });
  const deadline=setTimeout(()=>req.destroy(Error('TIMEOUT')),10000);
  req.once('close',()=>clearTimeout(deadline));req.on('timeout',()=>req.destroy(Error('TIMEOUT')));req.on('error',reject);req.end(bytes);
 });
 return f01Gateway(transport);
}
