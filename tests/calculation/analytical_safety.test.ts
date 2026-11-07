/** Algorithm/preview safety tests only. None are independent astronomical evidence. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateFullPanchang,calculateSolarEvents,calculateTithi,calculateKarana,calculateYoga,findTransitionInstant} from '../../src/engine/panchang';
import {resolveIanaTimezone,calculateJulianDayTT} from '../../src/engine/timezoneResolver';

test('analytical Panchang cannot certify itself and uses the requested epoch, not wall clock',()=>{
 const first=calculateFullPanchang(1989,11,23,4,30,0,22.57,88.36,5.5);
 const original=Date.now;
 try{Date.now=()=>0;assert.deepEqual(first,calculateFullPanchang(1989,11,23,4,30,0,22.57,88.36,5.5));}finally{Date.now=original;}
 assert.equal(first.calculationMode,'ANALYTICAL_APPROXIMATION');assert.equal(first.independentValidationStatus,'NOT_PERFORMED');assert.equal(first.timingGuidanceAuthorized,false);
 for(const transition of [first.nextTithiTransition,first.nextNakshatraTransition]){
  assert.ok(transition);assert.equal(transition.astronomicalAccuracySeconds,null);assert.ok(transition.bracketWidthSeconds<=transition.numericalToleranceSeconds);
  const jd=(Date.parse(transition.transitionInstantUTC)/86400000)+2440587.5;assert.ok(Math.abs(jd-transition.transitionJulianDayUT)<2e-8);assert.match(transition.transitionInstantUTC,/^1989-/);
 }
});

test('half-open Tithi and all fixed/movable Karana boundaries',()=>{
 for(let n=0;n<30;n++){const a=n*12;assert.equal(calculateTithi(a,0).index,n);assert.equal(calculateTithi(a+1e-7,0).index,n);assert.equal(calculateTithi(a-1e-7,0).index,(n+29)%30);}
 for(let n=0;n<60;n++){const a=n*6;assert.equal(calculateKarana(a,0).index,n);assert.equal(calculateKarana(a+1e-7,0).index,n);assert.equal(calculateKarana(a-1e-7,0).index,(n+59)%60);}
 assert.equal(calculateKarana(0,0).name,'Kintughna');assert.equal(calculateKarana(342,0).name,'Shakuni');assert.equal(calculateKarana(348,0).name,'Chatushpada');assert.equal(calculateKarana(354,0).name,'Naga');
 assert.throws(()=>calculateTithi(NaN,0));assert.throws(()=>calculateKarana(Infinity,0));assert.throws(()=>calculateYoga(0,NaN));
});

test('preview solar times carry UTC dates and both polar events are unavailable',()=>{
 const east=calculateSolarEvents(2026,6,21,0,179.9,12);assert.match(east.sunriseUTC,/^2026-06-20T/);assert.ok(Number.isFinite(Date.parse(east.sunriseUTC)));assert.equal(east.independentValidationStatus,'NOT_PERFORMED');
 for(const month of [6,12]){const polar=calculateSolarEvents(2026,month,21,89,0,0);assert.ok(polar.isPolarDay||polar.isPolarNight);assert.match(polar.sunriseUTC,/^POLAR_/);assert.match(polar.sunsetUTC,/^POLAR_/);}
 for(let day=1;day<=28;day++){const solar=calculateSolarEvents(2026,2,day,22.57,88.36,5.5);assert.doesNotMatch(solar.sunriseLocal,/:60$/);assert.doesNotMatch(solar.sunsetLocal,/:60$/);}
 assert.throws(()=>calculateSolarEvents(2026,2,30,0,0,0));assert.throws(()=>calculateSolarEvents(2026,1,1,91,0,0));assert.throws(()=>calculateSolarEvents(2026,1,1,0,0,NaN));
});

test('transition solver unwraps true crossings and fails rather than inventing missing roots',()=>{
 const start=2451545,angle=(jd:number)=>((359+(jd-start)*48)%360+360)%360;
 const root=findTransitionInstant(start,0,angle,2,1e-7);assert.equal(root.converged,true);assert.ok(Math.abs((root.transitionJD-start)*86400-1800)<0.02);assert.ok(root.bracketWidthDays<=1e-7);
 assert.throws(()=>findTransitionInstant(start,0,jd=>179+(jd-start)*2,12),/No transition/);
 assert.throws(()=>findTransitionInstant(start,90,()=>0,1),/No transition/);
 assert.throws(()=>findTransitionInstant(start,90,()=>NaN,1),/invalid value/);
 assert.throws(()=>findTransitionInstant(start,90,()=>0,0));assert.throws(()=>findTransitionInstant(start,90,()=>0,1,0));
});

test('civil resolution does not invent Delta-T, TT or UT1 from UTC',()=>{
 const plain=resolveIanaTimezone('2000-01-01','12:00:00','UTC');assert.equal(plain.julianDayUTC,2451545);assert.equal(plain.julianDayUT1,null);assert.equal(plain.julianDayTT,null);assert.equal(plain.deltaTSeconds,null);assert.equal(plain.timescaleStatus,'UTC_ONLY');
 const ut1Only=resolveIanaTimezone('2000-01-01','12:00:00','UTC',undefined,undefined,0.1);assert.equal(ut1Only.timescaleStatus,'CALLER_SUPPLIED_UT1');assert.equal(ut1Only.julianDayTT,null);
 const epoch=resolveIanaTimezone('2000-01-01','11:58:55','UTC',undefined,63.8285,0.3555);
 assert.equal(epoch.timescaleStatus,'CALLER_SUPPLIED_UT1_DELTA_T');assert.equal(epoch.independentValidationStatus,'NOT_PERFORMED');assert.ok(epoch.julianDayTT!>epoch.julianDayUTC);
 assert.throws(()=>resolveIanaTimezone('2000-01-01','12:00','UTC',NaN));assert.throws(()=>resolveIanaTimezone('2000-01-01','12:00','UTC',undefined,NaN));assert.throws(()=>calculateJulianDayTT(2451545,Infinity));
 const early=resolveIanaTimezone('0024-01-01','12:00','UTC');assert.match(early.isoUtc,/^0024-/);
});

test('divisional maps use the supplied longitude rather than rounded display degrees',async()=>{
 const {calculateFullChart,calculateD2Hora,calculateD9Navamsha,calculateD60Shashtyamsa}=await import('../../src/engine/astroMath');
 const seed=calculateFullChart('2000-01-01','12:00:00',0,0,'',0).planets[0];
 const at=(longitude:number)=>({...seed,name:'Synthetic',longitude,signIndex:Math.floor(longitude/30),degreeInSign:Number((longitude%30).toFixed(2))});
 assert.match(calculateD2Hora([at(14.9999)]).Synthetic,/Sun/);assert.match(calculateD2Hora([at(15)]).Synthetic,/Moon/);
 assert.equal(calculateD9Navamsha([at(3.3333)]).Synthetic.signIndex,0);assert.equal(calculateD9Navamsha([at(3.3334)]).Synthetic.signIndex,1);
 for(let n=1;n<60;n++){assert.equal(calculateD60Shashtyamsa([at(n*0.5-0.0001)])[0].partIndex,n-1);assert.equal(calculateD60Shashtyamsa([at(n*0.5)])[0].partIndex,n);assert.equal(calculateD60Shashtyamsa([at(n*0.5+0.0001)])[0].partIndex,n);}
 assert.throws(()=>calculateD9Navamsha([{...at(0),longitude:360,signIndex:11,degreeInSign:30}]),/boundary/);
});
