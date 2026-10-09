import NativeSponsoredSlot from '../ads/NativeSponsoredSlot.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {ChevronRight} from 'lucide-react';
import PeopleSearch from '../identity/PeopleSearch';
import ProDirectory from '../professional/ProDirectory';
import {proService,proV2Enabled} from '../professional/service';
import {proLabel} from '../professional/model';
import {ProShelfDirectory} from '../shelf/ProShelf';
import {useSocial} from './SocialContext';
import ContentImage from './ContentImage';
export function FilArt({source}){return <svg className="nmFilArt" viewBox={source==='po'?'0 0 887 887':'887 0 887 887'} aria-hidden="true" focusable="false"><image href={import.meta.env.BASE_URL+'atelier/fil-v1.webp'} width="1774" height="887"/></svg>;}
export default function FeedPeople({client,onOpen}){
 const social=useSocial(),directory=useRef(null),[rows,setRows]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[searched,setSearched]=useState(false);
 useEffect(()=>{if(!proV2Enabled()){setBusy(false);return;}let active=true;setBusy(true);setError('');proService(client).search().then(r=>{if(active)setRows(r||[]);}).catch(()=>{if(active)setError('Les profils proposés sont indisponibles pour le moment.');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[client,revision]);
 function findPo(){if(!directory.current)return;directory.current.open=true;directory.current.scrollIntoView({behavior:'smooth',block:'start'});directory.current.querySelector('input')?.focus({preventScroll:true});}
 return <section className="nmFilPeople"><NativeSponsoredSlot client={client}/><PeopleSearch client={client} compact onSearched={setSearched}><div className="nmFilPeopleTiles"><button onClick={findPo}><FilArt source="po"/><b>Trouver une PO</b><small>Découvrir les profils Pro</small></button><button onClick={()=>social?.setView('accepted')}><FilArt source="connections"/><b>Mes connexions</b><small>Mes liens dans la communauté</small></button></div>{!searched&&proV2Enabled()&&<section className="nmFilSuggestions"><h2>Des profils à découvrir</h2>{busy&&<p role="status">Les profils arrivent…</p>}{error&&<p role="alert">{error} <button onClick={()=>setRevision(v=>v+1)}>Réessayer</button></p>}{!busy&&!error&&!rows.length&&<p>Les profils professionnels visibles apparaîtront ici.</p>}{rows.slice(0,3).map(r=><button className="nmFilProfileRow" key={r.handle} onClick={()=>onOpen(r.handle)}><span className="nmFilProfileAvatar">{r.avatar_url?<ContentImage client={client} kind="avatar" id={r.handle} title={r.display_name}/>:<span aria-hidden="true">{(r.display_name||'N')[0]}</span>}</span><span><b>@{r.handle}</b><small>{proLabel(r.kind)}</small></span><span>Voir le profil <ChevronRight size={16}/></span></button>)}</section>}</PeopleSearch>{proV2Enabled()&&<details ref={directory} className="nmFilExtra"><summary>Explorer les univers professionnels</summary><ProDirectory client={client}/></details>}<details className="nmFilExtra"><summary>L’étagère des PO</summary><ProShelfDirectory client={client} onOpen={onOpen}/></details></section>;
}
