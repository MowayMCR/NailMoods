import React, { useEffect, useState } from 'react';
import { Check, RotateCcw, Sparkles, BriefcaseBusiness } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { loadBillingProducts, purchaseTier, readGooglePlayEntitlement, restoreGooglePlayPurchases } from './googlePlayBilling';

const rank = { free: 0, plus: 1, pro: 2 };

export default function GooglePlayBillingPanel({ client, tier, onApplied }) {
  const [products, setProducts] = useState([]);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh() {
    try { setState(await readGooglePlayEntitlement(client)); } catch { /* migration may not be applied yet */ }
  }
  useEffect(() => {
    let alive = true;
    refresh();
    if (Capacitor.getPlatform() === 'android') loadBillingProducts().then(next => { if (alive) setProducts(next); }).catch(() => {});
    return () => { alive = false; };
  }, [client]);

  async function buy(nextTier) {
    setBusy(nextTier); setNotice('');
    try {
      await purchaseTier(client, nextTier);
      await refresh(); await onApplied?.();
      setNotice('Ton accès ' + (nextTier === 'plus' ? 'Plus' : 'Pro') + ' est actif.');
    } catch (error) {
      setNotice(error?.message === 'billing_not_available' ? 'Les achats sont disponibles dans la version Android distribuée par Google Play.' : 'L’achat n’a pas pu être confirmé. Aucun droit n’a été modifié.');
    } finally { setBusy(''); }
  }

  async function restore() {
    setBusy('restore'); setNotice('');
    try {
      await restoreGooglePlayPurchases(client);
      await refresh(); await onApplied?.();
      setNotice('Tes achats Google Play ont été restaurés.');
    } catch { setNotice('Aucun achat n’a pu être restauré pour le moment.'); }
    finally { setBusy(''); }
  }

  const manualPriority = state?.manualPriority || ['admin', 'beta_self_selection', 'legacy'].includes(state?.source);
  return <section className="card accountOffer billingPanel" aria-labelledby="billing-panel-title">
    <div className="accountOfferHeading"><div><small>ABONNEMENTS</small><h2 id="billing-panel-title">Mon offre</h2><p>Les droits attribués manuellement restent prioritaires sur les achats Google Play.</p></div><Sparkles aria-hidden="true"/></div>
    {manualPriority && <p className="accountOfferCurrent" role="status"><Check aria-hidden="true"/> Accès {tier === 'pro' ? 'Pro' : tier === 'plus' ? 'Plus' : 'Free'} attribué par NailMoods.</p>}
    <div className="billingChoices">
      {[['plus','Plus','Import photo, journal et fonctionnalités sociales',Sparkles],['pro','Pro','Espace professionnel et Atelier Pro',BriefcaseBusiness]].map(([key,label,description,Icon]) =>
        <div className="billingChoice" key={key}><Icon aria-hidden="true"/><div><b>{label}</b><small>{description}</small></div>{rank[tier] >= rank[key] && manualPriority ? <span>Accès actif</span> : <button disabled={busy!=='' || manualPriority} onClick={() => buy(key)}>{busy===key ? 'Validation…' : products.length ? 'Choisir' : 'Android / Play'}</button>}</div>
      )}
    </div>
    <button className="detailSecondary" disabled={busy!==''} onClick={restore}><RotateCcw aria-hidden="true"/> Restaurer mes achats</button>
    {Capacitor.getPlatform() !== 'android' && <small>Les achats seront activés dans l’application Android distribuée par Google Play.</small>}
    {notice && <p className="offerNotice" role="status">{notice}</p>}
  </section>;
}
