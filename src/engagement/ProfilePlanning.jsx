import React, {useEffect, useMemo, useState} from 'react';
import {CalendarDays, ArrowUpRight} from 'lucide-react';
import {useSocial} from '../social/SocialContext';
import {useStorage} from '../StorageContext';
import {poseRepository} from '../poseCycle/repository.js';
import {PLAN_LABELS, wallTime} from '../poseCycle/planning.js';
import {upcomingMoments, momentDate} from './planningSummary.js';
import './engagement.css';

export default function ProfilePlanning() {
  const social = useSocial(), storage = useStorage();
  const userId = social?.userId, workspaceId = storage.workspaceId;
  const enabled = import.meta.env.VITE_POSE_CYCLE_ENABLED === 'true';
  const repo = useMemo(() => enabled && social?.client && userId && workspaceId ? poseRepository(social.client, {userId,workspaceId}) : null, [enabled,social?.client,userId,workspaceId]);
  const [state,setState] = useState({repo:null,loading:true,rows:[],error:''}), [reload,setReload] = useState(0);
  useEffect(() => {
    let alive = true, request = 0;
    async function load() {
      const version = ++request;
      setState({repo,loading:Boolean(repo),rows:[],error:''});
      if (!repo) return;
      try { const rows = await repo.list('plan'); if(alive && version === request) setState({repo,loading:false,rows:upcomingMoments(rows,{userId,workspaceId}),error:''}); }
      catch { if(alive && version === request) setState({repo,loading:false,rows:[],error:'Tes prochaines dates n’ont pas pu être chargées.'}); }
    }
    const visible = () => { if(document.visibilityState === 'visible') void load(); };
    void load(); window.addEventListener('nm-planning-changed',load); window.addEventListener('focus',visible); document.addEventListener('visibilitychange',visible);
    return () => {alive=false; ++request; window.removeEventListener('nm-planning-changed',load); window.removeEventListener('focus',visible); document.removeEventListener('visibilitychange',visible);};
  },[repo,userId,workspaceId,reload]);
  const current = state.repo === repo ? state : {loading:Boolean(repo),rows:[],error:''};
  return <section className="nmBento nmProfilePlanning" aria-labelledby="profile-planning-title">
    <div className="nmSectionHead"><div><small className="nmEyebrow">DU TEMPS POUR MES ENVIES</small><h2 id="profile-planning-title">Mon planning</h2></div><CalendarDays aria-hidden="true"/></div>
    {!enabled ? <p>Le planning n’est pas activé dans cette version.</p> : !repo ? <p>Connecte-toi pour retrouver tes projets et leurs prochaines dates.</p> : current.loading ? <p role="status">Tes prochains moments…</p> : current.error ? <div role="alert"><p>{current.error}</p><button className="nmQuiet" onClick={()=>setReload(n=>n+1)}>Réessayer</button></div> : current.rows.length ? <ul className="nmUpcomingMoments">{current.rows.map(row=><li key={row.id}><button onClick={()=>{window.location.hash='creer/planning/'+row.project_id;}}><span><small>{PLAN_LABELS[row.kind] || 'Mon moment'}</small><b>{row.title}</b></span><span className="nmMomentDate">{momentDate(row)}{row.starts_at&&<small>{wallTime(row.starts_at,row.timezone).slice(11)} · {row.timezone}</small>}</span></button></li>)}</ul> : <p>Une idée à essayer ? Choisis ton prochain moment, à ton rythme.</p>}
    {enabled&&<button className="nmButton nmButton-primary" onClick={()=>{window.location.hash=repo?'creer/planning':'profil/account';}}>{repo?'Voir mon planning':'Me connecter'}<ArrowUpRight size={17}/></button>}
    {enabled&&repo&&<button className="nmQuiet" onClick={()=>{window.location.hash='creer/projets-pose';}}>Mes projets à essayer</button>}
  </section>;
}
