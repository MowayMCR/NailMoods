import { TERMS_VERSION, PRIVACY_VERSION, availableChoices } from './policy.js';
async function checked(request) { const { data, error } = await request; if (error) throw error; return data; }
async function all(client, table, column, value) {
  const rows = [];
  for (let start = 0; ; start += 500) {
    const batch = await checked(client.from(table).select('*').eq(column, value).order(({user_consents:'event_id',pro_follows:'pro_profile_id',workspace_members:'workspace_id'})[table] || 'id').range(start, start + 499));
    rows.push(...batch); if (batch.length < 500) return rows;
  }
}
export function privacyService(client) {
  async function user() { const data = await checked(client.auth.getUser()); if (!data.user) throw new Error('Reconnecte-toi pour accéder à tes données.'); return data.user; }
  return {
    async load() { const current = await user(); return checked(client.from('user_consents').select('*').eq('user_id', current.id).order('event_id', { ascending: false }).limit(1).maybeSingle()); },
    async save(choices, acceptTerms = false) {
      await user();
      const saved = await checked(client.rpc('record_privacy_choices', { p_privacy_version: PRIVACY_VERSION, p_terms_version: TERMS_VERSION, p_accept_terms: acceptTerms, ...Object.fromEntries(Object.entries(availableChoices(choices)).map(([key, value]) => ['p_' + key, value])) }));
      return Array.isArray(saved) ? saved[0] : saved;
    },
    async exportData() {
      const current = await user();
      const result = { format: 'nailmoods-personal-data-v1', exported_at: new Date().toISOString(), user_id: current.id, email: current.email };
      // Explicit ownership filters: never export all rows merely because public RLS permits reading them.
      const tables = { profiles: 'id', workspaces: 'owner_user_id', workspace_members: 'user_id', user_products: 'created_by', user_stickers: 'created_by', user_equipment: 'created_by', inspirations: 'created_by', journal_entries: 'created_by', favorites: 'user_id', pro_profiles: 'user_id', pro_follows: 'follower_user_id', user_consents: 'user_id', messages: 'sender_id' };
      for (const [table, column] of Object.entries(tables)) {
        result[table] = await all(client, table, column, current.id);
      }
      // Revalidate: never download account A's export after a switch to B during the request.
      if ((await user()).id !== current.id) throw new Error('Le compte a changé. Relance le téléchargement.');
      return result;
    },
    async deleteAccount(confirmation) {
      if (confirmation !== 'SUPPRIMER') throw new Error('Écris SUPPRIMER pour confirmer.');
      const current = await user();
      await checked(client.rpc('delete_my_nailmoods_account', { p_confirmation: confirmation }));
      return current.id;
    },
  };
}
export function downloadJSON(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function clearAccountCache(storage, userId) {
  // Only this account. Guest data and other accounts must survive.
  const prefixes = [`nm-cloud-v1:${userId}:`, `nailmoods_supabase_migration_done:${userId}:`];
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (prefixes.some(prefix => key?.startsWith(prefix))) storage.removeItem(key);
  }
}
