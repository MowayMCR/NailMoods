import { normalize } from './creationEngine.js';
import { snapshotIdea, validIdea } from './inspirations.js';
import { isDecoration } from './decorations.js';

export const TUTORIAL_KEY = 'nm-tutorials-v1';
export const handLabels = { left: 'Main gauche', right: 'Main droite' };
const sameId = (a, b) => String(a) === String(b);
const lampProduct = item => ['Semi-permanent', 'Gel'].includes(item.type);
const magnetic = item => /cat.?eye|magnetique|avec aimant/.test(normalize([item.finish, item.effect, item.usage].join(' ')));
const uniqueProducts = items => [...new Map(items.filter(Boolean).map(item => [String(item.id), item])).values()];
export const emptyTimer = () => ({ status: 'idle', stepId: null, durationMs: 0, remainingMs: 0, endsAt: null });
const magneticInstructions = magnet => 'Travaille un ongle à la fois : applique la couleur, forme l’effet avec ' + magnet.name + ', puis fixe-le selon la notice avant de passer au suivant.';

export function buildTutorial(idea, firstHand = 'left') {
  const products = uniqueProducts([...idea.palette, ...idea.resources]).filter(product => !product.unpainted);
  const steps = [{
    id: 'products', kind: 'products', title: 'Rassemble tes produits', section: 'Avant de commencer',
    body: 'Prépare les références de cette inspiration près de toi. Quand tout est prêt, passe à la suite en une seule touche.',
    products, targets: [],
  }, {
    id: 'prepare', kind: 'prepare', title: 'Prépare ton support', section: 'Avant de commencer', products: [], targets: [],
    body: 'Réalise la préparation et, si nécessaire, la pose de tes capsules selon ton protocole. Applique une base seulement si tes produits la demandent. Le guide commence ensuite par la couleur.',
  }];
  for (const hand of firstHand === 'right' ? ['right', 'left'] : ['left', 'right']) {
    const add = step => steps.push({ ...step, id: hand + '-' + step.id, hand, section: handLabels[hand] });
    for (const product of idea.palette) {
      if (product.unpainted) continue;
      const targets = idea.nails.flatMap((nail, index) => sameId(nail.productId, product.id) ? [index] : []);
      if (!targets.length) continue;
      // Keep nail-by-nail application advice, with one validation for the color.
      const magnet = magnetic(product) && idea.resources.find(item => item.equipmentCategory === 'Aimant cat-eye');
      add({
          id: 'color-' + product.id, kind: magnet ? 'magnetic' : 'color',
          title: product.name,
          body: magnet ? magneticInstructions(magnet)
            : 'Applique ' + product.name + ' sur les ongles repérés. Répète les couches prévues par sa notice, en respectant le temps requis entre chaque couche.',
          hint: lampProduct(product) ? 'Pour chaque couche, utilise la lampe compatible et le temps indiqués par la marque. Évite tout contact du produit avec la peau.' : 'Laisse sécher chaque couche selon les indications du produit avant de poursuivre.',
          products: uniqueProducts([product, magnet, lampProduct(product) && idea.resources.find(item => item.equipmentCategory === 'Lampe UV / LED')]),
          targets, timer: lampProduct(product) ? 'lamp' : 'dry',
        });
    }
    for (const pattern of ['french', 'line', 'dots']) {
      const targets = idea.nails.flatMap((nail, index) => nail.drawing === pattern ? [index] : []);
      if (!targets.length) continue;
      const accent = uniqueProducts(targets.map(index => idea.palette.find(item => sameId(item.id, idea.nails[index].accentProductId))));
      const tool = idea.resources.find(item => item.equipmentCategory === (pattern === 'dots' ? 'Dotting tool' : 'Pinceau'));
      const magnet = accent.some(magnetic) && idea.resources.find(item => item.equipmentCategory === 'Aimant cat-eye');
      add({ id: pattern, kind: 'drawing', title: { french: 'Dessine les pointes', line: 'Ajoute la ligne', dots: 'Ajoute les petits pois' }[pattern],
        body: { french: 'Trace les pointes de la French sur les ongles repérés, avec la couleur de détail de l’aperçu.', line: 'Trace la ligne sur les ongles repérés avec la couleur de détail de l’aperçu.', dots: 'Dépose les pois sur les ongles repérés avec ton dotting tool et la couleur de détail.' }[pattern],
        hint: magnet ? 'Travaille un ongle à la fois : forme l’effet avec ' + magnet.name + ' puis fixe-le selon la notice avant de passer au suivant.' : 'Respecte l’application et le séchage ou la polymérisation de cette couleur avant la suite.',
        products: uniqueProducts([...accent, tool, magnet]), targets, timer: accent.some(lampProduct) ? 'lamp' : 'dry',
      });
    }
    const stickerTargets = idea.nails.flatMap((nail, index) => nail.decoration ? [index] : []);
    if (stickerTargets.length) {
      const stickers = idea.resources.filter(isDecoration);
      add({ id: 'stickers', kind: 'sticker', title: 'Place tes décorations',
        body: 'Place ' + stickers.map(item => item.name).join(', ') + ' sur les ongles repérés, à l’emplacement suggéré. Adapte la taille et le motif à ta planche réelle.',
        hint: 'Suis les indications de tes décorations pour la surface de pose et leur fixation.',
        products: stickers, targets: stickerTargets,
      });
    }
    const finish = idea.resources.filter(item => /top\s*coat/.test(normalize(item.name).replace(/-/g, ' ')));
    add({ id: 'finish', kind: 'finish', title: 'Termine cette main',
      body: finish.length ? 'Réalise la finition avec ' + finish.map(item => item.name).join(', ') + ' en suivant sa notice et celle des décorations.' : 'Effectue la finition prévue par ton système de produits, si elle est nécessaire. Vérifie le résultat et les temps requis avant de passer à la suite.',
      hint: 'Aucun top coat n’est ajouté automatiquement : certains produits l’intègrent déjà.',
      products: finish, targets: [0, 1, 2, 3, 4],
      timer: finish.length ? finish.some(lampProduct) ? 'lamp' : 'dry' : null,
    });
  }
  return steps;
}

