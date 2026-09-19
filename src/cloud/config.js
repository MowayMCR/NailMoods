// Public configuration only. No server credentials are accepted by the browser.
export function publicCloudConfig(env = {}) {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key) throw new Error('Configuration Supabase publique incomplète.');
  const parsed = new URL(url);
  if (env.VITE_BETA_ACCOUNT_TIERS === 'true' && parsed.hostname === 'rvqmtnqvzzxzwfxfyjcg.supabase.co')
    throw new Error('Le mode bêta de recette est interdit sur le backend de production.');
  if (env.VITE_DEPLOYMENT_ENV === 'recette' && parsed.hostname !== 'pueqkbwfwxgqzmkauxoz.supabase.co')
    throw new Error('La preview doit utiliser NailMoods-Recette.');
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash)
    throw new Error('URL Supabase invalide.');
  if (!key.startsWith('sb_publishable_')) throw new Error('Une clé publique Supabase est requise.');
  return { url: parsed.href.replace(/\/$/, ''), key };
}

// Query callbacks preserve the app's existing hash router and Pages base path.
export function authReturnUrl(pageUrl, recovery = false) {
  const url = new URL(pageUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set('auth', recovery ? 'recovery' : 'callback');
  return url.href;
}
