import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, normalizeLocale, resolveLocale, t } from '../src/i18n/locale.js';
import { messages } from '../src/i18n/messages.js';

test('six expected languages and regional language variants are supported', () => {
  assert.deepEqual(LOCALES.map(x => x.code), ['fr', 'en', 'es', 'de', 'it', 'nl']);
  assert.equal(normalizeLocale('de-CH'), 'de');
  assert.equal(normalizeLocale('es_ES'), 'es');
  assert.equal(normalizeLocale('pt-BR'), null);
});
test('saved locale wins over device preferences, with French fallback', () => {
  assert.equal(resolveLocale('es', ['en-US']), 'es');
  assert.equal(resolveLocale('unknown', ['nl-BE', 'en-US']), 'nl');
  assert.equal(resolveLocale('', ['pt-BR', 'xx']), 'fr');
});
test('every pilot translation key exists in every supported locale', () => {
  const keys = Object.keys(messages.fr);
  for (const locale of LOCALES) {
    assert.deepEqual(Object.keys(messages[locale.code]).sort(), [...keys].sort());
    for (const key of keys) assert.ok(t(key, locale.code)?.trim(), `${locale.code} / ${key}`);
  }
  assert.equal(t('nav.home', 'en-US'), 'Home');
  assert.equal(t('nonexistent.key', 'de'), 'nonexistent.key');
});
