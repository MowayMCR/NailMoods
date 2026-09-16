import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuggestions, normalizePolishCount } from '../src/creationEngine.js';

const polishes = ['#713750', '#d8b1b8', '#d5bdad', '#7b609d', '#485ca0'].map((color, index) => ({
  id: 'polish-' + index, name: 'Vernis ' + (index + 1), type: 'Semi-permanent', color,
  family: ['Prune', 'Rose', 'Nude', 'Violet', 'Bleu'][index], usage: 'Couleur seule', finish: 'Brillant', fav: index < 2,
}));
const lamp = { id: 'lamp', type: 'Matériel', name: 'Ma lampe', equipmentCategory: 'Lampe UV / LED', quantity: 1 };
const sticker = { id: 'stickers', type: 'Matériel', name: 'Stickers lunes', equipmentCategory: 'Stickers / décalcomanies', quantity: 1 };
const inventory = [...polishes, lamp, sticker];
const profile = { level: 'Débutante +', duration: '30–45 min', styles: ['Witchy'] };
const usedPolishes = idea => new Set(idea.nails.flatMap(nail => [nail.productId, nail.accentProductId]).filter(Boolean));

for (const polishCount of [1, 2, 3, 4, 5]) test('exactly ' + polishCount + ' owned polishes are used, including in the preview', () => {
  const before = JSON.stringify(inventory);
  const report = createSuggestions(inventory, profile, { polishCount });
  assert.equal(report.results.length, 4);
  for (const idea of report.results) {
    assert.equal(idea.polishCount, polishCount);
    assert.equal(idea.palette.length, polishCount);
    assert.equal(usedPolishes(idea).size, polishCount);
    assert.deepEqual([...usedPolishes(idea)].sort(), idea.palette.map(item => item.id).sort());
    assert.ok(idea.palette.every(item => polishes.some(owned => owned.id === item.id)));
    assert.ok(idea.nails.every(nail => polishes.find(item => item.id === nail.productId).color === nail.color));
    assert.ok(idea.minutes <= 45 && idea.rank === 0);
    assert.ok(idea.resources.some(item => item.id === lamp.id));
    assert.ok(idea.title && idea.description && !idea.description.includes('undefined'));
  }
  assert.equal(new Set(report.results.map(idea => JSON.stringify(idea.nails))).size, 4);
  assert.equal(JSON.stringify(inventory), before, 'Inventory is not modified');
});

test('an unavailable exact count is explained without silently falling back', () => {
  const report = createSuggestions([...polishes.slice(0, 2), lamp, sticker], profile, { polishCount: 5 });
  assert.equal(report.results.length, 0);
  assert.equal(report.countUnavailable, true);
  assert.equal(report.maxPolishCount, 2);
  assert.equal(report.requestedPolishCount, 5);
});

test('classic and semi-permanent groups are not combined to reach a requested number', () => {
  const mixed = [...polishes.slice(0, 3), ...polishes.slice(3).map(item => ({ ...item, type: 'Vernis' })), lamp];
  const blocked = createSuggestions(mixed, profile, { polishCount: 5 });
  assert.equal(blocked.results.length, 0);
  assert.equal(blocked.maxPolishCount, 3);
  const possible = createSuggestions(mixed, profile, { polishCount: 3 });
  assert.equal(possible.results.length, 4);
  assert.ok(possible.results.every(idea => idea.palette.every(item => item.type === 'Semi-permanent')));
});

test('favorites and time limits still constrain a multi-polish choice', () => {
  const favorites = createSuggestions(inventory, profile, { polishCount: 3, constraints: ['favorites'] });
  assert.equal(favorites.countUnavailable, true);
  assert.equal(favorites.maxPolishCount, 2);
  assert.equal(favorites.results.length, 0);
  const time = createSuggestions(inventory, profile, { polishCount: 5, duration: 30 });
  assert.equal(time.results.length, 0);
  assert.equal(time.countUnavailable, false, 'The available count is sufficient; time is the obstacle');
});

test('multi-polish palettes retain cat-eye and top coat dependencies', () => {
  const magnetic = { ...polishes[0], finish: 'Cat-eye' };
  assert.equal(createSuggestions([magnetic, ...polishes.slice(1), lamp], profile, { polishCount: 5 }).results.length, 0);
  const magnet = { id: 'magnet', name: 'Mon aimant', type: 'Matériel', equipmentCategory: 'Aimant cat-eye' };
  const topCoat = { ...polishes[0], id: 'top', name: 'Top coat' };
  const needsTop = { ...polishes[1], usage: 'Avec top coat' };
  const report = createSuggestions([magnetic, needsTop, ...polishes.slice(2), lamp, magnet, topCoat], profile, { polishCount: 5 });
  assert.equal(report.results.length, 4);
  assert.ok(report.results.every(idea => {
    const resources = idea.resources.map(item => item.id);
    return resources.includes('lamp') && resources.includes('magnet') && resources.includes('top') && idea.palette.length === 5 && !idea.palette.some(item => item.id === 'top');
  }));
});

test('stickers do not count as a polish and do not need a drawing tool', () => {
  let decorated;
  for (let seed = 1; seed <= 12 && !decorated; seed++) {
    decorated = createSuggestions(inventory, profile, { polishCount: 3, duration: 60, constraints: ['noDrawing'], mode: 'surprise', surprise: 'Creative' }, seed).results.find(idea => idea.pattern === 'paletteSticker');
  }
  assert.ok(decorated);
  assert.equal(decorated.palette.length, 3);
  assert.equal(usedPolishes(decorated).size, 3);
  assert.ok(decorated.resources.some(item => item.id === sticker.id));
  assert.ok(decorated.nails.some(nail => nail.decoration?.motif === 'moon'));
  assert.ok(decorated.nails.every(nail => !nail.drawing));
});

test('automatic can include larger palettes; surprise never changes an explicit count', () => {
  const automatic = createSuggestions(inventory, profile, { mode: 'surprise', surprise: 'Creative', duration: 60, polishCount: 'auto' });
  assert.ok(automatic.results.some(idea => idea.polishCount > 2));
  assert.ok(automatic.results.every(idea => idea.polishCount >= 1 && idea.polishCount <= 5));
  for (const surprise of ['Safe', 'Creative', 'Chaos']) {
    const explicit = createSuggestions(inventory, profile, { mode: 'surprise', surprise, polishCount: 4, duration: 60 });
    assert.ok(explicit.results.length > 0);
    assert.ok(explicit.results.every(idea => idea.polishCount === 4));
  }
});

test('product references sharing a provisional family swatch can still be combined', () => {
  const sameSwatch = polishes.map(item => ({ ...item, color: '#713750', family: 'Prune' }));
  const report = createSuggestions([...sameSwatch, lamp], profile, { polishCount: 5 });
  assert.equal(report.results.length, 4);
  assert.ok(report.results.every(idea => new Set(idea.palette.map(item => item.id)).size === 5));
});

test('legacy, missing and malformed preferences use automatic; numeric choices survive serialization', () => {
  for (const value of [undefined, null, 'auto', 'any', 0, 6, -1, 2.5, true, false, {}, []]) assert.equal(normalizePolishCount(value), 'auto');
  for (const value of [1, 2, 3, 4, 5, '3', '5']) assert.equal(normalizePolishCount(value), Number(value));
});
