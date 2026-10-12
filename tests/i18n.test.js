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

import {formatDate, formatMoney, formatNumber, purchasePrice} from '../src/i18n/format.js';
test('locale formatting does not change transaction currency or store prices', () => {
  assert.match(formatNumber(1234.5, 'de'), /1\.234,5/);
  assert.match(formatMoney(4.99, 'EUR', 'nl'), /4,99/);
  assert.equal(purchasePrice({localizedPrice:'CHF 4.50', price:4.5, currency:'CHF'}, 'fr'), 'CHF 4.50');
  assert.throws(() => formatMoney(5, null, 'en'), /currency/);
  assert.equal(formatDate('invalid', 'it'), '');
  for (const {code} of LOCALES) assert.ok(formatDate('2026-10-12T12:00:00Z', code, {timeZone:'UTC'}));
});

test('session language survives blocked storage without touching application data', async () => {
  const oldWindow = globalThis.window;
  const fake = new EventTarget();
  fake.localStorage = {getItem:()=>{throw Error('blocked')}, setItem:()=>{throw Error('blocked')}};
  fake.navigator = {languages:['de-DE']};
  globalThis.window = fake;
  const {getLocale, setLocale, subscribeLocale} = await import('../src/i18n/locale.js');
  let changes = 0;
  const dispose = subscribeLocale(()=>changes++);
  try {
    assert.equal(getLocale(), 'de');
    assert.equal(setLocale('it'), true);
    assert.equal(getLocale(), 'it');
    assert.equal(changes, 1);
    assert.equal(setLocale('unsupported'), false);
    assert.equal(getLocale(), 'it');
    const clear = new Event('storage');
    Object.defineProperty(clear, 'key', {value:null});
    fake.dispatchEvent(clear);
    assert.equal(getLocale(), 'de');
  } finally {dispose(); globalThis.window = oldWindow;}
});
