import { snapshotIdea, validIdea } from './inspirations.js';
import { normalize } from './creationEngine.js';
import { preciseShade, productColor } from './colorAnalysis.js';

export const JOURNAL_KEY = 'nm-journal-v1';
export const feelingLabels = { love: 'J’adore', like: 'J’aime bien', adjust: 'À ajuster' };
export const easeLabels = { easy: 'Facile', expected: 'Comme prévu', tricky: 'Difficile' };
const productFields = ['id', 'name', 'brand', 'type', 'color', 'family', 'depth', 'undertone', 'finish', 'effect', 'usage', 'equipmentCategory', 'materialStyle', 'reference', 'url'];
const text = (value, max = 2000) => typeof value === 'string' ? value.slice(0, max) : '';

export function localDate(now = Date.now()) {
  const date = new Date(now);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function journalDate(value) {
  return validDate(value) ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value + 'T12:00:00')) : '';
}

export function journalProducts(products = []) {
  const saved = new Map();
  for (const product of Array.isArray(products) ? products : []) {
    if (!product || !['string', 'number'].includes(typeof product.id) || typeof product.name !== 'string' || !product.name.trim()) continue;
    const snapshot = Object.fromEntries(productFields.filter(field => ['string', 'number'].includes(typeof product[field])).map(field => [field, product[field]]));
    if (product.type !== 'Matériel' && preciseShade(product)) snapshot.color = productColor(product);
    saved.set(String(product.id), snapshot);
  }
  return [...saved.values()];
}

export function safeJournalPhoto(value) {
  return typeof value === 'string' && value.length <= 2000000 && /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=\r\n]+$/i.test(value) ? value : '';
}

export function newJournalEntry(id, session = null, now = Date.now()) {
  if (session && session.status !== 'completed') throw new Error('Termine cette pose avant de l’ajouter au journal.');
  const idea = session && validIdea(session.idea) ? snapshotIdea(session.idea) : null;
  return { id, version: 1, sessionId: session?.id || null, idea, title: idea?.title || '',
    date: localDate(session?.completedAt || now), photo: '', products: idea ? journalProducts([...idea.palette, ...idea.resources]) : [],
    feeling: '', ease: '', repeat: false, wearDays: '', notes: '', createdAt: now, updatedAt: now };
}

export function journalValidation(entry, now = Date.now()) {
  if (!entry || typeof entry.id !== 'string' || !entry.id || entry.version !== 1) return 'Cette fiche ne peut pas être enregistrée.';
  if (!validDate(entry.date) || entry.date > localDate(now)) return 'Choisis la date de ta pose, aujourd’hui ou avant.';
  if (entry.photo && !safeJournalPhoto(entry.photo)) return 'Cette photo ne peut pas être enregistrée. Essaie de la réimporter.';
  if (entry.wearDays !== '' && entry.wearDays != null && (!/^\d+$/.test(String(entry.wearDays)) || Number(entry.wearDays) > 365)) return 'Indique une tenue entre 0 et 365 jours, ou laisse ce champ vide.';
  return '';
}

function cleanEntry(entry) {
  return { id: entry.id, version: 1, sessionId: typeof entry.sessionId === 'string' ? entry.sessionId : null,
    idea: validIdea(entry.idea) ? snapshotIdea(entry.idea) : null,
    title: text(entry.title, 120).trim() || 'Ma pose du ' + journalDate(entry.date), date: entry.date,
    photo: safeJournalPhoto(entry.photo), products: journalProducts(entry.products),
    feeling: Object.hasOwn(feelingLabels, entry.feeling) ? entry.feeling : '', ease: Object.hasOwn(easeLabels, entry.ease) ? entry.ease : '',
    repeat: entry.repeat === true, wearDays: /^\d+$/.test(String(entry.wearDays)) && Number(entry.wearDays) <= 365 ? Number(entry.wearDays) : '',
    notes: text(entry.notes, 4000), createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : 0, updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0 };
}

export function readJournal(storage) {
  const empty = { entries: [], hiddenSessions: [] };
  try {
    const saved = JSON.parse(storage.getItem(JOURNAL_KEY) || 'null');
    if (!Array.isArray(saved?.entries)) return empty;
    const ids = new Set(), sessions = new Set();
    const entries = [];
    for (const entry of saved.entries) {
      if (!entry || entry.version !== 1 || typeof entry.id !== 'string' || !entry.id || !validDate(entry.date) || ids.has(entry.id)) continue;
      const clean = cleanEntry(entry);
      if (clean.sessionId && sessions.has(clean.sessionId)) continue;
      entries.push(clean); ids.add(clean.id); if (clean.sessionId) sessions.add(clean.sessionId);
    }
    return { entries, hiddenSessions: Array.isArray(saved.hiddenSessions) ? [...new Set(saved.hiddenSessions.filter(id => typeof id === 'string'))] : [] };
  } catch { return empty; }
}

export function putJournalEntry(store, draft, now = Date.now()) {
  const error = journalValidation(draft, now);
  if (error) throw new Error(error);
  const previous = store.entries.find(entry => entry.id === draft.id || draft.sessionId && entry.sessionId === draft.sessionId);
  const entry = cleanEntry({ ...draft, id: previous?.id || draft.id, createdAt: previous?.createdAt ?? draft.createdAt ?? now, updatedAt: now });
  return { entry, store: { entries: [entry, ...store.entries.filter(value => value.id !== entry.id && (!entry.sessionId || value.sessionId !== entry.sessionId))],
    hiddenSessions: store.hiddenSessions.filter(id => id !== entry.sessionId) } };
}

export function removeJournalEntry(store, id) {
  const entry = store.entries.find(value => value.id === id);
  if (!entry) return store;
  return { entries: store.entries.filter(value => value.id !== id), hiddenSessions: entry.sessionId ? [...new Set([...store.hiddenSessions, entry.sessionId])] : store.hiddenSessions };
}

export function pendingJournalPoses(store, sessions) {
  return sessions.filter(session => session.status === 'completed' && !store.hiddenSessions.includes(session.id) && !store.entries.some(entry => entry.sessionId === session.id))
    .sort((a, b) => (b.completedAt || b.updatedAt) - (a.completedAt || a.updatedAt));
}

export function filterJournal(entries, query = '', repeatOnly = false) {
  const search = normalize(query).trim();
  return entries.filter(entry => (!repeatOnly || entry.repeat) && (!search || normalize([entry.title, entry.notes, entry.date, journalDate(entry.date), ...entry.products.flatMap(item => [item.name, item.brand])].join(' ')).includes(search)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}
