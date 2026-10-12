import {normalizeLocale} from './locale.js';

const regions = Object.freeze({fr:'fr-FR', en:'en-IE', es:'es-ES', de:'de-DE', it:'it-IT', nl:'nl-NL'});
export function formatLocale(locale) { return regions[normalizeLocale(locale) || 'fr']; }
export function formatNumber(value, locale, options = {}) {
  return new Intl.NumberFormat(formatLocale(locale), options).format(value);
}
export function formatDate(value, locale, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(formatLocale(locale), options).format(date);
}
// The currency is required from verified purchase metadata, never inferred from UI language.
export function formatMoney(value, currency, locale) {
  if (!/^[A-Z]{3}$/.test(currency || '')) throw new TypeError('ISO currency required');
  return formatNumber(value, locale, {style:'currency', currency});
}
// Store-supplied formatted prices take precedence, including territory and tax handling.
export function purchasePrice(product, locale) {
  if (product?.localizedPrice) return product.localizedPrice;
  if (!Number.isFinite(product?.price)) return '';
  return formatMoney(product.price, product.currency, locale);
}
