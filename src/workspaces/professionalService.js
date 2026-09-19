import { handleError, normalizeHandle } from '../identity/handles.js';

async function checked(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export function professionalError(error) {
  const message = String(error?.message || '');
  const cases = {
    pro_account_required: 'Cette section est réservée au compte Pro de recette.',
    invalid_professional_status: 'Choisis l’un des trois statuts proposés.',
    invalid_workspace_name: 'Le nom doit contenir entre 2 et 80 caractères.',
    invalid_professional_profile: 'Vérifie le nom, la bio et la ville.',
    invalid_handle: 'Cet identifiant doit contenir 3 à 30 lettres, chiffres, points ou underscores.',
    handle_unavailable: 'Ce NailMoods ID est déjà utilisé.',
    public_handle_required: 'Ajoute un NailMoods ID avant de rendre ce profil public.',
    owner_required: 'Seule la propriétaire peut modifier cet espace.',
    confirmation_mismatch: 'Recopie exactement le nom de l’Institut pour confirmer.',
  };
  for (const [code, copy] of Object.entries(cases)) if (message.includes(code)) return copy;
  return 'La modification n’a pas abouti. Recharge ton profil puis réessaie.';
}

export function professionalService(client, userId) {
  return {
    async state() {
      const profile = await checked(client.from('profiles').select('account_tier,professional_status').eq('id', userId).single());
      const memberships = await checked(client.from('workspace_members').select('workspace_id,role').eq('user_id', userId));
      const ids = memberships.map(item => item.workspace_id);
      const workspaces = ids.length
        ? await checked(client.from('workspaces').select('id,owner_user_id,kind,name,public_handle').in('id', ids).order('created_at'))
        : [];
      const ownedIds = workspaces.filter(item => item.owner_user_id === userId && item.kind !== 'personal').map(item => item.id);
      const profiles = ownedIds.length
        ? await checked(client.from('pro_profiles').select('workspace_id,display_name,bio,avatar_url,city,is_public,styles').in('workspace_id', ownedIds))
        : [];
      const roles = new Map(memberships.map(item => [item.workspace_id, item.role]));
      const details = new Map(profiles.map(item => [item.workspace_id, item]));
      return {
        tier: profile.account_tier,
        status: profile.professional_status || '',
        workspaces: workspaces.filter(item => item.kind !== 'personal').map(item => ({
          ...item,
          role: roles.get(item.id),
          profile: details.get(item.id) || null,
        })),
      };
    },
    async setStatus(status) {
      return checked(client.rpc('set_professional_status', { p_status: status }));
    },
    async create(kind, name) {
      return checked(client.rpc('create_professional_workspace', { p_kind: kind, p_name: String(name || '').trim() }));
    },
    async saveWorkspace(workspaceId, values) {
      const handle = values.handle ? normalizeHandle(values.handle) : '';
      if (values.handle && handleError(handle)) throw new Error('invalid_handle');
      return checked(client.rpc('update_professional_workspace', {
        p_workspace_id: workspaceId,
        p_name: String(values.name || '').trim(),
        p_handle: handle || null,
        p_bio: String(values.bio || '').trim(),
        p_city: String(values.city || '').trim(),
        p_is_public: values.isPublic === true,
      }));
    },
    async close(workspaceId, confirmation) {
      return checked(client.rpc('close_institute', { p_workspace_id: workspaceId, p_confirmation: confirmation }));
    },
  };
}
