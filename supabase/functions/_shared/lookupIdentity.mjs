import {canonicalBarcode} from './productCodes.mjs';
export const lookupText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clean=(v,n=120)=>typeof v==='string'?v.replace(/[<>\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n):'';
export function lookupBrand(value) {
 const s=lookupText(value);
 return /^(kiko|kik0)( milano)?$/.test(s)?'KIKO Milano':s==='manucurist'?'Manucurist':s==='canni'?'CANNI':/^(le mini macaron|le mini macaron europe|camelia beauty)$/.test(s)?'Le Mini Macaron':s==='opi'?'OPI':clean(value,80);
}
export function normalizeLookupInput(raw={}) {
 const observation=raw.barcode && typeof raw.barcode==='object'?raw.barcode:{rawBarcode:raw.barcode||raw.rawBarcode,barcodeFormat:raw.barcodeFormat};
 const canonical=canonicalBarcode(observation.rawBarcode,observation.barcodeFormat);
 let barcode=canonical?canonical.startsWith('00')?canonical.slice(2):canonical.startsWith('0')?canonical.slice(1):canonical:'';
 if(canonical && !['UPC_E','UPC-E'].includes(observation.barcodeFormat) && /^\d{8}$/.test(String(observation.rawBarcode)))barcode=String(observation.rawBarcode);
 const input={barcode,canonicalBarcode:canonical,brand:lookupBrand(raw.brand),collection:clean(raw.collection,100),reference:clean(raw.reference,80),name:clean(raw.name)};
 return {...input,sufficient:Boolean(canonical || input.brand && (input.reference || lookupText(input.name).replace(/\b(nail|polish|lacquer|vernis|gel|color|colour|smart|fast|dry|green|flash)\b/g,'').trim().length>=3))};
}
export function lookupKey(input){return JSON.stringify([input.canonicalBarcode,lookupText(input.brand),lookupText(input.collection),lookupText(input.reference),lookupText(input.name)]);}

const contains=(text,part)=>Boolean(part&&(' '+lookupText(text)+' ').includes(' '+lookupText(part)+' '));
const range=value=>lookupText(value).replace(/greenflash/g,'green flash').replace(/\bnew power pro\b/g,'power pro').replace(/\b(?:fast|dry|nail|lacquer|polish|vernis)\b/g,'').replace(/\s+/g,' ').trim();
const short=value=>/^\d{1,4}$/.test(String(value))?String(Number(value)):lookupText(value);
export {contains as lookupContains,range as lookupRange,short as lookupShortCode};
export function identityMatch(candidate,input) {
 const f=candidate.fields||{};
 if(input.brand && f.brand && lookupBrand(f.brand)!==input.brand)return null;
 const barcodes=[f.barcode,...(candidate.barcodeAliases||[])].map(v=>canonicalBarcode(v)).filter(Boolean);
 const barcode=barcodes.find(b=>b===input.canonicalBarcode)||barcodes[0];
 if(input.canonicalBarcode && barcode && barcode!==input.canonicalBarcode)return null;
 if(input.collection && (!f.collection || range(input.collection)!==range(f.collection)))return null;
 if(input.canonicalBarcode && barcode===input.canonicalBarcode)return {score:100,reason:'Même code-barres'};
 const ref=input.reference&&[f.reference,f.sku,f.shadeCode,f.shadeName,...lookupText(f.name).split(' ')].some(v=>short(v)===short(input.reference));
 const name=input.name && contains(f.name+' '+(f.shadeName||''),input.name);
 if(input.reference&&!ref)return null;
 if(input.name&&!name)return null;
 if(input.brand&&(ref||name))return {score:ref?92:88,reason:ref?'Marque, gamme et référence à vérifier':'Marque et nom à vérifier'};
 return null;
}
