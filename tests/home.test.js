import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHome, homeSeed } from '../src/home.js';
import { CREATION_KEY, readCreationState } from '../src/creationState.js';
import { createSuggestions, inventoryStamp } from '../src/creationEngine.js';
import { personalRecipeKey, buildPersonalModel } from '../src/personalization.js';
import { snapshotIdea } from '../src/inspirations.js';
import { newTutorial, updateTutorial } from '../src/tutorial.js';
import { newJournalEntry } from '../src/journal.js';

const now = new Date(2026, 8, 16, 12).getTime();
const colors = ['#482438', '#17253c', '#805b4c', '#357b51', '#a13053'].map((shade, index) => ({ id: 'p' + index, name: 'Vernis ' + index, type: 'Vernis', family: 'Prune', color: '#735b91', shade, finish: 'Brillant', effect: 'Aucun', usage: 'Couleur seule' }));
const leaves = { id: 'leaves', name: 'Feuilles dorées', type: 'Matériel', equipmentCategory: 'Strass / décorations', materialStyle: 'Feuilles dorées', quantity: 1 };
const items = [...colors, leaves];
const profile = { shape: 'Amande', length: 'Courte', styles: ['Witchy'], level: 'Je débute' };
const options = { mode: 'usual', mood: 'Chic', style: 'Witchy', occasion: 'Tous les jours', surprise: 'Safe', duration: 45, polishCount: 2, level: 0, decorations: 'with', decorationId: leaves.id, constraints: ['noDrawing'] };
const ideas = createSuggestions(items, profile, options, 1, 12).results.map(idea => snapshotIdea(idea, options));
const base = () => ({ items, profile, options, library: { favorites: [], recent: [], selected: null }, tutorials: { sessions: [], activeId: null }, journal: { entries: [], hiddenSessions: [] }, seed: homeSeed(now) });
const session = (id, index = 0) => newTutorial(ideas[index], id, now);
const completed = (id, index = 0, time = now) => updateTutorial(session(id, index), { type: 'finishWithoutGuide' }, time);

test('home reads the same choices as Create without writing or resetting an existing generation', () => {
  const learning = buildPersonalModel({ favorites: [ideas[0]] }).ranking;
  const saved = { generated: true, options, seed: 9, inventory: inventoryStamp(items), selected: ideas[0].id, learning, learningStamp: 'kept' };
  const text = JSON.stringify(saved);
  const storage = { getItem: key => { assert.equal(key, CREATION_KEY); return text; }, setItem: () => assert.fail('reading must not write') };
  assert.deepEqual(readCreationState(storage, profile), saved);
  const legacy = readCreationState({ getItem: () => JSON.stringify({ options: { polishCount: '3', constraints: ['noDrawing', 'noStickers'] } }) }, profile);
  assert.equal(legacy.options.polishCount, 3);
  assert.equal(legacy.options.decorations, 'without');
  assert.deepEqual(legacy.options.constraints, ['noDrawing']);
  for (const value of ['{', 'null', '{}', '{"options":[]}', '{"options":"bad"}']) assert.equal(readCreationState({ getItem: () => value }, profile).generated, false);
});

test('an active pose takes priority and completed active IDs fall back to the last unfinished pose', () => {
  const input = base();
  const paused = updateTutorial(updateTutorial(session('paused'), { type: 'start' }, now), { type: 'pause' }, now + 100);
  const active = updateTutorial(session('active', 1), { type: 'start' }, now);
  input.library.selected = ideas[2];
  input.tutorials = { sessions: [paused, completed('done', 3), active], activeId: 'paused' };
  const before = JSON.stringify(input), home = buildHome(input);
  assert.equal(home.priority, 'resume');
  assert.equal(home.resume.id, 'active');
  assert.equal(home.retained.key, ideas[2].key);
  assert.equal(home.unfinishedCount, 2);
  assert.equal(JSON.stringify(input), before);
  input.tutorials = { sessions: [paused, completed('done', 3)], activeId: 'done' };
  assert.equal(buildHome(input).resume.id, 'paused');
});

test('the chosen paused session is kept even if the same idea has another, more recent session', () => {
  const input = base();
  const paused = updateTutorial(updateTutorial(session('chosen'), { type: 'start' }, now), { type: 'pause' }, now);
  input.tutorials = { sessions: [{ ...paused, id: 'other', updatedAt: now + 1000 }, paused], activeId: paused.id };
  assert.equal(buildHome(input).resume.id, paused.id);
});

