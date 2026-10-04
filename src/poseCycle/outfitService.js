import {createMediaStorage,dataUrlToBlob} from '../cloud/mediaStorage.js';
import {poseRepository} from './repository.js';
import {outfitProject,outfitEvent} from './outfit.js';
import {validateProject} from './model.js';
export function outfitService(client,principal){
 const repo=poseRepository(client,principal),media=createMediaStorage(client,principal);
 async function save({id,proposal,analysis,mode,collectionOnly,crop,src,title,event}){
  // A stable request id and server transaction make a retry safe after a lost response.
  const existing=await repo.get('projects',id);if(existing)return existing;
  const caps=await client.rpc('nm_capabilities');if(caps.error)throw caps.error;
  if(!['plus','pro'].includes(caps.data?.tier))throw Error('Ma tenue, mes nails est disponible avec Plus ou Pro.');
  // Validate the optional event before uploading any bytes.
  if(event)outfitEvent({id,user_id:principal.userId,workspace_id:principal.workspaceId,title},event);
  const reference=await media.upload({...principal,kind:'pose',objectId:id,file:dataUrlToBlob(src)});
  const project=outfitProject({principal,id,proposal,analysis,mode,collectionOnly,crop,media:reference,title});
  const planning=event?outfitEvent(project,event):null;
  const {data,error}=await client.rpc('save_pose_outfit',{p_project:project,p_event:planning});
  if(error){
   // Only remove an uploaded orphan when a successful read proves no commit exists.
   try{const committed=await repo.get('projects',id);if(committed)return committed;await media.remove(reference.path);}catch{/* Preserve private bytes on uncertain network outcome; retry same id. */}
   throw Error('Le projet n’a pas pu être enregistré. Ta sélection reste affichée ; réessaie.');
  }
  return validateProject(data);
 }
 return {save,list:()=>repo.list('projects'),get:id=>repo.get('projects',id),plan:()=>repo.list('plan'),async image(project){const path=project.details.outfitMedia?.path;return path?URL.createObjectURL(await media.download(path)):null;},async remove(project){await repo.remove('projects',project);/* Persistent cleanup queue owns media removal. */}};
}
