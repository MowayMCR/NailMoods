import {Capacitor} from '@capacitor/core';
import {Preferences} from '@capacitor/preferences';
const consentKey='nm-ads-refused';
import {adAllowed,TEST_REWARDED_UNITS} from './policy';
let optedOut=false,running=false;
export async function demoRewardedAd(client,loadSDK=()=>import('@capacitor-community/admob')){
 if(running||optedOut||(await Preferences.get({key:consentKey})).value==='true')throw Error('ads_unavailable');
 const platform=Capacitor.getPlatform();
 const {data:state,error}=await client.rpc('nm_ad_state',{p_platform:platform});if(error)throw error;
 if(!adAllowed({platform,rights:state?.rights,config:state?.config,placement:'rewarded_opt_in',consent:true}))throw Error('ads_unavailable');
 running=true;
 try{
  const {AdMob,AdmobConsentStatus}=await loadSDK();
  let consent=await AdMob.requestConsentInfo();
  if(consent.isConsentFormAvailable&&consent.status===AdmobConsentStatus.REQUIRED)consent=await AdMob.showConsentForm();
  if(!consent.canRequestAds||optedOut)throw Error('ads_consent_required');
  // Recheck the remote kill switch and account rights immediately before loading.
  const current=await client.rpc('nm_ad_state',{p_platform:platform});if(current.error||!adAllowed({platform,rights:current.data?.rights,config:current.data?.config,placement:'rewarded_opt_in',consent:!optedOut}))throw Error('ads_unavailable');
  await AdMob.initialize({initializeForTesting:true});
  await AdMob.prepareRewardVideoAd({adId:TEST_REWARDED_UNITS[platform],isTesting:true,npa:true});
  if(optedOut)throw Error('ads_consent_required');
  await AdMob.showRewardVideoAd();
  // A demo SDK reward is not a server-confirmed generation credit.
  return {testOnly:true,credited:false};
 }finally{running=false;}
}
export async function withdrawAdConsent(loadSDK=()=>import('@capacitor-community/admob')){
 optedOut=true;await Preferences.set({key:consentKey,value:'true'});
 if(Capacitor.isNativePlatform()){const {AdMob}=await loadSDK();await AdMob.showPrivacyOptionsForm();}
}
export async function declineAds(){optedOut=true;await Preferences.set({key:consentKey,value:'true'});}
export async function reconsiderAds(){await Preferences.remove({key:consentKey});optedOut=false;}
