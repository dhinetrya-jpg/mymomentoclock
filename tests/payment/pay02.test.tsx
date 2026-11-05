import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import express from 'express';
import {CheckoutModal} from '../../src/components/CheckoutModal';
import {CheckoutModal as AlternateCheckout} from '../../frontend/src/components/CheckoutModal';
import {sandboxPaymentBoundaryFromEnvironment,createPaymentBoundary} from '../../server/paymentBoundary';
import {checkoutMessage} from '../../src/engine/paymentClient';
test('both default checkout views remain unavailable without SDK loading or a guessed price',()=>{
 for(const Modal of [CheckoutModal,AlternateCheckout]){const html=renderToStaticMarkup(<Modal isOpen onClose={()=>{}}/>);assert.match(html,/Payments unavailable/);assert.match(html,/No payment will be taken/);assert.doesNotMatch(html,/<script|card.number|₹499|₹500|Payment successful/);}
});
test('sandbox presentation is clearly test mode and never renders a confirmed payment initially',()=>{
 const html=renderToStaticMarkup(<CheckoutModal isOpen onClose={()=>{}} sandboxProductId="fixture-product"/>);assert.match(html,/TEST MODE/);assert.match(html,/Pricing comes from the server/);assert.doesNotMatch(html,/server confirmed sandbox payment|card.number|<script/);assert.match(checkoutMessage('PAYMENT_REVIEW').message,/unavailable/);
});
async function serve(handler:express.RequestHandler,run:(url:string)=>Promise<void>){const app=express();app.use(express.json());app.use('/api/payment',handler);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));try{await run('http://127.0.0.1:'+(server.address() as {port:number}).port);}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}}
test('sandbox environment flags without a real identity cannot enable checkout',async()=>{
 const oldMode=process.env.PAYMENT_MODE,oldApproval=process.env.RAZORPAY_SANDBOX_APPROVED;process.env.PAYMENT_MODE='sandbox';process.env.RAZORPAY_SANDBOX_APPROVED='owner-approved';try{await serve(sandboxPaymentBoundaryFromEnvironment(),async url=>assert.equal((await fetch(url+'/api/payment/orders')).status,503));}finally{if(oldMode===undefined)delete process.env.PAYMENT_MODE;else process.env.PAYMENT_MODE=oldMode;if(oldApproval===undefined)delete process.env.RAZORPAY_SANDBOX_APPROVED;else process.env.RAZORPAY_SANDBOX_APPROVED=oldApproval;}
});
test('live provider checkout keys are never forwarded by the sandbox boundary',async()=>{
 await serve(createPaymentBoundary({activationApproved:true,identity:{productionReady:true,async verify(){return {bearerToken:'fixture-session'};}},transport:async()=>({status:200,body:{order_id:'internal',product_id:'fixture-product',product_version:'v1',capability_id:'access',status:'PENDING',amount_minor:12345,currency:'INR',checkout:{mode:'sandbox',key_id:'rzp_live_rejected',provider_order_id:'order_fixture'}}})}),async url=>{const response=await fetch(url+'/api/payment/orders/internal');assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/rzp_live/);});
});
