import {useEffect,useRef} from 'react';
import {useStorage} from '../StorageContext';
import {tutorialTimerScheduler as scheduler,isNativeTimer,setupTimerAlerts,takeTimerLink,signalTimer} from './timerAlerts';
export default function TutorialTimerRuntime({tutorials,onOpen}){
 const storage=useStorage(),latest=useRef({tutorials,onOpen}),announced=useRef(new Set());latest.current={tutorials,onOpen};
 const session=tutorials.sessions.find(s=>s.status==='active'&&s.timer.status==='running'),uid=storage.userId,wid=storage.workspaceId;
 useEffect(()=>{announced.current.clear();if(isNativeTimer())void setupTimerAlerts().catch(()=>{});return()=>{scheduler.invalidate();if(isNativeTimer())void scheduler.clear().catch(()=>{});};},[uid,wid]);
 useEffect(()=>{const open=()=>{const v=latest.current,id=takeTimerLink(uid,wid,v.tutorials.sessions);if(id)v.onOpen(id);};open();window.addEventListener('nm-timer-link',open);return()=>window.removeEventListener('nm-timer-link',open);},[uid,wid]);
 useEffect(()=>{
 let active=true;
 const sync=()=>{if(!active)return;if(isNativeTimer())void scheduler.sync({session,userId:uid,workspaceId:wid}).then(result=>{if(active)window.dispatchEvent(new CustomEvent('nm-timer-status',{detail:result}));}).catch(()=>{if(active)window.dispatchEvent(new CustomEvent('nm-timer-status',{detail:{state:'error'}}));});};
 sync();document.addEventListener('visibilitychange',sync);window.addEventListener('nm-native-state',sync);
 return()=>{active=false;scheduler.invalidate();document.removeEventListener('visibilitychange',sync);window.removeEventListener('nm-native-state',sync);};
 },[uid,wid,session?.id,session?.timer.status,session?.timer.endsAt,session?.alertsEnabled]);
 useEffect(()=>{const tick=()=>{const s=latest.current.tutorials.sessions.find(s=>s.status==='active'&&s.timer.status==='running');if(!s||document.visibilityState!=='visible'||s.timer.endsAt>Date.now())return;const key=[s.id,s.timer.stepId,s.timer.endsAt].join(':');if(announced.current.has(key))return;announced.current.add(key);if(s.alertsEnabled)signalTimer();};const interval=setInterval(tick,250);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',tick);};},[]);
 return null;
}
