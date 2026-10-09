import React, { useEffect, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { BILLING_PRODUCTS, isGooglePlayAndroid, loadBillingProducts, purchaseTier, readGooglePlayEntitlement, restoreGooglePlayPurchases } from './googlePlayBilling';
import { billingPeriodLabel, hasGoogleSubscription, billingNotice, billingError } from './billingPresentation';
import { LegalLinks } from '../privacy/PrivacyPanel';

export default function GooglePlayBillingPanel({ client, tier, onApplied }) {
  const [products, setProducts] = useState([]), [state, setState] = useState(null), [context, setContext] = useState(null);
  const [busy, setBusy] = useState(''), [notice, setNotice] = useState('');
  const android = isGooglePlayAndroid();
  async function refresh() { const next = await readGooglePlayEntitlement(client); setState(next); return next; }
  async function load() {
    try {
      await refresh();
      if (android) { const next = await loadBillingProducts(client); setProducts(next.products); setContext(next.context); }
    } catch { setNotice('Les offres sont momentanément indisponibles. Tes données et tes accès existants restent conservés.'); }
  }
  useEffect(() => { let alive = true; (async () => {
    try {
      const next = await readGooglePlayEntitlement(client);
      const available = android ? await loadBillingProducts(client) : { products: [], context: null };
      if (alive) { setState(next); setProducts(available.products); setContext(available.context); }
    } catch { if (alive) setNotice('Les offres ne sont pas encore disponibles. Tu peux continuer avec Free ou ton accès offert.'); }
  })(); return () => { alive = false; }; }, [client, tier]);
  async function buy(key) {
    setBusy(key); setNotice('');
    try {
      const result = await purchaseTier(client, key, products.find(p => p.productId === BILLING_PRODUCTS[key]));
      const next = await refresh(); await onApplied?.(); setNotice(billingNotice(result, next));
    } catch (error) { setNotice(billingError(error)); }
    finally { setBusy(''); }
  }
  async function restore() {
    setBusy('restore'); setNotice('');
    try {
      const result = await restoreGooglePlayPurchases(client);
      const next = await refresh(); await onApplied?.(); setNotice(billingNotice(result, next, true));
    } catch (error) { setNotice(billingError(error)); }
    finally { setBusy(''); }
  }
  const manual = state?.manualPriority === true, existing = hasGoogleSubscription(state);
  const manage = 'https://play.google.com/store/account/subscriptions?package=' + encodeURIComponent(state?.packageName || 'com.nailmoods.app');
  return <section className="card accountOffer billingPanel" aria-labelledby="billing-panel-title">
    <div className="accountOfferHeading"><div><small>ABONNEMENTS GOOGLE PLAY</small><h2 id="billing-panel-title">Plus et Pro</h2><p>Free reste utilisable sans abonnement. Les abonnements sont facultatifs.</p></div><Sparkles aria-hidden="true"/></div>
    {context?.instituteActive && <p>Ton salon inclut déjà les fonctions Pro. Aucun abonnement individuel supplémentaire n’est nécessaire.</p>}
    {context?.otherProviderActive && <p>Ton offre est déjà active sur ton compte. Aucun second abonnement n’est nécessaire.</p>}
    {manual && <p className="accountOfferCurrent">Ton accès {state.manualTier === 'pro' ? 'Pro' : 'Plus'} est offert par NailMoods. Aucune souscription n’est nécessaire.</p>}
    {!android && <p>Pour souscrire, utilise l’application Android installée depuis Google Play.</p>}
    {android && !context?.enabled && <p>Les abonnements ne sont pas encore ouverts. Tes accès actuels restent disponibles.</p>}
    {android && context?.enabled && !context.eligible && <p>Pour souscrire, confirme les conditions et ta majorité dans Profil → Confidentialité.</p>}
    <div className="billingChoices">
      {[['plus','Plus','Toutes les fonctions Free, projets depuis 1 à 4 photos, Découvrir, connexions et partage.'],['pro','Pro','Les fonctions Plus, le profil et l’espace professionnel, le nuancier et l’Atelier Pro.']].map(([key,label,description]) => {
        const product = products.find(p => p.productId === BILLING_PRODUCTS[key]);
        const period = billingPeriodLabel(product?.billingPeriod);
        const available = product?.formattedPrice && period;
        return <div className="billingChoice" key={key}><div><h3>{label}</h3><p>{description}</p>
          {available ? <><p><strong>{product.formattedPrice} / {period}</strong></p><p>Facturé chaque {period}. Renouvellement automatique au même tarif, sauf changement annoncé par Google Play. Résiliable dans Google Play ; accès conservé jusqu’à la fin de la période payée, sauf remboursement ou révocation.</p></> : <p>Prix indisponible : aucune souscription proposée.</p>}
          <button disabled={busy !== '' || !android || !context?.enabled || !context?.canPurchase || context?.instituteActive || manual || existing || !available} onClick={() => buy(key)}>{busy === key ? 'Vérification…' : available ? 'S’abonner à ' + label + ' · ' + product.formattedPrice + ' / ' + period : label + ' indisponible'}</button>
        </div></div>;
      })}
    </div>
    {existing && <p>Pour changer d’offre, gère ton abonnement dans Google Play. Une nouvelle souscription sera possible après sa fin ; aucun second abonnement n’est lancé ici.</p>}
    <div className="consentActions"><button className="detailSecondary" disabled={busy !== '' || !android || !context?.enabled} onClick={restore}><RotateCcw aria-hidden="true"/> Restaurer mes achats</button><button disabled={busy !== ''} onClick={load}>Actualiser les offres</button></div>
    <p><a href={manage} target="_blank" rel="noopener noreferrer">Gérer ou résilier mon abonnement Google Play</a></p>
    <LegalLinks/>
    {notice && <p className="offerNotice" role="status">{notice}</p>}
  </section>;
}
