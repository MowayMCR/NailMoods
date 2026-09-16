import { auxiliary, createSuggestions, normalize, profileDefaults } from './creationEngine.js';

export const INSPIRATIONS_KEY = 'nm-inspirations-v1';
export const fingers = ['Pouce', 'Index', 'Majeur', 'Annulaire', 'Auriculaire'];
export const difficultyLabels = ['Très simple', 'Un peu de détail', 'À l’aise'];
const clone = value => JSON.parse(JSON.stringify(value));
const sameId = (a, b) => String(a) === String(b);
const compactProduct = ({ photo, ...product }) => product;
const hash = value => {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return (result >>> 0).toString(36);
};

export function compositionKey(idea) {
  return JSON.stringify([idea.shape, idea.length, idea.nails, idea.resources.map(item => [item.id, item.equipmentCategory, item.materialStyle])]);
}

export function snapshotIdea(idea, options = idea.options || {}) {
  const saved = clone({ ...idea, palette: idea.palette.map(compactProduct), resources: idea.resources.map(compactProduct), options });
  saved.key = 'idea-' + hash(JSON.stringify([compositionKey(saved), saved.palette, saved.resources]));
  saved.savedAt = idea.savedAt || new Date().toISOString();
  return saved;
}

export function validIdea(idea) {
  return Boolean(idea && typeof idea.key === 'string' && typeof idea.title === 'string'
    && Array.isArray(idea.palette) && idea.palette.length >= 1 && idea.palette.length <= 5
    && idea.palette.every(item => item && item.id != null && typeof item.name === 'string')
    && Array.isArray(idea.resources) && idea.resources.every(item => item && item.id != null)
    && Array.isArray(idea.nails) && idea.nails.length === 5
    && idea.nails.every(nail => nail && idea.palette.some(item => sameId(item.id, nail.productId))
      && (nail.accentProductId == null || idea.palette.some(item => sameId(item.id, nail.accentProductId))))
    && Array.isArray(idea.reasons) && idea.reasons.every(reason => typeof reason === 'string')
    && Number.isFinite(idea.minutes) && [0, 1, 2].includes(idea.rank));
}

export function readInspirations(storage) {
  const empty = { favorites: [], recent: [], selected: null };
  try {
    const saved = JSON.parse(storage.getItem(INSPIRATIONS_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return empty;
    return {
      favorites: Array.isArray(saved.favorites) ? saved.favorites.filter(validIdea) : [],
      recent: Array.isArray(saved.recent) ? saved.recent.filter(validIdea).slice(0, 12) : [],
      selected: validIdea(saved.selected) ? saved.selected : null,
    };
  } catch { return empty; }
}

export function rememberIdea(library, idea) {
  return { ...library, recent: [idea, ...library.recent.filter(saved => saved.key !== idea.key)].slice(0, 12) };
}

export function findIdea(library, key) {
  return [...library.favorites, ...library.recent, library.selected].filter(Boolean).find(idea => idea.key === key);
}

export function toggleFavorite(library, idea) {
  const exists = library.favorites.some(saved => saved.key === idea.key);
  return { ...library, favorites: exists ? library.favorites.filter(saved => saved.key !== idea.key) : [idea, ...library.favorites] };
}

export function productStatus(saved, items) {
  const current = items.find(item => sameId(item.id, saved.id));
  if (!current || Number(current.quantity ?? 1) <= 0) return { state: 'missing', label: 'Absent de ta collection', current };
  const fields = ['name', 'brand', 'type', 'color', 'finish', 'effect', 'usage', 'equipmentCategory', 'materialStyle', 'reference'];
  if (fields.some(field => (current[field] || '') !== (saved[field] || ''))) return { state: 'changed', label: 'Fiche modifiée depuis cette inspiration', current };
  return { state: 'available', label: 'Dans ta collection', current };
}

export function ideaAvailability(idea, items) {
  return [...idea.palette, ...idea.resources].map(item => ({ item, ...productStatus(item, items) }));
}

export function nailDetails(idea, index) {
  const nail = idea.nails[index];
  const base = idea.palette.find(item => sameId(item.id, nail.productId));
  const accent = idea.palette.find(item => sameId(item.id, nail.accentProductId));
  const sticker = nail.decoration && idea.resources.find(item => item.equipmentCategory === 'Stickers / décalcomanies');
  const details = [{ label: 'Couleur', item: base }];
  if (nail.drawing && accent) details.push({ label: { french: 'Pointes de la French', line: 'Ligne', dots: 'Pois' }[nail.drawing], item: accent });
  if (sticker) details.push({ label: 'Décoration', item: sticker });
  return details;
}

export function resourceRole(item) {
  if (auxiliary(item)) return 'Finition demandée par le produit';
  if (item.equipmentCategory === 'Stickers / décalcomanies') return 'Décoration';
  return item.equipmentCategory || 'Matériel';
}

export function safeProductUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export function createVariants(idea, items, profile, seed = 1) {
  const options = { ...profileDefaults(profile), ...idea.options, polishCount: idea.palette.length };
  const shapeProfile = { ...profile, shape: idea.shape, length: idea.length };
  const paletteIds = new Set(idea.palette.map(item => String(item.id)));
  const samePaletteItems = items.filter(item => paletteIds.has(String(item.id)) || item.type === 'Matériel' || auxiliary(item));
  const close = createSuggestions(samePaletteItems, shapeProfile, options, seed, 12).results;
  const other = createSuggestions(items, shapeProfile, options, seed, 12).results;
  const seen = new Set([compositionKey(idea)]);
  return [...close, ...other].filter(candidate => {
    const key = compositionKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3).map(candidate => ({
    ...snapshotIdea(candidate, options),
    variantLabel: candidate.palette.every(item => paletteIds.has(String(item.id))) ? 'Avec les mêmes vernis' : 'Avec d’autres vernis de ta collection',
  }));
}

export function finishLabel(item) {
  return [item.finish, item.effect && normalize(item.effect) !== 'aucun' && item.effect].filter(Boolean).join(' · ');
}
