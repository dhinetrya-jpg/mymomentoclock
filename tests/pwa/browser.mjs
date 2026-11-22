// Real Chromium, built artifacts, synthetic inputs only. Own ephemeral servers;
// no deployed infrastructure or provider interaction. Run after npm ci.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdtemp,rm,cp,symlink} from 'node:fs/promises';
import {join,extname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
const root=resolve(import.meta.dirname,'../..');
const deadline=setTimeout(()=>{console.error('PWA_REGRESSION_TIMEOUT');process.exit(1);},120000);
const temporary=await mkdtemp(join(tmpdir(),'mymomento-pwa-'));

const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.jpg':'image/jpeg'};
async function scenario(label,folder,nextFolder,base){
 let release='original';
 const calls=[];
 const server=createServer(async(req,res)=>{
  calls.push(req.method+' '+req.url);
  const url=new URL(req.url,'http://localhost');
  res.setHeader('cache-control','no-store');
  if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');res.end(JSON.stringify({secret:'SYNTHETIC_PRIVATE_BIRTH_AND_CHECKOUT'}));return;}
  if(!url.pathname.startsWith(base)){res.statusCode=404;res.end('not found');return;}
  const file=url.pathname===base?'index.html':url.pathname.slice(base.length);
  if(file.includes('..')){res.statusCode=404;res.end();return;}
  try{
   let bytes=await readFile(join(release==='original'?folder:nextFolder,file));
   if(release==='failed'&&file==='pwa-clock.svg')bytes=Buffer.from('tampered fixture icon');
   res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(bytes);
  }catch{res.statusCode=404;res.end('not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port,url=origin+base;
 const context=await chromium.launchPersistentContext(join(temporary,'profile-'+label),{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox'],viewport:{width:375,height:812},serviceWorkers:'allow'});
 const page=await context.newPage();
 try{
  await page.goto(url);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));});
  const ownedPrefix='mymomentoclock-shell-'+encodeURIComponent(base)+'-';
  const foreignNames=['unrelated-application-cache','mymomentoclock-shell-'+encodeURIComponent('/other-app/')+'-fixture'];
  await page.evaluate(async names=>{for(const name of names){const cache=await caches.open(name);await cache.put(new URL('foreign-static',location.origin),new Response('foreign-cache-fixture'));}},foreignNames);
  const manifestURL=await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest=await (await context.request.get(new URL(manifestURL,url).href)).json();
  assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
  for(const icon of manifest.icons)assert.equal((await context.request.get(new URL(icon.src,url).href)).status(),200);
  const cdp=await context.newCDPSession(page);
  const installability=await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installability.installabilityErrors,[],label+' browser installability');
  // Synthetic control-flow coverage, separate from actual CDP eligibility above.
  for(const outcome of ['dismissed','accepted']){
   await page.evaluate(outcome=>{
    window.syntheticPromptCalls=0;
    const event=new Event('beforeinstallprompt',{cancelable:true});
    Object.assign(event,{prompt:async()=>{window.syntheticPromptCalls++;},userChoice:Promise.resolve({outcome})});
    window.dispatchEvent(event);
   },outcome);
   const button=page.getByRole('button',{name:'Install MyMomentOclock',exact:true});await button.waitFor();await button.focus();await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>window.syntheticPromptCalls),1);
   await page.getByRole('status').filter({hasText:outcome==='dismissed'?'Installation dismissed.':'Install request accepted.'}).waitFor();
   assert.equal(await button.count(),0);
  }
  await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
  await page.getByRole('status').filter({hasText:'Your browser reported that the app was installed.'}).waitFor();
  // Make real GET/POST private requests and a query-bearing static request.
  await page.evaluate(async()=>{
   await fetch('/api/private-profile',{credentials:'include'});
   await fetch('/api/v1/f01/explore',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({birth_date:'2000-01-01',synthetic:true})});
   await fetch('/api/checkout',{credentials:'include'});
   await fetch(new URL('pwa-clock.svg?personal=synthetic',location.href));
  });
  const cached=await page.evaluate(async prefix=>{const entries=[];for(const name of (await caches.keys()).filter(name=>name.startsWith(prefix))){for(const request of await(await caches.open(name)).keys()){entries.push({name,url:request.url,text:await(await(await caches.open(name)).match(request)).text()});}}return entries;},ownedPrefix);
  assert.ok(cached.length>=5);assert.ok(cached.every(entry=>entry.name.startsWith('mymomentoclock-shell-')));
  for(const entry of cached){assert.equal(new URL(entry.url).search,'');assert.ok(new URL(entry.url).pathname.startsWith(base));assert.doesNotMatch(entry.url,/\/api\//);assert.doesNotMatch(entry.text,/SYNTHETIC_PRIVATE_BIRTH_AND_CHECKOUT/);}
  await page.getByRole('button',{name:'Daily Timing',exact:true}).click();
  await page.getByLabel('Birth date',{exact:true}).fill('2000-01-01');
  const other=await context.newPage();await other.goto(url);
  await other.getByRole('button',{name:'Daily Timing',exact:true}).click();await other.getByLabel('Birth date',{exact:true}).fill('1999-12-31');
  const oldNames=await page.evaluate(()=>caches.keys());
  release='failed';
  await page.evaluate(async()=>{
   const registration=await navigator.serviceWorker.getRegistration();
   window.failedUpdate=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('failed update did not finish')),15000);
    registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker.addEventListener('statechange',()=>{if(worker.state==='redundant'){clearTimeout(timeout);resolve(true);}});},{once:true});
   });
  });
  await page.evaluate(()=>{navigator.serviceWorker.register(new URL('sw.js?test-release=failed',location.href),{scope:new URL('./',location.href).pathname,updateViaCache:'none'}).catch(console.error);});
  assert.equal(await page.evaluate(()=>window.failedUpdate),true);
  assert.deepEqual(await page.evaluate(()=>caches.keys()),oldNames,'failed precache preserves complete active cache');
  assert.equal(await page.getByLabel('Birth date',{exact:true}).inputValue(),'2000-01-01');
  release='next';
  await page.evaluate(()=>{navigator.serviceWorker.register(new URL('sw.js?test-release=next',location.href),{scope:new URL('./',location.href).pathname,updateViaCache:'none'}).catch(console.error);});
  await page.getByRole('button',{name:'Reload to update',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Birth date',{exact:true}).inputValue(),'2000-01-01','update does not reload automatically');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Reload to update',exact:true}).click();
  assert.equal(await page.getByLabel('Birth date',{exact:true}).inputValue(),'2000-01-01','cancel preserves unsaved input');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Reload to update',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Close other MyMomentOclock tabs'}).waitFor();
  assert.equal(await page.getByLabel('Birth date',{exact:true}).inputValue(),'2000-01-01');
  assert.equal(await other.getByLabel('Birth date',{exact:true}).inputValue(),'1999-12-31','other tab input preserved');
  await other.close();
  page.once('dialog',dialog=>{assert.match(dialog.message(),/Unsaved birth details/);return dialog.accept();});
  await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Reload to update',exact:true}).click()]);
  await page.waitForFunction(async()=>!(await navigator.serviceWorker.getRegistration()).waiting);
  await page.getByText('Install and offline information · updated shell',{exact:true}).waitFor();
  assert.equal(await page.evaluate(async prefix=>(await caches.keys()).filter(name=>name.startsWith(prefix)).length,ownedPrefix),1,'obsolete scope cache removed');
  for(const name of foreignNames){assert.ok((await page.evaluate(()=>caches.keys())).includes(name),'foreign and other-scope cache preserved');assert.equal(await page.evaluate(async name=>(await(await caches.open(name)).match(new URL('foreign-static',location.origin))).text(),name),'foreign-cache-fixture');}
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('status').filter({hasText:'You are offline.'}).waitFor();
  await page.getByRole('button',{name:'Daily Timing',exact:true}).click();
  assert.equal(await page.getByLabel('Birth date',{exact:true}).inputValue(),'','no persisted personal birth details');
  assert.equal(await page.evaluate(async()=>{try{await fetch('/api/private-profile');return false;}catch{return true;}}),true,'offline API is not a cached success');
  assert.equal(await page.evaluate(async()=>{try{await fetch(new URL('pwa-clock.svg?personal=synthetic',location.href));return false;}catch{return true;}}),true,'query-bearing requests are not served from cache');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await context.setOffline(false);
  await page.getByRole('status').filter({hasText:'Connection detected.'}).waitFor();
  assert.ok(calls.includes('POST /api/v1/f01/explore'));
  console.log(`${label}: manifest/browser installability; real worker; synthetic install controls (no OS install claim); scoped static-only cache; foreign/other-scope cache preservation; GET/POST private exclusions; offline shell + API refusal; failed precache preservation; real changed-build update/cancel/two-tab refusal/cache cleanup; 375px PASS`);
 }finally{await context.close();await new Promise(r=>server.close(r));}
}
try{
 // A separate source copy produces a genuine changed JS/HTML build; no test
 // mutates the candidate source or dist. Versioned script URLs request immediate
 // same-scope update checks independently of Chromium's scheduling heuristics.
 const nextRoot=join(temporary,'next-source');
 for(const name of ['src','frontend','tooling','index.html','vite.config.ts','package.json','tsconfig.json'])await cp(join(root,name),join(nextRoot,name),{recursive:true,filter:source=>!source.includes('/node_modules')&&!source.includes('/dist')});
 await symlink(join(root,'node_modules'),join(nextRoot,'node_modules'),'dir');
 // A protocol-only change must change cache identity even when all static
 // artifact bytes remain identical; otherwise failed installs can affect live caches.
 const build=(cwd,folder,base)=>execFileSync(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'build','--outDir',folder,'--emptyOutDir'],{cwd,env:{...process.env,VITE_BASE_PATH:base},stdio:'pipe'});
 const logicBaseline=join(temporary,'logic-baseline'),logicNext=join(temporary,'logic-next');
 build(nextRoot,logicBaseline,'/');
 const pluginPath=join(nextRoot,'tooling/pwa.ts'),plugin=await readFile(pluginPath,'utf8');
 await writeFile(pluginPath,plugin.replace('const ROOT=new URL(self.registration.scope);','const ROOT=new URL(self.registration.scope); // protocol regression'));
 build(nextRoot,logicNext,'/');
 assert.equal(await readFile(join(logicBaseline,'index.html'),'utf8'),await readFile(join(logicNext,'index.html'),'utf8'));
 const before=await readFile(join(logicBaseline,'sw.js'),'utf8'),after=await readFile(join(logicNext,'sw.js'),'utf8');
 assert.equal(before.match(/const FILES=(.*);/)[1],after.match(/const FILES=(.*);/)[1]);
 assert.notEqual(before.match(/const CACHE=PREFIX\+'([^']+)'/)[1],after.match(/const CACHE=PREFIX\+'([^']+)'/)[1]);
 await writeFile(pluginPath,plugin);
 console.log('Protocol-only worker change with identical static bytes: distinct content-addressed cache identity PASS');
 for(const folder of ['src','frontend/src']){const path=join(nextRoot,folder,'pwa/PwaStatus.tsx');await writeFile(path,(await readFile(path,'utf8')).replace('Install and offline information','Install and offline information · updated shell'));}
 // Build separate outputs so no test mutates normal dist or active application.
 for(const [label,cwd,base] of [['root',root,'/'],['project-base',root,'/mymomentoclock/'],['alternate-frontend',join(root,'frontend'),'/alternate/']]){
  const folder=join(temporary,label);
  execFileSync(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'build','--outDir',folder,'--emptyOutDir'],{cwd,env:{...process.env,VITE_BASE_PATH:base},stdio:'pipe'});
  const nextFolder=join(temporary,label+'-next');
  execFileSync(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'build','--outDir',nextFolder,'--emptyOutDir'],{cwd:label==='alternate-frontend'?join(nextRoot,'frontend'):nextRoot,env:{...process.env,VITE_BASE_PATH:base},stdio:'pipe'});
  await scenario(label,folder,nextFolder,base);
 }
 console.log('Chromium desktop emulation only; physical mobile install, Safari/WebKit and real-user/screen-reader signoff remain unverified. No scientific or deployment acceptance.');
}finally{clearTimeout(deadline);await rm(temporary,{recursive:true,force:true});}
