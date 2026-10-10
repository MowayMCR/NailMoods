import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdController} from '../src/ads/controller.js';
import {TEST_BANNER_UNITS,TEST_REWARDED_UNITS} from '../src/ads/policy.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function fixture(platform='ios'){
 const calls=[],store=new Map();let state={rights:{effectiveTier:'free',instituteActive:false},config:{enabled:true,testOnly:true}};
 const preferences={get:async({key})=>({value:store.get(key)}),set:async({key,value})=>{store.set(key,value);},remove:async({key})=>{store.delete(key);}};
 const AdMob={};for(const name of ['initialize','prepareRewardVideoAd','showRewardVideoAd','showBanner','removeBanner','showPrivacyOptionsForm'])AdMob[name]=async options=>{calls.push([name,options]);};
 AdMob.requestConsentInfo=async()=>({canRequestAds:true,privacyOptionsRequirementStatus:'REQUIRED'});
 const client={rpc:async()=>({data:state})};
 const sdk={AdMob,AdmobConsentStatus:{REQUIRED:'REQUIRED'}};
 const ads=createAdController({platform,preferences,loadSDK:async()=>{calls.push(['load']);return sdk;}});
 return {ads,calls,store,AdMob,client,preferences,setState:next=>{state=next;}};
}
test('Android and iOS tests use only demo units and never credit an SDK reward',async()=>{
 for(const platform of ['android','ios']){
  const f=fixture(platform);
  assert.deepEqual(await f.ads.showRewarded(f.client),{testOnly:true,credited:false});
  assert.deepEqual(f.calls.find(([n])=>n==='prepareRewardVideoAd')[1],{adId:TEST_REWARDED_UNITS[platform],isTesting:true,npa:true});
  await f.ads.showBanner(f.client);
  assert.equal(f.calls.find(([n])=>n==='showBanner')[1].adId,TEST_BANNER_UNITS[platform]);
  await f.ads.stop();assert.equal(f.calls.at(-1)[0],'removeBanner');
 }
});
test('Stored refusal and paid, institute, web or disabled accounts never load the SDK',async()=>{
 const denied=fixture();denied.store.set('nm-ads-refused','true');await assert.rejects(denied.ads.showRewarded(denied.client));assert.deepEqual(denied.calls,[]);
 for(const state of [{rights:{effectiveTier:'pro'},config:{enabled:true,testOnly:true}},{rights:{effectiveTier:'free',instituteActive:true},config:{enabled:true,testOnly:true}},{rights:{effectiveTier:'free'},config:{enabled:false,testOnly:true}},{rights:{effectiveTier:'free'},config:{enabled:true,testOnly:false}}]){
  const f=fixture();f.setState(state);await assert.rejects(f.ads.showBanner(f.client));assert.deepEqual(f.calls,[]);
 }
 const web=fixture('web');await assert.rejects(web.ads.showBanner(web.client));assert.deepEqual(web.calls,[]);
});
test('Lock covers preference reads; two simultaneous taps cannot load two ads',async()=>{
 const f=fixture(),gate=deferred();f.preferences.get=()=>gate.promise;
 const first=f.ads.showRewarded(f.client);
 await assert.rejects(f.ads.showRewarded(f.client),/ads_unavailable/);
 gate.resolve({value:null});await first;
 assert.equal(f.calls.filter(([n])=>n==='showRewardVideoAd').length,1);
});
test('Consent refusal, SDK error and server kill switch prevent display',async()=>{
 const denied=fixture();denied.AdMob.requestConsentInfo=async()=>({status:'REQUIRED',isConsentFormAvailable:true,canRequestAds:false});
 denied.AdMob.showConsentForm=async()=>({canRequestAds:false});
 await assert.rejects(denied.ads.showRewarded(denied.client),/ads_consent_required/);assert.equal(denied.calls.some(([n])=>n==='initialize'),false);
 const offline=fixture();offline.AdMob.requestConsentInfo=async()=>{throw Error('network');};
 await assert.rejects(offline.ads.showRewarded(offline.client));assert.equal(offline.calls.some(([n])=>n==='initialize'),false);
 const killed=fixture();killed.AdMob.prepareRewardVideoAd=async()=>{killed.setState({rights:{effectiveTier:'free'},config:{enabled:false,testOnly:true}});};
 await assert.rejects(killed.ads.showRewarded(killed.client));assert.equal(killed.calls.some(([n])=>n==='showRewardVideoAd'),false);
});
test('Revoking or leaving during preparation prevents video display',async()=>{
 for(const action of ['decline','stop']){
  const f=fixture(),started=deferred(),gate=deferred();
  f.AdMob.prepareRewardVideoAd=async()=>{started.resolve();await gate.promise;};
  const pending=f.ads.showRewarded(f.client);await started.promise;await f.ads[action]();gate.resolve();
  await assert.rejects(pending,/ads_cancelled/);assert.equal(f.calls.some(([n])=>n==='showRewardVideoAd'),false);
 }
});
test('Late native banner attachment is removed after navigation or withdrawal',async()=>{
 const f=fixture(),started=deferred(),gate=deferred();let nativeVisible=false;
 f.AdMob.showBanner=async()=>{started.resolve();await gate.promise;nativeVisible=true;};
 f.AdMob.removeBanner=async()=>{nativeVisible=false;};
 const pending=f.ads.showBanner(f.client);await started.promise;await f.ads.decline();gate.resolve();
 await assert.rejects(pending,/ads_cancelled/);assert.equal(nativeVisible,false);
 await assert.rejects(f.ads.showBanner(f.client));
 await f.ads.reconsider();f.AdMob.showBanner=async()=>{};await f.ads.showBanner(f.client);await f.ads.stop();
});
test('Privacy options stay accessible while local ad requests remain blocked',async()=>{
 const f=fixture();await f.ads.showBanner(f.client);await f.ads.withdraw();
 assert.equal(f.store.get('nm-ads-refused'),'true');
 assert.ok(f.calls.find(([n])=>n==='removeBanner'));assert.ok(f.calls.find(([n])=>n==='showPrivacyOptionsForm'));
 await assert.rejects(f.ads.showRewarded(f.client));
});
test('A slow reconsider cannot override a newer refusal',async()=>{
 const f=fixture(),gate=deferred(),started=deferred();await f.ads.decline();
 f.preferences.remove=async({key})=>{started.resolve();await gate.promise;f.store.delete(key);};
 const reconsider=f.ads.reconsider();await started.promise;const decline=f.ads.decline();gate.resolve();
 await Promise.all([reconsider,decline]);assert.equal(f.store.get('nm-ads-refused'),'true');
 await assert.rejects(f.ads.showRewarded(f.client));
});
