import { productColor, generationFamily } from './colorAnalysis.js';
import { decorationChoice, isDecoration, stickerTags, stickerAffinity } from './decorations.js';
import { personalAdjustment, validPersonalSnapshot } from './personalization.js';

// Suggestions use owned products only. Resolve the shade once for nails and product swatches alike.
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const normalizePolishCount = value => ['number', 'string'].includes(typeof value) && [1, 2, 3, 4, 5].includes(Number(value)) ? Number(value) : 'auto';
const unique = items => [...new Map(items.filter(Boolean).map(item => [String(item.id), item])).values()];
const fieldText = item => normalize([item.name, item.reference, item.materialStyle, ...stickerTags(item)].filter(Boolean).join(' '));
export const auxiliary = item => /\b(base\s*coat|top\s*coat|primer|cleaner|dissolvant|remover|huile)\b/.test(normalize(item.name).replace(/-/g, ' '));
const needsLamp = item => ['Semi-permanent', 'Gel'].includes(item.type);
const magnetic = item => /cat.?eye|magnetique|avec aimant/.test(normalize([item.finish, item.effect, item.usage].join(' ')));
const drawing = new Set(['french', 'dots', 'line']);
const styleFamilies = {
  witchy: ['Prune', 'Cassis', 'Violet', 'Noir', 'Bordeaux'], goth: ['Noir', 'Bordeaux', 'Prune', 'Cassis'],
  alternative: ['Noir', 'Violet', 'Vert', 'Prune'], celestial: ['Bleu', 'Violet', 'Argent', 'Noir'],
  girly: ['Rose', 'Nude', 'Blanc', 'Rouge'], coquette: ['Rose', 'Rouge', 'Nude', 'Blanc'],
  romantique: ['Rose', 'Prune', 'Nude', 'Bordeaux'], minimal: ['Nude', 'Beige', 'Blanc', 'Brun'],
  'clean girl': ['Nude', 'Beige', 'Rose', 'Blanc'], floral: ['Rose', 'Vert', 'Jaune'],
  nature: ['Vert', 'Brun', 'Beige'], cottagecore: ['Vert', 'Brun', 'Beige', 'Rose'],
  y2k: ['Rose', 'Violet', 'Bleu', 'Argent'],
};
const moodFamilies = {
  Douce: ['Rose', 'Nude', 'Beige'], Mystérieuse: ['Prune', 'Cassis', 'Noir', 'Violet'],
  Chic: ['Nude', 'Bordeaux', 'Brun', 'Rouge'], Joyeuse: ['Jaune', 'Orange', 'Rose', 'Vert'],
  Audacieuse: ['Rouge', 'Noir', 'Violet', 'Bleu'], 'Au calme': ['Beige', 'Nude', 'Vert', 'Bleu'],
};

export function profileDefaults(profile = {}) {
  const level = normalize(profile.level);
  const minutes = String(profile.duration || '').match(/\d+/g)?.map(Number) || [];
  let duration = minutes.length ? Math.max(...minutes) : 45;
  if (/h|importe/i.test(profile.duration || '')) duration = 90;
  if (![15, 30, 45, 60, 90].includes(duration)) duration = 45;
  return {
    mode: 'usual', surprise: 'Safe', mood: 'Chic',
    style: Array.isArray(profile.styles) && profile.styles[0] || 'Libre',
    occasion: 'Tous les jours', duration,
    level: /experte|confirmee/.test(level) ? 2 : /intermediaire/.test(level) ? 1 : 0,
    constraints: [], polishCount: 'auto',
  };
}

export function inventoryStamp(items) {
  const source = JSON.stringify(items.map(({ photo, ...item }) => item));
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return String(hash >>> 0);
}

export function inventoryTools(items) {
  const equipment = items.filter(item => item.type === 'Matériel' && Number(item.quantity ?? 1) > 0);
  const category = name => equipment.filter(item => item.equipmentCategory === name);
  const legacy = equipment.filter(item => !item.equipmentCategory || item.equipmentCategory === 'Autre matériel');
  return {
    equipment,
    lamp: category('Lampe UV / LED')[0] || legacy.find(item => /\blampe\b/.test(fieldText(item)) && !/\bsans\b/.test(fieldText(item))),
    magnet: category('Aimant cat-eye')[0],
    fineBrush: category('Pinceau').find(item => /\b(fin|fine|liner|detail|details)\b/.test(fieldText(item))),
    dotting: category('Dotting tool')[0],
    stickers: equipment.filter(isDecoration),
  };
}

