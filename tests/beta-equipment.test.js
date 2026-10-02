import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentSeed} from '../src/equipmentSeed.js';
import {setEquipmentOwned,ownedEquipment,duplicateCustomEquipment,searchEquipment,loadEquipmentLibrary} from '../src/equipmentLibrary.js';
import {productRow,productFromRow} from '../src/cloud/mapping.js';
import {auxiliary} from '../src/creationEngine.js';
import {collectionResults} from '../src/collection.js';
import {generateInspirations} from '../src/freeInspiration.js';
import {cameraErrorMessage} from '../src/platform/cameraErrors.js';
test('library toggles are idempotent, preserve products/stickers and reconnect through existing cloud mapping',()=>{
 const row=equipmentSeed.find(r=>r.slug==='lampe-uv-led'),initial=[{id:'p',name:'Top Coat mat',type:'Vernis'},{id:'s',type:'Matériel',equipmentCategory:'Stickers / décalcomanies',name:'Stars'}];
 let items=setEquipmentOwned(initial,row,true,()=> 'tool');
 assert.equal(ownedEquipment(items,row).length,1);assert.equal(setEquipmentOwned(items,row,true,()=>{throw Error('duplicate')}),items);
 const stored=productFromRow({id:'cloud',...productRow(items.at(-1))},'user_equipment');
 assert.equal(stored.equipmentSlug,row.slug);assert.equal(ownedEquipment([stored],row).length,1);
 assert.deepEqual(setEquipmentOwned(items,row,false,()=>''),initial);
 assert.equal(setEquipmentOwned(initial,row,false,()=>''),initial);
});
test('legacy equipment aliases prevent creating duplicate tools; custom duplicates ignore case and accents',()=>{
 const row=equipmentSeed.find(r=>r.slug==='aimant-cat-eye'),items=[{id:'old',type:'Matériel',name:'Aimant cat-eye'}];
 assert.equal(setEquipmentOwned(items,row,true,()=>''),items);
 assert.equal(duplicateCustomEquipment([{id:'1',type:'Matériel',name:'Éponge nail art'}],{name:'eponge nail art'}).id,'1');
 assert.ok(searchEquipment(equipmentSeed,'popit').some(r=>r.slug==='dual-forms'));
 assert.ok(!equipmentSeed.some(r=>/top.?coat|base.?coat|primer|cleaner|vernis/i.test(r.name)));
});
test('library remains available when the network fails and reuses a validated cached reference',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 const fake=rows=>({from:()=>({select:()=>({eq:()=>({order:async()=>rows})})})});
 const offline=await loadEquipmentLibrary(fake({error:'offline'}),storage);assert.equal(offline.rows.length,34);
 const online=await loadEquipmentLibrary(fake({data:equipmentSeed}),storage);assert.equal(online.offline,false);
 const cached=await loadEquipmentLibrary(null,storage);assert.equal(cached.rows.length,34);
});
test('Top Coat mat/brillant can be found and filtered as products, not coloured generation candidates',()=>{
 const items=[{id:'a',name:'Finition personnelle',type:'Vernis',productKind:'Top Coat mat',finish:'Mat'},{id:'b',name:'Top Coat brillant',type:'Vernis',finish:'Brillant'}];
 assert.equal(collectionResults(items,'top coat mat').length,1);
 assert.equal(collectionResults(items,'','Tous',{productKind:'Top Coat brillant'}).length,1);
 assert.ok(items.every(auxiliary));
});
test('Free inspiration needs no products, tools, stickers or account; unknown products do not block it',()=>{
 for(const items of [[],[{id:'unknown',name:'Produit inconnu',type:'Vernis',color:'#813c60'}]]){
  const report=generateInspirations(items,{}, {intent:'inspire'},1);
  assert.ok(report.results.length>0);
 }
});
test('camera refusal gives an actionable error; cancellation is distinct from failure',()=>{
 assert.match(cameraErrorMessage({code:'CAMERA_DENIED',message:'permission denied'}),/réglages/);
 assert.equal(cameraErrorMessage({message:'User cancelled'}),'');
 assert.match(cameraErrorMessage({message:'Camera unavailable'}),/manuellement/);
});
