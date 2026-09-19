import test from 'node:test';
import assert from 'node:assert/strict';
import {betaTierService,tierCapabilities} from '../src/cloud/betaTier.js';

test('Free previews remain available; only Plus/Pro unlock persistence',()=>{
 for(const tier of ['free','plus','pro',undefined,'admin','PLUS']){
  const rights=tierCapabilities(tier);
  assert.equal(rights.personal,['plus','pro'].includes(tier));
  assert.equal(rights.pro,tier==='pro');
  assert.equal(rights.scan,true);assert.equal(rights.inspire,true);
 }
});
test('beta change sends only requested tier, never another user identity',async()=>{
 const calls=[];
 const service=betaTierService({rpc:async(name,args)=>{calls.push({name,args});return {data:{tier:args?.p_tier||'free',canChange:true},error:null};}});
 assert.equal((await service.state()).tier,'free');
 for(const tier of ['plus','pro','free'])assert.equal((await service.apply(tier)).tier,tier);
 assert.deepEqual(calls.slice(1),['plus','pro','free'].map(p_tier=>({name:'apply_beta_tier',args:{p_tier}})));
 assert.throws(()=>service.apply('admin'));
});
test('server denial cannot be interpreted as a successful promotion',async()=>{
 const service=betaTierService({rpc:async()=>({data:null,error:{code:'42501',message:'beta_access_required'}})});
 await assert.rejects(service.apply('pro'),e=>e.code==='42501');
});
