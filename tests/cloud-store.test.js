import {IDBFactory} from 'fake-indexeddb';
import {createWorkspaceCache} from '../src/cloud/cache/index.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountStore,accountCacheKey,migrationKey,mergeGuest,readGuest} from '../src/cloud/store.js';
import {COLLECTION,LIBRARY,JOURNAL,PROFILE,TABLES,clone,productRow,productFromRow,profilePatch} from '../src/cloud/mapping.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const polish={id:'local-1',name:'Prune',brand:'KIKO',type:'Vernis',confirmedColor:'#553366',color:'#ff0000',reference:'366',rawBarcode:'8059385036113',finish:'Métallique',photo:'photo-test',provenance:{catalogId:'catalog-test',verified:true}};
test('server tier refresh preserves drafts but never retains a stale cached tier',async()=>{
 const repo=backend(),store=make(memory(),repo);repo.profile.account_tier='plus';await store.load();
 repo.fail=true;store.storage.setItem(COLLECTION,JSON.stringify([polish]));await store.flush();
 repo.fail=false;repo.profile.account_tier='free';await store.load();
 assert.equal(store.storage.accountTier,'free');assert.equal(store.pending,1);
 assert.equal(JSON.parse(store.storage.getItem(COLLECTION))[0].id,polish.id);
});
test('independent account stores never share account tiers',async()=>{
 const local=memory(),a=backend(),b=backend();a.profile.account_tier='plus';b.profile.account_tier='pro';
 const sa=make(local,a,'A','WA'),sb=make(local,b,'B','WB');await sa.load();await sb.load();
 assert.equal(sa.storage.accountTier,'plus');assert.equal(sb.storage.accountTier,'pro');
 b.profile.account_tier='free';await sb.load();assert.equal(sa.storage.accountTier,'plus');assert.equal(sb.storage.accountTier,'free');
});
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
test('publishing an existing private journal photo uploads a public copy before writing the reference',async()=>{
 const repo=backend(),calls=[];const media={download:async p=>{calls.push(p);return new Blob(['test'],{type:'image/png'});},uploadPublic:async()=>({path:'A/WA/journal/public-version.png'})};
 const store=make(memory(),repo,'A','WA',{media});await store.load();
 store.storage.setItem(JOURNAL,JSON.stringify({entries:[{id:'pose',date:'2026-09-19',photo:'A/WA/journal/private.png',mediaPath:'A/WA/journal/private.png',visibility:'public'}]}));
 assert.equal(await store.flush(),true);assert.deepEqual(calls,['A/WA/journal/private.png']);
 assert.equal(repo.rows.journal_entries[0].public_media_path,'A/WA/journal/public-version.png');
 assert.equal(repo.rows.journal_entries[0].media_path,'A/WA/journal/private.png');
});
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

test('connected journal photo uploads before the Supabase write and stores only a path remotely',async()=>{
 const local=memory(),repo=backend(),calls=[];
 const media={
  async upload({kind,objectId,file}){calls.push(['private',kind,objectId,file.type,file.size]);return {path:`A/WA/${kind}/${objectId}.jpg`};},
  async uploadPublic({kind,objectId}){calls.push(['public',kind,objectId]);return {path:`A/WA/${kind}/${objectId}.jpg`};},
 };
 const store=make(local,repo,'A','WA',{media});await store.load();
 const photo='data:image/jpeg;base64,'+Buffer.alloc(32,42).toString('base64');
 store.storage.setItem(JOURNAL,JSON.stringify({entries:[{id:'j1',version:1,title:'Cassis',date:'2026-09-18',photo,products:[],visibility:'public',idea:null,feeling:'',ease:'',repeat:false,wearDays:'',notes:'',createdAt:1,updatedAt:1}],hiddenSessions:[]}));
 assert.equal(await store.flush(),true);const write=repo.writes.find(op=>op.table==='journal_entries');
 assert.equal(calls[0][0],'private');assert.equal(calls[1][0],'public');assert.equal(write.values.media_path,'A/WA/journal/'+write.rowId+'.jpg');assert.equal(write.values.snapshot.photo,'A/WA/journal/'+write.rowId+'.jpg');assert.ok(!JSON.stringify(write).includes('base64'));
});

