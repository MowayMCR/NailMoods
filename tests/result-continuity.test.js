import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedScanProduct,generateScannedIdeas} from '../src/scanGenerate.js';
import {snapshotIdea,saveInspiration,readInspirations,createVariants,INSPIRATIONS_KEY,validIdea,productStatus} from '../src/inspirations.js';
import {readScanDraft,SCAN_DRAFT_KEY} from '../src/scanDraft.js';
const product=confirmedScanProduct({color:'#813c60',name:'Ma teinte',reference:'Référence saisie',type:'Vernis'},'scan-test');
test('a scanned result saves, reloads and varies without inventing a product reference',()=>{
 const idea=generateScannedIdeas([product],['French'],{},[],3)[0];
 const saved=snapshotIdea(idea);assert.ok(validIdea(saved));
 const store=saveInspiration({favorites:[],recent:[],projects:[],selected:null},saved);
 const storage={getItem:k=>k===INSPIRATIONS_KEY?JSON.stringify(store):null};
 const restored=readInspirations(storage).favorites[0];
 assert.equal(restored.intent,'scan');assert.deepEqual(restored.palette,saved.palette);assert.deepEqual(restored.scanEffects,['French']);
 const variants=createVariants(restored,[],{},7);assert.ok(variants.length);
 for(const variant of variants){assert.ok(validIdea(variant));assert.equal(variant.intent,'scan');assert.ok(variant.palette.every(p=>p.unpainted||p.reference===product.reference));}
});
test('scan draft restores confirmed colors and results, malformed draft fails safely',()=>{
 const ideas=generateScannedIdeas([product],[],{},[],1),value={stage:'results',products:[product],ideas,effects:[]};
 const storage={getItem:()=>JSON.stringify(value)};assert.deepEqual(readScanDraft(storage),JSON.parse(JSON.stringify(value)));
 assert.equal(readScanDraft({getItem:()=>'{invalid'}),null);
 assert.equal(readScanDraft({getItem:()=>JSON.stringify({...value,products:[{color:'wrong'}]})}),null);
});

test('confirmed scan colors are not misreported as removed collection products',()=>{
 assert.equal(productStatus(product,[]).state,'scanned');
 assert.equal(productStatus({...product,unpainted:true,conceptual:true},[]).label,'Ongle naturel · sans vernis supplémentaire');
 assert.equal(productStatus(product,[product]).state,'available');
 assert.equal(productStatus({...product,colorSource:undefined},[]).state,'missing');
});
