import React, { useMemo, useState } from 'react';
import Sheet from './Sheet';
import NailPreview from './NailPreview';
import { createVariants } from './inspirations';
import { generateInspirations } from './freeInspiration';
import { productColor } from './colorAnalysis';

export default function JournalVariants({ entry, items, profile, onOpen, onClose }) {
  const [style, setStyle] = useState('layout');
  const [seed, setSeed] = useState(1);
  const choices = { layout: 'Autre disposition', minimal: 'Plus sobre', chic: 'Plus chic' };
  const results = useMemo(() => {
    const source = entry.idea;
    const palette = (source?.palette || entry.products).filter(p => ['Vernis', 'Semi-permanent', 'Gel'].includes(p.type));
    const owned = palette.filter(p => !p.conceptual && items.some(i => String(i.id) === String(p.id) && Number(i.quantity ?? 1) > 0));
    const inspirationPalette = palette.map(p => ({ ...p, id: 'memory-color-' + p.id, conceptual: true, type: 'Vernis', usage: 'Couleur seule', color: productColor(p) }));
    const options = { ...source?.options, requiredColorIds: [], intent: owned.length ? 'collection' : 'inspire', inspirationPalette: owned.length ? undefined : inspirationPalette,
      ...(style === 'minimal' ? { style: 'Minimal', level: 0, constraints: ['noDrawing'], decorations: 'without', decorationId: '' } : style === 'chic' ? { mood: 'Chic', style: 'Minimal' } : {}) };
    if (source) return createVariants({ ...source, intent: options.intent, options }, items, profile, seed);
    return generateInspirations(items, profile, { ...options, requiredColorIds: owned.slice(0, 5).map(p => String(p.id)) }, seed, 3).results;
  }, [entry, items, profile, style, seed]);
  return <Sheet title="Créer une variante" eyebrow={entry.title} onClose={onClose} className="creationSheet">
    <p className="creationPickerHelp">On repart des couleurs de ce souvenir. Les produits encore possédés sont utilisés en priorité ; sinon, les couleurs restent des suggestions de style.</p>
    <div className="journalFilters">{Object.entries(choices).map(([key, label]) => <button key={key} aria-pressed={style === key} onClick={() => setStyle(key)}>{label}</button>)}</div>
    <div className="variantList">{results.map(idea => <article key={idea.id}><NailPreview idea={idea} compact /><h3>{idea.title}</h3><p>{idea.variantLabel || (idea.intent === 'inspire' ? 'Couleurs de style, à adapter' : 'Avec ta collection')}</p><button className="detailPrimary" onClick={() => onOpen(idea)}>Découvrir cette variante</button></article>)}</div>
    {!results.length && <p>Pas d’autre disposition avec ces choix. Essaie « Plus sobre » ou pars d’une nouvelle inspiration dans Créer.</p>}
    <button className="detailSecondary" onClick={() => setSeed(n => n + 1)}>D’autres variantes</button>
  </Sheet>;
}
