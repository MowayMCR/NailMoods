import React, {createContext,useContext,useEffect,useState,useRef,useCallback} from 'react';
import {Bell,MessageCircle,ChevronRight} from 'lucide-react';
const SocialContext=createContext(null);
export const useSocial=()=>useContext(SocialContext);
export async function socialCall(client,action,data={}) {
 const r=await client.rpc('nm_social',{p_action:action,p_data:data});if(r.error)throw r.error;return r.data;
}
export function SocialProvider({client,userId,tier,children}) {
 const [rows,setRows]=useState([]),[notifications,setNotifications]=useState([]),[count,setCount]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[view,setView]=useState(null),[identity,setIdentity]=useState(null),[identityOpen,setIdentityOpen]=useState(false);
 const mounted=useRef(false),loading=useRef(false);
 const refreshIdentity=useCallback(async()=>{if(!client||!userId)return;const r=await client.from('profiles').select('username,display_name,discovery_visibility').eq('id',userId).single();if(mounted.current&&!r.error)setIdentity(r.data);},[client,userId]);
 const refresh=useCallback(async()=>{
  if(!client||!userId||loading.current)return;loading.current=true;setBusy(true);
  try {
   const [relations,notices]=await Promise.all([socialCall(client,'list'),client.from('user_notifications').select('id,kind,actor_id,created_at,read_at',{count:'exact'}).eq('user_id',userId).is('read_at',null).order('created_at',{ascending:false}).limit(50)]);
   if(notices.error)throw notices.error;if(!mounted.current)return;
   setRows(relations);setNotifications(notices.data||[]);setCount(notices.count||0);setError('');
  }catch{if(mounted.current)setError('Les messages et notifications ne sont pas à jour. Réessaie.');}
  finally{loading.current=false;if(mounted.current)setBusy(false);}
 },[client,userId]);
 useEffect(()=>{mounted.current=true;refresh();refreshIdentity();const visible=()=>{if(document.visibilityState==='visible')refresh();};const timer=client?setInterval(visible,20000):null;document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);return()=>{mounted.current=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);};},[refresh,refreshIdentity,client]);
 async function markRead(ids){if(!ids.length)return;const r=await client.from('user_notifications').update({read_at:new Date().toISOString()}).eq('user_id',userId).in('id',ids);if(r.error){setError('Impossible de marquer ces notifications comme lues.');return;}await refresh();}
 const unread=rows.filter(r=>r.status==='accepted').reduce((n,r)=>n+Number(r.unread||0),0);
 return <SocialContext.Provider value={{client,userId,tier,rows,notifications,count,unread,error,busy,refresh,markRead,view,setView,identity,refreshIdentity,identityOpen,setIdentityOpen}}>{children}</SocialContext.Provider>;
}
export function NotificationButton(){const s=useSocial();if(!s?.userId)return null;return <button className="round notificationButton" aria-label={`Notifications${s.count?`, ${s.count} non lues`:''}`} onClick={()=>s.setView('notifications')}><Bell/>{s.count>0&&<span className="nmBadge">{s.count>99?'99+':s.count}</span>}</button>;}
export function MessengerTile(){const s=useSocial();if(!s?.userId)return null;return <button className="nmShortcut messengerTile" onClick={()=>s.setView('accepted')}><MessageCircle/><span><b>Messagerie</b><small>{s.unread?`${s.unread} message${s.unread>1?'s':''} non lu${s.unread>1?'s':''}`:'Mes échanges et les projets partagés'}</small></span>{s.unread>0&&<span className="nmBadge">{s.unread>99?'99+':s.unread}</span>}<ChevronRight/></button>;}
