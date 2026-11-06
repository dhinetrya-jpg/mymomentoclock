import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createAuthGateway,authGatewayFromEnvironment} from './authGateway';
import {createMTLSTransport,createPaymentBoundary} from './paymentBoundary';
import {productionPermitFromEnvironment} from './releasePolicy';
export function commercialGatewayFromEnvironment(){
 const mode=process.env.PAYMENT_MODE;
 if(!mode||mode==='disabled')return {auth:createAuthGateway(),payment:createPaymentBoundary(),checkoutSources:false};
 if(!['local','test','sandbox','staging','production'].includes(mode))throw Error('PAYMENT_ENVIRONMENT_INVALID');
 const configFile=process.env.PAYMENT_COMMERCIAL_CONFIG_FILE;
 if(!configFile){if(mode==='production')throw Error('PAYMENT_RELEASE_NOT_AUTHORIZED');return {auth:createAuthGateway(),payment:createPaymentBoundary(),checkoutSources:false};}
 const raw=readFileSync(configFile),c=JSON.parse(raw.toString());if(c.schema_version!==1||c.environment!==mode||typeof c.approval_reference!=='string'||c.approval_reference.length<8)throw Error('COMMERCIAL_CONFIGURATION_UNAPPROVED');
 const permit=mode==='production'?productionPermitFromEnvironment(raw):undefined;
 if(process.env.PAYMENT_AUTH_CONFIG_FILE!==c.identity_config_file||process.env.PAYMENT_PUBLIC_ORIGIN!==c.public_origin||createHash('sha256').update(readFileSync(c.identity_config_file)).digest('hex')!==c.identity_config_sha256)throw Error('IDENTITY_CONFIGURATION_UNAPPROVED');
 const auth=authGatewayFromEnvironment();if(!auth.identity)return {auth,payment:createPaymentBoundary(),checkoutSources:false};
 const transport=createMTLSTransport({url:process.env.PAYMENT_INTERNAL_URL||'',caFile:process.env.PAYMENT_INTERNAL_CA_FILE||'',certFile:process.env.PAYMENT_INTERNAL_CERT_FILE||'',keyFile:process.env.PAYMENT_INTERNAL_KEY_FILE||''});
 return {auth,payment:createPaymentBoundary({identity:auth.identity,transport,activationApproved:true,productionPermit:permit}),checkoutSources:true};
}
