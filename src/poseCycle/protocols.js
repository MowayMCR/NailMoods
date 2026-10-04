import {MANUFACTURER_PROTOCOLS} from './protocols/registry.js';
const text=v=>typeof v==='string'&&v.trim().length>0;
export function validManufacturerProtocol(p){
 if(!p||p.version!==1||!['curing','removal'].includes(p.kind)||![p.id,p.brand,p.range,p.productType,p.reference,p.title,p.verifiedOn].every(text))return false;
 try{const u=new URL(p.sourceUrl);if(u.protocol!=='https:'||u.username||u.password)return false;}catch{return false;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(p.verifiedOn))return false;
 if(p.kind==='curing')return Number.isInteger(p.seconds)&&p.seconds>0&&p.seconds<=3600&&Array.isArray(p.lampModels)&&p.lampModels.length>0&&p.lampModels.every(text)&&text(p.layer);
 return Array.isArray(p.steps)&&p.steps.length>0&&p.steps.length<=30&&p.steps.every(text);
}
const normalize=v=>String(v||'').normalize('NFKC').trim().toLocaleLowerCase('fr-FR');
export function manufacturerProtocols(product,kind,registry=MANUFACTURER_PROTOCOLS){return registry.filter(p=>validManufacturerProtocol(p)&&p.kind===kind&&(p.identity
 ? ['brand','collection','name','type','sku'].every(k=>text(p.identity[k])&&normalize(p.identity[k])===normalize(product?.[k]))
 : [['brand','brand'],['range','range'],['productType','type'],['reference','reference']].every(([a,b])=>normalize(p[a])===normalize(b==='range'?(product?.range||product?.productRange||product?.collection):product?.[b]))));}
export function documentedCuring(product,lampModel,layer,registry=MANUFACTURER_PROTOCOLS){return manufacturerProtocols(product,'curing',registry).filter(p=>p.layer===layer&&p.lampModels.some(l=>normalize(l)===normalize(lampModel)));}
