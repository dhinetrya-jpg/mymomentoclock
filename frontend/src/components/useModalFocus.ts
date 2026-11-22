import {useLayoutEffect,useRef} from 'react';

interface ModalEntry {
  dialog:HTMLElement;
  close:()=>void;
  returnTargets:HTMLElement[];
  externalModalSelector?:string;
  ariaModal:string|null;
  layer:HTMLElement;
  layerIndex:string;
  layerPriority:string;
}
interface OriginalState {inert:string|null;ariaHidden:string|null}
const stack:ModalEntry[]=[];
const suppressed=new Map<HTMLElement,OriginalState>();
let observer:MutationObserver|null=null;
let listeningDocument:Document|null=null;
let scheduled=false;
let backwards=false;
function last<T>(items:T[]){return items[items.length-1];}

function visible(element:HTMLElement){
  const style=element.ownerDocument.defaultView?.getComputedStyle(element);
  return element.isConnected&&element.getClientRects().length>0&&style?.visibility!=='hidden'&&style?.visibility!=='collapse'&&!element.closest('[hidden]');
}
function focusable(element:HTMLElement){
  return visible(element)&&!element.matches(':disabled')&&!element.closest('[inert],[aria-hidden="true"]')&&element.tabIndex>=0;
}
function focusables(root:HTMLElement){
  const elements=Array.from(root.querySelectorAll<HTMLElement>('a[href],area[href],button,input:not([type="hidden"]),select,textarea,iframe,object,embed,[contenteditable="true"],[tabindex]')).filter(focusable);
  // Native Tab visits one radio in a named group, not every unchecked radio.
  const eligible=elements.filter(element=>{
    if(!(element instanceof HTMLInputElement)||element.type!=='radio'||!element.name)return true;
    const group=elements.filter((candidate):candidate is HTMLInputElement=>candidate instanceof HTMLInputElement&&candidate.type==='radio'&&candidate.name===element.name&&candidate.form===element.form);
    return element===(group.find(candidate=>candidate.checked)||group[0]);
  });
  return eligible.map((element,index)=>({element,index})).sort((a,b)=>{
    const first=a.element.tabIndex>0?a.element.tabIndex:Infinity;
    const second=b.element.tabIndex>0?b.element.tabIndex:Infinity;
    return first-second||a.index-b.index;
  }).map(item=>item.element);
}
function top(){return last(stack.filter(entry=>entry.dialog.isConnected));}
function external(entry:ModalEntry){
  if(!entry.externalModalSelector)return null;
  // The hosted checkout owns its iframe keyboard handling. Never trap or Escape-close its parent behind it.
  return last(Array.from(entry.dialog.ownerDocument.querySelectorAll<HTMLElement>(entry.externalModalSelector)).filter(visible))||null;
}
function boundary(entry:ModalEntry){return external(entry)||entry.dialog;}
function setAttribute(element:HTMLElement,name:string,value:string|null){
  if(value===null){if(element.hasAttribute(name))element.removeAttribute(name);}
  else if(element.getAttribute(name)!==value)element.setAttribute(name,value);
}
function updateSuppression(){
  const entry=top(),desired=new Set<HTMLElement>();
  for(const [index,modal] of stack.entries()){
    setAttribute(modal.dialog,'aria-modal',modal===entry?'true':'false');
    const layerIndex=String(50+index*2);
    if(modal.layer.style.getPropertyValue('z-index')!==layerIndex)modal.layer.style.setProperty('z-index',layerIndex);
  }
  if(entry){
    let branch:HTMLElement|null=boundary(entry);
    while(branch&&branch!==branch.ownerDocument.body){
      const parent:HTMLElement|null=branch.parentElement;
      if(!parent)break;
      for(const sibling of Array.from(parent.children))if(sibling!==branch&&sibling instanceof HTMLElement)desired.add(sibling);
      branch=parent;
    }
  }
  for(const [element,original] of suppressed){
    if(desired.has(element))continue;
    setAttribute(element,'inert',original.inert);setAttribute(element,'aria-hidden',original.ariaHidden);suppressed.delete(element);
  }
  if(entry&&!external(entry)){
    const active=entry.dialog.ownerDocument.activeElement;
    if(active instanceof HTMLElement&&Array.from(desired).some(element=>element.contains(active)))focusFirst(entry);
  }
  for(const element of desired){
    if(!suppressed.has(element))suppressed.set(element,{inert:element.getAttribute('inert'),ariaHidden:element.getAttribute('aria-hidden')});
    if(!element.inert)element.inert=true;
    setAttribute(element,'aria-hidden','true');
  }
}
function focusFirst(entry:ModalEntry,fromEnd=false){
  const elements=focusables(entry.dialog);
  const preferred=entry.dialog.querySelector<HTMLElement>('[data-modal-initial-focus],[autofocus]');
  const target=fromEnd?last(elements):(preferred&&focusable(preferred)?preferred:elements[0]);
  (target||entry.dialog).focus({preventScroll:true});
}
function keepFocus(){
  const entry=top();if(!entry||external(entry))return;
  const active=entry.dialog.ownerDocument.activeElement;
  if(active===entry.dialog)return;
  if(active instanceof HTMLElement&&entry.dialog.contains(active)&&focusable(active))return;
  focusFirst(entry,backwards);
}
function refresh(){updateSuppression();keepFocus();}
function scheduleRefresh(){
  if(scheduled)return;scheduled=true;
  queueMicrotask(()=>{scheduled=false;refresh();});
}
function keydown(event:KeyboardEvent){
  const entry=top();if(!entry||external(entry)||event.defaultPrevented||event.isComposing)return;
  if(event.key==='Escape'){
    event.preventDefault();event.stopPropagation();entry.close();return;
  }
  if(event.key!=='Tab')return;
  backwards=event.shiftKey;
  const elements=focusables(entry.dialog),active=entry.dialog.ownerDocument.activeElement;
  if(!elements.length){event.preventDefault();entry.dialog.focus({preventScroll:true});return;}
  if(!entry.dialog.contains(active)||active===entry.dialog||event.shiftKey&&active===elements[0]||!event.shiftKey&&active===last(elements)){
    event.preventDefault();(event.shiftKey?last(elements):elements[0])?.focus({preventScroll:true});
  }
}
function start(document:Document){
  if(listeningDocument)return;
  listeningDocument=document;
  document.addEventListener('keydown',keydown);
  document.addEventListener('focusin',keepFocus);
  observer=new MutationObserver(scheduleRefresh);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden','style','class','tabindex','inert','aria-hidden']});
}
function stop(){
  observer?.disconnect();observer=null;
  listeningDocument?.removeEventListener('keydown',keydown);
  listeningDocument?.removeEventListener('focusin',keepFocus);
  listeningDocument=null;backwards=false;
}

