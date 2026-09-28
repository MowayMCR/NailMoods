import { ICON_ATLAS } from './iconAtlas.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
const icons = new Map(Object.entries(ICON_ATLAS).map(([label, icon]) => [normalize(label), icon]));
const aliases = {
  Douce: 'Doux', Mystérieuse: 'Witchy', Chic: 'Élégant', Joyeuse: 'Lumineux', Audacieuse: 'Audacieux', 'Au calme': 'Minimal',
  Libre: 'Classique', Uni: 'Monochrome', Pailleté: 'Paillettes', 'Effet miroir': 'Chrome',
  'Dessin à main levée': 'Freehand', 'French & lignes': 'French', 'Effets / poudres / chrome': 'Chrome powder',
  'Gel 3D': '3D gel', 'gel-3d': '3D gel', Blooming: 'Blooming gel', Tortoise: 'Tortoiseshell',
  Léopard: 'Leopard', Zèbre: 'Zebra', Pois: 'Dot art', dots: 'Dot art', line: 'Line art',
  'Motif serpent': 'Snake print', snake: 'Snake print', 'Motif vache': 'Cow print', cow: 'Cow print',
  'Velvet magnétique': 'Velvet nails', 'velvet-magnetic': 'Velvet nails', 'Poudre chrome': 'Chrome powder',
  Incrustations: 'Encapsulated', Encapsulé: 'Encapsulated', rhinestones: 'Strass',
  Lignes: 'Line art', 'Peinture en un trait': 'One stroke', Glacé: 'Glazed nails', 'Effet verre': 'Glass nails',
  Laiteux: 'Milky nails', milky: 'Milky nails', 'Effet naturel': 'Soap nails',
  outline: 'Outline nails', skittle: 'Skittle nails', 'mix-match': 'Mix & match',
  monochrome: 'Monochrome', accent: 'Accent nail', duo: 'Duo alterné', marble: 'Marble',
};
for (const [alias, target] of Object.entries(aliases)) if (!icons.has(normalize(alias))) icons.set(normalize(alias), ICON_ATLAS[target]);
export const resolveIcon = value => icons.get(normalize(value)) || null;
