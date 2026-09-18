import { generateInspirations } from './freeInspiration.js';
import { createSuggestions } from './creationEngine.js';
import { ideaAvailability } from './inspirations.js';
import { filterJournal, localDate, pendingJournalPoses } from './journal.js';
import { personalRecipeKey } from './personalization.js';

export const homeSeed = (now = Date.now()) => Number(localDate(now).replaceAll('-', ''));

export function homeReadiness(report) {
  if (!report.inventoryColors) return { title: 'Tes premières couleurs', text: 'Ajoute un vernis à ta collection pour composer une idée avec ce que tu possèdes.', action: 'Ajouter mes produits', route: 'collection' };
  if (report.decorationUnavailable) return { title: 'On retrouve ta décoration ?', text: 'La décoration demandée n’est pas disponible. Choisis une autre planche ou ajuste ce choix dans Créer.', action: 'Choisir mes décorations', route: 'create' };
  if (!report.availableColors) return { title: 'Un petit point sur ta collection', text: 'Tes couleurs ne sont pas utilisables avec les choix et le matériel renseignés. Retrouve ce qu’il faut ajuster dans Créer.', action: 'Voir ce qu’il manque', route: 'create' };
  if (report.countUnavailable) return { title: 'On ajuste le nombre de vernis ?', text: 'Le nombre demandé ne peut pas être associé avec les produits disponibles et tes limites actuelles.', action: 'Ajuster mes choix', route: 'create' };
  return { title: 'Un peu plus de temps ?', text: 'Aucune composition ne tient dans le temps choisi. Tu peux ajuster ton envie dans Créer.', action: 'Ajuster mon envie', route: 'create' };
}

export function buildHome({ items, profile, library, tutorials, journal, options, learning = null, seed = homeSeed(), exclude = '' }) {
  const unfinished = tutorials.sessions.filter(session => ['active', 'paused', 'ready'].includes(session.status));
  const byRecent = [...unfinished].sort((a, b) => b.updatedAt - a.updatedAt);
  const resume = unfinished.find(session => session.id === tutorials.activeId && session.status === 'active')
    || byRecent.find(session => session.status === 'active')
    || unfinished.find(session => session.id === tutorials.activeId)
    || byRecent[0] || null;
  const completed = new Set(tutorials.sessions.filter(session => session.status === 'completed').map(session => session.idea.key));
  const retained = library.selected && !completed.has(library.selected.key) && !unfinished.some(session => session.idea.key === library.selected.key) ? library.selected : null;
  const report = generateInspirations(items, profile, options, seed, 12, learning);
  const reserved = new Set([retained, ...unfinished.map(session => session.idea)].filter(Boolean).map(personalRecipeKey));
  const availableIdeas = report.results.filter(idea => !reserved.has(personalRecipeKey(idea)));
  const inspiration = availableIdeas.find(idea => personalRecipeKey(idea) !== exclude) || availableIdeas[0] || null;
  const readiness = report.results.length ? null : homeReadiness(report);
  return {
    resume, retained, inspiration, readiness, report, alternativeCount: availableIdeas.length,
    priority: resume ? 'resume' : retained ? 'retained' : readiness ? 'readiness' : 'create',
    retainedChanges: retained ? ideaAvailability(retained, items).filter(item => item.state !== 'available') : [],
    pending: pendingJournalPoses(journal, tutorials.sessions)[0] || null,
    latest: filterJournal(journal.entries)[0] || null,
    unfinishedCount: unfinished.length,
  };
}
