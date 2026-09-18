import test from 'node:test';
import assert from 'node:assert/strict';
import { matchCatalog, catalogCandidate, catalogueProvenance, catalogCollections } from '../src/catalog.js';
import { provenanceOf } from '../src/collection.js';
import { generationFamily } from '../src/colorAnalysis.js';
import { stickerAffinity } from '../src/decorations.js';
import { stickerAppearance } from '../src/creationEngine.js';
import { generateInspirations } from '../src/freeInspiration.js';
import { snapshotIdea } from '../src/inspirations.js';
import { newTutorial, markIdeaDone } from '../src/tutorial.js';
import { newJournalEntry, putJournalEntry, readJournal } from '../src/journal.js';
const product={catalogId:'a',brand:'CANNI',collection:'CC3',reference:'9058',sku:'CC3-9058',name:'Cassis',type:'Vernis'};
test('recognition keeps independent evidence and never invents a color score',()=>{
 const match=matchCatalog([product],'CANNI CC3 9058')[0];
 assert.equal(match.evidence.brand,100);assert.equal(match.evidence.collection,100);assert.equal(match.evidence.reference,100);assert.equal(match.evidence.name,null);assert.equal(match.evidence.color,null);
 assert.ok(matchCatalog([product],'CC3-9058')[0]);
 assert.equal(matchCatalog([product],'CANNI CC3 9059').length,0);
 const ocr=matchCatalog([product],'CANNI CC3 9058',{ocr:true})[0];assert.ok(ocr.score<=88);assert.ok(ocr.evidence.reference<=88);
});
test('a personal correction retains the source but never changes the catalogue',()=>{
 const before=JSON.stringify(product), c=catalogCandidate(matchCatalog([product],'CANNI 9058')[0]);
 const item={...c.fields,provenance:catalogueProvenance(c)};
 assert.equal(provenanceOf(item).kind,'nailmoods');
 const corrected=provenanceOf({...item,name:'Ma nuance'});assert.equal(corrected.kind,'personal');assert.equal(corrected.derivedFrom,'a');assert.equal(corrected.verified,false);assert.equal(JSON.stringify(product),before);
});
test('swatch groups preserve brand and collection boundaries',()=>{
 const groups=catalogCollections([product,{...product,catalogId:'b',brand:'Autre'},{...product,catalogId:'c'}]);
 assert.equal(groups.length,2);assert.deepEqual(groups[0].productIds,['a','c']);
});
test('the exact green shade drives family and generated nails despite a misleading label',()=>{
 const item={id:'green',type:'Vernis',name:'Rose trompeur',family:'Rose',color:'#db7897',shade:'#356a59',usage:'Couleur seule'};
 assert.equal(generationFamily(item),'Vert');const report=generateInspirations([item],{}, {intent:'collection'},1);
 assert.ok(report.results.length);for(const idea of report.results){assert.equal(idea.palette[0].family,'Vert');assert.ok(idea.nails.every(n=>n.color==='#356a59'));}assert.equal(item.family,'Rose');
});
test('multi motif stickers are ranked by universe and preserve explicit selection',()=>{
 const board={id:'s',name:'Planche 12',type:'Matériel',equipmentCategory:'Stickers / décalcomanies',decorationTags:['floral','lune','doré'],quantity:1};
 assert.ok(stickerAffinity(board,{style:'Witchy'})>0);assert.equal(stickerAppearance(board,{style:'Witchy'}).motif,'moon');assert.equal(stickerAppearance(board,{style:'Floral'}).motif,'flower');assert.equal(stickerAppearance(board).color,'#d0aa58');
 const report=generateInspirations([board],{}, {intent:'inspire',style:'Witchy',decorations:'with',decorationId:'s',duration:90},1);
 assert.ok(report.results.length);assert.ok(report.results.every(idea=>idea.resources.some(r=>r.id==='s')));
});
test('missing tools remain explicit, never blocking Free',()=>{
 const items=[{id:'gel',name:'Cat eye',family:'Prune',color:'#663355',type:'Gel',finish:'Cat-eye',usage:'Avec aimant'}];
 const report=generateInspirations(items,{}, {intent:'collection',duration:90},1);assert.ok(report.results.length);
 for(const idea of report.results){assert.ok(idea.requirements.some(r=>r.name.includes('Lampe')));assert.ok(idea.requirements.some(r=>r.name.includes('Aimant')));}
 assert.ok(generateInspirations([],{}, {intent:'inspire'},1).results.length);
});
test('recipe composition, actual colors, mood and tags survive journal persistence',()=>{
 const colors=[{id:'p',name:'Mon vernis',type:'Vernis',shade:'#356a59',family:'Rose',usage:'Couleur seule'}];
 const idea=snapshotIdea(generateInspirations(colors,{}, {intent:'collection',mood:'Douce'},1).results[0]);
 const tutorial=newTutorial(idea,'session');assert.ok(tutorial.steps.length);
 const completed=markIdeaDone({sessions:[]},idea,'done');
 const session=completed.session;const entry=newJournalEntry('entry',session);entry.notes='Mon premier essai';
 const saved=putJournalEntry({entries:[],hiddenSessions:[]},entry).store;
 const reloaded=readJournal({getItem:()=>JSON.stringify(saved)}).entries[0];
 assert.deepEqual(reloaded.idea.nails,idea.nails);assert.equal(reloaded.idea.options.mood,'Douce');assert.equal(reloaded.products[0].color,'#356a59');assert.equal(reloaded.notes,'Mon premier essai');
});
