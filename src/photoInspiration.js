import { auxiliary } from './creationEngine.js';
import { describeColor, photoPalette, productColor, validHex } from './colorAnalysis.js';
import { generateInspirations } from './freeInspiration.js';
import { enrichIdeaRendering, techniqueDefinition } from './techniqueRendering.js';

const clamp = value => Math.max(0, Math.min(1, value));
const rgb = color => validHex(color) ? [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)) : [184, 134, 153];
const uniqueBy = (values, key) => [...new Map(values.map(value => [key(value), value])).values()];

export function colorDistance(first, second) {
  const a = rgb(first), b = rgb(second);
  return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0)) / Math.sqrt(3 * 255 ** 2);
}

export const PHOTO_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
export const photoFileKey = file => [file?.name || '', Number(file?.size) || 0, Number(file?.lastModified) || 0].join(':');

export function validatePhotoImportFiles(files = [], existingKeys = [], slots = 4) {
  const accepted = [], rejected = [], known = new Set(existingKeys);
  for (const file of [...files]) {
    const key = photoFileKey(file);
    let reason = '';
    if (!PHOTO_TYPES.includes(file?.type)) reason = 'format';
    else if (Number(file?.size) > 20 * 1024 * 1024) reason = 'too_large';
    else if (known.has(key)) reason = 'duplicate';
    else if (accepted.length >= Math.max(0, slots)) reason = 'limit';
    if (reason) rejected.push({ file, reason });
    else { known.add(key); accepted.push(file); }
  }
  return { accepted, rejected };
}

export function analysePhotoPixels(image) {
  const { data, width, height } = image || {};
  if (!data || !width || !height || data.length < width * height * 4) throw new Error('Cette photo ne contient pas de pixels analysables.');
  const stride = Math.max(1, Math.floor(width * height / 12000));
  let count = 0, saturation = 0, light = 0, highlights = 0, darks = 0, edges = 0, edgeChecks = 0, horizontal = 0, vertical = 0;
  const luminanceAt = pixel => .2126 * data[pixel] + .7152 * data[pixel + 1] + .0722 * data[pixel + 2];
  for (let pixel = 0; pixel < width * height; pixel += stride) {
    const at = pixel * 4;
    if (data[at + 3] < 128) continue;
    const values = [data[at], data[at + 1], data[at + 2]], high = Math.max(...values), low = Math.min(...values);
    const luminance = luminanceAt(at);
    count++; saturation += high ? (high - low) / high : 0; light += luminance / 255;
    if (high > 238 && low > 205) highlights++;
    if (high < 58) darks++;
    const x = pixel % width, y = Math.floor(pixel / width);
    if (x + 2 < width) {
      const difference = Math.abs(luminance - luminanceAt(at + 8));
      horizontal += difference; edges += difference > 42 ? 1 : 0; edgeChecks++;
    }
    if (y + 2 < height) {
      const difference = Math.abs(luminance - luminanceAt(at + width * 8));
      vertical += difference; edges += difference > 42 ? 1 : 0; edgeChecks++;
    }
  }
  if (!count) throw new Error('Cette photo ne contient pas de zone visible à analyser.');
  const colors = photoPalette(image, 5);
  const metrics = {
    saturation: clamp(saturation / count),
    luminosity: clamp(light / count),
    highlightRatio: clamp(highlights / count),
    darkRatio: clamp(darks / count),
    edgeRatio: clamp(edges / Math.max(1, edgeChecks)),
    directionality: clamp(Math.abs(horizontal - vertical) / Math.max(1, horizontal + vertical)),
  };
  return describeVisualAnalysis({ colors, metrics, count: 1 });
}

