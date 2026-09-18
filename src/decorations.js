export const isDecoration = item => item?.type === 'Matériel' && ['Stickers / décalcomanies', 'Strass / décorations'].includes(item.equipmentCategory);

export function decorationChoice(options = {}) {
  return {
    mode: Array.isArray(options.constraints) && options.constraints.includes('noStickers') ? 'without' : ['with', 'without'].includes(options.decorations) ? options.decorations : 'auto',
    id: ['string', 'number'].includes(typeof options.decorationId) ? String(options.decorationId) : '',
  };
}

export const decorationTags=['floral','étoile','lune','cœur','doré','argenté','animal','abstrait','fruit','celestial','witchy','girly','minimal'];
const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function stickerTags(item) {
  return Array.isArray(item.decorationTags) ? [...new Set(item.decorationTags.filter(tag=>decorationTags.includes(tag)))] : [];
}
export function stickerAffinity(item, options={}) {
  const words=clean([item.name,item.materialStyle,...stickerTags(item)].join(' '));
  const universe=clean(options.style+' '+options.mood);
  const groups=[[/witch|myster|celestial|goth/, /lune|etoile|celestial|witchy/],[/roman|douce|girly|coquette/,/floral|fleur|coeur|girly/],[/floral|nature|cottage/,/floral|fleur|feuille|animal/],[/minimal|calme|clean/,/minimal|abstrait/],[/joy|audac|y2k/,/fruit|abstrait|etoile/]];
  return groups.reduce((score,[style,tags])=>score+(style.test(universe)&&tags.test(words)?16:0),0);
}
