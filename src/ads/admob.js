import {Capacitor} from '@capacitor/core';
import {Preferences} from '@capacitor/preferences';
import {createAdController} from './controller.js';
const ads=createAdController({platform:Capacitor.getPlatform(),preferences:Preferences,loadSDK:()=>import('@capacitor-community/admob')});
export const demoRewardedAd=client=>ads.showRewarded(client);
export const demoBannerAd=client=>ads.showBanner(client);
export const stopAds=()=>ads.stop();
export const withdrawAdConsent=()=>ads.withdraw();
export const declineAds=()=>ads.decline();
export const reconsiderAds=()=>ads.reconsider();
// A return to the app never resumes an ad automatically.
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)void stopAds().catch(()=>{});});
if(Capacitor.isNativePlatform())import('@capacitor/app').then(({App})=>App.addListener('appStateChange',({isActive})=>{if(!isActive)void stopAds().catch(()=>{});})).catch(()=>{});