export function describeVisualAnalysis({ colors = [], metrics = {}, count = 1 }) {
  const edge = Number(metrics.edgeRatio) || 0, highlights = Number(metrics.highlightRatio) || 0;
  const saturation = Number(metrics.saturation) || 0, direction = Number(metrics.directionality) || 0;
  const shapes = edge > .2 ? direction > .14 ? 'Formes graphiques et directionnelles' : 'Formes nettes, plutôt géométriques' : 'Formes douces et organiques';
  const patterns = edge > .25 ? 'Motifs contrastés ou répétés' : colors.length >= 4 ? 'Nuances superposées / effet marbré possible' : 'Aplats et dégradés doux';
  const french = edge > .22 && highlights > .06 ? 'Bord contrasté possible — French à confirmer' : 'Aucun indice French suffisamment fiable';
  const materials = highlights > .11 ? 'Surface très brillante ou réfléchissante' : highlights > .045 ? 'Finition brillante / nacrée possible' : 'Surface mate à satinée';
  const effects = [
    ...(highlights > .1 ? ['reflets spéculaires'] : highlights > .045 ? ['brillance douce'] : ['effet velouté']),
    ...(saturation > .45 ? ['couleurs intenses'] : ['couleurs fondues']),
    ...(colors.length >= 4 ? ['profondeur colorée'] : []),
  ];
  const decorations = edge > .28 ? 'Détails graphiques ou décorations possibles' : highlights > .12 ? 'Éléments brillants possibles' : 'Aucune décoration isolable avec certitude';
  const techniqueIds = highlights > .13
    ? ['chrome', 'cat-eye', 'glazed']
    : colors.length >= 4 && edge < .18 ? ['aura', 'blooming', 'marble']
      : edge > .28 ? ['stamping', 'micro-french', 'gel-3d']
        : ['jelly', 'glazed', 'simple'];
  return {
    photoCount: count,
    colors: colors.slice(0, 5),
    shapes,
    patterns,
    french,
    materials,
    effects: [...new Set(effects)],
    decorations,
    probableTechniques: techniqueIds.map(id => techniqueDefinition(id)).filter(Boolean).map(item => ({ id: item.id, label: item.label })),
    metrics: {
      saturation: clamp(Number(metrics.saturation) || 0),
      luminosity: clamp(Number(metrics.luminosity) || 0),
      highlightRatio: clamp(Number(metrics.highlightRatio) || 0),
      darkRatio: clamp(Number(metrics.darkRatio) || 0),
      edgeRatio: clamp(Number(metrics.edgeRatio) || 0),
      directionality: clamp(Number(metrics.directionality) || 0),
    },
    confidence: 'indicative',
  };
}

export function combinePhotoAnalyses(analyses = []) {
  const valid = analyses.filter(value => value?.colors?.length);
  if (!valid.length) return null;
  const metrics = {};
  for (const key of ['saturation','luminosity','highlightRatio','darkRatio','edgeRatio','directionality']) {
    metrics[key] = valid.reduce((sum, value) => sum + (Number(value.metrics?.[key]) || 0), 0) / valid.length;
  }
  const colors = [];
  for (const analysis of valid) for (const color of analysis.colors) {
    if (colors.every(existing => colorDistance(existing, color) > .085)) colors.push(color);
    if (colors.length === 5) break;
  }
  return describeVisualAnalysis({ colors, metrics, count: valid.length });
}

export function matchPhotoProducts(colors = [], items = []) {
  const products = items.filter(item => ['Vernis', 'Semi-permanent', 'Gel'].includes(item.type) && Number(item.quantity ?? 1) > 0 && !auxiliary(item));
  const used = new Set(), owned = [], alternatives = [], missing = [];
  for (const targetColor of colors.slice(0, 3)) {
    const ranked = products.map(item => ({ item, targetColor, distance: colorDistance(targetColor, productColor(item)) })).sort((a, b) => a.distance - b.distance);
    const match = ranked.find(candidate => !used.has(String(candidate.item.id)));
    if (match && match.distance <= .26) {
      used.add(String(match.item.id));
      owned.push(match);
      const alternative = ranked.find(candidate => String(candidate.item.id) !== String(match.item.id) && !alternatives.some(value => String(value.item.id) === String(candidate.item.id)));
      if (alternative && alternative.distance <= .34) alternatives.push(alternative);
    } else {
      missing.push({ id: 'photo-missing-' + targetColor.slice(1), name: 'Teinte proche de ' + targetColor.toUpperCase(), color: targetColor, type: 'Vernis', conceptual: true });
      if (ranked[0]) alternatives.push(ranked[0]);
    }
  }
  return { owned: owned.slice(0, 3), alternatives: alternatives.slice(0, 3), missing: missing.slice(0, 3) };
}

