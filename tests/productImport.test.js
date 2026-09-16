import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { productURL, shopifyURL, imageURL, shopifyCandidate, inferTraits, fetchProduct, readResponse, validBarcode, barcodeMatches, lookupBarcode, textMatches } from '../src/productImport.js';
import { sampleColor, photoPalette, describeColor, validHex } from '../src/colorAnalysis.js';
import { createSuggestions } from '../src/creationEngine.js';
import { snapshotIdea } from '../src/inspirations.js';
const plum = JSON.parse(readFileSync(new URL('./fixtures/product-plum.json', import.meta.url)));
const url = 'https://leminimacaron.eu/products/dark-plum-gel-polish?variant=39613396615273';

test('product links preserve locale and selected variant, remove tracking, reject executable/private URLs', () => {
  assert.equal(shopifyURL('https://leminimacaron.eu/fr/collections/gel/products/dark-plum-gel-polish?variant=1'), 'https://leminimacaron.eu/fr/products/dark-plum-gel-polish.js');
  assert.equal(productURL(url + '&utm_source=test#photo').href, url);
  for (const value of ['javascript:alert(1)', 'data:text/html,hi', 'file:///test', 'https://me:secret@shop.example/product', 'https://localhost/test', 'https://127.0.0.1/test', 'https://[fe80::1]/', 'https://shop.example:8080/x']) assert.throws(() => productURL(value));
  assert.equal(imageURL('//cdn.shopify.com/photo.jpg', url), 'https://cdn.shopify.com/photo.jpg');
  assert.equal(imageURL('javascript:alert(1)', url), '');
});

test('real shop fixture returns the photo, name, variant and explicit finish without inventing a hex', () => {
  const result = shopifyCandidate(plum, url);
  assert.equal(result.fields.name, 'Dark Plum - Gel Polish');
  assert.equal(result.fields.type, 'Semi-permanent');
  assert.equal(result.fields.finish, 'Nacré');
  assert.equal(result.fields.effect, 'Irisé');
  assert.equal(result.fields.barcode, '3760297541507');
  assert.ok(result.fields.photo.startsWith('https://cdn.shopify.com/'));
  assert.equal(result.fields.color, undefined);
  assert.equal(result.variantId, '39613396615273');
  assert.equal(result.needsVariant, false);
});

test('multiple variants require a choice; a stale variant never silently imports another shade', () => {
  const raw = { ...plum, variants: [{ id: 1, title: 'Rose', barcode: '3760297541507', featured_image: { src: 'https://shop.example/rose.jpg' } }, { id: 2, title: 'Bleu', featured_image: { src: 'https://shop.example/bleu.jpg' } }] };
  const noChoice = shopifyCandidate(raw, url.split('?')[0]);
  assert.equal(noChoice.needsVariant, true); assert.equal(noChoice.variantId, ''); assert.equal(noChoice.fields.barcode, undefined);
  const stale = shopifyCandidate(raw, url); assert.equal(stale.variantId, ''); assert.equal(stale.needsVariant, true);
  const selected = shopifyCandidate(raw, url, '2');
  assert.equal(selected.fields.name, 'Dark Plum - Gel Polish · Bleu'); assert.equal(selected.fields.photo, 'https://shop.example/bleu.jpg'); assert.equal(selected.variantId, '2');
});

test('material and effect suggestions use product-specific evidence, not accessories mentioned in descriptions', () => {
  assert.equal(inferTraits('Lampe LED', 'Gel nail polish').type, 'Matériel');
  assert.equal(inferTraits('Stickers étoiles').equipmentCategory, 'Stickers / décalcomanies');
  assert.equal(inferTraits('Lime 180').equipmentCategory, 'Lime / polissoir');
  assert.equal(inferTraits('Velvet - Cat Eye Gel Polish').usage, 'Avec aimant');
  assert.equal(inferTraits('Mirror Mirror - Chrome Powder Pen').type, 'Effet');
  assert.deepEqual(inferTraits('Kit manucure avec lampe LED'), {});
  const candidate = shopifyCandidate({ ...plum, tags: [], description: 'Use with our matte top coat and a magnetic tool.' }, url);
  assert.equal(candidate.fields.finish, undefined); assert.equal(candidate.fields.effect, undefined);
});

