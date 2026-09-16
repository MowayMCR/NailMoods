import { profileDefaults, normalizePolishCount } from './creationEngine.js';
import { validPersonalSnapshot } from './personalization.js';

export const CREATION_KEY = 'nm-creation-v1';

// Reading the home preview must never replace the user's current generation.
export function readCreationState(storage, profile = {}) {
  const fallback = { options: profileDefaults(profile), generated: false, seed: 0, inventory: '', selected: null, learning: null, learningStamp: 'legacy' };
  try {
    const saved = JSON.parse(storage.getItem(CREATION_KEY) || 'null');
    if (!saved || typeof saved.options !== 'object' || !saved.options || Array.isArray(saved.options)) return fallback;
    const options = { ...fallback.options, ...saved.options };
    if (!['usual', 'change', 'surprise'].includes(options.mode)) options.mode = 'usual';
    if (!Array.isArray(options.constraints)) options.constraints = [];
    if (options.constraints.includes('noStickers')) {
      options.decorations = 'without';
      options.constraints = options.constraints.filter(value => value !== 'noStickers');
    }
    if (![0, 1, 2].includes(options.level)) options.level = fallback.options.level;
    if (![15, 30, 45, 60, 90].includes(options.duration)) options.duration = fallback.options.duration;
    options.polishCount = normalizePolishCount(options.polishCount);
    const learning = validPersonalSnapshot(saved.learning) ? saved.learning : null;
    return { ...fallback, ...saved, options, learning, learningStamp: (learning || saved.learning === null) && typeof saved.learningStamp === 'string' ? saved.learningStamp : 'legacy' };
  } catch { return fallback; }
}
