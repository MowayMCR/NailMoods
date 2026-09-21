import {stopActiveAnalytics} from '../analytics/analytics';
import React, { useEffect, useState } from 'react';
import Sheet from '../Sheet';
import { TERMS_VERSION, PRIVACY_VERSION, TECHNOLOGIES, DENIED, availableChoices, readGuestConsent, GUEST_CONSENT_KEY } from './policy';
import { privacyService, downloadJSON } from './service';
import './privacy.css';
const legal = name => `${import.meta.env.BASE_URL}legal/${name}-0.1-beta.html`;
export function LegalLinks() { return <p className="legalLinks"><a href={legal('conditions')} target="_blank" rel="noopener">Conditions d’utilisation</a><a href={legal('confidentialite')} target="_blank" rel="noopener">Politique de confidentialité</a></p>; }
export default function PrivacyPanel({ client, userId, tier, guestStorage, onDeleted, localDraft }) {
  const [panel, setPanel] = useState(null), [choices, setChoices] = useState(DENIED), [record, setRecord] = useState(null);
  const [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(!userId), [notice, setNotice] = useState(''), [confirmation, setConfirmation] = useState(''), [accept, setAccept] = useState(false), [adult, setAdult] = useState(false);
  useEffect(() => { let cancelled = false;
    setChoices(DENIED); setRecord(null); setLoaded(!userId); setNotice(''); setConfirmation(''); setAccept(false); setAdult(false);
    if (userId && client) privacyService(client).load().then(value => {
      if (!cancelled) { setRecord(value); setChoices(availableChoices(value || {})); setLoaded(true); }
    }).catch(() => { if (!cancelled) setNotice('Impossible de charger tes choix. Aucun service facultatif n’est activé. Ferme puis rouvre ton profil pour réessayer.'); });
    else { const value = readGuestConsent(guestStorage); setRecord(value); setChoices(availableChoices(value || {})); }
    return () => { cancelled = true; };
  }, [userId, client, guestStorage]);
  const needsTerms = userId && loaded && (record?.terms_version !== TERMS_VERSION || !record?.adult_confirmed_at);
  async function save(next = choices, acceptTerms = false, confirmAdult = false) {
    setBusy(true); setNotice('');
    try {
      const safe = availableChoices(next);
      if(!safe.analytics_consent)stopActiveAnalytics();
      const value = userId ? await privacyService(client).save(safe, acceptTerms, confirmAdult) : { ...safe, privacy_version: PRIVACY_VERSION, consent_updated_at: new Date().toISOString() };
      if (!userId) guestStorage.setItem(GUEST_CONSENT_KEY, JSON.stringify(value));
      window.dispatchEvent(new Event('nm-consent-changed'));
      setRecord(value); setChoices(safe); setNotice('Tes choix sont enregistrés. Les fonctions essentielles restent accessibles.');
    } catch { setNotice('Tes choix n’ont pas pu être enregistrés. Aucun service facultatif n’est activé. Réessaie.'); }
    finally { setBusy(false); }
  }
  async function exportData() { setBusy(true); setNotice(''); try {
    const result = userId ? await privacyService(client).exportData() : { format: 'nailmoods-guest-v1', data: localDraft?.(), privacy: readGuestConsent(guestStorage) };
    // Include unsynced local changes, distinctly labelled.
    if (userId) result.local_pending_copy = localDraft?.();
    downloadJSON(result, 'nailmoods-mes-donnees.json'); setNotice('Ton export JSON est prêt. Il peut contenir des photos privées : conserve-le en lieu sûr.');
  } catch { setNotice('L’export n’a pas abouti. Réessaie ; aucune donnée n’a été supprimée.'); } finally { setBusy(false); } }
  async function remove() { setBusy(true); setNotice(''); try {
    const deleted = await privacyService(client).deleteAccount(confirmation); await onDeleted(deleted);
  } catch (error) { setNotice(error?.message?.includes('shared_workspace') ? 'Ton espace comporte d’autres membres. Transfère sa propriété avant de supprimer ton compte.' : 'La suppression n’a pas abouti. Aucune suppression partielle n’est effectuée. Réessaie ou contacte NailMoods.'); } finally { setBusy(false); } }
  return <section id="privacy-settings" className="card privacySection"><h2>Confidentialité</h2><p>Tes choix restent les tiens. Refuser les options ne bloque pas NailMoods.</p>
    {needsTerms && <div role="status"><p>Pour activer les fonctions de compte et de profil public, confirme les règles de la bêta. Tu peux continuer à explorer sans accepter.</p><LegalLinks/><label className="consentCheck"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)}/>Je certifie avoir 18 ans ou plus.</label><label className="consentCheck"><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)}/>J’accepte les Conditions d’utilisation, version {TERMS_VERSION}</label><button disabled={!accept || !adult || busy} onClick={() => save(choices, true, true)}>Enregistrer mes confirmations</button></div>}
    <div className="privacyLinks"><button onClick={() => { setPanel('choices'); setNotice(''); }}>Mes choix de confidentialité</button><button onClick={() => { setPanel('choices'); setNotice(''); }}>Publicité</button><button onClick={() => { setPanel('data'); setNotice(''); }}>Mes données</button><button disabled={busy} onClick={exportData}>Télécharger mes données</button>{userId && <button onClick={() => { setConfirmation(''); setPanel('delete'); setNotice(''); }}>Supprimer mon compte</button>}</div><LegalLinks/>
    {!panel && notice && <p role="status">{notice}</p>}
    {panel && <Sheet title={panel === 'choices' ? 'Vos choix de confidentialité' : panel === 'delete' ? 'Supprimer mon compte' : 'Mes données'} className="privacySheet" onClose={() => { if (!busy) setPanel(null); }}>
      {panel === 'choices' && <>
        <p>NailMoods utilise les éléments nécessaires au fonctionnement de l’application. Avec votre accord, certaines technologies peuvent aussi être utilisées pour mesurer l’audience et afficher ou personnaliser des publicités.</p>
        <p>Avec ton accord, NailMoods mesure uniquement des événements techniques et d’usage pseudonymisés afin d’améliorer le service, ses performances et sa sécurité. Aucun contenu privé, photo, message, note, email ni prompt complet n’est collecté. Aucun partenaire publicitaire n’est activé.</p>
        {(tier === 'plus' || tier === 'pro') && <p>Ton offre {tier === 'plus' ? 'Plus' : 'Pro'} est sans publicité.</p>}
        <div className="consentActions"><button disabled={busy || !loaded} onClick={() => save({ analytics_consent: true, ads_consent: true, personalized_ads_consent: true })}>Tout accepter</button><button disabled={busy || !loaded} onClick={() => save(DENIED)}>Tout refuser</button><button onClick={() => document.getElementById('privacy-options')?.focus()}>Personnaliser</button></div>
        <div id="privacy-options" tabIndex={-1}><h3>Personnaliser</h3><p><b>Nécessaires · toujours actifs</b><br/>Connexion, sécurité, session, sauvegarde, synchronisation et préférences indispensables.</p>
          {TECHNOLOGIES.analytics && <label className="consentCheck"><input type="checkbox" checked={choices.analytics_consent} onChange={e => setChoices({ ...choices, analytics_consent: e.target.checked })}/>Mesure d’audience</label>}
          <label className="consentCheck"><input type="checkbox" disabled={!TECHNOLOGIES.ads || tier === 'plus' || tier === 'pro'} checked={choices.ads_consent} onChange={e => setChoices({ ...choices, ads_consent: e.target.checked, personalized_ads_consent: e.target.checked && choices.personalized_ads_consent })}/>Publicité {!TECHNOLOGIES.ads && '· non activée'}</label>
          <label className="consentCheck"><input type="checkbox" disabled={!TECHNOLOGIES.personalizedAds || !choices.ads_consent} checked={choices.personalized_ads_consent} onChange={e => setChoices({ ...choices, personalized_ads_consent: e.target.checked })}/>Publicité personnalisée {!TECHNOLOGIES.personalizedAds && '· non activée'}</label>
          <button disabled={busy || !loaded} onClick={() => save()}>Enregistrer mes choix</button>
        </div>
        {record?.consent_updated_at && <p>Dernier choix enregistré : {new Date(record.consent_updated_at).toLocaleDateString('fr-FR')}. Notice version {record.privacy_version}.</p>}
      </>}
      {panel === 'data' && <><p>Ton export regroupe ton profil, tes produits, stickers, matériel, inspirations, journal, favoris, données Pro personnelles et choix de confidentialité. Les modifications locales en attente sont identifiées séparément.</p><p>Les photos incorporées aux fiches sont incluses ; les photos enregistrées sous forme de liens restent des liens. Les fichiers déjà téléchargés et les copies volontairement partagées ne peuvent pas être effacés à distance.</p><button disabled={busy} onClick={exportData}>Télécharger mes données</button></>}
      {panel === 'delete' && <><p>Cette action est définitive. Elle supprime ton compte, tes espaces dont tu es propriétaire, leurs produits, inspirations et journal, tes contenus privés et tes données de profil. Les messages texte déjà envoyés restent visibles chez leurs destinataires sous « Compte supprimé », sans ton nom, ton @ID ni ton avatar. Les données invitées de cet appareil sont conservées.</p><p>Télécharge tes données avant de continuer si tu souhaites les garder. Les copies déjà enregistrées par un destinataire ne sont pas supprimées à distance.</p><button disabled={busy} onClick={exportData}>Télécharger mes données</button><label>Écris SUPPRIMER pour confirmer<input autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)}/></label><button disabled={busy || confirmation !== 'SUPPRIMER'} onClick={remove}>Confirmer la suppression définitive</button><button disabled={busy} onClick={() => setPanel(null)}>Annuler</button></>}
      {notice && <p role="status">{notice}</p>}
    </Sheet>}
  </section>;
}
