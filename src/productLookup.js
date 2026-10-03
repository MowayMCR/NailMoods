import {productKind} from './productKinds.js';
import {getCloudClient} from './cloud/client.js';
import {productURL,shopifyCandidate} from './productImport.js';
import {validHex} from './colorAnalysis.js';
import {normalizeLookupInput,lookupKey,lookupText,identityMatch} from '../supabase/functions/_shared/lookupIdentity.mjs';
export {lookupKey};
const CACHE_KEY='nailmoods-online-products-v1',CACHE_TTL=7*86400000;
export function productLookupInput(report={},item={}) {
 const parsed=report.parsed||{},barcode=[...(report.barcodes||[])].reverse().find(b=>b.barcodeSource==='scanner')||report.barcodes?.at(-1);
 const brand=item.brand||parsed.brand||'',collection=item.collection||parsed.collection||'';
 const reference=item.reference||parsed.references?.[0]||(parsed.shadeCodes?.length===1?parsed.shadeCodes[0]:'')||'';
 let name=item.name||'';
 if(!name&&!barcode&&!reference) {
  const skip=[brand,collection,'nail lacquer','nail polish','vernis','gel polish','smart fast dry','smart','green flash','green','kiko','milano'].filter(Boolean).map(lookupText);
  name=(report.rawText||'').split('\n').map(lookupText).filter(line=>line&&line.length<100&&!/\b(?:ml|oz|batch|lot|made|ingredients|www|http)\b/.test(line)&&!skip.some(v=>v===line)).map(line=>skip.reduce((s,v)=>s.replace(new RegExp('\\b'+v+'\\b','g'),' ').trim(),line)).find(line=>/[a-z]{3}/.test(line)&&!/^\d/.test(line))||'';
 }
 const input=normalizeLookupInput({barcode:barcode||item.rawBarcode||item.barcode,barcodeFormat:item.barcodeFormat,brand,collection,reference,name:item.provenance?.importMethod==='online'?'':name});
 return input;
}
function safeCandidates(data) {
 if(!data||!Array.isArray(data.candidates))return [];
 return data.candidates.slice(0,3).filter(c=>{
  try {productURL(c.source);return c.fields&&typeof c.fields.name==='string'&&Boolean(c.fields.name)&&typeof c.fields.brand==='string';}catch{return false;}
 });
}
export async function searchProductOnline(input,{signal,storage,invoke,refresh=false,online=globalThis.navigator?.onLine!==false,now=Date.now()}={}) {
 signal?.throwIfAborted();
 if(!input.sufficient)return {status:'insufficient',candidates:[],message:'Ajoute le code-barres, le numéro de teinte ou le nom exact pour retrouver la bonne référence.'};
 const key=lookupKey(input);let rows=[];
 try {rows=JSON.parse(storage?.getItem(CACHE_KEY)||'[]');if(!Array.isArray(rows))rows=[];}catch{rows=[];}
 const hit=rows.find(r=>r.at>now-CACHE_TTL&&safeCandidates(r.result).some(c=>r.key===key||identityMatch(c,input)));
 if(hit&&(!refresh||!online)){const candidates=safeCandidates(hit.result).filter(c=>hit.key===key||identityMatch(c,input));return {...hit.result,status:candidates.length===1?'found':'ambiguous',message:candidates.length===1?'Produit trouvé en ligne. Vérifie la référence avant de l’ajouter.':'Plusieurs références possibles. Choisis la bonne gamme et la bonne teinte.',candidates,cached:true,offline:!online};}
 if(!online)return {status:'offline',candidates:[],message:'Tu es hors connexion. Les informations lues sont conservées ; tu peux compléter la fiche.'};
 let call=invoke;
 if(!call) {
  const client=getCloudClient();const session=client?await client.auth.getSession():null;
  signal?.throwIfAborted();
  if(!session?.data?.session)return {status:'auth_required',candidates:[],message:'Connecte-toi pour chercher cette référence en ligne. La saisie manuelle reste disponible.'};
  call=(name,options)=>client.functions.invoke(name,options);
 }
 try {
  const {data,error}=await call('product-lookup',{body:{barcode:input.barcode,brand:input.brand,collection:input.collection,reference:input.reference,name:input.name,refresh},signal,timeout:18000});
  signal?.throwIfAborted();
  if(error)return {status:'unavailable',candidates:[],message:'La recherche Internet est indisponible. Réessaie ou complète la fiche.'};
  const result={...data,candidates:safeCandidates(data)};
  if(result.candidates.length)try{storage?.setItem(CACHE_KEY,JSON.stringify([{key,at:now,result},...rows.filter(r=>r.key!==key&&r.at>now-CACHE_TTL)].slice(0,40)));}catch{/* Cache optional: addition remains available. */}
  return result;
 } catch(e) {if(signal?.aborted)throw e;return {status:'unavailable',candidates:[],message:'La recherche Internet n’a pas pu être terminée. Réessaie ou complète la fiche.'};}
}
export function onlineSelectionPatch(candidate,item={},selected=candidate.fields) {
 const explicit=['manual','photo','scan-confirmed','product_page'].includes(item.colorSource)&&validHex(item.confirmedColor||item.shade||item.color);
 const fields={...selected};const color=validHex(fields.color)?fields.color.toLowerCase():'';
 delete fields.color;delete fields.photo;
 const identity=Object.fromEntries(['brand','collection','reference','sku','name','barcode'].filter(k=>fields[k]).map(k=>[k,fields[k]]));
 return {...fields,productKind:productKind(fields),...(!item.photo&&selected.photo?{photo:selected.photo}:{}),url:candidate.source,
  provenance:{kind:'discovered',verified:false,importMethod:'online',source:candidate.source,provider:candidate.provider,official:Boolean(candidate.official),catalogIdentity:identity,fetchedAt:candidate.fetchedAt},
  importInfo:{method:'online',source:candidate.source,provider:candidate.provider,at:new Date().toISOString()},
  catalogColor:color,catalogColorValidated:Boolean(color&&!explicit),
  ...(!explicit&&color?{color,shade:color,confirmedColor:color,colorSource:'product_page'}:{}),
  ...(!explicit&&!color&&['catalog','product_page'].includes(item.colorSource)?{color:'',shade:'',confirmedColor:'',colorSource:''}:{})};
}
export function onlineVariant(candidate,id) {
 if(candidate.directVariants) {
  const selected=candidate.variants?.findIndex(v=>v.id===id);
  if(selected==null||selected<0||!candidate.directVariants[selected])return candidate;
  const next=candidate.directVariants[selected];
  return {...candidate,...next,method:'online',needsVariant:true,variantId:id,variants:candidate.variants,directVariants:candidate.directVariants};
 }
 const next=shopifyCandidate(candidate.raw,candidate.source,id);
 return {...candidate,...next,method:'online',fields:{...next.fields,...(candidate.fields.collection?{collection:candidate.fields.collection}:{})}};
}
