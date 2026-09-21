import React,{useEffect,useRef,useState} from 'react';
import {Camera,ImagePlus,Trash2} from 'lucide-react';
import {createMediaStorage,validateImage} from '../cloud/mediaStorage';

export default function AccountAvatar({client,userId,workspaceId}){
 const input=useRef(null),[path,setPath]=useState(null),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;if(!userId)return;client.from('profiles').select('avatar_url').eq('id',userId).single().then(({data,error})=>{if(active&&!error)setPath(data.avatar_url);});return()=>{active=false;};},[client,userId]);
 useEffect(()=>{let active=true;setUrl('');if(path)createMediaStorage(client,{userId}).signedUrl(path).then(value=>{if(active)setUrl(value);}).catch(()=>{if(active)setNotice('L’avatar n’a pas pu être chargé.');});return()=>{active=false;};},[path,client,userId]);
 if(!userId||!workspaceId)return null;
 async function change(file){setBusy(true);setNotice('');try{
  const media=createMediaStorage(client,{userId});let next=null;
  if(file){validateImage(file);const uploaded=await media.upload({userId,workspaceId,kind:'avatar',objectId:crypto.randomUUID(),file});await media.signedUrl(uploaded.path);next=uploaded.path;}
  const {error}=await client.from('profiles').update({avatar_url:next}).eq('id',userId);if(error)throw error;
  const old=path;setPath(next);setNotice(next?'Photo enregistrée. Elle n’est publique que si ton profil l’est.':'Photo supprimée.');
  if(old&&old!==next)try{await media.remove(old);}catch{setNotice('La nouvelle photo est enregistrée. L’ancienne reste à nettoyer.');}
 }catch{setNotice('Utilise une image JPG, PNG ou WebP de 5 Mo maximum.');}finally{setBusy(false);}}
 return <section className="card accountAvatarCard" aria-labelledby="account-avatar-title"><div className="accountAvatarPreview">{url?<img src={url} alt="Ma photo de profil"/>:<Camera aria-hidden="true"/>}</div><div className="accountAvatarCopy"><h2 id="account-avatar-title">Ma photo de profil</h2><p>Ajoute une photo à ton identité NailMoods.</p><div className="avatarActionRow"><button type="button" className="secondaryAction" disabled={busy} onClick={()=>input.current?.click()}><ImagePlus/>{url?'Remplacer':'Ajouter une photo'}</button>{path&&<button type="button" className="quietButton" disabled={busy} onClick={()=>change(null)}><Trash2/>Supprimer</button>}</div><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void change(file);event.target.value='';}}/>{notice&&<small role="status">{notice}</small>}</div></section>;
}
