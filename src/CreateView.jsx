import {recordRuntimeEvent} from './support/diagnostics';
import MoodGlyph from './MoodGlyph';
import { productColor } from './colorAnalysis';
import IdeaProducts from './IdeaProducts';
import ColorSelection from './ColorSelection';
import { generateInspirations } from './freeInspiration';
import { useStorage } from './StorageContext';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Shuffle, Sparkles, Sun, Palette, CalendarDays, Clock3, Brush, SlidersHorizontal, ChevronRight, Check, ArrowRight, RotateCcw, Package, BookmarkCheck, Sticker, Search, Wand2, Send } from 'lucide-react';
import { createSuggestions, inventoryStamp, profileDefaults, selectedTechniques } from './creationEngine';
import NailPreview from './NailPreview';
import PhotoInspirationFlow from './PhotoInspirationFlow';
import './creation.css';
import Sheet from './Sheet';
import InspirationView, { FavoritesView, ProjectsView } from './InspirationView';
import { findIdea, snapshotIdea } from './inspirations';
import { decorationChoice, isDecoration } from './decorations';
import DecorationPicker, { DecorationPhoto } from './DecorationPicker';
import { PersonalizationSummary } from './PersonalizationView';
import { CREATION_KEY as KEY, readCreationState } from './creationState';
import { track } from './analytics/analytics';
import { TAXONOMY, querySuggestions } from './social/tagTaxonomy';

const modes = [
  { id: 'usual', title: 'Comme d’habitude', subtitle: 'Mes favoris, mon univers', icon: Heart },
  { id: 'change', title: 'Envie de changement', subtitle: 'Explorer d’autres associations', icon: Shuffle },
  { id: 'surprise', title: 'Surprends-moi', subtitle: 'Une association inattendue', icon: Sparkles },
];
const levels = ['Très simple', 'Un peu de détail', 'À l’aise'];
const limits = [['noDrawing', 'Sans dessin', 'Pas de French, de lignes ou de pois dessinés.'], ['noLamp', 'Sans lampe', 'Uniquement les vernis classiques.'], ['favorites', 'Vernis favoris uniquement', 'Les couleurs marquées d’un cœur.']];
const durationLabel = value => value === 90 ? '90 min max' : value + ' min max';
const polishCountLabel = value => value === 'auto' ? 'Automatique' : value + ' vernis';
const polishCountHints = { auto: 'Des associations de 1 à 5 couleurs.', 1: 'Un seul vernis coloré.', 2: 'Duos, accents et détails.', 3: 'Un trio à répartir sur les ongles.', 4: 'Quatre vernis dans une même composition.', 5: 'Un vernis différent sur chaque ongle.' };

