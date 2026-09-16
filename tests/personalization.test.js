import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalModel, personalRecipeKey, personalAdjustment, readPersonalization, validPersonalSnapshot } from '../src/personalization.js';
import { createSuggestions } from '../src/creationEngine.js';
import { snapshotIdea, createVariants } from '../src/inspirations.js';
import { newJournalEntry, putJournalEntry, removeJournalEntry } from '../src/journal.js';

const now = Date.UTC(2026, 8, 16, 12);
const colors = ['#482438', '#17253c', '#805b4c', '#357b51', '#a13053'].map((shade, index) => ({ id: 'p' + index, name: 'Vernis ' + index, type: 'Vernis', family: 'Prune', color: '#735b91', shade, finish: 'Brillant', effect: 'Aucun', usage: 'Couleur seule' }));
const leaves = { id: 'leaves', name: 'Feuilles dorées', type: 'Matériel', equipmentCategory: 'Strass / décorations', materialStyle: 'Feuilles dorées', quantity: 1 };
const brush = { id: 'brush', name: 'Pinceau fin', type: 'Matériel', equipmentCategory: 'Pinceau', quantity: 1 };
const stock = [...colors, leaves, brush];
const profile = { shape: 'Ronde', length: 'Courte', styles: [] };
const options = { mood: '', style: 'Libre', mode: 'usual', duration: 45, level: 1, decorations: 'without', polishCount: 1 };
const suggest = (opts = options, learning = null, items = stock, seed = 1) => createSuggestions(items, profile, opts, seed, 24, learning);
const solids = suggest().results;
const idea = snapshotIdea(solids.at(-1), options);
const session = { id: 'done', status: 'completed', idea, completedAt: now, updatedAt: now };
const entry = (patch = {}) => ({ ...newJournalEntry('journal', session, now), ...patch });
const model = data => buildPersonalModel({ items: stock, ...data });

test('a first visit needs no feedback; malformed settings and ranking snapshots remain usable', () => {
  const empty = model({ entries: [{ id: 'empty', products: [], notes: 'J’adore ces pois', feeling: 'love' }] });
  assert.equal(empty.ranking, null);
  assert.deepEqual(empty.unexplored, []);
  for (const value of [null, '{', 'null', '[]', '{}']) assert.equal(readPersonalization({ getItem: () => value }).enabled, true);
  assert.equal(readPersonalization({ getItem: () => '{"enabled":false}' }).enabled, false);
  for (const invalid of [null, {}, { version: 1 }, { ...model({ favorites: [idea] }).ranking, products: { x: { affinity: 'bad' } } }]) {
    assert.equal(validPersonalSnapshot(invalid), false);
    assert.deepEqual(suggest(options, invalid), suggest());
  }
  assert.equal(personalRecipeKey({ nails: Array(5).fill(null), palette: [colors[0]] }), '');
});

test('a guide and its journal count as one pose; merely finishing never means liking', () => {
  const plain = model({ sessions: [session, { ...session, id: 'active', status: 'active' }] });
  const value = plain.ranking.products[idea.palette[0].id];
  assert.equal(plain.counts.poses, 1);
  assert.equal(value.uses, 1);
  assert.equal(value.likes, 0);
  assert.equal(value.affinity, 0);
  assert.deepEqual(plain.liked, []);
  assert.ok(!personalAdjustment(idea, options, plain.ranking).reasons.some(reason => /appréci|favori/.test(reason)));
  const rated = model({ sessions: [session], entries: [entry({ feeling: 'love', repeat: true })] });
  assert.deepEqual(rated.counts, { favorites: 0, poses: 1, feedback: 1 });
  assert.equal(rated.ranking.products[idea.palette[0].id].uses, 1);
  assert.equal(rated.ranking.products[idea.palette[0].id].likes, 1);
  assert.equal(validPersonalSnapshot(JSON.parse(JSON.stringify(rated.ranking))), true);
});

