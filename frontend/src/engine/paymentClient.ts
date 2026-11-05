// UI preparation only. The current CheckoutModal never invokes order creation.
export type PaymentStatus='CREATED'|'PENDING'|'COMPLETED'|'FAILED'|'CANCELLED'|'EXPIRED'|'REFUNDED'|'REVERSED';
export interface PaymentOrder {order_id:string;product_id:string;product_version:string;amount_minor:number;currency:string;status:PaymentStatus}
export interface AccessGrant {capability_id:string;source_order:string;expires_at?:string}
async function api(path:string,options:RequestInit={}){
 const response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'}});
 if(!response.ok)throw Error(response.status===503?'PAYMENTS_UNAVAILABLE':'PAYMENT_REQUEST_FAILED');
 return response.json();
}
export const paymentClient={
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
 case 'ALREADY_PURCHASED':return {message:'The server confirms an active purchase. Access is still enforced by the server.',retry:false};
 default:return {message:'Checkout is not available yet. No payment will be taken and no delivery or paid access has been activated.',retry:false};
 }
}
