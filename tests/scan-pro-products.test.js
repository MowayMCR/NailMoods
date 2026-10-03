import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {productKind} from '../src/productKinds.js';
import {catalogCandidate,matchCatalog} from '../src/catalog.js';
import {confirmedScanProduct,generateScannedIdeas} from '../src/scanGenerate.js';
import {parseProductText} from '../src/productIdentity.js';
const products=JSON.parse(fs.readFileSync('public/catalog-v2.json')).products;
test('BIAB classification survives catalogue selection and scan confirmation without an invented swatch',()=>{
 const biab=products.filter(p=>/biab/i.test(p.collection));assert.ok(biab.length>0);
 for(const p of biab){const c=catalogCandidate({product:p});assert.equal(c.fields.productKind,'Gel de construction');const saved=confirmedScanProduct(c.fields,p.catalogId);assert.equal(saved.productKind,'Gel de construction');assert.equal(saved.type,'Gel');assert.equal(saved.color,'');assert.throws(()=>generateScannedIdeas([saved]));}
});
test('auxiliary products can be saved without color and cannot generate polish ideas',()=>{
 for(const [name,kind] of [['No wipe Top Coat','Top Coat'],['Matte Top Coat','Top Coat mat'],['Rubber Base','Base coat'],['Acid Free Primer','Primer'],['Nail Cleaner','Cleaner'],['Gel Remover','Dépose / soin']]){
  const item=confirmedScanProduct({name,color:''},name);assert.equal(item.productKind,kind);assert.equal(item.color,'');assert.throws(()=>generateScannedIdeas([item]));
  const colored=confirmedScanProduct({name,color:'#ff0000'},name);assert.throws(()=>generateScannedIdeas([colored]));
 }
 assert.throws(()=>confirmedScanProduct({name:'Red polish',color:''},'red'));
 const gel=confirmedScanProduct({name:'Pink BIAB',color:'#dfaaaa'},'biab');assert.equal(gel.type,'Gel');assert.ok(generateScannedIdeas([gel]).length>0);
});
test('professional brand aliases resolve existing catalogue identities',()=>{
 for(const [alias,brand] of [['DND','DND Gel'],['Luxio','Akzentz Luxio'],['TGB','The GelBottle']]){
  assert.equal(parseProductText(alias,products).brand,brand);
  const p=products.find(p=>p.brand===brand);assert.ok(p);
  assert.ok(matchCatalog(products,[alias,p.collection,p.name,p.reference].filter(Boolean).join(' ')).some(m=>m.product.catalogId===p.catalogId));
 }
});
