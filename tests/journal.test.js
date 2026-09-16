import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readTutorials } from '../src/tutorial.js';
import { filterJournal, journalProducts, journalValidation, localDate, newJournalEntry, pendingJournalPoses, putJournalEntry, readJournal, removeJournalEntry, safeJournalPhoto, validDate } from '../src/journal.js';

const now = Date.UTC(2026, 8, 16, 12);
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/tutorial-v1.json', import.meta.url), 'utf8'));
const sessions = readTutorials({ getItem: () => JSON.stringify(fixtures) }).sessions;
const finished = sessions.find(session => session.status === 'completed');
const empty = () => ({ entries: [], hiddenSessions: [] });
const restore = store => readJournal({ getItem: () => JSON.stringify(store) });

test('a manual pose can be saved without a photo, products or feedback and survives reload', () => {
  const draft = newJournalEntry('manual', null, now);
  const { entry, store } = putJournalEntry(empty(), draft, now);
  assert.equal(entry.date, localDate(now));
  assert.ok(entry.title.startsWith('Ma pose du'));
  assert.equal(entry.idea, null);
  assert.deepEqual(entry.products, []);
  assert.equal(entry.feeling, '');
  assert.equal(entry.wearDays, '');
  assert.deepEqual(restore(store), store);
});

test('completed tutorials prefill an immutable recipe and product snapshot without product photos', () => {
  const source = structuredClone(finished);
  source.idea.palette[0].photo = photo;
  const draft = newJournalEntry('guided', source, now);
  const original = JSON.stringify(draft);
  source.idea.palette[0].name = 'Renamed in collection';
  source.idea.nails[0].color = '#000000';
  assert.equal(JSON.stringify(draft), original);
  assert.ok(!JSON.stringify(draft.products).includes(photo));
  assert.ok(!JSON.stringify(draft.idea).includes(photo));
  assert.equal(draft.title, finished.idea.title);
  assert.equal(draft.sessionId, finished.id);
  assert.throws(() => newJournalEntry('unfinished', { ...finished, status: 'paused' }, now));
});

test('reopening the same completed pose updates its journal entry without a duplicate', () => {
  let result = putJournalEntry(empty(), newJournalEntry('first', finished, now), now);
  const createdAt = result.entry.createdAt;
  result = putJournalEntry(result.store, { ...newJournalEntry('second-id', finished, now + 2000), feeling: 'love' }, now + 2000);
  assert.equal(result.store.entries.length, 1);
  assert.equal(result.entry.id, 'first');
  assert.equal(result.entry.createdAt, createdAt);
  assert.equal(result.entry.feeling, 'love');
  assert.equal(result.entry.updatedAt, now + 2000);
});

test('repeating the same inspiration on a different session creates a distinct memory', () => {
  let result = putJournalEntry(empty(), newJournalEntry('one', finished, now), now);
  result = putJournalEntry(result.store, newJournalEntry('two', { ...finished, id: 'repeated-session' }, now), now);
  assert.equal(result.store.entries.length, 2);
  assert.equal(result.store.entries[0].idea.key, result.store.entries[1].idea.key);
});

test('editing products and removing the result photo does not change the original inspiration', () => {
  const draft = { ...newJournalEntry('edit', finished, now), photo, notes: 'Deux couches\nTrès joli', feeling: 'love', ease: 'easy', repeat: true, wearDays: 0 };
  const first = putJournalEntry(empty(), draft, now);
  const original = JSON.stringify(first.store);
  const second = putJournalEntry(first.store, { ...first.entry, photo: '', products: first.entry.products.slice(1), notes: 'À refaire' }, now + 1000);
  assert.equal(JSON.stringify(first.store), original);
  assert.deepEqual(second.entry.idea, first.entry.idea);
  assert.equal(second.entry.products.length, first.entry.products.length - 1);
  assert.equal(second.entry.photo, '');
  assert.equal(second.entry.wearDays, 0, 'zero days is not missing feedback');
  assert.equal(second.entry.feeling, 'love');
  assert.deepEqual(restore(second.store), second.store);
});

