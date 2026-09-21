import test from 'node:test';
import assert from 'node:assert/strict';
import { analysePhotoPixels, combinePhotoAnalyses, compatiblePhotoTechniques, describeVisualAnalysis, generatePhotoIdeas, matchPhotoCatalogProducts, matchPhotoProducts, validatePhotoImportFiles } from '../src/photoInspiration.js';
import { PHOTO_ANALYTICS_EVENTS, photoAnalyticsMetadata } from '../src/photoAnalytics.js';
import { renderingForIdea, techniqueDefinition, TECHNIQUE_CATALOG } from '../src/techniqueRendering.js';
import { PHOTO_MATERIAL_ENGINE_VERSION, REALISTIC_RENDER_PROFILES, realisticRenderProfile } from '../src/realisticRendering.js';
import { readInspirations, saveProject, snapshotIdea, validIdea } from '../src/inspirations.js';
import { newJournalEntryFromIdea, putJournalEntry, readJournal } from '../src/journal.js';

function pixels(width = 20, height = 20) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (y * width + x) * 4;
    const bright = (x + y) % 7 === 0;
    data[at] = bright ? 250 : x < width / 2 ? 112 : 216;
    data[at + 1] = bright ? 235 : x < width / 2 ? 54 : 145;
    data[at + 2] = bright ? 245 : x < width / 2 ? 80 : 170;
    data[at + 3] = 255;
  }
  return { data, width, height };
}

test('one to four photos yield bounded colors and explicitly indicative visual observations', () => {
  const first = analysePhotoPixels(pixels());
  assert.ok(first.colors.length >= 1 && first.colors.length <= 5);
  assert.equal(first.confidence, 'indicative');
  for (const field of ['shapes', 'patterns', 'french', 'materials', 'decorations']) assert.equal(typeof first[field], 'string');
  const combined = combinePhotoAnalyses([first, first, first, first]);
  assert.equal(combined.photoCount, 4);
  assert.ok(combined.probableTechniques.length >= 1);
  assert.ok(combined.effects.length >= 1);
});

test('render selection is automatic and preserves the required technique data', () => {
  const expected = {
    'cat-eye': ['required', 'realistic'],
    'velvet-magnetic': ['required', 'realistic'],
    chrome: ['required', 'realistic'],
    'gel-3d': ['required', 'realistic'],
    rhinestones: ['required', 'realistic'],
    charms: ['required', 'realistic'],
    'glass-nails': ['required', 'realistic'],
    jelly: ['recommended', 'realistic'],
    glazed: ['recommended', 'realistic'],
    'aurora-holographic': ['recommended', 'realistic'],
    glitter: ['recommended', 'realistic'],
    aura: ['recommended', 'realistic'],
    blooming: ['recommended', 'realistic'],
    marble: ['recommended', 'realistic'],
    stamping: ['illustrated', 'illustrated'],
    'micro-french': ['illustrated', 'illustrated'],
    simple: ['illustrated', 'illustrated'],
  };
  assert.equal(TECHNIQUE_CATALOG.length, 18);
  for (const [technique, [realism, defaultMode]] of Object.entries(expected)) {
    const rendering = renderingForIdea({ technique });
    assert.equal(rendering.realism, realism, technique);
    assert.equal(rendering.defaultMode, defaultMode, technique);
    assert.ok(rendering.finish && rendering.relief && rendering.cues.length === 3);
    assert.ok(rendering.references.every(reference => reference.url.startsWith('https://')));
  }
});

test('Cat Eye, Gel 3D, Chrome and Jelly generate testable realistic compositions', () => {
  const analysis = describeVisualAnalysis({ colors: ['#703650', '#d89baa', '#c4a45e'], metrics: { highlightRatio: .14, edgeRatio: .1, saturation: .5 }, count: 2 });
  for (const technique of ['cat-eye', 'gel-3d', 'chrome', 'jelly']) {
    const equipment = {
      'cat-eye': [{ name: 'Aimant Cat Eye', type: 'Matériel', quantity: 1 }],
      'gel-3d': [{ name: 'Gel 3D relief', type: 'Matériel', quantity: 1 }],
      chrome: [{ name: 'Poudre chrome', type: 'Matériel', quantity: 1 }],
      jelly: [],
    }[technique];
    const result = generatePhotoIdeas({ analysis, items: equipment, profile: { shape: 'Amande', length: 'Courte' }, sourceMode: 'open', difficulty: technique === 'gel-3d' ? 2 : 1, technique, nailArt: technique !== 'jelly', nailArtLevel: technique === 'gel-3d' ? 'pro' : 'intermediate' });
    assert.equal(result.ideas.length, 3);
    for (const idea of result.ideas) {
      assert.equal(idea.technique, technique);
      assert.equal(idea.renderMode, 'realistic');
      assert.ok(idea.finish && idea.relief && idea.realismRequired);
      assert.equal(validIdea(snapshotIdea(idea)), true);
      assert.ok(idea.reasons.some(reason => /non copiée/.test(reason)));
    }
  }
  assert.match(techniqueDefinition('cat-eye').cues.join(' '), /directionnel|halo|profondeur/);
  assert.match(techniqueDefinition('gel-3d').cues.join(' '), /épaisseur|ombres|volume/);
});

