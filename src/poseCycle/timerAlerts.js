import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {createTimerScheduler} from './timerScheduler.js';
export const tutorialTimerScheduler=createTimerScheduler(LocalNotifications);
export const isNativeTimer=()=>Capacitor.isNativePlatform();
let audio,listener,pendingLink;
export async function prepareTimerAlerts(){
 if(isNativeTimer()){
  await setupTimerAlerts();const p=await LocalNotifications.requestPermissions();return p.display==='granted'?'native':'permission';
 }
 const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(Context){audio??=new Context();await audio.resume();}
 return audio?.state==='running'?'foreground':'visual';
}
export async function setupTimerAlerts(){if(!isNativeTimer())return;
 if(Capacitor.getPlatform()==='android')await LocalNotifications.createChannel({id:'nailmoods-timer',name:'Minuteurs NailMoods',description:'La fin du temps que tu as choisi',importance:4,visibility:-1,vibration:true});
 if(!listener)listener=LocalNotifications.addListener('localNotificationActionPerformed',e=>{if(e.notification.extra?.scope==='pose-timer'){pendingLink=e.notification.extra;window.dispatchEvent(new Event('nm-timer-link'));}});
}
export function takeTimerLink(userId,workspaceId,sessions){if(!pendingLink)return null;const p=pendingLink;pendingLink=null;return p.userId===userId&&p.workspaceId===workspaceId&&sessions.some(s=>s.id===p.sessionId)?p.sessionId:null;}
export function signalTimer(){
 // The OS handles sound/vibration on native. Avoid a second simultaneous alert.
 if(isNativeTimer())return;
 navigator.vibrate?.([120,70,120]);
 if(audio?.state==='running'){const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=660;g.gain.setValueAtTime(0.08,audio.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audio.currentTime+.45);o.start();o.stop(audio.currentTime+.45);}
}

export async function clearTutorialTimerNotifications(){tutorialTimerScheduler.invalidate();if(isNativeTimer())await tutorialTimerScheduler.clear();}