test('existing connected journal photos migrate non-destructively and become paths after a successful upload',async()=>{
 const local=memory(),repo=backend(),calls=[];
 const media={async upload({objectId}){calls.push(objectId);return {path:`A/WA/journal/${objectId}.jpg`};},async uploadPublic(){return {path:'public'};}};
 const store=make(local,repo,'A','WA',{media});await store.load();
 const photo='data:image/jpeg;base64,'+Buffer.alloc(12,9).toString('base64');
 store.storage.setItem(JOURNAL,JSON.stringify({entries:[{id:'old-photo',version:1,title:'Souvenir',date:'2026-09-18',photo,products:[],visibility:'private',idea:null,feeling:'',ease:'',repeat:false,wearDays:'',notes:'',createdAt:1,updatedAt:1}],hiddenSessions:[]}));
 assert.equal(await store.flush(),true);const stats=await store.migrateMedia();assert.deepEqual(stats,{detected:0,migrated:0,failed:0,remaining:0});
 assert.equal(calls.length,1);assert.equal(repo.rows.journal_entries[0].media_path,'A/WA/journal/'+repo.rows.journal_entries[0].id+'.jpg');
});

test('public journal media is removed when a pose returns to private',async()=>{
 const local=memory(),repo=backend(),calls=[];
 const media={async upload({kind,objectId}){return {path:`A/WA/${kind}/${objectId}.jpg`};},async uploadPublic({kind,objectId}){return {path:`A/WA/${kind}/${objectId}.jpg`};},async removePublic(path){calls.push(path);}};
 const store=make(local,repo,'A','WA',{media});await store.load();
 const photo='data:image/jpeg;base64,'+Buffer.alloc(8,7).toString('base64');
 store.storage.setItem(JOURNAL,JSON.stringify({entries:[{id:'public-pose',title:'Public',date:'2026-09-18',photo,products:[],visibility:'public'}],hiddenSessions:[]}));
 assert.equal(await store.flush(),true);const row=repo.rows.journal_entries[0];assert.equal(row.visibility,'public');assert.ok(row.public_media_path);
 const current=JSON.parse(store.storage.getItem(JOURNAL));current.entries[0].visibility='private';store.storage.setItem(JOURNAL,JSON.stringify(current));assert.equal(await store.flush(),true);
 assert.deepEqual(calls,[row.public_media_path]);assert.equal(repo.rows.journal_entries[0].visibility,'private');assert.equal(repo.rows.journal_entries[0].public_media_path,null);
});

