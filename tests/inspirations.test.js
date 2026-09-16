import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuggestions } from '../src/creationEngine.js';
import { snapshotIdea, toggleFavorite, readInspirations, findIdea, rememberIdea, createVariants, compositionKey, ideaAvailability, nailDetails, safeProductUrl } from '../src/inspirations.js';

const polishes = ['#703650', '#d89baa', '#cbad9b', '#6a639b', '#a7405b'].map((color, i) => ({ id: 'p' + i, name: 'Couleur ' + i, family: 'Rose', color, type: 'Semi-permanent', usage: 'Couleur seule', finish: 'Brillant', photo: 'data:image/jpeg;base64,largeImage', fav: true }));
const lamp = { id: 'lamp', name: 'Lampe UV', type: 'Matériel', equipmentCategory: 'Lampe UV / LED' };
const sticker = { id: 'sticker', name: 'Lunes dorées', type: 'Matériel', equipmentCategory: 'Stickers / décalcomanies' };
const brush = { id: 'brush', name: 'Pinceau fin', type: 'Matériel', equipmentCategory: 'Pinceau' };
const inventory = [...polishes, lamp, sticker, brush];
const profile = { shape: 'Amande', length: 'Courte', level: 'Intermédiaire', duration: '1 h +' };
const options = { polishCount: 3, duration: 60, level: 1, constraints: ['noDrawing'] };
const source = createSuggestions(inventory, profile, options).results[0];
const empty = () => ({ favorites: [], recent: [], selected: null });

test('a favorite freezes all five nails, products and options without duplicating photos or mutating its source', () => {
  const candidate = structuredClone(source), before = JSON.stringify(candidate);
  const snapshot = snapshotIdea(candidate, options);
  assert.equal(JSON.stringify(candidate), before);
  assert.equal(snapshot.palette.length, 3);
  assert.ok(snapshot.palette.every(item => !('photo' in item)));
  candidate.nails[0].color = '#000000';
  candidate.palette[0].name = 'Edited';
  assert.notEqual(snapshot.nails[0].color, candidate.nails[0].color);
  assert.notEqual(snapshot.palette[0].name, candidate.palette[0].name);
  assert.deepEqual(snapshot.options, options);
  assert.equal(snapshotIdea(source, options).key, snapshot.key, 'stable across repeated opens');
});

test('favorites survive other generations, bounded recent history, reload and explicit removal', () => {
  const saved = snapshotIdea(source, options);
  let library = toggleFavorite(empty(), saved);
  for (let i = 0; i < 20; i++) library = rememberIdea(library, { ...saved, key: 'recent-' + i });
  assert.equal(library.recent.length, 12);
  library.selected = saved;
  const reloaded = readInspirations({ getItem: () => JSON.stringify(library) });
  assert.equal(findIdea(reloaded, saved.key).key, saved.key);
  assert.equal(reloaded.selected.key, saved.key);
  assert.equal(reloaded.favorites.length, 1);
  const removed = toggleFavorite(reloaded, saved);
  assert.equal(removed.favorites.length, 0);
  assert.equal(reloaded.favorites.length, 1, 'updates are immutable');
  assert.ok(findIdea(removed, saved.key), 'removing a favorite does not discard the selected idea');
});

test('a favorite reports deleted, exhausted and modified items while keeping the original recipe', () => {
  const saved = snapshotIdea(source, options), first = saved.palette[0];
  const changed = inventory.filter(item => item.id !== lamp.id).map(item => item.id === first.id ? { ...item, color: '#ffffff', name: 'New name' } : item);
  const statuses = ideaAvailability(saved, changed);
  assert.equal(statuses.find(row => row.item.id === lamp.id).state, 'missing');
  assert.equal(statuses.find(row => row.item.id === first.id).state, 'changed');
  assert.equal(saved.palette[0].name, first.name);
  assert.equal(ideaAvailability(saved, inventory.map(item => ({ ...item, quantity: 0 })))[0].state, 'missing');
  assert.ok(ideaAvailability(saved, inventory.map(item => ({ ...item, photo: 'replacement', fav: false }))).every(row => row.state === 'available'), 'photos and collection hearts do not change the recipe');
});

