import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMParser} from 'linkedom';
import {canonicalBarcode} from '../src/productIdentity.js';
import {extractProductPage,safePage} from '../supabase/functions/_shared/productPageCore.mjs';
import {normalizeLookupInput,lookupProduct,identityMatch,shopCandidates,beautyCandidate} from '../supabase/functions/_shared/productLookupCore.mjs';
import {productLookupInput,searchProductOnline,onlineSelectionPatch,onlineVariant} from '../src/productLookup.js';
import {mergeScannedProducts} from '../src/collection.js';
const parse=s=>new DOMParser().parseFromString(s,'text/html');
const mint={title:'Mint',vendor:'Manucurist',type:'Vernis',images:[],variants:[{id:42,title:'Default Title',sku:'GF-MINT',barcode:'3760297541507'}]};
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
const context=transport=>({resolve:async()=>['1.1.1.1'],transport,signal:new AbortController().signal});
test('online GS1 normalization preserves initial zeros, validates checksums and expands UPC-E exactly like the reader',()=>{
 for(const [code,format] of [['8025272911573','EAN_13'],['042100005264','UPC_A'],['04252614','UPC_E'],['96385074','EAN_8']])assert.equal(normalizeLookupInput({barcode:{rawBarcode:code,barcodeFormat:format}}).canonicalBarcode,canonicalBarcode(code,format));
 assert.equal(normalizeLookupInput({barcode:'8025272911574'}).sufficient,false);
 assert.equal(normalizeLookupInput({brand:'KIKO',collection:'Smart'}).sufficient,false);
});
test('lookup request contains identity facts only, not original photo, full OCR or packaging quantity',()=>{
 const a=productLookupInput({parsed:{brand:'KIKO Milano',collection:'Smart',shadeCodes:[]},rawText:'KIKO MILANO\nSMART\nNAIL LACQUER\n7 ml'},{});
 assert.equal(a.sufficient,false);assert.equal(a.name,'');assert.equal('rawText' in a,false);assert.equal('photo' in a,false);
 const b=productLookupInput({parsed:{brand:'KIKO Milano',shadeCodes:['155']},barcodes:[]},{});assert.equal(b.reference,'155');assert.equal(b.sufficient,true);
});
test('same brand but wrong range, shade, brand or decoded barcode can never be presented as the right product',()=>{
 const candidate={fields:{name:'Mint',brand:'Manucurist',collection:'Green Flash',barcode:'3760297541507'}};
 assert.equal(identityMatch(candidate,normalizeLookupInput({brand:'Manucurist',collection:'Green',name:'Mint'})),null);
 assert.equal(identityMatch(candidate,normalizeLookupInput({brand:'KIKO',name:'Mint'})),null);
 assert.equal(identityMatch(candidate,normalizeLookupInput({brand:'Manucurist',reference:'12'})),null);
 assert.equal(identityMatch(candidate,normalizeLookupInput({barcode:'8025272911573'})),null);
 assert.equal(identityMatch(candidate,normalizeLookupInput({brand:'Manucurist',collection:'Green Flash',name:'Mint'})).score,88);
});
test('official online Shopify search resolves the product page, separates Green and Green Flash and never trusts a search snippet',async()=>{
 const seen=[];
 const ctx=context(async url=>{
  seen.push(url.href);if(url.pathname==='/search/suggest.json')return json({resources:{results:{products:[{url:'/products/vernis-green-mint'},{url:'/products/vernis-green-flash-mint'}]}}});
  return json(mint);
 });
 const r=await lookupProduct({brand:'Manucurist',collection:'Green Flash',name:'Mint'},ctx,parse);
 assert.equal(r.status,'found');assert.equal(r.candidates.length,1);assert.match(r.candidates[0].source,/green-flash-mint/);assert.equal(r.candidates[0].fields.collection,'Green Flash');assert.equal('color' in r.candidates[0].fields,false);assert.equal(seen.length,3);
});
test('untrusted search URL and redirects cannot escape an official provider to private addresses or another host',async()=>{
 const seen=[];
 const r=await lookupProduct({brand:'Manucurist',name:'Mint'},context(async url=>{seen.push(url.href);return json({resources:{results:{products:[{url:'http://127.0.0.1/private'},{url:'https://evil.example/products/mint'}]}}});}),parse);
 assert.equal(r.status,'unavailable');assert.equal(seen.length,1);
 await assert.rejects(safePage('https://www.manucurist.com/products/x',{...context(async()=>new Response(null,{status:302,headers:{location:'https://other.example/products/x'}})),allowedHosts:['www.manucurist.com']}),/HOST_BLOCKED/);
});
test('multi-shade Shopify page selects only a matching explicit variant, including its exact code and SKU',()=>{
 const raw={title:'Color Gel',variants:[{id:1,title:'181',sku:'181',barcode:'8025272911573'},{id:2,title:'182',sku:'182',barcode:'3760297541507'}]};
 const candidates=shopCandidates(raw,'https://www.canni.com/products/color',normalizeLookupInput({brand:'CANNI',reference:'182'}),'CANNI');
 assert.equal(candidates.length,1);assert.match(candidates[0].source,/variant=2/);assert.equal(candidates[0].fields.barcode,'3760297541507');assert.equal(candidates[0].variantId,'2');
 const unresolved=shopCandidates(raw,'https://www.canni.com/products/color',normalizeLookupInput({brand:'CANNI',name:'Color Gel'}),'CANNI')[0];assert.equal(unresolved.needsVariant,true);assert.equal(unresolved.fields.barcode,undefined);
 const chosen=onlineVariant({...unresolved,method:'online',provider:'Site officiel CANNI',official:true},'2');assert.equal(chosen.method,'online');assert.equal(chosen.official,true);assert.equal(chosen.fields.barcode,'3760297541507');assert.equal(chosen.variantId,'2');
});
test('a genuine upstream HTTP 404 means barcode absent, while blocked/network responses remain unavailable',async()=>{
 const missing=await lookupProduct({barcode:'1234567890128'},context(async()=>new Response('{}',{status:404,headers:{'content-type':'application/json'}})),parse);assert.equal(missing.status,'not_found');
 const blocked=await lookupProduct({barcode:'1234567890128'},context(async()=>new Response('blocked',{status:403,headers:{'content-type':'text/html'}})),parse);assert.equal(blocked.status,'unavailable');
});
test('KIKO selected official page supplies its shade and explicit HEX without taking an adjacent shade',()=>{
 const selected={slug:'smart-nail-lacquer-153',shade_number:'153',shade_name:'Muget Green',hex_color:'9AA180',barcodes:['8025272978705'],backend_id:'KM000000203153B'};
 const html='<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{root:{display_value:'Smart Nail Lacquer'},selected}}})+'</script>';
 const r=extractProductPage(html,'https://www.kikocosmetics.com/fr-fr/p/smart-nail-lacquer-153-7411/',parse);
 assert.equal(r.status,'found');assert.equal(r.candidate.fields.color,'#9aa180');assert.equal(r.candidate.fields.reference,'153');
 assert.equal(extractProductPage(html,'https://www.kikocosmetics.com/fr-fr/p/smart-nail-lacquer-30-7426/',parse).status,'manual');
 delete selected.hex_color;const noHex=extractProductPage('<script id="__NEXT_DATA__">'+JSON.stringify({props:{pageProps:{root:{display_value:'Smart Nail Lacquer'},selected}}})+'</script>','https://www.kikocosmetics.com/fr-fr/p/smart-nail-lacquer-153-7411/',parse);
 assert.equal('color' in noHex.candidate.fields,false);
});
test('community barcode facts require an exact GTIN, source attribution and never provide a guessed RGB',()=>{
 const input=normalizeLookupInput({barcode:'8025272911573'}),raw={status:1,code:'8025272911573',product:{product_name:'Smart',brands:'KIKO',image_front_url:'https://images.openbeautyfacts.org/x.jpg'}};
 const c=beautyCandidate(raw,'https://world.openbeautyfacts.org/product/8025272911573',input);
 assert.match(c.attribution,/Open Beauty Facts/);assert.equal('color' in c.fields,false);assert.equal(c.fields.brand,'KIKO Milano');assert.equal(beautyCandidate({...raw,code:'3760297541507'},c.source,input),null);
});
test('unknown barcode, insufficient identity, unsupported text brand and upstream failure have distinct nonblocking statuses',async()=>{
 const absent=await lookupProduct({barcode:'8025272911573'},context(async()=>json({status:0})),parse);assert.equal(absent.status,'not_found');
 const insufficient=await lookupProduct({brand:'KIKO'},context(()=>{throw Error('must not call');}),parse);assert.equal(insufficient.status,'insufficient');
 const unsupported=await lookupProduct({brand:'Other brand',reference:'181'},context(()=>{throw Error('must not call');}),parse);assert.equal(unsupported.status,'unsupported');
 const unavailable=await lookupProduct({barcode:'8025272911573'},context(()=>{throw Error('network');}),parse);assert.equal(unavailable.status,'unavailable');
});
test('online selection preserves an explicit manual color and records source/identity; missing RGB clears an old automatic catalog color',()=>{
 const c={fields:{brand:'KIKO Milano',name:'Muget Green',reference:'153',color:'#9aa180'},source:'https://www.kikocosmetics.com/fr-fr/p/smart-nail-lacquer-153-7411/',provider:'Site officiel KIKO',official:true};
 const auto=onlineSelectionPatch(c,{color:'#b5a088',colorSource:'photo-estimated'});assert.equal(auto.color,'#9aa180');assert.equal(auto.provenance.importMethod,'online');assert.equal(auto.provenance.verified,false);
 const manual=onlineSelectionPatch(c,{color:'#cc0099',shade:'#cc0099',colorSource:'manual'});assert.equal(manual.color,undefined);assert.equal(manual.catalogColorValidated,false);
 const missing=onlineSelectionPatch({...c,fields:{brand:'KIKO Milano',name:'Muget Green'}},{color:'#002c76',colorSource:'catalog'});assert.equal(missing.color,'');
});
test('successful server lookup is cached per supplied account storage and available offline without another request',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};let calls=0;
 const input=normalizeLookupInput({brand:'Manucurist',name:'Mint'}),candidate={fields:{name:'Mint',brand:'Manucurist',collection:'Green',barcode:'3662263330699'},source:'https://www.manucurist.com/products/vernis-green-mint',images:[],variants:[]};
 const invoke=async(name,options)=>{calls++;assert.equal(name,'product-lookup');assert.equal('photo' in options.body,false);return {data:{status:'found',candidates:[candidate]}};};
 const first=await searchProductOnline(input,{storage,invoke,now:1000});assert.equal(first.status,'found');
 const second=await searchProductOnline(input,{storage,invoke,online:false,now:2000});assert.equal(second.offline,true);assert.equal(calls,1);
 const enriched=await searchProductOnline(normalizeLookupInput({brand:'Manucurist',collection:'Green',barcode:'3662263330699'}),{storage,invoke,online:false,now:2000});assert.equal(enriched.offline,true);assert.equal(calls,1);
 const other=await searchProductOnline(input,{storage:{getItem:()=>null},invoke,online:false,now:2000});assert.equal(other.status,'offline');
 const expired=await searchProductOnline(input,{storage,invoke,online:false,now:8*86400000});assert.equal(expired.status,'offline');
});
test('cancelled or failed online request never replaces a later draft or blocks the manual fallback',async()=>{
 const controller=new AbortController(),input=normalizeLookupInput({brand:'Manucurist',name:'Mint'});
 await assert.rejects(searchProductOnline(input,{signal:controller.signal,invoke:async()=>{controller.abort();return {data:{status:'found',candidates:[]}};}}),/abort/i);
 const r=await searchProductOnline(input,{invoke:async()=>{throw Error('timeout');}});assert.equal(r.status,'unavailable');
});
test('online and bundled catalogue naming aliases of one GTIN do not create a second collection record',()=>{
 const existing={id:'local',brand:'KIKO Milano',name:'Muget Green',reference:'153',collection:'Smart Fast Dry Nail Lacquer',gtin:'08025272978705',color:'#cc0099'};
 const online={id:'new',brand:'KIKO Milano',name:'Muget Green',reference:'153',collection:'Smart Nail Lacquer',barcode:'8025272978705',color:'#9aa180'};
 const list=[existing];assert.equal(mergeScannedProducts(list,[online]),list);assert.equal(list[0].color,'#cc0099');
 assert.equal(mergeScannedProducts(list,[{...online,barcode:'3760297540302',collection:'Power Pro'}]).length,2);
});
