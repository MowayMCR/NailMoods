import React from 'react';
import { Lightbulb, Sticker, Brush, Minus, Sparkles, Magnet, Stamp, Scissors, Package, PenLine } from 'lucide-react';

export const equipmentTypes = [
  { name: 'Lampe UV / LED', icon: Lightbulb, example: 'Ma lampe LED' },
  { name: 'Stickers / décalcomanies', icon: Sticker, example: 'Stickers étoiles dorées', decorative: true },
  { name: 'Pinceau', icon: Brush, example: 'Pinceau fin nail art' },
  { name: 'Dotting tool', icon: PenLine, example: 'Outil à pois double embout' },
  { name: 'Lime / polissoir', icon: Minus, example: 'Lime 180 / 240' },
  { name: 'Aimant cat-eye', icon: Magnet, example: 'Aimant double embout' },
  { name: 'Stamping', icon: Stamp, example: 'Plaque et tampon fleurs' },
  { name: 'Strass / décorations', icon: Sparkles, example: 'Strass argentés', decorative: true },
  { name: 'Capsules / chablons', icon: Package, example: 'Capsules amande', decorative: true },
  { name: 'Outil de préparation', icon: Scissors, example: 'Repousse-cuticules' },
  { name: 'Ponceuse / embouts', icon: PenLine, example: 'Embout de ponceuse' },
  { name: 'Autre matériel', icon: Package, example: 'Tapis de manucure' },
];

export function equipmentInfo(item) {
  return equipmentTypes.find(type => type.name === item.equipmentCategory) || equipmentTypes.at(-1);
}

export function EquipmentVisual({ item }) {
  const Icon = equipmentInfo(item).icon;
  return <div className="equipmentVisual" aria-hidden="true"><Icon strokeWidth={1.5} /></div>;
}

export function EquipmentCategory({ item, onChange }) {
  return <label>Type de matériel<select value={item.equipmentCategory || 'Autre matériel'} onChange={event => onChange({ equipmentCategory: event.target.value })}>
    {equipmentTypes.map(type => <option key={type.name}>{type.name}</option>)}
  </select></label>;
}

export function EquipmentFields({ item, onChange }) {
  const type = equipmentInfo(item);
  return <>
    <div className="form2">
      <label>Référence (facultatif)<input value={item.reference || ''} onChange={event => onChange({ reference: event.target.value })} placeholder="Modèle ou référence" /></label>
      <label>Quantité<input type="number" min="1" max="9999" step="1" inputMode="numeric" value={item.quantity ?? 1} onChange={event => onChange({ quantity: event.target.value })} /></label>
    </div>
    {type.decorative && <label>Couleur / motif (facultatif)<input value={item.materialStyle || ''} onChange={event => onChange({ materialStyle: event.target.value })} placeholder="Doré, argenté, fleurs, étoiles…" /></label>}
    <label>Notes (facultatif)<textarea rows="3" value={item.notes || ''} onChange={event => onChange({ notes: event.target.value })} placeholder="Taille, grain, embout, contenu du lot…" /></label>
  </>;
}
