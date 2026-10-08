import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAppleOffers,appleError} from '../src/cloud/appleBilling.js';
const state={manualPriority:true,manualTier:'pro'};
const client={rpc:async()=>({data:state,error:null})};
const products=[{productId:'nailmoods_plus',formattedPrice:'4,99 €'}];
const store={getProducts:async()=>({products})};
test('Apple environment failure keeps catalog and manually granted access visible',async()=>{
 const result=await loadAppleOffers(client,false,store,async()=>{throw Error('environment_unavailable');});
 assert.deepEqual(result.products,products);assert.equal(result.state,state);assert.equal(result.context,null);
 assert.equal(result.error.message,'environment_unavailable');
 assert.match(appleError(result.error),/Actualiser les offres/);
 assert.doesNotMatch(appleError(result.error),/ton achat reste/);
});
test('explicit refresh reaches environment recovery and enables server-approved offers',async()=>{
 const context={enabled:true,canPurchase:false,manualPriority:true};
 const result=await loadAppleOffers(client,true,store,async(c,refresh)=>{assert.equal(c,client);assert.equal(refresh,true);return context;});
 assert.equal(result.context,context);assert.equal(result.error,null);
});
test('missing Apple products is distinct from closed billing',async()=>{
 const result=await loadAppleOffers(client,false,{getProducts:async()=>({products:[]})},async()=>({enabled:true}));
 assert.equal(result.context.enabled,true);assert.equal(result.error.message,'product_unavailable');
});
test('server failure never authorizes purchase even when prices load',async()=>{
 const result=await loadAppleOffers(client,false,store,async()=>{throw Error('verification_unavailable');});
 assert.equal(result.context,null);assert.equal(result.products.length,1);
});
