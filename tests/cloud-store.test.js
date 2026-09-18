import {IDBFactory} from 'fake-indexeddb';
import {createWorkspaceCache} from '../src/cloud/cache/index.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountStore,accountCacheKey,migrationKey,mergeGuest,readGuest} from '../src/cloud/store.js';
import {COLLECTION,LIBRARY,JOURNAL,PROFILE,TABLES,clone,productRow,productFromRow,profilePatch} from '../src/cloud/mapping.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const polish={id:'local-1',name:'Prune',brand:'KIKO',type:'Vernis',confirmedColor:'#553366',color:'#ff0000',reference:'366',rawBarcode:'8059385036113',finish:'Métallique',photo:'photo-test',provenance:{catalogId:'catalog-test',verified:true}};
function backend(){
 const rows=Object.fromEntries(TABLES.map(t=>[t,[]]));const profile={id:'A',display_name:'',account_tier:'free',preferences:{}};let fail=false;const writes=[];
 return {rows,writes,profile,set fail(v){fail=v;},async load(){if(fail)throw new Error('offline');return clone({profile,rows,favorites:[]});},async write(op){if(fail)throw new Error('offline');writes.push(clone(op));if(TABLES.includes(op.table)){
  const i=rows[op.table].findIndex(r=>r.id===op.rowId);if(op.action==='delete'){if(i>=0)rows[op.table].splice(i,1);return null;}
  const row={...clone(op.values),id:op.rowId,workspace_id:'WA',created_by:'A'};if(i<0)rows[op.table].push(row);else rows[op.table][i]=row;return row;
 }if(op.table==='profiles'){if(op.preferenceKey)profile.preferences.nailmoodsExtras={...profile.preferences.nailmoodsExtras,[op.preferenceKey]:op.value};else{profile.display_name=op.value.name;profile.preferences.nailmoodsProfile=op.value;}}return {};}};
}
const databases=new WeakMap();
const cacheFor=storage=>{if(!databases.has(storage))databases.set(storage,new IDBFactory());return createWorkspaceCache({indexedDB:databases.get(storage)});};
const make=(storage,repo,userId='A',workspaceId='WA',other={})=>createAccountStore({storage,repo,userId,workspaceId,cache:cacheFor(storage),...other});
test('mapping preserves real HEX, barcode, sticker tags and unverified personal copy',()=>{
 const row=productRow(polish);assert.equal(row.hex,'#553366');assert.equal(row.barcode,'8059385036113');assert.equal(row.is_verified,false);assert.equal(row.metadata.nailmoods.photo,'photo-test');
 assert.equal(productFromRow({...row,id:'remote'},'user_products').id,'local-1');
 const sticker={id:'s',type:'Matériel',name:'Lunes',equipmentCategory:'Stickers / décalcomanies',decorationTags:['lune','doré']};assert.deepEqual(productRow(sticker).tags,['lune','doré']);
 assert.equal(profilePatch({name:'Marie',account_tier:'pro'},{}).account_tier,undefined);
});
test('targeted collection writes update only changed products; removal targets one row',async()=>{
 const storage=memory(),repo=backend(),store=make(storage,repo);await store.load();
 store.storage.setItem(COLLECTION,JSON.stringify([polish,{...polish,id:'two',name:'Rose'}]));assert.equal(await store.flush(),true);assert.equal(repo.writes.length,2);
 store.storage.setItem(COLLECTION,JSON.stringify([{...polish,name:'Prune violet'},{...polish,id:'two',name:'Rose'}]));await store.flush();assert.equal(repo.writes.length,3);assert.equal(repo.writes[2].values.shade_name,'Prune violet');
 store.storage.setItem(COLLECTION,JSON.stringify([{...polish,name:'Prune violet'}]));await store.flush();assert.equal(repo.writes[3].action,'delete');assert.equal(repo.rows.user_products.length,1);
});
test('offline draft and queue survive reload; retry uses same record id without duplicates',async()=>{
 const storage=memory(),repo=backend();let store=make(storage,repo);await store.load();repo.fail=true;
 store.storage.setItem(COLLECTION,JSON.stringify([polish]));assert.equal(await store.flush(),false);assert.equal(store.pending,1);store.close();
 store=make(storage,repo);await store.initialize();assert.equal(JSON.parse(store.storage.getItem(COLLECTION))[0].name,'Prune');repo.fail=false;await store.load();assert.equal(await store.flush(),true);assert.equal(repo.rows.user_products.length,1);await store.flush();assert.equal(repo.rows.user_products.length,1);
});
test('cache and queued writes are isolated between users and closed sessions reject later callbacks',async()=>{
 const storage=memory(),repoA=backend(),repoB=backend();const a=make(storage,repoA);await a.load();a.storage.setItem(COLLECTION,JSON.stringify([polish]));await a.flush();a.close();
 const b=make(storage,repoB,'B','WB');await b.load();assert.deepEqual(JSON.parse(b.storage.getItem(COLLECTION)),[]);assert.throws(()=>a.storage.setItem(COLLECTION,'[]'),/fermé/);assert.notEqual(accountCacheKey('A','WA'),accountCacheKey('B','WB'));assert.equal(storage.getItem(COLLECTION),null);
});
test('migration keeps guest backup, avoids existing references and can be repeated without extra rows',async()=>{
 const storage=memory(),repo=backend(),store=make(storage,repo);storage.setItem(COLLECTION,JSON.stringify([polish]));await store.load();
 const guest=readGuest(storage);assert.equal(await store.migrate(guest),true);assert.equal(repo.rows.user_products.length,1);assert.equal(storage.getItem(COLLECTION),JSON.stringify([polish]));assert.equal(storage.getItem(migrationKey('A','WA')),'true');assert.equal(storage.getItem(migrationKey('B','WB')),null);
 await store.migrate(guest);assert.equal(repo.rows.user_products.length,1);
 const merged=mergeGuest({[COLLECTION]:[{...polish,name:'Remote title'}]},{[COLLECTION]:[{...polish,id:'other',name:'Local title'}]});assert.equal(merged[COLLECTION].length,1);assert.equal(merged[COLLECTION][0].name,'Remote title');
});
test('failed migration is never marked complete and resumes with pending drafts',async()=>{
 const storage=memory(),repo=backend(),store=make(storage,repo);await store.load();let load=repo.load;repo.load=async()=>{const result=await load();repo.fail=true;return result;};
 assert.equal(await store.migrate({[COLLECTION]:[polish]}),false);assert.equal(storage.getItem(migrationKey('A','WA')),null);repo.fail=false;assert.equal(await store.flush(),true);assert.equal(storage.getItem(migrationKey('A','WA')),'true');
});
test('journal snapshot is immutable after product changes and loads on another browser',async()=>{
 const repo=backend(),a=make(memory(),repo);await a.load();const entry={id:'pose',date:'2026-09-18',notes:'Ma pose',photo:'photo',products:[polish],idea:null};
 a.storage.setItem(JOURNAL,JSON.stringify({entries:[entry],hiddenSessions:[]}));await a.flush();a.storage.setItem(COLLECTION,JSON.stringify([{...polish,confirmedColor:'#ff0000'}]));await a.flush();
 const b=make(memory(),repo);await b.load();const restored=JSON.parse(b.storage.getItem(JOURNAL)).entries[0];assert.equal(restored.products[0].confirmedColor,'#553366');assert.equal(restored.photo,'photo');assert.equal(restored.notes,'Ma pose');
});
test('localStorage quota no longer blocks connected changes',async()=>{
 const local=memory(),repo=backend(),store=make(local,repo);await store.load();local.setItem=()=>{throw new DOMException('Quota exceeded','QuotaExceededError');};
 store.storage.setItem(COLLECTION,JSON.stringify([polish]));assert.equal(await store.flush(),true);assert.equal(repo.rows.user_products.length,1);
});
test('another tab modifying IndexedDB prevents stale overwrite',async()=>{
 const local=memory(),repo=backend(),statuses=[],first=make(local,repo,'A','WA',{onStatus:s=>statuses.push(s)});await first.load();const other=make(local,repo);await other.load();
 first.storage.setItem(COLLECTION,JSON.stringify([polish]));assert.equal(await first.flush(),false);assert.equal(statuses.at(-1).code,'cache_conflict');assert.equal(repo.writes.length,0);
});
test('local-only writes do not stall later synchronization',async()=>{
 const store=make(memory(),backend());await store.load();store.storage.setItem('nm-feedback-draft-v1',JSON.stringify({details:'private'}));await store.flush();store.storage.setItem(COLLECTION,JSON.stringify([polish]));assert.equal(await store.flush(),true);assert.equal(store.pending,0);
});
test('explicit remote reload preserves a backup in IndexedDB before clearing queued drafts',async()=>{
 const local=memory(),repo=backend(),cache=cacheFor(local),backups=[];const original=cache.backupWorkspace.bind(cache);cache.backupWorkspace=async(...args)=>{const id=await original(...args);backups.push(id);return id;};
 const store=make(local,repo,'A','WA',{cache});await store.load();repo.fail=true;store.storage.setItem(COLLECTION,JSON.stringify([polish]));await store.flush();assert.equal(store.pending,1);
 repo.fail=false;await store.load({useRemote:true});assert.equal(store.pending,0);assert.deepEqual(JSON.parse(store.storage.getItem(COLLECTION)),[]);assert.equal(backups.length,1);assert.equal((await cache.getCachedWorkspace(backups[0])).queue.length,1);assert.equal(local.getItem(accountCacheKey('A','WA')),null);
});
test('old inspiration snapshots remain separate from a later collection edit',async()=>{
 const repo=backend(),store=make(memory(),repo);await store.load();const idea={key:'idea-test',title:'Cassis',palette:[polish],options:{mood:'Douce'}};
 store.storage.setItem(LIBRARY,JSON.stringify({recent:[idea],favorites:[idea],selected:null}));await store.flush();const id=repo.rows.inspirations[0].id;assert.equal(repo.writes.at(-1).table,'favorites');assert.equal(repo.writes.at(-1).rowId,id);
 store.storage.setItem(COLLECTION,JSON.stringify([{...polish,confirmedColor:'#ff0000'}]));await store.flush();assert.equal(repo.rows.inspirations[0].snapshot.palette[0].confirmedColor,'#553366');
});

