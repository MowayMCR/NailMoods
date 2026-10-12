import { messages } from './messages.js';

export const LOCALES = Object.freeze([
  { code: 'fr', nativeName: 'Français' },
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'nl', nativeName: 'Nederlands' },
]);
export const LOCALE_STORAGE_KEY = 'nm-ui-locale-v1';
export const LOCALE_CHANGE_EVENT = 'nm-ui-locale-change';
let sessionLocale = null;
const supported = new Set(LOCALES.map(({ code }) => code));

export function normalizeLocale(input) {
  const base = String(input || '').trim().replace('_', '-').split('-')[0].toLowerCase();
  return supported.has(base) ? base : null;
}

export function resolveLocale(saved, deviceLanguages = []) {
  const stored = normalizeLocale(saved);
  if (stored) return stored;
  for (const language of deviceLanguages) {
    const candidate = normalizeLocale(language);
    if (candidate) return candidate;
  }
  return 'fr';
}

export function getLocale() {
  if (typeof window === 'undefined') return 'fr';
  let saved = null;
  try { saved = window.localStorage.getItem(LOCALE_STORAGE_KEY); } catch { /* privacy or storage restriction */ }
  return resolveLocale(sessionLocale || saved, window.navigator?.languages || [window.navigator?.language].filter(Boolean));
}

export function setLocale(locale) {
  const next = normalizeLocale(locale);
  if (!next) return false;
  sessionLocale = next;
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* keep current session */ }
    // Do not change html[lang] yet: most screens still contain French.
    // A premature document-level language switch would mislead assistive technologies.
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }
  return true;
}

export function subscribeLocale(listener) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event) => {
    if (event.key === LOCALE_STORAGE_KEY || event.key === null) {
      sessionLocale = null;
      listener();
    }
  };
  window.addEventListener(LOCALE_CHANGE_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function t(key, locale = 'fr', values = {}) {
  const language = normalizeLocale(locale) || 'fr';
  const message = messages[language]?.[key] ?? messages.fr[key] ?? key;
  // Plain text only: React escapes parameters. Never interpret these as HTML.
  return message.replace(/\{(\w+)\}/g, (token, name) => Object.hasOwn(values, name) ? String(values[name]) : token);
}
