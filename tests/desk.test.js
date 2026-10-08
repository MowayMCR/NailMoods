import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {equipmentSeed} from '../src/equipmentSeed.js';
import {toolAsset,toolUses,initialDesk,progressFor,earnedDecorations,decorations,bouquetStage,clampPosition} from '../src/desk/model.js';
import {EXTRAS} from '../src/cloud/mapping.js';
test('every selectable equipment item has an asset and a purpose',()=>{
 for(const row of equipmentSeed){const name=toolAsset({equipmentSlug:row.slug});assert.equal(name,row.slug);assert.ok(toolUses[name],row.slug);assert.ok(fs.existsSync(new URL('../public/atelier/desk-v1/'+name+'.webp',import.meta.url)));}
 for(const d of decorations)assert.ok(fs.existsSync(new URL('../public/atelier/desk-v1/'+d.id+'.webp',import.meta.url)));
});
test('vase and bouquet milestones ignore care products, quantity and duplicate references',()=>{
 const polish={id:'1',name:'Rose',brand:'Test',type:'Vernis',quantity:20};
 assert.equal(progressFor([polish,{...polish,id:'2'},{id:'3',type:'Vernis',name:'Top Coat'},{id:'4',type:'Matériel',name:'Lime'}]).count,1);
 assert.deepEqual([0,1,3,5,8,12].map(bouquetStage),[null,null,'bouquet-one','bouquet-two','bouquet-leaves','bouquet-full']);
});
test('earned decorations remain unlocked after removing a product or a journal entry',()=>{
 const state=initialDesk({highWater:12,unlocked:['frame-rose']});const earned=earnedDecorations(progressFor(),state);
 assert.ok(earned.includes('vase-round'));assert.ok(earned.includes('frame-rose'));assert.ok(!earned.includes('reward-reuse'));
});
test('reuse and personal creation rewards require actual saved activity',()=>{
 const p={id:'polish',type:'Vernis'},entry={products:[p,p],idea:{pattern:'line'}};
 assert.equal(progressFor([], [entry]).reuse,false);assert.equal(progressFor([], [entry,entry,entry]).reuse,true);
 assert.equal(progressFor([],[],{recent:[{options:{manualSet:true}}]}).composition,false);
 assert.equal(progressFor([],[],{favorites:[{options:{manualSet:true}}]}).composition,true);
 assert.equal(progressFor([],[entry]).technique,true);
});
test('desk settings are included in account preferences and positions stay on the tabletop',()=>{
 assert.ok(EXTRAS.includes('nm-desk-v1'));
 assert.deepEqual(clampPosition({x:-2,y:9},'large'),{x:.08,y:.87});
 const s=initialDesk({size:'bad',zoom:9});assert.equal(s.size,'standard');assert.equal(s.zoom,1.5);
});

test('bouquet links survive reload and reject invalid decoration relationships',()=>{
 const input={size:'large',positions:{'decor:vase-rose':{x:.3,y:.6}},flowerVases:{'flower-rose':'vase-rose','leaf-sage':'bouquet','vase-rose':'flower-rose','flower-cosmos':'unknown'}};
 const state=initialDesk(input);
 assert.deepEqual(state.flowerVases,{'flower-rose':'vase-rose','leaf-sage':'bouquet'});
 assert.deepEqual(initialDesk(JSON.parse(JSON.stringify(state))).flowerVases,state.flowerVases);
 assert.deepEqual(initialDesk({}).flowerVases,{});
 assert.deepEqual(state.positions,input.positions);
});
