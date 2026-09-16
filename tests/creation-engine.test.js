import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuggestions, profileDefaults, inventoryStamp, stickerAppearance } from '../src/creationEngine.js';

const color = (id, name, hex, extra = {}) => ({ id, name, color: hex, family: 'Prune', type: 'Semi-permanent', finish: 'Brillant', effect: 'Aucun', usage: 'Couleur seule', ...extra });
const gear = (id, name, equipmentCategory) => ({ id, name, type: 'Matériel', equipmentCategory, quantity: 1 });
const plum = color('plum', 'Prune foncée', '#703650', { fav: true });
const latte = color('latte', 'Latte', '#805b4c', { family: 'Brun' });
const lamp = gear('lamp', 'Lampe LED', 'Lampe UV / LED');
const sticker = { ...gear('sticker', 'Étoiles dorées', 'Stickers / décalcomanies'), materialStyle: 'Doré · étoiles' };
const dotting = gear('dotting', 'Mon dotting tool', 'Dotting tool');
const brush = gear('brush', 'Pinceau fin', 'Pinceau');
const inventory = [plum, latte, lamp, sticker, dotting, brush];
const profile = { shape: 'Ronde', length: 'Courte', level: 'Débutante +', duration: '30–45 min', styles: ['Witchy'], technique: 'Semi-permanent' };

test('profile defaults preserve saved shape, skill, style and duration without mutation', () => {
  const before = JSON.stringify(profile);
  assert.deepEqual(profileDefaults(profile), { mode: 'usual', surprise: 'Safe', mood: 'Chic', style: 'Witchy', occasion: 'Tous les jours', duration: 45, level: 0, constraints: [] });
  assert.equal(profileDefaults({ duration: '1 h +' }).duration, 90);
  assert.equal(profileDefaults({ duration: '15 min max' }).duration, 15);
  assert.equal(JSON.stringify(profile), before);
});

test('semi-permanent without lamp is blocked; classic polish still works', () => {
  const result = createSuggestions([plum, latte], profile);
  assert.equal(result.results.length, 0);
  assert.ok(result.blocked.every(entry => /Lampe/.test(entry.reason)));
  const classic = color('classic', 'Rose classique', '#d08090', { type: 'Vernis' });
  const mixed = createSuggestions([plum, classic], profile);
  assert.equal(mixed.results.length, 1);
  assert.equal(mixed.results[0].palette[0].id, 'classic');
});

test('four unique previews reference owned products and resources', () => {
  const before = JSON.stringify(inventory);
  const result = createSuggestions(inventory, profile);
  assert.equal(result.results.length, 4);
  assert.equal(new Set(result.results.map(idea => JSON.stringify(idea.nails))).size, 4);
  for (const idea of result.results) {
    assert.equal(idea.nails.length, 5);
    assert.ok(idea.minutes <= 45);
    assert.ok(idea.rank <= 0);
    assert.equal(idea.shape, 'Ronde');
    assert.ok([...idea.palette, ...idea.resources].every(item => inventory.some(owned => owned.id === item.id)));
    assert.ok(idea.resources.some(item => item.id === lamp.id));
  }
  assert.ok(result.results.some(idea => idea.pattern === 'sticker'));
  assert.equal(JSON.stringify(inventory), before);
});

test('one color cannot produce four invented variants', () => {
  assert.equal(createSuggestions([plum, lamp], profile).results.length, 1);
});

test('all surprise levels keep skill, time and equipment constraints', () => {
  const limited = [plum, latte, lamp, sticker];
  for (const surprise of ['Safe', 'Creative', 'Chaos']) for (let seed = 1; seed <= 30; seed++) {
    const result = createSuggestions(limited, profile, { mode: 'surprise', surprise, level: 2, duration: 30, constraints: ['noStickers', 'noDrawing'] }, seed);
    assert.ok(result.results.every(idea => idea.minutes <= 30 && ['solid', 'accent', 'duo'].includes(idea.pattern)));
    assert.ok(result.results.every(idea => idea.resources.every(item => limited.some(owned => owned.id === item.id))));
  }
});

