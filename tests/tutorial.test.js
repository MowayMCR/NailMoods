import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSuggestions } from '../src/creationEngine.js';
import { snapshotIdea } from '../src/inspirations.js';
import { actOnTutorial, addTutorial, buildTutorial, canComplete, completionLabel, firstIncomplete, formatCountdown, newTutorial, readTutorials, timerFinished, timerRemaining, updateTutorial } from '../src/tutorial.js';

const colors = ['#713750', '#d8b1b8', '#d5bdad', '#7b609d', '#485ca0'].map((color, i) => ({ id: 'p' + i, name: 'Couleur ' + i, type: 'Semi-permanent', color, family: 'Rose', usage: 'Couleur seule', finish: 'Brillant' }));
const lamp = { id: 'lamp', name: 'Lampe UV / LED', type: 'Matériel', equipmentCategory: 'Lampe UV / LED' };
const stickers = { id: 'stickers', name: 'Étoiles dorées', type: 'Matériel', equipmentCategory: 'Stickers / décalcomanies' };
const brush = { id: 'brush', name: 'Pinceau fin', type: 'Matériel', equipmentCategory: 'Pinceau' };
const magnet = { id: 'magnet', name: 'Aimant', type: 'Matériel', equipmentCategory: 'Aimant cat-eye' };
const items = [...colors, lamp, stickers, brush];
const profile = { shape: 'Amande', length: 'Courte', duration: '1 h +', level: 'Intermédiaire' };
const idea = (count = 3, inventory = items) => snapshotIdea(createSuggestions(inventory, profile, { polishCount: count, duration: 90, level: 1 }).results[0], { polishCount: count, duration: 90, level: 1 });
const apply = (session, action, now = 1000) => updateTutorial(session, action, now);
const legacy = JSON.parse(readFileSync(new URL('./fixtures/tutorial-v1.json', import.meta.url), 'utf8'));
const restore = value => readTutorials({ getItem: () => JSON.stringify(value) });
function atColor() {
  let session = apply(newTutorial(idea(), 'pose', 1000), { type: 'start' });
  for (let i = 0; i < 2; i++) session = apply(session, { type: 'complete' });
  return session;
}

for (const count of [1, 2, 3, 4, 5]) test('the ' + count + '-polish tutorial assigns every nail on both hands to the saved color', () => {
  const saved = idea(count), before = JSON.stringify(saved);
  const steps = buildTutorial(saved);
  for (const hand of ['left', 'right']) {
    const colorSteps = steps.filter(step => step.hand === hand && step.kind === 'color');
    assert.equal(colorSteps.flatMap(step => step.targets).length, 5);
    assert.deepEqual(colorSteps.flatMap(step => step.targets).sort(), [0, 1, 2, 3, 4]);
    for (const step of colorSteps) for (const index of step.targets) assert.equal(step.products[0].id, saved.nails[index].productId);
  }
  assert.equal(JSON.stringify(saved), before);
  assert.equal(new Set(steps.map(step => step.id)).size, steps.length);
  assert.ok(steps.filter(step => step.timer).every(step => step.timer === 'lamp'));
  assert.ok(steps.every(step => step.products.every(product => [...saved.palette, ...saved.resources].some(owned => owned.id === product.id))));
});

test('right-first changes hand order only; color, drawing and sticker targets remain exact', () => {
  const recipes = createSuggestions(items, profile, { duration: 90, level: 1 }, 1, 24).results;
  for (const recipe of recipes) {
    const steps = buildTutorial(recipe, 'right');
    assert.equal(steps.find(step => step.hand).hand, 'right');
    for (const hand of ['left', 'right']) {
      for (const step of steps.filter(step => step.hand === hand && step.kind === 'drawing')) {
        assert.ok(step.targets.every(index => recipe.nails[index].drawing));
        assert.ok(step.targets.every(index => step.products.some(product => product.id === recipe.nails[index].accentProductId)));
      }
      const decoration = steps.find(step => step.hand === hand && step.kind === 'sticker');
      assert.deepEqual(decoration?.targets || [], recipe.nails.flatMap((nail, i) => nail.decoration ? [i] : []));
    }
  }
});