test('photo-material v3 exposes a distinct physical shader for every priority realistic technique', () => {
  const expected = {
    aura: ['diffuse-airbrush', /halo|dégradé|top coat/],
    'cat-eye': ['magnetic-beam', /magnétique|halo|profondeur/],
    chrome: ['mirror-metal', /miroir|spéculaire|softbox/],
    jelly: ['translucent-jelly', /visible|translucide|humide/],
    glazed: ['pearl-glaze', /nacré|irisé|lisible/],
    'gel-3d': ['raised-clear-gel', /épaisseur|ombre|brillante/],
    glitter: ['reflective-particles', /particules|éclats|suspension/],
    rhinestones: ['faceted-crystal', /facettes|lumière|fixation/],
    charms: ['raised-metal-charm', /métallique|reflet|ombre/],
  };
  assert.equal(PHOTO_MATERIAL_ENGINE_VERSION, 'photo-material-v3');
  assert.equal(Object.keys(REALISTIC_RENDER_PROFILES).length, TECHNIQUE_CATALOG.length);
  for (const [technique, [shader, signalPattern]] of Object.entries(expected)) {
    const profile = realisticRenderProfile(technique);
    const rendering = renderingForIdea({ technique });
    assert.equal(profile.shader, shader, technique);
    assert.match(profile.signals.join(' '), signalPattern, technique);
    assert.equal(rendering.realisticEngine, PHOTO_MATERIAL_ENGINE_VERSION, technique);
    assert.equal(rendering.realisticShader, shader, technique);
    assert.deepEqual(rendering.materialSignals, [...profile.signals], technique);
  }
});

test('collection matches, alternatives and at most three missing shades stay separate', () => {
  const items = [
    { id: 'plum', name: 'Prune', type: 'Semi-permanent', color: '#713750', usage: 'Couleur seule', quantity: 1 },
    { id: 'rose', name: 'Rose', type: 'Semi-permanent', color: '#d99cab', usage: 'Couleur seule', quantity: 1 },
    { id: 'blue', name: 'Bleu', type: 'Semi-permanent', color: '#5579a6', usage: 'Couleur seule', quantity: 1 },
  ];
  const matches = matchPhotoProducts(['#703650', '#d89baa', '#f0df57'], items);
  assert.ok(matches.owned.some(entry => entry.item.id === 'plum'));
  assert.ok(matches.owned.some(entry => entry.item.id === 'rose'));
  assert.ok(matches.alternatives.every(entry => !entry.item.conceptual));
  assert.ok(matches.missing.length <= 3);
});

test('an empty collection no longer blocks generation and documented catalogue references are suggested', () => {
  const analysis = describeVisualAnalysis({ colors: ['#d87999'], metrics: { highlightRatio: .08 }, count: 1 });
  const catalogItems = [{ catalogId: 'real-ref', brand: 'Marque test', name: 'Rose proche', reference: '42', family: 'rose', type: 'Vernis', usage: 'Couleur seule' }];
  const result = generatePhotoIdeas({ analysis, items: [], catalogItems, sourceMode: 'collection', difficulty: 0, nailArt: false });
  assert.ok(result.ideas.length >= 1);
  assert.equal(result.usedCollection, false);
  assert.equal(result.collectionFallback, true);
  assert.equal(result.guidance.toBuy[0].item.catalogId, 'real-ref');
  assert.equal(matchPhotoCatalogProducts(analysis.colors, catalogItems)[0].matchKind, 'family');
});

test('a photo composition persists as a project and can prefill, but not silently save, a journal entry', () => {
  const analysis = describeVisualAnalysis({ colors: ['#703650', '#d89baa'], metrics: { highlightRatio: .08, edgeRatio: .12 }, count: 1 });
  const idea = generatePhotoIdeas({ analysis, items: [], sourceMode: 'open', difficulty: 1, technique: 'jelly' }).ideas[0];
  const library = saveProject({ favorites: [], recent: [], selected: null }, idea);
  const restored = readInspirations({ getItem: () => JSON.stringify(library) });
  assert.equal(restored.projects.length, 1);
  assert.equal(restored.projects[0].isProject, true);
  assert.equal(restored.projects[0].photoSource.count, 1);
  const draft = newJournalEntryFromIdea('journal-photo', restored.projects[0], Date.UTC(2026, 8, 20));
  assert.equal(draft.idea.key, restored.projects[0].key);
  assert.equal(draft.title, restored.projects[0].title);
  assert.equal(readJournal({ getItem: () => null }).entries.length, 0, 'opening the editor is not a journal write');
  const saved = putJournalEntry({ entries: [], hiddenSessions: [] }, draft, Date.UTC(2026, 8, 20));
  assert.equal(saved.store.entries.length, 1);
});