test('drawing requires a specifically identified fine brush or dotting tool', () => {
  const basic = [plum, latte, lamp, gear('wide-brush', 'Pinceau plat', 'Pinceau')];
  for (let seed = 1; seed <= 20; seed++) {
    const result = createSuggestions(basic, profile, { mode: 'surprise', surprise: 'Chaos', level: 2, duration: 60 }, seed);
    assert.ok(result.results.every(idea => !['french', 'dots', 'line'].includes(idea.pattern)));
  }
  const patterns = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    const result = createSuggestions(inventory, profile, { mode: 'surprise', surprise: 'Chaos', level: 2, duration: 60 }, seed);
    for (const idea of result.results) { patterns.add(idea.pattern); if (['french', 'line'].includes(idea.pattern)) assert.ok(idea.resources.some(item => item.id === brush.id)); }
  }
  assert.ok(patterns.has('french') || patterns.has('line'));
  assert.ok(patterns.has('dots'));
});

test('cat-eye requires a magnet and layers are not presented as stand-alone colors', () => {
  const magnetic = color('cat', 'Cat-eye', '#552b67', { finish: 'Cat-eye' });
  assert.equal(createSuggestions([magnetic, lamp], profile).results.length, 0);
  const magnet = gear('magnet', 'Aimant', 'Aimant cat-eye');
  assert.ok(createSuggestions([magnetic, lamp, magnet], profile).results[0].resources.some(item => item.id === magnet.id));
  const effect = color('effect', 'Galactic Sparkle', '#777777', { type: 'Effet', usage: 'Sur une couleur de base' });
  const result = createSuggestions([effect, lamp, plum], profile);
  assert.equal(result.effects.length, 1);
  assert.ok(result.results.every(idea => idea.palette.every(item => item.id !== effect.id)));
});

test('favorite-only, no-lamp and no-sticker choices constrain actual recipes', () => {
  const onlyFavorites = createSuggestions(inventory, profile, { constraints: ['favorites', 'noStickers'] });
  assert.equal(onlyFavorites.results.length, 1);
  assert.ok(onlyFavorites.results.every(idea => idea.palette.every(item => item.fav)));
  assert.equal(createSuggestions(inventory, profile, { constraints: ['noLamp'] }).results.length, 0);
});

test('different product technologies are not combined in a layered recipe', () => {
  const classic = color('classic', 'Rose', '#f08090', { type: 'Vernis' });
  const gel = color('gel', 'Gel bleu', '#2080a0', { type: 'Gel' });
  const result = createSuggestions([...inventory, classic, gel], profile, { level: 2, duration: 90 });
  assert.ok(result.results.every(idea => new Set(idea.palette.map(item => item.type)).size === 1));
});

test('top coats are resources, never a pink default color', () => {
  const top = color('top', 'Top coat', '#db7897');
  const needsTop = { ...plum, usage: 'Avec top coat' };
  assert.equal(createSuggestions([needsTop, lamp], profile).results.length, 0);
  const result = createSuggestions([needsTop, lamp, top], profile);
  assert.equal(result.results.length, 1);
  assert.deepEqual(result.results[0].palette.map(item => item.id), ['plum']);
  assert.ok(result.results[0].resources.some(item => item.id === 'top'));
});

test('collection edits invalidate saved ideas while photos do not alter feasibility', () => {
  assert.notEqual(inventoryStamp(inventory), inventoryStamp(inventory.filter(item => item.id !== lamp.id)));
  assert.equal(inventoryStamp(inventory), inventoryStamp(inventory.map(item => ({ ...item, photo: 'data:image/jpeg;base64,example' }))));
  assert.equal(stickerAppearance(sticker).motif, 'star');
  assert.equal(stickerAppearance({ name: 'Stickers argentés lunes' }).motif, 'moon');
});

test('changing mood and mode affects ranking with a suitable palette', () => {
  const red = color('red', 'Rouge', '#df2030', { type: 'Vernis', family: 'Rouge' });
  const nude = color('nude', 'Nude', '#deb7a0', { type: 'Vernis', family: 'Nude', fav: true });
  const stock = [red, nude];
  const familiar = createSuggestions(stock, {}, { style: 'Libre', mood: 'Douce', mode: 'usual' });
  const changed = createSuggestions(stock, {}, { style: 'Libre', mood: 'Audacieuse', mode: 'change' });
  assert.equal(familiar.results[0].palette[0].id, 'nude');
  assert.equal(changed.results[0].palette[0].id, 'red');
});