test('magnetic colors retain nail-by-nail guidance with one validation per color and hand', () => {
  const magnetic = { ...colors[0], finish: 'Cat-eye' };
  const saved = idea(1, [magnetic, lamp, magnet]);
  const steps = buildTutorial(saved).filter(step => step.kind === 'magnetic');
  assert.equal(steps.length, 2);
  assert.ok(steps.every(step => step.targets.length === 5 && step.products.some(product => product.id === magnet.id)));
  assert.ok(steps.every(step => step.body.includes('un ongle à la fois')));
});

test('classic polish has drying timers; no lamp, top coat or cure duration is invented', () => {
  const saved = idea(1, [{ ...colors[0], type: 'Vernis' }]);
  const session = newTutorial(saved, 'classic');
  assert.ok(session.steps.filter(step => step.timer).every(step => step.timer === 'dry'));
  assert.ok(session.steps.filter(step => step.kind === 'finish').every(step => !step.products.length));
  assert.ok(session.steps.filter(step => step.kind === 'finish').every(step => !step.timer), 'no extra drying/cure cycle is suggested without a finish product');
  assert.equal(session.timer.durationMs, 0);
  assert.deepEqual(session.durations, {});
});

test('a magnetic French keeps all nail targets and the magnet without five separate confirmations', () => {
  const magnetic = { ...colors[1], finish: 'Cat-eye' };
  const saved = createSuggestions([colors[0], magnetic, lamp, magnet, brush], profile, { polishCount: 2, duration: 90, level: 1 }, 1, 24).results.find(recipe => recipe.pattern === 'french' && recipe.nails[0].accentProductId === magnetic.id);
  assert.ok(saved);
  const steps = buildTutorial(saved).filter(step => step.kind === 'drawing');
  assert.equal(steps.length, 2);
  assert.ok(steps.every(step => step.targets.length === 5 && step.products.some(product => product.id === magnet.id)));
  assert.ok(steps.every(step => step.hint.includes('un ongle à la fois')));
});

test('one action completes each step without checkboxes; future steps still cannot be skipped', () => {
  let session = newTutorial(idea(), 'pose');
  assert.equal(apply(session, { type: 'complete' }), session);
  session = apply(session, { type: 'start' });
  assert.equal(canComplete(session), true);
  assert.equal(completionLabel(session), 'Produits prêts');
  session = apply(session, { type: 'go', index: 4 });
  assert.equal(canComplete(session), false);
  assert.equal(apply(session, { type: 'complete' }), session);
  session = apply(session, { type: 'go', index: 0 });
  session = apply(session, { type: 'complete' });
  assert.equal(session.completed.length, 1);
  assert.equal(session.current, 1);
  session = apply(session, { type: 'go', index: 0 });
  assert.equal(completionLabel(session), 'Continuer la pose');
  session = apply(session, { type: 'complete' });
  assert.equal(session.completed.length, 1);
  assert.equal(firstIncomplete(session), 1);
  assert.equal(completionLabel(atColor()), 'Couleur terminée');
});

test('a timer tracks wall-clock time across reload/background and expiry never completes an application step', () => {
  let session = atColor();
  session = apply(session, { type: 'timerStart', seconds: 37 }, 5000);
  assert.equal(session.timer.endsAt, 42000);
  assert.equal(timerRemaining(session.timer, 12000), 30000);
  const restored = readTutorials({ getItem: () => JSON.stringify({ sessions: [session], activeId: session.id }) }).sessions[0];
  assert.equal(timerRemaining(restored.timer, 20000), 22000);
  assert.equal(timerRemaining(restored.timer, 43000), 0);
  assert.equal(timerFinished(restored.timer, 43000), true);
  assert.equal(restored.completed.length, 2);
  assert.equal(canComplete(restored, 41000), false, 'cannot validate while timer is running');
  assert.equal(canComplete(restored, 43000), true, 'one explicit completion action is enough after expiry');
  assert.equal(formatCountdown(22001), '00:23');
  assert.equal(formatCountdown(0), '00:00');
});

