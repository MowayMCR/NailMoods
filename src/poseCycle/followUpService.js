import {track} from '../analytics/analytics.js';
import {poseRepository} from './repository.js';
import {createMediaStorage,dataUrlToBlob} from '../cloud/mediaStorage.js';
import {recordObservation} from './followUp.js';
import {validateProject} from './model.js';
export function followUpService(client,principal,{onJournal=()=>{}}={}){
 const repo=poseRepository(client,principal),media=createMediaStorage(client,principal);
 return {
  async dates(project,realizedOn,removedOn=null){
   validateProject({...project,status:removedOn?'archived':project.details.followUp.length?'follow_up':'done',details:{...project.details,realizedOn,removedOn}});
   if(project.user_id!==principal.userId||project.workspace_id!==principal.workspaceId)throw Error('Ce projet appartient à un autre compte.');
   const {data,error}=await client.rpc('realize_pose_project',{p_project_id:project.id,p_revision:project.revision,p_realized_on:realizedOn,p_removed_on:removedOn});
   if(error)throw Error(error.code==='40001'?'Cette pose a changé. Recharge la fiche avant de réessayer.':'La réalisation n’a pas pu être enregistrée. Recharge la fiche et réessaie.');
   await onJournal(data.journal);if(!project.details.realizedOn)track('pose_realized',{source:project.details.source},{screen:'pose'});return data.project;
  },
  async save(project,entry,photo=''){
   let reference=entry.media;
   // Validate the content before any upload, using a temporary valid reference for a photo-only entry.
   const file=photo?dataUrlToBlob(photo):null,objectId=project.id+'-'+entry.id+'-'+crypto.randomUUID();
   if(file)reference={bucket:'nailmoods-private',path:`${principal.userId}/${principal.workspaceId}/followup/${objectId}.${file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`,contentType:file.type,bytes:file.size};
   validateProject(recordObservation(project,{...entry,media:reference}));
   if(file)reference=await media.upload({...principal,kind:'followup',objectId,file});
   try{const saved=await repo.save('projects',recordObservation(project,{...entry,media:reference}));track('pose_followup_saved',{has_photo:Boolean(reference)},{screen:'pose'});return saved;}
   catch(error){
    // A lost response may hide a committed update. Never remove a photo still referenced remotely.
    if(file)try{const latest=await repo.get('projects',project.id);if(latest?.details.followUp.some(e=>e.id===entry.id&&e.media?.path===reference.path))return latest;if(latest)await media.remove(reference.path);}catch{/* Preserve private bytes when commit status is uncertain. */}
    throw error;
   }
  },
  remove:(project,id)=>repo.save('projects',{...project,details:{...project.details,followUp:project.details.followUp.filter(e=>e.id!==id)}}),
  image:async reference=>reference?URL.createObjectURL(await media.download(reference.path)):null
 };
}