export function stickerAppearance(item, options = {}) {
  let value = fieldText(item);
  const tags=stickerTags(item), style=normalize(options.style+' '+options.mood);
  const preferred=/floral|nature|douce|roman/.test(style)?['floral','cœur']:/witch|myster|celestial/.test(style)?['lune','étoile']:[];
  const chosen=preferred.find(tag=>tags.includes(tag));
  if(chosen) value=normalize(chosen)+' '+value.replace(/etoil|star|lune|moon|feuille|leaf|leaves|feuillage|ligne|bande|stripe|fleur|floral|flower|coeur|heart/g,'');
  return {
    motif: /etoil|star/.test(value) ? 'star' : /lune|moon/.test(value) ? 'moon' : /feuille|leaf|leaves|feuillage/.test(value) ? 'leaf' : /ligne|bande|stripe/.test(value) ? 'stripe' : /fleur|floral|flower/.test(value) ? 'flower' : /coeur|heart/.test(value) ? 'heart' : /strass|gem|rhinestone/.test(value) ? 'gem' : 'generic',
    color: /argent|silver/.test(value) ? '#b9bfcf' : /dore|\bor\b|gold/.test(value) ? '#d0aa58' : /automn|autumn|cuivr|copper/.test(value) ? '#be7849' : /blanc|white/.test(value) ? '#fff8ef' : /noir|black/.test(value) ? '#28212e' : '#d9c7b2',
  };
}

const hashScore = (text, seed) => {
  let hash = (Number(seed) || 1) >>> 0;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return (hash >>> 0) / 4294967296;
};

