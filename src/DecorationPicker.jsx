import React, { useState } from 'react';
import { Check, Sticker } from 'lucide-react';
import Sheet from './Sheet';

export function DecorationPhoto({ item }) {
  const [failed, setFailed] = useState('');
  return <span className="decorationPhoto">{item.photo && failed !== item.photo ? <img src={item.photo} alt="" loading="lazy" onError={() => setFailed(item.photo)} /> : <Sticker aria-hidden="true" />}</span>;
}

export default function DecorationPicker({ decorations, choice, onChange, onClose, onCollection }) {
  return <Sheet className="creationSheet decorationSheet" eyebrow="MON ENVIE DU JOUR" title="Tes stickers & décorations" onClose={onClose}>
    <p className="creationPickerHelp">Ajoute tes stickers ou tes strass aux idées, avec 1 à 5 vernis. Ils ne demandent pas de pinceau pour dessiner.</p>
    <div className="creationOptions">
      {[
        ['auto', 'Automatique', 'Des idées avec ou sans décorations, selon ton matériel et ton temps.'],
        ['with', 'Avec mes décorations', 'Une décoration dans chaque idée, choisie dans ma collection.'],
        ['without', 'Sans décorations', 'Seulement les couleurs et leurs finitions.'],
      ].map(([mode, label, hint]) => <button key={mode} aria-pressed={choice.mode === mode} className={choice.mode === mode ? 'on' : ''} onClick={() => onChange(mode)}><span><b>{label}</b><small>{hint}</small></span>{choice.mode === mode && <Check />}</button>)}
    </div>
    {decorations.length > 0 ? <>
      <h3>Une planche en particulier ?</h3>
      <p className="creationPickerHelp">Touche-la pour l’utiliser dans chaque proposition.</p>
      <div className="decorationChoices">{decorations.map(item => {
        const selected = choice.mode === 'with' && choice.id === String(item.id);
        return <button key={item.id} aria-label={'Utiliser ' + item.name} aria-pressed={selected} className={selected ? 'on' : ''} onClick={() => onChange('with', String(item.id))}><DecorationPhoto item={item} /><span><b>{item.name}</b>{item.materialStyle && <small>{item.materialStyle}</small>}</span>{selected && <Check />}</button>;
      })}</div>
    </> : <p className="creationPickerHelp decorationEmpty">Ajoute une fiche dans « Stickers / décalcomanies » ou « Strass / décorations » pour la retrouver ici.</p>}
    {choice.mode === 'with' && choice.id && !decorations.some(item => String(item.id) === choice.id) && <p className="formError" role="status">Cette décoration n’est plus disponible. Choisis-en une autre.</p>}
    <button className="decorationCollection" onClick={onCollection}>Ouvrir ma collection</button>
    <button className="creationGenerate" onClick={onClose}><Check />Garder ce choix</button>
  </Sheet>;
}