test('one to four JPEG, PNG and WebP imports preserve order and reject duplicates, bad formats, excess and oversized files', () => {
  const file = (name, type, size = 1000, lastModified = 1) => ({ name, type, size, lastModified });
  for (let count = 1; count <= 4; count++) {
    const files = Array.from({ length: count }, (_, index) => file(`photo-${index}.jpg`, 'image/jpeg', 1000 + index, index));
    const result = validatePhotoImportFiles(files, [], 4);
    assert.deepEqual(result.accepted.map(entry => entry.name), files.map(entry => entry.name));
    assert.equal(result.rejected.length, 0);
  }
  const png = file('image.png', 'image/png', 1000, 2), webp = file('image.webp', 'image/webp', 1000, 3);
  assert.equal(validatePhotoImportFiles([png, webp], [], 4).accepted.length, 2);
  assert.equal(validatePhotoImportFiles([png], ['image.png:1000:2'], 4).rejected[0].reason, 'duplicate');
  assert.equal(validatePhotoImportFiles([file('bad.gif', 'image/gif')], [], 4).rejected[0].reason, 'format');
  assert.equal(validatePhotoImportFiles([file('huge.jpg', 'image/jpeg', 21 * 1024 * 1024)], [], 4).rejected[0].reason, 'too_large');
  assert.equal(validatePhotoImportFiles(Array.from({ length: 5 }, (_, index) => file(`${index}.jpg`, 'image/jpeg', 1000, index)), [], 4).rejected[0].reason, 'limit');
});

test('nail art choice and level control compatible techniques without imposing image suggestions', () => {
  const suggestedIds = ['gel-3d', 'cat-eye', 'aura'];
  const noArt = compatiblePhotoTechniques({ nailArt: false, items: [], suggestedIds });
  assert.ok(noArt.some(item => item.id === 'simple'));
  assert.ok(noArt.every(item => !['gel-3d', 'cat-eye'].includes(item.id)));
  const simple = compatiblePhotoTechniques({ nailArt: true, level: 'simple', items: [], suggestedIds });
  assert.ok(simple.every(item => !['gel-3d', 'aura', 'cat-eye'].includes(item.id)));
  const intermediate = compatiblePhotoTechniques({ nailArt: true, level: 'intermediate', items: [], suggestedIds });
  assert.ok(intermediate.some(item => item.id === 'aura'));
  assert.ok(!intermediate.some(item => item.id === 'cat-eye'));
  const withMagnet = compatiblePhotoTechniques({ nailArt: true, level: 'intermediate', items: [{ name: 'Aimant Cat Eye', type: 'Matériel', quantity: 1 }], suggestedIds });
  assert.ok(withMagnet.some(item => item.id === 'cat-eye'));
  const pro = compatiblePhotoTechniques({ nailArt: true, level: 'pro', items: [], suggestedIds });
  assert.ok(pro.every(item => !['gel-3d', 'charms', 'glass-nails', 'chrome'].includes(item.id)));
});

test('without nail art generation stays light and saved projects retain the chosen decisions and source thumbnails', () => {
  const analysis = describeVisualAnalysis({ colors: ['#703650', '#d89baa'], metrics: { highlightRatio: .08, edgeRatio: .12 }, count: 2 });
  const result = generatePhotoIdeas({ analysis, items: [], sourceMode: 'open', nailArt: false, nailArtLevel: 'simple', difficulty: 0, sourceImages: [{ name: 'one.jpg', src: 'data:image/jpeg;base64,abc' }] });
  assert.ok(result.ideas.every(idea => idea.nailArt === false && idea.nailArtLevel === null));
  assert.ok(result.ideas.every(idea => idea.nails.every(nail => nail.technique !== 'gel-3d')));
  assert.equal(result.ideas[0].photoSources.length, 1);
  const saved = saveProject({ favorites: [], recent: [], projects: [], selected: null }, result.ideas[0]).projects[0];
  assert.equal(saved.nailArt, false);
  assert.equal(saved.sourceMode, 'open_possibilities');
  assert.equal(saved.photoSources[0].name, 'one.jpg');
});

test('photo analytics allow only bounded non-content metadata', () => {
  assert.ok(PHOTO_ANALYTICS_EVENTS.includes('nail_art_choice'));
  assert.ok(PHOTO_ANALYTICS_EVENTS.includes('nail_art_level_selected'));
  assert.deepEqual(photoAnalyticsMetadata({ nail_art: true, level: 'pro', image_count: 4, mode: 'open_possibilities', image: 'secret', prompt: 'private', colors: ['#fff'] }), { nail_art: true, level: 'pro', image_count: 4, mode: 'open_possibilities' });
});
