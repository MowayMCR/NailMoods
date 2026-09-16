import test from 'node:test';
import assert from 'node:assert/strict';
import { colorFamilyChange, preciseShade, productColor } from '../src/colorAnalysis.js';
import { createSuggestions, inventoryStamp } from '../src/creationEngine.js';
import { productStatus, readInspirations, snapshotIdea } from '../src/inspirations.js';
import { journalProducts, newJournalEntry } from '../src/journal.js';
import { newTutorial } from '../src/tutorial.js';

const plum = { id: 'plum', name: 'Dark Plum', type: 'Vernis', color: '#735b91', shade: '#562639', family: 'Violet', finish: 'Nacré', effect: 'Irisé', usage: 'Couleur seule' };
const blue = { ...plum, id: 'blue', name: 'Midnight Blueberry', color: '#5479a6', shade: '#17253c', family: 'Bleu' };
const brush = { id: 'brush', name: 'Pinceau fin', type: 'Matériel', equipmentCategory: 'Pinceau' };
const dotting = { id: 'dotting', name: 'Dotting tool', type: 'Matériel', equipmentCategory: 'Dotting tool' };

test('a precise shade wins; absent or invalid shades fall back to the saved color, then its family', () => {
  assert.equal(productColor({ ...plum, shade: '#56263A' }), '#56263a');
  for (const shade of ['', undefined, null, 'invalid', '#123', ['#562639']]) {
    assert.equal(productColor({ ...plum, shade }), '#735b91');
  }
  assert.equal(productColor({ family: 'Bleu', color: 'invalid' }), '#5479a6');
  assert.equal(productColor({}), '#b88699');
});

test('legacy photo/manual shades survive family changes and family imports without relabeling generic colors as precise', () => {
  for (const colorSource of ['photo', 'manual']) {
    const old = { id: 'old', color: '#562639', colorSource, family: 'Prune' };
    assert.equal(preciseShade(old), '#562639');
    const changed = { ...old, ...colorFamilyChange(old, 'Violet') };
    assert.equal(changed.color, '#735b91');
    assert.equal(changed.shade, '#562639');
    assert.equal(productColor(JSON.parse(JSON.stringify(changed))), '#562639');
    assert.equal(productColor({ ...changed, shade: '' }), '#735b91', 'explicitly clearing a shade does not resurrect its legacy value');
    assert.equal(old.family, 'Prune');
  }
  const generic = { family: 'Rose', color: '#db7897', colorSource: 'palette' };
  const changed = { ...generic, ...colorFamilyChange(generic, 'Bleu') };
  assert.equal(preciseShade(changed), '');
  assert.equal(productColor(changed), '#5479a6');
});

test('generated nails, accents and palette chips all use the exact shade without changing the collection', () => {
  const inventory = [plum, blue, brush, dotting], before = JSON.stringify(inventory);
  const ideas = createSuggestions(inventory, {}, { polishCount: 2, duration: 90, level: 1 }, 1, 100).results;
  for (const pattern of ['duo', 'accent', 'french', 'dots', 'line']) assert.ok(ideas.some(idea => idea.pattern === pattern), pattern);
  const expected = new Map([[plum.id, plum.shade], [blue.id, blue.shade]]);
  for (const idea of ideas) {
    for (const product of idea.palette) assert.equal(product.color, expected.get(product.id));
    for (const nail of idea.nails) {
      assert.equal(nail.color, expected.get(nail.productId));
      if (nail.accentProductId) assert.equal(nail.accentColor, expected.get(nail.accentProductId));
    }
  }
  assert.equal(JSON.stringify(inventory), before);
  assert.notEqual(inventoryStamp(inventory), inventoryStamp([{ ...plum, shade: '#552639' }, blue, brush, dotting]));
  const fallback = createSuggestions([{ ...plum, shade: '' }], {}, { polishCount: 1 }).results[0];
  assert.ok(fallback.nails.every(nail => nail.color === plum.color));
});

test('new favorites compare effective colors; old favorites, poses and journals retain their original colors', () => {
  const oldProduct = { ...plum, shade: '' };
  const oldIdea = snapshotIdea(createSuggestions([oldProduct], {}, { polishCount: 1 }).results[0]);
  const pose = { ...newTutorial(oldIdea, 'pose', 1000), status: 'completed', completedAt: 2000 };
  const journal = newJournalEntry('journal', pose, 2000);
  const before = JSON.stringify({ oldIdea, pose, journal });
  const newIdea = snapshotIdea(createSuggestions([plum], {}, { polishCount: 1 }).results[0]);
  assert.equal(productStatus(newIdea.palette[0], [plum]).state, 'available');
  assert.equal(productStatus(newIdea.palette[0], [{ ...plum, color: '#db7897', family: 'Rose' }]).state, 'available');
  assert.equal(productStatus(oldIdea.palette[0], [plum]).state, 'changed');
  assert.equal(productStatus(newIdea.palette[0], [{ ...plum, shade: '#521b69' }]).state, 'changed');
  const restored = readInspirations({ getItem: () => JSON.stringify({ favorites: [oldIdea, newIdea] }) });
  assert.equal(restored.favorites[0].nails[0].color, plum.color);
  assert.equal(restored.favorites[1].nails[0].color, plum.shade);
  assert.equal(journal.products[0].color, plum.color);
  assert.equal(journalProducts([plum])[0].color, plum.shade);
  assert.equal(JSON.stringify({ oldIdea, pose, journal }), before);
});
