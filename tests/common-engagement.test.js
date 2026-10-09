import test from 'node:test';
import assert from 'node:assert/strict';
import {upcomingMoments} from '../src/engagement/planningSummary.js';
import {creativeSummary} from '../src/engagement/creativeSummary.js';
import {adaptToCollection} from '../src/engagement/adaptCollection.js';
import {restoreFavorite,restoreProduct} from '../src/engagement/undo.js';
import {generateInspirations} from '../src/freeInspiration.js';
import {snapshotIdea,validIdea} from '../src/inspirations.js';
import {readCreationState,CREATION_KEY} from '../src/creationState.js';
import {buildPersonalModel} from '../src/personalization.js';
const items=[['cassis','#773b59'],['rose','#d79ca9'],['nude','#dfbeae'],['creme','#f5eee7'],['vert','#728372']].map(([id,color])=>({id,name:id,type:'Vernis',finish:'Brillant',usage:'Couleur seule',color,shade:color,quantity:1}));
const options={intent:'collection',duration:90,level:2,mood:'Libre',decorations:'without'};
const idea=()=>snapshotIdea(generateInspirations(items,{},options,1,4).results[0]);

test('profile planning isolates ownership, filters canceled/done/expired, honours local all-day date',()=>{
 const principal={userId:'a',workspaceId:'w'},now=Date.parse('2026-10-05T23:00:00Z');
 const base={user_id:'a',workspace_id:'w',status:'scheduled',timezone:'Europe/Paris',scheduled_on:'2026-10-06',kind:'pose',title:'Prochaine pose',project_id:'p'};
 const rows=[{...base,id:'today',notes:'PRIVATE'},{...base,id:'next',scheduled_on:'2026-10-07'},{...base,id:'b',user_id:'b'}, {...base,id:'other',workspace_id:'x'}, {...base,id:'past',scheduled_on:'2026-10-05'}, {...base,id:'cancel',status:'canceled'}, {...base,id:'done',status:'done'}, {...base,id:'expired',starts_at:'2026-10-05T22:00:00Z',ends_at:'2026-10-05T22:30:00Z'}];
 const result=upcomingMoments(rows,principal,now);assert.deepEqual(result.map(r=>r.id),['today','next']);assert.equal('notes' in result[0],false);
});
test('creative profile deduplicates the same inspiration and uses only supplied favourites/journal',()=>{
 const i={...idea(),techniques:['French'],options:{mode:'surprise',surprise:'Creative',techniques:['French']}};
 const summary=creativeSummary({favorites:[i,i],entries:[{idea:i}]});assert.equal(summary.sample,1);assert.equal(summary.techniques.length,1);assert.deepEqual(summary.modes,['Creative']);assert.equal(creativeSummary().sample,0);
});
test('three-colour cap survives fallback and explicit conflicting choices do not invent extra colours',()=>{
 for(const surprise of ['Safe','Creative','Chaos']){const report=generateInspirations(items,{}, {...options,maxPolishes:3,mode:'surprise',surprise},14,20);assert.ok(report.results.length);for(const result of report.results)assert.ok(result.palette.length<=3);}
 const report=generateInspirations(items,{}, {...options,maxPolishes:3,requiredColorIds:items.map(p=>p.id)},1,4);assert.equal(report.results.length,0);
});
test('strict collection has no conceptual fallback and refuses unspecified technical needs',()=>{
 assert.equal(generateInspirations([],{}, {...options,collectionOnly:true}).results.length,0);
 const report=generateInspirations(items,{}, {...options,collectionOnly:true,techniques:['French']});assert.equal(report.results.length,0);
 const plain=generateInspirations(items,{}, {...options,collectionOnly:true,techniques:[]});assert.ok(plain.results.length);assert.ok(plain.results.every(i=>i.collectionEvidence.complete&&i.palette.every(p=>items.some(v=>v.id===p.id))));
});
test('rediscovery uses actual journal products; does not mutate permanent preferences or HEX',()=>{
 const used=idea(),model=buildPersonalModel({items,entries:[{id:'entry',products:items.slice(0,4),idea:used,date:'2026-10-04'}]});
 const profile={shape:'Amande',styles:['Witchy']},before=JSON.stringify({profile,items});
 const report=generateInspirations(items,profile,{...options,rediscover:true,escapeBubble:true},1,12,model.ranking);
 assert.ok(report.results.length);assert.ok(report.results.every(i=>i.palette.some(p=>p.id==='vert')));assert.equal(JSON.stringify({profile,items}),before);
});
test('contextual options persist using the existing creation state',()=>{
 const store={getItem:key=>key===CREATION_KEY?JSON.stringify({options:{...options,collectionOnly:true,rediscover:true,escapeBubble:true,maxPolishes:3}}):null};
 const saved=readCreationState(store);assert.equal(saved.options.maxPolishes,3);assert.equal(saved.options.collectionOnly,true);assert.equal(saved.options.escapeBubble,true);
});
test('adaptation reuses close-shade matcher, preserves original and remains private',()=>{
 const original=idea();original.isPublic=true;const before=JSON.stringify(original);
 const replaced=items.map(p=>({...p,id:'new-'+p.id,color:p.color,shade:p.shade}));
 const result=adaptToCollection(original,replaced);assert.ok(result.idea);assert.ok(validIdea(result.idea));assert.equal(result.idea.isPublic,false);assert.equal(result.idea.visibility,'private');assert.equal(JSON.stringify(original),before);assert.ok(result.idea.palette.every(p=>p.id.startsWith('new-')));
 for(const n of result.idea.nails)assert.equal(n.color,replaced.find(p=>p.id===n.productId).color);
 assert.equal(adaptToCollection(original,[]).idea,null);
 assert.equal(adaptToCollection(original,replaced.map(p=>({...p,finish:'Mat'}))).idea,null);
});
test('undo only restores the removed object and never clobbers intervening changes',()=>{
 const i=idea(),other={...i,key:'other'};const library={favorites:[other],recent:[i]};
 const restored=restoreFavorite(library,i);assert.equal(restored.favorites.length,2);assert.equal(restoreFavorite(restored,i),restored);assert.equal(restored.recent,library.recent);
 assert.deepEqual(restoreProduct([items[1]],items[0]),[items[1],items[0]]);assert.throws(()=>restoreProduct([{...items[0],name:'edited'}],items[0]),/modifiée/);
});
