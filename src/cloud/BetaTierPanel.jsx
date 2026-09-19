import React,{useEffect,useState} from 'react';
import {betaTierService} from './betaTier';
export default function BetaTierPanel({client,userId,store,onApplied}) {
 const [state,setState]=useState(null),[tier,setTier]=useState('free'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;setState(null);betaTierService(client).state().then(s=>{if(active){setState(s);setTier(s.tier);}}).catch(()=>{});return()=>{active=false;};},[client,userId]);
 async function apply(){
  setBusy(true);setError('');
  try{
   // Ne pas enfermer des modifications Plus dans une queue après downgrade.
   if(!await store.flush())throw new Error('Synchronise les modifications en attente avant de changer de niveau.');
   const result=await betaTierService(client).apply(tier);
   setState(result);await onApplied();
  }catch{setError('Changement non confirmé. Vérifie la synchronisation et ton autorisation de recette, puis réessaie.');}
  finally{setBusy(false);}
 }
 if(!state?.canChange)return null;
 return <section className="accountImport"><h3>Type de compte — mode bêta</h3><p>Type actuel : {state.tier.toUpperCase()}</p><label>Profil de test<select value={tier} disabled={busy} onChange={e=>setTier(e.target.value)}>{['free','plus','pro'].map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}</select></label><button disabled={busy||tier===state.tier} onClick={apply}>{busy?'Application…':'Appliquer le profil de test'}</button><small>Mode bêta — aucun abonnement réel.</small>{error&&<p role="alert">{error}</p>}</section>;
}
