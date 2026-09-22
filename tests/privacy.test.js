import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../src/cloud/auth.js';
import { DENIED, PRIVACY_VERSION, signupConsent, normalizeChoices, permissions, advertisingContext, availableChoices, readGuestConsent } from '../src/privacy/policy.js';
import { clearAccountCache, privacyService } from '../src/privacy/service.js';
const enabled={analytics:true,ads:true,personalizedAds:true};
const yes={privacy_version:PRIVACY_VERSION,analytics_consent:true,ads_consent:true,personalized_ads_consent:true};
test('signup rejects absent or non-boolean terms before making any Auth call',()=>{
 let calls=0;const auth=createAuthService({auth:{signUp(){calls++;}}},'https://example.test');
 for(const acceptance of [undefined,false,'true',1])assert.throws(()=>auth.signUp('test@example.test','password',acceptance));
 assert.equal(calls,0);
 assert.deepEqual(signupConsent(true,yes),{terms_accepted:true,terms_version:'0.3-beta',privacy_version:'0.4-beta',analytics_consent:true,ads_consent:false,personalized_ads_consent:false});
});
test('no unselected provider gets anticipatory permission',()=>{
 assert.deepEqual(availableChoices(yes),{analytics_consent:true,ads_consent:false,personalized_ads_consent:false});
 assert.deepEqual(permissions({tier:'free',screen:'home',consent:yes}),{analytics:true,ads:false,personalizedAds:false});
});
test('advertising and personalization are distinct; withdrawal takes immediate effect',()=>{
 const args={tier:'free',screen:'home',technologies:enabled};
 assert.equal(permissions({...args,consent:yes}).ads,true);
 assert.equal(permissions({...args,consent:{...yes,personalized_ads_consent:false}}).personalizedAds,false);
 assert.equal(permissions({...args,consent:{...yes,ads_consent:false}}).personalizedAds,false);
 assert.equal(permissions({...args,consent:{...yes,...DENIED}}).ads,false);
 assert.equal(normalizeChoices({ads_consent:false,personalized_ads_consent:true}).personalized_ads_consent,false);
});
test('Plus, Pro and professional contexts cannot show ads, nor protected flows',()=>{
 for(const tier of ['plus','pro',undefined])assert.equal(permissions({tier,consent:yes,technologies:enabled,screen:'home'}).ads,false);
 for(const screen of ['scan','tutorial','journal','conversation','profile'])assert.equal(permissions({tier:'free',consent:yes,technologies:enabled,screen}).ads,false);
 for(const workspaceKind of ['pro','institute','creator'])assert.equal(permissions({tier:'free',consent:yes,technologies:enabled,screen:'home',workspaceKind}).ads,false);
});
test('unknown or outdated notice denies optional services; advertising context excludes private data',()=>{
 assert.equal(permissions({tier:'free',screen:'home',consent:{...yes,privacy_version:'old'},technologies:enabled}).ads,false);
 const context=advertisingContext({tier:'free',consent:yes,screen:'home',messages:['secret'],journal:'secret',photo:'secret',preferences:'secret'});
 assert.deepEqual(Object.keys(context),['allowed','placement']);assert.ok(!JSON.stringify(context).includes('secret'));
 assert.equal(readGuestConsent({getItem:()=>'{broken'}),null);
});
test('account cleanup never deletes guests, tokens or another account',()=>{
 const map=new Map([['nm-cloud-v1:a:w','private'],['nm-cloud-v1:a:w:backup:1','private'],['nailmoods_supabase_migration_done:a:w','true'],['nm-cloud-v1:b:w','other'],['nm-products','guest'],['nailmoods-auth-v1','sdk-session']]);
 const storage={get length(){return map.size;},key:i=>[...map.keys()][i],removeItem:k=>map.delete(k)};
 clearAccountCache(storage,'a');assert.deepEqual([...map.keys()],['nm-cloud-v1:b:w','nm-products','nailmoods-auth-v1']);
});
test('delete requires typed confirmation and an authenticated user; failure never reports success',async()=>{
 let calls=0;const service=privacyService({auth:{getUser:async()=>({data:{user:{id:'a'}}})},rpc:async()=>{calls++;return {error:new Error('denied')};}});
 await assert.rejects(service.deleteAccount(''),/SUPPRIMER/);assert.equal(calls,0);
 await assert.rejects(service.deleteAccount('SUPPRIMER'),/denied/);assert.equal(calls,1);
});
test('export paginates owned records only and rejects an account switch',async()=>{
 const calls=[];let authCalls=0,switched=false;
 const client={rpc:async(name)=>({data:name==='nm_support'?{items:[],hasMore:false}:[]}),auth:{getUser:async()=>({data:{user:{id:switched&&++authCalls>1?'b':'a',email:'test@example.test'}}})},from(table){
  const chain={select(){return chain;},eq(column,value){calls.push({table,column,value});return chain;},order(column){calls.at(-1).order=column;return chain;},async range(start,end){
   const count=table==='user_products'?(start===0?500:1):1;
   return {data:Array.from({length:count},(_,i)=>({id:`${table}-${start+i}`,owner:'a'}))};
  }};return chain;
 }};
 const result=await privacyService(client).exportData();assert.equal(result.user_products.length,501);
 assert.ok(calls.every(c=>c.value==='a'));assert.ok(calls.some(c=>c.table==='pro_follows'&&c.order==='pro_profile_id'));
 assert.ok(!Object.keys(result).some(k=>/token|password|session/.test(k)));
 switched=true;authCalls=0;await assert.rejects(privacyService(client).exportData(),/compte a changé/);
});
test('consent is loaded from the server again after reconnection, never borrowed from a guest',async()=>{
 let reads=0;const server={...yes,...DENIED,user_id:'a',terms_version:'0.1-beta'};
 const client={auth:{getUser:async()=>({data:{user:{id:'a'}}})},from(table){assert.equal(table,'user_consents');const q={select(){return q;},eq(field,id){assert.equal(field,'user_id');assert.equal(id,'a');return q;},order(){return q;},limit(){return q;},async maybeSingle(){reads++;return {data:server};}};return q;}};
 assert.equal((await privacyService(client).load()).ads_consent,false);
 assert.equal((await privacyService(client).load()).user_id,'a');assert.equal(reads,2);
});
test('privacy confirmation records an explicit age band independently from terms',async()=>{
 let args;
 const client={auth:{getUser:async()=>({data:{user:{id:'legacy'}}})},rpc:async(name,value)=>{args={name,value};return {data:{user_id:'legacy',adult_confirmed_at:'now',terms_version:'0.1-beta'}};}};
 await privacyService(client).save(DENIED,true,'18_plus');
 assert.equal(args.name,'record_privacy_choices');
 assert.equal(args.value.p_accept_terms,true);
 assert.equal(args.value.p_age_band,'18_plus');
 await privacyService(client).save(DENIED);
 assert.equal(args.value.p_accept_terms,false);
 assert.equal(args.value.p_age_band,null);
});
test('signup starts Free and reserves age confirmation for an offer change',()=>{
 assert.deepEqual(signupConsent(true,{}),{terms_accepted:true,terms_version:'0.3-beta',privacy_version:'0.4-beta',analytics_consent:false,ads_consent:false,personalized_ads_consent:false});
 assert.throws(()=>signupConsent(false,{}),/Conditions/);
});
test('deleted message authors never expose cached profile identity',async()=>{
 const {messageAuthor}=await import('../src/privacy/deletedIdentity.js');
 assert.deepEqual(messageAuthor({sender_id:null,author:{name:'old'}},{display_name:'old',username:'old',avatar_url:'private'}),{displayName:'Compte supprimé',handle:null,avatarUrl:null,profileId:null});
});
