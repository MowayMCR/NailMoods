import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseProductText,canonicalBrand} from '../src/productIdentity.js';
import {matchCatalog} from '../src/catalog.js';
import {onlineVariant,onlineSelectionPatch} from '../src/productLookup.js';
import {identityMatch,normalizeLookupInput} from '../supabase/functions/_shared/lookupIdentity.mjs';
const data=JSON.parse(readFileSync(new URL('../public/catalog-official-brands.json',import.meta.url)));
test('brand labels are recognized even without a local product; packaging volumes do not become shade numbers',()=>{
 for(const [text,brand] of [['Maybelline New York\n135\n7 ml','Maybelline'],['Fashion Make Up\n205\n8 ml','Fashion Make Up'],["Monop’ Make Up\n20\n5 ml",'Monoprix'],['H&M\nNail polish','H&M'],['Yves Rocher\nLaque Botanique','Yves Rocher'],['Essie\nBallet Slippers','Essie'],['Biguine\nVernis','Biguine']]){
  const p=parseProductText(text,[]);assert.equal(p.brand,brand);assert.ok(!p.shadeCodes.includes('5'));assert.ok(!p.shadeCodes.includes('7'));assert.ok(!p.shadeCodes.includes('8'));
 }
 assert.deepEqual(parseProductText('MAYBELLINE NEW YORK 135',[]).shadeCodes,['135']);
 assert.equal(canonicalBrand("Monop' Make Up"),canonicalBrand('Monoprix'));
});
test('each official supplement identity is reachable by brand and reference without invented colors',()=>{
 assert.equal(new Set(data.products.map(p=>p.catalogId)).size,data.products.length);
 for(const p of data.products){
  assert.ok(p.url.startsWith('https://'));
  assert.equal(p.colorValidated,Boolean(p.catalogColor));
  if(p.reference){const matches=matchCatalog(data.products,p.reference,{brand:p.brand,collection:p.collection});assert.ok(matches.some(m=>m.product.catalogId===p.catalogId),p.brand+' '+p.reference+' '+p.name);}
 }
});
test('official multi-shade selection keeps the chosen identity, source and color through Collection',()=>{
 const shades=[{fields:{brand:'Maybelline',name:'Rose',reference:'135',color:'#123456'},source:'https://www.maybelline.fr/rose'},{fields:{brand:'Maybelline',name:'Rouge',reference:'215'},source:'https://www.maybelline.fr/rouge'}];
 const c={fields:{brand:'Maybelline',name:'Superstay'},source:'https://www.maybelline.fr/superstay',provider:'Site officiel Maybelline',official:true,needsVariant:true,variantId:'',variants:[{id:'0',title:'Rose'},{id:'1',title:'Rouge'}],directVariants:shades};
 assert.equal(onlineVariant(c,'invalid'),c);
 const selected=onlineVariant(c,'1');assert.equal(selected.fields.reference,'215');assert.equal(selected.variantId,'1');
 const patch=onlineSelectionPatch(selected,{});assert.equal(patch.url,shades[1].source);assert.equal(patch.reference,'215');assert.equal(patch.catalogColor,'');
 const first=onlineVariant(c,'0');assert.equal(onlineSelectionPatch(first,{colorSource:'manual',color:'#abcdef'}).color,undefined);
 assert.equal(identityMatch(first,normalizeLookupInput({brand:'Maybelline',reference:'215'})),null);
});
