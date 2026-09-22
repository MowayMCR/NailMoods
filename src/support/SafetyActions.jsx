import React,{useEffect,useState,useRef} from 'react';
import {ShieldBan,Flag} from 'lucide-react';
import Sheet from '../Sheet';
import {messageId} from '../social/messageState';
import {useSocial} from '../social/SocialContext';
import {safetyCall,supportError} from './service';
import './support.css';
export function SafetyActions({client,target,onBlocked}){
 const s=useSocial(),[mode,setMode]=useState(''),[category,setCategory]=useState('harassment'),[description,setDescription]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const attempt=useRef(null);
 if(!s?.userId||!['plus','pro'].includes(s.tier))return null;
 async function send(){setBusy(true);setNotice('');try{
  if(mode==='block'){await safetyCall(client,'block',target);await s.refresh();setMode('');setNotice('Compte bloqué. Les échanges sont interrompus.');onBlocked?.();}
  else{const payload={...target,category,description};const key=JSON.stringify(payload);if(attempt.current?.key!==key)attempt.current={key,id:messageId()};const r=await safetyCall(client,'report',{...payload,client_id:attempt.current.id});setNotice('Signalement reçu · '+r.id);setMode('');attempt.current=null;setDescription('');}
 }catch(e){setNotice(supportError(e));}finally{setBusy(false);}}
 return <><div className="safetyActions">{target.kind==='profile'&&<button onClick={()=>{setMode('block');setNotice('');}}><ShieldBan size={16}/> Bloquer</button>}<button onClick={()=>{setMode('report');setNotice('');}}><Flag size={16}/> Signaler{target.kind==='message'?' ce message':''}</button></div>{notice&&!mode&&<p role="status">{notice}</p>}{mode&&<Sheet title={mode==='block'?'Bloquer ce compte ?':'Signaler un contenu'} onClose={()=>!busy&&setMode('')}><div className="supportPanel">{mode==='block'?<p>La connexion sera retirée. Vous ne pourrez plus vous inviter, échanger ou ouvrir vos partages. Débloquer ne rétablira pas la connexion. Retrouve tes comptes bloqués dans Aide & Support.</p>:<><p>Ton signalement est privé. L’équipe habilitée peut consulter la cible signalée ; aucun autre message, photo ou élément de ta collection n’est joint automatiquement.</p><label>Motif<select value={category} onChange={e=>setCategory(e.target.value)}>{[['harassment','Harcèlement'],['spam','Spam'],['inappropriate','Contenu inapproprié'],['rights','Droits sur un contenu'],['other','Autre']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Précisions facultatives<textarea maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)}/></label></>}{notice&&<p role="alert">{notice}</p>}<button className="supportPrimary" disabled={busy} onClick={send}>{busy?'En cours…':mode==='block'?'Confirmer le blocage':'Envoyer le signalement'}</button><button disabled={busy} onClick={()=>setMode('')}>Annuler</button></div></Sheet>}</>;
}
export function BlockedAccounts({client,onChange}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){try{setRows(await safetyCall(client,'blocked'));}catch{setError('Liste indisponible. Réessaie.');}}
 useEffect(()=>{load();},[client]);
 return <div className="supportPanel"><p>Débloquer permet une nouvelle invitation, sans restaurer les anciens échanges.</p>{error&&<p role="alert">{error}</p>}<button onClick={load}>Actualiser</button>{!rows.length&&<p>Aucun compte bloqué.</p>}{rows.map(r=><article className="supportCard" key={r.user_id}><b>{r.display_name||r.handle}</b><p>@{r.handle}</p><button disabled={busy} onClick={async()=>{if(!window.confirm('Débloquer ce compte ? La connexion ne sera pas rétablie.'))return;setBusy(true);try{await safetyCall(client,'unblock',{user_id:r.user_id});await load();await onChange?.();}catch{setError('Déblocage non effectué.');}finally{setBusy(false);}}}>Débloquer</button></article>)}</div>;
}