export default function CreateView({ onPublish, onShareToPro, onSaveIdea, onSaveProject, onJournalIdea, entryOptions, onEntryConsumed, onRename, onEquipment, items, profile, onCollection, route, library, onOpen, onFavorite, onSelect, onRoute, onTutorial, onDone, tutorials, personalModel, personalSettings, onPersonalization }) {
  const browserStorage=useStorage();
  const [state, setState] = useState(() => { const saved = readCreationState(browserStorage, profile); return entryOptions ? { ...saved, options: { ...saved.options, ...entryOptions, ...(entryOptions.intent === 'inspire' ? { requiredColorIds: [] } : {}) }, generated: false, selected: null } : saved; });
  useEffect(() => { if (entryOptions) onEntryConsumed(); }, []);
  const [picker, setPicker] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [storageError, setStorageError] = useState(false);
  const resultAnchor = useRef(null);
  const options = useMemo(() => ({ ...state.options, intent: state.options.intent || (items.some(i => ['Vernis', 'Semi-permanent', 'Gel'].includes(i.type)) ? 'collection' : 'inspire') }), [state.options, items]);
  const stamp = useMemo(() => inventoryStamp(items), [items]);
  const activeRun = state.generated && state.inventory === stamp;
  const liveLearning = personalSettings.enabled ? personalModel.ranking : null;
  const liveStamp = personalSettings.enabled ? personalModel.stamp : 'off';
  const learning = activeRun ? state.learning : liveLearning;
  const report = useMemo(() => generateInspirations(items, profile, options, state.seed || 1, 4, learning), [items, profile, options, state.seed, learning]);
  const pendingLearning = activeRun && state.learningStamp !== liveStamp && (state.learning || liveLearning);
  const chosen = activeRun && report.results.find(idea => idea.id === state.selected);
  const requiredIds = Array.isArray(options.requiredColorIds) ? options.requiredColorIds.map(String) : [];
  const selectedColors = items.filter(item => requiredIds.includes(String(item.id)));
  const decorations = decorationChoice(options);
  const chosenTechniques = selectedTechniques(options);
  const techniqueSummary = chosenTechniques.length ? chosenTechniques.map(value => ({ french: 'French', leopard: 'Léopard', tortoiseshell: 'Tortoise', blooming: 'Blooming', chrome: 'Chrome', glazed: 'Glazed', 'cat-eye': 'Cat Eye', 'velvet-magnetic': 'Velvet', aura: 'Aura', 'gel-3d': 'Gel 3D', rhinestones: 'Strass', charms: 'Charms', jelly: 'Jelly', 'glass-nails': 'Glass nails', marble: 'Marbré' })[value] || value).join(' · ') : 'Libre';
  const missingLamp = report.blocked.some(entry => entry.reason === 'Lampe UV / LED à renseigner dans le matériel.');
  const missingMagnet = report.blocked.some(entry => entry.reason === 'Aimant cat-eye à renseigner dans le matériel.');
  const selectedDecoration = report.tools.stickers.find(item => String(item.id) === decorations.id);
  const decorationLabel = decorations.mode === 'without' ? 'Sans décorations' : decorations.mode === 'with' ? decorations.id ? selectedDecoration?.name || 'À choisir' : 'Avec mes décorations' : 'Automatique';
  useEffect(() => {
    try { browserStorage.setItem(KEY, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);

  const selections = {
    mood: { title: 'Quelle ambiance ?', icon: Sun, label: 'Ambiance', searchable: true, values: [...new Set(['Douce', 'Mystérieuse', 'Chic', 'Joyeuse', 'Audacieuse', 'Au calme', ...TAXONOMY.moods])], placeholder: 'Douce, glamour, sombre…' },
    style: { title: 'Quel style ?', icon: Palette, label: 'Style', searchable: true, values: [...new Set(['Libre', ...(Array.isArray(profile.styles) ? profile.styles : []), ...TAXONOMY.aesthetics, ...TAXONOMY.themes])], placeholder: 'Witchy, clean girl, cottagecore…' },
    technique: { title: 'Quelles techniques ?', icon: Wand2, label: 'Techniques', searchable: true, multi: true, values: ['Libre', ...TAXONOMY.techniques], placeholder: 'French, léopard, tortoise…' },
    techniquePlacement: { title: 'Comment les répartir ?', icon: Wand2, label: 'Répartition', values: ['auto', 'all', 'accent', 'french', 'mix'], format: value => ({ auto: 'Suggestion NailMoods', all: 'Sur toute la pose', accent: 'Un accent nail', french: 'Dans la French', mix: 'Pose mix & match · 5 ongles' })[value] || 'Suggestion NailMoods' },
    occasion: { title: 'Pour quelle occasion ?', icon: CalendarDays, label: 'Occasion', values: ['Tous les jours', 'Travail', 'Soirée', 'Événement', 'Week-end'] },
    duration: { title: 'Combien de temps ?', icon: Clock3, label: 'Temps', values: [15, 30, 45, 60, 90], format: durationLabel },
    polishCount: { title: 'Combien de vernis ?', icon: Palette, label: 'Nombre de vernis', values: ['auto', 1, 2, 3, 4, 5], format: polishCountLabel },
    level: { title: 'Quel niveau de détail ?', icon: Brush, label: 'Difficulté', values: [0, 1, 2], format: value => levels[value] },
  };

  function openPicker(key) { setPickerQuery(''); setPicker(key); }
  const pickerValues = picker && selections[picker] ? selections[picker].values.filter(value => {
    const needle = pickerQuery.trim();
    if (!needle) return true;
    return String(value).toLocaleLowerCase('fr').includes(needle.toLocaleLowerCase('fr')) || querySuggestions(needle, 100).some(tag => tag.label === value);
  }) : [];

  function change(patch) {
    if(patch.intent==='photos'&&(!browserStorage.accountScoped||!['plus','pro'].includes(browserStorage.accountTier)))track('feature_locked',{});
    if(patch.intent)track('create_mode_selected',{mode:patch.intent==='collection'?'my_collection':'inspire_me'},{screen:'create'});
    if (patch.intent === 'inspire') patch = { ...patch, requiredColorIds: [] };
    setState(previous => ({ ...previous, options: { ...previous.options, ...patch }, generated: false, selected: null }));
  }
  function toggleTechnique(value) {
    if (value === 'Libre') { change({ techniques: [], technique: undefined }); return; }
    const active = (options.techniques || []).includes(value);
    change({ techniques: active ? options.techniques.filter(item => item !== value) : [...(options.techniques || []), value].slice(0, 4), technique: undefined });
  }
  function generate() {
    recordRuntimeEvent('generation','ok');
    const started=performance.now();
    track(state.generated?'generation_regenerated':'generation_started',{difficulty:String(options.level),number_of_colors:options.polishCount==='auto'?0:Number(options.polishCount),render_mode:'illustrated',used_collection:options.intent==='collection'},{screen:'create'});
    setState(previous => ({ ...previous, generated: true, inventory: stamp, seed: (Number(previous.seed) || 0) + 1, selected: null, learning: liveLearning, learningStamp: liveStamp }));
    track('generation_succeeded',{difficulty:String(options.level),number_of_colors:report.results.length,render_mode:'illustrated',used_collection:options.intent==='collection'},{screen:'create',duration_ms:Math.round(performance.now()-started),success:true});
    requestAnimationFrame(() => resultAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const completedKeys = new Set(tutorials.filter(session => session.status === 'completed').map(session => session.idea.key));
  const openedKey = route.startsWith('#inspiration/') ? route.slice('#inspiration/'.length) : null;
  const opened = openedKey && findIdea(library, openedKey);
  if (route === '#favoris') return <FavoritesView completedKeys={completedKeys} favorites={library.favorites} items={items} onOpen={onOpen} onFavorite={onFavorite} onBack={() => onRoute('create')} />;
  if (route === '#projets') return <ProjectsView projects={library.projects || []} items={items} onOpen={onOpen} onBack={() => { change({ intent: 'photos' }); onRoute('create'); }} />;
  if (opened) return <InspirationView onPublish={patch=>onPublish(opened,patch)} onShareToPro={onShareToPro} onSaveIdea={() => onSaveIdea(opened)} onRename={title => onRename(opened.key, title)} learning={liveLearning} key={opened.key} idea={opened} items={items} profile={profile} favorite={library.favorites.some(idea => idea.key === opened.key)} selected={library.selected?.key === opened.key} onFavorite={() => onFavorite(opened)} onSelect={() => { const clear = library.selected?.key === opened.key; if (onSelect(opened, clear)) setState(previous => ({ ...previous, selected: clear ? null : opened.id })); }} onOpen={onOpen} onBack={() => onRoute('create')} onFavorites={() => onRoute('favorites')} onCollection={onCollection} onTutorial={() => onTutorial(opened)} onDone={() => onDone(opened)} completed={completedKeys.has(opened.key)} tutorialExists={tutorials.some(session => session.idea.key === opened.key && session.status !== 'completed')} />;
  if (openedKey) return <section className="creationEmpty"><h1>Cette fiche n’est plus disponible</h1><p>Retrouve tes favoris ou compose une nouvelle inspiration.</p><button onClick={() => onRoute('favorites')}>Mes favoris</button><button onClick={() => onRoute('create')}>Créer une inspiration</button></section>;

  if (options.intent === 'photos' && (!browserStorage.accountScoped || !['plus','pro'].includes(browserStorage.accountTier))) return <section className="creationEmpty"><h1>Créer depuis mes photos · Plus</h1><p>Compose tes projets depuis 1 à 4 inspirations avec Plus ou Pro. Tes projets déjà enregistrés restent consultables.</p><button onClick={()=>onRoute('profile')}>Mon compte</button><button onClick={()=>change({intent:'inspire'})}>Créer une inspiration illustrée</button></section>;
  if (options.intent === 'photos') return <div className="creationPage photoCreationPage">
    <section className="creationHero photoCreationHero"><div className="inspirationIntent" aria-label="Mon intention"><button aria-pressed={false} onClick={() => change({ intent: 'inspire' })}>Inspire-moi</button><button aria-pressed={false} onClick={() => change({ intent: 'collection' })}>Avec ma collection</button><button aria-pressed={true} onClick={() => change({ intent: 'photos' })}>🖼️ À partir de photos</button></div>
      <span className="creationEyebrow"><Sparkles /> CRÉER DEPUIS MES INSPIRATIONS</span><h1>Des références,<br /><em>une idée nouvelle.</em></h1><p>Analyse la palette et la matière, puis recompose sans recopier.</p>
    </section>
    <PhotoInspirationFlow onShareToPro={onShareToPro} items={items} profile={profile} onSaveProject={onSaveProject} onJournalIdea={onJournalIdea} onOpen={onOpen} onProjects={() => onRoute('projects')} />
  </div>;

  return <div className="creationPage">
    <section className="creationHero"><div className="inspirationIntent" aria-label="Mon intention"><button aria-pressed={options.intent === 'inspire'} onClick={() => change({ intent: 'inspire' })}>Inspire-moi</button><button aria-pressed={options.intent === 'collection'} onClick={() => change({ intent: 'collection' })}>Avec ma collection</button><button aria-pressed={false} onClick={() => change({ intent: 'photos' })}>🖼️ À partir de photos</button></div>
      <span className="creationEyebrow"><Sparkles /> L’ENVIE DU JOUR</span>
      <h1>Et si on créait<br /><em>ta prochaine pose ?</em></h1>
      <p>Des idées tout de suite, avec ou sans collection.</p>
      <button className="profileApply" onClick={() => change(profileDefaults(profile))}>Utiliser les préférences de mon profil</button><button className="homePrimary quickGenerate" onClick={generate}><Sparkles />Générer une idée<ArrowRight /></button><div className="creationProfile">{[profile.shape, profile.length, profile.level].filter(Boolean).map(value => <span key={value}>{value}</span>)}</div>
    </section>

    <button className="creationSaved" onClick={() => onRoute('favorites')}><span><Heart />Mes inspirations favorites</span><small>{library.favorites.length} idée{library.favorites.length > 1 ? 's' : ''}</small><ChevronRight /></button>
    <button className="creationSaved" onClick={() => onRoute('projects')}><span><BookmarkCheck />Mes projets</span><small>{(library.projects || []).length} projet{(library.projects || []).length > 1 ? 's' : ''}</small><ChevronRight /></button>
    <PersonalizationSummary model={personalModel} settings={personalSettings} onOpen={onPersonalization} />
    <section className="creationSection">
      <div className="creationSectionTitle"><span>01</span><h2>De quoi as-tu envie ?</h2></div>
      <div className="creationModes">{modes.map(({ id, title, subtitle, icon: Icon }) => <button key={id} className={options.mode === id ? 'selected' : ''} aria-pressed={options.mode === id} onClick={() => change({ mode: id })}>
        <Icon /><span><b>{title}</b><small>{subtitle}</small></span>{options.mode === id ? <Check className="modeCheck" /> : <ChevronRight className="modeCheck" />}
      </button>)}</div>
      {options.mode === 'surprise' && <div className="surpriseChoices" aria-label="Degré de surprise">
        {[['Safe', 'Un petit pas'], ['Creative', 'Plus de fantaisie'], ['Chaos', 'J’ose les contrastes']].map(([value, label]) => <button key={value} aria-pressed={options.surprise === value} className={options.surprise === value ? 'on' : ''} onClick={() => change({ surprise: value })}><b>{value}</b><small>{label}</small></button>)}
        <p>Tes choix guident les propositions. Les adaptations sont indiquées avec les idées.</p>
      </div>}
    </section>

    <section className="creationSection">
      <div className="creationSectionTitle"><span>02</span><h2>Ajoute ta touche</h2></div>
      <div className="creationTiles creationPrimaryTiles">{['mood', 'style', 'duration', 'level'].map(key => { const choice = selections[key]; return <button key={key} data-choice={key} onClick={() => openPicker(key)}>
        {['mood', 'style'].includes(key) ? <MoodGlyph value={options[key]} /> : <choice.icon />}<small>{choice.label}</small><b>{choice.format ? choice.format(options[key]) : options[key]}</b><ChevronRight className="tileArrow" />
      </button>; })}</div>
      <details className="creationAdvanced"><summary><span><SlidersHorizontal />Personnaliser ma pose</span><small>Technique, teintes, décorations et limites</small></summary>
        <div className="creationTiles">{['technique', ...(chosenTechniques.length ? ['techniquePlacement'] : []), 'occasion', 'polishCount'].map(key => { const choice = selections[key]; return <button key={key} data-choice={key} onClick={() => openPicker(key)}>
          <choice.icon />{key === 'polishCount' && <span className="countPreview" aria-hidden="true">{Array.from({ length: options.polishCount === 'auto' ? 5 : Number(options.polishCount) }, (_, index) => <svg key={index} viewBox="0 0 16 30" fill="none" focusable="false"><rect x="5" y="1" width="6" height="10" rx="1.5" fill="currentColor" /><path d="M5 12h6l3 4v11a2 2 0 0 1-2-2H4a2 2 0 0 1-2-2V16z" fill="var(--soft)" stroke="currentColor" strokeWidth="1.2" /><path d="M5 19v6" stroke="currentColor" strokeOpacity=".35" strokeLinecap="round" /></svg>)}</span>}<small>{choice.label}</small><b>{key === 'technique' ? techniqueSummary : choice.format ? choice.format(options[key]) : options[key] || 'Libre'}</b><ChevronRight className="tileArrow" />
        </button>; })}
          <button className="creationDecorationsTile" onClick={() => setPicker('decorations')}><Sticker /><small>Décorations</small><b>{decorationLabel}</b><ChevronRight className="tileArrow" /></button>
          <button className="creationLimitsTile" onClick={() => setPicker('constraints')}><SlidersHorizontal /><small>Mes limites</small><b>{options.constraints.length ? options.constraints.length + ' choix' : 'Aucune limite'}</b><ChevronRight className="tileArrow" /></button>
        </div>
        <button className="detailSecondary creationColorsButton" onClick={() => setPicker('colors')}>Choisir mes teintes{selectedColors.length ? ' · ' + selectedColors.length : ''}</button>
        {selectedColors.length > 0 && <div className="ideaProducts creationSelectedColors">{selectedColors.map(item => <span key={item.id}><i style={{ background: productColor(item) }} />{item.name}</span>)}</div>}
        {requiredIds.length > selectedColors.length && <p className="creationHint">Une teinte sélectionnée a été retirée. Les idées utilisent les couleurs encore disponibles.</p>}
      </details>
      {options.constraints.length > 0 && <div className="creationLimits">{limits.filter(([key]) => options.constraints.includes(key)).map(([key, label]) => <span key={key}>{label}</span>)}</div>}
    </section>
    <section className="creationInventory">
      <Package /><div><b>{options.intent === 'collection' ? 'À partir de ta collection' : 'Ta personnalisation, quand tu veux'}</b><p>{report.inventoryColors} couleur{report.inventoryColors > 1 ? 's' : ''} · {report.tools.equipment.length} matériel{report.tools.equipment.length > 1 ? 's' : ''} & accessoires</p></div><button onClick={onCollection} aria-label="Ouvrir ma collection"><ChevronRight /></button>
    </section>
    {options.intent === 'collection' && (report.blocked.length > 0 || report.effects.length > 0) && <details className="creationReadiness">
      <summary>{report.blocked.length + report.effects.length} produit{report.blocked.length + report.effects.length > 1 ? 's' : ''} non retenu{report.blocked.length + report.effects.length > 1 ? 's' : ''} pour cette envie</summary>
      <ul>{report.blocked.map(({ item, reason }) => <li key={item.id}><b>{item.name}</b><span>{reason}</span></li>)}{report.effects.map(item => <li key={item.id}><b>{item.name}</b><span>Effet à appliquer sur une base : sa compatibilité et ses accessoires restent à préciser. Il n’est pas utilisé comme couleur seule.</span></li>)}</ul>
      <button onClick={onCollection}>Voir mes fiches produits <ArrowRight /></button>
    </details>}
    {state.generated && !activeRun && <p className="creationNotice" role="status">Ta collection a changé. Relance les idées pour utiliser son contenu actuel.</p>}
    {pendingLearning && <p className="creationNotice" role="status">Tes retours ou tes réglages ont changé. Recompose tes idées pour les prendre en compte.</p>}
    {report.requestedIntent === 'collection' && report.intent === 'inspire' && <p className="creationNotice">Ta collection ne contient pas encore de couleur utilisable : voici des inspirations libres, à personnaliser quand tu veux.</p>}
    {report.adjusted && <p className="creationNotice">Voici une alternative avec un nombre de couleurs, des décorations ou un temps adaptés aux possibilités disponibles.</p>}
    <button className="creationGenerate" onClick={generate}><Sparkles />{activeRun ? 'Une autre idée' : 'Générer une idée'}<ArrowRight /></button>
    <button className="coachLink" onClick={onCollection}>Personnaliser avec mes couleurs et mon matériel<ChevronRight /></button>
    <p className="creationTimeNote">Temps indicatifs pour la couleur et la décoration, hors préparation, dépose et séchage.</p>
    {storageError && <p className="formError" role="alert">Tes choix restent disponibles ici, mais n’ont pas pu être sauvegardés sur cet appareil.</p>}

    {activeRun && <section className="creationResults" ref={resultAnchor} aria-labelledby="ideas-title">
      <div className="creationSectionTitle"><span>03</span><div><small>{report.intent === 'inspire' ? 'INSPIRATIONS LIBRES · COULEURS DE STYLE' : 'AVEC LES TEINTES DE TA COLLECTION'}</small><h2 id="ideas-title">{report.results.length} idée{report.results.length > 1 ? 's' : ''} pour toi</h2></div></div>
      {report.results.length < 4 && <p className="creationNotice">Ta collection et tes choix permettent {report.results.length} proposition{report.results.length > 1 ? 's' : ''} distincte{report.results.length > 1 ? 's' : ''} pour le moment. Aucun produit n’a été ajouté à ta collection.</p>}
      <p className="creationHint">{report.intent === 'inspire' ? 'Couleurs d’inspiration, sans référence commerciale ni produit ajouté à ta collection.' : 'Aperçus avec tes teintes enregistrées.'} Le rendu bascule automatiquement vers le réalisme quand la matière, la lumière ou le relief le demandent. Vérifie le protocole des produits.</p>
      {chosen && <button className="chosenIdea" onClick={() => onOpen(chosen, chosen.options)}><BookmarkCheck /><span><b>Ton idée retenue</b><small>{chosen.title} · {chosen.palette.map(item => item.name).join(' + ')}</small></span><ChevronRight /></button>}
      <div className="ideaList">{report.results.map((idea, index) => <article className={'ideaCard ideaCardOpenable ' + (chosen?.id === idea.id ? 'chosen' : '')} key={idea.id} onClick={() => onOpen(idea, idea.options)}>
        <div className="ideaTopline"><span><MoodGlyph value={idea.options?.mood || options.mood} /> ENVIE {String(index + 1).padStart(2, '0')}</span><span><Clock3 />≈ {idea.minutes} min</span></div>
        <NailPreview idea={idea} controls />
        <div className="ideaBody">{completedKeys.has(snapshotIdea(idea, idea.options).key) && <span className="ideaDoneBadge"><Check />Déjà réalisée</span>}<div className="ideaBadges"><span className="ideaDifficulty">{levels[idea.rank]}</span><span className="ideaPolishCount">{polishCountLabel(idea.polishCount)}</span></div><h3>{idea.title}</h3><p>{idea.description}</p>
          <IdeaProducts idea={idea} items={items} onCollection={onCollection} /><div className="ideaProducts">{idea.palette.map(item => <span key={item.id}><i style={{ background: item.color }} />{item.name}</span>)}</div>
          {idea.resources.filter(isDecoration).map(item => <div className="ideaDecoration" key={item.id}><DecorationPhoto item={item} /><div><small>MA DÉCORATION</small><b>{item.name}</b><span>Motif schématique sur les ongles</span></div></div>)}
          {idea.requirements?.length > 0 && <p className="creationNotice">Pour la réaliser : {idea.requirements.map(r => r.name).join(' · ')}</p>}
          {idea.resources.some(item => !isDecoration(item)) && <div className="ideaEquipment"><small>AVEC MON MATÉRIEL</small><p>{idea.resources.filter(item => !isDecoration(item)).map(item => item.name).join(' · ')}</p></div>}
          <ul className="ideaReasons">{idea.reasons.map(reason => <li key={reason}><Check />{reason}</li>)}</ul>
          <div className="ideaCardActions"><button className="chooseIdea" aria-pressed={chosen?.id === idea.id} onClick={event => { event.stopPropagation(); const saved = snapshotIdea(idea, idea.options); const clear = chosen?.id === idea.id; if (onSelect(saved, clear)) setState(previous => ({ ...previous, selected: clear ? null : idea.id })); }}>{chosen?.id === idea.id ? <Check /> : <BookmarkCheck />}{chosen?.id === idea.id ? 'Idée retenue' : 'Choisir cette idée'}</button><button className="ideaHeart" aria-label={(library.favorites.some(saved => saved.key === snapshotIdea(idea, idea.options).key) ? 'Retirer des favoris : ' : 'Ajouter aux favoris : ') + idea.title} aria-pressed={library.favorites.some(saved => saved.key === snapshotIdea(idea, idea.options).key)} onClick={event => { event.stopPropagation(); onFavorite(snapshotIdea(idea, idea.options)); }}><Heart fill={library.favorites.some(saved => saved.key === snapshotIdea(idea, idea.options).key) ? 'currentColor' : 'none'} /></button></div>
        </div>
      </article>)}</div>
      {report.total > report.results.length && <button className="moreIdeas" onClick={generate}><RotateCcw />Proposer d’autres associations</button>}
    </section>}

    {picker === 'colors' && <ColorSelection items={items} selected={requiredIds} onClose={() => setPicker(null)} onChange={ids => change({ requiredColorIds: ids, intent: ids.length ? 'collection' : options.intent, polishCount: 'auto' })} />}
    {picker === 'decorations' && <DecorationPicker decorations={report.tools.stickers} choice={decorations} onClose={() => setPicker(null)} onCollection={() => { setPicker(null); onCollection(); }} onChange={(mode, id = '') => change({ decorations: mode, decorationId: id, constraints: options.constraints.filter(value => value !== 'noStickers') })} />}
    {picker && !['decorations', 'colors'].includes(picker) && <Sheet className="creationSheet" eyebrow="MON ENVIE DU JOUR" title={picker === 'constraints' ? 'Tes limites du jour' : selections[picker].title} onClose={() => setPicker(null)}>
      {picker === 'polishCount' && <p className="creationPickerHelp">Choisis un nombre exact de vernis colorés par proposition. Les stickers, bases et top coats ne sont pas comptés.</p>}
      {selections[picker]?.searchable && <label className="creationPickerSearch"><Search /><input autoFocus aria-label={'Rechercher ' + selections[picker].label.toLocaleLowerCase('fr')} value={pickerQuery} onChange={event => setPickerQuery(event.target.value)} placeholder={selections[picker].placeholder} /></label>}
      <div className={'creationOptions ' + (selections[picker]?.searchable ? 'creationTagOptions' : '')}>
        {picker === 'constraints' && limits.map(([key, label, detail]) => <button key={key} aria-pressed={options.constraints.includes(key)} className={options.constraints.includes(key) ? 'on' : ''} onClick={() => change({ constraints: options.constraints.includes(key) ? options.constraints.filter(value => value !== key) : [...options.constraints, key] })}><span><b>{label}</b><small>{detail}</small></span>{options.constraints.includes(key) && <Check />}</button>)}
        {picker === 'technique' && <><p className="creationPickerHelp">Choisis jusqu’à 4 techniques : la visualisation répartit réellement les effets sur la pose.</p>{pickerValues.map(value => <button key={value} className={value !== 'Libre' && (options.techniques || []).includes(value) ? 'on' : ''} aria-pressed={value !== 'Libre' && (options.techniques || []).includes(value)} onClick={() => toggleTechnique(value)}><span>{value}</span>{value !== 'Libre' && (options.techniques || []).includes(value) && <Check />}</button>)}<button className="creationGenerate" onClick={() => setPicker(null)}><Check />Garder ces techniques</button></>}
        {picker !== 'constraints' && picker !== 'technique' && pickerValues.map(value => <button key={value} className={options[picker] === value ? 'on' : ''} aria-pressed={options[picker] === value} onClick={() => { change({ [picker]: value }); setPicker(null); }}>{['mood', 'style'].includes(picker) && <MoodGlyph value={value} />}<span>{selections[picker].format ? selections[picker].format(value) : value}{picker === 'polishCount' && <small>{polishCountHints[value]}</small>}</span>{options[picker] === value && <Check />}</button>)}
        {picker !== 'constraints' && selections[picker]?.searchable && !pickerValues.length && <p className="creationNoResults">Aucun tag correspondant.</p>}
      </div>
      {picker === 'constraints' && <button className="creationGenerate" onClick={() => setPicker(null)}><Check />Garder ces choix</button>}
    </Sheet>}
  </div>;
}
