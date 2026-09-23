import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accountOfferService,betaTierService,clearPendingAccountOffer,pendingAccountOffer,rememberPendingAccountOffer,tierCapabilities} from '../src/cloud/betaTier.js';

test('Free owns personal data; Plus/Pro unlock social and photos',()=>{
 for(const tier of ['free','plus','pro',undefined,'admin','PLUS']){
  const rights=tierCapabilities(tier);
  assert.equal(rights.personal,['free','plus','pro'].includes(tier));
  assert.equal(rights.social,['plus','pro'].includes(tier));
  assert.equal(rights.photos,['plus','pro'].includes(tier));
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
test('account offer selection uses the protected RPC and validates the tier',async()=>{
 const calls=[];
 const service=accountOfferService({rpc:async(name,args)=>{calls.push({name,args});return {data:{tier:args?.p_tier||'free',canChoose:true},error:null};}});
 assert.equal((await service.state()).tier,'free');
 assert.equal((await service.choose('plus')).tier,'plus');
 assert.deepEqual(calls,[{name:'account_offer_state',args:undefined},{name:'choose_beta_account_tier',args:{p_tier:'plus'}}]);
 assert.throws(()=>service.choose('admin'),/invalide/);
});
test('beta invitation redemption sends only a normalized one-use code',async()=>{
 const calls=[];const service=accountOfferService({rpc:async(name,args)=>{calls.push({name,args});return {data:{tier:'plus'},error:null};}});
 await service.redeem('nm-a1b2c3-d4e5f6');
 assert.deepEqual(calls,[{name:'redeem_beta_invitation',args:{p_code:'NM-A1B2C3-D4E5F6'}}]);
 assert.throws(()=>service.redeem('not-a-code'),/Code d’invitation invalide/);
});
test('pending signup offer is bound to the new Auth user and stays small',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 assert.equal(rememberPendingAccountOffer(storage,'user-a','pro'),true);
 assert.deepEqual(pendingAccountOffer(storage,'user-a'),{userId:'user-a',tier:'pro'});
 assert.equal(pendingAccountOffer(storage,'user-b'),null);
 assert.ok([...values.values()][0].length<100);
 clearPendingAccountOffer(storage);assert.equal(pendingAccountOffer(storage,'user-a'),null);
 assert.equal(rememberPendingAccountOffer({setItem(){throw new Error('quota');}},'user-a','plus'),false);
});
test('account offer migration keeps entitlement private and direct tier writes forbidden',()=>{
 const sql=readFileSync(new URL('../phase12/account-offer-selection.sql',import.meta.url),'utf8');
 const sync=readFileSync(new URL('../phase12/account-entitlement-sync.sql',import.meta.url),'utf8');
 assert.match(sql,/private\.account_entitlements/);
 assert.match(sql,/private\.account_tier_selection_events/);
 assert.match(sql,/consent_required/);
 assert.match(sql,/adult_confirmed_at/);
 assert.match(sql,/choose_beta_account_tier/);
 assert.match(sql,/has_column_privilege\('authenticated','public\.profiles','account_tier','UPDATE'\)/);
 assert.doesNotMatch(sql,/grant\s+update\s*\(\s*account_tier/i);
 assert.match(sync,/after insert or update of account_tier/i);
 assert.match(sync,/then private\.account_entitlements\.source/);
 assert.doesNotMatch(sync,/grant\s+(insert|update|delete).*account_entitlements/i);
});
