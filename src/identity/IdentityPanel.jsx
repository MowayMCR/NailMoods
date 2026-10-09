import ContentImage from '../social/ContentImage';
import {useSocial} from '../social/SocialContext';
import React,{useEffect,useState} from 'react';
import {ChevronRight,Search,UserRound,Copy,Settings} from 'lucide-react';
import Sheet from '../Sheet';
import PublicProfile from './PublicProfile.jsx';
import {identityService} from './service';
import {suggestHandle,normalizeHandle,handleError,rankProfiles} from './handles';
import {professionalLabel} from '../workspaces/professionalProfile';
import './identity-search.css';

export default function IdentityPanel({client,userId,onSaved}){
 const social=useSocial();
 const [publicHandle,setPublicHandle]=useState(null),[loaded,setLoaded]=useState(false),[handle,setHandle]=useState(''),[name,setName]=useState(''),[visibility,setVisibility]=useState('pros');
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[panel,setPanel]=useState(null),[query,setQuery]=useState(''),[kind,setKind]=useState(''),[city,setCity]=useState(''),[results,setResults]=useState([]),[searched,setSearched]=useState(false);
 useEffect(()=>{let cancelled=false;setLoaded(false);setResults([]);if(!userId)return;
 identityService(client).mine().then(value=>{if(cancelled)return;setName(value.display_name||'');setHandle(value.username||suggestHandle(value.display_name));setVisibility(value.discovery_visibility);setLoaded(true);}).catch(()=>{if(!cancelled)setNotice('Ton identité publique n’est pas encore disponible. Ta collection et tes idées restent accessibles.');});
 return()=>{cancelled=true;};},[client,userId]);
 useEffect(()=>{if(social?.identityOpen){if(social.identityOpen==='search')social.setDiscovery('people');else setPanel('settings');social.setIdentityOpen(false);}},[social?.identityOpen]);
 if(!userId)return null;
 async function check(){setBusy(true);setNotice('');try{const error=handleError(handle);if(error){setNotice(error);return;}const available=await identityService(client).available(handle);setNotice(available?'Cet identifiant est disponible. Tu peux maintenant l’enregistrer.':'Cet identifiant est déjà utilisé. Essaie une variante, par exemple '+normalizeHandle(handle).slice(0,28)+'2.');}catch{setNotice('Impossible de vérifier maintenant. Réessaie.');}finally{setBusy(false);}}
 async function save(){setBusy(true);setNotice('');try{await identityService(client).save(handle,visibility,name);setHandle(normalizeHandle(handle));setNotice('Ton identité est enregistrée.');await social?.refreshIdentity();setPanel(null);onSaved?.();}catch{setNotice('Enregistrement impossible. Vérifie la disponibilité puis réessaie.');}finally{setBusy(false);}}
 async function search(event){event.preventDefault();setBusy(true);setNotice('');setResults([]);setSearched(true);try{setResults(rankProfiles(await identityService(client).search(query,kind,city),query));}catch{setNotice('La recherche n’est pas disponible. Réessaie.');}finally{setBusy(false);}}
 function openSearch(){social?.setDiscovery('people');}
 return <section className="card identityCard" aria-labelledby="identity-title"><div className="identityHeading"><div><small>IDENTITÉ PERSONNELLE</small><h2 id="identity-title">Paramètres du profil</h2><p>Identifiant, nom affiché et visibilité.</p></div><UserRound aria-hidden="true"/></div>
 <button className="nmShortcut" onClick={()=>{setNotice('');setPanel('settings');}}><Settings/><span>Identité et visibilité<small>{social?.identity?.username?'@'+social.identity.username:'Choisir mon NailMoods ID'}</small></span><ChevronRight/></button>
 {panel==='settings'&&<Sheet title="Identité et visibilité" onClose={()=>setPanel(null)} className="privacySheet identitySettingsSheet">{loaded?<div className="identityForm">
   <label><span>Nom affiché</span><input value={name} maxLength={80} onChange={event=>setName(event.target.value)}/></label>
   <label><span>@NailMoodsID</span><div className="handleField"><i>@</i><input value={handle} maxLength={30} autoCapitalize="none" autoCorrect="off" onChange={event=>setHandle(event.target.value.replace(/^@+/,''))}/></div></label>
   <button className="secondaryAction availabilityButton" disabled={busy||Boolean(handleError(handle))} onClick={check}>Vérifier la disponibilité</button>
   <label><span>Qui peut me trouver ?</span><select value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="everyone">Tout le monde sur NailMoods</option><option value="pros">Uniquement les Pros</option><option value="nobody">Personne</option></select></label>
   <button className="primaryAction" disabled={busy||!name.trim()||Boolean(handleError(handle))} onClick={save}>Enregistrer mon identité</button>
   <p className="formHint">Ta collection, tes poses privées et ton journal ne sont jamais rendus publics par ce réglage.</p>
 </div>:<p>Chargement de ton identité…</p>}{notice&&<p role="status">{notice}</p>}</Sheet>}
 {notice&&!panel&&<p className="proNotice" role="status">{notice}</p>}
 {['plus','pro'].includes(social?.tier)&&<button className="nmShortcut" onClick={openSearch}><Search/>Rechercher sur NailMoods<ChevronRight/></button>}
 {publicHandle&&<PublicProfile client={client} handle={publicHandle} onClose={()=>setPublicHandle(null)}/>} </section>;
}

export function ProfileIdentity(){
 const s=useSocial(),[notice,setNotice]=useState(''),[preview,setPreview]=useState(false);if(!s?.userId)return null;
 const handle=s.identity?.username;
 return <div className="profileIdentity"><div>{handle?<><strong>@{handle}</strong><button className="nmQuiet" aria-label="Copier mon identifiant" onClick={async()=>{try{await navigator.clipboard.writeText('@'+handle);setNotice('Identifiant copié.');}catch{setNotice('Copie cet identifiant : @'+handle);}}}><Copy size={16}/></button></>:<span>Choisis ton NailMoods ID</span>}<button className="nmQuiet" aria-label="Paramètres de mon identifiant" onClick={()=>{window.location.hash="profil/account";s.setIdentityOpen(true);}}><Settings size={16}/></button></div><small>Offre {s.tier==='pro'?'Pro':s.tier==='plus'?'Plus':'Free'}</small>{handle&&<button className="nmQuiet" onClick={()=>setPreview(true)}>Voir mon profil public</button>}{notice&&<small role="status">{notice}</small>}{preview&&<PublicProfile client={s.client} handle={handle} onClose={()=>setPreview(false)}/>}</div>;
}
