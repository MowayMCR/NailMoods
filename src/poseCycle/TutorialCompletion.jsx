import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useSocial} from '../social/SocialContext';import {useStorage} from '../StorageContext';
import {poseRepository} from './repository';import {projectFromTutorial} from './model';import {followUpService} from './followUpService';
import {Button} from '../design/UI';import {localDate} from '../journal';
export default function TutorialCompletion({session,onAction}){
 const social=useSocial(),storage=useStorage(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[project,setProject]=useState(null),started=useRef(null);
 const principal=useMemo(()=>social?.userId&&storage.workspaceId?{userId:social.userId,workspaceId:storage.workspaceId}:null,[social?.userId,storage.workspaceId]);
 const active=import.meta.env.VITE_POSE_CYCLE_ENABLED==='true'&&principal;
 async function save(){if(!active)return;setBusy(true);setError('');try{
  const repo=poseRepository(social.client,principal);
  const candidates=session.poseProjectId?[]:await repo.list('projects');
  let p=session.poseProjectId?await repo.get('projects',session.poseProjectId):candidates.find(p=>p.details.tutorialSessionId===session.id)||candidates.find(p=>!p.details.realizedOn&&p.details.composition?.key===session.idea.key&&!p.details.tutorialSessionId);
  if(p&&p.details.tutorialSessionId!==session.id)p=await repo.save('projects',{...p,details:{...p.details,tutorialSessionId:session.id}});
  if(session.poseProjectId&&!p)throw Error('Ce projet a été supprimé. La progression reste dans tes tutoriels.');
  p??=await repo.importLegacy(projectFromTutorial(session,principal));
  const saved=await followUpService(social.client,principal,{onJournal:row=>storage.acceptJournalRow?.(row)}).dates(p,p.details.realizedOn||localDate(session.completedAt),p.details.removedOn||null);
  setProject(saved);onAction({type:'cycleRecorded',projectId:saved.id});
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{if(active&&session.cycleCompletionPending&&started.current!==session.id){started.current=session.id;void save();}},[active,session.id]);
 if(!active)return null;
 const id=project?.id||session.poseProjectId;
 return <section className="tutorialIntro tutorialCompletion"><small>DE TA POSE À SON HISTOIRE</small><h2>Un souvenir, puis un suivi.</h2>{busy?<p role="status">Enregistrement dans Mes poses…</p>:error?<><p role="alert">{error}</p><Button onClick={save}>Réessayer l’enregistrement</Button></>:id&&!session.cycleCompletionPending?<><p>Ta pose est enregistrée dans ton Journal. Ajoute une photo et choisis tes rappels si tu en as envie.</p><Button onClick={()=>{location.hash='creer/pose/'+id;}}>Suivre ma pose</Button></>:<Button onClick={save}>Enregistrer et suivre ma pose</Button>}</section>;
}