test('21 guest products import despite saturated localStorage, retaining guest and remote rows',async()=>{
 const local=memory(),repo=backend(),store=make(local,repo);
 const products=Array.from({length:21},(_,i)=>({...polish,id:'guest-'+i,reference:String(i),rawBarcode:'',provenance:{}}));
 local.setItem(COLLECTION,JSON.stringify(products));await store.load();store.storage.setItem(COLLECTION,JSON.stringify([{...polish,id:'remote'}]));await store.flush();
 const source=local.getItem(COLLECTION);local.setItem=()=>{throw new DOMException('full','QuotaExceededError');};
 assert.equal(await store.migrate(readGuest(local)),true);assert.equal(repo.rows.user_products.length,22);assert.equal(local.getItem(COLLECTION),source);
 store.close();const reopened=make(local,repo);await reopened.initialize();assert.equal(reopened.migrationDone,true);await reopened.load();assert.equal(JSON.parse(reopened.storage.getItem(COLLECTION)).length,22);
 await reopened.migrate(readGuest(local));assert.equal(repo.rows.user_products.length,22);
});
test('IndexedDB quota retains pending change, leaves server intact and resumes after retry',async()=>{
 const local=memory(),repo=backend(),cache=cacheFor(local),set=cache.setCachedWorkspace.bind(cache),statuses=[];let full=false;
 cache.setCachedWorkspace=(...args)=>{if(full)throw new DOMException('full','QuotaExceededError');return set(...args);};
 const store=make(local,repo,'A','WA',{cache,onStatus:s=>statuses.push(s)});await store.load();full=true;
 store.storage.setItem(COLLECTION,JSON.stringify([polish]));assert.equal(await store.flush(),false);assert.equal(store.pending,1);assert.equal(repo.writes.length,0);assert.equal(statuses.at(-1).code,'quota');assert.match(statuses.at(-1).message,/données en ligne restent intactes/);
 await assert.rejects(store.clearCache(),/synchroniser/);full=false;assert.equal(await store.flush(),true);assert.equal(repo.rows.user_products.length,1);assert.equal(store.pending,0);
});
test('legacy heavy localStorage cache transfers atomically; failed transfer preserves original',async()=>{
 const local=memory(),repo=backend(),key=accountCacheKey('A','WA'),photo='data:image/png;base64,aGVsbG8=';
 const legacy={version:1,userId:'A',workspaceId:'WA',views:{[COLLECTION]:[{...polish,photo}]},bases:{},ids:{},queue:[],profile:repo.profile};const raw=JSON.stringify(legacy);local.setItem(key,raw);
 const cache=cacheFor(local),write=cache.setCachedWorkspace.bind(cache);let fail=true;cache.setCachedWorkspace=(...args)=>{if(fail)throw new DOMException('full','QuotaExceededError');return write(...args);};
 const first=make(local,repo,'A','WA',{cache});await first.initialize();assert.equal(local.getItem(key),raw);assert.equal(JSON.parse(first.storage.getItem(COLLECTION))[0].photo,photo);first.close();
 fail=false;const second=make(local,repo,'A','WA',{cache});await second.initialize();assert.equal(local.getItem(key),null);assert.equal((await cache.getCachedWorkspace(key)).views[COLLECTION][0].photo,photo);
});
for(const size of [100,500])test(`guest import of ${size} distinct products persists, then reloads without duplicates`,async()=>{
 const local=memory(),repo=backend(),store=make(local,repo);await store.load();
 const products=Array.from({length:size},(_,i)=>({...polish,id:'bulk-'+i,reference:String(i),rawBarcode:'',provenance:{}}));
 assert.equal(await store.migrate({[COLLECTION]:products}),true);assert.equal(repo.rows.user_products.length,size);assert.equal(store.pending,0);
 store.close();const reloaded=make(local,repo);await reloaded.load();assert.equal(JSON.parse(reloaded.storage.getItem(COLLECTION)).length,size);
});
