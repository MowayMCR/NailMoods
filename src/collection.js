import {productKind} from './productKinds.js';
import { normalize } from './creationEngine.js';
import {productBarcodes} from './productIdentity.js';

const text = value => normalize(value).trim();
const sameProductCode=(a,b)=>{const codes=productBarcodes(a);return codes.length>0&&productBarcodes(b).some(code=>codes.includes(code));};
export const emptyFilters = { brand: '', family: '', finish: '', productKind:'', favorites: false, sort: 'recent' };
export function collectionResults(items, query = '', type = 'Tous', filters = emptyFilters) {
  const words = text(query).split(/\s+/).filter(Boolean);
  const results = items.filter(item => {
    const searchable = text([item.name, item.brand, item.reference, item.sku, item.collection, item.type, item.equipmentCategory, item.materialStyle, item.notes, item.family, item.finish, item.depth,productKind(item)].filter(Boolean).join(' '));
    return (type === 'Tous' || item.type === type) && words.every(word => searchable.includes(word))
      && (!filters.brand || item.brand === filters.brand) && (!filters.family || item.family === filters.family)
      && (!filters.productKind || productKind(item)===filters.productKind) && (!filters.finish || item.finish === filters.finish) && (!filters.favorites || item.fav);
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
  if(provenance?.catalogIdentity && Object.entries(provenance.catalogIdentity).some(([key,value]) => text(item[key]) !== text(value))) return { ...provenance, kind:'personal', verified:false, derivedFrom:provenance.catalogId, locallyModified:true };
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
export function mergeScannedProducts(items, products) {
  const next=[...items];
  for(const product of products){
    const duplicate=next.some(item=>item.id===product.id || sameProductCode(item,product) || product.provenance?.catalogId && item.provenance?.catalogId===product.provenance.catalogId || text(product.brand) && text(item.brand)===text(product.brand) && text(item.collection)===text(product.collection) && (text(product.reference) && text(item.reference)===text(product.reference) || text(product.name) && text(item.name)===text(product.name)));
    if(!duplicate)next.push({...product,provenance:provenanceOf(product)});
  }
  return next.length===items.length?items:next;
}
