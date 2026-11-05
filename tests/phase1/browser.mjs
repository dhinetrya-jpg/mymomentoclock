import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const base=process.env.PHASE1_WEB_URL||'http://127.0.0.1:3101';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const viewport of [{width:375,height:812},{width:1280,height:900}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[],external=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  page.on('request',r=>{requests.push(r.url());if(new URL(r.url()).origin!==new URL(base).origin)external.push(r.url()); // Same-origin blob workers do not transfer data off origin.});
  await page.goto(base,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Edit Birth Details'}).click();
  await page.locator('input[type=date]').fill('1989-11-23');await page.locator('input[type=time]').fill('04:30:00');
  await page.locator('form select').nth(0).selectOption('Kolkata');await page.getByLabel('UTC offset at birth').fill('5.5');
  await page.getByLabel('Birth time certainty').selectOption('UNKNOWN');await page.getByRole('button',{name:'Compute chart preview'}).click();
  await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/unavailable|birth time/i);
  await page.getByLabel('Birth time certainty').selectOption('APPROXIMATE');await page.getByRole('button',{name:'Compute chart preview'}).click();
  await page.getByRole('heading',{name:'Planetary position preview'}).waitFor();assert.equal(await page.locator('tbody tr').count(),9);
  await page.getByRole('button',{name:'D9',exact:true}).click();await page.getByRole('button',{name:'D60',exact:true}).click();
  await page.getByRole('button',{name:'Conflict calculation status'}).click();await page.getByRole('dialog',{name:'Conflict calculation status'}).waitFor();await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Birth time preview (BTR)'}).click();const dialog=page.getByRole('dialog',{name:'Birth time rectification'});await dialog.waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Rectification unavailable'}).isDisabled(),true);assert.match(await dialog.innerText(),/04:30:00/);assert.equal(await dialog.locator('input').count(),0);
  await page.getByLabel('Close birth time dialog').click();
  await page.getByRole('button',{name:'Prosperity Kit',exact:true}).click();await page.getByLabel('Event city').selectOption('Mumbai');
  await page.getByText('Personal Timing Unavailable',{exact:true}).waitFor();assert.match(await page.locator('main').innerText(),/unverified/i);
  await page.getByRole('button',{name:'Break Seal',exact:true}).click();
  await page.getByRole('button',{name:'Checkout status',exact:true}).first().click();await page.getByRole('dialog',{name:'Checkout',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Payments unavailable'}).isDisabled(),true);await page.getByLabel('Close checkout').click();
  const broken=await page.locator('img').evaluateAll(imgs=>imgs.filter(img=>!img.complete||img.naturalWidth===0).map(img=>img.src));assert.deepEqual(broken,[]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'page overflows viewport');
  assert.deepEqual(errors,[],'browser errors');assert.deepEqual(external,[],'unapproved external requests');assert.equal(requests.some(url=>url.includes('/api/payment/')),false,'checkout must not create a payment request');
  console.log(`browser ${viewport.width}px: chart, validation, division tabs, BTR, modal, festival, checkout, privacy and overflow passed`);await context.close();
 }
}finally{await browser.close();}
