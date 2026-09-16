export const isDecoration = item => item?.type === 'Matériel' && ['Stickers / décalcomanies', 'Strass / décorations'].includes(item.equipmentCategory);

export function decorationChoice(options = {}) {
  return {
    mode: Array.isArray(options.constraints) && options.constraints.includes('noStickers') ? 'without' : ['with', 'without'].includes(options.decorations) ? options.decorations : 'auto',
    id: ['string', 'number'].includes(typeof options.decorationId) ? String(options.decorationId) : '',
  };
}
