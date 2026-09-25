import { profileDefaults, normalizePolishCount, selectedTechniques } from './creationEngine.js';
import { validPersonalSnapshot } from './personalization.js';

export const CREATION_KEY = 'nm-creation-v1';

// Reading the home preview must never replace the user's current generation.
export function readCreationState(storage, profile = {}) {
  const fallback = { options: profileDefaults(profile), generated: false, seed: 0, inventory: '', selected: null, learning: null, learningStamp: 'legacy' };
  try {
    const saved = JSON.parse(storage.getItem(CREATION_KEY) || 'null');
    if (!saved || typeof saved.options !== 'object' || !saved.options || Array.isArray(saved.options)) return fallback;
    const options = { ...fallback.options, ...saved.options };
    if (Object.hasOwn(options, 'requiredColorIds')) options.requiredColorIds = Array.isArray(options.requiredColorIds) ? options.requiredColorIds.filter(id => ['string', 'number'].includes(typeof id)).map(String).slice(0, 5) : [];
    if (Object.hasOwn(options, 'techniques')) options.techniques = Array.isArray(options.techniques) ? [...new Set(options.techniques.filter(value => typeof value === 'string' && value.trim() && value !== 'Libre'))].slice(0, 4) : [];
    if (Object.hasOwn(options, 'techniquePlacement') && !['auto', 'all', 'accent', 'french', 'mix'].includes(options.techniquePlacement)) options.techniquePlacement = 'auto';
    if (!['usual', 'change', 'surprise'].includes(options.mode)) options.mode = 'usual';
    if (!Array.isArray(options.constraints)) options.constraints = [];
    if (options.constraints.includes('noStickers')) {
      options.decorations = 'without';
      options.constraints = options.constraints.filter(value => value !== 'noStickers');
    }
    if (![0, 1, 2].includes(options.level)) options.level = fallback.options.level;
    if (options.techniquePlacement === 'mix' && (selectedTechniques(options).length < 2 || Number(options.level) < 2)) options.techniquePlacement = 'auto';
    if (![15, 30, 45, 60, 90].includes(options.duration)) options.duration = fallback.options.duration;
    options.polishCount = normalizePolishCount(options.polishCount);
    const learning = validPersonalSnapshot(saved.learning) ? saved.learning : null;
    return { ...fallback, ...saved, options, learning, learningStamp: (learning || saved.learning === null) && typeof saved.learningStamp === 'string' ? saved.learningStamp : 'legacy' };
  } catch { return fallback; }
}