const normalizedFamily = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace('marron', 'brun');

// Catalogue shades are suggested only when their colour family is documented.
// This keeps real brand references separate from precise, user-confirmed swatches.
export function matchPhotoCatalogProducts(colors = [], products = [], excludedIds = []) {
  const excluded = new Set(excludedIds.map(String));
  const usable = products.filter(item => ['Vernis', 'Semi-permanent', 'Gel'].includes(item.type) && item.family && !excluded.has(String(item.catalogId || item.id)));
  const used = new Set(), toBuy = [];
  for (const targetColor of colors.slice(0, 3)) {
    const family = normalizedFamily(describeColor(targetColor).family);
    const match = usable.find(item => normalizedFamily(item.family) === family && !used.has(String(item.catalogId || item.id)));
    if (!match) continue;
    used.add(String(match.catalogId || match.id));
    toBuy.push({ item: { ...match, id: match.catalogId || match.id, color: targetColor }, targetColor, matchKind: 'family' });
  }
  return toBuy;
}

export function photoConceptualPalette(colors = []) {
  const selected = colors.length ? colors.slice(0, 3) : ['#b88699'];
  return selected.map((color, index) => ({
    id: 'photo-color-' + color.slice(1) + '-' + index,
    name: 'Teinte d’inspiration ' + (index + 1),
    color,
    shade: color,
    confirmedColor: color,
    type: 'Vernis',
    finish: 'Brillant',
    usage: 'Couleur seule',
    conceptual: true,
  }));
}

const requirementNames = {
  'cat-eye': ['Aimant Cat Eye', 'Lampe compatible avec les produits'],
  'velvet-magnetic': ['Aimant Cat Eye', 'Lampe compatible avec les produits'],
  chrome: ['Poudre ou gel chrome compatible', 'Top coat sans résidu selon protocole'],
  'gel-3d': ['Gel 3D / gel de construction', 'Lampe compatible avec les produits'],
  rhinestones: ['Gel de fixation ou colle adaptée'],
  charms: ['Gel de fixation renforcé'],
  'glass-nails': ['Gel transparent compatible'],
  stamping: ['Plaque, tampon et vernis de stamping'],
};

export const NAIL_ART_LEVELS = Object.freeze({
  simple: ['simple', 'micro-french', 'glitter', 'rhinestones', 'stamping'],
  intermediate: ['aura', 'marble', 'blooming', 'micro-french', 'cat-eye', 'chrome', 'glazed'],
  pro: ['gel-3d', 'charms', 'glass-nails', 'blooming', 'aurora-holographic', 'chrome'],
});

const materialMatchers = {
  'cat-eye': /aimant|cat.?eye/i,
  chrome: /chrome|poudre miroir/i,
  'gel-3d': /gel 3d|construction|relief/i,
  charms: /charm|bijou/i,
  'glass-nails': /gel transparent|clear gel/i,
  stamping: /stamping|tampon|plaque/i,
  rhinestones: /strass|rhinestone/i,
};

function inventoryText(item) {
  return [item.name, item.equipmentCategory, item.materialStyle, item.finish, item.effect].filter(Boolean).join(' ');
}

export function hasTechniqueMaterial(techniqueId, items = []) {
  const matcher = materialMatchers[techniqueId];
  return !matcher || items.some(item => Number(item.quantity ?? 1) > 0 && matcher.test(inventoryText(item)));
}

