import React, { useState } from 'react';
import Sheet from './Sheet';
import { browserStorage } from './storage';

const categories=['Bug','Produit non reconnu','Mauvaise couleur','Idée générée incohérente','Suggestion','Problème d’interface'];
const key='nm-feedback-draft-v1';
function readDraft(){try{return JSON.parse(browserStorage.getItem(key)||'null')||{};}catch{return {};}}
export default function Feedback({ screen, onClose }) {
  const [draft,setDraft]=useState(readDraft);
  const [message,setMessage]=useState('');
  const category=categories.includes(draft.category)?draft.category:categories[0];
  const update=values=>{const next={...draft,...values};setDraft(next);try{browserStorage.setItem(key,JSON.stringify(next));setMessage('Brouillon conservé sur cet appareil.');}catch{setMessage('Brouillon non sauvegardé. Copie ton retour avant de fermer.');}};
  const report=['Retour NailMoods · Phase 10', 'Date : '+new Date().toISOString(), 'Écran : '+screen,'Catégorie : '+category,'Étapes et résultat observé :',draft.details||'','Résultat attendu :',draft.expected||''].join('\n');
  async function copy(){try{await navigator.clipboard.writeText(report);setMessage('Retour copié. Tu peux le transmettre à la personne qui t’a invitée à tester.');}catch{setMessage('La copie automatique est indisponible. Sélectionne le texte ci-dessous pour le copier.');}}
  return <Sheet title="Partager un retour" eyebrow="TON AVIS SUR NAILMOODS" onClose={onClose} className="feedbackSheet">
    <p>Décris ce qui s’est passé. Aucun retour n’est envoyé automatiquement : copie-le ou télécharge-le, puis transmets-le à la personne qui t’a invitée à tester.</p>
    <label>Type de retour<select value={category} onChange={e=>update({category:e.target.value})}>{categories.map(value=><option key={value}>{value}</option>)}</select></label>
    <label>Qu’as-tu essayé ? Que s’est-il passé ?<textarea rows="4" maxLength={4000} value={draft.details||''} onChange={e=>update({details:e.target.value})} placeholder="Le produit recherché, les boutons utilisés, ce qui t’a surprise…" /></label>
    <label>Qu’attendais-tu ? <small>facultatif</small><textarea rows="2" maxLength={2000} value={draft.expected||''} onChange={e=>update({expected:e.target.value})}/></label>
    <button className="detailPrimary" disabled={!draft.details?.trim()} onClick={copy}>Copier mon retour</button>
    <a className="detailSecondary" download="retour-nailmoods.txt" href={'data:text/plain;charset=utf-8,'+encodeURIComponent(report)}>Télécharger mon retour</a>
    <details><summary>Voir le texte à partager</summary><textarea readOnly aria-label="Texte du retour" rows="8" value={report}/></details>
    {message && <p role="status">{message}</p>}
  </Sheet>;
}
