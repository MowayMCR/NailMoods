import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptedCreationColors, applyProCreationConstraint, proCreationTargets } from '../src/workspaces/proCreationGeneration.js';

const idea = { id: 'idea', title: 'Une pose', description: 'Description', reasons: [], techniques: [], options: {}, nails: Array.from({ length: 5 }, (_, index) => ({ color: '#d6a0b0', techniques: [], technique: null, drawing: null, index })) };
const creation = { id: 'creation-1', title: 'French féline', techniques: ['French', 'Léopard'], motifs: ['Félin'], recommended_fingers: ['index', 'ring'] };

test('Pro creation constraint keeps the generator composition and adds semantic constraints', () => {
    const [result] = applyProCreationConstraint([idea], { creation, mode: 'palette' });
    assert.equal(result.nails.length, 5);
    assert.equal(result.nails[1].drawing, 'french');
    assert.equal(result.nails[3].drawingTechnique, 'leopard');
    assert.equal(result.nails[0].technique, null);
    assert.deepEqual({ id: result.proCreation.id, title: result.proCreation.title, mode: result.proCreation.mode, placement: result.proCreation.placement }, { id: 'creation-1', title: 'French féline', mode: 'palette', placement: [1, 3] });
    assert.equal('design' in result, false);
});

test('Pro creation inspiration uses one restrained accent', () => {
  assert.deepEqual(proCreationTargets(creation, 'inspire'), [3]);
  assert.deepEqual(proCreationTargets({ recommended_fingers: ['accent'] }, 'placement'), [3]);
});

test('palette adaptation only maps existing generated palette colours', () => {
  const colors = adaptedCreationColors({ color_roles: [{ role: 'accent', color: '#111111' }] }, { palette: [{ color: '#d6a0b0' }, { color: '#68445e' }] }, 'palette');
  assert.deepEqual(colors, { base: '#d6a0b0', principale: '#d6a0b0', secondaire: '#68445e', accent: '#68445e' });
});