export function compatiblePhotoTechniques({ nailArt = false, level = 'simple', items = [], suggestedIds = [] } = {}) {
  let ids;
  if (!nailArt) {
    ids = ['simple', 'jelly', 'glazed', 'glitter'];
    for (const optional of ['rhinestones', 'charms', 'stamping']) if (hasTechniqueMaterial(optional, items)) ids.push(optional);
  } else {
    ids = NAIL_ART_LEVELS[level] || NAIL_ART_LEVELS.simple;
    // Pro techniques requiring specialist products are never suggested without the material.
    if (level === 'pro') ids = ids.filter(id => hasTechniqueMaterial(id, items));
    else ids = ids.filter(id => hasTechniqueMaterial(id, items));
  }
  const suggested = new Set(suggestedIds);
  return [...ids].sort((a, b) => Number(suggested.has(b)) - Number(suggested.has(a)))
    .map(id => techniqueDefinition(id)).filter(Boolean).map(item => ({ id: item.id, label: item.label }));
}

function applyTechnique(idea, techniqueId, index, difficulty, analysis, guidance, nailArt, nailArtLevel) {
  const technique = techniqueDefinition(techniqueId) || techniqueDefinition('simple');
  let nails = idea.nails.map(nail => ({ ...nail, finish: technique.finish, effect: technique.label }));
  if (technique.id === 'micro-french' && idea.palette.length > 1) {
    const [base, accent] = idea.palette;
    nails = nails.map(nail => ({ ...nail, productId: base.id, color: base.color, drawing: 'french', accentProductId: accent.id, accentColor: accent.color }));
  }
  if (technique.id === 'rhinestones') nails = nails.map((nail, nailIndex) => nailIndex === 3 ? { ...nail, decoration: { motif: 'gem', color: '#d8f6ff' } } : nail);
  if (technique.id === 'charms') nails = nails.map((nail, nailIndex) => nailIndex === 3 ? { ...nail, decoration: { motif: 'star', color: '#d0aa58' } } : nail);
  // The third proposal is intentionally multi-technique, like a real salon set.
  if (nailArt && index === 2 && nailArtLevel !== 'simple') {
    const accent = idea.palette[1]?.color || nails[0]?.accentColor || '#f3d4df';
    nails = nails.map((nail, nailIndex) => {
      if (nailIndex === 0) return { ...nail, technique: 'jelly', decoration: { motif: 'gem', color: '#f7e8dd' } };
      if (nailIndex === 1) return { ...nail, technique: 'micro-french', drawing: 'french', accentColor: accent };
      if (nailIndex === 2) return { ...nail, technique: technique.id };
      if (nailIndex === 3) return { ...nail, technique: 'gel-3d', decoration: { motif: 'flower', color: accent } };
      return { ...nail, technique: 'stamping', decoration: null, accentColor: accent };
    });
  }
  const extraRequirements = (requirementNames[technique.id] || []).filter(name => !(idea.requirements || []).some(entry => entry.name === name)).map(name => ({ name, required: true }));
  const tones = ['en douceur', 'en contraste', 'en rythme'];
  const enriched = enrichIdeaRendering({
    ...idea,
    id: 'photo-' + technique.id + '-' + idea.id + '-' + index,
    title: technique.label + ' · ' + tones[index % tones.length],
    description: 'Une composition nouvelle inspirée des couleurs et des effets repérés, sans reproduire la pose de référence.',
    nails,
    rank: difficulty,
    minutes: Math.max(idea.minutes, [25, 45, 70][difficulty]),
    requirements: [...(idea.requirements || []), ...extraRequirements],
    reasons: ['Palette issue de ' + analysis.photoCount + ' photo' + (analysis.photoCount > 1 ? 's' : ''), 'Composition recomposée, non copiée'],
    intent: 'photos',
    photoSource: { count: analysis.photoCount, colors: analysis.colors, confidence: analysis.confidence },
    photoGuidance: {
      owned: guidance.owned.map(({ item, targetColor, distance }) => ({ item, targetColor, distance })),
      alternatives: guidance.alternatives.map(({ item, targetColor, distance }) => ({ item, targetColor, distance })),
      missing: guidance.missing,
      toBuy: guidance.toBuy || [],
    },
    requestedDifficulty: difficulty,
    nailArt,
    nailArtLevel: nailArt ? nailArtLevel : null,
    compatibleTechniques: compatiblePhotoTechniques({ nailArt, level: nailArtLevel, suggestedIds: analysis.probableTechniques.map(item => item.id) }).map(item => item.id),
  }, technique.id);
  return enriched;
}

