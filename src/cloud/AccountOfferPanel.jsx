import {track} from '../analytics/analytics';
import React,{useEffect,useMemo,useState} from 'react';
import {BriefcaseBusiness,Check,Heart,ShieldCheck,Sparkles} from 'lucide-react';
import {ACCOUNT_OFFERS,accountOfferService,normalizeAccountTier} from './betaTier';
import {DENIED} from '../privacy/policy';
import {privacyService} from '../privacy/service';
import {LegalLinks} from '../privacy/PrivacyPanel';

const icons={free:Heart,plus:Sparkles,pro:BriefcaseBusiness};

export default function AccountOfferPanel({client,userId,store,onApplied}){
 const service=useMemo(()=>accountOfferService(client),[client]);
 const [state,setState]=useState(null),[selected,setSelected]=useState('free'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[accept,setAccept]=useState(false),[adult,setAdult]=useState(false);
 async function load(){const next=await service.state();setState(next);setSelected(normalizeAccountTier(next.tier));return next;}
 useEffect(()=>{let active=true;setState(null);setNotice('');load().catch(()=>{if(active)setNotice('Ton offre ne peut pas être chargée pour le moment. Réessaie après avoir vérifié ta connexion.');});return()=>{active=false;};},[service,userId]);
 async function choose(){
  setBusy(true);setNotice('');
  try{
   if(!state?.canChoose){
    if(state?.reason!=='consent_required'||!accept||!adult)throw new Error('requirements');
    await privacyService(client).save(DENIED,true,true);
   }
   if(!await store.flush())throw new Error('sync');
   const next=await service.choose(selected);track('tier_changed',{from_tier:state.tier,to_tier:selected,source:'beta_selection'});setState(next);setAccept(false);setAdult(false);
   await onApplied();
   setNotice(selected==='pro'?'Ton compte Pro bêta est actif. Choisis maintenant ton statut professionnel dans le bloc suivant.':`Ton compte ${selected==='plus'?'Plus':'Free'} bêta est actif.`);
  }catch(error){
   setNotice(error?.message==='sync'?'Synchronise les modifications en attente avant de changer d’offre.':'Le changement n’a pas été confirmé. Tes données et ton offre précédente sont conservées.');
  }finally{setBusy(false);}
 }
 return <section id="account-offer" className="card accountOffer" aria-labelledby="account-offer-title">
  <div className="accountOfferHeading"><div><small>MON OFFRE</small><h2 id="account-offer-title">Choisis ton NailMoods</h2><p>Trois façons d’utiliser l’application. Pendant la bêta, aucun paiement n’est demandé.</p></div><ShieldCheck aria-hidden="true"/></div>
  <div className="accountOfferGrid" role="radiogroup" aria-label="Type de compte">
   {ACCOUNT_OFFERS.map(offer=>{const Icon=icons[offer.tier],current=state?.tier===offer.tier,active=selected===offer.tier;return <button type="button" role="radio" aria-checked={active} className={active?'selected':''} key={offer.tier} disabled={busy} onClick={()=>setSelected(offer.tier)}><span className="offerIcon"><Icon/></span><span className="offerCopy"><span><b>{offer.name}</b>{current&&<em><Check/>Compte actuel</em>}</span><small>{offer.tagline}</small><ul>{offer.features.map(item=><li key={item}>{item}</li>)}</ul></span></button>;})}
  </div>
  {state?.reason==='consent_required'&&<div className="offerConsent" role="status"><p>Avant d’activer une offre, confirme les règles de la bêta.</p><LegalLinks/><label className="consentCheck"><input type="checkbox" checked={adult} onChange={event=>setAdult(event.target.checked)}/>Je certifie avoir 18 ans ou plus.</label><label className="consentCheck"><input type="checkbox" checked={accept} onChange={event=>setAccept(event.target.checked)}/>J’accepte les Conditions d’utilisation.</label></div>}
  {state?.reason==='selection_disabled'&&<p role="status">Le changement d’offre est temporairement fermé. Ton compte actuel et toutes tes données restent accessibles.</p>}
  <button className="accountOfferAction" type="button" disabled={busy||!state||selected===state.tier||state.reason==='selection_disabled'||(state.reason==='consent_required'&&(!accept||!adult))} onClick={choose}>{busy?'Activation…':selected===state?.tier?'Offre déjà active':`Choisir ${ACCOUNT_OFFERS.find(item=>item.tier===selected)?.name}`}</button>
  <small className="offerDataNote">Changer d’offre ne supprime jamais ta collection, ton journal ni ton espace Pro. Après un passage à Free, tes projets restent consultables ; les échanges et les modifications avancées demandent Plus ou Pro.</small>
  {notice&&<p className="offerNotice" role="status">{notice}</p>}
 </section>;
}
