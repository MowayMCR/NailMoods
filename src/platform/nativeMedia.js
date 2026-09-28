import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { nativeNotice, nativeServices } from './state.js';
import { imageResults, canRecoverMedia } from './mediaRecovery.js';

const KEY='pending-native-media';
let pending=null,busy=false;
const inputs=()=>[...document.querySelectorAll('input[type=file]')].filter(el=>el.accept.includes('image'));
const descriptor=input=>({route:location.hash,label:input.getAttribute('aria-label')||input.id||'',index:inputs().indexOf(input),principal:nativeServices()?.principal||'boot'});
const announce=()=>window.dispatchEvent(new Event('nm-native-media'));
async function keep(value){await Preferences.set({key:KEY,value:JSON.stringify(value)});pending=value;announce();}
export const recoveredMedia=()=>pending?.files?.length ? pending : null;
export async function purgeAccountMedia(principal){if(pending?.principal===principal)await discardRecoveredMedia();}
export async function discardRecoveredMedia(){const old=pending;await Preferences.remove({key:KEY});pending=null;announce();for(const file of old?.files||[])try{await Filesystem.deleteFile({path:file.path,directory:Directory.Data});}catch{}}
async function retainResults(method,data){
  if(!pending)return;
  const photos=imageResults(method,data),files=[];
  for(const photo of photos){
    const path='nailmoods-media/'+crypto.randomUUID()+'.'+(photo.format==='png'?'png':'jpg');
    // Read URI from the native activity and keep a private durable copy.
    const source=photo.path || photo.webPath;
    let encoded;
    if(photo.path) encoded=(await Filesystem.readFile({path:photo.path})).data;
    else {const blob=await(await fetch(source)).blob();encoded=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});}
    await Filesystem.writeFile({path,data:encoded,directory:Directory.Data,recursive:true});
    files.push({path,type:photo.format==='png'?'image/png':'image/jpeg'});
  }
  if(files.length)await keep({...pending,files});
}
export async function acceptRestoredCamera(result){
  if(result?.pluginId!=='Camera' || !['getPhoto','pickImages'].includes(result.methodName))return false;
  if(!pending){const saved=(await Preferences.get({key:KEY})).value;pending=saved?JSON.parse(saved):null;}
  if(!pending)return false;
  if(result.success===false){await discardRecoveredMedia();return false;}
  await retainResults(result.methodName,result.data);announce();return true;
}
async function deliver(input){
  if(!canRecoverMedia(pending,descriptor(input)))return false;
  const transfer=new DataTransfer();
  for(const [i,item] of pending.files.entries()){
    const {uri}=await Filesystem.getUri({path:item.path,directory:Directory.Data});
    const response=await fetch(Capacitor.convertFileSrc(uri));
    if(!response.ok)throw new Error('Photo indisponible');
    const blob=await response.blob();transfer.items.add(new File([blob],'nailmoods-'+(i+1)+'.'+(item.type==='image/png'?'png':'jpg'),{type:item.type}));
  }
  input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  // Retain the native copy until the user confirms it can be discarded.
  await keep({...pending,delivered:true});return true;
}
export async function reuseRecoveredMedia(){
  const input=inputs().find(el=>canRecoverMedia(pending,descriptor(el)));
  if(!input){nativeNotice('Rouvre le formulaire utilisé pour cette photo, puis touche « Réutiliser ».');return false;}
  try{return await deliver(input);}catch{nativeNotice('La photo ne peut pas être relue. Elle reste conservée pour réessayer.');return false;}
}
export async function installNativeMedia(){
  try{const saved=(await Preferences.get({key:KEY})).value;pending=saved?{...JSON.parse(saved),delivered:false}:null;}catch{nativeNotice('La photo en attente ne peut pas être relue.');}
  document.addEventListener('click',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement) || input.type!=='file'||!input.accept.includes('image')||input.disabled)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(busy)return;
    if(recoveredMedia()&&!pending.delivered){nativeNotice('Une photo récupérée attend ton choix. Réutilise-la ou retire-la avant de continuer.');return;}
    const context=descriptor(input),camera=input.hasAttribute('capture'),multiple=input.multiple;busy=true;
    (async()=>{try{
      await discardRecoveredMedia();
      await nativeServices().storage.flush();
      await nativeServices().checkpoint?.();
      await keep({...context,files:[]});
      const method=camera?'getPhoto':'pickImages';
      const data=camera?await Camera.getPhoto({source:CameraSource.Camera,resultType:CameraResultType.Uri,quality:90,correctOrientation:true,saveToGallery:false}):await Camera.pickImages({quality:90,limit:multiple?4:1});
      await retainResults(method,data);
      if(input.isConnected)await deliver(input);
    }catch(error){
      if(!pending?.files?.length)await discardRecoveredMedia();
      if(!/cancel|canceled|cancelled|annul|No images picked|No image picked/i.test(error?.message||''))nativeNotice('Impossible d’ouvrir cette photo. Vérifie l’accès à la caméra ou choisis une image dans la galerie.');
    }finally{busy=false;}})();
  },true);
}
