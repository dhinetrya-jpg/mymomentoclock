// Isolated UI fixtures. No payment provider or real authentication is contacted.
import {chromium} from 'playwright-core';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
const compiled=await build({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import{CustomerCheckout}from'./src/components/CustomerCheckout';createRoot(document.getElementById('root')).render(<CustomerCheckout/>);",resolveDir:process.cwd(),sourcefile:'pay03-ui-fixture.tsx',loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const policy={description:'Fixture-only product <script>not executable</script>',access_disclosure:'Fixture access duration only',tax_disclosure:'Fixture price policy only',refund_disclosure:'Fixture refund policy only',billing_model:'one_time'};
try{for(const width of [375,1280])for(const scenario of ['unauthenticated','verify','refunded','review','recovery','cancel-retry']){
 const page=await browser.newPage({viewport:{width,height:900}});const state={status:'PENDING',grant:false,creates:0};const errors=[];page.on('pageerror',e=>errors.push(e.message));const external=[];page.on('request',r=>{if(new URL(r.url()).origin!=='https://checkout.fixture')external.push(r.url());});await page.clock.install();
 await page.addInitScript(()=>{window.Razorpay=class{constructor(options){window.fixtureOptions=options;}on(name,callback){if(name==='payment.failed')window.fixtureFailure=callback;}open(){window.fixtureOpened=true;}close(){}};});
 await page.route('https://checkout.fixture/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname;let status=200,body;
  if(path==='/'){await route.fulfill({contentType:'text/html',body:'<div id="root"></div><script src="/fixture.js"></script>'});return;}
  if(path==='/fixture.js'){await route.fulfill({contentType:'application/javascript',body:compiled.outputFiles[0].text});return;}
  if(path==='/api/payment/catalog'){if(scenario==='unauthenticated'){status=401;body={error:'UNAUTHENTICATED'};}else body={products:[{id:'fixture-product',version:'v1',capability_id:'fixture-capability',amount_minor:12345,currency:'INR',commercial_policy:policy}]};}
  else if(path==='/api/payment/orders'&&req.method()==='POST'){state.creates++;if(scenario==='recovery'){status=409;body={error:'PAYMENT_CONFLICT'};}else body={order_id:'fixtureorder',product_id:'fixture-product',product_version:'v1',status:'PENDING',amount_minor:12345,currency:'INR',commercial_policy:policy,checkout:{mode:'sandbox',key_id:'rzp_test_fixture',provider_order_id:'order_fixture'}};}
  else if(path==='/api/payment/orders/fixtureorder')body={order_id:'fixtureorder',status:state.status};
  else if(path==='/api/payment/entitlements')body={entitlements:state.grant?[{source_order:'fixtureorder',capability_id:'fixture-capability'}]:[]};
  else {status=404;body={error:'NOT_FOUND'};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('https://checkout.fixture/');
 if(scenario==='unauthenticated'){await page.getByRole('status').filter({hasText:'Sign in'}).waitFor();assert.equal(await page.getByRole('button').count(),0);}
 else{
  await page.getByRole('button',{name:'Continue secure checkout'}).click();
  if(scenario==='recovery'){await page.getByRole('status').filter({hasText:'existing order needs recovery'}).waitFor();assert.equal(await page.evaluate(()=>Boolean(window.fixtureOpened)),false);}
  else{
   await page.waitForFunction(()=>window.fixtureOpened===true);
   if(scenario==='cancel-retry'){await page.evaluate(()=>window.fixtureOptions.modal.ondismiss());await page.getByRole('status').filter({hasText:'cancelled'}).waitFor();await page.getByRole('button',{name:'Continue secure checkout'}).click();await page.evaluate(()=>window.fixtureFailure());await page.getByRole('status').filter({hasText:'declined'}).waitFor();assert.equal(state.creates,1);}
   else{
    if(scenario==='refunded')state.status='REFUNDED';if(scenario==='review')state.status='PAYMENT_REVIEW';if(scenario==='verify')state.status='COMPLETED';
    await page.evaluate(()=>window.fixtureOptions.handler());
    if(scenario==='refunded')await page.getByRole('status').filter({hasText:'revoked'}).waitFor();else if(scenario==='review')await page.getByRole('status').filter({hasText:'under review'}).waitFor();else{
     await page.waitForResponse(r=>r.url().endsWith('/api/payment/entitlements'));assert.doesNotMatch(await page.getByRole('status').textContent(),/confirmed payment/);state.grant=true;await page.clock.fastForward(5001);await page.getByRole('status').filter({hasText:'server confirmed payment'}).waitFor();
    }
   }
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(await page.locator('script').count(),1);assert.equal(await page.locator('img').count(),0);assert.deepEqual(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)})),{local:[],session:[]});console.log(`commercial UI ${width}px ${scenario}: passed (local fixture only)`);await page.close();
}}finally{await browser.close();}