/** WAI-ARIA APG modal keyboard pattern; no claim of screen-reader or hosted-provider conformance. */
export function useModalFocus(open:boolean,onClose:()=>void,externalModalSelector?:string){
  const dialogRef=useRef<HTMLElement|null>(null),closeRef=useRef(onClose);
  closeRef.current=onClose;
  useLayoutEffect(()=>{
    const dialog=dialogRef.current;if(!open||!dialog)return;
    const active=dialog.ownerDocument.activeElement,previous=top();
    const returnTargets=[...(active instanceof HTMLElement?[active]:[]),...(previous?.returnTargets||[])];
    const layer=dialog.parentElement||dialog;
    const entry:ModalEntry={dialog,close:()=>closeRef.current(),returnTargets:[...new Set(returnTargets)],externalModalSelector,ariaModal:dialog.getAttribute('aria-modal'),layer,layerIndex:layer.style.getPropertyValue('z-index'),layerPriority:layer.style.getPropertyPriority('z-index')};
    stack.push(entry);start(dialog.ownerDocument);backwards=false;
    updateSuppression();focusFirst(entry);
    return()=>{
      const wasTop=last(stack)===entry,index=stack.indexOf(entry);if(index>=0)stack.splice(index,1);
      setAttribute(dialog,'aria-modal',entry.ariaModal);
      if(entry.layerIndex)entry.layer.style.setProperty('z-index',entry.layerIndex,entry.layerPriority);else entry.layer.style.removeProperty('z-index');
      updateSuppression();
      if(!stack.length)stop();
      if(wasTop){
        const next=top();
        const target=entry.returnTargets.find(candidate=>focusable(candidate)&&(!next||boundary(next).contains(candidate)));
        if(target)target.focus({preventScroll:true});else if(next&&!external(next))focusFirst(next);else if(!next)focusables(dialog.ownerDocument.body)[0]?.focus({preventScroll:true});
      }
    };
  },[open,externalModalSelector]);
  return dialogRef;
}