test('real journal products replace the recipe products without inventing a technique or rewriting history', () => {
  const source = { sessions: [session], entries: [entry({ products: [colors.find(item => item.id !== idea.palette[0].id), brush], feeling: 'love', ease: 'tricky' })] };
  const before = JSON.stringify(source);
  const learned = model(source);
  assert.equal(learned.counts.poses, 1);
  assert.equal(learned.ranking.products[idea.palette[0].id], undefined);
  assert.equal(learned.ranking.products[source.entries[0].products[0].id].likes, 1);
  assert.equal(learned.ranking.products.brush, undefined);
  assert.deepEqual(learned.ranking.recipes, {});
  assert.deepEqual(learned.ranking.techniques, {});
  assert.equal(JSON.stringify(source), before);
});

test('manual memories and decorations contribute without interpreting free text, photos or wear time', () => {
  const actual = [colors[0], colors[0], leaves, brush];
  const manual = { ...newJournalEntry('manual', null, now), products: actual, feeling: 'like' };
  const basic = model({ entries: [manual] });
  const privateFields = model({ entries: [{ ...manual, notes: 'Je déteste le bleu, à refaire en rouge', photo: 'private-photo', wearDays: 30 }] });
  assert.deepEqual(privateFields.ranking, basic.ranking);
  assert.equal(basic.ranking.products.p0.uses, 1);
  assert.equal(basic.ranking.products.leaves.likes, 1);
  assert.deepEqual(basic.ranking.recipes, {});
  assert.ok(!JSON.stringify(basic.ranking).includes('Vernis'));
  assert.ok(!JSON.stringify(privateFields.ranking).includes('private-photo'));
});

test('changing or deleting a return and removing a favorite removes its influence', () => {
  const saved = putJournalEntry({ entries: [], hiddenSessions: [] }, entry({ feeling: 'love' }), now);
  const loved = model({ sessions: [session], entries: saved.store.entries });
  const edited = putJournalEntry(saved.store, { ...saved.entry, feeling: '', ease: '', repeat: false }, now + 1);
  assert.equal(model({ sessions: [session], entries: edited.store.entries }).liked.length, 0);
  const deleted = removeJournalEntry(saved.store, saved.entry.id);
  const after = model({ sessions: [session], entries: deleted.entries });
  assert.equal(after.ranking.products[idea.palette[0].id].uses, 1);
  assert.equal(after.ranking.products[idea.palette[0].id].likes, 0);
  assert.notEqual(after.stamp, loved.stamp);
  assert.ok(model({ favorites: [idea] }).ranking);
  assert.equal(model({ favorites: [] }).ranking, null);
  assert.equal(model({ favorites: [idea, { ...idea, key: 'duplicate-same-composition' }] }).counts.favorites, 1);
});

test('repeated poses count separately, while the latest explicit recipe feedback wins', () => {
  const older = entry({ feeling: 'love', repeat: true, updatedAt: now });
  const newer = entry({ id: 'new', sessionId: 'new-session', feeling: 'adjust', repeat: false, date: '2026-09-17', updatedAt: now + 86400000 });
  const learned = model({ sessions: [session], entries: [newer, older] });
  assert.equal(learned.counts.poses, 2);
  assert.equal(learned.ranking.products[idea.palette[0].id].uses, 2);
  assert.equal(learned.ranking.recipes[personalRecipeKey(idea)].feeling, 'adjust');
  assert.equal(learned.ranking.recipes[personalRecipeKey(idea)].repeat, false);
});

test('a favorite or an appreciated pose changes actual suggestion ranking and explains it', () => {
  assert.notEqual(solids[0].id, idea.id);
  for (const data of [{ favorites: [idea] }, { entries: [entry({ feeling: 'love', repeat: true })] }]) {
    const learned = model(data);
    const report = suggest(options, learned.ranking);
    assert.equal(report.results[0].id, idea.id);
    assert.match(report.results[0].reasons[0], /favorite|refaire/);
    assert.equal(report.total, suggest().total);
    assert.deepEqual(new Set(report.results.map(idea => idea.id)), new Set(solids.map(idea => idea.id)));
    assert.deepEqual(suggest(), suggest(options, null), 'pausing restores the base ranking for a given seed');
  }
});

