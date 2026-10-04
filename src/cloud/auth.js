import {parseAuthCallback} from './authCallback.js';
import { authReturnUrl } from './config.js';
import { signupConsent } from '../privacy/policy.js';

// No profile/workspace inserts here: the existing backend trigger owns signup.
// No user-editable account tier, no logging of SDK errors or credentials.
export function createAuthService(client, pageUrl, {returnUrl = recovery => authReturnUrl(pageUrl,recovery), validateCallback = value => {try{const u=new URL(value),base=new URL(pageUrl);return u.origin===base.origin&&u.pathname===base.pathname&&!u.username&&!u.password;}catch{return false;}}} = {}) {
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
      options: { emailRedirectTo: returnUrl(false), data: consent },
    })); },
    signIn: (email, password) => checked(auth.signInWithPassword({ email: email.trim(), password })),
    resendSignupConfirmation: email => checked(auth.resend({
      type: 'signup', email: email.trim(), options: { emailRedirectTo: returnUrl(false) },
    })),
    signOut: () => checked(auth.signOut({ scope: 'local' })),
    restore: () => checked(auth.getSession()),
    requestRecovery: email => checked(auth.resetPasswordForEmail(email.trim(), {
      redirectTo: returnUrl(true),
    })),
    updatePassword: password => checked(auth.updateUser({ password })),
    async completeCallback(currentUrl) {
      if (!validateCallback(currentUrl)) return null;
      const parsed=parseAuthCallback(currentUrl);
      if(!parsed)return null;
      if(parsed.error)throw Object.assign(new Error('Ce lien a expiré ou a déjà été utilisé. Demande un nouvel e-mail de confirmation.'),{code:'callback_expired'});
      let data;
      try {
        if(parsed.code)data=await checked(auth.exchangeCodeForSession(parsed.code));
        else if(parsed.tokenHash)data=await checked(auth.verifyOtp({token_hash:parsed.tokenHash,type:parsed.type}));
        else data=await checked(auth.setSession({access_token:parsed.access,refresh_token:parsed.refresh}));
      } catch(error) {
        throw Object.assign(new Error('Ce lien ne peut plus être utilisé. Demande un nouveau lien depuis cette application et ouvre-le sur le même appareil.'),{code:error?.code==='otp_expired'?'callback_expired':'callback_failed'});
      }
      if(!data?.session)throw Object.assign(new Error('La session n’a pas pu être restaurée.'),{code:'callback_failed'});
      return {...data,recovery:parsed.mode==='recovery',cleanUrl:parsed.cleanUrl};
    },
    subscribe: listener => {
      // The listener must only update UI state, never await a Supabase request.
      const { data } = auth.onAuthStateChange(listener);
      return () => data.subscription.unsubscribe();
    },
  };
}