export function createSuggestions(items = [], profile = {}, supplied = {}, seed = 1, limit = 4, learning = null) {
  supplied = { ...supplied, requiredColorIds: Array.isArray(supplied.requiredColorIds) ? [...new Set(supplied.requiredColorIds.filter(id => ['string', 'number'].includes(typeof id)).map(String))].slice(0, 5) : [] };
  items = items.map(item => item.type === 'Matériel' ? item : { ...item, color: productColor(item), family: generationFamily(item) });
  const personalModel = validPersonalSnapshot(learning) ? learning : null;
  const options = { ...profileDefaults(profile), ...supplied };
  const constraints = new Set(Array.isArray(options.constraints) ? options.constraints : []);
  const duration = [15, 30, 45, 60, 90].includes(Number(options.duration)) ? Number(options.duration) : 45;
  const maxLevel = [0, 1, 2].includes(Number(options.level)) ? Number(options.level) : 0;
  const requestedPolishCount = normalizePolishCount(options.polishCount);
  const requestedTechnique = normalize(options.technique);
  const tools = inventoryTools(items);
  const decoration = decorationChoice(options);
  const requestedDecorations = decoration.mode === 'with' && decoration.id ? tools.stickers.filter(item => String(item.id) === decoration.id) : tools.stickers;
  // An explicit choice remains selectable even beyond the bounded automatic sample.
  const usableDecorations = decoration.mode === 'without' ? [] : [...requestedDecorations].sort((a,b)=>stickerAffinity(b,options)-stickerAffinity(a,options)).slice(0, 20);
  const decorationUnavailable = decoration.mode === 'with' && !usableDecorations.length;
  const blocked = [];
  const effects = items.filter(item => item.type === 'Effet' && !auxiliary(item));
  const topCoats = items.filter(item => auxiliary(item) && /top\s*coat/.test(normalize(item.name).replace(/-/g, ' ')));
  const available = items.filter(item => Number(item.quantity ?? 1) > 0 && ['Vernis', 'Semi-permanent', 'Gel'].includes(item.type) && !auxiliary(item));
  const usable = available.filter(item => {
    let reason;
    if (constraints.has('noLamp') && needsLamp(item)) reason = 'Écarté pour cette envie sans lampe.';
    else if (!options.allowMissingEquipment && needsLamp(item) && !tools.lamp) reason = 'Lampe UV / LED à renseigner dans le matériel.';
    else if (!options.allowMissingEquipment && magnetic(item) && !tools.magnet) reason = 'Aimant cat-eye à renseigner dans le matériel.';
    else if (item.usage === 'Sur une couleur de base' || item.usage === 'Autre') reason = 'Mode d’application et base compatible à préciser.';
    else if (!options.allowMissingEquipment && item.usage === 'Avec top coat' && !topCoats.some(top => top.type === item.type)) reason = 'Top coat du même type de pose à renseigner.';
    else if (constraints.has('favorites') && !item.fav) reason = 'Écarté : vernis favoris uniquement.';
    if (reason) { blocked.push({ item, reason }); return false; }
    return true;
  });

  const preferred = styleFamilies[normalize(options.style)] || [];
  const familiar = new Set((Array.isArray(profile.styles) ? profile.styles : []).flatMap(style => styleFamilies[normalize(style)] || []));
  const mood = moodFamilies[options.mood] || [];
  const primaryScore = item => {
    let score = preferred.includes(item.family) ? 18 : 0;
    if (mood.includes(item.family)) score += 10;
    if (options.mode === 'usual') score += (item.fav ? 22 : 0) + (familiar.has(item.family) ? 6 : 0);
    if (options.mode === 'change') score += (!item.fav ? 16 : 0) + (!familiar.has(item.family) ? 6 : 0);
    if ((profile.technique === item.type) || (profile.technique === 'Vernis classique' && item.type === 'Vernis')) score += 5;
    return score;
  };
  const ordered = [...usable].sort((a, b) => (options.requiredColorIds || []).map(String).includes(String(b.id)) - (options.requiredColorIds || []).map(String).includes(String(a.id)) || primaryScore(b) - primaryScore(a));
  const groups = [...new Set(ordered.map(item => item.type))].map(type => unique(ordered.filter(item => item.type === type)));
  const maxPolishCount = Math.max(0, ...groups.map(group => group.length));
  const countUnavailable = requestedPolishCount !== 'auto' && requestedPolishCount > maxPolishCount;
  const requiredIds = new Set((options.requiredColorIds || []).map(String));
  const candidates = [];
  const seen = new Set();
  function add(pattern, base, second = null, sticker = null, variant = 0, multiPalette = null, arrangement = null) {
    const matchesTechnique = !requestedTechnique || requestedTechnique === 'libre'
      || /french/.test(requestedTechnique) && pattern === 'french'
      || /duo alterne/.test(requestedTechnique) && pattern === 'duo'
      || /accent nail/.test(requestedTechnique) && pattern === 'accent'
      || /line art|outline nails/.test(requestedTechnique) && pattern === 'line'
      || /dot art/.test(requestedTechnique) && pattern === 'dots'
      || !/french|duo alterne|accent nail|line art|outline nails|dot art/.test(requestedTechnique);
    if (!matchesTechnique) return;
    const palette = unique(multiPalette || [base, second]);
    if ([...requiredIds].some(id => !palette.some(item => String(item.id) === id))) return;
    if (requestedPolishCount !== 'auto' && palette.length !== requestedPolishCount) return;
    const decorated = pattern === 'sticker' || pattern === 'paletteSticker';
    if (decoration.mode === 'with' && !decorated || decoration.mode === 'without' && decorated) return;
    if (constraints.has('noDrawing') && drawing.has(pattern)) return;
    if (constraints.has('noStickers') && decorated) return;
    const rank = drawing.has(pattern) ? 1 : 0;
    if (rank > maxLevel) return;
    const extra = multiPalette ? (palette.length - 1) * 5 + (decorated ? 7 : 0) : { solid: 0, accent: 5, duo: 5, sticker: 7, dots: 8, french: 15, line: 12 }[pattern];
    const minutes = (base.type === 'Vernis' ? 15 : base.type === 'Gel' ? 30 : 25) + extra;
    if (minutes > duration) return;
    const resources = unique([
      ...(palette.some(needsLamp) ? [tools.lamp] : []),
      ...(palette.some(magnetic) ? [tools.magnet] : []),
      ...palette.filter(item => item.usage === 'Avec top coat').map(item => topCoats.find(top => top.type === item.type)),
      ...(pattern === 'dots' ? [tools.dotting] : []),
      ...(['french', 'line'].includes(pattern) ? [tools.fineBrush] : []),
      sticker,
    ]);
    const nails = Array.from({ length: 5 }, (_, index) => {
      const accented = pattern === 'accent' ? (variant === 1 ? [1, 3].includes(index) : index === 3) : pattern === 'duo' ? index % 2 === 1 : false;
      const polish = multiPalette ? palette[arrangement[index]] : accented ? second : base;
      return {
        productId: polish.id,
        color: polish.color || '#b88699',
        finish: polish.finish,
        effect: polish.effect,
        decoration: decorated && (variant === 1 ? [1, 3].includes(index) : index === 3) ? stickerAppearance(sticker, options) : null,
        drawing: drawing.has(pattern) && (pattern === 'french' || index === 3) ? pattern : null,
        accentColor: second?.color,
        accentProductId: drawing.has(pattern) && (pattern === 'french' || index === 3) ? second?.id : null,
      };
    });
    // Visually identical recipes are not counted as separate ideas.
    const visual = JSON.stringify(nails.map(nail => [nail.productId, nail.drawing, nail.accentColor, nail.decoration])) + (sticker?.id || '');
    if (seen.has(visual)) return;
    seen.add(visual);
    const id = multiPalette ? [pattern, ...palette.map(item => item.id), sticker?.id || '', variant].join(':') : [pattern, base.id, second?.id || '', sticker?.id || '', variant].join(':');
    const titles = {
      solid: 'L’essentiel ' + (base.family || '').toLocaleLowerCase('fr'),
      accent: variant === 1 ? 'Deux touches de contraste' : 'Un ongle qui change tout',
      duo: 'Le duo alterné', sticker: variant === 1 ? 'Deux accents décorés' : 'Le petit détail',
      dots: 'Quelques pois délicats', french: 'La French en couleurs', line: 'Une ligne légère',
      palette: {
        3: ['Trio en progression', 'Trio en miroir', 'Trio en rythme', 'Un trio à deux accents'],
        4: ['Le quatuor en boucle', 'Quatre vernis en progression', 'Un quatuor à ta façon', 'Quatre vernis, autre sens'],
        5: ['Un vernis par ongle', 'Cinq vernis en sens inverse', 'Cinq vernis en rythme', 'La palette en mouvement'],
      }[palette.length]?.[variant],
      paletteSticker: palette.length === 2 ? variant === 1 ? 'Le duo à deux détails' : 'Le duo décoré' : 'La palette décorée · ' + palette.length + ' vernis',
    };
    const descriptions = {
      solid: base.name + ' sur les cinq ongles.',
      accent: base.name + ', avec ' + second?.name + (variant === 1 ? ' sur l’index et l’annulaire.' : ' sur l’annulaire.'),
      duo: 'Une alternance de ' + base.name + ' et ' + second?.name + '.',
      sticker: base.name + ' et ' + sticker?.name + (variant === 1 ? ' sur deux ongles.' : ' sur l’annulaire.'),
      dots: base.name + ', quelques pois en ' + second?.name + ' sur l’annulaire.',
      french: 'Une base ' + base.name + ' et des pointes ' + second?.name + '.',
      line: base.name + ', une ligne ' + second?.name + ' sur l’annulaire.',
      palette: 'Du pouce à l’auriculaire : ' + nails.map(nail => palette.find(item => item.id === nail.productId).name).join(', ') + '.',
      paletteSticker: palette.length + ' vernis répartis sur les cinq ongles, avec ' + sticker?.name + (variant === 1 ? ' sur l’index et l’annulaire.' : ' sur l’annulaire.'),
    };
    let score = (sticker ? stickerAffinity(sticker, options) : 0) + primaryScore(base) + (palette.length > 1 ? palette.slice(1).reduce((sum, item) => sum + primaryScore(item), 0) / (palette.length - 1) * 0.2 : 0);
    if (options.occasion === 'Travail' && ['solid', 'accent', 'line'].includes(pattern)) score += 12;
    if (['Soirée', 'Événement'].includes(options.occasion) && ['sticker', 'duo', 'french', 'palette', 'paletteSticker'].includes(pattern)) score += 12;
    if (['Douce', 'Au calme', 'Chic'].includes(options.mood) && ['solid', 'accent'].includes(pattern)) score += 6;
    if (['Joyeuse', 'Audacieuse'].includes(options.mood) && ['duo', 'sticker', 'dots', 'palette', 'paletteSticker'].includes(pattern)) score += 8;
    const surprise = options.mode === 'surprise';
    const chaos = surprise && options.surprise === 'Chaos';
    const creative = surprise && options.surprise === 'Creative';
    if (chaos && ['duo', 'dots', 'french', 'palette', 'paletteSticker'].includes(pattern)) score += 30;
    if (creative && pattern !== 'solid') score += 15;
    if (surprise && options.surprise === 'Safe' && ['solid', 'accent', 'sticker'].includes(pattern)) score += 16;
    score += hashScore(id, seed) * (chaos ? 50 : creative ? 28 : surprise ? 18 : seed > 1 ? 20 : 3);
    const reasons = [];
    if (base.fav && options.mode === 'usual') reasons.push('Une de tes couleurs favorites');
    if (preferred.includes(base.family)) reasons.push('Une teinte dans ton univers ' + options.style);
    if (options.mode === 'change' && !base.fav) reasons.push('Une couleur à redécouvrir');
    if (decorated) reasons.push('Avec ta décoration ' + sticker.name);
    if (drawing.has(pattern)) reasons.push('Avec ' + (pattern === 'dots' ? tools.dotting?.name || 'un outil à pois' : tools.fineBrush?.name || 'un pinceau fin'));
    if (requestedTechnique && requestedTechnique !== 'libre') reasons.push('Inspirée par la technique « ' + options.technique + ' »');
    if (!reasons.length) reasons.push('Avec les produits de ta collection');
    const personal = personalAdjustment({ pattern, palette, resources, nails }, options, personalModel);
    candidates.push({ id, pattern, title: titles[pattern], description: descriptions[pattern], palette, polishCount: palette.length, resources, nails, minutes, rank, score: score + personal.score, reasons: [...new Set([...personal.reasons, ...reasons])].slice(0, 2), shape: profile.shape || 'Ronde', length: profile.length || 'Courte' });
  }

  for (const base of ordered) {
    add('solid', base);
    for (const sticker of usableDecorations) {
      add('sticker', base, null, sticker);
      add('sticker', base, null, sticker, 1);
    }
    // Limit combinations on very large inventories, while retaining every primary color.
    const matching = ordered.filter(item => item.id !== base.id && item.type === base.type).slice(0, 24);
    for (const second of matching) {
      add('accent', base, second);
      add('duo', base, second);
      for (const sticker of usableDecorations) {
        add('paletteSticker', base, null, sticker, 0, [base, second], [0, 1, 0, 1, 0]);
        add('paletteSticker', base, null, sticker, 1, [base, second], [0, 0, 0, 1, 0]);
      }
      if (tools.dotting || options.allowMissingEquipment) add('dots', base, second);
      if (tools.fineBrush || options.allowMissingEquipment) { add('french', base, second); add('line', base, second); }
    }
  }
  const arrangements = {
    3: [[0, 0, 1, 2, 2], [0, 1, 2, 1, 0], [0, 1, 2, 0, 1], [0, 1, 0, 2, 0]],
    4: [[0, 1, 2, 3, 0], [0, 1, 2, 3, 3], [0, 1, 0, 2, 3], [3, 2, 1, 0, 0]],
    5: [[0, 1, 2, 3, 4], [4, 3, 2, 1, 0], [0, 2, 4, 1, 3], [0, 3, 1, 4, 2]],
  };
  for (const group of groups) for (const size of [3, 4, 5]) {
    if (size > group.length || requestedPolishCount !== 'auto' && requestedPolishCount !== size) continue;
    const paletteSets = new Set();
    // Two bounded traversals vary the combinations without an exhaustive N-choose-5 search.
    const sequences = [group, [...group.filter((_, index) => index % 2 === 0), ...group.filter((_, index) => index % 2 === 1)]];
    for (const sequence of sequences) for (let start = 0; start < sequence.length; start++) {
      const required = group.filter(item => (options.requiredColorIds || []).map(String).includes(String(item.id)));
      const rest = Array.from({ length: sequence.length }, (_, index) => sequence[(start + index) % sequence.length]).filter(item => !required.some(r => r.id === item.id));
      const palette = [...required, ...rest].slice(0, size);
      const paletteKey = JSON.stringify(palette.map(item => String(item.id)).sort());
      if (paletteSets.has(paletteKey)) continue;
      paletteSets.add(paletteKey);
      arrangements[size].forEach((arrangement, variant) => add('palette', palette[0], null, null, variant, palette, arrangement));
      for (const sticker of usableDecorations) add('paletteSticker', palette[0], null, sticker, 0, palette, arrangements[size][0]);
    }
  }
  const ranked = candidates.sort((a, b) => b.score - a.score);
  const results = [];
  const remaining = [...ranked];
  while (results.length < Math.max(1, Math.min(24, Number(limit) || 4)) && remaining.length) {
    remaining.sort((a, b) => {
      const adjusted = candidate => candidate.score - results.filter(result => result.pattern === candidate.pattern).length * 24 - results.filter(result => result.palette[0].id === candidate.palette[0].id).length * 10 - (requestedPolishCount === 'auto' ? results.filter(result => result.polishCount === candidate.polishCount).length * 8 : 0);
      return adjusted(b) - adjusted(a);
    });
    results.push(remaining.shift());
  }
  return { results, total: candidates.length, availableColors: usable.length, inventoryColors: available.length, tools, blocked, effects, requestedPolishCount, maxPolishCount, countUnavailable, decorationUnavailable };
}
