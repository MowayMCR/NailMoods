export const PHOTO_MATERIAL_ENGINE_VERSION = 'photo-material-v3';

const profile = (label, shader, signals) => Object.freeze({ label, shader, signals: Object.freeze(signals) });

// Contract shared by generated data, the renderer and the recipe test gallery.
// Each profile names the physical cues that must stay legible at card size.
export const REALISTIC_RENDER_PROFILES = Object.freeze({
  'cat-eye': profile('Cat Eye', 'magnetic-beam', ['ligne magnétique directionnelle', 'halo mobile', 'profondeur sombre']),
  'velvet-magnetic': profile('Velvet magnétique', 'magnetic-velvet', ['halo velours', 'grain satiné', 'profondeur']),
  chrome: profile('Chrome miroir', 'mirror-metal', ['bandes spéculaires nettes', 'contraste miroir', 'reflet de softbox']),
  'gel-3d': profile('Gel 3D', 'raised-clear-gel', ['épaisseur', 'ombre portée', 'arête brillante']),
  rhinestones: profile('Strass', 'faceted-crystal', ['facettes', 'points de lumière', 'ombre de fixation']),
  charms: profile('Charms', 'raised-metal-charm', ['volume métallique', 'reflet dur', 'ombre portée']),
  'glass-nails': profile('Glass nails', 'transparent-glass', ['transparence', 'bord lumineux', 'profondeur vitrée']),
  jelly: profile('Jelly', 'translucent-jelly', ['base visible', 'teinte translucide', 'brillance humide']),
  glazed: profile('Glazed', 'pearl-glaze', ['voile nacré', 'reflet irisé', 'base lisible']),
  'aurora-holographic': profile('Aurora / holographique', 'spectral-film', ['reflet spectral', 'changement de couleur', 'éclats prismatiques']),
  glitter: profile('Paillettes', 'reflective-particles', ['particules de tailles variées', 'éclats ponctuels', 'profondeur de suspension']),
  aura: profile('Aura', 'diffuse-airbrush', ['halo pigmenté diffus', 'dégradé fondu', 'top coat brillant']),
  blooming: profile('Blooming', 'fluid-diffusion', ['pigment diffusé', 'bords organiques', 'superpositions']),
  marble: profile('Marbré', 'layered-stone', ['veines irrégulières', 'couches translucides', 'brillance']),
  stamping: profile('Stamping', 'printed-pattern', ['motif net', 'encre fine', 'surface vernie']),
  'micro-french': profile('French / Micro-French', 'gel-french', ['bord libre net', 'base naturelle', 'brillance gel']),
  stickers: profile('Stickers', 'sealed-decal', ['motif posé', 'bord scellé', 'top coat']),
  simple: profile('Uni / duo', 'gel-lacquer', ['couleur uniforme', 'reflet naturel', 'surface lisse']),
});

export const REALISTIC_EXAMPLE_TECHNIQUES = Object.freeze([
  'aura', 'cat-eye', 'chrome', 'jelly', 'glazed', 'gel-3d', 'glitter', 'rhinestones',
  'charms', 'aurora-holographic', 'glass-nails',
]);

export function realisticRenderProfile(technique = 'simple') {
  return REALISTIC_RENDER_PROFILES[technique] || REALISTIC_RENDER_PROFILES.simple;
}
