import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogCandidate,catalogSelectionPatch,matchCatalog} from '../src/catalog.js';
import {barcodeObservation,canonicalBarcode,mergeRecognitionEvidence} from '../src/productIdentity.js';
import {recognizeEvidence,proposedCatalogMatch,readIdentityPatch} from '../src/recognitionReport.js';
import {confirmedScanProduct,generateScannedIdeas} from '../src/scanGenerate.js';
import {mergeScannedProducts} from '../src/collection.js';
import {productColor} from '../src/colorAnalysis.js';
const read=file=>JSON.parse(fs.readFileSync(new URL('../public/'+file,import.meta.url)));
const smart=read('catalog-kiko-smart.json'),products=[...read('catalog-v2.json').products,...smart.products];
const cobalt=smart.products.find(p=>p.reference==='30');
test('real official KIKO Smart records: identities, codes and colors have source evidence',()=>{
 assert.equal(smart.count,smart.products.length);assert.equal(new Set(smart.products.map(p=>p.catalogId)).size,smart.count);
 assert.ok(smart.count>=60);
 for(const p of smart.products){
  assert.match(p.url,/^https:\/\/www\.kikocosmetics\.com\/fr-fr\/p\/smart-nail-lacquer-/);
  assert.equal(p.collection,'Smart Fast Dry Nail Lacquer');
  for(const b of p.barcodeAliases){assert.ok(canonicalBarcode(b));assert.equal(matchCatalog(products,'',{barcodes:[barcodeObservation(b,'EAN_13','scanner')]})[0].product.catalogId,p.catalogId);}
  if(p.colorValidated){assert.match(p.catalogColor,/^#[a-f0-9]{6}$/);assert.equal(p.colorEvidence.field,'selected.hex_color');assert.equal(p.colorEvidence.source,p.url);}
 }
 assert.equal(cobalt.name,'Cobalt');assert.equal(cobalt.catalogColor,'#002c76');assert.ok(cobalt.barcodeAliases.includes('8025272911573'));
});
test('front label reads the range without inventing a shade or treating OCR as a missing product',()=>{
 const r=recognizeEvidence(products,{rawText:'KIKO MILANO\nSMART\nFAST DRY\nNAIL LACQUER\n7 ml',barcodeAttempted:true});
 assert.equal(r.matches.length,0);assert.equal(r.title,'Référence à préciser');assert.equal(r.failure,'insufficient_identity');assert.match(r.message,/numéro de teinte/);
 assert.equal(r.parsed.collection,cobalt.collection);assert.equal(readIdentityPatch(r).collection,cobalt.collection);assert.equal(readIdentityPatch(r).reference,undefined);
});
test('two label views resolve Smart 30, never Power Pro 30, even with a shared shade number',()=>{
 const r=recognizeEvidence(products,mergeRecognitionEvidence({rawText:'KIKO\nSMART FAST DRY NAIL LACQUER'},{rawText:'30\n7 ml',barcodeAttempted:true}));
 assert.equal(r.matches[0].product.catalogId,cobalt.catalogId);assert.equal(proposedCatalogMatch(r).product.catalogId,cobalt.catalogId);
 assert.equal(matchCatalog(products,'KIKO Smart Nail Lacquer 30')[0].product.catalogId,cobalt.catalogId);
 assert.ok(!matchCatalog(products,'KIKO Power Pro Nail Lacquer 30').some(m=>m.product.catalogId===cobalt.catalogId));
});
test('known code → prefilled identity → official color replaces background → confirmed collection persists',()=>{
 const r=recognizeEvidence(products,{barcodes:[barcodeObservation('8025272911573','EAN_13','scanner')],barcodeAttempted:true});
 const candidate=catalogCandidate(proposedCatalogMatch(r));
 const draft={photo:'local-photo',color:'#b5a088',colorSource:'photo-estimated'};
 const patch=catalogSelectionPatch(candidate,draft),confirmed=confirmedScanProduct({...draft,...readIdentityPatch(r),...patch},'scan-real-code');
 assert.equal(confirmed.name,'Cobalt');assert.equal(confirmed.reference,'30');assert.equal(confirmed.collection,cobalt.collection);assert.equal(confirmed.rawBarcode,'8025272911573');
 assert.equal(confirmed.catalogColorValidated,true);assert.equal(confirmed.color,'#002c76');
 const collection=mergeScannedProducts([], [confirmed]), restored=JSON.parse(JSON.stringify(collection));
 assert.equal(productColor(restored[0]),'#002c76');assert.ok(generateScannedIdeas(restored).every(i=>i.palette.every(p=>p.unpainted||productColor(p)==='#002c76')));
 assert.equal(mergeScannedProducts(collection,[confirmed]),collection);
});
test('manual color and photo pipette stay ahead of catalog, including a second label read',()=>{
 const c=catalogCandidate(matchCatalog(products,'KIKO Smart 30')[0]);
 for(const source of ['manual','photo','scan-confirmed']){
  const item={color:'#245689',confirmedColor:'#245689',colorSource:source};const p={...item,...catalogSelectionPatch(c,item)};
  assert.equal(p.catalogColorValidated,false);assert.equal(productColor(p),'#245689');
 }
});
test('missing official color, ambiguous OCR and unknown codes never create exact color or identity',()=>{
 const missing=smart.products.find(p=>!p.colorValidated);assert.ok(missing);
 assert.equal(catalogCandidate(matchCatalog(products,'KIKO Smart '+missing.reference)[0]).fields.catalogColor,undefined);
 const partial=recognizeEvidence(products,{rawText:'KIKO\n18'});assert.equal(proposedCatalogMatch(partial),null);assert.ok(partial.matches.length>1);
 const unknown=recognizeEvidence(products,{barcodes:[barcodeObservation('4006381333931','EAN_13','scanner')],barcodeAttempted:true});
 assert.equal(unknown.title,'Ce produit n’est pas encore dans NailMoods');assert.equal(unknown.matches.length,0);
 assert.equal(mergeScannedProducts([{id:'other-range',brand:'KIKO Milano',collection:'Power Pro Nail Lacquer',reference:'30',name:'other',type:'Vernis'}],[{...cobalt,id:'smart'}]).length,2);
});
