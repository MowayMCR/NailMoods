import {adAllowed,TEST_REWARDED_UNITS,TEST_BANNER_UNITS} from './policy.js';
const consentKey='nm-ads-refused';

// One native ad operation at a time; invalidation also covers in-flight SDK calls.
export function createAdController({platform,preferences,loadSDK}){
 let refused=false,running=false,revision=0,sdk=null,banner=false;
 let cleanup=Promise.resolve(),preferenceWrites=Promise.resolve();
 function writePreference(operation){preferenceWrites=preferenceWrites.catch(()=>{}).then(operation);return preferenceWrites;}
 function removeBanner(){
  cleanup=cleanup.catch(()=>{}).then(async()=>{if(sdk&&banner){await sdk.AdMob.removeBanner();banner=false;}});
  return cleanup;
 }
 function stop(){revision++;return removeBanner();}
 function check(token){if(refused||token!==revision)throw Error('ads_cancelled');}
 async function eligible(client,placement,token){
  check(token);
  const {data,error}=await client.rpc('nm_ad_state',{p_platform:platform});
  check(token);
  if(error||!adAllowed({platform,rights:data?.rights,config:data?.config,placement,consent:true}))throw Error('ads_unavailable');
 }
 async function show(client,format){
  // Take the lock before the first await, including preference and rights checks.
  if(running||banner||refused||!['ios','android'].includes(platform))throw Error('ads_unavailable');
  running=true;const token=revision,placement=format==='banner'?'banner_opt_in':'rewarded_opt_in';
  try{
   await cleanup;check(token);
   if((await preferences.get({key:consentKey})).value==='true')throw Error('ads_refused');
   await eligible(client,placement,token);
   sdk=await loadSDK();check(token);
   let consent=await sdk.AdMob.requestConsentInfo();check(token);
   if(consent.isConsentFormAvailable&&consent.status===sdk.AdmobConsentStatus.REQUIRED){consent=await sdk.AdMob.showConsentForm();check(token);}
   if(!consent.canRequestAds)throw Error('ads_consent_required');
   await eligible(client,placement,token);
   await sdk.AdMob.initialize({initializeForTesting:true});check(token);
   if(format==='banner'){
    // Fixed test banner, isolated from app controls by the test dialog.
    banner=true;
    await sdk.AdMob.showBanner({adId:TEST_BANNER_UNITS[platform],isTesting:true,npa:true,adSize:'BANNER',position:'TOP_CENTER'});
    // stop() may have run while the native view was being attached.
    banner=true;check(token);
   }else{
    await sdk.AdMob.prepareRewardVideoAd({adId:TEST_REWARDED_UNITS[platform],isTesting:true,npa:true});check(token);
    await eligible(client,placement,token);
    await sdk.AdMob.showRewardVideoAd();check(token);
   }
   return {testOnly:true,credited:false};
  }catch(error){if(format==='banner')await removeBanner();throw error;}
  finally{running=false;}
 }
 async function decline(){refused=true;const stopped=stop();await Promise.all([writePreference(()=>preferences.set({key:consentKey,value:'true'})),stopped]);}
 async function reconsider(){const stopped=stop(),token=revision;await Promise.all([writePreference(()=>preferences.remove({key:consentKey})),stopped]);if(token===revision)refused=false;}
 async function withdraw(){
  await decline();
  if(['ios','android'].includes(platform)){
   sdk=await loadSDK();const info=await sdk.AdMob.requestConsentInfo();
   if(info.privacyOptionsRequirementStatus==='REQUIRED')await sdk.AdMob.showPrivacyOptionsForm();
  }
 }
 return {showRewarded:client=>show(client,'rewarded'),showBanner:client=>show(client,'banner'),stop,decline,reconsider,withdraw};
}