test('deleting a linked entry hides its pending suggestion and an explicit re-add restores it', () => {
  const first = putJournalEntry(empty(), newJournalEntry('saved', finished, now), now);
  const deleted = removeJournalEntry(first.store, first.entry.id);
  assert.equal(first.store.entries.length, 1, 'previous store is not mutated');
  assert.equal(deleted.entries.length, 0);
  assert.ok(deleted.hiddenSessions.includes(finished.id));
  assert.ok(!pendingJournalPoses(deleted, sessions).some(session => session.id === finished.id));
  const restored = putJournalEntry(deleted, newJournalEntry('restored', finished, now), now);
  assert.ok(!restored.store.hiddenSessions.includes(finished.id));
  assert.equal(restored.store.entries.length, 1);
});

test('only completed and unrecorded tutorials are offered in the journal', () => {
  assert.equal(pendingJournalPoses(empty(), sessions).length, 2);
  const saved = putJournalEntry(empty(), newJournalEntry('saved', finished, now), now);
  assert.equal(pendingJournalPoses(saved.store, sessions).length, 1);
  const manual = putJournalEntry(empty(), newJournalEntry('manual', null, now), now);
  assert.equal(pendingJournalPoses(manual.store, sessions).length, 2);
});

test('history sorts by pose date and searches notes, brands and names without accents', () => {
  const base = newJournalEntry('a', null, now);
  const entries = [
    { ...base, title: 'Étoiles', date: '2026-09-10', notes: 'Pailleté doré', repeat: true },
    { ...base, id: 'b', title: 'Une autre pose', date: '2026-09-15', products: [{ id: 1, name: 'Cassis', brand: 'Une Marque' }] },
    { ...base, id: 'c', date: '2026-09-11', repeat: true },
  ];
  assert.deepEqual(filterJournal(entries).map(entry => entry.id), ['b', 'c', 'a']);
  assert.deepEqual(filterJournal(entries, '', true).map(entry => entry.id), ['c', 'a']);
  assert.equal(filterJournal(entries, 'etoiles')[0].id, 'a');
  assert.equal(filterJournal(entries, 'dore')[0].id, 'a');
  assert.equal(filterJournal(entries, 'marque')[0].id, 'b');
  assert.equal(filterJournal(entries, 'cassis', true).length, 0);
});

test('invalid dates, future poses, unsupported photos and fractional wear days cannot be saved', () => {
  assert.equal(validDate('2024-02-29'), true);
  for (const date of ['2026-02-29', '2026-09-31', '2026-13-01', 'not a date']) assert.equal(validDate(date), false);
  const draft = newJournalEntry('validation', null, now);
  for (const patch of [{ date: '2099-01-01' }, { date: '2026-02-29' }, { photo: 'javascript:alert(1)' }, { photo: 'data:image/svg+xml;base64,PHN2Zz4=' }, { wearDays: 2.5 }, { wearDays: -1 }, { wearDays: 366 }]) {
    assert.ok(journalValidation({ ...draft, ...patch }, now));
    assert.throws(() => putJournalEntry(empty(), { ...draft, ...patch }, now));
  }
  assert.equal(safeJournalPhoto(photo), photo);
  assert.equal(journalValidation({ ...draft, wearDays: '14', photo }, now), '');
});

test('a corrupt record or unsafe image does not discard the other saved memories', () => {
  const good = putJournalEntry(empty(), { ...newJournalEntry('safe', null, now), photo }, now).entry;
  const other = { ...good, id: 'unsafe-image', photo: 'https://untrusted.invalid/tracker', feeling: 'invented', products: [null, { id: 3, name: 'Rose', photo }] };
  const store = restore({ entries: [null, { id: 'broken' }, good, { ...good, title: 'Duplicate' }, other], hiddenSessions: [1, 'hidden', 'hidden'] });
  assert.equal(store.entries.length, 2);
  assert.equal(store.entries[0].photo, photo);
  assert.equal(store.entries[1].photo, '');
  assert.equal(store.entries[1].feeling, '');
  assert.deepEqual(store.entries[1].products, [{ id: 3, name: 'Rose' }]);
  assert.deepEqual(store.hiddenSessions, ['hidden']);
  for (const value of ['{', 'null', '[]', '{"entries":null}']) assert.deepEqual(readJournal({ getItem: () => value }), empty());
});

test('product references deduplicate numeric/string IDs and never copy images or unrelated data', () => {
  const product = { id: 7, name: 'Prune', brand: 'Marque', photo, secret: 'unused' };
  assert.deepEqual(journalProducts([product, { ...product, id: '7' }, null]), [{ id: '7', name: 'Prune', brand: 'Marque' }]);
  assert.equal(product.photo, photo);
});
