import test from 'node:test';
import assert from 'node:assert/strict';
import { generateInspirations } from '../src/freeInspiration.js';
import { renderingForIdea } from '../src/techniqueRendering.js';

test('audacieuse graphique proposals keep a coherent colour story', () => {
  const report = generateInspirations([], {}, { intent: 'inspire', mood: 'Audacieuse', style: 'Graphique', polishCount: 3, duration: 90, level: 2 }, 1, 12);
  const allowed = new Set(['Cassis', 'Prune', 'Rose', 'Nude', 'Or', 'Brun', 'Terracotta', 'Blanc']);
  assert.ok(report.results.length > 0);
  assert.ok(report.results.every(idea => idea.palette.every(colour => allowed.has(colour.family))));
});

test('a Chic automatic palette does not mix unrelated calm colours', () => {
  const report = generateInspirations([], {}, { intent: 'inspire', mood: 'Chic', polishCount: 3, duration: 90, level: 2 }, 1, 12);
  const allowed = new Set(['Nude', 'Beige', 'Blanc', 'Brun', 'Bordeaux', 'Rouge', 'Or']);
  assert.ok(report.results.length > 0);
  assert.ok(report.results.every(idea => idea.palette.every(colour => allowed.has(colour.family))));
});

test('explicitly selected colours override an ambience suggestion', () => {
  const inspirationPalette = [
    ['blue', 'Bleu', '#5579a6'], ['green', 'Vert', '#668878'], ['white', 'Blanc', '#f4eee7'],
  ].map(([id, family, color]) => ({ id, name: family, family, color, type: 'Vernis', finish: 'Brillant', usage: 'Couleur seule', conceptual: true }));
  const report = generateInspirations([], {}, { intent: 'inspire', mood: 'Audacieuse', style: 'Graphique', inspirationPalette, requiredColorIds: ['blue', 'green', 'white'], polishCount: 3, duration: 90, level: 2 }, 1, 4);
  assert.ok(report.results.some(idea => idea.palette.map(colour => colour.id).sort().join(',') === 'blue,green,white'));
});

test('three chosen techniques vary their pairings across the proposed cards', () => {
  const report = generateInspirations([], {}, { intent: 'inspire', mood: 'Audacieuse', techniques: ['French', 'Aura nails', 'Tortoiseshell'], techniquePlacement: 'auto', polishCount: 2, duration: 90, level: 2 }, 2, 8);
  const pairings = new Set(report.results.map(idea => idea.composition.techniques.join(' + ')));
  assert.ok(pairings.has('French + Aura'));
  assert.ok(pairings.has('French + Tortoise'));
});

test('style is carried into the illustrated recipe without changing the ambience palette', () => {
  const report = generateInspirations([], {}, { intent: 'inspire', mood: 'Audacieuse', style: 'Graphique', techniques: ['French', 'Aura nails'], polishCount: 2, duration: 90, level: 2 }, 2, 4);
  assert.ok(report.results.length > 0);
  assert.ok(report.results.every(idea => idea.nails.every(nail => nail.visualStyle === 'graphique')));
  assert.ok(report.results.every(idea => idea.palette.every(colour => ['Cassis', 'Prune', 'Rose', 'Nude', 'Or', 'Brun', 'Terracotta'].includes(colour.family))));
});

test('tortoise keeps its own label while reusing the marble material renderer', () => {
  const rendering = renderingForIdea({ technique: 'tortoiseshell' });
  assert.equal(rendering.technique, 'tortoiseshell');
  assert.equal(rendering.materialTechnique, 'marble');
  assert.equal(rendering.label, 'Tortoise');
});

test('a multi-technique idea names the complete composition on its card', () => {
  const rendering = renderingForIdea({ technique: 'french', techniques: ['French', 'Léopard', 'Tortoise'] });
  assert.equal(rendering.label, 'French + Léopard + Tortoise');
  assert.equal(rendering.finish, 'Composition multi-techniques');
});
