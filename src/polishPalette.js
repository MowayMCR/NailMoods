import { productColor, validHex } from './colorAnalysis.js';
import { auxiliary } from './creationEngine.js';

export const polishFamilies = [
  ['Nudes & roses', [['Nude','#ddb9aa'],['Beige rosé','#d5b1aa'],['Rose poudré','#dbb4bf'],['Vieux rose','#b77d8b'],['Cassis','#813c60']]],
  ['Rouges & chauds', [['Bordeaux','#782d40'],['Rouge','#bf3045'],['Corail','#e67e73'],['Terracotta','#b96550'],['Chocolat','#65433d'],['Taupe','#9b8986']]],
  ['Verts & bleus', [['Sauge','#9aa891'],['Kaki','#767c52'],['Vert forêt','#356a59'],['Bleu ciel','#9cbdd6'],['Bleu nuit','#263655']]],
  ['Lilas & prunes', [['Lilas','#b9a0cf'],['Mauve','#977491'],['Prune','#683650'],['Violet','#704782']]],
  ['Neutres', [['Blanc','#f4f0eb'],['Gris','#93939a'],['Noir','#29262a']]],
  ['Métalliques', [['Doré','#c4a45e'],['Argenté','#aeb1b5'],['Cuivré','#b77959']]],
];
export const RECENT_COLORS_KEY='nm-recent-colors-v1';
export function readRecentColors(storage) {
  try { const values=JSON.parse(storage.getItem(RECENT_COLORS_KEY)||'[]'); return Array.isArray(values)?[...new Set(values.filter(validHex).map(v=>v.toLowerCase()))].slice(0,10):[]; } catch { return []; }
}
export function rememberColor(storage, color) {
  if(!validHex(color)) return readRecentColors(storage);
  const next=[color.toLowerCase(),...readRecentColors(storage).filter(c=>c!==color.toLowerCase())].slice(0,10);
  storage.setItem(RECENT_COLORS_KEY,JSON.stringify(next)); return next;
}
export function collectionSwatches(items=[]) {
  const colors=new Map();
  for(const item of items) {
    if(!['Vernis','Semi-permanent','Gel'].includes(item.type) || auxiliary(item) || Number(item.quantity??1)<=0)continue;
    // Do not manufacture a colour for an incomplete legacy record.
    if(![item.confirmedColor,item.shade,item.color,item.catalogColorValidated && item.catalogColor].some(validHex))continue;
    const color=productColor(item);
    if(!colors.has(color))colors.set(color,{color,name:[item.brand,item.name||item.reference].filter(Boolean).join(' · ')||color});
  }
  return [...colors.values()];
}
