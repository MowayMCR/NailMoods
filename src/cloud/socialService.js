const HANDLE = /^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/;

export function normalizeHandle(value) {
  const handle = String(value || '').trim().replace(/^@+/, '').toLocaleLowerCase('en-US');
  if (!HANDLE.test(handle) || ['admin','support','nailmoods','official','system'].includes(handle)) return null;
  return handle;
}

export function createSocialService(client) {
  if (!client?.rpc) throw new Error('Les profils publics sont momentanément indisponibles.');
  return {
    async isHandleAvailable(handle) {
      const normalized = normalizeHandle(handle);
      if (!normalized) return false;
      const { data, error } = await client.rpc('nailmoods_handle_available', { p_handle: normalized });
      if (error) throw error;
      return data === true;
    },
    async saveIdentity({ handle, visibility = 'pros', displayName = '' }) {
      const normalized = normalizeHandle(handle);
      if (!normalized) throw new Error('Cet identifiant n’est pas valide.');
      if (!['everyone','pros','nobody'].includes(visibility)) throw new Error('Cette visibilité n’est pas valide.');
      const { error } = await client.rpc('set_nailmoods_identity', {
        p_handle: normalized, p_visibility: visibility, p_display_name: String(displayName || '').trim().slice(0, 80),
      });
      if (error) throw error;
      return { handle: normalized, visibility };
    },
    async search(query, { kind = null, city = null } = {}) {
      const value = String(query || '').trim().replace(/^@+/, '').slice(0, 80);
      if (!value) return [];
      const { data, error } = await client.rpc('search_nailmoods', { p_query: value, p_kind: kind, p_city: city });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  };
}
