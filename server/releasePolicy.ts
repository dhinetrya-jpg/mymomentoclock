import {createHash,createPublicKey,verify} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
const digest=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
// Production image must contain this owner key. Standard web image deliberately contains none.
const pinnedKeyFile='/app/release/owner-public-key.hex';
export class ProductionPermit {
 private constructor(private expires:number){}
 valid(){return Number.isFinite(this.expires)&&Date.now()<this.expires;}
 static verify(raw:Buffer,signature:Buffer,publicHex:string,expectedGateway:string,expectedConfig:string){
  if(!/^[a-f0-9]{64}$/.test(publicHex)||raw.length>65536)throw Error('PAYMENT_RELEASE_NOT_AUTHORIZED');
  const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(publicHex,'hex')]),format:'der',type:'spki'});
  if(signature.length!==64||!verify(null,raw,key,signature))throw Error('PAYMENT_RELEASE_NOT_AUTHORIZED');
  const m=JSON.parse(raw.toString());const expires=Date.parse(m.expires_at),issued=Date.parse(m.issued_at);
  const allowed=['schema_version','environment','artifact_digest','gateway_digest','config_digest','catalog_digest','merchant_account','identity_issuer','approval_reference','issued_at','expires_at','gates'];let issuer:URL;try{issuer=new URL(m.identity_issuer);}catch{throw Error('PAYMENT_RELEASE_NOT_AUTHORIZED');}
  if(Object.keys(m).some(k=>!allowed.includes(k))||!['artifact_digest','gateway_digest','config_digest','catalog_digest'].every(k=>/^[a-f0-9]{64}$/.test(m[k]))||typeof m.approval_reference!=='string'||m.approval_reference.length<8||m.approval_reference.length>200||typeof m.merchant_account!=='string'||!m.merchant_account||issuer.protocol!=='https:'||issuer.username||issuer.password||issuer.search||issuer.hash||m.schema_version!==1||m.environment!=='production'||m.gateway_digest!==expectedGateway||m.config_digest!==expectedConfig||!Number.isFinite(issued)||!Number.isFinite(expires)||issued>Date.now()+60000||expires<=Date.now()||expires>issued+86400000||!m.gates||Object.keys(m.gates).length!==26)throw Error('PAYMENT_RELEASE_NOT_AUTHORIZED');
  for(let i=1;i<=26;i++){const gate=m.gates['G'+String(i).padStart(2,'0')];if(gate?.status!=='PASS'||typeof gate.evidence!=='string'||gate.evidence.length<8||gate.evidence.length>1000)throw Error('PAYMENT_RELEASE_NOT_AUTHORIZED');}
  return new ProductionPermit(expires);
 }
}
export function gatewayDigest(root:string){const paths=['server.ts','package-lock.json'];const collect=(dir:string)=>{for(const entry of readdirSync(join(root,dir),{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isSymbolicLink())throw Error('PAYMENT_ARTIFACT_INVALID');if(entry.isDirectory())collect(p);else if(entry.isFile())paths.push(p);}};collect('server');collect('dist');const hash=createHash('sha256');for(const path of paths.sort()){hash.update(relative(root,join(root,path))+'\0');hash.update(readFileSync(join(root,path)));hash.update('\0');}return hash.digest('hex');}
export function productionPermitFromEnvironment(configRaw:Buffer){
 // Runtime flags cannot choose another trust key or inject an all-green object.
 const owner=readFileSync(pinnedKeyFile,'utf8').trim();
 return ProductionPermit.verify(readFileSync(process.env.PAYMENT_RELEASE_MANIFEST_FILE||''),Buffer.from(readFileSync(process.env.PAYMENT_RELEASE_SIGNATURE_FILE||'','utf8').trim(),'hex'),owner,gatewayDigest(process.cwd()),digest(configRaw));
}
