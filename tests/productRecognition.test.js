import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { matchCatalog, catalogCandidate } from '../src/catalog.js';
import { canonicalBarcode, barcodeObservation, parseProductText, mergeRecognitionEvidence, recognitionPresentation } from '../src/productIdentity.js';
import { recognizeEvidence, recognitionPatch, diagnosticText, pendingBarcodeReport, interruptedRecognition } from '../src/recognitionReport.js';
import { confirmedScanProduct, generateScannedIdeas } from '../src/scanGenerate.js';
const catalogue=JSON.parse(fs.readFileSync(new URL('../public/catalog-v1.json',import.meta.url),'utf8')).products;
// Synthetic checksummed identifiers ONLY in test fixtures; never attributed to KIKO or written to the catalogue.
const testGtin=body=>{let sum=0;for(let i=body.length-1,w=3;i>=0;i--,w=w===3?1:3)sum+=Number(body[i])*w;return body+((10-sum%10)%10);};
const known=testGtin('000000000001'),unknown=testGtin('000000000002');
const fixture={catalogId:'fixture',brand:'Marque de test',collection:'Gamme de test',name:'Nuance de test',reference:'REF-ABC',sku:'SKU-TEST',ean13:known,shadeCode:'239',type:'Vernis'};
test('1. known EAN / padded GTIN / optional barcode alias return the exact identity first',()=>{
 const other={...fixture,catalogId:'other',ean13:'',reference:known};
 const rows=matchCatalog([other,fixture],known,{rawBarcode:known});assert.equal(rows[0].product.catalogId,'fixture');assert.equal(rows[0].evidence.barcode,100);
 assert.equal(matchCatalog([fixture],known.padStart(14,'0'))[0].product.catalogId,'fixture');
 assert.ok(matchCatalog([{...fixture,ean13:'',barcodeAliases:[known]}],known).length);
 assert.equal(catalogCandidate(rows[0]).fields.ean13,known);
});
test('2. unknown EAN with known SKU still finds the product and preserves the raw code',()=>{
 const report=recognizeEvidence([fixture],{rawText:'Marque de test\nSKU-TEST',barcodes:[barcodeObservation(unknown,'EAN_13','scanner')]});
 assert.equal(report.matches[0].product.catalogId,'fixture');assert.equal(report.matches[0].evidence.barcode,null);assert.equal(report.matches[0].evidence.reference,88);
 assert.equal(recognitionPatch(report).rawBarcode,unknown);assert.equal(recognitionPatch(report).barcodeFormat,'EAN_13');assert.equal(recognitionPatch(report).barcodeConfidence,null);
 const sku=recognizeEvidence([fixture],{barcodes:[barcodeObservation('SKU-TEST','CODE_128','scanner')]});assert.equal(sku.matches[0].product.catalogId,'fixture');
 const interrupted=interruptedRecognition(pendingBarcodeReport({},barcodeObservation(unknown,'EAN_13','scanner')));assert.equal(interrupted.failure,'recognition_interrupted');assert.equal(recognitionPatch(interrupted).rawBarcode,unknown);
});
test('3. shade number and brand work without any EAN, including short KIKO and leading zero',()=>{
 assert.equal(matchCatalog(catalogue,'KIKO 239')[0].product.name,'Minty Frost');
 assert.equal(matchCatalog(catalogue,'KIKO\nPOWER PRO\n01',{ocr:true})[0].product.name,'Transparent');
 assert.equal(matchCatalog(catalogue,'KIKO\nPOWER PRO\n1',{ocr:true})[0].product.name,'Transparent');
 const hit=matchCatalog([{...fixture,ean13:'',shadeCodeAliases:['0240']}],'Marque de test\nTeinte 240',{ocr:true})[0];assert.equal(hit.evidence.shadeCode,88);
});
test('4. decoded unknown barcode differs from unread and keeps a nonblocking color fallback',()=>{
 const report=recognizeEvidence(catalogue,{rawText:'',barcodes:[barcodeObservation(unknown,'EAN_13','scanner')],barcodeAttempted:true},{hasColor:true});
 assert.equal(report.title,'Code-barres lu');assert.equal(report.barcodeState,'read_unknown');assert.equal(report.failure,'barcode_not_in_catalogue');assert.match(report.message,/couleur estimée reste utilisable/);assert.equal(report.matches.length,0);
 const unread=recognizeEvidence(catalogue,{barcodeAttempted:true,barcodeError:'BARCODE_UNREAD'});assert.equal(unread.title,'Code-barres non lu');
 assert.notEqual(report.message,unread.message);
});
test('5. partial KIKO OCR focuses on shade and ignores packaging text',()=>{
 const text='KIKO\nMILANO\nPOWER PRO\nNAIL LACQUER\n239\n11 ml 0.37 fl.oz\n12M\nINGREDIENTS: ETHYL ACETATE\nMADE IN FRANCE';
 const parsed=parseProductText(text,catalogue);assert.deepEqual(parsed.shadeCodes,['239']);assert.equal(parsed.brand,'KIKO Milano');assert.equal(parsed.collection,'Power Pro Nail Lacquer');
 const rows=matchCatalog(catalogue,text,{ocr:true});assert.equal(rows[0].product.name,'Minty Frost');assert.ok(rows[0].score<=88);assert.equal(rows[0].evidence.color,null);
 assert.equal(matchCatalog(catalogue,'KIK0\n239',{ocr:true})[0].product.name,'Minty Frost');
});
test('6. no identification still permits inspiration with the confirmed photo color',()=>{
 const report=recognizeEvidence(catalogue,{rawText:'texte illisible',barcodeAttempted:true},{hasColor:true});assert.equal(report.matches.length,0);
 const product=confirmedScanProduct({...recognitionPatch(report),color:'#356a59',name:'Ma couleur'},'personal');assert.ok(generateScannedIdeas([product]).length>=2);assert.equal(product.provenance.kind,'personal');
});
test('7. similar color never produces an exact identification or color confidence',()=>{
 assert.deepEqual(matchCatalog([{...fixture,color:'#356a59'}],'#356a59'),[]);
 const report=recognizeEvidence([{...fixture,color:'#356a59'}],{rawText:'',color:'#356a59'},{hasColor:true});assert.equal(report.matches.length,0);
});
test('ambiguous shade across ranges, noisy OCR, wrong numbers and units never become strong positives',()=>{
 const products=[{...fixture,reference:'239',ean13:'',collection:'Range A'},{...fixture,catalogId:'b',reference:'239',ean13:'',collection:'Range B'}];
 const hits=matchCatalog(products,'Marque de test 239');assert.equal(hits.length,2);assert.ok(hits.every(x=>x.confidence==='moyenne'));
 for(const raw of ['KIKO\n11 ml\n12M','KIKO 12 ml','KIKO\nLOT 239','KIKO 9999'])assert.deepEqual(matchCatalog(catalogue,raw,{ocr:true}),[],raw);
 assert.deepEqual(matchCatalog(catalogue,'KIKO 9999 Minty Frost'),[]);
 assert.ok(!matchCatalog(catalogue,'239').some(m=>m.confidence==='élevée'));
 assert.ok(matchCatalog([fixture],'Autre marque',{brand:'Autre marque',rawBarcode:known}).every(m=>m.confidence!=='élevée'));
});
test('two views retain raw evidence and unknown barcode, without mutating global data',()=>{
 const before=JSON.stringify(catalogue);
 const first={rawText:'KIKO\nPOWER PRO',barcodes:[barcodeObservation(unknown,'EAN_13','scanner')]};
 const second={rawText:'239\n11 ml',barcodes:[],barcodeAttempted:true};
 const report=recognizeEvidence(catalogue,mergeRecognitionEvidence(first,second),{hasColor:true});
 assert.equal(report.matches[0].product.name,'Minty Frost');assert.equal(report.barcodes[0].rawBarcode,unknown);assert.equal(recognitionPatch(report).rawBarcode,unknown);assert.match(diagnosticText(report),/239/);assert.match(diagnosticText(report),/EAN_13/);assert.equal(JSON.stringify(catalogue),before);
});
test('legacy 1801 references stay usable and optional aliases do not require a migration',()=>{
 assert.equal(catalogue.length,1801);assert.ok(matchCatalog(catalogue,'CANNI 9058').length);assert.ok(matchCatalog([{...fixture,skuAliases:['ALIAS-42']}],'ALIAS-42').length);
 assert.equal(canonicalBarcode('1234567890123'),'');assert.equal(canonicalBarcode('  '+known+' '),known.padStart(14,'0'));
 const parsed=parseProductText('KIKO\n'+unknown,catalogue);assert.deepEqual(parsed.shadeCodes,[]);
 assert.equal(recognitionPresentation({barcodes:[barcodeObservation(unknown,'OCR_DIGITS','ocr')]}).title,'Code-barres relevé');
 const report=recognizeEvidence([],{barcodes:[barcodeObservation(unknown,'EAN_13','scanner')]},{catalogAvailable:false,hasColor:true});assert.equal(report.failure,'catalogue_unavailable');assert.equal(recognitionPatch(report).rawBarcode,unknown);
});