test('a stale display clock cannot briefly inflate the countdown on start or resume', () => {
  let session = apply(atColor(), { type: 'timerStart', seconds: 60 }, 200000);
  assert.equal(formatCountdown(timerRemaining(session.timer, 1000)), '01:00');
  session = apply(session, { type: 'timerPause' }, 212000);
  session = apply(session, { type: 'timerResume' }, 400000);
  assert.equal(formatCountdown(timerRemaining(session.timer, 212000)), '00:48');
  assert.equal(formatCountdown(timerRemaining(session.timer, 410000)), '00:38');
});

test('pausing the pose freezes the timer and resuming the pose does not restart it automatically', () => {
  let session = apply(atColor(), { type: 'timerStart', seconds: 60 }, 10000);
  session = apply(session, { type: 'pause' }, 25000);
  assert.equal(session.status, 'paused');
  assert.equal(session.timer.status, 'paused');
  assert.equal(timerRemaining(session.timer, 999999), 45000);
  const same = apply(session, { type: 'timerResume' }, 99000);
  assert.equal(same, session);
  session = apply(session, { type: 'resume' }, 99000);
  assert.equal(session.timer.status, 'paused');
  session = apply(session, { type: 'timerResume' }, 100000);
  assert.equal(session.timer.endsAt, 145000);
  assert.equal(timerRemaining(session.timer, 120000), 25000);
  session = apply(session, { type: 'timerPause' }, 130000);
  assert.equal(session.timer.remainingMs, 15000);
  session = apply(session, { type: 'timerReset' });
  assert.equal(session.timer.status, 'idle');
  assert.equal(session.durations[session.steps[session.current].id], 60);
});

test('invalid timer durations and a second running timer are refused', () => {
  const session = atColor();
  for (const seconds of [0, -1, 1.5, 3601, Infinity, NaN, 'nonsense']) assert.equal(apply(session, { type: 'timerStart', seconds }), session);
  const running = apply(session, { type: 'timerStart', seconds: 60 });
  assert.equal(apply(running, { type: 'timerStart', seconds: 5 }, 2000), running);
});

test('multiple poses retain their independent progress and only one can be active', () => {
  let first = apply(atColor(), { type: 'timerStart', seconds: 60 }, 10000);
  let store = { sessions: [first], activeId: first.id };
  store = addTutorial(store, newTutorial(idea(2), 'second', 20000), 20000);
  assert.equal(store.sessions.find(session => session.id === first.id).status, 'paused');
  assert.equal(store.sessions.find(session => session.id === first.id).timer.remainingMs, 50000);
  store = actOnTutorial(store, 'second', { type: 'start' }, 21000);
  store = actOnTutorial(store, first.id, { type: 'resume' }, 22000);
  assert.equal(store.sessions.filter(session => session.status === 'active').length, 1);
  assert.equal(store.activeId, first.id);
  assert.equal(store.sessions.find(session => session.id === first.id).completed.length, 2);
});

test('the last hand finishes the pose directly, without a final review; repeating creates a separate pose', () => {
  let session = apply(newTutorial(idea(5), 'finished', 1000), { type: 'start' }, 1000);
  const snapshot = JSON.stringify(session.idea);
  assert.ok(session.steps.every(step => step.kind !== 'review'));
  for (let i = 0; i < session.steps.length - 1; i++) session = apply(session, { type: 'complete' }, 2000 + i * 1000);
  assert.equal(session.status, 'active');
  assert.equal(session.steps[session.current].kind, 'finish');
  assert.equal(completionLabel(session), 'Terminer ma pose');
  session = apply(session, { type: 'complete' }, 50000);
  assert.equal(session.status, 'completed');
  assert.equal(session.completed.length, session.steps.length);
  assert.ok(session.completedAt > 1000);
  assert.equal(JSON.stringify(session.idea), snapshot);
  const store = addTutorial({ sessions: [session], activeId: session.id }, newTutorial(session.idea, 'repeat'));
  assert.equal(store.sessions.length, 2);
  assert.equal(store.sessions[1].status, 'completed');
  assert.equal(store.sessions[0].completed.length, 0);
});

