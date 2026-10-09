import React,{useEffect,useState} from 'react';
import {LegalLinks} from '../privacy/PrivacyPanel';
import {APPLE_PRODUCTS,AppleBilling,appleContext,applePeriod,appleError,purchaseAppleTier,reconcileApple,readBillingEntitlement,manageAppleSubscription} from './appleBilling';
export default function AppleBillingPanel({client,tier,onApplied}) {
  const [products,setProducts]=useState([]),[context,setContext]=useState(null),[state,setState]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  async function load(){const s=await readBillingEntitlement(client),c=await appleContext(client);setState(s);setContext(c);setProducts(c.enabled?(await AppleBilling.getProducts()).products:[]);}
  useEffect(()=>{let alive=true;(async()=>{try{const s=await readBillingEntitlement(client),c=await appleContext(client),p=c.enabled?(await AppleBilling.getProducts()).products:[];if(alive){setState(s);setContext(c);setProducts(p);}}catch{if(alive)setNotice('Les offres sont momentanément indisponibles. Free et tes accès actuels restent accessibles.');}})();return()=>{alive=false};},[client,tier]);
  async function act(action){setBusy(true);setNotice('');try{
    const result=await action();await load();await onApplied?.();
    setNotice(result?.state==='pending'?'Achat en attente de confirmation par Apple. Aucun accès supplémentaire n’est encore accordé.':result?.state==='canceled'?'Achat annulé.':result?.failed?'Vérification incomplète. Réessaie la restauration.':'Tes droits ont été actualisés depuis le serveur.');
  }catch(e){setNotice(appleError(e));}finally{setBusy(false);}}
  return <section className="card accountOffer billingPanel" aria-labelledby="apple-offer-title"><small>ABONNEMENTS APP STORE</small><h2 id="apple-offer-title">Mon offre</h2><p>Free reste gratuit. Les abonnements sont facultatifs.</p>
    {state?.manualPriority&&<p>Ton accès {state.manualTier==='pro'?'Pro':'Plus'} est offert par NailMoods. Aucune souscription n’est nécessaire.</p>}
    {context?.instituteActive&&<p>Ton institut fournit déjà un accès. Aucun second abonnement n’est nécessaire.</p>}
    {context?.otherProviderActive&&<p>Ton offre est déjà active sur ton compte. Aucun second abonnement n’est nécessaire.</p>}
    {!context?.enabled&&<p>Les abonnements Apple ne sont pas encore ouverts.</p>}
    <div className="billingChoices">{[['plus','Plus','Toutes les fonctions Free, projets depuis 1 à 4 photos, Découvrir, connexions et partage.'],['pro','Pro','Les fonctions Plus, le profil et l’espace professionnel, le nuancier et l’Atelier Pro.']].map(([key,label,description])=>{
      const product=products.find(p=>p.productId===APPLE_PRODUCTS[key]),period=applePeriod(product),available=Boolean(product?.formattedPrice&&period);
      return <div className="billingChoice" key={key}><h3>{label}</h3><p>{description}</p>{available&&<><p><b>{product.formattedPrice} / {period}</b></p><p>Durée de chaque période : {product.periodValue===1?'1 ':''}{period}. Facturation à chaque période. Renouvellement automatique sauf annulation dans les réglages de ton compte Apple avant le renouvellement. L’accès reste valable jusqu’à la fin de la période payée, sauf remboursement ou révocation.</p></>}
      <button disabled={busy||!context?.enabled||!context?.canPurchase||!available} onClick={()=>act(()=>purchaseAppleTier(client,key,product))}>Acheter {label}{available?` · ${product.formattedPrice} / ${period}`:' · indisponible'}</button></div>;
    })}</div>
    <p>Plus et Pro appartiennent au même groupe. Apple présente les modalités du changement d’offre avant confirmation. Une baisse d’offre prend normalement effet au prochain renouvellement.</p>
    <div className="consentActions"><button disabled={busy||!context?.enabled} onClick={()=>act(()=>reconcileApple(client,true))}>Restaurer mes achats</button><button disabled={busy} onClick={()=>act(manageAppleSubscription)}>Gérer mon abonnement</button><button disabled={busy} onClick={()=>act(load)}>Actualiser les offres</button></div>
    <LegalLinks/>{notice&&<p role="status" aria-live="polite">{notice}</p>}
  </section>;
}
