import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuggestions, inventoryTools, stickerAppearance } from '../src/creationEngine.js';
import { decorationChoice, isDecoration } from '../src/decorations.js';
import { nailDetails, snapshotIdea, createVariants } from '../src/inspirations.js';
import { buildTutorial, newTutorial } from '../src/tutorial.js';
import { newJournalEntry } from '../src/journal.js';

const polishes = ['#562639', '#17253c', '#805b4c', '#703650', '#c73e46'].map((shade, id) => ({ id: 'p' + id, name: 'Vernis ' + id, type: 'Vernis', family: 'Prune', shade, color: '#735b91', usage: 'Couleur seule', finish: 'Brillant' }));
const leaves = { id: 'leaves', name: 'Feuilles automnale', type: 'Matériel', equipmentCategory: 'Strass / décorations', materialStyle: 'Feuille couleur d’automne', quantity: 1, photo: 'data:image/png;base64,photo' };
const lines = { ...leaves, id: 'lines', name: 'Lignes dorées', materialStyle: 'Doré, lignes' };
const stars = { ...leaves, id: 'stars', name: 'Étoile et Lune', equipmentCategory: 'Stickers / décalcomanies', materialStyle: 'Argenté rouge, cœur lune soleil déco' };
const inventory = [...polishes, leaves, lines, stars];
const options = { decorations: 'with', decorationId: leaves.id, duration: 60, level: 0, constraints: ['noDrawing'] };

test('both decoration categories are usable; preparation tools, capsules and depleted products are excluded', () => {
  const candidates = [leaves, stars, { ...lines, quantity: 0 }, { ...leaves, id: 'capsules', equipmentCategory: 'Capsules / chablons' }, { ...leaves, id: 'tool', equipmentCategory: 'Outil de préparation' }];
  assert.deepEqual(inventoryTools(candidates).stickers.map(item => item.id), [leaves.id, stars.id]);
  assert.equal(isDecoration({ ...leaves, type: 'Effet' }), false);
});

for (const polishCount of [1, 2, 3, 4, 5]) test('a chosen decoration appears with exactly ' + polishCount + ' polishes without drawing tools', () => {
  const before = JSON.stringify(inventory);
  const report = createSuggestions(inventory, {}, { ...options, polishCount });
  assert.ok(report.results.length > 0);
  for (const idea of report.results) {
    assert.equal(idea.palette.length, polishCount);
    assert.equal(new Set(idea.nails.map(nail => nail.productId)).size, polishCount);
    assert.deepEqual(idea.resources.filter(isDecoration).map(item => item.id), [leaves.id]);
    assert.ok(idea.nails.some(nail => nail.decoration?.motif === 'leaf'));
    assert.ok(idea.nails.every(nail => !nail.drawing && nail.color === polishes.find(item => item.id === nail.productId).shade));
    assert.ok(idea.minutes <= 60 && idea.rank === 0);
  }
  assert.equal(JSON.stringify(inventory), before);
});

test('automatic duos can include decorations, while explicit/legacy opt-outs exclude them', () => {
  const auto = createSuggestions(inventory, {}, { polishCount: 2, duration: 60 }, 1, 24);
  assert.ok(auto.results.some(idea => idea.nails.some(nail => nail.decoration)));
  for (const choice of [{ decorations: 'without' }, { constraints: ['noStickers'] }, { decorations: 'with', constraints: ['noStickers'] }]) {
    const report = createSuggestions(inventory, {}, { ...choice, polishCount: 2, duration: 60 });
    assert.ok(report.results.length > 0);
    assert.ok(report.results.every(idea => idea.nails.every(nail => !nail.decoration) && !idea.resources.some(isDecoration)));
  }
});

test('a missing or depleted selected decoration is reported without silently replacing it', () => {
  for (const stock of [inventory.filter(item => item.id !== leaves.id), inventory.map(item => item.id === leaves.id ? { ...item, quantity: 0 } : item)]) {
    const report = createSuggestions(stock, {}, options);
    assert.equal(report.decorationUnavailable, true);
    assert.equal(report.results.length, 0);
  }
  const selected = { ...leaves, id: 25 };
  const stock = [...polishes, ...Array.from({ length: 25 }, (_, id) => ({ ...stars, id: 's' + id })), selected];
  const report = createSuggestions(stock, {}, { ...options, decorationId: '25', polishCount: 2 });
  assert.ok(report.results.length > 0 && report.results.every(idea => idea.resources.filter(isDecoration)[0].id === 25));
});

test('required decorations retain time, lamp and polish-count limits with no plain-pose fallback', () => {
  const tooShort = createSuggestions(inventory, {}, { ...options, duration: 15, polishCount: 1 });
  assert.equal(tooShort.results.length, 0);
  assert.equal(tooShort.decorationUnavailable, false);
  const missingColors = createSuggestions([polishes[0], leaves], {}, { ...options, polishCount: 2 });
  assert.equal(missingColors.countUnavailable, true);
  const semi = [{ ...polishes[0], type: 'Semi-permanent' }, leaves];
  assert.equal(createSuggestions(semi, {}, options).results.length, 0);
});

test('the decoration remains attached to the correct fingers, guide, variants and optional journal', () => {
  const idea = snapshotIdea(createSuggestions(inventory, {}, { ...options, polishCount: 2 }).results[0], { ...options, polishCount: 2 });
  const before = JSON.stringify(idea);
  const targets = idea.nails.flatMap((nail, index) => nail.decoration ? [index] : []);
  for (const index of targets) assert.equal(nailDetails(idea, index).find(detail => detail.label === 'Décoration').item.id, leaves.id);
  const steps = buildTutorial(idea).filter(step => step.kind === 'sticker');
  assert.equal(steps.length, 2);
  for (const step of steps) {
    assert.deepEqual(step.targets, targets);
    assert.deepEqual(step.products.map(item => item.id), [leaves.id]);
    assert.ok(step.body.includes(leaves.name));
  }
  const variants = createVariants(idea, inventory, {}, 3);
  assert.ok(variants.length > 0 && variants.every(variant => variant.resources.filter(isDecoration)[0].id === leaves.id));
  const session = { ...newTutorial(idea, 'pose', 1000), status: 'completed', completedAt: 2000 };
  const entry = newJournalEntry('journal', session, 2000);
  assert.ok(entry.products.some(item => item.id === leaves.id));
  assert.ok(!entry.products.find(item => item.id === leaves.id).photo);
  assert.equal(JSON.stringify(idea), before);
});

test('named leaves, stripes and strass have distinct schematic motifs; malformed choices use automatic', () => {
  assert.deepEqual(stickerAppearance(leaves), { motif: 'leaf', color: '#be7849' });
  assert.deepEqual(stickerAppearance(lines), { motif: 'stripe', color: '#d0aa58' });
  assert.equal(stickerAppearance({ name: 'Strass argentés' }).motif, 'gem');
  assert.equal(stickerAppearance(stars).motif, 'star');
  for (const decorations of [undefined, null, [], {}, 'unknown', true]) assert.equal(decorationChoice({ decorations, constraints: {} }).mode, 'auto');
});
