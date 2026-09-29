import React,{useRef,useState} from 'react';
import {Camera,ImagePlus,Trash2} from 'lucide-react';
import {preparePhoto} from '../ProductPhoto';
import {useProfilePhoto} from './ProfilePhotoContext';

export default function AccountAvatar(){
 const photo=useProfilePhoto(),input=useRef(null);
 const [preparing,setPreparing]=useState(false),[error,setError]=useState('');
 if(!photo)return <p>Connecte-toi pour enregistrer ta photo de profil.</p>;
 const busy=preparing || photo.busy;
 async function choose(event){
   const file=event.target.files?.[0];event.target.value='';if(!file)return;
   setPreparing(true);setError('');
   try{await photo.change(await preparePhoto(file,1000));}
   catch(err){setError(err.message || 'Cette image ne peut pas être lue. Essaie une autre photo.');}
   finally{setPreparing(false);}
 }
 return <section className="card accountAvatarCard" aria-labelledby="account-avatar-title" aria-busy={busy}>
   <div className="accountAvatarPreview">{photo.url?<img src={photo.url} alt="Ma photo de profil"/>:<Camera aria-hidden="true"/>}</div>
   <div className="accountAvatarCopy"><h2 id="account-avatar-title">Ma photo de profil</h2><p>Ta photo apparaît dans ton avatar et accompagne ton profil selon sa visibilité.</p>
     <div className="avatarActionRow"><button type="button" className="secondaryAction" disabled={busy} onClick={()=>input.current?.click()}><ImagePlus/>{photo.path?'Remplacer':'Ajouter une photo'}</button>{photo.path&&<button type="button" className="quietButton" disabled={busy} onClick={()=>void photo.change(null)}><Trash2/>Supprimer</button>}</div>
     <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choisir ma photo de profil" disabled={busy} onChange={choose}/>
     {busy&&<small role="status">{preparing?'Préparation de la photo…':'Enregistrement de la photo…'}</small>}
     {photo.draft&&!busy&&<div className="avatarPending"><p>L’enregistrement de ta photo reste à terminer.</p><button type="button" className="secondaryAction" onClick={()=>void photo.resume()}>Réessayer l’enregistrement</button><button type="button" className="quietButton" onClick={()=>void photo.discardDraft().catch(()=>setError('Le brouillon n’a pas pu être effacé. Réessaie.'))}>Annuler la modification</button></div>}
     {(error||photo.error)&&<small role="alert">{error||photo.error}{!photo.draft&&<button type="button" className="quietButton" onClick={()=>void photo.refresh()}>Recharger la photo</button>}</small>}
     {photo.notice&&<small role="status">{photo.notice}</small>}
   </div>
 </section>;
}
