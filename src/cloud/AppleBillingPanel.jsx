import React,{useEffect,useState} from 'react';
import {LegalLinks} from '../privacy/PrivacyPanel';
import {APPLE_PRODUCTS,loadAppleOffers,applePeriod,appleError,purchaseAppleTier,reconcileApple,readBillingEntitlement,manageAppleSubscription} from './appleBilling';
export default function AppleBillingPanel({client,tier,onApplied}) {
  const [products,setProducts]=useState([]),[context,setContext]=useState(null),[state,setState]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  function applyOffers(result){setState(result.state);setContext(result.context);setProducts(result.products);setNotice(result.error?appleError(result.error):'');}
  async function load(refresh=false){const result=await loadAppleOffers(client,refresh);applyOffers(result);if(result.error)throw result.error;return result;}
  useEffect(()=>{let alive=true;loadAppleOffers(client).then(result=>{if(alive)applyOffers(result);});return()=>{alive=false};},[client,tier]);
  async function act(action){setBusy(true);setNotice('');try{
    const result=await action();await load();await onApplied?.();
    setNotice(result?.state==='pending'?'Achat en attente de confirmation par Apple. Aucun accès supplémentaire n’est encore accordé.':result?.state==='canceled'?'Achat annulé.':result?.failed?'Vérification incomplète. Réessaie la restauration.':'Tes droits ont été actualisés depuis le serveur.');
  }catch(e){setNotice(appleError(e));}finally{setBusy(false);}}
  return <section className="card accountOffer billingPanel" aria-labelledby="apple-offer-title"><small>ABONNEMENTS APP STORE</small><h2 id="apple-offer-title">Mon offre</h2><p>Free reste gratuit. Les abonnements sont facultatifs.</p>
    {state?.instituteActive&&<p>Ton accès Pro est inclus dans ton salon. Aucun second abonnement n’est nécessaire.</p>}{state?.manualPriority&&<p>Ton accès {state.manualTier==='pro'?'Pro':'Plus'} est offert par NailMoods. Aucune souscription n’est nécessaire.</p>}
    {context?.otherProviderActive&&<p>Ton offre est déjà active sur ton compte. Aucun second abonnement n’est nécessaire.</p>}
    {context?.enabled===false&&<p>Les abonnements Apple ne sont pas encore ouverts.</p>}
    <div className="billingChoices">{[['plus','Plus','Toutes les fonctions Free, projets depuis 1 à 4 photos, Découvrir, connexions et partage.'],['pro','Pro','Les fonctions Plus, le profil et l’espace professionnel, le nuancier et l’Atelier Pro.']].map(([key,label,description])=>{
      const product=products.find(p=>p.productId===APPLE_PRODUCTS[key]),period=applePeriod(product),available=Boolean(product?.formattedPrice&&period);
      return <div className="billingChoice" key={key}><h3>{label}</h3><p>{description}</p>{available&&<><p><b>{product.formattedPrice} / {period}</b></p><p>Durée de chaque période : {product.periodValue===1?'1 ':''}{period}. Facturation à chaque période. Renouvellement automatique sauf annulation dans les réglages de ton compte Apple avant le renouvellement. L’accès reste valable jusqu’à la fin de la période payée, sauf remboursement ou révocation.</p></>}
      <button disabled={busy||state?.instituteActive||!context?.enabled||!context?.canPurchase||!available} onClick={()=>act(()=>purchaseAppleTier(client,key,product))}>Acheter {label}{available?` · ${product.formattedPrice} / ${period}`:' · indisponible'}</button></div>;
    })}</div>
    <p>Plus et Pro appartiennent au même groupe. Apple présente les modalités du changement d’offre avant confirmation. Une baisse d’offre prend normalement effet au prochain renouvellement.</p>
    <div className="consentActions"><button disabled={busy||!context?.enabled} onClick={()=>act(()=>reconcileApple(client,true))}>Restaurer mes achats</button><button disabled={busy} onClick={()=>act(manageAppleSubscription)}>Gérer mon abonnement</button><button disabled={busy} onClick={async()=>{setBusy(true);setNotice('');try{await load(true);}catch(e){setNotice(appleError(e));}finally{setBusy(false);}}}>Actualiser les offres</button></div>
    <LegalLinks/>{notice&&<p role="status" aria-live="polite">{notice}</p>}
  </section>;
}
