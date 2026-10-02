import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedSubscription, verifyAndPersist, purchaseUrls } from '../supabase/functions/_shared/googlePlayCore.mjs';
import { billingNotice, billingPeriodLabel, hasPaidGoogleAccess } from '../src/cloud/billingPresentation.js';
const config = {accountId:'account-hash',allowedPlans:{nailmoods_plus:'monthly',nailmoods_pro:'monthly'},expectedProduct:'nailmoods_plus'};
const payload = state => ({subscriptionState:state || 'SUBSCRIPTION_STATE_ACTIVE',acknowledgementState:'ACKNOWLEDGEMENT_STATE_PENDING',
  externalAccountIdentifiers:{obfuscatedExternalAccountId:'account-hash'},
  lineItems:[{productId:'nailmoods_plus',offerDetails:{basePlanId:'monthly'},expiryTime:'2030-01-01T00:00:00Z',autoRenewingPlan:{autoRenewEnabled:true}}]});
test('Google product, account and plan are checked before any grant',()=>{
  assert.equal(verifiedSubscription(payload(),config).items[0].productId,'nailmoods_plus');
  assert.throws(()=>verifiedSubscription(payload(),{...config,expectedProduct:'nailmoods_pro'}),/product_mismatch/);
  assert.throws(()=>verifiedSubscription(payload(),{...config,accountId:'other'}),/account_mismatch/);
  assert.throws(()=>verifiedSubscription(payload(),{...config,allowedPlans:{}}),/unrecognized/);
  const noIdentity=payload();delete noIdentity.externalAccountIdentifiers;
  assert.throws(()=>verifiedSubscription(noIdentity,config),/account_mismatch/);
  const noExpiry=payload();delete noExpiry.lineItems[0].expiryTime;
  assert.throws(()=>verifiedSubscription(noExpiry,config),/invalid_expiry/);
});
test('cancel, grace, pending and hold preserve distinct server states',()=>{
  for(const [google,expected] of [['CANCELED','canceled'],['IN_GRACE_PERIOD','grace'],['PENDING','pending'],['ON_HOLD','on_hold'],['PAUSED','paused'],['EXPIRED','expired']])
    assert.equal(verifiedSubscription(payload('SUBSCRIPTION_STATE_'+google),config).status,expected);
  assert.throws(()=>verifiedSubscription(payload('UNKNOWN'),config),/unsupported/);
});
test('failed acknowledgement is not recorded as a success; retry can complete it',async()=>{
  const saved=[],urls=[];
  const result=await verifyAndPersist({...config,packageName:'com.nailmoods.app',purchaseToken:'a/b',
    fetchGoogle:async(url,init)=>{urls.push(url);return init?{ok:false}:{ok:true,json:async()=>payload()};},
    persist:async(record)=>{saved.push(record);return {tier:'plus'};}});
  assert.equal(saved.length,1);assert.equal(saved[0].acknowledgedAt,null);assert.equal(result.acknowledged,false);
  assert.match(urls[1],/\/purchases\/subscriptions\/nailmoods_plus\/tokens\/a%2Fb:acknowledge$/);
  const success=[];
  await verifyAndPersist({...config,packageName:'com.nailmoods.app',purchaseToken:'token',
    fetchGoogle:async(_,init)=>init?{ok:true}:{ok:true,json:async()=>payload()},
    persist:async r=>{success.push(r);return {tier:'plus'};}});
  assert.equal(success.length,2);assert.ok(success[1].acknowledgedAt);
});
test('unverified or mismatched purchases never reach persistence',async()=>{
  let writes=0;
  const common={...config,packageName:'com.nailmoods.app',purchaseToken:'token',persist:async()=>writes++};
  await assert.rejects(verifyAndPersist({...common,fetchGoogle:async()=>({ok:false})}),/unavailable/);
  await assert.rejects(verifyAndPersist({...common,expectedProduct:'nailmoods_pro',fetchGoogle:async()=>({ok:true,json:async()=>payload()})}),/product_mismatch/);
  assert.equal(writes,0);
});
test('pending payment is never acknowledged',async()=>{
  let calls=0;
  const result=await verifyAndPersist({...config,packageName:'com.nailmoods.app',purchaseToken:'token',
    fetchGoogle:async()=>{calls++;return {ok:true,json:async()=>payload('SUBSCRIPTION_STATE_PENDING')};},persist:async()=>({tier:'free'})});
  assert.equal(calls,1);assert.equal(result.acknowledged,false);
});
test('UI messages depend on server entitlement and paid-through expiry',()=>{
  const canceled={subscriptions:[{status:'canceled',items:[{expiresAt:'2030-01-01T00:00:00Z'}]}]};
  assert.equal(hasPaidGoogleAccess(canceled,Date.parse('2029-01-01')),true);
  assert.equal(hasPaidGoogleAccess(canceled,Date.parse('2031-01-01')),false);
  assert.match(billingNotice([],{},true),/Aucun abonnement actif/);
  assert.match(billingNotice([{purchaseState:'pending'}],{}),/en attente/);
  assert.match(billingNotice({failures:['unavailable']},{},true),/incomplète/);
  assert.equal(billingPeriodLabel('P1Y'),'an');assert.equal(billingPeriodLabel('P3M'),'');
});
test('API endpoints use encoded tokens and reject invalid package names',()=>{
  assert.ok(purchaseUrls('com.nailmoods.app','x?y','nailmoods_plus').get.endsWith('/x%3Fy'));
  assert.throws(()=>purchaseUrls('../bad','token','id'),/invalid_package/);
});
