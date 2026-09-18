import { createSuggestions, inventoryTools, profileDefaults, normalize, auxiliary } from './creationEngine.js';

// Style swatches are concepts, never catalogue references or additions to the inventory.
export const stylePalette = [
  ['Cassis', '#813c60'], ['Nude', '#e9c6b5'], ['Or', '#cba358'], ['Vert', '#668878'],
  ['Rose', '#d39ca7'], ['Bleu', '#6674a2'], ['Prune', '#583b65'], ['Blanc', '#f4eee7'],
].map(([family, color], i) => ({ id: 'style-color-' + i, name: family + ' · couleur d’inspiration', family, color, type: 'Vernis', finish: family === 'Or' ? 'Métallique' : 'Brillant', usage: 'Couleur seule', conceptual: true }));

export function generateInspirations(items = [], profile = {}, supplied = {}, seed = 1, limit = 4, learning = null) {
  supplied = { ...supplied, requiredColorIds: Array.isArray(supplied.requiredColorIds) ? [...new Set(supplied.requiredColorIds.filter(id => ['string', 'number'].includes(typeof id)).map(String))].slice(0, 5) : [] };
  const ownedColors = items.filter(item => ['Vernis', 'Semi-permanent', 'Gel'].includes(item.type) && Number(item.quantity ?? 1) > 0 && !auxiliary(item));
  const requestedIntent = supplied.intent === 'collection' ? 'collection' : supplied.intent === 'inspire' ? 'inspire' : ownedColors.length ? 'collection' : 'inspire';
  const intent = requestedIntent === 'collection' && ownedColors.length ? 'collection' : 'inspire';
  const memoryPalette = Array.isArray(supplied.inspirationPalette) ? supplied.inspirationPalette.filter(p => p?.conceptual && p.id != null && p.name).slice(0, 5).map(p => ({ ...p, conceptual: true })) : [];
  const source = intent === 'collection' ? items : [...(memoryPalette.length ? memoryPalette : stylePalette), ...items.filter(item => item.type === 'Matériel')];
  const requiredColorIds = (supplied.requiredColorIds || []).map(String).filter(id => source.some(item => String(item.id) === id && ['Vernis', 'Semi-permanent', 'Gel'].includes(item.type) && Number(item.quantity ?? 1) > 0));
  const selectedSticker = inventoryTools(items).stickers.find(item => String(item.id) === String(supplied.decorationId));
  let options = { ...profileDefaults(profile), ...supplied, requiredColorIds, allowMissingEquipment: true };
  if (intent === 'inspire') options = { ...options, constraints: (options.constraints || []).filter(x => x !== 'favorites') };
  let report = createSuggestions(source, profile, options, seed, limit, intent === 'collection' ? learning : null);
  let adjusted = false;
  if (!report.results.length) {
    adjusted = true;
    options = { ...options, constraints: [], decorations: selectedSticker ? 'with' : 'without', decorationId: selectedSticker?.id || null, polishCount: 'auto', duration: 90 };
    report = createSuggestions(source, profile, options, seed, limit, intent === 'collection' ? learning : null);
  }
  // Products with an unspecified application/base can still inspire by their shade,
  // without pretending their actual application protocol has been established.
  if (!report.results.length) {
    adjusted = true;
    const swatches = source.map(item => item.type === 'Matériel' ? item : { ...item, usage: 'Couleur seule' });
    report = createSuggestions(swatches, profile, options, seed, limit, learning);
  }
  if (!report.results.length) return generateInspirations([], profile, { ...supplied, intent: 'inspire', polishCount: 'auto', duration: 90 }, seed, limit, null);
  const tools = inventoryTools(items);
  const results = report.results.map(idea => {
    // Restore real product metadata; the preview never overwrites a user's product.
    const palette = idea.palette.map(p => intent === 'collection' ? { ...p, ...items.find(i => String(i.id) === String(p.id)), color: p.color } : p);
    const requirements = [];
    const add = (name, owned, required = false) => { if (!owned) requirements.push({ name, required }); };
    if (palette.some(p => ['Semi-permanent', 'Gel'].includes(p.type))) add('Lampe compatible avec les produits', tools.lamp, true);
    if (palette.some(p => /cat.?eye|magnetique|avec aimant/.test(normalize(p.finish + ' ' + p.effect + ' ' + p.usage)))) add('Aimant Cat Eye', tools.magnet, true);
    if (['french', 'line'].includes(idea.pattern)) add('Pinceau fin recommandé', tools.fineBrush);
    if (idea.pattern === 'dots') add('Dotting tool recommandé', tools.dotting);
    if (palette.some(p => p.usage !== 'Couleur seule' && p.usage !== 'Avec aimant')) add('Base / finition et protocole à vérifier sur la notice', false, true);
    return { ...idea, palette, intent, requirements, options: { ...options, intent }, reasons: intent === 'inspire' ? ['Une proposition de style à adapter avec tes produits', ...idea.reasons.filter(r => !/collection|matériel|favorite/.test(r))].slice(0,2) : idea.reasons };
  });
  return { ...report, results, intent, requestedIntent, adjusted, tools: inventoryTools(items), inventoryColors: ownedColors.length };
}
