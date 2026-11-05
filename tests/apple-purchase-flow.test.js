import test from 'node:test';
import assert from 'node:assert/strict';
import {appleContext,applePurchaseBlocker,purchaseAppleTier,reconcileApple,verifyApplePurchase} from '../src/cloud/appleBilling.js';

// Isolated bridge/server fixtures, not an Apple Sandbox payment.
const product={productId:'nailmoods_plus',formattedPrice:'4,99 €',periodUnit:'month',periodValue:1};
const transaction={signedTransaction:'fixture-jws',transactionId:'100',environment:'Sandbox'};
function fixture({context={},rights={},rejectVerification=false,state='purchased'}={}){
 const calls=[];
 const prepared={enabled:true,canPurchase:true,eligible:true,environment:'Sandbox',sandboxEnabled:true,accountToken:'fixture-token',...context};
 const entitlement={tier:'plus',manualPriority:false,appleActive:true};
 const client={rpc:async()=>({data:{tier:'free',...rights}}),functions:{invoke:async(name,{body})=>{
  assert.equal(name,'apple-verify');calls.push(body.action||'verify');
  if(body.action==='prepare')return {data:prepared};
  if(body.action==='refresh')return {data:{ok:true,failed:0,entitlement}};
  assert.equal(body.environment,'Sandbox');assert.equal(body.signedTransaction,transaction.signedTransaction);
  return {data:rejectVerification?{error:'verification_unavailable'}:{ok:true,entitlement}};
 }}};
 const store={getEnvironment:async(...args)=>{calls.push(['environment',args]);return {environment:'Sandbox'};},getProducts:async()=>({products:[product]}),
  purchase:async args=>{calls.push('purchase');assert.equal(args.accountToken,prepared.accountToken);return {state,transaction};},
  finish:async args=>{assert.equal(args.transactionId,'100');calls.push('finish');},
  restorePurchases:async()=>{calls.push('sync');return {transactions:[transaction]};},
  unfinishedPurchases:async()=>{calls.push('unfinished');return {transactions:[transaction]};}};
 const contextLoader=c=>appleContext(c,false,store);
 return {client,store,calls,prepared,entitlement,dependencies:{store,contextLoader,isIOS:()=>true}};
}
test('a price refresh does not request AppTransaction authentication',async()=>{
 const f=fixture();await appleContext(f.client,true,f.store);
 assert.deepEqual(f.calls,[['environment',[]],'prepare']);
});
test('Free Sandbox purchase verifies server delivery before finishing and returns server Plus',async()=>{
 const f=fixture();const result=await purchaseAppleTier(f.client,'plus',product,f.dependencies);
 assert.deepEqual(f.calls,[['environment',[]],'prepare','purchase','verify','finish']);
 assert.equal(result.entitlement.tier,'plus');assert.equal(result.state,'verified');
});
test('failed server verification leaves transaction unfinished and never grants access',async()=>{
 const f=fixture({rejectVerification:true});await assert.rejects(purchaseAppleTier(f.client,'plus',product,f.dependencies),/verification_unavailable/);
 assert.ok(!f.calls.includes('finish'));
});
test('Sandbox routing cannot verify a Production or local Xcode transaction',async()=>{
 for(const environment of ['Production','Xcode']){const f=fixture();await assert.rejects(verifyApplePurchase(f.client,{...transaction,environment},'Sandbox',f.store),/purchase_environment_mismatch/);assert.deepEqual(f.calls,[]);}
});
for(const [name,context,message] of [
 ['unauthorized Sandbox account',{sandboxEnabled:false,canPurchase:false},'sandbox_account_required'],
 ['missing current consent',{eligible:false,canPurchase:false},'billing_ineligible'],
 ['closed billing',{enabled:false},'billing_not_configured'],
 ['other provider',{otherProviderActive:true,canPurchase:false},'other_subscription_active']
])test(`${name} prevents the native purchase sheet`,async()=>{
 const f=fixture({context});await assert.rejects(purchaseAppleTier(f.client,'plus',product,f.dependencies),new RegExp(message));assert.ok(!f.calls.includes('purchase'));
});
test('offered Pro remains protected even when a Sandbox account is allowed',async()=>{
 const f=fixture({rights:{tier:'pro',manualPriority:true,manualTier:'pro'}});
 await assert.rejects(purchaseAppleTier(f.client,'plus',product,f.dependencies),/manual_entitlement_active/);
 assert.ok(!f.calls.includes('purchase'));assert.equal(applePurchaseBlocker(f.prepared,{manualPriority:true}),'manual_entitlement_active');
});
test('restore verifies signed transactions and refreshes real server state without buying again',async()=>{
 const f=fixture();const result=await reconcileApple(f.client,true,f.dependencies);
 assert.deepEqual(f.calls,[['environment',[]],'prepare','sync','verify','finish','refresh']);
 assert.equal(result.entitlement.tier,'plus');assert.equal(result.failed,0);
});
test('background reconciliation never calls the interactive restore',async()=>{
 const f=fixture();await reconcileApple(f.client,false,f.dependencies);assert.ok(f.calls.includes('unfinished'));assert.ok(!f.calls.includes('sync'));
});
for(const state of ['pending','canceled'])test(`${state} purchase is not verified or granted locally`,async()=>{
 const f=fixture({state});assert.equal((await purchaseAppleTier(f.client,'plus',product,f.dependencies)).state,state);assert.ok(!f.calls.includes('verify'));assert.ok(!f.calls.includes('finish'));
});
