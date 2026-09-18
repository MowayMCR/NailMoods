import React, { useState } from 'react';
import Sheet from './Sheet';
import { productColor } from './colorAnalysis';
import { auxiliary, normalize } from './creationEngine';

export default function ColorSelection({ items, selected, onChange, onClose }) {
  const [query, setQuery] = useState('');
  const colors = items.filter(item => ['Vernis', 'Semi-permanent', 'Gel'].includes(item.type) && !auxiliary(item) && Number(item.quantity ?? 1) > 0);
  const first = colors.find(item => selected.includes(String(item.id)));
  return <Sheet title="Mes couleurs pour cette idée" onClose={onClose} className="creationSheet">
    <p className="creationPickerHelp">Choisis jusqu’à cinq teintes d’un même type de pose. Elles seront présentes dans chaque idée ; NailMoods peut les compléter.</p>
    <input className="colorSelectionSearch" aria-label="Rechercher une teinte" placeholder="Une marque, une référence, une couleur…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="creationOptions">{colors.filter(item => normalize([item.name, item.brand, item.reference].join(' ')).includes(normalize(query))).map(item => {
      const chosen = selected.includes(String(item.id));
      return <button key={item.id} aria-pressed={chosen} disabled={!chosen && (selected.length >= 5 || Boolean(first && first.type !== item.type))} onClick={() => onChange(chosen ? selected.filter(id => id !== String(item.id)) : [...selected, String(item.id)])}><i className="selectedSwatch" style={{ background: productColor(item) }} /><span>{[item.brand, item.name].filter(Boolean).join(' — ')}<small>{item.type}{chosen ? ' · sélectionnée' : first && first.type !== item.type ? ' · autre type de pose' : ''}</small></span></button>;
    })}</div>
    {!colors.length && <p>Aucune teinte enregistrée. Inspire-moi reste disponible tout de suite.</p>}
    <button className="detailSecondary" onClick={() => onChange([])}>Laisser NailMoods choisir</button><button className="detailPrimary" onClick={onClose}>Garder mes choix</button>
  </Sheet>;
}
