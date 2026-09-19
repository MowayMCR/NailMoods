import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';

// Pre-created disposable fixtures only. No admin key, no account creation.
const e=process.env;
const required=['URL','ANON_KEY','PROJECT_REF','A_EMAIL','A_PASSWORD','B_EMAIL','B_PASSWORD','C_EMAIL','C_PASSWORD'];
const enabled=e.NM_TIER_TEST_RUN==='isolated-fixtures'&&required.every(k=>e['NM_TIER_TEST_'+k]);
function safeURL(){
 const u=new URL(e.NM_TIER_TEST_URL);
 assert.notEqual(e.NM_TIER_TEST_PROJECT_REF,'rvqmtnqvzzxzwfxfyjcg');
 assert.ok(['localhost','127.0.0.1',`${e.NM_TIER_TEST_PROJECT_REF}.supabase.co`].includes(u.hostname));
 assert.notEqual(u.hostname,'rvqmtnqvzzxzwfxfyjcg.supabase.co');
 assert.ok(!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/');
 return u.origin;
}
test('tiers réels A/B/C, persistence, downgrade et refus serveur — recette isolée',{skip:!enabled},async()=>{
 const url=safeURL(),clients=[];
 const connect=async label=>{
  const c=createClient(url,e.NM_TIER_TEST_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(c);
  const r=await c.auth.signInWithPassword({email:e[`NM_TIER_TEST_${label}_EMAIL`],password:e[`NM_TIER_TEST_${label}_PASSWORD`]});assert.ifError(r.error);return {c,id:r.data.user.id};
 };
 const a=await connect('A'),b=await connect('B'),c=await connect('C');
 assert.equal(new Set([a.id,b.id,c.id]).size,3);
 // A and B allowlisted by administrator; C ordinary Free, NOT allowlisted.
 const original=await a.c.rpc('beta_tier_state');assert.ifError(original.error);assert.equal(original.data.canChange,true);
 const pro=await b.c.rpc('beta_tier_state');assert.ifError(pro.error);assert.equal(pro.data.tier,'pro');
 const free=await c.c.rpc('beta_tier_state');assert.ifError(free.error);assert.equal(free.data.tier,'free');assert.equal(free.data.canChange,false);
 const workspace=await a.c.from('workspaces').select('id').eq('owner_user_id',a.id).eq('kind','personal').single();assert.ifError(workspace.error);
 const cspace=await c.c.from('workspaces').select('id').eq('owner_user_id',c.id).eq('kind','personal').single();assert.ifError(cspace.error);
 const id=randomUUID();let inserted=false;
 const apply=async tier=>{const r=await a.c.rpc('apply_beta_tier',{p_tier:tier});assert.ifError(r.error);assert.equal(r.data.tier,tier);};
 try{
  assert.ok((await c.c.rpc('apply_beta_tier',{p_tier:'plus'})).error);
  assert.ok((await c.c.from('profiles').update({account_tier:'pro'}).eq('id',c.id)).error);
  assert.ok((await c.c.from('user_products').insert({workspace_id:cspace.data.id,created_by:c.id,brand:'Fixture',hex:'#553366',source:'personal'})).error);
  await apply('free');await apply('plus');
  const row={id,workspace_id:workspace.data.id,created_by:a.id,brand:'Fixture',hex:'#553366',source:'personal'};
  assert.ifError((await a.c.from('user_products').insert(row)).error);inserted=true;
  assert.ok((await a.c.from('pro_profiles').insert({user_id:a.id,workspace_id:workspace.data.id,display_name:'Fixture'})).error);
  await apply('pro');await apply('free');
  const retained=await a.c.from('user_products').select('id,hex').eq('id',id).single();assert.ifError(retained.error);assert.equal(retained.data.hex,row.hex);
  const update=await a.c.from('user_products').update({hex:'#ffffff'}).eq('id',id).select('id');assert.ok(update.error||update.data.length===0);
  const other=await b.c.from('user_products').select('id').eq('id',id);assert.ifError(other.error);assert.deepEqual(other.data,[]);
  const device=await connect('A');const state=await device.c.rpc('beta_tier_state');assert.ifError(state.error);assert.equal(state.data.tier,'free');
  assert.equal((await b.c.rpc('beta_tier_state')).data.tier,'pro');
 }finally{
  await apply('plus');
  if(inserted)assert.ifError((await a.c.from('user_products').delete().eq('id',id)).error);
  await apply(original.data.tier);
  for(const client of clients)await client.auth.signOut();
 }
});