export function newTutorial(idea, id, now = Date.now()) {
  const saved = snapshotIdea(idea);
  return { id, version: 2, idea: saved, firstHand: 'left', steps: buildTutorial(saved), status: 'ready',
    current: 0, completed: [], timer: emptyTimer(), durations: {}, createdAt: now, startedAt: null, completedAt: null, updatedAt: now };
}

export function timerRemaining(timer, now = Date.now()) {
  // The first render after start/resume can precede the display clock refresh.
  return Math.max(0, timer.status === 'running' ? Math.min(timer.remainingMs, timer.endsAt - now) : timer.remainingMs || 0);
}
export function timerFinished(timer, now = Date.now()) { return timer.status !== 'idle' && timer.durationMs > 0 && timerRemaining(timer, now) === 0; }
export function formatCountdown(ms) { const seconds = Math.ceil(Math.max(0, ms) / 1000); return Math.floor(seconds / 60).toString().padStart(2, '0') + ':' + (seconds % 60).toString().padStart(2, '0'); }
export function firstIncomplete(session) { const next = session.steps.findIndex(step => !session.completed.includes(step.id)); return next < 0 ? session.steps.length - 1 : next; }
export function canComplete(session, now = Date.now()) {
  return session.status === 'active' && session.current <= firstIncomplete(session)
    && !(session.timer.status === 'running' && timerRemaining(session.timer, now) > 0);
}

export function completionLabel(session) {
  const step = session.steps[session.current];
  if (session.completed.includes(step.id)) return 'Continuer la pose';
  if (session.current === session.steps.length - 1) return 'Terminer ma pose';
  return { products: 'Produits prêts', prepare: 'Préparation terminée', color: 'Couleur terminée', magnetic: 'Couleur terminée', drawing: 'Dessin terminé', sticker: 'Décorations terminées', finish: handLabels[step.hand] + ' terminée' }[step.kind] || 'Étape terminée';
}

