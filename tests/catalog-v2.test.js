import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canonicalBarcode, barcodeObservation, productBarcodes} from '../src/productIdentity.js';
import {matchCatalog,catalogCandidate} from '../src/catalog.js';
const read = name => JSON.parse(readFileSync(new URL('../public/'+name,import.meta.url)));
const data=read('catalog-v2.json'),products=data.products,mapping=read('catalog-v2-id-map.json').mappings;
test('audited V2 conserves every old ID and excludes uncertain identities from recognition',()=>{
  assert.equal(products.length,2631);assert.equal(data.verifiedBarcodeAssociations,1047);
  assert.equal(mapping.length,1801);assert.equal(new Set(products.map(p=>p.catalogId)).size,2631);
  const mapped=mapping.filter(m=>m.catalogId);
  for(const row of mapped)assert.ok(products.some(p=>p.catalogId===row.catalogId));
  for(const row of mapped.filter(m=>m.state==='Oui'))assert.equal(row.catalogId,row.legacyCatalogId);
  for(const row of mapping.filter(m=>!m.catalogId))assert.ok(!products.some(p=>p.catalogId===row.legacyCatalogId));
  assert.ok(products.every(p=>p.url && p.identityStatus.includes('vérifié')));
});
test('every imported barcode has a valid check digit and returns its audited product',()=>{
  let count=0;
  for(const p of products)for(const variant of p.scanVariants||[]){
    count++;assert.equal(canonicalBarcode(variant.gtin),variant.gtin);
    const barcode=barcodeObservation(variant.rawBarcode,variant.symbology,'scanner');
    assert.equal(canonicalBarcode(barcode.rawBarcode,barcode.barcodeFormat),variant.gtin);
    const result=matchCatalog(products,'',{barcodes:[barcode],rawBarcode:barcode.rawBarcode});
    assert.ok(result.some(r=>r.product.catalogId===p.catalogId),p.name+' '+variant.rawBarcode);
  }
  assert.equal(count,1047);
});
test('OPI UPC-E expands before matching; wrong historic barcode stays unknown',()=>{
  assert.equal(canonicalBarcode('09421215','UPC_E'),'00094100002125');
  const result=matchCatalog(products,'',{barcodes:[barcodeObservation('09421215','UPC_E','scanner')]});
  assert.equal(result[0].product.name,'Bubble Bath');
  assert.equal(matchCatalog(products,'',{rawBarcode:'0009410000212'}).length,0);
});
test('Manucurist scan retains Green and Green Flash as different products',()=>{
  const p=products.find(p=>p.brand==='Manucurist' && p.collection==='Green Flash' && p.name==='Milky Peach');
  const result=matchCatalog(products,'',{rawBarcode:'3662263511142'});
  assert.equal(result[0].product.catalogId,p.catalogId);
  assert.equal(catalogCandidate(result[0]).catalogVersion,data.version);
  assert.equal(p.catalogId,'nm-v1-ade06a9882890902');
});
test('a shared CANNI SKU never identifies one of several shades',()=>{
  const shared=products.find(p=>p.brand==='CANNI' && p.sku && p.skuUnique===false);
  assert.ok(shared);
  const result=matchCatalog(products,shared.sku,{brand:'CANNI'});
  assert.ok(result.every(r=>!r.reason.startsWith('SKU exact')));
});
test('Espresso and Expresso lead to one active reference; saved legacy snapshots stay intact',()=>{
  const a=matchCatalog(products,'Le Mini Macaron Expresso');
  assert.equal(a[0].product.name,'Espresso');
  const old=mapping.find(m=>m.original.brand==='Le Mini Macaron' && m.original.name==='Expresso');
  assert.equal(old.catalogId,a[0].product.catalogId);assert.equal(old.original.name,'Expresso');
  assert.ok(productBarcodes(a[0].product).length);
});
