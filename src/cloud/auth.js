import { authReturnUrl } from './config.js';
import { signupConsent } from '../privacy/policy.js';

// No profile/workspace inserts here: the existing backend trigger owns signup.
// No user-editable account tier, no logging of SDK errors or credentials.
export function createAuthService(client, pageUrl) {
  if (!client?.auth) throw new Error('Connexion Supabase indisponible.');
  const auth = client.auth;
  async function checked(request) {
    const { data, error } = await request;
    if (error) throw error;
    return data;
  }
  return {
    signUp: (email, password, accepted = false, choices = {}) => {
      const consent = signupConsent(accepted, choices);
      return checked(auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: authReturnUrl(pageUrl), data: consent },
    })); },
    signIn: (email, password) => checked(auth.signInWithPassword({ email: email.trim(), password })),
    resendSignupConfirmation: email => checked(auth.resend({
      type: 'signup', email: email.trim(), options: { emailRedirectTo: authReturnUrl(pageUrl) },
    })),
    signOut: () => checked(auth.signOut({ scope: 'local' })),
    restore: () => checked(auth.getSession()),
    requestRecovery: email => checked(auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authReturnUrl(pageUrl, true),
    })),
    updatePassword: password => checked(auth.updateUser({ password })),
    async completeCallback(currentUrl) {
      const url = new URL(currentUrl);
      const mode = url.searchParams.get('auth');
      if (!['callback', 'recovery'].includes(mode)) return null;
      if (url.searchParams.has('error')) throw new Error('Le lien de connexion a expiré ou a été refusé.');
      const code = url.searchParams.get('code');
      if (!code) return null;
      const data = await checked(auth.exchangeCodeForSession(code));
      url.searchParams.delete('code');
      url.searchParams.delete('auth');
      url.hash = 'profil';
      return { ...data, recovery: mode === 'recovery', cleanUrl: url.href };
    },
    subscribe: listener => {
      // The listener must only update UI state, never await a Supabase request.
      const { data } = auth.onAuthStateChange(listener);
      return () => data.subscription.unsubscribe();
    },
  };
}
