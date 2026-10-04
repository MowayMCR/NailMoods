import {poseRepository} from './repository.js';
import {createMediaStorage,dataUrlToBlob} from '../cloud/mediaStorage.js';
import {recordObservation} from './followUp.js';
import {validateProject} from './model.js';
export function followUpService(client,principal){
 const repo=poseRepository(client,principal),media=createMediaStorage(client,principal);
 return {
  async dates(project,realizedOn,removedOn=null){return repo.save('projects',validateProject({...project,status:removedOn?'archived':project.details.followUp.length?'follow_up':'done',details:{...project.details,realizedOn,removedOn}}));},
  async save(project,entry,photo=''){
   let reference=entry.media;
   // Validate the content before any upload, using a temporary valid reference for a photo-only entry.
   const file=photo?dataUrlToBlob(photo):null,objectId=project.id+'-'+entry.id+'-'+crypto.randomUUID();
   if(file)reference={bucket:'nailmoods-private',path:`${principal.userId}/${principal.workspaceId}/followup/${objectId}.${file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`,contentType:file.type,bytes:file.size};
   validateProject(recordObservation(project,{...entry,media:reference}));
   if(file)reference=await media.upload({...principal,kind:'followup',objectId,file});
   try{return await repo.save('projects',recordObservation(project,{...entry,media:reference}));}
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
