import { PHOTO_MATERIAL_ENGINE_VERSION, realisticRenderProfile } from './realisticRendering.js';

const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const reference = (label, url) => ({ label, url });

// These records drive both generated data and the preview. A technique is
// never reduced to a decorative label without its material cues.
export const TECHNIQUE_CATALOG = Object.freeze([
  {
    id: 'cat-eye', label: 'Cat Eye', aliases: /cat.?eye|oeil de chat|magnetique.*ligne|galaxie magnetique/,
    finish: 'Magnétique profond', relief: 'plat', realism: 'required',
    cues: ['reflet magnétique directionnel', 'ligne ou halo lumineux', 'profondeur sombre'],
    references: [reference('The GelBottle · Hourglass Magnetic Cat Eye', 'https://thegelbottle.us/products/hourglass-magnetic-shimmer-cat-eye-gel-polish/')],
  },
  {
    id: 'velvet-magnetic', label: 'Velvet magnétique', aliases: /velvet|velours magnetique|silky magnet|magnetic shimmer/,
    finish: 'Velours magnétique', relief: 'plat', realism: 'required',
    cues: ['halo magnétique diffus', 'grain satiné', 'lumière mobile'],
    references: [reference('The GelBottle · Magnetic gel reference', 'https://thegelbottle.us/products/hourglass-magnetic-shimmer-cat-eye-gel-polish/')],
  },
  {
    id: 'chrome', label: 'Chrome miroir', aliases: /chrome|miroir|mirror shine|metal liquide/,
    finish: 'Miroir métallique', relief: 'plat', realism: 'required',
    cues: ['contraste métallique', 'bande spéculaire nette', 'reflet miroir'],
    references: [reference('Gelish · Chrome Stix', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'gel-3d', label: 'Gel 3D', aliases: /gel\s*3d|3d gel|sculpt|relief gel|emboss/,
    finish: 'Gel brillant', relief: 'élevé', realism: 'required',
    cues: ['épaisseur visible', 'ombres portées', 'volume brillant'],
    references: [reference('Gelish · Nail art professionnel', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'rhinestones', label: 'Strass', aliases: /strass|rhinestone|cristal|crystal|gemme/,
    finish: 'Cristal facetté', relief: 'élevé', realism: 'required',
    cues: ['facettes lumineuses', 'ombre de fixation', 'points de brillance'],
    references: [reference('Gelish · Nail art professionnel', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'charms', label: 'Charms', aliases: /charm|bijou d.?ongle|nail jewel|breloque/,
    finish: 'Bijou brillant', relief: 'élevé', realism: 'required',
    cues: ['objet posé', 'volume métallique', 'ombre portée'],
    references: [reference('Gelish · Nail art professionnel', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'glass-nails', label: 'Glass nails', aliases: /glass nail|ongle verre|verre transparent|vitrail/,
    finish: 'Verre translucide', relief: 'léger', realism: 'required',
    cues: ['transparence', 'bord lumineux', 'profondeur vitrée'],
    references: [reference('Gelish · Soft Gel professional system', 'https://gelish.com/soft-gel/medium-square')],
  },
  {
    id: 'jelly', label: 'Jelly', aliases: /jelly|sirop|syrup|translucide|semi.?transparent/,
    finish: 'Jelly translucide', relief: 'plat', realism: 'recommended',
    cues: ['couleur translucide', 'ongle visible sous la teinte', 'brillance humide'],
    references: [reference('Gelish · Soft-jelly visual reference', 'https://gelish.com/soft-gel/medium-square')],
  },
  {
    id: 'glazed', label: 'Glazed', aliases: /glazed|glaze|nacre|perle|pearl|donut/,
    finish: 'Nacré glacé', relief: 'plat', realism: 'recommended',
    cues: ['voile nacré', 'reflet froid irisé', 'base encore lisible'],
    references: [reference('The GelBottle · Glazed Top Coat', 'https://thegelbottle.com/more/pick--mix/glazed-top-coat/')],
  },
  {
    id: 'aurora-holographic', label: 'Aurora / holographique', aliases: /aurora|holograph|holo|irise|iridescen|chameleon/,
    finish: 'Irisé holographique', relief: 'plat', realism: 'recommended',
    cues: ['dégradé spectral', 'reflets changeants', 'points prismatiques'],
    references: [reference('Gelish · Holographic Chrome Stix', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'glitter', label: 'Paillettes', aliases: /paillet|glitter|sparkle|confetti/,
    finish: 'Pailleté', relief: 'léger', realism: 'recommended',
    cues: ['particules de tailles variées', 'brillance ponctuelle', 'densité visible'],
    references: [reference('Gelish · Nail art professionnel', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'aura', label: 'Aura', aliases: /\baura\b|airbrush|centre diffuse|halo central/,
    finish: 'Dégradé diffus', relief: 'plat', realism: 'recommended',
    cues: ['centre lumineux', 'dégradé radial', 'bords fondus'],
    references: [reference('Gelish · Nail art professionnel', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'blooming', label: 'Blooming', aliases: /blooming|aquarelle|watercolor|encre diffuse/,
    finish: 'Diffusion brillante', relief: 'plat', realism: 'recommended',
    cues: ['pigment diffusé', 'bords organiques', 'superpositions fluides'],
    references: [reference('Gelish · Blooming Gel', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'marble', label: 'Marbré', aliases: /marbr|marble|agate|pierre/,
    finish: 'Marbré brillant', relief: 'plat', realism: 'recommended',
    cues: ['veines irrégulières', 'profondeur en couches', 'contrastes organiques'],
    references: [reference('Gelish · Blooming Gel marble reference', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'stamping', label: 'Stamping', aliases: /stamping|tampon|plaque de motif|nail stamp/,
    finish: 'Motif imprimé', relief: 'plat', realism: 'illustrated',
    cues: ['motif net répété', 'aplats fins', 'contours réguliers'],
    references: [reference('Maniology · cours officiel de stamping', 'https://maniology.com/pages/nail-stamping-video-course-all')],
  },
  {
    id: 'micro-french', label: 'French / Micro-French', aliases: /micro.?french|french/,
    finish: 'Brillant', relief: 'plat', realism: 'illustrated',
    cues: ['bord libre régulier', 'ligne fine', 'base distincte'],
    references: [reference('Gelish · Le French system', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'stickers', label: 'Stickers', aliases: /sticker|decal|decalcomanie/,
    finish: 'Brillant', relief: 'léger', realism: 'illustrated',
    cues: ['motif posé', 'contour simple', 'faible relief'],
    references: [reference('Gelish · Nail art professionnel', 'https://gelish.com/nail-arts')],
  },
  {
    id: 'simple', label: 'Uni / duo', aliases: /uni|solid|duo|accent|creme/,
    finish: 'Brillant', relief: 'plat', realism: 'illustrated',
    cues: ['couleur uniforme', 'reflet doux', 'surface lisse'],
    references: [reference('The GelBottle · Gel colour range', 'https://thegelbottle.us/gel-color-shop-all/')],
  },
]);

const byId = new Map(TECHNIQUE_CATALOG.map(item => [item.id, item]));

// Taxonomy entries that deliberately reuse a material shader still keep their
// own canonical recipe in `idea.techniques` / `nail.technique`. This lookup only
// chooses the closest physical rendering when a dedicated shader is unnecessary.
const VISUAL_FALLBACKS = Object.freeze({
  tortoiseshell: 'marble', leopard: 'stamping', crocodile: 'stamping', snake: 'stamping', cow: 'stamping', zebra: 'stamping',
  foil: 'glitter', flakes: 'glitter', encapsulated: 'glass-nails', milky: 'glazed', babyboomer: 'aura', ombre: 'aura',
  'color-block': 'chrome', 'negative-space': 'jelly', 'half-moon': 'micro-french', ruffian: 'micro-french', outline: 'micro-french',
  'one-stroke': 'gel-3d', skittle: 'simple', 'mix-match': 'simple', monochrome: 'simple', french: 'micro-french',
});
const DISPLAY_OVERRIDES = Object.freeze({
  french: { label: 'French', finish: 'French brillante' },
  'micro-french': { label: 'Micro French', finish: 'Micro French brillante' },
  'reverse-french': { label: 'Reverse French', finish: 'French inversée brillante' },
  'double-french': { label: 'Double French', finish: 'Double French brillante' },
  'side-french': { label: 'Side French', finish: 'French latérale brillante' },
  'deep-french': { label: 'Deep French', finish: 'French profonde brillante' },
  'v-french': { label: 'V-French', finish: 'French en V brillante' },
  tortoiseshell: { label: 'Tortoise', finish: 'Tortoise brillant' },
  leopard: { label: 'Léopard', finish: 'Motif léopard brillant' },
  crocodile: { label: 'Crocodile', finish: 'Motif crocodile brillant' },
  snake: { label: 'Snake print', finish: 'Motif serpent brillant' },
  cow: { label: 'Cow print', finish: 'Motif cow print brillant' },
  zebra: { label: 'Zèbre', finish: 'Motif zèbre brillant' },
});

function sourceText(idea = {}) {
  const products = [...(idea.palette || []), ...(idea.resources || [])];
  return normalize([
    idea.technique, ...(idea.techniques || []), idea.rendering?.technique, idea.pattern, idea.title, idea.description,
    ...products.flatMap(item => [item.name, item.finish, item.effect, item.usage, item.equipmentCategory, item.materialStyle, ...(item.decorationTags || [])]),
    ...(idea.nails || []).flatMap(nail => [nail.finish, nail.effect, nail.technique, nail.decoration?.motif]),
  ].filter(Boolean).join(' '));
}

export function techniqueDefinition(value) {
  const normalized = normalize(value);
  return byId.get(normalized) || TECHNIQUE_CATALOG.find(item => item.aliases.test(normalized)) || byId.get(VISUAL_FALLBACKS[normalized]) || null;
}

export function detectTechnique(idea = {}) {
  const explicit = techniqueDefinition(idea.technique || idea.rendering?.technique);
  if (explicit) return explicit;
  const text = sourceText(idea);
  const matched = TECHNIQUE_CATALOG.find(item => item.id !== 'simple' && item.aliases.test(text));
  if (matched) return matched;
  if (idea.pattern === 'french') return byId.get('micro-french');
  if (['sticker', 'paletteSticker'].includes(idea.pattern)) return byId.get('stickers');
  return byId.get('simple');
}

export function renderingForIdea(idea = {}) {
  const technique = detectTechnique(idea);
  const canonicalTechnique = normalize(idea.technique || idea.rendering?.technique);
  const display = DISPLAY_OVERRIDES[canonicalTechnique];
  const compositionLabel = Array.isArray(idea.techniques) && idea.techniques.length > 1 ? idea.techniques.join(' + ') : '';
  const photoProfile = realisticRenderProfile(technique.id);
  const realism = ['required', 'recommended', 'illustrated'].includes(idea.realismRequired)
    ? idea.realismRequired
    : technique.realism;
  const defaultMode = idea.renderMode === 'illustrated' || idea.renderMode === 'realistic'
    ? idea.renderMode
    : realism === 'illustrated' ? 'illustrated' : 'realistic';
  return {
    technique: canonicalTechnique || technique.id,
    materialTechnique: technique.id,
    label: compositionLabel || display?.label || technique.label,
    finish: compositionLabel ? 'Composition multi-techniques' : idea.finish || display?.finish || technique.finish,
    relief: idea.relief || technique.relief,
    realism,
    defaultMode,
    supportedModes: ['illustrated', 'realistic'],
    realisticEngine: PHOTO_MATERIAL_ENGINE_VERSION,
    realisticShader: photoProfile.shader,
    materialSignals: [...photoProfile.signals],
    cues: [...technique.cues],
    references: technique.references.map(item => ({ ...item })),
  };
}

export function enrichIdeaRendering(idea = {}, techniqueOverride = '') {
  const base = techniqueOverride ? { ...idea, technique: techniqueOverride, finish: undefined, relief: undefined, realismRequired: undefined, renderMode: undefined, rendering: undefined } : idea;
  const rendering = renderingForIdea(base);
  return {
    ...base,
    technique: rendering.technique,
    finish: rendering.finish,
    relief: rendering.relief,
    realismRequired: rendering.realism,
    renderMode: rendering.defaultMode,
    rendering,
  };
}

export const techniqueChoices = TECHNIQUE_CATALOG
  .map(({ id, label, realism }) => ({ id, label, realism }));
