import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedScanProduct, generateScannedIdeas, toggleScanEffect, trackScan } from '../src/scanGenerate.js';
import { snapshotIdea, validIdea } from '../src/inspirations.js';
import { buildTutorial } from '../src/tutorial.js';
const green=confirmedScanProduct({color:'#356A59',name:'Rose trompeur',type:'Vernis'},'s1');
const plum=confirmedScanProduct({color:'#813c60',name:'Ma prune',type:'Gel'},'s2');
test('scan confirmation requires an actual color and retains independent personal provenance',()=>{
 assert.throws(()=>confirmedScanProduct({color:''},'x'));
 assert.equal(green.family,'Vert');assert.equal(green.color,'#356a59');assert.equal(green.confirmedColor,green.color);assert.equal(green.provenance.kind,'personal');
});
test('effects never retain incompatible choices or more than two',()=>{
 for(const a of ['Classique','French','Mat','Brillant'])for(const b of ['Classique','French','Mat','Brillant'])for(const c of ['Classique','French','Mat','Brillant']){
  const result=[a,b,c].reduce(toggleScanEffect,[]);assert.ok(result.length<=2);assert.ok(!(result.includes('Mat')&&result.includes('Brillant')));assert.ok(!(result.includes('Classique')&&result.includes('French')));
 }
 assert.deepEqual(toggleScanEffect(['French','Mat'],'Brillant'),['French','Brillant']);assert.deepEqual(toggleScanEffect(['Mat'],'Mat'),[]);
});
test('one and two unknown products generate multiple distinct valid poses without profile or equipment',()=>{
 for(const products of [[green],[green,plum]])for(const effects of [[],['Classique'],['Mat'],['Brillant'],['French'],['French','Mat'],['French','Brillant'],['Classique','Mat']]){
  const before=JSON.stringify(products);const ideas=generateScannedIdeas(products,effects);assert.ok(ideas.length>=2,JSON.stringify([products.length,effects]));
  assert.equal(new Set(ideas.map(i=>JSON.stringify(i.nails))).size,ideas.length);
  for(const idea of ideas){
   assert.ok(validIdea(snapshotIdea(idea)));const steps=buildTutorial(idea);assert.ok(steps.every(s=>!s.products.some(p=>p.unpainted)));assert.ok(!steps.some(s=>s.body.includes('Applique Ongle naturel')));assert.equal(idea.nails.length,5);
   for(const product of idea.palette)assert.ok(product.unpainted || products.some(p=>p.id===product.id && p.color===product.color));
   for(const nail of idea.nails){const p=idea.palette.find(p=>p.id===nail.productId);assert.equal(nail.color,p.color);if(nail.accentProductId)assert.equal(nail.accentColor,idea.palette.find(p=>p.id===nail.accentProductId).color);}
   for(const p of products)assert.ok(idea.nails.some(n=>n.productId===p.id || n.accentProductId===p.id));
   if(idea.palette.some(p=>p.unpainted))assert.match(idea.scanNote,/ongle naturel/);
   if(effects.includes('French')){assert.ok(idea.nails.some(n=>n.drawing==='french'));assert.ok(idea.requirements.some(r=>r.name.includes('Pinceau')));}
   if(effects.includes('Mat'))assert.ok(idea.nails.every(n=>n.productId==='scan-natural'||n.finish==='Mat'));
  }
  assert.equal(JSON.stringify(products),before);
 }
});
test('existing inventory never introduces an unscanned main color; metadata and missing equipment are retained',()=>{
 const inventory=[{id:'other',type:'Vernis',name:'Blanc',color:'#ffffff'}, {id:'sticker',name:'Fleurs dorées',type:'Matériel',equipmentCategory:'Stickers / décalcomanies',quantity:1}];
 const ideas=generateScannedIdeas([plum],[],{},inventory);
 for(const idea of ideas){assert.ok(!idea.palette.some(p=>p.id==='other'));assert.equal(idea.palette.find(p=>p.id==='s2').type,'Gel');assert.ok(idea.requirements.some(r=>r.name.includes('Lampe')));}
 assert.ok(ideas.some(i=>i.resources.some(p=>p.id==='sticker')));
});
test('a label that resembles an auxiliary product does not silently trigger an unrelated style palette',()=>{
 const product={...green,name:'Top coat test'};
 const ideas=generateScannedIdeas([product]);assert.ok(ideas.length>=2);for(const i of ideas)assert.ok(i.palette.every(p=>p.id===product.id || p.unpainted));
});
test('optional scan analytics stay off without an enabled provider',()=>{
 let raw='[]';const storage={getItem:()=>raw,setItem:(_,v)=>{raw=v;}};
 for(let i=0;i<205;i++)trackScan(storage,'scan_generate_completed',{count:3,photo:'secret',name:'secret'});
 const rows=JSON.parse(raw);assert.equal(rows.length,0);
 trackScan(storage,'not_an_event');assert.equal(JSON.parse(raw).length,0);
 assert.doesNotThrow(()=>trackScan({getItem:()=>{throw new Error();}},'scan_generate_opened'));
});
