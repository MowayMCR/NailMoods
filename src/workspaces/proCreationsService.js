const hex = value => /^#[0-9a-f]{6}$/i.test(String(value || '').trim()) ? String(value).trim().toLowerCase() : null;
const words = value => [...new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean).map(item => item.slice(0, 48)))].slice(0, 12);

async function checked(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export function proCreationError(error) {
  const message = String(error?.message || '');
  if (message.includes('pro_creations')) return 'Ta création ne peut pas être enregistrée pour le moment.';
  if (message.includes('row-level security') || message.includes('permission')) return 'Cette création n’est pas accessible depuis cet espace.';
  return 'La création n’a pas pu être enregistrée. Réessaie.';
}

export function creationPayload(values = {}) {
  const roles = [['base', values.base], ['principale', values.primary], ['secondaire', values.secondary], ['accent', values.accent]]
    .map(([role, color]) => ({ role, color: hex(color) })).filter(item => item.color);
  return {
    title: String(values.title || '').trim().slice(0, 80), description: String(values.description || '').trim().slice(0, 600),
    visibility: ['private', 'connections', 'public'].includes(values.visibility) ? values.visibility : 'private', color_roles: roles,
    design: normaliseProNailDesign(values.design),
    techniques: words(values.techniques), effects: words(values.effects), motifs: words(values.motifs), styles: words(values.styles), moods: words(values.moods), tags: words(values.tags),
    level: ['simple', 'intermediaire', 'avance'].includes(values.level) ? values.level : 'intermediaire',
    recommended_fingers: Array.isArray(values.recommendedFingers) ? values.recommendedFingers.filter(value => ['thumb','index','middle','ring','little','accent','multiple','free'].includes(value)).slice(0, 7) : [],
    recommended_nail_count: Math.min(5, Math.max(1, Number(values.recommendedNailCount) || 1)),
  };
}

export function proCreationsService(client, userId, workspaceId) {
  const base = client.from('pro_creations');
  return {
    list: () => checked(base.select('id,owner_id,title,description,visibility,design,color_roles,techniques,effects,motifs,styles,moods,tags,level,recommended_fingers,recommended_nail_count,version,created_at,updated_at').eq('owner_id', userId).order('updated_at', { ascending: false })),
    palette: () => checked(client.from('user_products').select('id,shade_name,hex').eq('workspace_id', workspaceId).not('hex','is',null).order('created_at', { ascending: false }).limit(16)),
    create: values => checked(base.insert({ ...creationPayload(values), owner_id: userId, workspace_id: workspaceId }).select().single()),
    update: (id, values) => checked(base.update(creationPayload(values)).eq('id', id).eq('owner_id', userId).select().single()),
    duplicate: creation => checked(base.insert({
      title: `${String(creation.title || 'Création').slice(0, 70)} · copie`, description: creation.description || '', visibility: 'private',
      design: normaliseProNailDesign(creation.design), color_roles: creation.color_roles || [], techniques: creation.techniques || [], effects: creation.effects || [], motifs: creation.motifs || [], styles: creation.styles || [], moods: creation.moods || [], tags: creation.tags || [], level: creation.level || 'intermediaire', recommended_fingers: creation.recommended_fingers || [], recommended_nail_count: creation.recommended_nail_count || 1,
      owner_id: userId, workspace_id: workspaceId,
    }).select().single()),
    remove: id => checked(base.delete().eq('id', id).eq('owner_id', userId)),
  };
}
import {normaliseProNailDesign} from './proNailEditorModel.js';
