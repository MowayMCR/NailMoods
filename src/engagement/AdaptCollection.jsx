import React,{useMemo,useState} from 'react';
import {Palette,ArrowRight} from 'lucide-react';
import {adaptToCollection} from './adaptCollection.js';
import NailPreview from '../NailPreview';
import {useStorage} from '../StorageContext';
import './engagement.css';
export default function AdaptCollection({idea,items,onOpen,onCollection}) {
  const storage=useStorage(),[open,setOpen]=useState(false);
  const limited=storage.accountScoped&&storage.accountTier==='free';
  const result=useMemo(()=>{if(!open||limited)return null;try{return adaptToCollection(idea,items);}catch(e){return {error:e.message};}},[idea,items,open,limited]);
  return <section className="nmCollectionContext"><h2>Avec mes produits</h2><p>Retrouve les références que tu possèdes, ou une teinte proche quand sa finition est renseignée.</p><button className="nmButton nmButton-secondary" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><Palette size={17}/>Adapter à ma collection</button>
    {open&&(limited?<p>Cette adaptation utilise ta Collection et nécessite Plus ou Pro. Tu peux continuer à créer librement.</p>:result?.error?<p role="alert">{result.error}</p>:result&&<><p>Une couleur proche n’est pas une garantie de compatibilité des produits. Vérifie leurs protocoles.</p>{result.comparisons.map(row=><p key={row.target.id}><b>{row.target.name}</b> · {row.state==='owned'?'Référence possédée':row.state==='near'?'Teinte proche : '+row.matches[0].name:row.state==='check'?'Fiche à vérifier':'Aucune alternative suffisamment renseignée'}{row.unknown?.length?' · '+row.unknown.join(' '):''}</p>)}
    {result.idea?<><NailPreview idea={result.idea}/>{result.checklist.rows.some(r=>r.state!=='owned')||result.checklist.notes.length||result.checklist.partial.length?<p>La palette est adaptée. Certains outils ou détails techniques restent à vérifier dans la fiche DIY.</p>:null}<button className="nmButton nmButton-primary" onClick={()=>onOpen(result.idea)}>Ouvrir cette variante<ArrowRight size={17}/></button></>:<p>Aucune variante complète pour le moment : les références manquantes ci-dessus ne sont pas remplacées au hasard.</p>}
    <button className="nmQuiet" onClick={()=>onCollection()}>Vérifier ma collection</button></>)}
  </section>;
}
