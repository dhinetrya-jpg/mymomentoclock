import {useEffect,useState} from 'react';

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export function PwaStatus(){
 const [online,setOnline]=useState(()=>navigator.onLine),[install,setInstall]=useState<InstallPrompt|null>(null),[waiting,setWaiting]=useState<ServiceWorker|null>(null),[message,setMessage]=useState(''),[installed,setInstalled]=useState(false);
 useEffect(()=>{
  const connectivity=()=>setOnline(navigator.onLine);
  const offered=(event:Event)=>{event.preventDefault();setInstall(event as InstallPrompt);};
  const complete=()=>{setInstall(null);setInstalled(true);};
  window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);window.addEventListener('beforeinstallprompt',offered);window.addEventListener('appinstalled',complete);
  const workerMessage=(event:MessageEvent)=>{if(event.data?.type==='UPDATE_BLOCKED_OPEN_TABS')setMessage('Close other MyMomentOclock tabs or windows before updating. Their unsaved input has been preserved. Then choose Reload to update again.');};
  navigator.serviceWorker?.addEventListener('message',workerMessage);
  let alive=true;
  if(import.meta.env.PROD&&window.isSecureContext&&'serviceWorker' in navigator){
   const root=new URL(import.meta.env.BASE_URL,document.baseURI);
   navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.pathname,updateViaCache:'none'}).then(registration=>{
    if(!alive)return;
    const observe=()=>{if(alive)setWaiting(registration.active&&navigator.serviceWorker.controller&&registration.waiting?.state==='installed'?registration.waiting:null);};
    observe();registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',observe);});
   }).catch(()=>{if(alive)setMessage('Offline shell is unavailable. Online tools still depend on their server.');});
  }
  return ()=>{alive=false;navigator.serviceWorker?.removeEventListener('message',workerMessage);window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity);window.removeEventListener('beforeinstallprompt',offered);window.removeEventListener('appinstalled',complete);};
 },[]);
 const applyUpdate=()=>{
  if(!waiting||waiting.state!=='installed'||!window.confirm('Reload to update the app? Unsaved birth details, other form input and checkout progress on this page will be lost. Finish or cancel your current task first.'))return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true});
  waiting.postMessage({type:'APPLY_SHELL_UPDATE'});
 };
 const offerInstall=async()=>{
  if(!install)return;
  const prompt=install;setInstall(null);
  try{await prompt.prompt();const choice=await prompt.userChoice;setMessage(choice.outcome==='accepted'?'Install request accepted. Your browser completes installation.':'Installation dismissed. You can continue using this browser.');}catch{setMessage('Installation is unavailable here. You can continue using this browser.');}
 };
 return <aside aria-label="App availability and installation" className="border-t border-rose-800 bg-[#160408] px-4 py-4 text-sm text-rose-100">
  <div className="mx-auto max-w-7xl space-y-3">
   <p role="status" aria-live="polite">{online?'Connection detected. Calculation and checkout availability still depends on the server and release restrictions.':'You are offline. Only the static app shell may be available. Server calculations and checkout require a connection. Any local analytical preview remains unverified; no saved personal results are provided.'}</p>
   {waiting&&<div className="space-y-2"><p role="status">An app update is ready. Your current page will stay open until you choose to reload.</p><button type="button" className="rounded border border-amber-400 px-4 py-3 text-amber-200" onClick={applyUpdate}>Reload to update</button></div>}
   {install&&<button type="button" className="rounded border border-amber-400 px-4 py-3 text-amber-200" onClick={offerInstall}>Install MyMomentOclock</button>}
   {installed&&<p role="status">Your browser reported that the app was installed.</p>}
   {message&&<p role="status">{message}</p>}
   <details><summary className="cursor-pointer py-2">Install and offline information</summary><p className="mt-2 max-w-3xl">If your browser supports installation, use its Install app or Add to Home Screen option. On iPhone or iPad, check Safari’s Share menu. Availability varies by browser. Opening the app online first can prepare its static shell for later offline use. Birth details, calculation results and checkout data are not stored in the offline cache.</p></details>
  </div>
 </aside>;
}
