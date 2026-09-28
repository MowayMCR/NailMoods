import { createNativeCache } from './nativeCache.js';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { Keyboard } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';
import { createNativeStorage } from './nativeStorage.js';
import { setNativeServices, nativeServices, nativeNotice } from './state.js';
import { queueAuthUrl } from './authLinks.js';
import { installNativeMedia, acceptRestoredCamera, purgeAccountMedia } from './nativeMedia.js';
import { backAction } from './back.js';
import './native.css';

export async function initializeNative(){
  const persistent=await createNativeStorage();
  setNativeServices({...persistent,cache:await createNativeCache(),purgeAccountMedia,principal:'boot',checkpoint:null});
  document.documentElement.classList.add('nm-native');
  await installNativeMedia();
  nativeServices().purgeAccount=async id=>{
    await Preferences.set({key:'pending-account-cleanup',value:id});
    await Promise.all([purgeAccountMedia(id),nativeServices().cache.purgeAccount(id),persistent.storage.purgeAccount(id)]);
    await Preferences.remove({key:'pending-account-cleanup'});
  };
  const cleanup=(await Preferences.get({key:'pending-account-cleanup'})).value;
  if(cleanup)await nativeServices().purgeAccount(cleanup);
  await App.addListener('appRestoredResult',result=>{void acceptRestoredCamera(result).catch(()=>nativeNotice('La photo reste en attente de récupération. Réessaie.'));});
  const environment=import.meta.env.VITE_DEPLOYMENT_ENV;
  await App.addListener('appUrlOpen',({url})=>{queueAuthUrl(url,environment);});
  const launch=await App.getLaunchUrl();if(launch?.url)queueAuthUrl(launch.url,environment);
  const connectivity=({connected})=>{document.documentElement.classList.toggle('nm-offline',!connected);window.dispatchEvent(new Event(connected?'online':'offline'));window.dispatchEvent(new CustomEvent('nm-native-connectivity',{detail:connected}));};
  const current=await Network.getStatus();connectivity(current);
  await Network.addListener('networkStatusChange',connectivity);
  await App.addListener('appStateChange',({isActive})=>{
    if(!isActive){void persistent.storage.flush();void nativeServices().checkpoint?.();}
    window.dispatchEvent(new CustomEvent('nm-native-state',{detail:{isActive}}));
    if(isActive){void persistent.storage.flush();void Network.getStatus().then(connectivity);}
  });
  let keyboard=false,nativeKeyboard=false;
  // adjustResize can shrink innerHeight and visualViewport together on Android.
  // Native events remain authoritative when their difference is therefore zero.
  const visible=()=>{const height=window.visualViewport?.height||innerHeight;document.documentElement.style.setProperty('--nm-visible-height',height+'px');keyboard=nativeKeyboard||innerHeight-height>130;document.documentElement.classList.toggle('nm-keyboard',keyboard);};
  await Keyboard.addListener('keyboardWillShow',()=>{nativeKeyboard=true;visible();});
  await Keyboard.addListener('keyboardDidHide',()=>{nativeKeyboard=false;visible();});
  window.visualViewport?.addEventListener('resize',visible);visible();
  document.addEventListener('focusin',event=>{if(event.target.matches('input,textarea,[contenteditable]'))setTimeout(()=>event.target.scrollIntoView({block:'nearest',behavior:'smooth'}),300);});
  await App.addListener('backButton',async({canGoBack})=>{
    const focused=document.activeElement;
    const action=backAction({keyboard:keyboard||Boolean(focused?.matches('input:not([type=file]),textarea,[contenteditable]')),dialog:document.querySelector('.nmDialogHost:not([hidden])'),canGoBack,hash:location.hash});
    if(action==='keyboard'){focused?.blur();try{await Keyboard.hide();}catch{}return;}
    if(action==='dialog'){document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return;}
    try{if(!await persistent.storage.flush())return;await nativeServices().checkpoint?.();}
    catch{nativeNotice('La sauvegarde locale reste à reprendre. Reste sur cet écran et réessaie avant de fermer.');return;}
    if(action==='history')history.back();else if(action==='home')location.hash='accueil';else await App.minimizeApp();
  });
  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.download)return;
    const url=new URL(anchor.href,location.href);
    if(['https:','http:'].includes(url.protocol)&&url.origin!==location.origin){event.preventDefault();void Browser.open({url:url.href}).catch(()=>nativeNotice('Le lien ne peut pas être ouvert.'));}
  });
}
