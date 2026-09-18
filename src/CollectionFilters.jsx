import React from 'react';
import { emptyFilters } from './collection';
export default function CollectionFilters({ items, filters, onChange, count }) {
  const active = filters.brand || filters.family || filters.finish || filters.favorites;
  return <details className="collectionFilters"><summary>Filtrer et trier{active ? ' · filtres actifs' : ''}<span>{count} résultat{count > 1 ? 's' : ''}</span></summary>
    <div className="form2">{[['brand', 'Marque'], ['family', 'Couleur'], ['finish', 'Finition']].map(([key, label]) => {
      const values = [...new Set(items.map(item => item[key]).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'fr'));
      return values.length > 0 && <label key={key}>{label}<select value={filters[key]} onChange={e => onChange({ ...filters, [key]: e.target.value })}><option value="">Toutes</option>{values.map(value => <option key={value}>{value}</option>)}</select></label>;
    })}<label>Trier par<select value={filters.sort} onChange={e => onChange({ ...filters, sort: e.target.value })}><option value="recent">Derniers ajouts</option><option value="name">Nom A–Z</option><option value="brand">Marque A–Z</option></select></label></div>
    <button className="filterFavorites" aria-pressed={filters.favorites} onClick={() => onChange({ ...filters, favorites: !filters.favorites })}>{filters.favorites ? '♥' : '♡'} Mes favoris uniquement</button>
    {active && <button onClick={() => onChange({ ...emptyFilters })}>Effacer les filtres</button>}
  </details>;
}
