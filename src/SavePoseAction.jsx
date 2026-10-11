import React,{useRef,useState} from 'react';
import {BookmarkCheck,FolderHeart} from 'lucide-react';

// Choose a destination; reuse the existing private idea/project save callbacks.
export default function SavePoseAction({onSaveIdea,onSaveProject,beforeSave,onBusyChange,saved=false,disabled=false,projectDisabled=false,className='detailPrimary'}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const saving=useRef(false);
 async function save(kind){
  if(saving.current||disabled||kind==='project'&&projectDisabled)return;
  const callback=kind==='project'?onSaveProject:onSaveIdea;if(!callback)return;
  saving.current=true;setBusy(true);onBusyChange?.(true);setNotice('');
  try{const value=beforeSave?await beforeSave():undefined;const result=await callback(value);
   if(result===false){setNotice('Enregistrement impossible. Ton idée reste affichée.');return;}
   setOpen(false);setNotice(kind==='project'?'Projet enregistré en privé.':'Idée enregistrée. Retrouve-la dans Mes poses.');
  }catch{setNotice('Enregistrement impossible. Ton idée reste affichée. Réessaie.');}
  finally{saving.current=false;setBusy(false);onBusyChange?.(false);}
 }
 if(!onSaveIdea&&!onSaveProject)return null;
 const choice=Boolean(onSaveIdea&&onSaveProject);
 return <div className="nmSavePoseAction">
  <button type="button" className={className} disabled={disabled||busy||saved&&!choice} aria-expanded={choice?open:undefined} onClick={()=>choice?setOpen(v=>!v):save(onSaveIdea?'idea':'project')}><BookmarkCheck size={18}/>{busy?'Enregistrement…':saved&&!choice?'Idée enregistrée':'Enregistrer'}</button>
  {choice&&open&&<div className="nmSaveDestinations" aria-label="Destination de sauvegarde"><p>Où veux-tu la garder ?</p><button type="button" disabled={disabled||busy||saved} onClick={()=>save('idea')}><BookmarkCheck size={18}/>{saved?'Idée déjà enregistrée':'Une idée à essayer'}</button><button type="button" disabled={disabled||busy||projectDisabled} onClick={()=>save('project')}><FolderHeart size={18}/>Un projet à préparer</button><small>Privé. Publier reste une action séparée.</small></div>}
  {notice&&<p role="status">{notice}</p>}
 </div>;
}
