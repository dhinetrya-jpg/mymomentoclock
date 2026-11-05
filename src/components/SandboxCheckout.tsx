import React,{useEffect,useRef,useState} from 'react';
import {paymentClient,type PaymentOrder} from '../engine/paymentClient';
type Stage='PRODUCT_SELECTED'|'ORDER_PENDING'|'OPENING'|'AWAITING_PAYMENT'|'VERIFYING'|'CONFIRMED'|'FAILED'|'CANCELLED'|'TIMED_OUT'|'ALREADY_PURCHASED'|'REVOKED'|'UNAVAILABLE';
const messages:Record<Stage,string>={PRODUCT_SELECTED:'Sandbox product selected. Pricing comes from the server.',ORDER_PENDING:'Creating sandbox order…',OPENING:'Opening official Razorpay test checkout…',AWAITING_PAYMENT:'Awaiting sandbox payment.',VERIFYING:'Verifying durable payment and access with the server…',CONFIRMED:'The server confirmed sandbox payment and an active entitlement.',FAILED:'Sandbox payment failed. Retry uses the existing order.',CANCELLED:'Sandbox checkout cancelled.',TIMED_OUT:'Verification timed out. Check the existing order before retrying.',ALREADY_PURCHASED:'The server confirms an existing active purchase.',REVOKED:'This order is refunded, reversed or under review. Access from it is unavailable.',UNAVAILABLE:'Sandbox checkout is unavailable. No payment success or access is assumed.'};
function officialCheckout():Promise<any>{return new Promise((resolve,reject)=>{const win=window as any;if(win.Razorpay){resolve(win.Razorpay);return;}const timer=setTimeout(()=>reject(Error('CHECKOUT_TIMEOUT')),10000);const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;script.onload=()=>{clearTimeout(timer);win.Razorpay?resolve(win.Razorpay):reject(Error());};script.onerror=()=>{clearTimeout(timer);reject(Error());};document.head.appendChild(script);});}
// Not mounted by default. A reviewed authenticated sandbox bootstrap must supply the catalog product.
export const SandboxCheckout:React.FC<{productId:string}>=({productId})=>{
 const [stage,setStage]=useState<Stage>('PRODUCT_SELECTED');const [order,setOrder]=useState<PaymentOrder|null>(null);const alive=useRef(true);const key=useRef(crypto.randomUUID());
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const update=(next:Stage)=>{if(alive.current)setStage(next);};
 const verify=async(o:PaymentOrder)=>{update('VERIFYING');for(let attempt=0;attempt<18&&alive.current;attempt++){
  const current=await paymentClient.order(o.order_id);
  if(['REFUNDED','REVERSED','PAYMENT_REVIEW'].includes(current.status)){update('REVOKED');return;}
  if(current.status==='COMPLETED'){const grants=await paymentClient.entitlements();if(grants.entitlements.some(g=>g.source_order===o.order_id)){update('CONFIRMED');return;}}
  if(current.status==='FAILED'){update('FAILED');return;}if(current.status==='CANCELLED'){update('CANCELLED');return;}
  await new Promise(resolve=>setTimeout(resolve,5000));
 }update('TIMED_OUT');};
 const open=async()=>{try{
  update('ORDER_PENDING');const o=order||await paymentClient.createOrder(productId,key.current);if(!alive.current)return;setOrder(o);
  const grants=await paymentClient.entitlements();if(grants.entitlements.some(g=>g.source_order===o.order_id)){update('ALREADY_PURCHASED');return;}
  if(o.status==='COMPLETED'){await verify(o);return;}
  if(!o.checkout||o.checkout.mode!=='sandbox'||!o.checkout.key_id.startsWith('rzp_test_')){update('UNAVAILABLE');return;}
  update('OPENING');const Razorpay=await officialCheckout();if(!alive.current)return;
  const checkout=new Razorpay({key:o.checkout.key_id,order_id:o.checkout.provider_order_id,amount:o.amount_minor,currency:o.currency,name:'MyMomentOclock — TEST MODE',description:'Sandbox only',handler:()=>{if(alive.current)verify(o).catch(()=>update('UNAVAILABLE'));},modal:{ondismiss:()=>update('CANCELLED')}});
  checkout.on('payment.failed',()=>update('FAILED'));checkout.open();update('AWAITING_PAYMENT');
 }catch{update('UNAVAILABLE');}};
 return <section aria-label="Sandbox checkout" className="space-y-3"><p className="text-amber-300 font-bold">TEST MODE — no production payment</p><p role="status" aria-live="polite">{messages[stage]}</p>{order&&<p>{new Intl.NumberFormat('en-IN',{style:'currency',currency:order.currency}).format(order.amount_minor/100)} · sandbox order</p>}<button className="rounded border border-amber-700 p-3" disabled={['ORDER_PENDING','OPENING','AWAITING_PAYMENT','VERIFYING','CONFIRMED','ALREADY_PURCHASED','REVOKED'].includes(stage)} onClick={open}>Continue sandbox checkout</button></section>;
};
