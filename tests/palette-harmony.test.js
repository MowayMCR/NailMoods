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
