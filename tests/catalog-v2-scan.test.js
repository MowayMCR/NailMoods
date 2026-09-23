import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { matchCatalog } from '../src/catalog.js';
import { lookupPublicBarcode } from '../src/productImport.js';

const v1=JSON.parse(fs.readFileSync(new URL('../public/catalog-v1.json',import.meta.url),'utf8'));
const v2=JSON.parse(fs.readFileSync(new URL('../public/catalog-v2.json',import.meta.url),'utf8'));

test('V2 preserves every V1 catalogue id and marks every product scan-flow ready',()=>{
  const ids=new Set(v2.products.map(p=>p.catalogId));
  assert.equal(v1.products.length,1801);
  assert.ok(v1.products.every(p=>ids.has(p.catalogId)));
  assert.equal(v2.scanCoverage?.scanFlowReady,v2.products.length);
  assert.ok(v2.products.every(p=>p.scanFlowReady===true));
});

test('verified OPI UPC/EAN resolves exact local product identity',()=>{
  const checks=[
    ['0009410000549','Tiramisu for Two'],
    ['0009410000212','Bubble Bath'],
    ['0009410000061','Samoan Sand'],
    ['0009410000191','Funny Bunny'],
    ['0009410000374','Passion'],
    ['0009410000252','Dulce de Leche'],
    ['0009410000058','Malaga Wine'],
    ['0009410000938','Lincoln Park After Dark'],
    ['0009410000054','Cajun Shrimp'],
    ['0009410000154',"I'm Not Really a Waitress"],
    ['0009410000530','Russian Navy'],
    ['0009410000704','Black Onyx'],
    ['0009410000519','Gelato on My Mind'],
    ['0008225403179','Miami Beet'],
  ];
  for(const [code,name] of checks){
    const hit=matchCatalog(v2.products,code,{rawBarcode:code})[0];
    assert.ok(hit,code);
    assert.equal(hit.product.brand,'OPI');
    assert.equal(hit.product.name,name);
    assert.equal(hit.evidence.barcode,100);
  }
});

test('verified essie/Sally barcode resolves exact local product identity',()=>{
  const fiji=matchCatalog(v2.products,'0080348000078',{rawBarcode:'0080348000078'})[0];
  assert.equal(fiji.product.brand,'essie'); assert.equal(fiji.product.name,'Fiji');
  const sugar=matchCatalog(v2.products,'0074170451719',{rawBarcode:'0074170451719'})[0];
  assert.equal(sugar.product.brand,'Sally Hansen'); assert.equal(sugar.product.name,'Sugar Fix');
});

test('unknown barcode can use public product facts without fabricating a local match',async()=>{
  const code='0000000000017';
  const fetcher=async()=>new Response(JSON.stringify({
    status:1,
    product:{code,product_name:'Example Nail Polish',brands:'Example Brand',categories:'nail polish',image_front_url:''}
  }),{status:200,headers:{'content-type':'application/json'}});
  const candidate=await lookupPublicBarcode(code,new AbortController().signal,fetcher);
  assert.equal(candidate.method,'barcode-public');
  assert.equal(candidate.fields.barcode,code);
  assert.equal(candidate.fields.name,'Example Nail Polish');
  assert.equal(candidate.fields.brand,'Example Brand');
});

test('scan status is explicit: exact barcode, reference/SKU or text identity',()=>{
  const allowed=new Set(['exact_barcode','reference_or_sku','text_identity']);
  assert.ok(v2.products.every(p=>allowed.has(p.scanMatchStatus)));
  const exact=v2.products.filter(p=>p.scanMatchStatus==='exact_barcode').length;
  assert.equal(exact,v2.scanCoverage.exactBarcode);
});
