import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateInspirations } from '../src/freeInspiration.js';
import { snapshotIdea, saveInspiration, readInspirations, createVariants, ownedIdeaProducts } from '../src/inspirations.js';
import { newJournalEntry, putJournalEntry, readJournal } from '../src/journal.js';
import { productColor } from '../src/colorAnalysis.js';
import { matchCatalog, catalogCandidate } from '../src/catalog.js';
const color=(id,shade='#123456')=>({id,name:'Teinte '+id,type:'Vernis',shade,color:'#db7897',usage:'Couleur seule',finish:'Brillant',family:'Rose'});
const sticker={id:'s',name:'Fleurs dorées',type:'Matériel',equipmentCategory:'Stickers / décalcomanies',quantity:1};

test('a selected shade stays in every proposal even beyond the large inventory shortlist',()=>{
 const items=Array.from({length:105},(_,i)=>color('p'+i,i===104?'#abcdef':'#aabbcc'));
 const report=generateInspirations(items,{}, {intent:'collection',requiredColorIds:['p104'],polishCount:3},7);
 assert.ok(report.results.length);
 for(const idea of report.results){assert.ok(idea.palette.some(p=>p.id==='p104'));assert.ok(idea.nails.some(n=>n.productId==='p104'&&n.color==='#abcdef'));}
});
test('selected colors and sticker survive impossible count and duration without fake equipment',()=>{
 const items=[color('a'),color('b','#f1cdee'),sticker];
 const report=generateInspirations(items,{}, {intent:'collection',requiredColorIds:['a','b'],decorations:'with',decorationId:'s',polishCount:5,duration:15},1);
 assert.ok(report.adjusted);assert.ok(report.results.length);
 for(const idea of report.results){assert.equal(idea.palette.length,2);assert.ok(idea.resources.some(r=>r.id==='s'));assert.ok(idea.nails.some(n=>n.decoration?.motif==='flower'));assert.equal(idea.resources.length,1);}
});
test('sticker-only and empty collections remain useful in Free',()=>{
 const r=generateInspirations([sticker],{}, {intent:'inspire',decorations:'with',decorationId:'s',duration:15},1);
 assert.ok(r.results.length);assert.ok(r.results.every(i=>i.resources.some(p=>p.id==='s')));
 assert.deepEqual(ownedIdeaProducts(r.results[0],[sticker]).map(p=>p.id),['s']);
 assert.equal(ownedIdeaProducts(generateInspirations([],{}).results[0],[]).length,0);
});
test('save is idempotent and preserves composition, mood, sticker and date through journal reload',()=>{
 const idea=snapshotIdea(generateInspirations([color('a'),sticker],{}, {mood:'Joyeuse',decorations:'with',decorationId:'s',duration:45}).results[0]);
 let lib=saveInspiration({favorites:[],recent:[],selected:null},idea);lib=saveInspiration(lib,idea);
 assert.equal(lib.favorites.length,1);
 const recovered=readInspirations({getItem:()=>JSON.stringify(lib)}).favorites[0];
 assert.deepEqual(recovered.nails,idea.nails);assert.equal(recovered.options.mood,'Joyeuse');assert.equal(recovered.createdAt,idea.createdAt);
 const entry=newJournalEntry('j',{id:'p',status:'completed',idea:recovered});
 const journal=readJournal({getItem:()=>JSON.stringify(putJournalEntry({entries:[],hiddenSessions:[]},entry).store)});
 assert.deepEqual(journal.entries[0].idea.nails,idea.nails);assert.ok(journal.entries[0].products.some(p=>p.id==='s'));
});
test('conceptual colors never become possessed products in the journal',()=>{
 const idea=snapshotIdea(generateInspirations([],{}).results[0]);
 const entry=newJournalEntry('j',{id:'p',status:'completed',idea});
 assert.equal(entry.products.length,0);assert.equal(entry.idea.nails.length,5);
 const variants=createVariants(idea,[],{},2);
 assert.ok(variants.length);assert.ok(variants.every(v=>v.palette.every(p=>p.conceptual)));
});
test('catalogue has 1801 unique records and exact reference + brand beats fuzzy name',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/catalog-v1.json',import.meta.url)));
 assert.equal(data.products.length,1801);assert.equal(new Set(data.products.map(p=>p.catalogId)).size,1801);
 const matches=matchCatalog(data.products,'CANNI 9058');assert.ok(matches.length);assert.equal(matches[0].product.reference,'9058');assert.equal(matches[0].confidence,'élevée');
 assert.equal(catalogCandidate(matches[0]).fields.catalogColor,undefined);
 assert.deepEqual(matchCatalog(data.products,'CANNI 99999999'),[]);
 assert.ok(matchCatalog(data.products,'Manucurist Grenat').length);
});
test('recognition never uses color and caps ambiguous references or OCR confidence',()=>{
 const products=[{catalogId:'a',brand:'A',name:'Plum',reference:'1234'},{catalogId:'b',brand:'B',name:'Plum',reference:'1234'}];
 assert.ok(matchCatalog(products,'1234').every(m=>m.confidence==='moyenne'));
 assert.equal(matchCatalog(products,'A 1234')[0].product.catalogId,'a');
 assert.equal(matchCatalog(products,'A 1234',{ocr:true})[0].confidence,'moyenne');
 assert.deepEqual(matchCatalog(products,'#123456'),[]);
});
test('validated catalogue color outranks confirmed personal, sampled and family colors',()=>{
 const p={...color('a','#abcdef'),confirmedColor:'#112233',catalogColor:'#445566',catalogColorValidated:true};
 assert.equal(productColor(p),'#445566');assert.equal(productColor({...p,catalogColorValidated:false}),'#112233');assert.equal(productColor({...p,catalogColorValidated:false,confirmedColor:''}),'#abcdef');
});