// All changes are explicit. Timer expiry never completes an application step.
export function updateTutorial(session, action, now = Date.now()) {
  if (!session || !action) return session;
  const step = session.steps[session.current];
  let next = { ...session, updatedAt: now };
  switch (action.type) {
    case 'finishWithoutGuide':
      if (session.status === 'completed') return session;
      return { ...next, status: 'completed', completionMode: 'unguided', completedAt: now, timer: emptyTimer() };
    case 'hand':
      if (session.status !== 'ready' || !['left', 'right'].includes(action.hand)) return session;
      return { ...next, firstHand: action.hand, steps: buildTutorial(session.idea, action.hand) };
    case 'start':
      if (session.status !== 'ready') return session;
      return { ...next, status: 'active', startedAt: now };
    case 'pause': {
      if (session.status !== 'active') return session;
      const remainingMs = timerRemaining(session.timer, now);
      return { ...next, status: 'paused', timer: session.timer.status === 'running' ? { ...session.timer, status: remainingMs ? 'paused' : 'done', remainingMs, endsAt: null } : session.timer };
    }
    case 'resume':
      return session.status === 'paused' ? { ...next, status: 'active' } : session;
    case 'go':
      return Number.isInteger(action.index) && action.index >= 0 && action.index < session.steps.length ? { ...next, current: action.index } : session;
    case 'complete': {
      if (!canComplete(session, now)) return session;
      const completed = [...new Set([...session.completed, step.id])];
      next = { ...next, completed, timer: session.timer.stepId === step.id ? emptyTimer() : session.timer };
      if (completed.length === session.steps.length) return { ...next, status: 'completed', completedAt: now };
      return { ...next, current: firstIncomplete(next) };
    }
    case 'timerStart': {
      if (session.status !== 'active' || !step.timer || session.current > firstIncomplete(session)) return session;
      if (session.timer.status === 'running' && timerRemaining(session.timer, now) > 0) return session;
      const seconds = Number(action.seconds);
      if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) return session;
      return { ...next, durations: { ...session.durations, [step.id]: seconds }, timer: { status: 'running', stepId: step.id, durationMs: seconds * 1000, remainingMs: seconds * 1000, endsAt: now + seconds * 1000 } };
    }
    case 'timerPause': {
      if (session.timer.status !== 'running') return session;
      const remainingMs = timerRemaining(session.timer, now);
      return { ...next, timer: { ...session.timer, status: remainingMs ? 'paused' : 'done', remainingMs, endsAt: null } };
    }
    case 'timerResume':
      if (session.status !== 'active' || session.timer.status !== 'paused' || session.timer.remainingMs <= 0) return session;
      return { ...next, timer: { ...session.timer, status: 'running', endsAt: now + session.timer.remainingMs } };
    case 'timerReset':
      return { ...next, timer: emptyTimer() };
    default: return session;
  }
}

export function validTutorial(session) {
  return Boolean(session && typeof session.id === 'string' && [1, 2].includes(session.version) && validIdea(session.idea)
    && ['ready', 'active', 'paused', 'completed'].includes(session.status)
    && Array.isArray(session.steps) && session.steps.length > 0 && session.steps.length < 100
    && session.steps.every(step => step && typeof step.id === 'string' && typeof step.title === 'string' && typeof step.body === 'string'
      && Array.isArray(step.targets) && step.targets.every(index => Number.isInteger(index) && index >= 0 && index < 5)
      && Array.isArray(step.products) && step.products.every(product => product && product.id != null && typeof product.name === 'string')
      && (step.kind !== 'magnetic' || step.products.length > 0)
      && (session.version === 2 || Array.isArray(step.tasks) && step.tasks.length > 0 && step.tasks.every(task => task && typeof task.id === 'string' && typeof task.label === 'string')))
    && new Set(session.steps.map(step => step.id)).size === session.steps.length);
}

// Migrate the saved steps themselves, keeping the original products and recipe.
function simplifyLegacyTutorial(session) {
  if (session.version !== 1) return session;
  const groupId = step => step.kind === 'magnetic' ? step.hand + '-color-' + step.products[0].id
    : step.kind === 'drawing' ? step.id.replace(/-[0-4]$/, '') : step.id;
  const groups = new Map();
  for (const original of session.steps.filter(step => step.kind !== 'review')) {
    const id = groupId(original);
    const { tasks, ...step } = original;
    const group = groups.get(id);
    if (group) {
      group.step.targets = [...new Set([...group.step.targets, ...step.targets])].sort();
      group.step.products = uniqueProducts([...group.step.products, ...step.products]);
      group.originalIds.push(original.id);
    } else {
      const simplified = { ...step, id };
      if (step.kind === 'products') simplified.body = 'Prépare les références de cette inspiration près de toi. Quand tout est prêt, passe à la suite en une seule touche.';
      if (step.kind === 'magnetic') {
        simplified.title = step.products[0].name;
        const magnet = step.products.find(product => product.equipmentCategory === 'Aimant cat-eye');
        if (magnet) simplified.body = magneticInstructions(magnet);
      }
      if (step.kind === 'drawing' && step.hint) simplified.hint = step.hint.replace('Sur cet ongle,', 'Travaille un ongle à la fois :');
      groups.set(id, { step: simplified, originalIds: [original.id] });
    }
  }
  const steps = [...groups.values()].map(group => group.step);
  const completed = [...groups.values()].filter(group => group.originalIds.every(id => session.completed.includes(id))).map(group => group.step.id);
  const currentId = groupId(session.steps[session.current]);
  const timerStep = session.steps.find(step => step.id === session.timer.stepId);
  const durations = {};
  for (const step of session.steps) if (groups.has(groupId(step)) && session.durations[step.id]) durations[groupId(step)] = session.durations[step.id];
  const timer = timerStep && groups.has(groupId(timerStep)) ? { ...session.timer, stepId: groupId(timerStep) } : emptyTimer();
  if (timer.stepId && timer.durationMs > 0) durations[timer.stepId] = timer.durationMs / 1000;
  const { checks, ...previous } = session;
  const finished = completed.length === steps.length;
  const migrated = { ...previous, version: 2, steps, completed, durations, timer, status: finished ? 'completed' : session.status,
    completedAt: finished ? session.completedAt || session.updatedAt || session.createdAt : session.completedAt };
  return { ...migrated, current: steps.some(step => step.id === currentId) ? steps.findIndex(step => step.id === currentId) : firstIncomplete(migrated) };
}

