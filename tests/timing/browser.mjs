import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.CORE02_WEB_URL||'http://127.0.0.1:3101';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{for(const width of [375,1280])for(const scenario of ['unavailable','unknown','synthetic','invalid-response']){
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[],badURLs=[];let requests=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/2000-01-01|birth-date|22\.57|88\.36/.test(r.url()))badURLs.push(r.url());});
 if(['synthetic','invalid-response'].includes(scenario))await page.route('**/api/v1/timing/daily',async route=>{requests++;const req=route.request().postDataJSON();const b={schema_version:1,status:scenario==='synthetic'?'PROVISIONAL':'VERIFIED',code:'SYNTHETIC_ALGORITHM_ONLY',activity:req.activity,day:{date:req.target.date,timezone:req.target.timezone,start:'2026-03-08T05:00:00Z',end:'2026-03-09T04:00:00Z',elapsed_seconds:82800},windows:[{start:'2026-03-08T06:00:00Z',end:'2026-03-08T08:00:00Z',duration_seconds:7200,rank:1,rule_ids:['synthetic-rule'],explanations:['Synthetic boundary fixture <img src=x onerror=alert(1)>; not actual astrology.'],classification:'PROVISIONAL_TRADITIONAL_FAVORABLE'}],limitations:['Synthetic algorithm test only; no recommendation.'],provenance:{calculation_version:'timing-v1',rule_version:'timing-rules-v1',ephemeris_mode:'SYNTHETIC',requested_ephemeris_mode:req.ephemeris_mode,source:'BROWSER_SYNTHETIC_FIXTURE',calculated_at:'2026-01-01T00:00:00Z',accuracy_status:'SYNTHETIC_NOT_ACCURACY_EVIDENCE',release_authorized:false}};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});});
 await page.goto(base);await page.getByRole('button',{name:'Daily Timing',exact:true}).click();
 await page.getByLabel('Birth date',{exact:true}).fill('2000-01-01');
 if(scenario==='unknown')await page.getByLabel('Birth-time certainty',{exact:true}).selectOption('UNKNOWN');else await page.getByLabel('Birth local time',{exact:true}).fill('12:00:00');
 await page.getByLabel('Birth IANA timezone',{exact:true}).fill('Asia/Kolkata');await page.getByLabel('Birth latitude',{exact:true}).fill('22.57');await page.getByLabel('Birth longitude',{exact:true}).fill('88.36');
 await page.getByLabel('Activity date',{exact:true}).fill('2026-03-08');await page.getByLabel('Activity IANA timezone',{exact:true}).fill('America/New_York');await page.getByLabel('Activity latitude',{exact:true}).fill('40.71');await page.getByLabel('Activity longitude',{exact:true}).fill('-74');
 await page.getByLabel('Activity',{exact:true}).selectOption('finance');
 await page.getByRole('button',{name:'Check daily timing',exact:true}).focus();await page.keyboard.press('Enter');
 if(scenario==='synthetic'){await page.getByRole('status').filter({hasText:'Synthetic algorithm demonstration'}).waitFor();await page.getByRole('img',{name:/Local-day timeline, 23 elapsed hours/}).waitFor();assert.equal(await page.locator('section[aria-label="Daily timing results"] img').count(),0);assert.match(await page.locator('section[aria-label="Daily timing results"]').textContent(),/GMT-5.*GMT-4/);assert.equal(requests,1);}
 else if(scenario==='invalid-response'){await page.getByRole('alert').filter({hasText:'Timing is unavailable'}).waitFor();assert.equal(await page.getByRole('img',{name:/Local-day timeline/}).count(),0);}
 else if(scenario==='unknown')await page.getByRole('status').filter({hasText:'Insufficient evidence'}).waitFor();
 else await page.getByRole('status').filter({hasText:'Personal timing remains unavailable'}).waitFor();
 assert.deepEqual(errors,[]);assert.deepEqual(badURLs,[]);assert.deepEqual(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)})),{local:[],session:[]});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 // Editing inputs clears any prior result rather than reusing stale guidance.
 await page.getByLabel('Birth latitude',{exact:true}).fill('23');assert.equal(await page.getByRole('img',{name:/Local-day timeline/}).count(),0);
 console.log(`Daily timing ${width}px ${scenario}: passed; no accuracy or release claim.`);await page.close();
}}finally{await browser.close();}
