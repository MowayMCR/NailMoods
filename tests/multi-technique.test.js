import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuggestions, selectedTechniques } from '../src/creationEngine.js';

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
