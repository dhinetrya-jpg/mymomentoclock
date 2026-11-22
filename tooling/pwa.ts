import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import type {Plugin} from 'vite';

// Only emitted, integrity-bound build files enter this cache. Historical public/
// content stays disabled. No response obtained during normal use is written.
export function privateShellPwa():Plugin {
 return {
  name:'mymomentoclock-private-shell',enforce:'post',apply:'build',
  transformIndexHtml(){return [{tag:'link',attrs:{rel:'manifest',href:'./manifest.webmanifest'},injectTo:'head'},{tag:'meta',attrs:{name:'theme-color',content:'#160408'},injectTo:'head'}];},
  generateBundle(_options,bundle){
   const icon=readFileSync(new URL('./pwa-icons/clock.svg',import.meta.url));
   const icons=[192,512].map(size=>({size,bytes:readFileSync(new URL(`./pwa-icons/clock-${size}.png`,import.meta.url))}));
   const manifest=JSON.stringify({id:'./',name:'MyMomentOclock',short_name:'MyMomentOclock',description:'Exploratory Vedic chart tools and city-local timing with explicit availability limits.',lang:'en',start_url:'./',scope:'./',display:'standalone',background_color:'#160408',theme_color:'#160408',icons:[...icons.map(({size})=>({src:`pwa-clock-${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'})),{src:'pwa-clock.svg',sizes:'any',type:'image/svg+xml',purpose:'maskable'}]});
   this.emitFile({type:'asset',fileName:'pwa-clock.svg',source:icon});
   for(const {size,bytes} of icons)this.emitFile({type:'asset',fileName:`pwa-clock-${size}.png`,source:bytes});
   this.emitFile({type:'asset',fileName:'manifest.webmanifest',source:manifest});
   const entries:Record<string,string>={};
   const hash=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
   for(const [name,file] of Object.entries(bundle)){
    if(name==='index.html'||name.startsWith('assets/'))entries[name]=hash(file.type==='chunk'?file.code:file.source);
   }
   if(!entries['index.html'])this.error('PWA_STATIC_INDEX_MISSING');
   entries['manifest.webmanifest']=hash(manifest);entries['pwa-clock.svg']=hash(icon);
   for(const {size,bytes} of icons)entries[`pwa-clock-${size}.png`]=hash(bytes);
   const source=`
const FILES=${JSON.stringify(entries)};
const ROOT=new URL(self.registration.scope);
const PREFIX='mymomentoclock-shell-'+encodeURIComponent(ROOT.pathname)+'-';
const CACHE=PREFIX+'__PWA_CONTENT_VERSION__';
const allowed=new Map(Object.entries(FILES).map(([path,hash])=>[new URL(path,ROOT).href,hash]));
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const existed=(await caches.keys()).includes(CACHE);
 const cache=await caches.open(CACHE);
 try {
  for(const [url,expected] of allowed){
   const response=await fetch(url,{cache:'reload',credentials:'omit',redirect:'error'});
   if(!response.ok||response.type==='opaque')throw Error('STATIC_SHELL_UNAVAILABLE');
   const bytes=await response.clone().arrayBuffer();
   const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
   if(actual!==expected)throw Error('STATIC_SHELL_INTEGRITY_MISMATCH');
   await cache.put(url,response);
  }
 }catch(error){if(!existed)await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type!=='APPLY_SHELL_UPDATE')return;
 event.waitUntil((async()=>{
  const windows=(await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(client=>{const url=new URL(client.url);return url.origin===ROOT.origin&&url.pathname.startsWith(ROOT.pathname);});
  if(windows.length>1){event.source?.postMessage({type:'UPDATE_BLOCKED_OPEN_TABS'});return;}
  await self.skipWaiting();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==ROOT.origin||url.search||url.hash||!url.pathname.startsWith(ROOT.pathname))return;
 // API/auth/payment/personal endpoints never enter the allowlist. Unknown
 // navigations are not answered with a misleading successful application shell.
 const index=new URL('index.html',ROOT).href;
 if(request.mode==='navigate'&&(url.href===ROOT.href||url.href===index)){
  event.respondWith(fetch(request).catch(async()=>{const cached=await caches.match(index,{cacheName:CACHE});return cached||Response.error();}));return;
 }
 if(!allowed.has(url.href))return;
 event.respondWith(caches.match(url.href,{cacheName:CACHE}).then(cached=>cached||fetch(request)));
});
`;
   // Worker logic changes are distinct installations even with identical assets.
   const version=hash(source).slice(0,20);
   this.emitFile({type:'asset',fileName:'sw.js',source:source.replace('__PWA_CONTENT_VERSION__',version)});
  }
 };
}
