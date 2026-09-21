import assert from 'node:assert/strict';
import test from 'node:test';
import { comparePoShare, shareSnapshot } from '../src/social/poShareService.js';

test('PO share contains only the useful palette and requirements, never private journal content', () => {
  const snapshot = shareSnapshot({
    id: 'journal-1',
    title: 'French douce',
    notes: 'Texte privé à ne jamais transmettre',
    photo: 'data:image/jpeg;base64,private',
    idea: {
      palette: [{ color: '#AABBCC' }, { color: '#aabbcc' }],
      technique: 'Micro-French',
      requirements: [{ name: 'Pinceau fin' }],
      nails: [{ technique: 'Strass' }],
    },
  }, 'journal');

  assert.deepEqual(snapshot, {
    level: '', mood: '', title: 'French douce',
    source_type: 'journal',
    colors: ['#AABBCC', '#aabbcc'],
    techniques: ['Micro-French', 'Strass'],
    requirements: ['Pinceau fin'],
  });
  assert.equal(JSON.stringify(snapshot).includes('Texte privé'), false);
  assert.equal(JSON.stringify(snapshot).includes('base64'), false);
});

test('received PO request is compared against polish colors and declared equipment', () => {
  const result = comparePoShare({
    colors: ['#B98499'],
    requirements: ['Pinceau fin'],
  }, [
    { id: 'polish-1', type: 'Vernis', name: 'Rose proche', color: '#BA8498', quantity: 1 },
    { id: 'tool-1', type: 'Matériel', name: 'Pinceau fin liner', quantity: 1 },
  ]);

  assert.equal(result.owned.length, 1);
  assert.deepEqual(result.techniqueChecks, [{ name: 'Pinceau fin', available: true }]);
});
