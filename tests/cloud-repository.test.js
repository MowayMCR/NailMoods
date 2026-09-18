import test from 'node:test';
import assert from 'node:assert/strict';
import {repository,personalWorkspace} from '../src/cloud/repository.js';
// SDK boundary assertions; these do NOT establish server-side RLS behavior.
function client(handler,user='A'){
 const calls=[];
 return {calls,auth:{getUser:async()=>({data:{user:{id:user}},error:null})},from(table){const call={table,filters:[]};calls.push(call);const q={};for(const method of ['select','eq','is','in','order','range','update','insert','delete','single','maybeSingle'])q[method]=(...args)=>{if(['eq','is','in'].includes(method))call.filters.push([method,...args]);else call[method]=args;return q;};q.then=(resolve,reject)=>Promise.resolve(handler(call)).then(resolve,reject);return q;}};
}
test('repository refuses all writes after identity changes',async()=>{
 const c=client(()=>{throw new Error('must not query');},'B');await assert.rejects(repository(c,'A','WA').write({table:'user_products',rowId:'p',action:'delete'}),/session/);assert.equal(c.calls.length,0);
});
test('product update is scoped to active workspace and guarded by snapshot comparison',async()=>{
 const old={id:'p',workspace_id:'WA',created_by:'A',metadata:{old:true},hex:'#553366'};
 const c=client(call=>({data:call.update?{...old,...call.update[0]}:old,error:null}));
 await repository(c,'A','WA').write({table:'user_products',rowId:'p',action:'put',values:{metadata:{next:true},hex:'#553366'}},old);
 const update=c.calls.find(c=>c.update);assert.ok(update.filters.some(f=>f[1]==='workspace_id'&&f[2]==='WA'));assert.ok(update.filters.some(f=>f[1]==='id'&&f[2]==='p'));assert.ok(update.filters.some(f=>f[1]==='metadata'&&f[2]===JSON.stringify(old.metadata)));assert.equal(update.update[0].created_by,undefined);
});
test('concurrent remote modification is surfaced as conflict, never overwritten',async()=>{
 const c=client(()=>({data:{id:'p',metadata:{remote:true},hex:'#111111'},error:null}));await assert.rejects(repository(c,'A','WA').write({table:'user_products',rowId:'p',action:'put',values:{metadata:{local:true},hex:'#333333'}},{metadata:{old:true},hex:'#222222'}),e=>e.code==='conflict');assert.ok(!c.calls.some(c=>c.update));
});
test('lost-response insert is acknowledged without creating another copy',async()=>{
 const values={metadata:{color:'#553366'},hex:'#553366'};const c=client(()=>({data:{id:'p',...values},error:null}));await repository(c,'A','WA').write({table:'user_products',rowId:'p',action:'put',values});assert.ok(!c.calls.some(c=>c.insert||c.update));
});
test('profile updates never include a tier or user-supplied ownership field',async()=>{
 const c=client(call=>({data:call.update?{id:'A'}:{id:'A',preferences:{},display_name:''},error:null}));await repository(c,'A','WA').write({table:'profiles',value:{name:'Marie'},before:null});const payload=c.calls.find(c=>c.update).update[0];assert.deepEqual(Object.keys(payload).sort(),['display_name','preferences']);
});
test('missing membership does not create a workspace in the browser',async()=>{
 const c=client(()=>({data:[],error:null}));await assert.rejects(personalWorkspace(c,'A'),/personnel/);assert.equal(c.calls[0].table,'workspace_members');assert.ok(!c.calls.some(c=>c.insert));
});
test('first dismissal in journal tolerates absent hiddenSessions preference',async()=>{
 const c=client(call=>({data:call.update?{id:'A'}:{id:'A',preferences:{},display_name:''},error:null}));await repository(c,'A','WA').write({table:'profiles',preferenceKey:'hiddenSessions',before:[],value:['pose']});assert.ok(c.calls.some(c=>c.update));
});
