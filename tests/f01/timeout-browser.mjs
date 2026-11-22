/** Synthetic browser regression for UX-FAIL-01. Only the component's12s deadline is accelerated. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.F01_WEB_URL||process.env.A11Y_WEB_URL||process.env.A11Y_BASE_URL||'http://127.0.0.1:3101';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const deadlineMs=750;
const syntheticResult=(sampleCount=2)=>({schema_version:1,status:'COMPUTED_UNVERIFIED',contract_version:'f01-sensitivity-v1',start_utc:'2000-01-01T03:00:00Z',end_utc:'2000-01-01T04:00:00Z',sample_count:sampleCount,factors:[{name:'sun.rashi',classification:'OBSERVED_VARIABLE',observed_values:['0','1'],note:'Synthetic UI fixture only; not astronomical verification.'}],transition_brackets:[],limitations:['Synthetic UI fixture only. No actual birth time, stability or prediction is established.'],customer_timing_authorized:false,btr_status:'UNAVAILABLE_UNVALIDATED_DASHA_METHOD',house_system:'SWISS_S_SIDEREAL_LAHIRI'});
const fulfill=(route,count)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(syntheticResult(count))});
async function open(page){await page.goto(base);await page.getByRole('button',{name:'Birth Time Explorer',exact:true}).click();await page.getByRole('heading',{name:'Birth-Time Uncertainty Explorer',exact:true}).waitFor();}
async function fill(page){await page.getByLabel('Birth date',{exact:true}).fill('2000-01-01');await page.getByLabel('Recorded local time',{exact:true}).fill('09:00');await page.getByLabel('Historical IANA timezone',{exact:true}).fill('Asia/Kolkata');await page.getByLabel('Birthplace latitude',{exact:true}).fill('28.6');await page.getByLabel('Birthplace longitude',{exact:true}).fill('77.2');}
async function pendingButton(page){const button=page.getByRole('button',{name:'Inspecting possible charts…',exact:true});await button.waitFor();assert.equal(await button.isDisabled(),true);}
async function privacy(page,requests,badURLs){
 const metadata=await page.evaluate(()=>window.__f01FetchMetadata);assert.equal(metadata.length,requests.length);
 assert.deepEqual(badURLs,[]);for(const [i,request] of requests.entries()){assert.equal(request.method,'POST');assert.equal(new URL(request.url).search,'');assert.equal(request.body.schema_version,1);assert.equal(request.body.certainty,'APPROXIMATE');assert.equal(metadata[i].cache,'no-store');}
 const storage=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));assert.doesNotMatch(JSON.stringify(storage),/2000-01-01|Asia\/Kolkata|28\.6|77\.2/);
 assert.doesNotMatch(page.url(),/2000-01-01|Asia|28\.6|77\.2/);
}
try{for(const width of [375,1280])for(const scenario of ['active-timeout-and-retry','unmount-is-silent','supersession-is-silent']){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
 await context.addInitScript(({deadlineMs})=>{
  const original=window.setTimeout.bind(window);window.__f01DeadlineCount=0;
  window.setTimeout=(callback,delay,...args)=>{if(delay===12000){window.__f01DeadlineCount++;return original(callback,deadlineMs,...args);}return original(callback,delay,...args);};
  const originalFetch=window.fetch.bind(window);window.__f01FetchMetadata=[];
  window.fetch=(input,init)=>{if(String(input).endsWith('/api/v1/f01/explore'))window.__f01FetchMetadata.push({cache:init?.cache,method:init?.method});return originalFetch(input,init);};
 },{deadlineMs});
 const page=await context.newPage();const errors=[],badURLs=[],requests=[],held=[],arrivalWaiters=[];
 const waitForRequests=count=>requests.length>=count?Promise.resolve():new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Expected F01 request did not start.')),3000);arrivalWaiters.push({count,resolve:()=>{clearTimeout(timer);resolve();}});});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/2000-01-01|Asia%2FKolkata|28\.6|77\.2/.test(r.url()))badURLs.push(r.url());});
 await page.route('**/api/v1/f01/explore',async route=>{
  const r=route.request();requests.push({method:r.method(),url:r.url(),body:r.postDataJSON()});
  if(scenario==='active-timeout-and-retry'&&(requests.length===1||requests.length===3)){await fulfill(route,requests.length===1?2:3);return;}
  held.push(route);for(const waiter of arrivalWaiters){if(requests.length>=waiter.count)waiter.resolve();}
 });
 await open(page);await fill(page);
 if(scenario==='active-timeout-and-retry'){
  await page.getByRole('button',{name:'Explore birth-time possibilities',exact:true}).click();await page.getByRole('heading',{name:'Rashi and Bhava Chalit comparison',exact:true}).waitFor();
  await page.getByRole('button',{name:'Explore birth-time possibilities',exact:true}).click();await pendingButton(page);
  assert.equal(await page.getByRole('heading',{name:'Rashi and Bhava Chalit comparison',exact:true}).count(),0);
  const alert=page.getByRole('alert').filter({hasText:'The calculation took too long.'});await alert.waitFor();assert.match(await alert.textContent(),/Please try again when you are ready/);assert.doesNotMatch(await alert.textContent(),/AbortError|signal|F01_|timeout|stack/i);
  const retry=page.getByRole('button',{name:'Explore birth-time possibilities',exact:true});assert.equal(await retry.isDisabled(),false);assert.equal(await page.getByRole('heading',{name:'Rashi and Bhava Chalit comparison',exact:true}).count(),0);
  await page.waitForTimeout(250);assert.equal(requests.length,2,'No automatic retry may resubmit birth details.');
  await retry.click();await page.getByRole('status').filter({hasText:'Sampled 3 birth instants'}).waitFor();assert.equal(await page.getByRole('alert').count(),0);assert.equal(requests.length,3);
 }else if(scenario==='unmount-is-silent'){
  await page.getByRole('button',{name:'Explore birth-time possibilities',exact:true}).click();await pendingButton(page);
  await page.getByRole('button',{name:'Daily Timing',exact:true}).click();await page.waitForTimeout(deadlineMs+150);
  for(const route of held.splice(0))await fulfill(route,99).catch(()=>{});
  await page.getByRole('button',{name:'Birth Time Explorer',exact:true}).click();await page.getByRole('heading',{name:'Birth-Time Uncertainty Explorer',exact:true}).waitFor();
  assert.equal(await page.getByRole('alert').count(),0);assert.equal(await page.getByRole('heading',{name:'Rashi and Bhava Chalit comparison',exact:true}).count(),0);assert.equal(await page.getByLabel('Birth date',{exact:true}).inputValue(),'');assert.equal(requests.length,1);assert.equal(await page.getByRole('button',{name:'Explore birth-time possibilities',exact:true}).isDisabled(),false);
 }else{
  await page.getByRole('button',{name:'Explore birth-time possibilities',exact:true}).click();await pendingButton(page);
  // A test-only second submit exercises a request race while the real UI disables repeat clicks.
  await page.locator('form').filter({has:page.getByLabel('Birth date',{exact:true})}).evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await waitForRequests(2);await pendingButton(page);assert.equal(await page.getByRole('alert').count(),0);
  await fulfill(held[1],22);await page.getByRole('status').filter({hasText:'Sampled 22 birth instants'}).waitFor();
  await held[0].fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'STALE_SYNTHETIC_RESPONSE'})}).catch(()=>{});held.length=0;
  await page.waitForTimeout(deadlineMs+150);assert.equal(await page.getByRole('alert').count(),0);await page.getByRole('status').filter({hasText:'Sampled 22 birth instants'}).waitFor();assert.equal(requests.length,2);assert.equal(await page.getByRole('button',{name:'Explore birth-time possibilities',exact:true}).isDisabled(),false);
 }
 assert.ok(await page.evaluate(()=>window.__f01DeadlineCount)>0);assert.deepEqual(errors,[]);await privacy(page,requests,badURLs);
 for(const route of held)await route.abort().catch(()=>{});
 console.log(`F01 ${width}px ${scenario}: passed; only12s deadline accelerated, synthetic POST data, no automatic retry or release claim.`);await context.close();
}}finally{await browser.close();}
