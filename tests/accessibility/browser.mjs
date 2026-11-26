import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const base=process.env.A11Y_WEB_URL||'http://127.0.0.1:3101';
const result=await build({stdin:{contents:`
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BtrModal} from './src/components/BtrModal';
import {CheckoutModal} from './src/components/CheckoutModal';
import {ConflictResolverModal} from './src/components/ConflictResolverModal';
function Harness(){
 const [open,setOpen]=useState({btr:false,checkout:false,conflict:false});
 useEffect(()=>{window.modalTest={open:(name)=>setOpen(value=>({...value,[name]:true})),close:(name)=>setOpen(value=>({...value,[name]:false}))};return()=>{delete window.modalTest;};},[]);
 return <><main id="background-root" aria-hidden="false"><button id="open-btr" onClick={()=>setOpen(value=>({...value,btr:true}))}>Open BTR</button><button id="open-checkout" onClick={()=>setOpen(value=>({...value,checkout:true}))}>Open checkout</button><button id="open-conflict" onClick={()=>setOpen(value=>({...value,conflict:true}))}>Open conflict</button><button id="background-action">Background action</button></main><div id="preexisting-inert" inert={true} aria-hidden="false">Previously inert content</div><div id="preexisting-hidden" aria-hidden="true">Previously hidden content</div><BtrModal isOpen={open.btr} onClose={()=>setOpen(value=>({...value,btr:false}))} chart={{inputProfile:{birthTime:'00:00:00'}} as any} onApplyRectifiedChart={()=>{throw Error('Unavailable BTR must not apply a chart');}}/><CheckoutModal isOpen={open.checkout} onClose={()=>setOpen(value=>({...value,checkout:false}))}/><ConflictResolverModal isOpen={open.conflict} onClose={()=>setOpen(value=>({...value,conflict:false}))} resolution={{mathematicalContext:'Synthetic status-only test context.'} as any}/></>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Harness/></React.StrictMode>);
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"development"'},logLevel:'silent'});
const script=result.outputFiles[0].text;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const focused=async(page,selector)=>page.waitForFunction(value=>document.activeElement===document.querySelector(value),selector);
const inDialog=async page=>assert.equal(await page.evaluate(()=>Boolean(document.activeElement?.closest('[role="dialog"][aria-modal="true"]'))),true);
async function fixture(page){
 await page.route('https://modal.fixture/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/bundle.js')return route.fulfill({contentType:'application/javascript',body:script});
  if(path==='/api/capabilities')return route.fulfill({contentType:'application/json',body:'{"payments":"UNAVAILABLE"}'});
  if(path!=='/')throw Error('Unexpected fixture request: '+path);
  return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>button{margin:4px;padding:8px}.fixed{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0008}[role=dialog]{background:white;color:black;max-height:80vh;overflow:auto;padding:16px;max-width:80vw}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'});
 });
 await page.goto('https://modal.fixture/');await page.getByRole('button',{name:'Open BTR',exact:true}).waitFor();
}
async function restored(page){
 assert.deepEqual(await page.evaluate(()=>({backgroundInert:document.querySelector('#background-root').getAttribute('inert'),backgroundAria:document.querySelector('#background-root').getAttribute('aria-hidden'),originalInert:document.querySelector('#preexisting-inert').hasAttribute('inert'),originalInertAria:document.querySelector('#preexisting-inert').getAttribute('aria-hidden'),originalHidden:document.querySelector('#preexisting-hidden').getAttribute('aria-hidden')})),{backgroundInert:null,backgroundAria:'false',originalInert:true,originalInertAria:'false',originalHidden:'true'});
}
try{
 for(const width of [320,375,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);
  for(const [name,label,first,last] of [['btr','Birth time rectification','Close birth time dialog','Return to chart'],['checkout','Checkout','Close checkout','Return to the app'],['conflict','Conflict calculation status','Close','Close']]){
   await page.locator('#open-'+name).click();const dialog=page.getByRole('dialog',{name:label,exact:true});await dialog.waitFor();
   await focused(page,`[role=dialog] button${name==='conflict'?'':':first-of-type'}`);
   assert.equal(await dialog.getByRole('button',{name:first,exact:true}).evaluate(el=>el===document.activeElement),true);
   assert.equal(await page.locator('#background-root').evaluate(el=>el.inert),true);
   assert.equal(await page.locator('#background-root').getAttribute('aria-hidden'),'true');
   // Attempted background focus is suppressed, not just cycled when Tab reaches an edge.
   await page.locator('#background-action').evaluate(el=>el.focus());await inDialog(page);
   await dialog.getByRole('button',{name:first,exact:true}).focus();await page.keyboard.press('Shift+Tab');assert.equal(await dialog.getByRole('button',{name:last,exact:true}).evaluate(el=>el===document.activeElement),true);
   await page.keyboard.press('Tab');assert.equal(await dialog.getByRole('button',{name:first,exact:true}).evaluate(el=>el===document.activeElement),true);
   // Focusables are recomputed when a control is added/disabled while the modal is open.
   await dialog.evaluate(el=>{const button=document.createElement('button');button.id='dynamic-modal-control';button.textContent='Dynamic control';el.appendChild(button);button.focus();});
   await focused(page,'#dynamic-modal-control');await page.keyboard.press('Tab');assert.equal(await dialog.getByRole('button',{name:first,exact:true}).evaluate(el=>el===document.activeElement),true);
   await dialog.locator('#dynamic-modal-control').evaluate(el=>{el.focus();el.disabled=true;});await page.waitForFunction(()=>document.activeElement?.id!=='dynamic-modal-control');await inDialog(page);
   if(name==='btr')assert.match(await dialog.textContent(),/unavailable.*Dasha/);
   if(name==='checkout')assert.match(await dialog.textContent(),/Payments unavailable/);
   if(name==='conflict')assert.match(await dialog.textContent(),/No score or graph verification/);
   await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});await focused(page,'#open-'+name);await restored(page);
   // Reopening under StrictMode must not retain a stale trap or stale background state.
   await page.locator('#open-'+name).click();await dialog.getByRole('button',{name:first,exact:true}).click();await dialog.waitFor({state:'detached'});await focused(page,'#open-'+name);await restored(page);
   console.log(`Modal keyboard ${width}px ${name}: initial focus, live Tab/ShiftTab trap, Escape, restore and preserved refusal passed.`);
  }
  await page.locator('#open-checkout').click();const checkout=page.getByRole('dialog',{name:'Checkout',exact:true,includeHidden:true});
  await checkout.evaluate(el=>{const b=document.createElement('button');b.id='nested-modal-opener';b.textContent='Open nested BTR';b.onclick=()=>window.modalTest.open('btr');el.appendChild(b);});
  await page.locator('#nested-modal-opener').click();await page.getByRole('dialog',{name:'Birth time rectification',exact:true}).waitFor();assert.equal(await checkout.getAttribute('aria-modal'),'false');assert.equal(await checkout.evaluate(el=>Boolean(el.closest('[inert]'))),true);
  await page.keyboard.press('Escape');await focused(page,'#nested-modal-opener');assert.equal(await checkout.getAttribute('aria-modal'),'true');await page.keyboard.press('Escape');await focused(page,'#open-checkout');await restored(page);
  // Hosted checkout creates an external iframe/overlay; the parent must yield rather than closing behind it.
  await page.locator('#open-checkout').click();await checkout.waitFor();
  await page.evaluate(()=>{const root=document.createElement('div');root.className='razorpay-container';root.style.cssText='position:fixed;inset:0;background:white;z-index:99999';const b=document.createElement('button');b.id='hosted-fixture-close';b.textContent='Hosted fixture close';root.appendChild(b);document.body.appendChild(root);b.focus();});
  await page.waitForFunction(()=>!document.querySelector('.razorpay-container').inert);await page.keyboard.press('Escape');assert.equal(await checkout.count(),1);await focused(page,'#hosted-fixture-close');
  await page.evaluate(()=>document.querySelector('.razorpay-container').remove());await page.waitForFunction(()=>Boolean(document.activeElement?.closest('[aria-label="Checkout"]')));await page.keyboard.press('Escape');await focused(page,'#open-checkout');await restored(page);
  // If an invoker is removed, close still lands on a connected, usable page control.
  await page.locator('#open-conflict').click();await page.locator('#open-conflict').evaluate(el=>el.remove());await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement instanceof HTMLElement&&document.activeElement.isConnected&&!document.activeElement.closest('[inert],[role="dialog"]'));
  assert.deepEqual(errors,[]);console.log(`Modal stack ${width}px: nested dialog, hosted-widget handoff and removed invoker passed.`);await page.close();
 }
 // Actual app: keyboard skip link, associated/operable labels, no invented UNKNOWN chart, and bounded reflow.
 // Root font-size stress is explicit; it is not claimed to reproduce every browser/device zoom setting.
 for(const width of [320,375,1280])for(const textScale of [100,200]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.getByRole('heading',{name:'Daily timing by location',exact:true}).waitFor();
  const skip=page.getByRole('link',{name:'Skip to main content',exact:true});await page.keyboard.press('Tab');assert.equal(await skip.evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Enter');await focused(page,'#main-content');
  const guidanceRequests=[];
  const collectGuidanceRequest=request=>{
   if(new URL(request.url()).pathname.startsWith('/api/'))guidanceRequests.push(request.url());
  };
  page.on('request',collectGuidanceRequest);
  await page.getByRole('button',{name:'Optional guidance',exact:true}).click();
  const guidance=page.getByRole('region',{name:'Optional guidance',exact:true});
  assert.deepEqual(await guidance.locator('dt').allTextContents(),['Colors','Clothing','Footwear','Metals','Stones']);
  assert.deepEqual(await guidance.locator('dd').allTextContents(),Array(5).fill('Unavailable'));
  assert.equal(await page.locator('main input, main select, main button, main a').count(),0);
  assert.deepEqual(guidanceRequests,[]);
  page.off('request',collectGuidanceRequest);
  if(textScale===200)await page.evaluate(()=>{const size=parseFloat(getComputedStyle(document.documentElement).fontSize);document.documentElement.style.fontSize=(size*2)+'px';});
  await page.getByRole('button',{name:'Daily Timing',exact:true}).click();
  for(const [phrase,field] of [
   ['Sell my house in New York.','#location-timing-date'],
   ['Sell my house on 2026-11-01.','#location-timing-search'],
  ]){
   await page.getByRole('button',{name:'Guided chat',exact:true}).click();
   await page.getByLabel('Describe the activity (optional)',{exact:true}).fill(phrase);
   await page.getByRole('button',{name:'Review suggested details',exact:true}).press('Enter');
   await focused(page,field);
   const box=await page.locator(field).boundingBox();
   assert.ok(box&&box.x>=-1&&box.x+box.width<=width+1,`Guided field clipped: ${field}, ${width}px/${textScale}% root-text`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await page.getByRole('button',{name:'Astro Dashboard',exact:true}).click();
  await page.getByRole('button',{name:'Edit Birth Details',exact:true}).click();
  const fits=()=>page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  let size=await fits();assert.ok(size.scrollWidth<=size.viewport+1,`Actual app ${width}px/${textScale}% root-text has horizontal page overflow: ${JSON.stringify(size)}`);
  for(const label of ['Birth Date','Birth Time (Local)','City / Geographic Longitude','Ayanamsa Reference System']){
   const control=page.getByLabel(label,{exact:true});await control.waitFor();await control.scrollIntoViewIfNeeded();const box=await control.boundingBox();assert.ok(box&&box.x>=-1&&box.x+box.width<=width+1,`Control clipped: ${label}, ${width}px/${textScale}% root-text`);
   await page.getByText(label,{exact:true}).click();assert.equal(await control.evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Escape');
  }
  assert.doesNotMatch(await page.locator('body').textContent(),/BTR offers heuristic candidates/);
  await page.getByLabel('Birth Date',{exact:true}).fill('2000-01-01');await page.getByLabel('Birth Time (Local)',{exact:true}).fill('12:00');await page.getByLabel('City / Geographic Longitude',{exact:true}).selectOption('Kolkata');const ayanamsa=page.getByLabel('Ayanamsa Reference System',{exact:true});await ayanamsa.selectOption(await ayanamsa.inputValue());
  const certainty=page.getByLabel('Birth time certainty',{exact:true});await certainty.selectOption('UNKNOWN');assert.equal(await page.getByLabel('Birth Time (Local)',{exact:true}).isDisabled(),true);assert.equal(await page.getByLabel('Birth Time (Local)',{exact:true}).inputValue(),'12:00');await page.getByLabel('UTC offset at birth',{exact:true}).fill('5.5');await page.getByRole('button',{name:'Compute chart preview',exact:true}).click();await page.getByRole('alert').filter({hasText:'An exact chart is unavailable'}).waitFor();
  assert.match(await page.locator('body').textContent(),/No birth profile supplied/);size=await fits();assert.ok(size.scrollWidth<=size.viewport+1,`Refusal state ${width}px/${textScale}% root-text overflow: ${JSON.stringify(size)}`);assert.deepEqual(errors,[]);
  console.log(`Actual app ${width}px/${textScale}% root-text: Tab/Enter skip link, label operation, UNKNOWN refusal and no page/control horizontal clipping passed.`);await page.close();
 }
 console.log('Chromium keyboard and root-text stress only; full WCAG, screen-reader and device/browser conformance not claimed.');
}finally{await browser.close();}
