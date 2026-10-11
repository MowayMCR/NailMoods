import {assistantCall} from './service.js';
import {validateImage} from '../cloud/mediaStorage.js';
export function hasRealistic(idea){return Boolean(idea?.ai?.media?.realistic?.jobId||idea?.savedVisual==='realistic'&&(idea.photo||idea.mediaPath));}
export async function readRealistic(client,idea){
 const media=idea?.ai?.media?.realistic;if(!media?.jobId)throw Error('render_unavailable');
 const r=await assistantCall(client,{action:'status',jobId:media.jobId});
 if(r.status!=='succeeded'||r.result?.kind!=='realistic'||!r.result.imageUrl)throw Error('render_unavailable');
 const response=await fetch(r.result.imageUrl,{credentials:'omit',cache:'no-store'});if(!response.ok)throw Error('render_unavailable');
 const blob=validateImage(await response.blob());return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('render_unavailable'));reader.readAsDataURL(blob);});
}
function hasCurrentCopy(idea){return idea.savedVisual==='realistic'&&Boolean(idea.photo||idea.mediaPath)&&(!idea.ai?.media?.realistic?.jobId||idea.savedRenderingJobId===idea.ai.media.realistic.jobId);}
export async function saveRealisticCopy(client,idea){
 if(!hasRealistic(idea)||hasCurrentCopy(idea))return idea;
 const photo=await readRealistic(client,idea);
 return {...idea,photo,mediaPath:null,publicMediaPath:null,savedVisual:'realistic',savedRenderingJobId:idea.ai.media.realistic.jobId,publicationVisual:'drawing',isPublic:false};
}
export async function publicationMedia(client,idea,choice){
 if(choice==='drawing')return {publicationVisual:'drawing',publicMediaPath:null};
 if(choice!=='realistic'||!hasRealistic(idea))throw Error('render_unavailable');
 const photo=hasCurrentCopy(idea)?idea.photo||idea.mediaPath:await readRealistic(client,idea);
 return {publicationVisual:'realistic',savedVisual:'realistic',savedRenderingJobId:idea.ai?.media?.realistic?.jobId||idea.savedRenderingJobId,photo,mediaPath:photo.startsWith('data:image/')?null:idea.mediaPath,publicMediaPath:hasCurrentCopy(idea)&&idea.publicationVisual==='realistic'?idea.publicMediaPath||null:null};
}
