import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.CORE02_WEB_URL||'http://127.0.0.1:3101';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 for (const width of [375,1280]) {
  const page = await browser.newPage({viewport:{width,height:900}});
  try {
   const requests=[];
   page.on('request',request=>{
    if(new URL(request.url()).pathname.startsWith('/api/')) requests.push(request);
   });
   await page.goto(base);
   await page.getByRole('heading',{name:'Daily timing by location'}).waitFor();
   assert.deepEqual(await page.locator('main input, main select').evaluateAll(fields=>fields.map(field=>field.name)),['city-search','city','date','activity']);
   assert.equal(await page.getByRole('button',{name:'Edit Birth Details'}).count(),0);
   const search=page.getByRole('searchbox',{name:'Search supported cities'});
   await search.fill('unlisted place');
   await page.getByRole('status').filter({hasText:'No supported cities match'}).waitFor();
   assert.equal(await page.getByLabel('City',{exact:true}).locator('option').count(),1);
   await search.fill(' NEW yo ');
   assert.deepEqual(await page.getByLabel('City',{exact:true}).locator('option').allTextContents(),['Choose a city','New York']);
   await page.getByLabel('City',{exact:true}).selectOption('New York');
   await page.getByText('Time zone: America/New_York',{exact:true}).waitFor();
   await search.fill('London');
   assert.equal(await page.getByLabel('City',{exact:true}).inputValue(),'');
   await search.fill('New York');
   await page.getByLabel('City',{exact:true}).selectOption('New York');
   await page.getByLabel('Local date',{exact:true}).fill('2026-11-01');
   await page.getByText('Browse dates in 2026',{exact:true}).click();
   const nextWeek=page.getByRole('button',{name:'Next week',exact:true});
   await nextWeek.click();
   await page.getByRole('button',{name:'2026-11-02',exact:true}).waitFor();
   assert.equal(await page.getByLabel('Local date',{exact:true}).inputValue(),'2026-11-01');
   await page.getByRole('button',{name:'Previous week',exact:true}).click();
   await page.getByRole('button',{name:'2026-10-26',exact:true}).waitFor();
   await page.getByLabel('Local date',{exact:true}).fill('2026-01-01');
   assert.equal(await page.getByRole('button',{name:'Previous week',exact:true}).isDisabled(),true);
   await nextWeek.click();
   await page.getByRole('button',{name:'2026-01-05',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'2026-01-11',exact:true}).count(),1);
   await page.getByLabel('Local date',{exact:true}).fill('2026-11-01');
   await page.getByRole('button',{name:'Year',exact:true}).click();
   await page.getByRole('button',{name:'February',exact:true}).click();
   assert.equal(await page.getByRole('list',{name:'Dates',exact:true}).getByRole('button').count(),28);
   await page.waitForFunction(()=>document.activeElement?.textContent==='2026-02-01');
   await page.getByRole('button',{name:'2026-02-28',exact:true}).click();
   assert.equal(await page.getByLabel('Local date',{exact:true}).inputValue(),'2026-02-28');
   await page.getByRole('button',{name:'Next month',exact:true}).click();
   await page.getByRole('button',{name:'2026-03-01',exact:true}).waitFor();
   await page.getByRole('button',{name:'Previous month',exact:true}).click();
   await page.getByRole('button',{name:'2026-02-01',exact:true}).waitFor();
   await page.getByLabel('Local date',{exact:true}).fill('2026-12-31');
   assert.equal(await page.getByRole('button',{name:'Next month',exact:true}).isDisabled(),true);
   assert.equal(requests.length,0);
   await page.getByLabel('Local date',{exact:true}).fill('2026-11-01');
   await page.getByLabel('Activity',{exact:true}).selectOption('property_sale');
   async function check(name) {
    const [response]=await Promise.all([
     page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/timing/location-only'),
     page.getByRole('button',{name,exact:true}).click(),
    ]);
    assert.equal(response.status(),503);
    const status=page.getByRole('status').filter({hasText:'Timing is unavailable for this selection.'});
    await status.waitFor();
    return {body:await response.json(),view:await status.innerText()};
   }
   const direct=await check('Check availability');
   await page.getByRole('button',{name:'Choose another date',exact:true}).press('Enter');
   assert.equal(await page.getByLabel('Local date',{exact:true}).evaluate(el=>el===document.activeElement),true);
   assert.equal(await page.getByText('Timing is unavailable for this selection.',{exact:false}).count(),0);
   assert.equal(requests.length,1);
   await page.getByRole('button',{name:'Guided chat',exact:true}).click();
   assert.equal(await page.getByLabel('City',{exact:true}).isVisible(),false);
   const intent=page.getByLabel('Describe the activity (optional)',{exact:true});
   const focused=id=>page.waitForFunction(id=>document.activeElement?.id===id,id);
   await focused('location-timing-intent');
   await intent.fill('buy a house or sell my house');
   await page.getByText('Choose one activity from the list below.').waitFor();
   await page.getByRole('button',{name:'Next',exact:true}).click();
   assert.equal(await page.getByLabel('City',{exact:true}).isVisible(),false);
   await intent.fill('Sell my house.');
   await page.getByRole('button',{name:'Use Property sale',exact:true}).click();
   assert.equal(await page.getByLabel('Activity',{exact:true}).inputValue(),'property_sale');
   const next=page.getByRole('button',{name:'Next',exact:true});
   const back=page.getByRole('button',{name:'Back',exact:true});
   await next.press('Enter');
   await focused('location-timing-search');
   await page.keyboard.press('Tab');
   await focused('location-timing-city');
   await next.press('Enter');
   await focused('location-timing-date');
   await back.press('Enter');
   await focused('location-timing-search');
   await back.press('Enter');
   await focused('location-timing-intent');
   await next.press('Enter');
   await next.press('Enter');
   await focused('location-timing-date');
   assert.deepEqual(await check('Send selections'),direct);
   await page.getByRole('button',{name:'Direct form',exact:true}).click();
   await search.fill('London');
   await page.getByRole('button',{name:'Guided chat',exact:true}).click();
   await intent.fill('Sell my house in New York on 2026-11-01.');
   await page.getByText('Property sale · New York · 2026-11-01',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Review suggested details',exact:true}).click();
   await focused('location-timing-search');
   assert.equal(await search.inputValue(),'');
   assert.equal(await page.getByLabel('City',{exact:true}).inputValue(),'New York');
   assert.equal(await page.getByLabel('Local date',{exact:true}).inputValue(),'2026-11-01');
   assert.equal(requests.length,2);
   assert.deepEqual(await check('Send selections'),direct);
   for (const [phrase, missing] of [
    ['Sell my house in New York.', 'date'],
    ['Sell my house on 2026-11-01.', 'city'],
   ]) {
    await page.getByRole('button',{name:'Guided chat',exact:true}).click();
    await intent.fill(phrase);
    await page.getByRole('button',{name:'Review suggested details',exact:true}).click();
    await focused(missing==='date'?'location-timing-date':'location-timing-search');
    const before=requests.length;
    await page.getByRole('button',{name:'Send selections',exact:true}).click();
    assert.equal(requests.length,before);
    if (missing==='date') {
     assert.equal(await page.getByLabel('Local date',{exact:true}).inputValue(),'');
     await page.getByLabel('Local date',{exact:true}).fill('2026-11-01');
    } else {
     assert.equal(await page.getByLabel('City',{exact:true}).inputValue(),'');
     await page.getByLabel('City',{exact:true}).selectOption('New York');
    }
    assert.deepEqual(await check('Send selections'),direct);
   }
   await page.getByRole('button',{name:'Choose another date',exact:true}).press('Enter');
   assert.equal(await page.getByLabel('Local date',{exact:true}).evaluate(el=>el===document.activeElement),true);
   assert.equal(requests.length,5);
   const payload={schema_version:1,city:'New York',date:'2026-11-01',activity:'property_sale'};
   assert.deepEqual(requests.map(request=>request.postDataJSON()),[payload,payload,payload,payload,payload]);
   assert.ok(requests.every(request=>request.method()==='POST' && !new URL(request.url()).search));
   assert.deepEqual(await page.evaluate(()=>[localStorage.length,sessionStorage.length]),[0,0]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   console.log(`Location-only timing ${width}px: no birth fields, shared direct/guided result, empty unavailable windows and no storage passed.`);
  } finally {
   await page.close();
  }
 }
 for(const width of [375,1280])for(const scenario of ['unavailable','unknown','approximate','synthetic','invalid-response']){
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[],badURLs=[];let requests=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/2000-01-01|birth-date|22\.57|88\.36/.test(r.url()))badURLs.push(r.url());});
 if(['synthetic','invalid-response'].includes(scenario))await page.route('**/api/v1/timing/daily',async route=>{requests++;const req=route.request().postDataJSON();const b={schema_version:1,status:scenario==='synthetic'?'PROVISIONAL':'VERIFIED',code:'SYNTHETIC_ALGORITHM_ONLY',activity:req.activity,day:{date:req.target.date,timezone:req.target.timezone,start:'2026-03-08T05:00:00Z',end:'2026-03-09T04:00:00Z',elapsed_seconds:82800},windows:[{start:'2026-03-08T06:00:00Z',end:'2026-03-08T08:00:00Z',duration_seconds:7200,rank:1,rule_ids:['synthetic-rule'],explanations:['Synthetic boundary fixture <img src=x onerror=alert(1)>; not actual astrology.'],classification:'PROVISIONAL_TRADITIONAL_FAVORABLE'}],limitations:['Synthetic algorithm test only; no recommendation.'],provenance:{calculation_version:'timing-v1',rule_version:'timing-rules-v1',ephemeris_mode:'SYNTHETIC',requested_ephemeris_mode:req.ephemeris_mode,source:'BROWSER_SYNTHETIC_FIXTURE',calculated_at:'2026-01-01T00:00:00Z',accuracy_status:'SYNTHETIC_NOT_ACCURACY_EVIDENCE',release_authorized:false}};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});});
 await page.goto(base);await page.getByRole('button',{name:'Daily Timing',exact:true}).click();await page.getByRole('button',{name:'Use personal timing',exact:true}).click();
 await page.getByLabel('Birth date',{exact:true}).fill('2000-01-01');
 const certainty=page.getByLabel('Birth-time certainty',{exact:true});
 if(scenario==='unknown'){
  await certainty.selectOption('UNKNOWN');
  await page.getByText('Leave the birth time unknown',{exact:false}).waitFor();
  assert.equal(await page.getByLabel('Birth local time',{exact:true}).count(),0);
 }else{
  if(scenario==='approximate'){
   await certainty.selectOption('APPROXIMATE');
   await page.getByText('Enter your best estimate',{exact:false}).waitFor();
   const uncertainty=page.getByLabel('Uncertainty (± minutes)',{exact:true});
   assert.equal(await uncertainty.inputValue(),'');
   await uncertainty.fill('45');
  }
  await page.getByLabel('Birth local time',{exact:true}).fill('12:00:00');
 }
 await page.getByLabel('Birth IANA timezone',{exact:true}).fill('Asia/Kolkata');await page.getByLabel('Birth latitude',{exact:true}).fill('22.57');await page.getByLabel('Birth longitude',{exact:true}).fill('88.36');
 await page.getByLabel('Activity date',{exact:true}).fill('2026-03-08');await page.getByLabel('Activity IANA timezone',{exact:true}).fill('America/New_York');await page.getByLabel('Activity latitude',{exact:true}).fill('40.71');await page.getByLabel('Activity longitude',{exact:true}).fill('-74');
 await page.getByLabel('Activity',{exact:true}).selectOption('finance');
 const dailyRequest=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/v1/timing/daily');
 await page.getByRole('button',{name:'Check daily timing',exact:true}).focus();await page.keyboard.press('Enter');
 const {birth}= (await dailyRequest).postDataJSON();
 if(scenario==='unknown')assert.deepEqual(birth,{date:'2000-01-01',certainty:'UNKNOWN',timezone:'Asia/Kolkata',latitude:22.57,longitude:88.36});
 if(scenario==='approximate')assert.deepEqual(birth,{date:'2000-01-01',certainty:'APPROXIMATE',timezone:'Asia/Kolkata',latitude:22.57,longitude:88.36,time:'12:00:00',uncertainty_minutes:45});
 if(scenario==='synthetic'){await page.getByRole('status').filter({hasText:'Synthetic algorithm demonstration'}).waitFor();await page.getByRole('img',{name:/Local-day timeline, 23 elapsed hours/}).waitFor();assert.equal(await page.locator('section[aria-label="Daily timing results"] img').count(),0);assert.match(await page.locator('section[aria-label="Daily timing results"]').textContent(),/GMT-5.*GMT-4/);assert.equal(requests,1);}
 else if(scenario==='invalid-response'){await page.getByRole('alert').filter({hasText:'Timing is unavailable'}).waitFor();assert.equal(await page.getByRole('img',{name:/Local-day timeline/}).count(),0);}
 else if(['unknown','approximate'].includes(scenario))await page.getByRole('status').filter({hasText:'Insufficient evidence'}).waitFor();
 else await page.getByRole('status').filter({hasText:'Personal timing remains unavailable'}).waitFor();
 assert.deepEqual(errors,[]);assert.deepEqual(badURLs,[]);assert.deepEqual(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)})),{local:[],session:[]});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 // Editing inputs clears any prior result rather than reusing stale guidance.
 await page.getByLabel('Birth latitude',{exact:true}).fill('23');assert.equal(await page.getByRole('img',{name:/Local-day timeline/}).count(),0);
 console.log(`Daily timing ${width}px ${scenario}: passed; no accuracy or release claim.`);await page.close();
}}finally{await browser.close();}