test('a saved 8-of-9 pose is finished after removing the redundant review; completed history is preserved', () => {
  const migrated = restore(legacy);
  assert.equal(migrated.sessions.length, legacy.sessions.length);
  const finished = migrated.sessions.find(session => session.id === 'legacy-review');
  assert.equal(finished.version, 2);
  assert.equal(finished.status, 'completed');
  assert.equal(finished.steps.length, 8);
  assert.equal(finished.completed.length, 8);
  assert.ok(finished.steps.every(step => step.kind !== 'review'));
  const before = legacy.sessions.find(session => session.id === 'legacy-completed');
  const after = migrated.sessions.find(session => session.id === before.id);
  assert.equal(after.status, 'completed');
  assert.equal(after.completedAt, before.completedAt);
  for (const session of migrated.sessions) assert.deepEqual(session.idea, legacy.sessions.find(old => old.id === session.id).idea);
  assert.deepEqual(restore(migrated), migrated, 'migration and subsequent reloads are stable');
});

test('a partly completed magnetic pose resumes on the grouped color with its paused timer intact', () => {
  const before = legacy.sessions.find(session => session.id === 'legacy-magnetic');
  const after = restore(legacy).sessions.find(session => session.id === before.id);
  assert.equal(after.status, 'paused');
  assert.deepEqual(after.completed, ['products', 'prepare']);
  assert.equal(after.current, 2);
  const step = after.steps[after.current];
  assert.equal(step.kind, 'magnetic');
  assert.deepEqual(step.targets, [0, 1, 2, 3, 4]);
  assert.equal(after.timer.status, 'paused');
  assert.equal(after.timer.stepId, step.id);
  assert.equal(after.timer.remainingMs, before.timer.remainingMs);
  assert.equal(after.durations[step.id], 30);
  const resumed = apply(after, { type: 'resume' });
  const next = apply(resumed, { type: 'complete' });
  assert.equal(next.steps[next.current].kind, 'finish');
  assert.equal(next.steps[next.current].hand, 'left');
});

test('legacy progress cannot finish a color when one of its original nails was still incomplete', () => {
  const before = structuredClone(legacy);
  const session = before.sessions.find(value => value.id === 'legacy-review');
  session.checks[session.steps[2].id] = [];
  const after = restore(before).sessions.find(value => value.id === session.id);
  assert.equal(after.status, 'active');
  assert.equal(after.current, 2);
  assert.ok(!after.completed.includes(after.steps[2].id));
  assert.equal(apply(after, { type: 'complete' }).status, 'completed');
});

test('malformed storage is recovered without losing the other valid poses or claiming completion', () => {
  for (const text of ['{', 'null', '42', '{"sessions":null}']) assert.deepEqual(readTutorials({ getItem: () => text }), { sessions: [], activeId: null });
  const session = atColor();
  const store = readTutorials({ getItem: () => JSON.stringify({ sessions: [null, { id: 'broken' }, { ...session, status: 'completed', timer: { status: 'running', endsAt: 'bad' }, current: 900, completed: ['products', 'invented'], checks: { products: ['not-a-task'] } }], activeId: 'gone' }) });
  assert.equal(store.sessions.length, 1);
  assert.equal(store.sessions[0].status, 'paused');
  assert.deepEqual(store.sessions[0].completed, ['products']);
  assert.equal(store.sessions[0].timer.status, 'idle');
  assert.equal(store.sessions[0].current, session.steps.length - 1);
});
