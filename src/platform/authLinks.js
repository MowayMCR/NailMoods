export const mobileAppId = environment => environment === 'production' ? 'com.nailmoods.app' : environment === 'recette' ? 'com.nailmoods.app.recette' : null;
export function mobileAuthReturnUrl(environment, recovery = false) {
  const appId = mobileAppId(environment);
  if (!appId) throw new Error('Environnement mobile inconnu.');
  return `${appId}://auth/callback?auth=${recovery ? 'recovery' : 'callback'}`;
}
export function validateMobileAuthUrl(value, environment) {
  try {
    const u = new URL(value);
    return u.protocol === mobileAppId(environment)+':' && u.hostname === 'auth' && u.pathname === '/callback' && !u.username && !u.password && !u.port && !u.hash && ['callback','recovery'].includes(u.searchParams.get('auth')) && Boolean(u.searchParams.get('code') || u.searchParams.get('error'));
  } catch { return false; }
}
let pending = null;
const seen = new Set();
export function queueAuthUrl(value, environment) {
  if (!validateMobileAuthUrl(value,environment) || seen.has(value)) return false;
  seen.add(value); pending = value;
  globalThis.window?.dispatchEvent(new Event('nm-native-auth-url'));
  return true;
}
export function takeAuthUrl() { const value=pending;pending=null;return value; }
