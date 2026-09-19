import React,{useEffect,useRef,useState} from 'react';
import {Camera,ImagePlus,Trash2} from 'lucide-react';
import {createMediaStorage,validateImage} from '../cloud/mediaStorage';

export default function WorkspaceAvatar({client,userId,workspaceId,path,onChanged,label='Photo ou logo'}){
 const input=useRef(null),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;setUrl('');if(path)createMediaStorage(client,{userId}).signedUrl(path).then(value=>{if(active)setUrl(value);}).catch(()=>{if(active)setNotice('Cette image n’a pas pu être chargée.');});return()=>{active=false;};},[client,userId,path]);
 async function change(file){setBusy(true);setNotice('');try{
   const media=createMediaStorage(client,{userId});let next=null;
   if(file){validateImage(file);const uploaded=await media.upload({userId,workspaceId,kind:'avatar',objectId:crypto.randomUUID(),file});await media.signedUrl(uploaded.path);next=uploaded.path;}
   const {error}=await client.from('pro_profiles').update({avatar_url:next}).eq('workspace_id',workspaceId).eq('user_id',userId);if(error)throw error;
   const previous=path;onChanged?.(next);setNotice(next?'Image enregistrée.':'Image supprimée.');
   if(previous&&previous!==next)try{await media.remove(previous);}catch{setNotice('La nouvelle image est enregistrée. L’ancienne reste à nettoyer.');}
 }catch{setNotice('Utilise une image JPG, PNG ou WebP de 5 Mo maximum.');}finally{setBusy(false);}}
 return <div className="workspaceAvatarField"><div className="workspaceAvatarPreview">{url?<img src={url} alt={label}/>:<Camera aria-hidden="true"/>}</div><div><b>{label}</b><p>JPG, PNG ou WebP · 5 Mo maximum.</p><div className="avatarActionRow"><button type="button" disabled={busy} onClick={()=>input.current?.click()}>{url?<><ImagePlus/>Remplacer</>:<><ImagePlus/>Ajouter une photo</>}</button>{path&&<button type="button" className="quietButton" disabled={busy} onClick={()=>change(null)}><Trash2/>Supprimer</button>}</div><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void change(file);event.target.value='';}}/>{notice&&<small role="status">{notice}</small>}</div></div>;
}
