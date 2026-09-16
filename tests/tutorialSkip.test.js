import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuggestions } from '../src/creationEngine.js';
import { snapshotIdea } from '../src/inspirations.js';
import { newTutorial, updateTutorial, markIdeaDone, readTutorials } from '../src/tutorial.js';
import { newJournalEntry } from '../src/journal.js';
const now = Date.UTC(2026, 8, 16, 12);
const item = { id: 'one', name: 'Violet', type: 'Vernis', color: '#521b69', family: 'Violet', finish: 'Brillant', usage: 'Couleur seule' };
const idea = snapshotIdea(createSuggestions([item], {}, { polishCount: 1 }).results[0]);

test('marking an inspiration as done creates one completed pose without pretending guide steps were checked', () => {
  const empty = { sessions: [], activeId: null };
  const result = markIdeaDone(empty, idea, 'manual-done', now);
  assert.equal(empty.sessions.length, 0);
  assert.equal(result.session.status, 'completed'); assert.equal(result.session.completionMode, 'unguided');
  assert.deepEqual(result.session.completed, []); assert.equal(result.session.startedAt, null); assert.equal(result.session.completedAt, now);
  const reloaded = readTutorials({ getItem: () => JSON.stringify(result.store) });
  assert.equal(reloaded.sessions[0].status, 'completed'); assert.equal(reloaded.sessions[0].completionMode, 'unguided');
  const again = markIdeaDone(reloaded, idea, 'duplicate', now + 1000);
  assert.equal(again.store, reloaded); assert.equal(again.session.id, 'manual-done');
});

test('skipping an active guide stops its timer, retains actual checked steps and leaves another pose alone', () => {
  let pending = updateTutorial(newTutorial(idea, 'pending', now), { type: 'start' }, now);
  pending = updateTutorial(pending, { type: 'complete' }, now + 1);
  const completed = [...pending.completed];
  pending.timer = { status: 'running', stepId: pending.steps[2].id, remainingMs: 20000, durationMs: 20000, endsAt: now + 20000 };
  const otherIdea = snapshotIdea({ ...idea, shape: 'Carrée' });
  const other = updateTutorial(newTutorial(otherIdea, 'other'), { type: 'start' }, now);
  const store = { sessions: [pending, other], activeId: 'pending' };
  const result = markIdeaDone(store, idea, 'unused', now + 10);
  assert.equal(result.store.sessions.length, 2); assert.equal(result.session.id, 'pending');
  assert.equal(result.session.timer.status, 'idle'); assert.deepEqual(result.session.completed, completed);
  assert.equal(result.store.sessions[1], other); assert.equal(result.store.activeId, 'other');
});

test('an explicitly restarted pose can be completed separately from a previous realization', () => {
  const first = markIdeaDone({ sessions: [], activeId: null }, idea, 'first', now);
  const next = newTutorial(idea, 'second', now + 100);
  const result = markIdeaDone({ sessions: [next, ...first.store.sessions], activeId: next.id }, idea, 'unused', now + 200);
  assert.equal(result.session.id, 'second'); assert.equal(result.store.sessions.filter(s => s.status === 'completed').length, 2);
});

test('a pose completed without the guide can prefill the optional journal with the original inspiration', () => {
  const { session } = markIdeaDone({ sessions: [], activeId: null }, idea, 'done', now);
  const entry = newJournalEntry('entry', session, now);
  // The journal API accepts explicit completed poses as well as guided ones.
  assert.equal(entry.sessionId, session.id); assert.equal(entry.idea.key, idea.key);
});
