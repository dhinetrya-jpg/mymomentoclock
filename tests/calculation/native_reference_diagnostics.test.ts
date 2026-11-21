/**
 * DIAGNOSTIC ONLY — passing this harness means evidence integrity and calculation
 * execution, never astronomical acceptance. Policy is declared before measuring:
 * retain upstream0.0002deg band, refuse legacy incompatible-frame residuals, and
 * disclose nominal UTC-as-model-argument versus a fully specified dynamical scale.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {calculateFullChart,calculateJulianDay,getAyanamsa,AyanamsaType} from '../../src/engine/astroMath';
import {calculateHighPrecisionSun} from '../../src/engine/panchang';

const root=fileURLToPath(new URL('../../',import.meta.url));
const originalIntegrity=spawnSync('python3',['scripts/core-reference-acquire.py','verify'],{cwd:root,encoding:'utf8'});
assert.equal(originalIntegrity.status,0,'Captured original source integrity/extraction must pass before diagnostics: '+originalIntegrity.stderr);
const data=JSON.parse(readFileSync(new URL('./reference/acquired/normalized.json',import.meta.url),'utf8'));
interface Vector {id:string;body:string;utc:string;source_id:string;source_sha256:string;source_locator:string;reference_body:string;center:string;frame:string;time_scale:string;longitude_deg:number;longitude_tolerance_deg:number;independence:string}
const vectors=data.planetary as Vector[];
const policy=Object.freeze({status:'DIAGNOSTIC_NOT_INDEPENDENT_ACCURACY_ACCEPTANCE',upstreamLongitudeBandDegrees:0.0002,legacyFramePolicy:'NO_RESIDUAL_WHEN_FRAME_NOT_ESTABLISHED',timeModel:'NOMINAL_UTC_USED_AS_MODEL_ARGUMENT; EXTERNAL_UT1_TT_CORRECTIONS_NOT_ESTABLISHED',referenceStatus:'UPSTREAM_PUBLISHED_HORIZONS_DERIVED_NOT_DIRECT_NASA_CAPTURE'});
const norm=(angle:number)=>((angle%360)+360)%360;
const signed=(angle:number)=>norm(angle+180)-180;
function epoch(utc:string){const t=new Date(utc);assert.ok(Number.isFinite(t.getTime()));const year=t.getUTCFullYear(),month=t.getUTCMonth()+1,day=t.getUTCDate(),hour=t.getUTCHours(),minute=t.getUTCMinutes(),second=t.getUTCSeconds();return {t,jd:calculateJulianDay(year,month,day,hour,minute,second)};}
function validate(v:Vector){assert.equal(v.source_id,'skyfield-horizons-tests');assert.equal(v.center,'Earth center');assert.equal(v.frame,'APPARENT_GEOCENTRIC_ECLIPTIC_OF_DATE');assert.equal(v.time_scale,'UTC');assert.equal(v.independence,policy.referenceStatus);assert.match(v.source_sha256,/^[a-f0-9]{64}$/);assert.ok(v.source_locator.length>0);assert.ok(Number.isFinite(v.longitude_deg)&&v.longitude_deg>=0&&v.longitude_deg<360);assert.equal(v.longitude_tolerance_deg,policy.upstreamLongitudeBandDegrees);}

test('diagnostic: source-bound preview apparent Sun measurements; no accuracy acceptance',()=>{
 const selected=vectors.filter(v=>v.body==='sun');assert.equal(selected.length,2);
 const rows=selected.map(v=>{validate(v);assert.equal(v.reference_body,'Sun');const actual=calculateHighPrecisionSun(epoch(v.utc).jd).apparentLongitude;assert.ok(Number.isFinite(actual));const residual=signed(actual-v.longitude_deg);return {reference_id:v.id,utc:v.utc,reference_source:v.source_id,source_sha256:v.source_sha256,reference_frame:v.frame,reference_deg:v.longitude_deg,actual_analytical_apparent_deg:actual,signed_residual_deg:residual,absolute_residual_deg:Math.abs(residual),unchanged_upstream_band_deg:v.longitude_tolerance_deg,band_relation:Math.abs(residual)>v.longitude_tolerance_deg?'OUTSIDE_UPSTREAM_BAND':'WITHIN_BAND_NOT_ACCURACY_ACCEPTANCE',scientific_acceptance:'NOT_ACCEPTED_TIME_MODEL_AND_REFERENCE_SCOPE_LIMITED'};});
 const errors=rows.map(r=>r.absolute_residual_deg).sort((a,b)=>a-b);const summary={body:'sun',mode:'ANALYTICAL_APPROXIMATION',sample_count:errors.length,maximum_deg:errors[errors.length-1],mean_deg:errors.reduce((a,b)=>a+b,0)/errors.length,median_deg:(errors[0]+errors[1])/2,p95_nearest_rank_deg:errors[Math.ceil(errors.length*0.95)-1],outside_upstream_band_count:rows.filter(r=>r.band_relation==='OUTSIDE_UPSTREAM_BAND').length,native_comparison_performed:false};
 console.log(JSON.stringify({diagnostic_policy:policy,summary,measurements:rows}));
});

test('diagnostic: legacy sidereal conversion is explicit, incompatible-frame residuals remain unavailable',()=>{
 assert.equal(vectors.length,3);
 const rows=vectors.map(v=>{validate(v);const {t,jd}=epoch(v.utc);const chart=calculateFullChart(t.toISOString().slice(0,10),t.toISOString().slice(11,19),0,0,'',0,AyanamsaType.TRUE_LAHIRI);const name=v.body==='sun'?'Sun':v.body==='mars'?'Mars':'';assert.ok(name);const planet=chart.planets.find(p=>p.name===name);assert.ok(planet);assert.equal(chart.systemMetadata.independentValidationStatus,'NOT_PERFORMED');const ayanamsa=getAyanamsa(jd,AyanamsaType.TRUE_LAHIRI);const reconstruction=norm(planet.longitude+ayanamsa);assert.ok(Number.isFinite(reconstruction));return {reference_id:v.id,utc:v.utc,legacy_sidereal_deg:planet.longitude,model_ayanamsa_deg:ayanamsa,reconstructed_tropical_deg:reconstruction,sidereal_to_tropical_policy:'INVERT_SAME_LEGACY_MODEL_AYANAMSA; POSITION_QUANTIZED_TO_0.0001_DEG',frame_compatibility:'NOT_ESTABLISHED',source_body:v.reference_body,reason:v.body==='mars'?'MARS_BARYCENTER_REFERENCE_VS_UNESTABLISHED_LEGACY_GEOCENTRIC_REDUCTION':'APPARENT_CORRECTIONS_NOT_ESTABLISHED_FOR_LEGACY_CHART',scientific_residual_deg:null,scientific_acceptance:'BLOCKED'};});
 console.log(JSON.stringify({diagnostic_policy:policy,legacy_reconstructions:rows}));
});
