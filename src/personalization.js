import { isDecoration } from './decorations.js';

export const PERSONALIZATION_KEY = 'nm-personalization-v1';
const array = value => Array.isArray(value) ? value : [];
const id = item => String(item?.id ?? '');
const bounded = (value, min, max) => Math.max(min, Math.min(max, value));
const ownedColors = products => array(products).filter(item => item && ['Vernis', 'Semi-permanent', 'Gel'].includes(item.type) && !/\b(base[ -]*coat|top[ -]*coat|primer|cleaner|remover|dissolvant|huile)\b/i.test(item.name || ''));
const unique = products => [...new Map(array(products).filter(item => id(item)).map(item => [id(item), item])).values()];
const relevant = products => unique([...ownedColors(products), ...array(products).filter(isDecoration)]);
const technique = idea => array(idea?.nails).some(nail => nail.decoration) ? 'decoration' : ['french', 'dots', 'line'].includes(idea?.pattern) ? idea.pattern : 'colors';
const stamp = value => { let hash = 2166136261; for (const char of JSON.stringify(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return 'taste-' + (hash >>> 0); };

export function readPersonalization(storage) {
  try { const saved = JSON.parse(storage.getItem(PERSONALIZATION_KEY)); return { enabled: saved?.enabled !== false }; }
  catch { return { enabled: true }; }
}

// Match the placement and actual references, independently of display colors or titles.
export function personalRecipeKey(idea) {
  if (array(idea?.nails).length !== 5 || idea.nails.some(nail => !nail || nail.productId == null) || !array(idea?.palette).length) return '';
  const decorations = array(idea.resources).filter(isDecoration).map(id).sort();
  return JSON.stringify(idea.nails.map(nail => [String(nail.productId ?? ''), String(nail.accentProductId ?? ''), nail.drawing || '', nail.decoration ? decorations : []]));
}

function matchesActualProducts(idea, products) {
  const expected = relevant([...array(idea?.palette), ...array(idea?.resources)]).map(id).sort();
  return expected.length > 0 && JSON.stringify(expected) === JSON.stringify(relevant(products).map(id).sort());
}

export function buildPersonalModel({ items = [], favorites = [], sessions = [], entries = [] } = {}) {
  const products = new Map(), recipes = new Map(), techniques = new Map();
  const product = key => { if (!products.has(key)) products.set(key, { affinity: 0, likes: 0, favorites: 0, uses: 0 }); return products.get(key); };
  const recipe = key => { if (!recipes.has(key)) recipes.set(key, { favorite: false, uses: 0, feeling: '', repeat: false, ease: '', feedbackAt: 0, recent: false }); return recipes.get(key); };
  const favoriteIdeas = [...new Map(array(favorites).filter(idea => personalRecipeKey(idea)).map(idea => [personalRecipeKey(idea), idea])).values()];
  for (const idea of favoriteIdeas) {
    recipe(personalRecipeKey(idea)).favorite = true;
    for (const item of relevant([...idea.palette, ...array(idea.resources)])) { const value = product(id(item)); value.affinity += 6; value.favorites++; }
  }

  // A completed guide and its journal entry describe one pose. Journal products are authoritative.
  const poses = new Map();
  for (const session of array(sessions)) if (session?.status === 'completed' && session.id) {
    poses.set('session:' + session.id, { idea: session.idea, products: [...array(session.idea?.palette), ...array(session.idea?.resources)], at: Number(session.completedAt) || 0 });
  }
  let feedbackCount = 0;
  const journal = [...new Map(array(entries).filter(entry => entry?.id).map(entry => [entry.sessionId ? 'session:' + entry.sessionId : 'journal:' + entry.id, entry])).values()];
  for (const entry of journal) {
    const at = /^\d{4}-\d{2}-\d{2}$/.test(entry.date || '') ? Date.parse(entry.date + 'T12:00:00Z') || 0 : 0;
    poses.set(entry.sessionId ? 'session:' + entry.sessionId : 'journal:' + entry.id, { ...entry, products: array(entry.products), at });
    if (['love', 'like', 'adjust'].includes(entry.feeling) || ['easy', 'expected', 'tricky'].includes(entry.ease) || entry.repeat === true) feedbackCount++;
  }
  const recentKeys = [];
  for (const pose of [...poses.values()].sort((a, b) => b.at - a.at)) {
    const actual = relevant(pose.products);
    const positive = pose.feeling === 'love' ? 12 : pose.feeling === 'like' ? 7 : pose.repeat === true ? 7 : 0;
    for (const item of actual) {
      const value = product(id(item)); value.uses++;
      if (positive) { value.affinity += positive; value.likes++; }
    }
    // A changed/manual product list does not prove the original composition or technique was used.
    const key = matchesActualProducts(pose.idea, actual) ? personalRecipeKey(pose.idea) : '';
    if (!key) continue;
    const value = recipe(key); value.uses++;
    if (recentKeys.length < 3) recentKeys.push(key);
    const feedbackAt = Number(pose.updatedAt) || pose.at;
    if ((pose.feeling || pose.repeat || pose.ease) && feedbackAt >= value.feedbackAt) {
      Object.assign(value, { feeling: ['love', 'like', 'adjust'].includes(pose.feeling) ? pose.feeling : '', repeat: pose.repeat === true, ease: ['easy', 'expected', 'tricky'].includes(pose.ease) ? pose.ease : '', feedbackAt });
    }
    if (['easy', 'tricky'].includes(pose.ease)) {
      const kind = technique(pose.idea), counts = techniques.get(kind) || { easy: 0, tricky: 0 };
      counts[pose.ease]++; techniques.set(kind, counts);
    }
  }
  for (const key of recentKeys) recipe(key).recent = true;
  for (const value of products.values()) value.affinity = Math.min(24, value.affinity);
  const trackedPoses = [...poses.values()].filter(pose => relevant(pose.products).length).length;
  const ranking = { version: 1, poseCount: trackedPoses, products: Object.fromEntries(products), recipes: Object.fromEntries(recipes), techniques: Object.fromEntries(techniques) };
  const hasEvidence = favoriteIdeas.length > 0 || trackedPoses > 0;
  const current = relevant(items).filter(item => Number(item.quantity ?? 1) > 0);
  return {
    ranking: hasEvidence ? ranking : null, stamp: stamp(ranking),
    counts: { favorites: favoriteIdeas.length, poses: poses.size, feedback: feedbackCount },
    liked: current.filter(item => product(id(item)).affinity > 0).sort((a, b) => product(id(b)).affinity - product(id(a)).affinity).slice(0, 4),
    unexplored: trackedPoses ? ownedColors(current).filter(item => !product(id(item)).uses).slice(0, 4) : [],
    practice: [...techniques].filter(([kind, counts]) => kind !== 'colors' && counts.tricky > counts.easy).map(([kind]) => ({ french: 'French', dots: 'Pois', line: 'Lignes', decoration: 'Décorations' })[kind]),
  };
}

export function validPersonalSnapshot(value) {
  if (!value || value.version !== 1 || !Number.isFinite(value.poseCount) || value.poseCount < 0) return false;
  if (![value.products, value.recipes, value.techniques].every(part => part && typeof part === 'object' && !Array.isArray(part))) return false;
  return Object.values(value.products).every(row => row && ['affinity', 'likes', 'favorites', 'uses'].every(key => Number.isFinite(row[key]) && row[key] >= 0))
    && Object.values(value.recipes).every(row => row && typeof row.favorite === 'boolean' && typeof row.repeat === 'boolean' && typeof row.recent === 'boolean' && Number.isFinite(row.uses) && row.uses >= 0 && ['love', 'like', 'adjust', ''].includes(row.feeling))
    && Object.values(value.techniques).every(row => row && Number.isFinite(row.easy) && row.easy >= 0 && Number.isFinite(row.tricky) && row.tricky >= 0);
}

export function personalAdjustment(idea, options, model) {
  if (!model) return { score: 0, reasons: [] };
  const lookup = item => Object.hasOwn(model.products, id(item)) ? model.products[id(item)] : { affinity: 0, likes: 0, favorites: 0, uses: 0 };
  const palette = array(idea.palette), values = palette.map(lookup);
  const average = (rows, key) => rows.reduce((sum, row) => sum + row[key], 0) / Math.max(1, rows.length);
  const affinity = average(values, 'affinity') + average(array(idea.resources).filter(isDecoration).map(lookup), 'affinity') * .35;
  const key = personalRecipeKey(idea), remembered = Object.hasOwn(model.recipes, key) ? model.recipes[key] : null;
  const change = options.mode === 'change', surprise = options.mode === 'surprise';
  const weight = change ? .35 : surprise ? options.surprise === 'Chaos' ? .25 : options.surprise === 'Creative' ? .5 : .8 : 1.2;
  let score = affinity * weight;
  if (model.poseCount) score += change || surprise ? values.reduce((sum, value) => sum + 12 / (1 + value.uses), 0) / Math.max(1, values.length) : Math.min(6, average(values, 'uses') * 2);
  const reasons = [];
  if (remembered?.repeat) { score += change ? 4 : 16; reasons.push('Une association que tu veux refaire'); }
  else if (remembered?.feeling === 'love' || remembered?.feeling === 'like') reasons.push('Une composition appréciée dans ton journal');
  else if (remembered?.favorite) reasons.push('Une de tes inspirations favorites');
  if (remembered?.favorite) score += change ? 4 : 10;
  if (remembered?.feeling === 'love') score += 8;
  if (remembered?.feeling === 'like') score += 4;
  if (remembered?.feeling === 'adjust') score -= remembered.repeat ? 6 : 14;
  if (remembered?.recent && (change || surprise)) score -= change ? 16 : 8;
  const kind = technique(idea), practice = model.techniques[kind];
  if (practice) score += bounded(practice.easy - practice.tricky, -3, 2) * 4;
  if (kind === 'colors' && Object.entries(model.techniques).some(([name, counts]) => name !== 'colors' && counts.tricky > counts.easy)) {
    score += 5; reasons.push('Une composition simple après une pose jugée difficile');
  }
  if (change && model.poseCount && values.some(value => !value.uses)) reasons.unshift('Pour varier tes poses enregistrées');
  if (values.some(value => value.likes > 0)) reasons.push('Des vernis que tu as appréciés');
  else if (values.some(value => value.favorites > 0)) reasons.push('Des vernis de tes inspirations favorites');
  if (remembered?.feeling === 'adjust' && !remembered.repeat && !reasons.length) reasons.push('Une composition que tu avais notée « À ajuster »');
  return { score: bounded(score, -32, 42), reasons: [...new Set(reasons)].slice(0, 2) };
}