export function readTutorials(storage) {
  const empty = { sessions: [], activeId: null };
  try {
    const saved = JSON.parse(storage.getItem(TUTORIAL_KEY) || 'null');
    if (!Array.isArray(saved?.sessions)) return empty;
    const sessions = saved.sessions.filter(validTutorial).map(session => {
      const completed = session.steps.filter(step => Array.isArray(session.completed) && session.completed.includes(step.id)
        && (session.version === 2 || Array.isArray(session.checks?.[step.id]) && step.tasks.every(task => session.checks[step.id].includes(task.id)))).map(step => step.id);
      const timer = session.timer;
      const validTimer = timer && ['idle', 'running', 'paused', 'done'].includes(timer.status)
        && (timer.status === 'idle' || session.steps.some(step => step.id === timer.stepId && step.timer))
        && Number.isFinite(timer.durationMs) && timer.durationMs >= 0 && timer.durationMs <= 3600000
        && Number.isFinite(timer.remainingMs) && timer.remainingMs >= 0 && timer.remainingMs <= timer.durationMs
        && (timer.status !== 'running' || Number.isFinite(timer.endsAt));
      return simplifyLegacyTutorial({ ...session, completed, timer: validTimer ? timer : emptyTimer(), durations: session.durations && typeof session.durations === 'object' ? session.durations : {},
        current: Number.isInteger(session.current) ? Math.max(0, Math.min(session.steps.length - 1, session.current)) : 0,
        status: session.status === 'completed' && completed.length !== session.steps.length && !(session.completionMode === 'unguided' && Number.isFinite(session.completedAt)) ? 'paused' : session.status });
    }).filter(validTutorial);
    return { sessions, activeId: sessions.some(session => session.id === saved.activeId) ? saved.activeId : sessions.find(session => session.status !== 'completed')?.id || null };
  } catch { return empty; }
}

export function addTutorial(store, session, now = Date.now()) {
  return { sessions: [session, ...store.sessions.map(previous => previous.status === 'active' ? updateTutorial(previous, { type: 'pause' }, now) : previous)], activeId: session.id };
}

// Marking a real pose as done does not claim its guide steps were followed.
// Repeated clicks reopen that completion; an explicitly restarted pose is new.
export function markIdeaDone(store, idea, id, now = Date.now()) {
  const saved = snapshotIdea(idea);
  const pending = store.sessions.find(session => session.idea.key === saved.key && session.status !== 'completed');
  const finished = store.sessions.find(session => session.idea.key === saved.key && session.status === 'completed');
  if (!pending && finished) return { store, session: finished };
  const session = updateTutorial(pending || newTutorial(saved, id, now), { type: 'finishWithoutGuide' }, now);
  const sessions = pending ? store.sessions.map(value => value.id === session.id ? session : value) : [session, ...store.sessions];
  return { session, store: { ...store, sessions, activeId: store.activeId === session.id ? sessions.find(value => value.status !== 'completed')?.id || null : store.activeId } };
}

export function actOnTutorial(store, id, action, now = Date.now()) {
  const original = store.sessions.find(session => session.id === id);
  const changed = updateTutorial(original, action, now);
  if (!original || changed === original) return store;
  const activates = ['start', 'resume'].includes(action.type);
  return { ...store, activeId: activates ? id : store.activeId, sessions: store.sessions.map(session => session.id === id ? changed : activates && session.status === 'active' ? updateTutorial(session, { type: 'pause' }, now) : session) };
}
