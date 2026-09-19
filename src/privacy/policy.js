// Bump versions only alongside archived documents and the server policy migration.
export const TERMS_VERSION = '0.1-beta';
export const PRIVACY_VERSION = '0.1-beta';
export const GUEST_CONSENT_KEY = 'nm-privacy-guest-v1';
// No vendor is selected. No optional SDK, pixel or advertisement is loaded.
export const TECHNOLOGIES = Object.freeze({ analytics: false, ads: false, personalizedAds: false });
export const DENIED = Object.freeze({ analytics_consent: false, ads_consent: false, personalized_ads_consent: false });
export function normalizeChoices(value = {}) {
  return {
    analytics_consent: value.analytics_consent === true,
    ads_consent: value.ads_consent === true,
    personalized_ads_consent: value.ads_consent === true && value.personalized_ads_consent === true,
  };
}
export function availableChoices(value, technologies = TECHNOLOGIES) {
  const choices = normalizeChoices(value);
  return normalizeChoices({
    analytics_consent: technologies.analytics && choices.analytics_consent,
    ads_consent: technologies.ads && choices.ads_consent,
    personalized_ads_consent: technologies.personalizedAds && choices.personalized_ads_consent,
  });
}
export function permissions({ tier, workspaceKind = 'personal', consent, technologies = TECHNOLOGIES, screen }) {
  const current = consent?.privacy_version === PRIVACY_VERSION ? availableChoices(consent, technologies) : DENIED;
  const advertisingSpace = tier === 'free' && workspaceKind === 'personal' && ['home', 'inspirations'].includes(screen);
  return { analytics: current.analytics_consent, ads: advertisingSpace && current.ads_consent,
    personalizedAds: advertisingSpace && current.ads_consent && current.personalized_ads_consent };
}
// Deliberately accepts no collection, journal, image, message, mood or preference data.
export function advertisingContext({ tier, workspaceKind, consent, screen }) {
  return { allowed: permissions({ tier, workspaceKind, consent, screen }).ads, placement: ['home', 'inspirations'].includes(screen) ? screen : null };
}
export function readGuestConsent(storage) {
  try { const value = JSON.parse(storage.getItem(GUEST_CONSENT_KEY));
    return value?.privacy_version === PRIVACY_VERSION ? { ...availableChoices(value), privacy_version: PRIVACY_VERSION, consent_updated_at: value.consent_updated_at } : null;
  } catch { return null; }
}
export function signupConsent(accepted, guestChoices, adultConfirmed = false) {
  if (accepted !== true) throw new Error('Accepte les Conditions d’utilisation pour créer ton compte.');
  if (adultConfirmed !== true) throw new Error('La bêta NailMoods est réservée aux personnes de 18 ans et plus.');
  return { adult_confirmed: true, terms_accepted: true, terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION, ...availableChoices(guestChoices) };
}
