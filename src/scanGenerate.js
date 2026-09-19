import { TECHNOLOGIES, readGuestConsent, permissions } from './privacy/policy.js';
import { generateInspirations } from './freeInspiration.js';
import { generationFamily, productColor, validHex } from './colorAnalysis.js';
import { inventoryTools } from './creationEngine.js';

export const scanEffects = ['Classique', 'Mat', 'Brillant', 'French'];
export function toggleScanEffect(selected, value) {
  if (!scanEffects.includes(value)) return [];
  if (selected.includes(value)) return selected.filter(x => x !== value);
  const incompatible = { Mat: 'Brillant', Brillant: 'Mat', French: 'Classique', Classique: 'French' };
  return [...selected.filter(x => x !== incompatible[value]), value].slice(-2);
}
export function confirmedScanProduct(draft, id) {
  if (!validHex(draft.color)) throw new Error('Choisis ou corrige la couleur avant de continuer.');
  const color = draft.color.toLowerCase();
  return { ...draft, id, name: draft.name?.trim() || generationFamily({ color }), type: ['Vernis', 'Semi-permanent', 'Gel'].includes(draft.type) ? draft.type : 'Vernis', color, shade: color, confirmedColor: color, colorSource: 'scan-confirmed', family: generationFamily({ color }), quantity: 1, usage: draft.usage || 'Couleur seule', provenance: draft.provenance || { kind: 'personal', verified: false, importMethod: 'scan' } };
}
// The natural nail is explicitly a schematic unpainted area, never an owned polish.
const natural = { id: 'scan-natural', name: 'Ongle naturel · zone sans couleur', color: '#ead5cc', family: 'Nude', type: 'Vernis', usage: 'Couleur seule', conceptual: true, unpainted: true };
export function generateScannedIdeas(products, effects = [], profile = {}, equipment = [], seed = 1) {
  if (!Array.isArray(products) || products.length < 1 || products.length > 2 || products.some(p => !validHex(productColor(p)))) throw new Error('Confirme une ou deux couleurs pour créer tes idées.');
  const french = effects.includes('French');
  const scanned = products.map(p => ({ ...p, color: productColor(p), family: generationFamily(p) }));
  // Work with confirmed swatches, retaining real product metadata in the result.
  const source = scanned.map((p,i) => ({ ...p, name: 'Couleur scannée ' + (i+1), type: 'Vernis', usage: 'Couleur seule' }));
  if (french && scanned.length === 1) source.push(natural);
  const options = { intent: 'collection', polishCount: source.length, requiredColorIds: source.map(p => p.id), duration: 90, level: french ? 1 : 0, decorations: effects.includes('Classique') || french ? 'without' : 'auto' };
  const report = generateInspirations([...source, ...equipment.filter(p => p.type === 'Matériel')], profile, options, seed, 40);
  let ideas = report.results.filter(idea => french ? idea.pattern === 'french' && (scanned.length > 1 || idea.palette[0].id === natural.id) : !['french','line','dots'].includes(idea.pattern));
  if (!ideas.length) throw new Error('Ces couleurs n’ont pas pu être préparées. Corrige le produit ou réessaie.');
  if (french) {
    const base = ideas[0];
    ideas.push(...[[3], [1,3]].map((indices,i) => ({ ...base, id: base.id + '-accent-' + i, title: i ? 'Deux accents French' : 'La French en accent', description: 'Pointes colorées sur ' + (i ? 'l’index et l’annulaire.' : 'l’annulaire.'), nails: base.nails.map((n,index) => indices.includes(index) ? n : { ...n, drawing: null, accentProductId: null, accentColor: null }) })));
  } else if (scanned.length === 1) {
    const base = ideas.find(i => i.pattern === 'solid') || ideas[0];
    ideas.push(...[[3], [1,3]].map((indices,i) => ({ ...base, id: base.id + '-natural-' + i, pattern: i ? 'duo' : 'accent', title: i ? 'Le rythme naturel' : 'Une respiration naturelle', description: 'Ta couleur avec ' + (i ? 'l’index et l’annulaire' : 'l’annulaire') + ' laissé' + (i ? 's' : '') + ' sans couleur.', palette: [...base.palette, natural], nails: base.nails.map((n,index) => indices.includes(index) ? { productId: natural.id, color: natural.color, drawing: null, decoration: null, finish: 'Mat' } : n) })));
  }
  const finish = effects.includes('Mat') ? 'Mat' : effects.includes('Brillant') ? 'Brillant' : null;
  const allowed = new Set([...scanned.map(p => String(p.id)), natural.id]);
  const seen = new Set();
  return ideas.filter(idea => idea.palette.every(p => allowed.has(String(p.id)))).map(idea => {
    const palette = idea.palette.map(p => scanned.find(s => String(s.id) === String(p.id)) || natural);
    const requirements = [...(idea.requirements || [])];
    const tools = inventoryTools(equipment);
    if (palette.some(p => ['Semi-permanent','Gel'].includes(p.type)) && !tools.lamp) requirements.push({ name: 'Lampe compatible avec les produits', required: true });
    if (new Set(scanned.map(p => p.type)).size > 1) requirements.push({ name: 'Produits de types différents : vérifie leur compatibilité avant toute superposition. Le schéma est une inspiration de couleurs.', required: true });
    if (palette.some(p => p.usage && p.usage !== 'Couleur seule')) requirements.push({ name: 'Base et protocole : suis la notice de chaque produit', required: true });
    if (finish) requirements.push({ name: 'Finition ' + (finish === 'Mat' ? 'mate' : 'brillante') + ' : top coat compatible à prévoir si nécessaire', required: false });
    if (french && !inventoryTools(equipment).fineBrush && !requirements.some(r => r.name.includes('Pinceau'))) requirements.push({ name: 'Pinceau fin recommandé · choisis Classique pour une variante sans pinceau', required: false });
    const usesNatural = palette.some(p => p.unpainted);
    return { ...idea, id: 'scan-' + idea.id + '-' + (finish || 'original'), palette, nails: idea.nails.map(n => ({ ...n, ...(finish && n.productId !== natural.id ? { finish } : {}) })), title: idea.title.replace(/Couleur scannée \d/g, match => scanned[Number(match.at(-1))-1]?.name || match), description: idea.description.replace(/Couleur scannée \d/g, match => scanned[Number(match.at(-1))-1]?.name || match), scanEffects: effects.length ? effects : ['Pas de préférence'], requirements, scanNote: usesNatural ? 'Les zones nude du schéma représentent l’ongle naturel sans couleur, pas un vernis supplémentaire. Leur teinte est indicative.' : '', reasons: ['À partir de tes ' + scanned.length + ' couleur' + (scanned.length > 1 ? 's confirmées' : ' confirmée')], options: { ...idea.options, scanEffects: effects }, intent: 'scan' };
  }).filter(idea => { const key = JSON.stringify(idea.nails); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0,4);
}

export const scanEvents = ['scan_generate_opened','camera_permission_granted','camera_permission_refused','first_product_scanned','first_product_recognized','first_product_unrecognized','second_product_added','effect_selected','scan_generate_completed','product_added_to_collection','generated_idea_saved'];
// Local, bounded diagnostics. No photo, OCR, identity, color or product data is recorded.
export function trackScan(storage, event, data = {}) {
  if (!TECHNOLOGIES.analytics || storage.accountScoped || !permissions({consent:readGuestConsent(storage)}).analytics) return;
  if (!scanEvents.includes(event)) return;
  try {
    const parsed = JSON.parse(storage.getItem('nm-scan-events-v1') || '[]');
    const rows = Array.isArray(parsed) ? parsed.slice(-199) : [];
    rows.push({ event, at: new Date().toISOString(), ...(Number.isInteger(data.count) && data.count >= 0 && data.count <= 4 ? { count: data.count } : {}) });
    storage.setItem('nm-scan-events-v1', JSON.stringify(rows));
  } catch { /* Diagnostics never block the experience. */ }
}
