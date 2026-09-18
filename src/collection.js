import { normalize } from './creationEngine.js';

const text = value => normalize(value).trim();
export const emptyFilters = { brand: '', family: '', finish: '', favorites: false, sort: 'recent' };
export function collectionResults(items, query = '', type = 'Tous', filters = emptyFilters) {
  const words = text(query).split(/\s+/).filter(Boolean);
  const results = items.filter(item => {
    const searchable = text([item.name, item.brand, item.reference, item.sku, item.collection, item.type, item.equipmentCategory, item.materialStyle, item.notes, item.family, item.finish, item.depth].filter(Boolean).join(' '));
    return (type === 'Tous' || item.type === type) && words.every(word => searchable.includes(word))
      && (!filters.brand || item.brand === filters.brand) && (!filters.family || item.family === filters.family)
      && (!filters.finish || item.finish === filters.finish) && (!filters.favorites || item.fav);
  });
  if (filters.sort === 'name') results.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
  else if (filters.sort === 'brand') results.sort((a, b) => (a.brand || '').localeCompare(b.brand || '', 'fr') || a.name.localeCompare(b.name, 'fr'));
  else results.reverse();
  return results;
}
// Provenance is separate from the import method (manual, URL, camera, barcode).
// Only a future trusted catalogue ingestion may attest verification, never the personal editor.
export function provenanceOf(item) {
  const provenance = item.provenance;
  const kinds = ['nailmoods', 'verified_creator', 'validated_community', 'discovered', 'personal'];
  return provenance && kinds.includes(provenance.kind) ? { ...provenance } : { kind: 'personal', verified: false, importMethod: item.source || 'manual' };
}
export function duplicateCandidates(product, items) {
  if (!text(product.brand)) return [];
  return items.filter(item => String(item.id) !== String(product.id) && item.type === product.type && text(item.brand) === text(product.brand)).flatMap(item => {
    const exactReference = ['reference', 'sku'].some(key => text(product[key]) && text(product[key]) === text(item[key]));
    const sameName = text(product.name) && text(product.name) === text(item.name) && text(product.collection) === text(item.collection);
    return exactReference || sameName ? [{ item, reason: exactReference ? 'Même marque et référence' : 'Même marque, nom et collection' }] : [];
  });
}
