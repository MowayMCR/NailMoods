import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuggestions, selectedTechniques } from '../src/creationEngine.js';
import { snapshotIdea, validIdea } from '../src/inspirations.js';

const stock = [
  { id: 'nude', name: 'Nude', type: 'Vernis', color: '#e6c4ad', family: 'Nude', finish: 'Brillant', usage: 'Couleur seule' },
  { id: 'brown', name: 'Brun', type: 'Vernis', color: '#7d422b', family: 'Brun', finish: 'Brillant', usage: 'Couleur seule' },
  { id: 'brush', name: 'Pinceau fin', type: 'Matériel', equipmentCategory: 'Pinceau', quantity: 1 },
];

test('multi-technique selection preserves French leopard and tortoise as a visible per-nail composition', () => {
  const options = { techniques: ['French', 'Leopard', 'Tortoiseshell'], techniquePlacement: 'french', polishCount: 2, duration: 90, level: 2 };
  assert.deepEqual(selectedTechniques(options), ['french', 'leopard', 'tortoiseshell']);
  const idea = createSuggestions(stock, { shape: 'Amande', length: 'Moyen' }, options, 1, 4).results[0];
  assert.deepEqual(idea.techniques, ['French', 'Léopard', 'Tortoise']);
  assert.ok(idea.nails.every(nail => nail.drawing === 'french'));
  assert.ok(idea.nails.some(nail => nail.drawingTechnique === 'leopard'));
  assert.ok(idea.nails.some(nail => nail.drawingTechnique === 'tortoiseshell'));
});

test('every visual family can be composed on a French tip and survives a favorite snapshot', () => {
  const options = { techniques: ['French', 'Chrome powder', 'Aura nails', 'Blooming gel', 'Crocodile'], techniquePlacement: 'french', polishCount: 2, duration: 90, level: 2 };
  const selected = selectedTechniques(options);
  assert.deepEqual(selected, ['french', 'chrome', 'aura', 'blooming']);
  const idea = createSuggestions(stock, { shape: 'Amande', length: 'Moyen' }, options, 3, 4).results[0];
  assert.ok(idea.nails.every(nail => nail.drawing === 'french'));
  assert.ok(idea.nails.some(nail => ['chrome', 'aura', 'blooming'].includes(nail.drawingTechnique)));
  assert.deepEqual(idea.composition, { techniques: ['French', 'Chrome', 'Aura', 'Blooming'], placement: 'french' });
  const favorite = snapshotIdea(idea, idea.options);
  assert.ok(validIdea(favorite));
  assert.deepEqual(favorite.composition, idea.composition);
  assert.deepEqual(favorite.nails, JSON.parse(JSON.stringify(idea.nails)));
});

test('mix & match produces five visibly different nail roles while preserving one palette', () => {
  const options = { techniques: ['French', 'Leopard', 'Tortoiseshell'], techniquePlacement: 'mix', polishCount: 2, duration: 90, level: 2 };
  const idea = createSuggestions(stock, { shape: 'Amande', length: 'Moyen' }, options, 5, 4).results[0];
  assert.deepEqual(idea.composition, { techniques: ['French', 'Léopard', 'Tortoise'], placement: 'mix', mixMatch: true });
  assert.equal(idea.nails.filter(nail => nail.drawing === 'french').length, 2);
  assert.ok(idea.nails.some(nail => nail.drawingTechnique === 'leopard'));
  assert.ok(idea.nails.some(nail => nail.drawingTechnique === 'tortoiseshell'));
  assert.ok(idea.nails.some(nail => nail.technique === 'leopard'));
  assert.ok(idea.nails.some(nail => nail.technique === 'tortoiseshell'));
  assert.equal(new Set(idea.nails.map(nail => nail.productId)).size, 2);
});

test('mix & match is reserved for advanced multi-technique choices', () => {
  const intermediate = createSuggestions(stock, { shape: 'Amande', length: 'Moyen' }, { techniques: ['French', 'Leopard'], techniquePlacement: 'mix', polishCount: 2, duration: 90, level: 1 }, 6, 4).results[0];
  const singleTechnique = createSuggestions(stock, { shape: 'Amande', length: 'Moyen' }, { techniques: ['Leopard'], techniquePlacement: 'mix', polishCount: 2, duration: 90, level: 2 }, 7, 4).results[0];

  for (const idea of [intermediate, singleTechnique]) {
    assert.equal(idea.composition.placement, 'auto');
    assert.equal(idea.composition.mixMatch, undefined);
  }
});
