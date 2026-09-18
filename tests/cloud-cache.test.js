import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {createWorkspaceCache,LOCAL_SPACE_MESSAGE} from '../src/cloud/cache/index.js';
import {COLLECTION,LIBRARY,JOURNAL} from '../src/cloud/mapping.js';
const photo='data:image/jpeg;base64,'+Buffer.alloc(128*1024,42).toString('base64');
function state(count=1){return {version:2,userId:'A',workspaceId:'WA',views:{[COLLECTION]:Array.from({length:count},(_,i)=>({id:String(i),type:'Vernis',name:'Teinte '+i,photo,confirmedColor:'#553366'}))},bases:{},queue:[],ids:{},profile:{id:'A'}};}
for(const count of [20,100,500])test(`${count} products round-trip; one edit writes one record, shared photo stored once`,async()=>{
 const factory=new IDBFactory(),cache=createWorkspaceCache({indexedDB:factory}),scope='A:WA',initial=state(count);
 const first=await cache.setCachedWorkspace(scope,initial);assert.equal(first.imagesWritten,1);
 const next={...initial,views:{...initial.views,[COLLECTION]:initial.views[COLLECTION].map((p,i)=>i===0?{...p,name:'Corrigée'}:p)}};
 const changes=await cache.setCachedWorkspace(scope,next);assert.equal(changes.recordsWritten,1);assert.equal(changes.imagesWritten,0);
 const reopened=createWorkspaceCache({indexedDB:factory});assert.deepEqual(await reopened.getCachedWorkspace(scope),next);
});
test('journal photos, inspiration snapshots, server baselines and queue share image blobs without losing data',async()=>{
 const cache=createWorkspaceCache({indexedDB:new IDBFactory()}),initial=state(2),idea={key:'pose',palette:initial.views[COLLECTION],photo};
 initial.views[LIBRARY]={favorites:[idea],recent:[idea],selected:idea};initial.views[JOURNAL]={entries:[{id:'j1',photo,idea},{id:'j2',photo,idea}],hiddenSessions:[]};
 initial.bases.p={metadata:{photo}};initial.queue=[{id:'op',values:{snapshot:idea}}];
 const result=await cache.setCachedWorkspace('A:WA',initial);assert.equal(result.imagesWritten,1);assert.deepEqual(await cache.getCachedWorkspace('A:WA'),initial);
 await assert.rejects(cache.clearAccountCache('A:WA'),e=>e.code==='pending');assert.deepEqual(await cache.getCachedWorkspace('A:WA'),initial);
});
test('QuotaExceededError aborts transaction atomically; retry preserves prior records and images',async t=>{
 const cache=createWorkspaceCache({indexedDB:new IDBFactory()}),initial=state(20);await cache.setCachedWorkspace('A:WA',initial);
 const original=IDBObjectStore.prototype.put;let full=true,writes=0;
 IDBObjectStore.prototype.put=function(...args){if(full&&this.name==='records'&&++writes===2)throw new DOMException('disk full','QuotaExceededError');return original.apply(this,args);};
 t.after(()=>{IDBObjectStore.prototype.put=original;});
 const next=state(21);next.views[COLLECTION][0].name='Changed';
 await assert.rejects(cache.setCachedWorkspace('A:WA',next),e=>e.code==='quota'&&e.message===LOCAL_SPACE_MESSAGE);
 assert.deepEqual(await cache.getCachedWorkspace('A:WA'),initial);full=false;
 await cache.setCachedWorkspace('A:WA',next);assert.deepEqual(await cache.getCachedWorkspace('A:WA'),next);
});
test('explicit cleanup isolates account/workspace and preserves recovery backups',async()=>{
 const cache=createWorkspaceCache({indexedDB:new IDBFactory()}),a=state();await cache.setCachedWorkspace('A:WA',a);
 await cache.setCachedWorkspace('A:PRO',{...a,workspaceId:'PRO'});await cache.setCachedWorkspace('B:WB',{...a,userId:'B',workspaceId:'WB'});
 const backup=await cache.backupWorkspace('A:WA',a);await cache.clearAccountCache('A:WA');assert.equal(await cache.getCachedWorkspace('A:WA'),null);
 assert.equal((await cache.getCachedWorkspace('A:PRO')).workspaceId,'PRO');assert.equal((await cache.getCachedWorkspace('B:WB')).userId,'B');assert.deepEqual(await cache.getCachedWorkspace(backup),a);
});