test('real KIKO diagnostic: decoded EAN and noisy - 1 must not propose Power Pro Transparent',()=>{
 const rawOCR=["| SEE\n\ny\n\nsata\n\nIl\n\nTIE\n\nae\n\noN\n\nPl\n\n' §","ss\n\n=\n\n|\n\n|\n\n‘\n\n]\n\nm\n\nI Is\n\nvu (On ee\n\n:\n\nKIKO\n\n|\n\nMay 366\n\nBh\n\n1011\n\nGate\n\nREGENT STREET, LONDON WA 340 (UK)\n\nMADE IN FRANCE-FABRIQUÉ EN FRANCE\n\na ”\n\n- 1\n\nw"];
 const report=recognizeEvidence(catalogue,{rawText:rawOCR.join('\n'),ocrViews:rawOCR.map(text=>({text})),barcodes:[barcodeObservation('8059385036113','EAN_13','scanner')],barcodeAttempted:true},{hasColor:true});
 assert.deepEqual(report.matches,[]);assert.equal(report.barcodeState,'read_unknown');assert.equal(recognitionPatch(report).rawBarcode,'8059385036113');assert.ok(!report.parsed.shadeCodes.includes('1'));assert.ok(report.parsed.ignoredNumbers.some(n=>n.value==='1'));
 assert.match(report.message,/couleur/);
});
test('OCR single digits need context; punctuation is not erased into a shade reference',()=>{
 for(const text of ['KIKO\n- 1','KIKO\n1','KIKO\n|\n- 1','KIKO\nPOWER PRO\n- 1'])assert.deepEqual(matchCatalog(catalogue,text,{ocr:true}),[],text);
 assert.equal(matchCatalog(catalogue,'KIKO\nPOWER PRO\n1',{ocr:true})[0].product.reference,'01');
 assert.equal(matchCatalog(catalogue,'KIKO\nTeinte 1',{ocr:true})[0].product.reference,'01');
 assert.equal(matchCatalog(catalogue,'KIKO 1')[0].product.reference,'01');
});
test('a visible Smart range absent from the catalogue never becomes Power Pro',()=>{
 const text='SMART\nFAST DRY\nNAIL LACQUER\nKIKO MILANO\n024\n366';
 const report=recognizeEvidence(catalogue,{rawText:text,barcodes:[barcodeObservation('8059385036113','EAN_13','scanner')]},{hasColor:true});
 assert.equal(report.parsed.collection,'Smart Fast Dry Nail Lacquer');assert.deepEqual(report.matches,[]);
 assert.deepEqual(matchCatalog(catalogue,'KIKO SMART FAST DRY 01'),[]);
});
