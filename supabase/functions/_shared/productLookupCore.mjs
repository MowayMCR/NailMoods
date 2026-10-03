import {safePage,publicURL,analyzeProductURL,extractShopify} from './productPageCore.mjs';
import {canonicalBarcode} from './productCodes.mjs';
import {normalizeLookupInput,lookupKey,lookupBrand,lookupText,identityMatch,lookupContains as contains,lookupRange as range,lookupShortCode as short} from './lookupIdentity.mjs';
export {identityMatch} from './lookupIdentity.mjs';
export {normalizeLookupInput,lookupKey} from './lookupIdentity.mjs';
const shops=Object.freeze({'Manucurist':'www.manucurist.com','Le Mini Macaron':'leminimacaron.eu','CANNI':'www.canni.com'});
function sourceURL(value,base) {const url=publicURL(new URL(value,base).href);for(const k of [...url.searchParams.keys()])if(k!=='variant')url.searchParams.delete(k);return url.href;}
function resultCandidate(candidate,input,provider,official) {
 const match=identityMatch(candidate,input);if(!match)return null;
 const f=Object.fromEntries(Object.entries(candidate.fields).filter(([k,v])=>['name','brand','collection','reference','sku','shadeName','shadeCode','barcode','photo','type','productKind','finish','effect','color'].includes(k)&&typeof v==='string'&&v.length<=300));
 if(f.color&&!/^#[a-f\d]{6}$/i.test(f.color))delete f.color;
 return {...candidate,fields:f,method:'online',provider,official,...match,confidence:match.score===100?'élevée':'à confirmer',fetchedAt:new Date().toISOString()};
}
export function shopCandidates(raw,source,input,brand) {
 const product={...raw,vendor:brand};
 let variants=raw.variants||[];
 if(input.canonicalBarcode)variants=variants.filter(v=>canonicalBarcode(v.barcode)===input.canonicalBarcode);
 else if(input.reference)variants=variants.filter(v=>short(v.sku)===short(input.reference)||contains(v.title,input.reference)||lookupText(v.title).split(' ').some(v=>short(v)===short(input.reference)));
 // Do not select the first shade from a multi-shade product page.
 const choices=variants.length && (input.canonicalBarcode||input.reference)?variants.slice(0,3):[null];
 return choices.map(v=>{
   const url=new URL(source);if(v)url.searchParams.set('variant',String(v.id));
   const c=extractShopify(product,url.href).candidate;
   if(brand==='Manucurist') {
     const path=url.pathname.toLowerCase();
     if(/green-?flash|greenflash/.test(path))Object.assign(c.fields,{collection:'Green Flash',type:'Semi-permanent'});
     else if(/(?:^|[-/])green(?:-|$)/.test(path))Object.assign(c.fields,{collection:'Green',type:'Vernis'});
   }
   c.raw={title:raw.title,vendor:brand,type:raw.type||raw.product_type,featured_image:raw.featured_image,images:(raw.images||[]).slice(0,8),variants:(raw.variants||[]).slice(0,250).map(v=>({id:v.id,title:v.title,sku:v.sku,barcode:v.barcode,featured_image:v.featured_image}))};
   return c;
 });
}
export function beautyCandidate(raw,source,input) {
 if(raw.status!==1||!raw.product)return null;
 const p=raw.product,code=String(p.code||raw.code||'');
 if(canonicalBarcode(code)!==input.canonicalBarcode)return null;
 const name=String(p.product_name_fr||p.product_name||'').trim().slice(0,200),brand=lookupBrand(p.brands);
 if(!name||!brand)return null;
 let photo='';try{if(p.image_front_url)photo=publicURL(p.image_front_url).href;}catch{}
 // Community facts are explicitly attributed. No RGB is derived from an image/name.
 return {fields:{name,brand,barcode:code,...(photo?{photo}:{})},source,images:photo?[photo]:[],variants:[],needsVariant:false,attribution:'Open Beauty Facts — données contributives, ODbL',license:'https://opendatacommons.org/licenses/odbl/1.0/'};
}
async function shopSearch(input,context,parseDocument) {
 const host=shops[input.brand],base='https://'+host;
 const ctx={...context,allowedHosts:[host]},url=new URL('/search/suggest.json',base);
 url.searchParams.set('q',[input.collection,input.reference,input.name].filter(Boolean).join(' ')||input.barcode);
 url.searchParams.set('resources[type]','product');url.searchParams.set('resources[limit]','4');
 const json=JSON.parse((await safePage(url.href,ctx)).body);
 const products=(json.resources?.results?.products||[]).slice(0,4);
 const settled=await Promise.allSettled(products.map(async p=>{
   const source=sourceURL(p.url,base);if(new URL(source).hostname!==host||!new URL(source).pathname.startsWith('/products/'))throw Error('HOST_BLOCKED');
   const endpoint=new URL(source);endpoint.pathname=endpoint.pathname.replace(/\/$/,'')+'.js';endpoint.search='';
   const raw=JSON.parse((await safePage(endpoint.href,ctx)).body);
   return shopCandidates(raw,source,input,input.brand).map(c=>resultCandidate(c,input,'Site officiel '+input.brand,true)).filter(Boolean);
 }));
 if(products.length && settled.every(r=>r.status==='rejected'))throw Error('PROVIDER_UNAVAILABLE');
 return settled.flatMap(r=>r.status==='fulfilled'?r.value:[]);
}
let kikoConfig;
async function kikoSearch(input,context,parseDocument) {
 const host='www.kikocosmetics.com',ctx={...context,allowedHosts:[host]};
 let config=kikoConfig;
 if(!config||config.expires<Date.now()) {
   const page=await safePage('https://'+host+'/fr-fr/search/',ctx),doc=parseDocument(page.body);
   const props=JSON.parse(doc.querySelector('#__NEXT_DATA__')?.textContent||'{}').props?.pageProps;
   const path=[...doc.querySelectorAll('script[src]')].map(s=>s.getAttribute('src')).find(p=>/^\/_next\/static\/chunks\/pages\/_app-[a-f\d]+\.js$/.test(p||''));
   if(!path||!/^\d+$/.test(String(props?.organizationUnitId)))throw Error('SEARCH_CHANGED');
   const js=await safePage('https://'+host+path,ctx);
   // This is KIKO's public storefront search initializer, never an admin key.
   const keys=js.body.match(/let\s+\w+=\w+\.n\(\w+\)\(\)\("([A-Z\d]{10})","([a-f\d]{32})"\)/);
   if(!keys)throw Error('SEARCH_CHANGED');
   const prefix=props.configuration?.['App:Ecommerce:AlgoliaIndexPrefix']||props.organizationUnitId;
   if(!/^[a-zA-Z\d_-]{1,60}$/.test(String(prefix)))throw Error('SEARCH_CHANGED');
   config={app:keys[1],key:keys[2],index:String(prefix)+'_fr-FR',expires:Date.now()+3600000};kikoConfig=config;
 }
 const endpoint=new URL('https://'+config.app.toLowerCase()+'-dsn.algolia.net/1/indexes/'+config.index);
 endpoint.searchParams.set('x-algolia-application-id',config.app);endpoint.searchParams.set('x-algolia-api-key',config.key);
 endpoint.searchParams.set('query',input.barcode&&!input.reference&&!input.name?input.barcode:[input.collection.replace(/fast dry/gi,''),input.reference,input.name].filter(Boolean).join(' '));endpoint.searchParams.set('hitsPerPage','3');
 const response=JSON.parse((await safePage(endpoint.href,{...context,allowedHosts:[endpoint.hostname]})).body);
 const choices=(response.hits||[]).slice(0,3).filter(h=>/^[a-z\d-]+$/.test(h.slug||'')&&/^\d+$/.test(String(h.objectID)));
 const settled=await Promise.allSettled(choices.map(async h=>{
   const source='https://'+host+'/fr-fr/p/'+h.slug+'-'+h.objectID+'/';
   const r=await analyzeProductURL(source,ctx,parseDocument);
   return r.status==='found'?resultCandidate(r.candidate,input,'Site officiel KIKO',true):null;
 }));
 if(choices.length&&settled.every(r=>r.status==='rejected'))throw Error('PROVIDER_UNAVAILABLE');
 return settled.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]);
}
async function opiSearch(input,context,parseDocument) {
 if(!input.name)return [];
 const slug=lookupText(input.name).replaceAll(' ','-'),host='www.opi.com';
 const requested=range(input.collection);
 const ranges=requested?[requested.replaceAll(' ','-')]:['nail-lacquer','infinite-shine'];
 const settled=await Promise.allSettled(ranges.slice(0,2).map(async r=>{
   // URL discovery attempt only; identity must still be confirmed from the fetched page.
   const url='https://'+host+'/products/'+r+'-'+slug;
   const result=await analyzeProductURL(url,{...context,allowedHosts:[host]},parseDocument);
   if(result.status!=='found')return null;
   result.candidate.fields.collection=r.replaceAll('-',' ');
   return resultCandidate(result.candidate,input,'Site officiel OPI',true);
 }));
 const found=settled.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[]);
 if(!found.length&&settled.some(r=>r.status==='rejected'&&r.reason?.status!==404))throw Error('PROVIDER_UNAVAILABLE');
 return found;
}
export async function lookupProduct(raw,context,parseDocument) {
 const input=normalizeLookupInput(raw),candidates=[],sources=[];
 if(!input.sufficient)return {status:'insufficient',candidates,sources,message:'Ajoute le code-barres, le numéro de teinte ou le nom exact pour retrouver la bonne référence.'};
 const jobs=[];
 if(input.barcode)jobs.push({provider:'Open Beauty Facts',run:async()=>{
   const url='https://world.openbeautyfacts.org/api/v0/product/'+input.barcode+'.json?fields=code,product_name,product_name_fr,brands,image_front_url';
   let page;
   try {page=await safePage(url,{...context,allowedHosts:['world.openbeautyfacts.org'],maxBytes:300000});}catch(e){if(e.status===404)return [];throw e;}
   const p=JSON.parse(page.body);
   const c=beautyCandidate(p,'https://world.openbeautyfacts.org/product/'+input.barcode,input);
   return c?[resultCandidate(c,input,'Open Beauty Facts',false)].filter(Boolean):[];
 }});
 if(Object.hasOwn(shops,input.brand))jobs.push({provider:'Site officiel '+input.brand,run:()=>shopSearch(input,context,parseDocument)});
 if(input.brand==='KIKO Milano')jobs.push({provider:'Site officiel KIKO',run:()=>kikoSearch(input,context,parseDocument)});
 if(input.brand==='OPI' && input.name)jobs.push({provider:'Site officiel OPI',run:()=>opiSearch(input,context,parseDocument)});
 await Promise.all(jobs.map(async job=>{try{const found=await job.run();candidates.push(...found);sources.push({provider:job.provider,status:found.length?'found':'not_found'});}catch{sources.push({provider:job.provider,status:'unavailable'});}}));
 const unique=[...new Map(candidates.filter(Boolean).sort((a,b)=>Number(b.official)-Number(a.official)||b.score-a.score).map(c=>[c.source+'|'+c.fields.barcode+'|'+c.fields.reference,c])).values()].slice(0,3);
 const status=unique.length?unique.length===1?'found':'ambiguous':!jobs.length?'unsupported':sources.some(s=>s.status==='unavailable')?'unavailable':'not_found';
 const message={found:'Produit trouvé en ligne. Vérifie la référence avant de l’ajouter.',ambiguous:'Plusieurs références possibles. Choisis la bonne gamme et la bonne teinte.',unsupported:'Cette marque n’est pas encore couverte par la recherche en ligne. Tu peux ajouter son lien ou compléter la fiche.',unavailable:'La recherche Internet n’a pas pu être terminée. Réessaie ou complète la fiche.',not_found:'Aucune référence fiable trouvée en ligne. Les informations lues restent conservées.'}[status];
 return {status,candidates:unique,sources,message};
}
