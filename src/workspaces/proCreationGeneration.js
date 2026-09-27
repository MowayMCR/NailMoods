import { selectedTechniques } from '../creationEngine.js';

const FINGER_INDEX = { thumb: 0, index: 1, middle: 2, ring: 3, little: 4 };
const unique = values => [...new Set(values.filter(Boolean))];
const isHex = value => /^#[0-9a-f]{6}$/i.test(String(value || ''));

export const proCreationModes = [
  ['reuse', 'Reprendre ce design', 'La composition reprend ses éléments clés.'],
  ['palette', 'Adapter à ma palette', 'Le motif est réinterprété avec tes teintes.'],
  ['inspire', 'S’inspirer de ce design', 'Une touche de la création guide la pose.'],
  ['placement', 'L’utiliser sur certains ongles', 'La création reste concentrée sur les ongles conseillés.'],
];

export function proCreationTargets(creation = {}, mode = 'inspire') {
  const fingers = Array.isArray(creation.recommended_fingers) ? creation.recommended_fingers : [];
  const explicit = fingers.map(value => FINGER_INDEX[value]).filter(Number.isInteger);
  if (mode === 'inspire') return [3];
  if (mode === 'placement' && !explicit.length) return [3];
  if (fingers.includes('accent')) return [3];
  if (fingers.includes('multiple')) return [1, 3];
  if (fingers.includes('free')) return [3];
  return explicit.length ? unique(explicit).slice(0, 5) : [3];
}

// A role is deliberately mapped to colours already chosen by the generator.
// In collection mode those colours already point to the client's products, so
// no commercial reference can be invented during an adaptation.
export function adaptedCreationColors(creation = {}, idea = {}, mode = 'inspire') {
  const palette = (idea.palette || []).map(item => item.color).filter(isHex);
  const original = Object.fromEntries((creation.color_roles || [])
    .filter(item => item?.role && isHex(item.color)).map(item => [item.role, item.color]));
  const fallback = palette[0] || '#b88699';
  if (mode === 'reuse' && Object.keys(original).length) return {
    base: original.base || fallback,
    principale: original.principale || original.base || fallback,
    secondaire: original.secondaire || original.principale || fallback,
    accent: original.accent || original.secondaire || original.principale || fallback,
  };
  return {
    base: palette[0] || fallback,
    principale: palette[0] || fallback,
    secondaire: palette[1] || palette[0] || fallback,
    accent: palette[palette.length - 1] || palette[1] || palette[0] || fallback,
  };
}

// This intentionally carries semantic constraints only: the client's idea is
// recomposed by NailMoods and never receives the PO's raw drawing strokes.
export function applyProCreationConstraint(ideas = [], selection, options = {}) {
  if (!selection?.creation?.id) return ideas;
  const creation = selection.creation;
  const mode = proCreationModes.some(([id]) => id === selection.mode) ? selection.mode : 'inspire';
  const sourceTechniques = selectedTechniques({ techniques: creation.techniques || [] });
  const primary = sourceTechniques.find(value => value !== 'french') || sourceTechniques[0] || '';
  const targets = proCreationTargets(creation, mode);
  const motif = Array.isArray(creation.motifs) && creation.motifs[0] || '';
  const drawing = /french/i.test((creation.techniques || []).join(' ')) ? 'french' : null;
  const label = creation.title || 'création de ma PO';
  return ideas.map(idea => {
    const colors = adaptedCreationColors(creation, idea, mode);
    const nails = idea.nails.map((nail, index) => {
      const applies = targets.includes(index);
      // Inspiration keeps one accent; the other modes retain recommended placement.
      if (!applies) return nail;
      const technique = primary || nail.technique || null;
      return {
        ...nail,
        ...(mode === 'reuse' ? { color: index === targets[0] ? colors.principale : nail.color, accentColor: colors.accent } : { accentColor: colors.accent }),
        technique,
        drawing: drawing || nail.drawing || null,
        drawingTechnique: drawing && primary && primary !== 'french' ? primary : nail.drawingTechnique || null,
        techniques: unique([...(nail.techniques || []), ...sourceTechniques]),
        proCreationAccent: true,
      };
    });
    const adaptation = mode === 'palette' ? 'adaptée à ta palette' : mode === 'reuse' ? 'réinterprétée dans cette pose' : mode === 'placement' ? 'placée sur les ongles conseillés' : 'utilisée comme inspiration';
    return {
      ...idea,
      nails,
      title: `${idea.title} · ${label}`.slice(0, 96),
      description: `${idea.description} Création de ta PO ${adaptation}.`,
      reasons: unique([...(idea.reasons || []), `Inspirée par « ${label} »${motif ? ` · ${motif}` : ''}`]),
      techniques: unique([...(idea.techniques || []), ...sourceTechniques]),
      proCreation: { id: creation.id, title: label, mode, placement: targets, colors },
      options: { ...idea.options, proCreationId: creation.id, proCreationMode: mode },
    };
  });
}

export async function listVisibleProCreations(client, ownerIds = []) {
  const ids = unique(ownerIds.map(String));
  if (!client || !ids.length) return [];
  const { data, error } = await client.from('pro_creations')
    .select('id,owner_id,title,description,visibility,color_roles,techniques,effects,motifs,styles,moods,tags,level,recommended_fingers,recommended_nail_count,updated_at')
    .in('owner_id', ids).order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