for (const count of [1, 2, 3, 4, 5]) test('variants use exactly ' + count + ' owned colors, preserve constraints and differ from the saved composition', () => {
  const opts = { ...options, polishCount: count };
  const idea = snapshotIdea(createSuggestions(inventory, profile, opts).results[0], opts);
  const before = JSON.stringify(idea);
  const variants = createVariants(idea, inventory, profile, 3);
  assert.ok(variants.length > 0 && variants.length <= 3);
  assert.equal(new Set(variants.map(compositionKey)).size, variants.length);
  for (const variant of variants) {
    assert.notEqual(compositionKey(variant), compositionKey(idea));
    assert.equal(variant.palette.length, count);
    assert.equal(new Set(variant.nails.flatMap(nail => [nail.productId, nail.accentProductId]).filter(id => id != null)).size, count);
    assert.ok(variant.palette.every(item => polishes.some(owned => owned.id === item.id)));
    assert.ok(variant.nails.every(nail => !nail.drawing));
    assert.ok(variant.minutes <= opts.duration && variant.rank <= opts.level);
    assert.equal(variant.shape, idea.shape);
    assert.equal(variant.options.polishCount, count);
    assert.ok(variant.resources.some(item => item.id === lamp.id));
  }
  assert.equal(JSON.stringify(idea), before);
});

test('variants cannot use removed tools or invent enough polishes to replace an incomplete collection', () => {
  const idea = snapshotIdea(source, options);
  assert.equal(createVariants(idea, polishes, profile).length, 0, 'missing lamp');
  assert.equal(createVariants(idea, [polishes[0], lamp], profile).length, 0, 'not enough colors');
  const one = snapshotIdea(createSuggestions([polishes[0], lamp], profile, { polishCount: 1 }).results[0], { polishCount: 1 });
  assert.equal(createVariants(one, [polishes[0], lamp], profile).length, 0, 'one solid manicure cannot be regenerated into fake variants');
});

test('per-nail details match the drawn base, accent and sticker for every finger', () => {
  const candidates = createSuggestions(inventory, profile, { polishCount: 2, level: 1, duration: 90 }, 1, 24).results;
  const french = candidates.find(idea => idea.pattern === 'french');
  assert.ok(french);
  for (let i = 0; i < 5; i++) {
    const details = nailDetails(french, i);
    assert.equal(details[0].item.id, french.nails[i].productId);
    assert.equal(details[1].item.id, french.nails[i].accentProductId);
    assert.equal(details[1].label, 'Pointes de la French');
  }
  const decorated = createSuggestions(inventory, profile, { polishCount: 1, duration: 90 }, 1, 24).results.find(idea => idea.pattern === 'sticker');
  assert.ok(decorated);
  for (let i = 0; i < 5; i++) assert.equal(nailDetails(decorated, i).some(detail => detail.item.id === sticker.id), Boolean(decorated.nails[i].decoration));
});

test('malformed saved cards and unsafe product URLs are rejected without blocking the other favorites', () => {
  const saved = snapshotIdea(source, options);
  for (const broken of ['{', 'null', '42']) assert.deepEqual(readInspirations({ getItem: () => broken }), empty());
  const recovered = readInspirations({ getItem: () => JSON.stringify({ favorites: [saved, { key: 'broken' }, { ...saved, nails: [] }], selected: 'bad', recent: null }) });
  assert.equal(recovered.favorites.length, 1);
  assert.equal(recovered.selected, null);
  assert.equal(safeProductUrl('javascript:alert(1)'), null);
  assert.equal(safeProductUrl('data:text/html,hi'), null);
  assert.equal(safeProductUrl('https://example.com/product'), 'https://example.com/product');
});
