import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshGooglePlayAccount} from '../src/cloud/refreshGooglePlayAccount.js';

test('Android refreshes changed server access even if Google Play fails',async()=>{
  let refreshed=0;
  await assert.rejects(refreshGooglePlayAccount({
    reconcile:async()=>{throw Error('store_unavailable');},
    read:async()=>({tier:'free'}), displayedTier:()=> 'pro',
    refresh:async()=>{refreshed++;}, isActive:()=>true,
  }),/store_unavailable/);
  assert.equal(refreshed,1);
});
test('Android does not reload unchanged access',async()=>{
  let refreshed=false;
  await refreshGooglePlayAccount({reconcile:async()=>{},read:async()=>({tier:'pro'}),displayedTier:()=> 'pro',refresh:async()=>{refreshed=true;},isActive:()=>true});
  assert.equal(refreshed,false);
});
test('Android discards access results after account session ends',async()=>{
  let alive=true,refreshed=false;
  await refreshGooglePlayAccount({reconcile:async()=>{},read:async()=>{alive=false;return {tier:'free'};},displayedTier:()=> 'pro',refresh:async()=>{refreshed=true;},isActive:()=>alive});
  assert.equal(refreshed,false);
});
