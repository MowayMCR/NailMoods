import React,{useEffect,useState} from 'react';
import PoseBook from './PoseBook.jsx';
import ContentImage from '../social/ContentImage.jsx';
import Sheet from '../Sheet.jsx';
import {SafetyActions} from '../support/SafetyActions.jsx';
import {poseBookCall} from './service.js';
export default function PublicPoseBook({client,profile}){
 const initial=(profile.professional?.portfolio||profile.journal||[]).filter(e=>!e.kind||e.kind==='journal').map(e=>({...e,kind:'journal'}));
 const [entries,setEntries]=useState(initial),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[detail,setDetail]=useState(null);
 useEffect(()=>{let alive=true;setEntries(initial);poseBookCall(client,'read',{handle:profile.handle}).then(rows=>{if(!Array.isArray(rows))throw Error('invalid_book_response');if(alive)setEntries(rows);}).catch(()=>{if(alive)setNotice('Les informations du livre ne sont pas à jour. Ferme puis rouvre le profil pour réessayer.');});return()=>{alive=false;};},[client,profile.handle]);
 async function favorite(entry){if(busy)return false;setBusy(true);try{const data=await poseBookCall(client,'favorite',{id:entry.id,saved:!entry.saved});setEntries(v=>v.map(e=>e.id===entry.id?{...e,...data}:e));setNotice(data.saved?'Coup de cœur enregistré. La propriétaire voit le nombre d’appréciations.':'Coup de cœur retiré.');return true;}catch{setNotice('Le coup de cœur n’a pas été enregistré. Réessaie.');return false;}finally{setBusy(false);}}
 async function feature(entry){if(busy)return;setBusy(true);try{await poseBookCall(client,'feature',{id:entry.id,enabled:!entry.featured});setEntries(v=>v.map(e=>e.id===entry.id?{...e,featured:!entry.featured}:e));setNotice('La mise en avant est enregistrée.');}catch{setNotice('La mise en avant n’a pas été enregistrée.');}finally{setBusy(false);}}
 return <><PoseBook entries={entries} title={'Le livre de '+profile.displayName} subtitle="Ses poses publiques, à feuilleter." renderVisual={entry=><ContentImage client={client} kind="journal" id={entry.mediaId||entry.id} preview={entry.preview} title={entry.title}/>} onFavorite={favorite} onFeature={entries.some(e=>e.owner)?feature:null} onOpen={setDetail} busy={busy} notice={notice}/>{detail&&<Sheet title={detail.title||'Ma pose'} onClose={()=>setDetail(null)}><ContentImage client={client} kind="journal" id={detail.mediaId||detail.id} preview={detail.preview} title={detail.title}/><button className="journalSecondary" disabled={busy} onClick={()=>favorite(entries.find(e=>e.id===detail.id)||detail)}>♥ Coup de cœur</button><SafetyActions client={client} target={{kind:'journal',id:detail.id,label:detail.title||'Ma pose'}}/></Sheet>}</>;
}
