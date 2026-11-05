import {createPaymentBoundary,sandboxPaymentBoundaryFromEnvironment} from './server/paymentBoundary';
/** Authoritative web boundary: anonymous stateless previews; protected capabilities fail closed. */
import express from 'express';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import http from 'node:http';
import {access} from 'node:fs/promises';
import { calculateFullChart, AyanamsaType } from './src/engine/astroMath';
import { executeBirthTimeRectification } from './src/engine/btrProcessor';
import { MAJOR_CITIES_MUHURAT, calculatePersonalGoldenWindow } from './src/engine/diwaliData';
import { CalculationInputError, validateBirthInput, TIMEZONE_LIMITATION } from './src/engine/calculationValidation';
import { runEngineUatSuite } from './src/engine/uatAndStress';
dotenv.config({quiet:true});
export const app = express();
app.disable('x-powered-by');
let active=0,windowStart=Date.now(),windowCount=0;
app.use((req,res,next)=>{
  const requestId=crypto.randomUUID(); res.locals.requestId=requestId;
  res.set({'X-Request-ID':requestId,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
  if(req.path.startsWith('/api')) res.set('Cache-Control','no-store');
  if(process.env.NODE_ENV==='production') {
    const sandbox=process.env.PAYMENT_MODE==='sandbox'&&process.env.RAZORPAY_SANDBOX_APPROVED==='owner-approved';
    const sdk=sandbox?' https://checkout.razorpay.com':'';
    const api=sandbox?' https://api.razorpay.com':'';
    res.set('Content-Security-Policy',`default-src 'self'; script-src 'self'${sdk}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; worker-src 'self' blob:; connect-src 'self'${api}; frame-src 'self'${api}${sdk}; frame-ancestors 'none'`);
  }
  if(Date.now()-windowStart>60000){windowStart=Date.now();windowCount=0;}
  if(++windowCount>600 || active>=8) return res.status(429).json({error:'RATE_LIMITED',message:'Please try again shortly.',request_id:requestId});
  active++;let released=false;const release=()=>{if(!released){active--;released=true;}};res.once('finish',release);res.once('close',release);next();
});
app.use(express.json({limit:'64kb',strict:false}));
const unavailable=(code:string,message:string)=>(_req:express.Request,res:express.Response)=>res.status(503).json({error:code,status:'UNAVAILABLE',message,request_id:res.locals.requestId,is_certified:false,is_graph_verified:false,vector_matrix:null});
const graphUnavailable=unavailable('PROFILE_GRAPH_UNAVAILABLE','Profile calculations are unavailable until secure sign-in, ownership checks and verified rules are configured.');
const paymentUnavailable=unavailable('PAYMENT_PROVIDER_UNAVAILABLE','Checkout is not enabled. No payment or access entitlement has been created.');
const capabilities={chart:'UNVALIDATED_ANALYTICAL_PREVIEW',btr:'UNAVAILABLE',personal_timing:'UNAVAILABLE',profiles:'UNAVAILABLE',payments:'UNAVAILABLE',ai:'UNAVAILABLE'};
app.get(['/health','/api/v1/health','/ready'],(_req,res)=>res.json({status:'healthy',capabilities}));
app.get('/api/capabilities',(_req,res)=>res.json(capabilities));
// No public payment adapter or entitlement storage is activated. These boundaries cannot be toggled by a client or env flag.
app.all('/api/payment/simulate-webhook',(_req,res)=>res.status(404).json({error:'NOT_FOUND',message:'This operation is not available.',request_id:res.locals.requestId}));
// No approved identity adapter is registered. Sandbox env alone cannot authorize a customer.
app.use('/api/payment',process.env.PAYMENT_MODE==='sandbox'?sandboxPaymentBoundaryFromEnvironment():createPaymentBoundary());
app.all('/api/v1/webhook/payment',paymentUnavailable);
app.all('/api/v1/graph/hydrate',graphUnavailable);
app.all('/api/v1/resolver/evaluate',graphUnavailable);
app.all('/api/astro/resolve-conflict',unavailable('RESOLVER_UNAVAILABLE','Decision rules and graph evidence have not been verified.'));
app.all('/api/astro/remedies',unavailable('REMEDIES_UNAVAILABLE','Personal remedy recommendations have not been verified.'));
app.all('/api/astro/stream-reading',unavailable('AI_UNAVAILABLE','Private AI readings are unavailable. No personal data is sent to an AI provider.'));
app.all(['/metrics','/api/astro/stress-test'],(_req,res)=>res.status(404).json({error:'NOT_FOUND',message:'Internal diagnostics are not publicly available.',request_id:res.locals.requestId}));
app.get('/api/astro/uat-test',(_req,res)=>process.env.NODE_ENV==='test'?res.json(runEngineUatSuite()):res.status(404).json({error:'TEST_ONLY_ENDPOINT',message:'Internal diagnostics are not available.'}));
function birth(raw:any){
  if(raw && ['profileId','profile_id','birth_profile_id','chart_id','userId','user_id'].some(k=>raw[k]!==undefined)) throw new CalculationInputError('PROFILE_AUTHENTICATION_UNAVAILABLE','Stored profiles require secure sign-in and ownership checks.');
  validateBirthInput(raw);return raw;
}
app.post('/api/astro/calculate',(req,res,next)=>{try{
  const p=birth(req.body);
  const chart=calculateFullChart(p.birthDate,p.birthTime,p.latitude,p.longitude,p.cityName||'',p.timezoneOffset,p.ayanamsaType||AyanamsaType.TRUE_LAHIRI);
  res.json({...chart,schema_version:3,scope_metadata:{method:'ANALYTICAL_APPROXIMATION',status:'UNVALIDATED_PREVIEW',natal_data_used:true,independent_validation_status:'NOT_PERFORMED',birth_time_certainty:p.birthTimeCertainty||'UNSPECIFIED',limitations:[TIMEZONE_LIMITATION,'Browser analytical positions are not Swiss Ephemeris results or independently validated predictions.']}});
}catch(e){next(e);}});
function rectify(req:express.Request,res:express.Response,next:express.NextFunction){try{
  const legacy=req.path==='/api/v1/btr/rectify';const raw=req.body||{};const bp=legacy?raw.base_payload:raw;
  const p=birth(legacy?{...bp,birthDate:bp?.birth_date,birthTime:bp?.birth_time,timezoneOffset:bp?.timezone_offset,ayanamsaType:bp?.ayanamsa_type,birthTimeCertainty:bp?.birth_time_certainty}:bp);
  const result=executeBirthTimeRectification(p.birthDate,p.birthTime,p.latitude,p.longitude,p.cityName||'',raw.milestones,15,15,p.timezoneOffset,p.ayanamsaType);
  res.json({...result,schema_version:2,is_certified:false,...(legacy?{rectified_time:result.candidate_birth_time,rectified_seconds_delta:result.offsetSeconds,iterations_executed:result.testedCandidatesCount,status:'HEURISTIC_CANDIDATE'}:{})});
}catch(e){next(e);}}
app.post(['/api/astro/rectify-btr','/api/v1/btr/rectify'],rectify);
app.get('/api/astro/muhurat',(req,res)=>{
  const cities=Object.keys(MAJOR_CITIES_MUHURAT);const list={allSupportedCities:cities};
  if(typeof req.query.city!=='string'||!req.query.city.trim()) return res.status(422).json({error:'LOCATION_REQUIRED',message:'Select the event city.',...list});
  const city=cities.find(c=>c.toLowerCase()===(req.query.city as string).trim().toLowerCase());
  if(!city)return res.status(422).json({error:'UNSUPPORTED_LOCATION',message:'Choose a supported event city.',...list});
  if(['latitude','longitude','timezone'].some(k=>req.query[k]!==undefined)) return res.status(422).json({error:'UNSUPPORTED_LOCATION_INPUT',message:'Location overrides are unavailable.',...list});
  if(['activity','duration','tradition','date'].some(k=>req.query[k]!==undefined))return res.status(422).json({error:'UNSUPPORTED_TIMING_REQUEST',message:'This timing calculation is unavailable.'});
  const cityData=MAJOR_CITIES_MUHURAT[city],goldenWindow=calculatePersonalGoldenWindow('',cityData);
  res.json({cityData,goldenWindow,...list,scope_metadata:{...goldenWindow.scope_metadata,scope:'GENERAL_LOCATION_BASED',status:'PREVIEW',location:city,timezone:cityData.timezone,activity_rules_used:false,calculation_version:'static-preview-2026-v1'}});
});
app.use(['/assets/aistudio','/public/assets/aistudio'],(_req,res)=>res.status(404).json({error:'NOT_FOUND',message:'Historical implementation artifacts are not public content.'}));
app.use('/api',(_req,res)=>res.status(404).json({error:'NOT_FOUND',message:'This API is not available.',request_id:res.locals.requestId}));
const handleError=(err:any,_req:express.Request,res:express.Response,next:express.NextFunction)=>{
  if(res.headersSent)return next(err);
  let code='INTERNAL_ERROR',message='The request could not be completed.',status=500;
  if(err instanceof CalculationInputError){code=err.code;message=err.message;status=code==='PROFILE_AUTHENTICATION_UNAVAILABLE'?401:code.endsWith('_UNAVAILABLE')?503:422;}
  else if(err?.type==='entity.too.large'){code='REQUEST_TOO_LARGE';message='The request is too large.';status=413;}
  else if(err instanceof SyntaxError || err?.status===400){code='INVALID_JSON';message='Send valid JSON.';status=400;}
  if(status===500)console.error(JSON.stringify({event:'request_failed',code,request_id:res.locals.requestId}));
  res.status(status).json({error:code,message,request_id:res.locals.requestId,...(status===503?{schema_version:3,assessment_status:'UNAVAILABLE',is_certified:false,candidate_fit_score:null,candidate_birth_time:null,independent_validation_status:'NOT_PERFORMED'}:{})});
};
async function startServer(){
  if(process.env.NODE_ENV==='production'){
    await access('dist/index.html');
    app.use(express.static('dist'));
    app.use('/assets',(_req,res)=>res.status(404).json({error:'ASSET_NOT_FOUND',message:'This asset is not available.'}));
    app.get('*',(_req,res)=>res.sendFile('dist/index.html',{root:process.cwd()}));
  }else{const {createServer}=await import('vite');app.use((await createServer({server:{middlewareMode:true},appType:'spa'})).middlewares);}
  app.use(handleError);
  const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw Error('INVALID_PORT');
  const server=http.createServer(app);
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
  server.once('error',()=>{console.error(JSON.stringify({event:'startup_failed',code:'WEB_STARTUP_FAILED'}));process.exit(1);});
  server.listen(port,'0.0.0.0',()=>console.log('MyMomentOclock web service ready'));
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();});
}
startServer().catch(()=>{console.error(JSON.stringify({event:'startup_failed',code:'WEB_STARTUP_FAILED'}));process.exit(1);});
