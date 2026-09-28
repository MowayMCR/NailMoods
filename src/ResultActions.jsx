import React,{useState} from 'react';
import {BookmarkCheck,Check,RotateCcw,Send,ArrowRight} from 'lucide-react';
export default function ResultActions({saved=false,onSave,onDone,onVariant,onShare,onOpen}) {
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function save(){if(busy||!onSave)return;setBusy(true);setNotice('');try{const result=await onSave();setNotice(result===false?'Enregistrement impossible. Réessaie.':'Idée enregistrée. Retrouve-la dans Mes poses.');}catch{setNotice('Enregistrement impossible. Ton idée reste affichée.');}finally{setBusy(false);}}
 return <section className="resultActions" aria-label="Actions de l’idée"><div>{onSave&&<button className="detailPrimary" disabled={busy||saved} onClick={save}><BookmarkCheck/>{busy?'Enregistrement…':saved?'Idée enregistrée':'Enregistrer l’idée'}</button>}{onDone&&<button className="detailSecondary" onClick={onDone}><Check/>Je l’ai faite</button>}{onVariant&&<button className="nmQuiet" onClick={onVariant}><RotateCcw/>Créer une variante</button>}{onShare&&<button className="nmQuiet" onClick={onShare}><Send/>Envoyer à ma PO</button>}{onOpen&&<button className="nmQuiet" onClick={onOpen}>Voir la fiche et la recette<ArrowRight/></button>}</div>{notice&&<p role="status">{notice}</p>}</section>;
}
