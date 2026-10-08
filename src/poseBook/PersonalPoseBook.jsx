import React,{useEffect,useState} from 'react';
import PoseBook from './PoseBook.jsx';
import {useSocial} from '../social/SocialContext.jsx';
import {poseBookCall} from './service.js';
export default function PersonalPoseBook({entries,renderVisual,onNavigate,onSave}){
 const social=useSocial(),[stats,setStats]=useState([]),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;if(!social?.client||!social.userId){setStats([]);return;}poseBookCall(social.client,'mine').then(rows=>{if(!Array.isArray(rows))throw Error('invalid_book_response');if(alive)setStats(rows);}).catch(()=>{if(alive)setNotice('Les appréciations ne sont pas à jour. Réessaie après synchronisation.');});return()=>{alive=false;};},[social?.client,social?.userId,entries]);
 const rows=entries.map(entry=>{const stat=stats.find(s=>s.localId===entry.id||s.id===entry.remoteId);return {...entry,...stat,id:entry.id,remoteId:stat?.id||entry.remoteId,kind:'journal',saved:entry.repeat,owner:true};});
 async function feature(entry){if(busy)return;if(!entry.remoteId){setNotice('Synchronise cette pose et publie-la avant de la mettre à la une.');return;}setBusy(true);try{await poseBookCall(social.client,'feature',{id:entry.remoteId,enabled:!entry.featured});setStats(v=>v.map(s=>s.id===entry.remoteId?{...s,featured:!entry.featured}:s));setNotice('La pose publique est mise à jour. Tes poses privées restent privées.');}catch{setNotice('La mise en avant nécessite une pose publique et une offre Plus ou Pro.');}finally{setBusy(false);}}
 function favorite(entry){const source=entries.find(e=>e.id===entry.id),result=onSave({...source,repeat:!source.repeat});if(!result.ok){setNotice(result.error||'La modification n’a pas pu être enregistrée.');return false;}return true;}
 return <PoseBook entries={rows} personal title="Mon livre de poses" subtitle="Tes souvenirs, privés ou publics, réunis dans ton livre." renderVisual={renderVisual} onOpen={entry=>onNavigate(entry.id)} onFavorite={favorite} onFeature={social?.client&&['plus','pro'].includes(social.tier)?feature:null} notice={notice} busy={busy}/>;
}
