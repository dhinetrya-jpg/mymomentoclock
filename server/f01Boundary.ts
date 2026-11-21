import type {RequestHandler} from 'express';
import https from 'node:https';
import {readFileSync} from 'node:fs';

const API='/api/v1/f01/explore';
const unavailable=(code:string)=>({status:'UNAVAILABLE',code,contract_version:'f01-sensitivity-v1',customer_timing_authorized:false,btr_status:'UNAVAILABLE_UNVALIDATED_DASHA_METHOD'});
function valid(input:any):boolean {
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 const required=['schema_version','birth_date','certainty','timezone','latitude','longitude'];
 const optional=['birth_time','uncertainty_minutes','utc_offset','earliest_time','latest_time','latest_date','earliest_utc_offset','latest_utc_offset'];
 if(!Object.keys(input).every(k=>required.includes(k)||optional.includes(k))||!required.every(k=>Object.hasOwn(input,k)))return false;
 if(input.schema_version!==1||typeof input.birth_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.birth_date))return false;
 const d=new Date(input.birth_date+'T00:00:00Z');
 if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==input.birth_date||d.getUTCFullYear()<1900||d.getUTCFullYear()>2100)return false;
 if(!Number.isFinite(input.latitude)||Math.abs(input.latitude)>=89.999999||!Number.isFinite(input.longitude)||Math.abs(input.longitude)>180)return false;
 if(typeof input.timezone!=='string'||!input.timezone||input.timezone==='Local'||input.timezone.length>100||input.timezone.trim()!==input.timezone)return false;
 try {new Intl.DateTimeFormat('en',{timeZone:input.timezone})}catch{return false}
 const hasRange=['earliest_time','latest_time','latest_date','earliest_utc_offset','latest_utc_offset'].some(k=>input[k]!==undefined);
 const offsetOK=(n:any)=>n===undefined||(Number.isFinite(n)&&n>=-12&&n<=14);
 if(input.certainty==='RANGE'){
   if(input.birth_time!==undefined||input.uncertainty_minutes!==undefined||input.utc_offset!==undefined||!offsetOK(input.earliest_utc_offset)||!offsetOK(input.latest_utc_offset))return false;
   if(typeof input.earliest_time!=='string'||typeof input.latest_time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.earliest_time)||!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.latest_time))return false;
   if(input.latest_date!==undefined){
     if(typeof input.latest_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(input.latest_date))return false;
     const last=new Date(input.latest_date+'T00:00:00Z');
     if(!Number.isFinite(+last)||last.toISOString().slice(0,10)!==input.latest_date||(+last-(+d))!==0&&(+last-(+d))!==86400000)return false;
   }
   return true;
 }
 if(hasRange)return false;
 if(input.certainty==='UNKNOWN')return input.birth_time===undefined&&input.uncertainty_minutes===undefined&&input.utc_offset===undefined;
 if(!['EXACT','APPROXIMATE'].includes(input.certainty)||typeof input.birth_time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(input.birth_time))return false;
 if(input.utc_offset!==undefined&&(!Number.isFinite(input.utc_offset)||input.utc_offset< -12||input.utc_offset>14))return false;
 if(input.certainty==='EXACT')return input.uncertainty_minutes===undefined||input.uncertainty_minutes===0;
 return Number.isInteger(input.uncertainty_minutes)&&input.uncertainty_minutes>=1&&input.uncertainty_minutes<=1440;
}
function validResponse(r:any,request:any):boolean{
 if(!r||r.schema_version!==1||r.contract_version!=='f01-sensitivity-v1'||r.status!=='COMPUTED_UNVERIFIED'||r.customer_timing_authorized!==false||r.btr_status!=='UNAVAILABLE_UNVALIDATED_DASHA_METHOD'||r.authority?.production_eligible!==false)return false;
 if(r.birth_input!==undefined)return false;
 if(!Array.isArray(r.samples)||r.samples.length>17||r.samples.length<1||r.sample_count!==r.samples.length||!Array.isArray(r.factors)||r.factors.length>100||!Array.isArray(r.limitations)||r.limitations.length>20||!r.limitations.every((s:any)=>typeof s==='string'&&s.length<=1000))return false;
 if(!Array.isArray(r.transition_brackets)||r.transition_brackets.length>2048||!r.transition_brackets.every((b:any)=>typeof b.factor==='string'&&b.factor.length<80&&typeof b.from_value==='string'&&typeof b.to_value==='string'&&Number.isFinite(Date.parse(b.from_utc))&&Number.isFinite(Date.parse(b.to_utc))&&Date.parse(b.from_utc)<Date.parse(b.to_utc)&&['OBSERVED_CHANGE_BOUNDED_BY_SAMPLES_NOT_EXACT_TRANSITION','OBSERVED_CHANGE_WITH_INTERMEDIATE_STATE_UNRESOLVED'].includes(b.evidence)))return false;
 if(r.house_system!=='SWISS_S_SIDEREAL_LAHIRI'||!r.factors.every((f:any)=>typeof f.name==='string'&&f.name.length<=80&&['OBSERVED_STABLE_NOT_PROVEN','OBSERVED_VARIABLE','UNRESOLVED'].includes(f.classification)&&typeof f.note==='string'&&f.note.length<=1000&&Array.isArray(f.observed_values)&&f.observed_values.length<=17&&f.observed_values.every((v:any)=>typeof v==='string'&&v.length<=50)))return false;
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
  // Project a fixed response schema. Do not forward upstream birth details,
  // raw natal samples or arbitrary metadata to the public web boundary.
  const b=r.body;
  res.status(200).json({
   schema_version:1,status:b.status,contract_version:b.contract_version,
   timezone_database:b.timezone_database,house_system:b.house_system,
   start_utc:b.start_utc,end_utc:b.end_utc,sample_count:b.sample_count,
   factors:b.factors.map((f:any)=>({name:f.name,classification:f.classification,observed_values:f.observed_values,note:f.note})),
   transition_brackets:b.transition_brackets.map((t:any)=>({factor:t.factor,from_value:t.from_value,to_value:t.to_value,from_utc:t.from_utc,to_utc:t.to_utc,evidence:t.evidence})),
   limitations:b.limitations,customer_timing_authorized:false,
   btr_status:'UNAVAILABLE_UNVALIDATED_DASHA_METHOD'
  });
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