test('media migration reports and uploads inspiration snapshots without leaving data URLs',async()=>{
 const local=memory(),repo=backend(),calls=[];
 const media={async upload({kind,objectId}){calls.push([kind,objectId]);return {path:`A/WA/${kind}/${objectId}.jpg`};},async uploadPublic(){return {path:'public'};}};
 const store=make(local,repo,'A','WA',{media});await store.load();
 const photo='data:image/png;base64,'+Buffer.alloc(8,4).toString('base64');
 const idea={key:'idea-media',title:'Rose',photo,options:{mood:'Douce'}};
 store.storage.setItem(LIBRARY,JSON.stringify({recent:[idea],favorites:[],selected:null}));
 assert.equal(await store.flush(),true);const stats=await store.migrateMedia();
 assert.deepEqual(stats,{detected:0,migrated:0,failed:0,remaining:0});
 assert.equal(calls.length,1);assert.equal(calls[0][0],'inspiration');assert.ok(!JSON.stringify(repo.rows.inspirations[0]).includes('base64'));
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

test('photo project references upload privately and survive a fresh device without inline image data',async()=>{
 const repo=backend(),uploads=[],media={upload:async o=>{uploads.push(o);return {path:`A/WA/reference/${o.objectId}.png`};}};
 const store=make(memory(),repo,'A','WA',{media});await store.load();
 const idea={key:'photo-project',title:'Projet',intent:'photos',isProject:true,photoSources:[{src:'data:image/png;base64,YWJj',name:'reference'}]};
 store.storage.setItem(LIBRARY,JSON.stringify({projects:[idea],favorites:[],recent:[],selected:null}));
 assert.equal(await store.flush(),true);assert.equal(uploads.length,1);
 assert.equal(uploads[0].kind,'reference');assert.equal(repo.rows.inspirations[0].snapshot.photoSources[0].src.startsWith('A/WA/reference/'),true);
 assert.equal(JSON.stringify(repo.rows).includes('base64'),false);
 const other=make(memory(),repo,'A','WA',{media});await other.load();
 assert.equal(JSON.parse(other.storage.getItem(LIBRARY)).projects[0].photoSources[0].src,repo.rows.inspirations[0].snapshot.photoSources[0].src);
});
test('failed reference upload preserves the queued project for retry',async()=>{
 const repo=backend();let fail=true;const media={upload:async()=>{if(fail)throw new Error('offline');return {path:'A/WA/reference/p.png'};}};
 const store=make(memory(),repo,'A','WA',{media});await store.load();
 const idea={key:'retry-project',title:'Projet',isProject:true,photoSources:[{src:'data:image/png;base64,YWJj'}]};
 store.storage.setItem(LIBRARY,JSON.stringify({projects:[idea],favorites:[],recent:[],selected:null}));
 assert.equal(await store.flush(),false);assert.equal(repo.rows.inspirations.length,0);assert.ok(store.pending);
 fail=false;assert.equal(await store.flush(),true);assert.equal(repo.rows.inspirations.length,1);
});
test('photo draft references sync via account preferences and reload on another device',async()=>{
 const repo=backend(),media={upload:async()=>({path:'A/WA/reference/draft.png'})};
 const a=make(memory(),repo,'A','WA',{media});await a.load();
 a.storage.setItem('nm-photo-draft-v1',JSON.stringify({photos:[{id:'a',src:'data:image/png;base64,YWJj',analysis:{colors:['#aa55aa']}}],nailArt:false,overrides:{mood:'Witchy'}}));
 assert.equal(await a.flush(),true);const b=make(memory(),repo,'A','WA',{media});await b.load();const draft=JSON.parse(b.storage.getItem('nm-photo-draft-v1'));
 assert.equal(draft.photos[0].src,'A/WA/reference/draft.png');assert.equal(draft.overrides.mood,'Witchy');assert.equal(draft.nailArt,false);
});

test('editing a photo draft during upload preserves the normalized conflict baseline',async()=>{
 const repo=backend();let release;const blocked=new Promise(resolve=>{release=resolve;});let started;const uploading=new Promise(resolve=>{started=resolve;});
 const media={upload:async()=>{started();await blocked;return {path:'A/WA/reference/draft.png'};}};
 const originalWrite=repo.write;repo.write=async op=>{if(op.preferenceKey==='nm-photo-draft-v1'&&repo.profile.preferences.nailmoodsExtras?.[op.preferenceKey])assert.deepEqual(op.before,repo.profile.preferences.nailmoodsExtras[op.preferenceKey]);return originalWrite(op);};
 const store=make(memory(),repo,'A','WA',{media});await store.load();
 const draft={photos:[{src:'data:image/png;base64,YWJj'}],overrides:{mood:'Witchy'}};
 store.storage.setItem('nm-photo-draft-v1',JSON.stringify(draft));await uploading;
 store.storage.setItem('nm-photo-draft-v1',JSON.stringify({...draft,overrides:{mood:'Coquette'}}));release();
 assert.equal(await store.flush(),true);assert.equal(repo.profile.preferences.nailmoodsExtras['nm-photo-draft-v1'].overrides.mood,'Coquette');
});