test('fetching omits credentials, is abortable and rejects blocked/oversized or malformed pages', async () => {
  const controller = new AbortController(); let received;
  const result = await fetchProduct(url, controller.signal, async (endpoint, options) => { received = { endpoint, options }; return new Response(JSON.stringify(plum)); });
  assert.equal(result.fields.barcode, '3760297541507');
  assert.equal(received.options.credentials, 'omit'); assert.equal(received.options.signal, controller.signal); assert.equal(received.options.referrerPolicy, 'no-referrer');
  await assert.rejects(fetchProduct(url, controller.signal, async () => new Response('blocked', { status: 403 })));
  await assert.rejects(fetchProduct(url, controller.signal, async () => new Response('<script>bad()</script>')), /boutique/);
  await assert.rejects(readResponse(new Response('123456'), 5), /volumineuse/);
  await assert.rejects(readResponse(new Response('x', { headers: { 'content-length': '9999999' } })), /volumineuse/);
});

test('EAN/UPC check digits and zero padding avoid invalid or approximate barcode matches', () => {
  assert.equal(validBarcode('3760297541507'), true); assert.equal(validBarcode('0 36000 29145 2'), true);
  for (const value of ['123', '3760297541508', 'hello', '3760297541507<script>']) assert.equal(validBarcode(value), false);
  const catalog = [{ handle: 'a', variants: [{ id: '1', sku: '036000291452' }, { id: '2', sku: '3760297541507' }] }];
  assert.equal(barcodeMatches(catalog, '0036000291452').length, 1);
  assert.equal(barcodeMatches(catalog, '3760297541508').length, 0);
});

test('barcode catalog SKU is only a hint; the actual product barcode must confirm it', async () => {
  const catalog = [{ id: 1, handle: 'dark-plum-gel-polish', variants: [{ id: 39613396615273, sku: '3760297541507' }] }];
  const fetcher = async endpoint => new Response(JSON.stringify(endpoint.includes('products.json') ? { products: catalog } : plum));
  const result = await lookupBarcode('3760297541507', undefined, fetcher);
  assert.equal(result.method, 'barcode'); assert.equal(result.fields.barcode, '3760297541507');
  await assert.rejects(lookupBarcode('3760297541507', undefined, async () => new Response(JSON.stringify({ ...plum, variants: [{ id: 39613396615273, sku: '3760297541507', barcode: '036000291452' }] }))), /Aucune référence/);
});

test('label matching needs the complete shade name and returns choices instead of an invented product', () => {
  const catalog = ['Dark Plum - Gel Polish', 'Plum Blossom - Gel Polish', 'Latte - Gel Polish'].map((title, id) => ({ id, title, variants: [{ requires_shipping: true }] }));
  assert.equal(textMatches(catalog, 'LE MINI MACARON\nDARK PLUM\nGel Polish')[0].id, 0);
  assert.equal(textMatches(catalog, 'dark').length, 0);
  assert.equal(textMatches(catalog, 'Plum').length, 0);
  assert.equal(textMatches(catalog, 'Dark Plum et Latte').length, 2);
});

function pixelImage(width, height, color) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let at = 0; at < data.length; at += 4) data.set([...color, 255], at);
  return { data, width, height };
}
test('photo sampling retains real pixels, resists a specular highlight, clamps edges and rejects transparency', () => {
  const image = pixelImage(5, 5, [82, 27, 105]); image.data.set([255, 255, 255, 255], 48);
  assert.equal(sampleColor(image, 2, 2), '#521b69'); assert.equal(sampleColor(image, -100, 900), '#521b69');
  assert.ok(photoPalette(image).includes('#521b69'));
  image.data.fill(0); assert.throws(() => sampleColor(image, 0, 0));
  assert.equal(validHex('#abcd'), false); assert.equal(describeColor('#521B69').color, '#521b69');
});

test('new previews use the sampled hex and keep previous favorites unchanged', () => {
  const item = { id: 'polish', name: 'Ma couleur', type: 'Vernis', family: 'Violet', color: '#735b91', finish: 'Brillant', usage: 'Couleur seule' };
  const before = snapshotIdea(createSuggestions([item], {}, { polishCount: 1 }).results[0]);
  const precise = { ...item, ...describeColor('#521b69'), colorSource: 'photo' };
  const next = createSuggestions([precise], {}, { polishCount: 1 }).results[0];
  assert.ok(next.nails.every(nail => nail.color === '#521b69'));
  assert.ok(before.nails.every(nail => nail.color === '#735b91'));
});