export function generatePhotoIdeas({ analysis, items = [], catalogItems = [], profile = {}, sourceMode = 'collection', difficulty = 1, technique = '', nailArt = true, nailArtLevel = ['simple', 'intermediate', 'pro'][difficulty] || 'intermediate', sourceImages = [], seed = 1 } = {}) {
  if (!analysis?.colors?.length) throw new Error('Importe au moins une photo analysable avant de générer.');
  const level = [0, 1, 2].includes(Number(difficulty)) ? Number(difficulty) : 1;
  const guidance = matchPhotoProducts(analysis.colors, items);
  guidance.toBuy = matchPhotoCatalogProducts(analysis.colors, catalogItems, items.flatMap(item => [item.id, item.catalogId].filter(Boolean)));
  const owned = guidance.owned.map(entry => entry.item);
  const types = [...new Set(owned.map(item => item.type))];
  const selectedType = types.sort((a, b) => owned.filter(item => item.type === b).length - owned.filter(item => item.type === a).length)[0];
  const collectionPalette = owned.filter(item => item.type === selectedType).slice(0, 3);
  const useCollection = sourceMode === 'collection' && collectionPalette.length > 0;
  const palette = useCollection ? collectionPalette : photoConceptualPalette(analysis.colors);
  const equipment = items.filter(item => item.type === 'Matériel');
  const options = {
    intent: useCollection ? 'collection' : 'inspire',
    mode: level === 0 ? 'usual' : level === 1 ? 'change' : 'surprise',
    surprise: level === 2 ? 'Creative' : 'Safe',
    mood: 'Chic',
    style: 'Libre',
    occasion: 'Tous les jours',
    duration: 90,
    level: Math.max(level, technique === 'micro-french' ? 1 : level),
    polishCount: palette.length,
    requiredColorIds: palette.map(item => String(item.id)),
    constraints: [],
    decorations: 'without',
    inspirationPalette: useCollection ? [] : palette,
  };
  const report = generateInspirations([...palette, ...equipment], profile, options, seed, 3);
  const compatible = compatiblePhotoTechniques({ nailArt, level: nailArtLevel, items, suggestedIds: analysis.probableTechniques.map(item => item.id) });
  const chosenTechnique = techniqueDefinition(compatible.some(item => item.id === technique) ? technique : compatible[0]?.id) || techniqueDefinition('simple');
  return {
    ideas: report.results.slice(0, 3).map((idea, index) => ({
      ...applyTechnique(idea, chosenTechnique.id, index, level, analysis, guidance, nailArt, nailArtLevel),
      photoSources: sourceImages.slice(0, 4),
      sourceMode: sourceMode === 'collection' ? 'collection_only' : 'open_possibilities',
    })),
    guidance,
    usedCollection: useCollection,
    collectionFallback: sourceMode === 'collection' && !useCollection,
    technique: chosenTechnique,
    compatibleTechniques: compatible,
  };
}

export function compactPhotoAnalysis(analysis) {
  if (!analysis) return null;
  return {
    photoCount: analysis.photoCount,
    colors: analysis.colors.slice(0, 5),
    shapes: analysis.shapes,
    patterns: analysis.patterns,
    french: analysis.french,
    materials: analysis.materials,
    effects: analysis.effects.slice(0, 4),
    decorations: analysis.decorations,
    probableTechniques: analysis.probableTechniques.slice(0, 3),
    confidence: 'indicative',
  };
}
