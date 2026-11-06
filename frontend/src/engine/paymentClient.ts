// UI preparation only. The current CheckoutModal never invokes order creation.
export type PaymentStatus='CREATED'|'PENDING'|'COMPLETED'|'FAILED'|'CANCELLED'|'EXPIRED'|'REFUNDED'|'REVERSED'|'PAYMENT_REVIEW';
export interface PaymentOrder {order_id:string;product_id:string;product_version:string;amount_minor:number;currency:string;status:PaymentStatus;checkout?:{mode:"sandbox"|"production";key_id:string;provider_order_id:string};commercial_policy?:{description:string;access_disclosure:string;tax_disclosure:string;refund_disclosure:string;billing_model:string}}
export interface AccessGrant {capability_id:string;source_order:string;expires_at?:string}
export class PaymentAPIError extends Error{constructor(public status:number,public code:string){super(code);}}
function csrf(){return document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-mmo-csrf='))?.split('=')[1]||'';}
async function api(path:string,options:RequestInit={}){
 const response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json',...(options.method==='POST'?{'x-csrf-token':csrf()}: {})}});
 if(!response.ok){let code='PAYMENT_REQUEST_FAILED';try{const body=await response.json();if(['ALREADY_PURCHASED','PAYMENT_CONFLICT','UNAUTHENTICATED','PAYMENT_SERVICE_UNAVAILABLE','INVALID_REQUEST'].includes(body.error))code=body.error;}catch{}throw new PaymentAPIError(response.status,code);}
 return response.json();
}
export const paymentClient={
 catalog:():Promise<{products:any[]}>=>api('/api/payment/catalog'),
 createOrder:(product_id:string,idempotency_key:string):Promise<PaymentOrder>=>api('/api/payment/orders',{method:'POST',body:JSON.stringify({product_id,idempotency_key})}),
 order:(orderId:string):Promise<PaymentOrder>=>api('/api/payment/orders/'+encodeURIComponent(orderId)),
 entitlements:():Promise<{entitlements:AccessGrant[]}>=>api('/api/payment/entitlements'),
};
export function checkoutMessage(status:PaymentStatus|'UNAVAILABLE'|'ALREADY_PURCHASED'):{message:string;retry:boolean}{
 switch(status){
 case 'CREATED':case 'PENDING':return {message:'Payment is pending. Access requires server confirmation.',retry:false};
 case 'COMPLETED':return {message:'The server reports payment complete. Access is checked separately against your current entitlement.',retry:false};
 case 'FAILED':return {message:'Payment failed. Check the order before retrying.',retry:true};
 case 'CANCELLED':return {message:'Payment was cancelled. No access has been granted by this checkout.',retry:true};
 case 'EXPIRED':return {message:'This order expired. Start a new checkout when the service is available.',retry:true};
 case 'REFUNDED':case 'REVERSED':return {message:'This payment was refunded or reversed. Access from this order is revoked.',retry:false};
 case 'PAYMENT_REVIEW':return {message:'Payment requires review. Access from this order is unavailable.',retry:false};
 case 'ALREADY_PURCHASED':return {message:'The server confirms an active purchase. Access is still enforced by the server.',retry:false};
 default:return {message:'Checkout is not available yet. No payment will be taken and no delivery or paid access has been activated.',retry:false};
 }
}
