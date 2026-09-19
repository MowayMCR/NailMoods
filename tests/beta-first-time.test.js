import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuggestions } from '../src/creationEngine.js';
import { readCreationState } from '../src/creationState.js';
import { guides, helpSeen, markHelpSeen, trackHelp } from '../src/help.js';
import { browserStorage } from '../src/storage.js';
import { snapshotIdea, toggleFavorite, readInspirations, INSPIRATIONS_KEY } from '../src/inspirations.js';

const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) }; };
test('BETA FIRST TIME: own shades, declared lamp, real generation and persisted favorite', () => {
  const storage = memory();
  const items = ['#813c60', '#356a59', '#efce9d'].map((color, i) => ({ id: 'beta-' + i, name: 'Teinte ' + i, type: 'Semi-permanent', color, finish: 'Brillant', usage: 'Couleur seule' }));
  const state = readCreationState(storage, {});
  assert.equal(createSuggestions(items, {}, state.options).results.length, 0);
  items.push({ id: 'lamp', name: 'Ma lampe', type: 'Matériel', equipmentCategory: 'Lampe UV / LED', quantity: 1 });
  const report = createSuggestions(items, {}, state.options);
  assert.ok(report.results.length);
  for (const idea of report.results) for (const nail of idea.nails) assert.equal(nail.color, items.find(item => item.id === nail.productId).color);
  const idea = snapshotIdea(report.results[0], state.options);
  const library = toggleFavorite(readInspirations(storage), idea);
  storage.setItem(INSPIRATIONS_KEY, JSON.stringify(library));
  assert.equal(readInspirations(storage).favorites[0].key, idea.key);
});
test('help completion is screen-specific; telemetry remains bounded and has no identity', () => {
  const storage = memory();
  assert.equal(helpSeen('collection', storage), false);
  markHelpSeen('collection', storage);
  assert.equal(helpSeen('collection', storage), true);
  assert.equal(helpSeen('journal', storage), false);
  for (let i=0;i<220;i++) trackHelp('help_opened', { screen:'collection', source:'button', slide:1, step:'overview' }, storage);
  const entries = JSON.parse(storage.getItem('nm-help-events-v1'));
  assert.equal(entries, null);
  for (const guide of Object.values(guides)) assert.ok(guide.slides.length >= 2 && guide.slides.length <= 4);
});
test('blocked storage getter does not crash startup; writes cannot falsely succeed', () => {
  const previous = globalThis.window;
  globalThis.window = Object.defineProperty({}, 'localStorage', { get() { throw new Error('Storage denied'); } });
  try { assert.equal(browserStorage.getItem('nm-profile'), null); assert.throws(() => browserStorage.setItem('x','y')); }
  finally { globalThis.window = previous; }
});

test('phase 8: new profile has no creator styles and can generate with one classic polish', async () => {
  const { defaultProfile } = await import('../src/profileOptions.js');
  assert.equal(defaultProfile.name, '');
  assert.deepEqual(defaultProfile.styles, []);
  const state = readCreationState(memory(), defaultProfile);
  const report = createSuggestions([{id:'first',name:'Mon vernis',type:'Vernis',color:'#813c60',finish:'Brillant',usage:'Couleur seule'}],defaultProfile,state.options);
  assert.ok(report.results.length > 0);
  assert.ok(report.results[0].nails.every(n => n.color === '#813c60'));
});
test('phase 8: material help is independent, replayable and short', () => {
  const storage = memory();
  assert.equal(helpSeen('equipment',storage),false);
  markHelpSeen('equipment',storage);
  assert.equal(helpSeen('equipment',storage),true);
  assert.ok(guides.equipment.slides.length <= 3);
  trackHelp('help_opened',{screen:'equipment',source:'button',slide:1,step:'overview'},storage);
  assert.equal(storage.getItem('nm-help-events-v1'),null);
});
