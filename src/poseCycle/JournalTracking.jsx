import React,{useState,useEffect,useMemo} from 'react';
import {CalendarDays} from 'lucide-react';
import {useSocial} from '../social/SocialContext';import {useStorage} from '../StorageContext';
import {poseRepository} from './repository';import {projectFromJournal} from './model';import {poseAge} from './followUp';
import './followUp.css';
const enabled=()=>import.meta.env.VITE_POSE_CYCLE_ENABLED==='true';
export default function JournalTracking({entry=null}){
 const social=useSocial(),storage=useStorage(),[rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const repo=useMemo(()=>enabled()&&social?.userId&&storage.workspaceId?poseRepository(social.client,{userId:social.userId,workspaceId:storage.workspaceId}):null,[social?.client,social?.userId,storage.workspaceId]);
 useEffect(()=>{let active=true;if(repo&&!entry)repo.list('projects').then(p=>{if(active)setRows(p.filter(x=>x.details.realizedOn&&!x.journal_entry_id&&x.details.source!=='journal').sort((a,b)=>b.details.realizedOn.localeCompare(a.details.realizedOn)));}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[repo,entry]);
 if(!repo)return null;
 return <section className="followProjects">{error&&<p role="alert">{error}</p>}{entry?<button className="journalSecondary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{if(!entry.remoteId)throw Error('Attends la synchronisation de cette pose avant de démarrer son suivi.');const row=(await repo.list('projects')).find(p=>p.journal_entry_id===entry.remoteId)||await repo.importLegacy(projectFromJournal(entry,{userId:social.userId,workspaceId:storage.workspaceId}));location.hash='creer/pose/'+row.id;}catch(e){setError(e.message);}finally{setBusy(false);}}}><CalendarDays/> {busy?'Ouverture…':'Suivre cette pose · photos et évolution'}</button>:rows.length>0&&<><h2>Mes poses suivies</h2>{rows.map(p=><button className="followProjectLink" key={p.id} onClick={()=>{location.hash='creer/pose/'+p.id;}}><CalendarDays/><span><strong>{p.title}</strong><small>{p.details.removedOn?'Déposée · '+poseAge(p)+' jours portée':poseAge(p)+' jours depuis la pose'} · {p.details.followUp.length} observation(s)</small></span></button>)}</>}</section>;
}