test('change favors unused references and moves the recent exact recipe down', () => {
  const change = { ...options, mode: 'change' };
  const recent = suggest(change).results[0];
  const learned = model({ sessions: [{ ...session, idea: recent }] });
  const report = suggest(change, learned.ranking);
  assert.notEqual(report.results[0].id, recent.id);
  assert.equal(report.results.at(-1).id, recent.id);
  assert.ok(report.results[0].reasons.includes('Pour varier tes poses enregistrées'));
  assert.equal(learned.unexplored.length, colors.length - 1);
});

test('adjust feedback lowers only the tried composition, never bans its polishes', () => {
  const pairOptions = { ...options, polishCount: 2 };
  const pair = suggest(pairOptions).results.find(idea => idea.pattern === 'duo');
  const learned = model({ entries: [{ ...entry(), idea: pair, products: pair.palette, feeling: 'adjust' }] });
  assert.ok(personalAdjustment(pair, options, learned.ranking).score < 0);
  const different = suggest(pairOptions).results.find(candidate => candidate.pattern !== 'duo' && candidate.palette.every(item => pair.palette.some(p => p.id === item.id)));
  assert.ok(different);
  assert.ok(personalAdjustment(different, options, learned.ranking).score >= 0);
  assert.equal(suggest(pairOptions, learned.ranking).total, suggest(pairOptions).total);
});

test('reported difficulty gently changes preference without changing the allowed level', () => {
  const opts = { ...options, polishCount: 2 };
  const french = suggest(opts).results.find(idea => idea.pattern === 'french');
  assert.ok(french);
  const tricky = model({ entries: [{ ...entry(), idea: french, products: [...french.palette, ...french.resources], ease: 'tricky' }] });
  assert.deepEqual(tricky.practice, ['French']);
  assert.ok(personalAdjustment(french, opts, tricky.ranking).score < 0);
  assert.ok(personalAdjustment(solids[0], opts, tricky.ranking).reasons.some(reason => /simple après/.test(reason)));
  assert.equal(suggest(opts, tricky.ranking).total, suggest(opts).total);
});

test('personalized creation and variants retain exact shades, chosen decorations and every constraint', () => {
  const learned = model({ favorites: [idea], entries: [entry({ feeling: 'love' })] }).ranking;
  for (const mode of ['usual', 'change', 'surprise']) for (const polishCount of [1, 2, 3, 4, 5]) {
    const opts = { ...options, mode, surprise: 'Chaos', polishCount, decorations: 'with', decorationId: leaves.id, constraints: ['noDrawing', 'noLamp'] };
    const report = suggest(opts, learned);
    assert.equal(report.total, suggest(opts).total);
    assert.ok(report.results.length > 0);
    for (const candidate of [...report.results, ...createVariants(snapshotIdea(report.results[0], opts), stock, profile, 1, learned)]) {
      assert.equal(candidate.palette.length, polishCount);
      assert.ok(candidate.minutes <= opts.duration);
      assert.equal(candidate.rank, 0);
      assert.ok(candidate.resources.some(item => item.id === leaves.id));
      for (const nail of candidate.nails) assert.equal(nail.color, colors.find(item => item.id === nail.productId).shade);
      assert.ok(candidate.palette.every(item => item.color === colors.find(current => current.id === item.id).shade));
    }
    assert.equal(suggest(opts, learned, stock.filter(item => item.id !== leaves.id)).results.length, 0);
  }
  assert.equal(suggest({ ...options, constraints: ['favorites'] }, learned).results.length, 0, 'learning does not turn products into explicit favorites');
  assert.equal(suggest(options, learned, colors.map(item => ({ ...item, type: 'Semi-permanent' }))).results.length, 0, 'liking a polish never supplies a missing lamp');
});