test('a retained idea is offered until performed; started and completed copies are never proposed as waiting', () => {
  const input = base(); input.library.selected = ideas[0];
  assert.equal(buildHome(input).priority, 'retained');
  input.tutorials = { sessions: [session('ready')], activeId: 'ready' };
  assert.equal(buildHome(input).retained, null);
  input.tutorials = { sessions: [completed('done')], activeId: 'done' };
  const home = buildHome(input);
  assert.equal(home.retained, null);
  assert.equal(home.resume, null);
  assert.equal(home.priority, 'create');
  assert.equal(home.pending.id, 'done');
});

test('an outdated retained idea keeps its original shades and clearly reports changed or missing references', () => {
  const input = base(); input.library.selected = ideas[0];
  input.items = colors.slice(1).map(item => ({ ...item, shade: '#ffffff' }));
  const original = JSON.stringify(input.library.selected);
  const home = buildHome(input);
  assert.ok(home.retainedChanges.length > 0);
  assert.equal(JSON.stringify(home.retained), original);
  assert.ok(home.retained.nails.every(nail => nail.color !== '#ffffff'));
});

test('Free home always offers an inspiration for empty or incomplete inventories', () => {
  const scenarios = [
    { items: [], options, route: 'collection', title: /premières couleurs/ },
    { items: colors.map(item => ({ ...item, type: 'Semi-permanent' })), options: { ...options, decorations: 'without' }, route: 'create', title: /collection/ },
    { items: colors.slice(0, 1), options: { ...options, polishCount: 5, decorations: 'without' }, route: 'create', title: /nombre/ },
    { items: colors, options, route: 'create', title: /décoration/ },
    { items, options: { ...options, duration: 15 }, route: 'create', title: /temps/ },
  ];
  for (const scenario of scenarios) {
    const home = buildHome({ ...base(), ...scenario });
    assert.ok(home.inspiration);
    assert.equal(home.priority, 'create');
    assert.equal(home.readiness, null);
    assert.ok(home.inspiration.palette.every(p => scenario.items.length ? scenario.items.some(i => i.id === p.id) : p.conceptual));
  }
});

test('home suggestions preserve explicit constraints, precise colors and the selected decoration', () => {
  for (const polishCount of [1, 2, 3, 4, 5]) {
    const input = { ...base(), options: { ...options, polishCount } };
    const learned = buildPersonalModel({ items, favorites: [ideas[0]] }).ranking;
    for (const learning of [null, learned]) {
      const home = buildHome({ ...input, learning });
      assert.equal(home.inspiration.palette.length, polishCount);
      assert.ok(home.inspiration.minutes <= options.duration);
      assert.equal(home.inspiration.rank, 0);
      assert.ok(home.inspiration.resources.some(item => item.id === leaves.id));
      for (const nail of home.inspiration.nails) assert.equal(nail.color, colors.find(item => item.id === nail.productId).shade);
    }
  }
});

test('home is stable for the same day and data, offers another recipe on request, and avoids pending ideas', () => {
  const input = base(), first = buildHome(input);
  assert.equal(homeSeed(now), homeSeed(now + 1000));
  assert.deepEqual(first.inspiration, buildHome(input).inspiration);
  const other = buildHome({ ...input, seed: input.seed + 1, exclude: personalRecipeKey(first.inspiration) });
  assert.notEqual(personalRecipeKey(other.inspiration), personalRecipeKey(first.inspiration));
  input.library.selected = snapshotIdea(first.inspiration, options);
  const home = buildHome(input);
  assert.notEqual(personalRecipeKey(home.inspiration), personalRecipeKey(input.library.selected));
});

test('journal prompts use completed, unrecorded, non-dismissed poses; latest memories use the pose date', () => {
  const input = base(), old = completed('old', 0, now - 1000), recent = completed('recent', 1, now);
  input.tutorials = { sessions: [session('not-done'), old, recent], activeId: 'not-done' };
  assert.equal(buildHome(input).pending.id, 'recent');
  input.journal.entries = [newJournalEntry('already-recorded', recent, now)];
  assert.equal(buildHome(input).pending.id, 'old');
  input.journal.hiddenSessions = [old.id];
  assert.equal(buildHome(input).pending, null);
  input.journal.entries.push({ ...newJournalEntry('manual', null, now), title: 'Souvenir ancien', date: '2026-01-01', createdAt: now + 1000 });
  assert.equal(buildHome(input).latest.id, 'already-recorded');
});
