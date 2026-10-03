import React,{useEffect,useRef,useState} from 'react';
import {Globe,RefreshCw} from 'lucide-react';
import {useStorage} from './StorageContext';
import {proposedCatalogMatch} from './recognitionReport';
import {productLookupInput,lookupKey,searchProductOnline,onlineVariant} from './productLookup';
import {identityMatch} from '../supabase/functions/_shared/lookupIdentity.mjs';
import './online-product-lookup.css';
export default function OnlineProductLookup({report,item,onChoose,onStatus,enabled=true}) {
 const storage=useStorage(),input=productLookupInput(report||{},item||{}),key=lookupKey(input);
 const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0),request=useRef(null);
 const [variants,setVariants]=useState({});
 const previous=useRef(null);previous.current=result;
 const eligible=enabled&&Boolean(report)&&!proposedCatalogMatch(report);
 const statusCallback=useRef(onStatus);statusCallback.current=onStatus;
 useEffect(()=>{
  request.current?.abort();
  const retained=eligible&&previous.current?.candidates?.some(c=>identityMatch(c,input))?previous.current:null;
  setResult(retained);if(!retained)setVariants({});setBusy(false);statusCallback.current?.(Boolean(retained?.candidates?.length));
  if(!eligible)return;
  const controller=new AbortController();request.current=controller;
  const timer=setTimeout(async()=>{
   setBusy(input.sufficient&&(!retained||retry>0));
   try {
    const r=await searchProductOnline(input,{signal:controller.signal,storage,refresh:retry>0});
    if(controller.signal.aborted)return;
    setResult(r);statusCallback.current?.(Boolean(r.candidates?.length));
   } catch { /* New evidence or manual edit cancelled this request. */ }
   finally {if(!controller.signal.aborted)setBusy(false);}
  },200);
  return()=>{clearTimeout(timer);controller.abort();};
 },[key,eligible,retry,storage]);
 useEffect(()=>{
  const changed=()=>setRetry(v=>v+1);
  window.addEventListener('online',changed);return()=>window.removeEventListener('online',changed);
 },[]);
 if(!eligible)return null;
 return <section className="onlineProductLookup" aria-label="Recherche Internet du produit">
  <h3><Globe size={18}/>{busy?'Recherche Internet…':result?.candidates?.length?'Produit trouvé en ligne':'Recherche Internet'}</h3>
  <p role="status">{busy?'Recherche de la référence sur les sites de produits…':result?.message||'Recherche dans NailMoods puis sur Internet.'}</p>
  {result?.cached&&<p className="fieldHelp">{result.offline?'Fiche enregistrée disponible hors connexion.':'Fiche récemment récupérée.'}</p>}
  {result?.candidates?.map((original,i)=>{const candidate=variants[original.source]||original;return <article key={original.source+'-'+i}>
   <b>{candidate.fields.brand} · {candidate.fields.name}</b>
   <p>{[candidate.fields.collection,candidate.fields.reference&&'Réf. '+candidate.fields.reference,candidate.fields.barcode&&'Code '+candidate.fields.barcode].filter(Boolean).join(' · ')}</p>
   <a href={candidate.source} target="_blank" rel="noopener noreferrer">{candidate.provider||'Voir la fiche source'}</a>
   {candidate.attribution&&<small>{candidate.attribution}</small>}
   {candidate.license&&<a href={candidate.license} target="_blank" rel="noopener noreferrer">Licence des données</a>}
   {candidate.needsVariant&&<label>Teinte / variante<select value={candidate.variantId||''} onChange={e=>setVariants(v=>({...v,[original.source]:onlineVariant(original,e.target.value)}))}><option value="" disabled>Choisis la référence exacte</option>{candidate.variants.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}</select></label>}
   {!candidate.fields.color&&<small>La teinte exacte n’est pas publiée : choisis ou corrige la couleur dans ta fiche.</small>}
   <button type="button" disabled={candidate.needsVariant&&!candidate.variantId} onClick={()=>onChoose(candidate)}>Préremplir avec ce produit</button>
  </article>;})}
  {!busy&&input.sufficient&&result?.status!=='auth_required'&&<button type="button" className="onlineRetry" onClick={()=>setRetry(v=>v+1)}><RefreshCw size={15}/>Relancer la recherche Internet</button>}
 </section>;
}
