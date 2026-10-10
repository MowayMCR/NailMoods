import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshAppleAccount} from '../src/cloud/refreshAppleAccount.js';

test('NailMoods access refreshes despite a StoreKit connection failure', async()=>{
  let refreshed=0;
  await assert.rejects(refreshAppleAccount({
    reconcile:async()=>{throw Error('environment_unavailable');},
    refresh:async()=>{refreshed++;}, isActive:()=>true,
  }), /environment_unavailable/);
  assert.equal(refreshed,1);
});
test('successful StoreKit reconciliation precedes account refresh',async()=>{
  const order=[];
  await refreshAppleAccount({reconcile:async()=>{order.push('apple');},refresh:async()=>{order.push('account');},isActive:()=>true});
  assert.deepEqual(order,['apple','account']);
});
test('an abandoned session cannot refresh another account',async()=>{
  let refreshed=false;
  await refreshAppleAccount({reconcile:async()=>{},refresh:async()=>{refreshed=true;},isActive:()=>false});
  assert.equal(refreshed,false);
});
