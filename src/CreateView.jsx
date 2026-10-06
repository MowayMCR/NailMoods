import CollectionContext from './engagement/CollectionContext';
import InternalLab from './aiPlus/InternalLab';
import RenderPrototype from './renderPrototype/RenderPrototype';
import Trainer from './trainer/Trainer';
import {SharedPoseView} from './poseCycle/ProjectShare';
import DiyView from './poseCycle/DiyView';
import PlanningView from './poseCycle/PlanningView';
import OutfitFlow,{outfitEnabled} from './poseCycle/OutfitFlow';
import {surpriseTechniques, updateTechniqueChoice, techniqueWarnings} from './techniqueRules';
import {techniqueGroups, techniqueGroup, techniqueLabel} from './techniqueGroups';
import CreationSources from './CreationSources';
import {recordRuntimeEvent} from './support/diagnostics';
import MoodGlyph from './MoodGlyph';
import { productColor } from './colorAnalysis';
import IdeaProducts from './IdeaProducts';
import ColorSelection from './ColorSelection';
import { generateInspirations, stylePalette } from './freeInspiration';
import { useStorage } from './StorageContext';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Dice5, Shuffle, Sparkles, Sun, Palette, CalendarDays, Clock3, Brush, SlidersHorizontal, ChevronRight, Check, ArrowRight, RotateCcw, Package, BookmarkCheck, Sticker, Search, Wand2, Send } from 'lucide-react';
import { createSuggestions, inventoryStamp, profileDefaults, selectedTechniques } from './creationEngine';
import TapFavorite from './TapFavorite';
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
import NailSetBuilder from './NailSetBuilder';
import ProCreationsPanel from './workspaces/ProCreationsPanel';
import './workspaces/professional.css';
import { useSocial } from './social/SocialContext';
import { applyProCreationConstraint, getVisibleProCreation, listVisibleProCreations, proCreationModes } from './workspaces/proCreationGeneration.js';

const modes = [
  { id: 'usual', title: 'Comme d’habitude', subtitle: 'Mes favoris, mon univers', icon: Heart },
  { id: 'change', title: 'Envie de changement', subtitle: 'Explorer d’autres associations', icon: Shuffle },
  { id: 'surprise', title: 'Surprends-moi', subtitle: 'Une association inattendue', icon: Sparkles },
];
const levels = ['Très simple', 'Un peu de détail', 'Avancé'];
const limits = [['noDrawing', 'Sans dessin', 'Pas de French, de lignes ou de pois dessinés.'], ['noLamp', 'Sans lampe', 'Uniquement les vernis classiques.'], ['favorites', 'Vernis favoris uniquement', 'Les couleurs marquées d’un cœur.']];
const durationLabel = value => value === 90 ? '90 min max' : value + ' min max';
const polishCountLabel = value => value === 'auto' ? 'Automatique' : value + ' vernis';
const polishCountHints = { auto: 'Des associations de 1 à 5 couleurs.', 1: 'Un seul vernis coloré.', 2: 'Duos, accents et détails.', 3: 'Un trio à répartir sur les ongles.', 4: 'Quatre vernis dans une même composition.', 5: 'Un vernis différent sur chaque ongle.' };

export default function CreateView({ onProfileChange, onMoodChange, onPublish, onShareToPro, onIdeaBack, ideaAction, onSaveIdea, onSaveProject, onJournalIdea, entryOptions, onEntryConsumed, onRename, onEquipment, items, profile, onCollection, route, library, onOpen, onFavorite, onSelect, onRoute, onTutorial, onDone, tutorials, personalModel, personalSettings, onPersonalization }) {
  const browserStorage=useStorage();
  const social=useSocial();
  const [state, setState] = useState(() => { const saved = readCreationState(browserStorage, profile); return entryOptions ? { ...saved, options: { ...saved.options, ...entryOptions, ...(entryOptions.intent === 'inspire' ? { requiredColorIds: [] } : {}) }, generated: false, selected: null } : saved; });
  useEffect(() => { if (entryOptions) onEntryConsumed(); }, []);
  const [sourceOpen,setSourceOpen]=useState(()=>!entryOptions&&!state.generated);
  const [editing,setEditing]=useState(false);
  const [techniqueCategory,setTechniqueCategory]=useState('French');
  const [picker, setPicker] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [setBuilder, setSetBuilder] = useState(false);
  const [proDrawing, setProDrawing] = useState(null);
  const canDrawPro = social?.tier === 'pro' && Boolean(social?.userId && browserStorage.workspaceId);
  const [proCreationsOpen, setProCreationsOpen] = useState(false);
  const [proCreations, setProCreations] = useState([]);
  const [proCreationLoading, setProCreationLoading] = useState(false);
  const [proCreationError, setProCreationError] = useState('');
  const [drawingGenerationError,setDrawingGenerationError]=useState('');
  const [generatingDrawing,setGeneratingDrawing]=useState(false);
  const resultAnchor = useRef(null);
  const automaticHistory = useRef([]);
  const automaticSeed = useRef(0);
  const options = useMemo(() => ({ ...state.options, intent: state.options.intent || (items.some(i => ['Vernis', 'Semi-permanent', 'Gel'].includes(i.type)) ? 'collection' : 'inspire') }), [state.options, items]);
  const stamp = useMemo(() => inventoryStamp(items), [items]);
  const activeRun = state.generated && state.inventory === stamp;
  const liveLearning = personalSettings.enabled ? personalModel.ranking : null;
  const liveStamp = personalSettings.enabled ? personalModel.stamp : 'off';
  const learning = activeRun ? state.learning : liveLearning;
  const report = useMemo(() => generateInspirations(items, profile, options, state.seed || 1, 4, learning), [items, profile, options, state.seed, learning]);
  const generatedIdeas = useMemo(() => applyProCreationConstraint(report.results, options.proCreation, options), [report.results, options]);
  const pendingLearning = activeRun && state.learningStamp !== liveStamp && (state.learning || liveLearning);
  const chosen = activeRun && generatedIdeas.find(idea => idea.id === state.selected);
  const requiredIds = Array.isArray(options.requiredColorIds) ? options.requiredColorIds.map(String) : [];
  const selectedColors = items.filter(item => requiredIds.includes(String(item.id)));
  const decorations = decorationChoice(options);
  const chosenTechniques = selectedTechniques(options);
  const canUseMixMatch = chosenTechniques.length > 1 && Number(options.level) >= 2;
  const techniqueSummary = chosenTechniques.length ? chosenTechniques.map(value => ({ french: 'French', leopard: 'Léopard', tortoiseshell: 'Tortoise', blooming: 'Blooming', chrome: 'Chrome', glazed: 'Glazed', 'cat-eye': 'Cat Eye', 'velvet-magnetic': 'Velvet', aura: 'Aura', 'gel-3d': 'Gel 3D', rhinestones: 'Strass', charms: 'Charms', jelly: 'Jelly', 'glass-nails': 'Glass nails', marble: 'Marbré' })[value] || value).join(' · ') : 'Libre';
  const missingLamp = report.blocked.some(entry => entry.reason === 'Lampe UV / LED à renseigner dans le matériel.');
  const missingMagnet = report.blocked.some(entry => entry.reason === 'Aimant cat-eye à renseigner dans le matériel.');
  const selectedDecoration = report.tools.stickers.find(item => String(item.id) === decorations.id);
  const decorationLabel = decorations.mode === 'without' ? 'Sans décorations' : decorations.mode === 'with' ? decorations.id ? selectedDecoration?.name || 'À choisir' : 'Avec mes décorations' : 'Automatique';
  useEffect(() => {
    try { browserStorage.setItem(KEY, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);
  const connectedPros = useMemo(() => (social?.rows || []).filter(row => row.status === 'accepted' && row.account_tier === 'pro'), [social?.rows]);
  const creationOwnerIds=useMemo(()=>[...(social?.tier==='pro'&&social.userId?[social.userId]:[]),...connectedPros.map(row=>row.user_id)],[social?.tier,social?.userId,connectedPros]);
  async function openProCreations() {
    setProCreationsOpen(true);setProCreationError('');setProCreations([]);
    if(!social?.client||!creationOwnerIds.length)return;
    setProCreationLoading(true);
    try { setProCreations(await listVisibleProCreations(social.client,creationOwnerIds)); }
    catch { setProCreationError('Les dessins ne sont pas disponibles pour le moment. Réessaie.'); }
    finally { setProCreationLoading(false); }
  }
  function useSavedDrawing(creation){
    setSourceOpen(false);if(route==='#creer/atelier')onRoute('create');
    change({intent:options.intent==='photos'?'inspire':options.intent,polishCount:options.polishCount==='auto'||Number(options.polishCount)<2?2:options.polishCount,proCreation:{creation,mode:'palette'}});
    setProDrawing(null);setProCreations([creation]);setProCreationError('');setProCreationsOpen(true);
  }
  useEffect(()=>{
    const id=route?.match(/^#creer\/dessin\/([0-9a-f-]{36})$/i)?.[1];if(!id||!social?.client)return;
    let active=true;setProCreationsOpen(true);setProCreationLoading(true);setProCreationError('');
    getVisibleProCreation(social.client,id).then(creation=>{if(active)useSavedDrawing(creation);}).catch(()=>{if(active)setProCreationError('Ce dessin n’est plus accessible. Retrouve tes créations dans ta bibliothèque.');}).finally(()=>{if(active)setProCreationLoading(false);});return()=>{active=false;};
  },[route,social?.client]);

  const selections = {
    mood: { title: 'Quelle ambiance ?', icon: Sun, label: 'Ambiance', searchable: true, values: [...new Set(['Douce', 'Mystérieuse', 'Chic', 'Joyeuse', 'Audacieuse', 'Au calme', ...TAXONOMY.moods])], placeholder: 'Douce, glamour, sombre…' },
    style: { title: 'Quel style ?', icon: Palette, label: 'Style', searchable: true, values: [...new Set(['Libre', ...(Array.isArray(profile.styles) ? profile.styles : []), ...TAXONOMY.aesthetics, ...TAXONOMY.themes])], placeholder: 'Witchy, clean girl, cottagecore…' },
    technique: { title: 'Quelles techniques ?', icon: Wand2, label: 'Techniques', searchable: true, multi: true, values: ['Libre', ...TAXONOMY.techniques], placeholder: 'French, léopard, tortoise…' },
    techniquePlacement: { title: 'Comment les répartir ?', icon: Wand2, label: 'Répartition', values: ['auto', 'all', 'accent', 'french', ...(canUseMixMatch ? ['mix'] : [])], format: value => ({ auto: 'Suggestion NailMoods', all: 'Sur toute la pose', accent: 'Un accent nail', french: 'Dans la French', mix: 'Pose mix & match · 5 ongles' })[value] || 'Suggestion NailMoods' },
    occasion: { title: 'Pour quelle occasion ?', icon: CalendarDays, label: 'Occasion', values: ['Tous les jours', 'Travail', 'Soirée', 'Événement', 'Week-end'] },
    duration: { title: 'Combien de temps ?', icon: Clock3, label: 'Temps', values: [15, 30, 45, 60, 90], format: durationLabel },
    polishCount: { title: 'Combien de vernis ?', icon: Palette, label: 'Nombre de vernis', values: ['auto', 1, 2, 3, 4, 5], format: polishCountLabel },
    level: { title: 'Quel niveau de détail ?', icon: Brush, label: 'Difficulté', values: [0, 1, 2], format: value => levels[value] },
  };

  function openPicker(key) { setPickerQuery(''); setTechniqueCategory('French'); setPicker(key); }
  const pickerValues = picker && selections[picker] ? selections[picker].values.filter(value => {
    const needle = pickerQuery.trim();
    if (!needle) return picker!=='technique'||value==='Libre'||techniqueCategory==='Toutes'||techniqueGroup(value)===techniqueCategory;
    return techniqueLabel(value).toLocaleLowerCase('fr').includes(needle.toLocaleLowerCase('fr')) || String(value).toLocaleLowerCase('fr').includes(needle.toLocaleLowerCase('fr')) || querySuggestions(needle, 100).some(tag => tag.label === value);
  }) : [];

  function change(patch) {
    setEditing(true);
    if(patch.intent==='photos'&&(!browserStorage.accountScoped||!['plus','pro'].includes(browserStorage.accountTier)))track('feature_locked',{});
    if(patch.intent)track('create_mode_selected',{mode:patch.intent==='collection'?'my_collection':'inspire_me'},{screen:'create'});
    if (patch.intent === 'inspire') patch = { ...patch, requiredColorIds: [] };
    setState(previous => {
      const nextOptions = updateTechniqueChoice(previous.options,patch,items,automaticHistory.current,++automaticSeed.current);
      if (nextOptions.techniquePlacement === 'mix' && (selectedTechniques(nextOptions).length < 2 || Number(nextOptions.level) < 2)) nextOptions.techniquePlacement = 'auto';
      return { ...previous, options: nextOptions, generated: false, selected: null };
    });
  }
  function toggleTechnique(value) {
    if (value === 'Libre') { change({ techniques: [], technique: undefined, techniquesSource:'manual' }); return; }
    const active = (options.techniques || []).includes(value);
    change({ techniques: active ? options.techniques.filter(item => item !== value) : [...(options.techniques || []), value].slice(0, 4), technique: undefined, techniquesSource:'manual' });
  }
  function surprise(){
    const techniques=surpriseTechniques(options,items,automaticHistory.current,++automaticSeed.current);
    automaticHistory.current.push(techniques);
    change({techniques,technique:undefined,techniquesSource:'auto'});
  }
  async function generate() {
    if(generatingDrawing)return;
    setDrawingGenerationError('');
    let selectedCreation=options.proCreation;
    if(selectedCreation?.creation?.id){
      setGeneratingDrawing(true);
      try{selectedCreation={...selectedCreation,creation:await getVisibleProCreation(social.client,selectedCreation.creation.id)};}
      catch{setDrawingGenerationError('Ce dessin n’a pas pu être chargé. Vérifie ta connexion ou choisis un autre dessin.');setGeneratingDrawing(false);return;}
      setGeneratingDrawing(false);
    }
    setEditing(false); setSourceOpen(false);
    recordRuntimeEvent('generation',report.unavailable?'error':'ok');
    const started=performance.now();
    const generationMetadata={difficulty:String(options.level),number_of_colors:options.polishCount==='auto'?0:Number(options.polishCount),technique:chosenTechniques.join('+') || 'none',technique_count:chosenTechniques.length,technique_placement:options.techniquePlacement || 'auto',render_mode:'illustrated',used_collection:options.intent==='collection'};
    track(state.generated?'generation_regenerated':'generation_started',generationMetadata,{screen:'create'});
    setState(previous => ({ ...previous, options:{...previous.options,proCreation:selectedCreation}, generated: true, inventory: stamp, seed: (Number(previous.seed) || 0) + 1, selected: null, learning: liveLearning, learningStamp: liveStamp }));
    track(report.unavailable?'generation_failed':'generation_succeeded',{...generationMetadata,number_of_colors:report.results.length},{screen:'create',duration_ms:Math.round(performance.now()-started),success:!report.unavailable});
    requestAnimationFrame(() => resultAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const completedKeys = new Set(tutorials.filter(session => session.status === 'completed').map(session => session.idea.key));
  const openedKey = route.startsWith('#inspiration/') ? route.slice('#inspiration/'.length) : null;
  const opened = openedKey && findIdea(library, openedKey);
  if (route === '#favoris') return <FavoritesView completedKeys={completedKeys} favorites={library.favorites} items={items} onOpen={onOpen} onFavorite={onFavorite} onBack={() => onRoute('create')} />;
  if (route === '#projets') return <ProjectsView projects={library.projects || []} items={items} onOpen={onOpen} onBack={() => { change({ intent: 'photos' }); onRoute('create'); }} />;
  if (opened) return <InspirationView initialVariant={ideaAction?.key===opened.key&&ideaAction.action==='variant'} onPublish={patch=>onPublish(opened,patch)} onShareToPro={onShareToPro} onSaveIdea={() => onSaveIdea(opened)} onRename={title => onRename(opened.key, title)} learning={liveLearning} key={opened.key} idea={opened} items={items} profile={profile} favorite={library.favorites.some(idea => idea.key === opened.key)} selected={library.selected?.key === opened.key} onFavorite={() => onFavorite(opened)} onSelect={() => { const clear = library.selected?.key === opened.key; if (onSelect(opened, clear)) setState(previous => ({ ...previous, selected: clear ? null : opened.id })); }} onOpen={onOpen} onBack={() => onIdeaBack?onIdeaBack(opened):onRoute('create')} onFavorites={() => onRoute('favorites')} onCollection={onCollection} onTutorial={() => onTutorial(opened)} onDone={() => onDone(opened)} completed={completedKeys.has(opened.key)} tutorialExists={tutorials.some(session => session.idea.key === opened.key && session.status !== 'completed')} />;
  if (openedKey) return <section className="creationEmpty"><h1>Cette fiche n’est plus disponible</h1><p>Retrouve tes favoris ou compose une nouvelle inspiration.</p><button onClick={() => onRoute('favorites')}>Mes favoris</button><button onClick={() => onRoute('create')}>Créer une inspiration</button></section>;

  if(route==='#creer/atelier'&&!canDrawPro)return <section className="creationEmpty"><h1>Dessin sur ongles</h1><p>L’Atelier Pro te permet de dessiner sur les 5 ongles, puis de créer une pose à partir de ton dessin.</p><button onClick={()=>{window.location.hash='profil/offer';}}>Voir mon offre</button><button onClick={()=>onRoute('create')}>Revenir à Créer</button></section>;
  if ((proDrawing || route === '#creer/atelier') && canDrawPro) return <div className="creationPage proDrawingPage"><button type="button" className="quietButton" onClick={()=>{setProDrawing(null);onRoute('create');}}>Revenir à Créer</button><h1>Mon Atelier</h1><p>Dessine, retrouve ta bibliothèque et crée une pose à partir de tes dessins.</p><ProCreationsPanel client={social.client} userId={social.userId} workspaceId={browserStorage.workspaceId} defaultShape={profile.shape} defaultLength={profile.length} onUse={useSavedDrawing} startDrawing={proDrawing==='draw'}/></div>;
  const drawingAction = canDrawPro && <button type="button" className="manualSetAction proDrawAction" onClick={()=>setProDrawing('draw')}><Brush/><span><b>Dessiner sur un ongle · Pro</b><small>Pinceau, gomme et couleurs au choix</small></span><ChevronRight/></button>;

  if(route==='#creer/prototype-rendus')return <RenderPrototype items={items} profile={profile} onBack={()=>{setSourceOpen(true);window.location.hash='creer';}}/>;
  if(route==='#creer/ia-interne')return <InternalLab/>;
  if(route==='#creer/entrainement')return <Trainer/>;
  if(outfitEnabled() && route.startsWith('#partage/'))return <SharedPoseView route={route}/>;
  if(outfitEnabled() && route.startsWith('#creer/diy/'))return <DiyView route={route} items={items} profile={profile} onMoodChange={onMoodChange} onCollection={onCollection} onTutorial={onTutorial}/>;
  if(outfitEnabled() && route.startsWith('#creer/planning'))return <PlanningView profile={profile} onChange={onProfileChange} route={route}/>;
  if(outfitEnabled() && /^#creer\/(tenue|pose\/|projets-pose)/.test(route)) return <OutfitFlow onVariant={idea=>onOpen(idea,undefined,'variant')} items={items} profile={profile} route={route} onMoodChange={onMoodChange} onBack={()=>{window.location.hash='creer';setSourceOpen(true);}}/>;
  if(sourceOpen && route!=='#creer/atelier') return <CreationSources items={items} onPlanning={()=>{window.location.hash='creer/planning';}} outfit={outfitEnabled()} onPoseProjects={()=>{window.location.hash='creer/projets-pose';}} onJournal={()=>onRoute('journal')} onChoose={id=>{
    if(id==='trainer'){window.location.hash='creer/entrainement';return;}
    if(id==='prototype'){window.location.hash='creer/prototype-rendus';return;}
    if(id==='outfit'){window.location.hash='creer/tenue';return;}
    if(id==='atelier'){window.location.hash='creer/atelier';return;}
    setSourceOpen(false);
    if(id==='scan'){onRoute('scan');return;}
    if(id==='manual'){setSetBuilder(true);return;}
    change({intent:id});
  }}/>;
  if (options.intent === 'photos' && (!browserStorage.accountScoped || !['plus','pro'].includes(browserStorage.accountTier))) return <section className="creationEmpty"><h1>Créer depuis mes photos · Plus</h1><p>Compose tes projets depuis 1 à 4 inspirations avec Plus ou Pro. Tes projets déjà enregistrés restent consultables.</p><button onClick={()=>onRoute('profile')}>Mon compte</button><button onClick={()=>change({intent:'inspire'})}>Créer une inspiration illustrée</button></section>;
  if (options.intent === 'photos') return <div className="creationPage photoCreationPage">
    <button className="nmQuiet" onClick={()=>setSourceOpen(true)}>← Changer de source</button><h1>Photos d’inspiration</h1><p>Des poses qui t’inspirent, à recomposer avec tes envies.</p>
    <PhotoInspirationFlow onSaveIdea={onSaveIdea} onShareToPro={onShareToPro} items={items} profile={profile} onSaveProject={onSaveProject} onJournalIdea={onJournalIdea} onOpen={onOpen} onProjects={() => onRoute('projects')} />
  </div>;

  return <div className="creationPage engagementCreation">
    <div className="createHeading"><button className="nmQuiet" onClick={()=>setSourceOpen(true)}>← Changer de source</button><h1>{activeRun&&!editing?'Tes idées':options.intent==='collection'?'Avec ma collection':'Inspiration libre'}</h1></div>
    {activeRun&&!editing && <section className="choicesSummary"><div><b>Tes choix</b><p>{levels[options.level]} · {techniqueSummary} · {durationLabel(options.duration)}</p></div><button onClick={()=>setEditing(true)}>Modifier</button></section>}
    {report.unavailable && <section className="creationNotice" role="status"><b>Modifions un choix</b><p>{report.unavailable}</p><div className="detailActions"><button onClick={() => openPicker('level')}>Changer le niveau</button><button onClick={() => openPicker('technique')}>Changer la technique</button></div></section>}
    {drawingGenerationError&&<p className="formError" role="alert">{drawingGenerationError}</p>}
    <div className="createForm" hidden={activeRun&&!editing}>
    {options.intent==='collection'&&<CollectionContext options={options} report={report} learning={learning} onChange={change}/>}
    <section className="creationSection">
      <div className="creationSectionTitle"><span>01</span><h2>De quoi as-tu envie ?</h2></div>
      <div className="creationModes">{modes.map(({ id, title, subtitle, icon: Icon }) => <button key={id} className={options.mode === id ? 'selected' : ''} aria-pressed={options.mode === id} onClick={() => change({ mode: id, escapeBubble:false })}>
        <Icon /><span><b>{title}</b><small>{subtitle}</small></span>{options.mode === id ? <Check className="modeCheck" /> : <ChevronRight className="modeCheck" />}
      </button>)}</div>
      {options.mode === 'surprise' && <div className="surpriseChoices" aria-label="Degré de surprise">
        {[['Safe', 'Un petit pas'], ['Creative', 'Plus de fantaisie'], ['Chaos', 'J’ose les contrastes']].map(([value, label]) => <button key={value} aria-pressed={options.surprise === value} className={options.surprise === value ? 'on' : ''} onClick={() => change({ surprise: value })}><b>{value}</b><small>{label}</small></button>)}
        <p>Tes choix guident les propositions. Les adaptations sont indiquées avec les idées.</p>
      </div>}
    </section>

    <section className="creationSection">
      <div className="creationSectionTitle"><span>02</span><h2>Ajoute ta touche</h2></div>
      <div className="creationTiles creationPrimaryTiles">{['mood', 'level'].map(key => { const choice = selections[key]; return <button key={key} data-choice={key} onClick={() => openPicker(key)}>
        {['mood', 'style'].includes(key) ? <MoodGlyph value={options[key]} /> : <choice.icon />}<small>{choice.label}</small><b>{choice.format ? choice.format(options[key]) : options[key]}</b><ChevronRight className="tileArrow" />
      </button>; })}</div>
      <div className="creationTechniqueCard"><button className="creationTechniqueShortcut" onClick={()=>openPicker('technique')}><MoodGlyph value={chosenTechniques[0] || 'French'} /><span><small>TECHNIQUES · {options.techniquesSource==='auto'?'CHOIX NAILMOODS':'FACULTATIF'}</small><b>{techniqueSummary}</b></span><ChevronRight/></button><button type="button" className="techniqueSurprise" onClick={surprise}><Dice5 size={18}/><span>Surprends-moi</span></button></div>
      {techniqueWarnings(options).map(message=><p className="creationPickerHelp" role="status" key={message}>{message}</p>)}
      <button className="detailSecondary" onClick={()=>setPicker('colors')}>Couleurs principales{(options.intent==='inspire'?options.inspirationPalette?.length:selectedColors.length)?' · '+(options.intent==='inspire'?options.inspirationPalette.length:selectedColors.length):''}</button>
      {social?.userId && ['plus','pro'].includes(social.tier) && <button className="creationTechniqueShortcut" onClick={openProCreations}><Brush /><span><small>{canDrawPro?'MES DESSINS ET CEUX DE MES PO':'CRÉATIONS DE MA PO'}</small><b>{options.proCreation?.creation?.title || (canDrawPro?'Utiliser un dessin pour ma pose':'Utiliser une création de ma PO')}</b><em>{options.proCreation?.creation ? 'Elle guidera une nouvelle composition NailMoods.' : (canDrawPro?'Retrouve tes dessins enregistrés et ceux de tes PO.':'Choisis une création rendue visible par ta PO.')}</em></span><ChevronRight /></button>}
      <details className="creationAdvanced"><summary><span><SlidersHorizontal />Personnaliser davantage</span><small>Style, durée, effets, décors et matériel</small></summary>
        <div className="creationTiles">{['style','duration', ...(chosenTechniques.length ? ['techniquePlacement'] : []), 'occasion', 'polishCount'].map(key => { const choice = selections[key]; return <button key={key} data-choice={key} onClick={() => openPicker(key)}>
          {key === 'style' ? <MoodGlyph value={options.style} /> : <choice.icon />}{key === 'polishCount' && <span className="countPreview" aria-hidden="true">{Array.from({ length: options.polishCount === 'auto' ? 5 : Number(options.polishCount) }, (_, index) => <svg key={index} viewBox="0 0 16 30" fill="none" focusable="false"><rect x="5" y="1" width="6" height="10" rx="1.5" fill="currentColor" /><path d="M5 12h6l3 4v11a2 2 0 0 1-2-2H4a2 2 0 0 1-2-2V16z" fill="var(--soft)" stroke="currentColor" strokeWidth="1.2" /><path d="M5 19v6" stroke="currentColor" strokeOpacity=".35" strokeLinecap="round" /></svg>)}</span>}<small>{choice.label}</small><b>{key === 'technique' ? techniqueSummary : choice.format ? choice.format(options[key]) : options[key] || 'Libre'}</b><ChevronRight className="tileArrow" />
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
    {report.adjusted && !report.unavailable && <p className="creationNotice">Voici une alternative avec un nombre de couleurs, des décorations adaptées aux possibilités disponibles. Le temps maximal et tes choix de couleurs sont conservés.</p>}
    <button className="creationGenerate" onClick={generate}><Sparkles />{activeRun ? 'Une autre idée' : 'Générer une idée'}<ArrowRight /></button>
    <button className="nmQuiet" onClick={() => change(profileDefaults(profile))}>Utiliser mes préférences</button><button className="nmQuiet" onClick={()=>setSetBuilder(true)}>Composer doigt par doigt</button>
    </div>
    {activeRun&&!editing && <button className="nmQuiet" onClick={generate}>Proposer d’autres idées</button>}
    <p className="creationTimeNote">Temps indicatifs pour la couleur et la décoration, hors préparation, dépose et séchage.</p>
    {storageError && <p className="formError" role="alert">Tes choix restent disponibles ici, mais n’ont pas pu être sauvegardés sur cet appareil.</p>}

    {activeRun && <section className="creationResults" ref={resultAnchor} aria-labelledby="ideas-title">
      <div className="creationSectionTitle"><span>03</span><div><small>{report.intent === 'inspire' ? 'INSPIRATIONS LIBRES · COULEURS DE STYLE' : 'AVEC LES TEINTES DE TA COLLECTION'}</small><h2 id="ideas-title">{report.results.length} idée{report.results.length > 1 ? 's' : ''} pour toi</h2></div></div>
      {report.results.length < 4 && <p className="creationNotice">Ta collection et tes choix permettent {report.results.length} proposition{report.results.length > 1 ? 's' : ''} distincte{report.results.length > 1 ? 's' : ''} pour le moment. Aucun produit n’a été ajouté à ta collection.</p>}
      <p className="creationHint">{report.intent === 'inspire' ? 'Couleurs d’inspiration, sans référence commerciale ni produit ajouté à ta collection.' : 'Aperçus avec tes teintes enregistrées.'} Les techniques et les matières sont interprétées en dessin. Vérifie le protocole des produits.</p>
      {chosen && <button className="chosenIdea" onClick={() => onOpen(chosen, chosen.options)}><BookmarkCheck /><span><b>Ton idée retenue</b><small>{chosen.title} · {chosen.palette.map(item => item.name).join(' + ')}</small></span><ChevronRight /></button>}
      <div className="ideaList">{generatedIdeas.map((idea, index) => <article className={'ideaCard ideaCardOpenable ' + (chosen?.id === idea.id ? 'chosen' : '')} key={idea.id} onClick={() => onOpen(idea, idea.options)}>
        <div className="ideaTopline"><span><MoodGlyph value={idea.options?.mood || options.mood} /> ENVIE {String(index + 1).padStart(2, '0')}</span><span><Clock3 />≈ {idea.minutes} min</span></div>
        <TapFavorite aria-label={"Ouvrir "+idea.title+" · double-tap pour le favori"} onOpen={()=>onOpen(idea,idea.options)} onToggle={()=>onFavorite(idea)} saved={library.favorites.some(saved=>saved.key===snapshotIdea(idea).key)}><NailPreview idea={idea} controls /></TapFavorite>
        <div className="ideaBody">{completedKeys.has(snapshotIdea(idea, idea.options).key) && <span className="ideaDoneBadge"><Check />Déjà réalisée</span>}<div className="ideaBadges"><span className="ideaDifficulty">{levels[idea.rank]}</span><span className="ideaPolishCount">{polishCountLabel(idea.polishCount)}</span></div><h3><button className="ideaTitleLink" onClick={event=>{event.stopPropagation();onOpen(idea,idea.options);}}>{idea.title}</button></h3><p>{idea.description}</p>
          {idea.collectionEvidence&&<p className="nmCollectionEvidence">{idea.collectionEvidence.complete?'Les besoins identifiés sont dans ta collection':`${idea.collectionEvidence.owned} référence(s) présente(s) sur ${idea.collectionEvidence.total}`}{idea.collectionEvidence.uncertain?' · Matériel ou protocole à vérifier.':''}</p>}<IdeaProducts idea={idea} items={items} onCollection={onCollection} /><div className="ideaProducts">{idea.palette.map(item => <span key={item.id}><i style={{ background: item.color }} />{item.name}</span>)}</div>
          {idea.resources.filter(isDecoration).map(item => <div className="ideaDecoration" key={item.id}><DecorationPhoto item={item} /><div><small>MA DÉCORATION</small><b>{item.name}</b><span>Motif schématique sur les ongles</span></div></div>)}
          {idea.requirements?.length > 0 && <p className="creationNotice">Pour la réaliser : {idea.requirements.map(r => r.name).join(' · ')}</p>}
          {idea.resources.some(item => !isDecoration(item)) && <div className="ideaEquipment"><small>AVEC MON MATÉRIEL</small><p>{idea.resources.filter(item => !isDecoration(item)).map(item => item.name).join(' · ')}</p></div>}
          <ul className="ideaReasons">{idea.reasons.map(reason => <li key={reason}><Check />{reason}</li>)}</ul>
          <div className="ideaCardActions"><button className="chooseIdea" disabled={library.favorites.some(saved=>saved.key===snapshotIdea(idea).key)} onClick={event=>{event.stopPropagation();onSaveIdea(idea);}}><BookmarkCheck/>{library.favorites.some(saved=>saved.key===snapshotIdea(idea).key)?'Idée enregistrée':'Enregistrer l’idée'}</button><button className="nmQuiet" onClick={event=>{event.stopPropagation();onOpen(idea,idea.options);}}>Voir la fiche</button></div>

        </div>
      </article>)}</div>
      {report.total > report.results.length && <button className="moreIdeas" onClick={generate}><RotateCcw />Proposer d’autres associations</button>}
    </section>}

    {picker === 'colors' && <ColorSelection conceptual={options.intent==='inspire'} items={options.intent==='inspire'?stylePalette:items} selected={options.intent==='inspire'?(options.inspirationPalette||[]).map(p=>p.id):requiredIds} onClose={() => setPicker(null)} onChange={ids => change(options.intent==='inspire'?{inspirationPalette:stylePalette.filter(p=>ids.includes(p.id)),polishCount:'auto'}:{ requiredColorIds: ids, intent: ids.length ? 'collection' : options.intent, polishCount: 'auto' })} />}
    {setBuilder&&<Sheet className="nailSetSheet" eyebrow="CRÉER À MA FAÇON" title="Ma composition" onClose={()=>setSetBuilder(false)}><NailSetBuilder items={items} profile={profile} options={options} onClose={()=>setSetBuilder(false)} onSave={idea=>{if(onSaveProject(idea)){setSetBuilder(false);onOpen(idea,idea.options);}}}/></Sheet>}
    {proCreationsOpen && <Sheet className="creationSheet" eyebrow={canDrawPro?"MA BIBLIOTHÈQUE DE DESSINS":"CRÉATIONS DE MA PO"} title="Un dessin, une nouvelle pose" onClose={() => setProCreationsOpen(false)}>
      {!creationOwnerIds.length && <p className="creationPickerHelp">Connecte-toi à une PO pour voir les créations qu’elle choisit de partager avec toi.</p>}
      {proCreationLoading && <p className="creationPickerHelp">Préparation des créations…</p>}
      {proCreationError && <p className="formError">{proCreationError}</p>}
      {!proCreationLoading && creationOwnerIds.length > 0 && !proCreations.length && !proCreationError && <p className="creationPickerHelp">{canDrawPro?"Ta bibliothèque ne contient pas encore de dessin. Crée le premier dans l’atelier.":"Tes PO n’ont pas encore partagé de création avec toi."}</p>}
      <div className="creationOptions creationTagOptions">{proCreations.map(creation => <button key={creation.id} onClick={() => change({polishCount:options.polishCount==='auto'||Number(options.polishCount)<2?2:options.polishCount,proCreation:{creation,mode:options.proCreation?.creation?.id===creation.id?options.proCreation.mode:'palette'}})}><span><b>{creation.title}</b><small>{[...(creation.techniques || []), ...(creation.motifs || [])].slice(0, 3).join(' · ') || 'Création personnalisée'}</small></span><ChevronRight /></button>)}</div>
      {options.proCreation?.creation && <><p className="creationPickerHelp">Choisis comment intégrer ce dessin. Tu peux garder ses couleurs ou les adapter à la palette de la pose.</p><div className="creationOptions">{proCreationModes.map(([id, title, detail]) => <button key={id} className={options.proCreation.mode === id ? 'on' : ''} aria-pressed={options.proCreation.mode === id} onClick={() => change({ proCreation: { ...options.proCreation, mode: id } })}><span><b>{title}</b><small>{detail}</small></span>{options.proCreation.mode === id && <Check />}</button>)}</div><button className="creationGenerate" disabled={generatingDrawing||proCreationLoading} onClick={async()=>{await generate();setProCreationsOpen(false);}}><Sparkles />{generatingDrawing?'Préparation du dessin…':'Générer une pose avec ce dessin'}</button><button className="detailSecondary" onClick={() => change({ proCreation: null })}>Retirer cette création</button></>}
    </Sheet>}
    {picker === 'decorations' && <DecorationPicker decorations={report.tools.stickers} choice={decorations} onClose={() => setPicker(null)} onCollection={() => { setPicker(null); onCollection(); }} onChange={(mode, id = '') => change({ decorations: mode, decorationId: id, constraints: options.constraints.filter(value => value !== 'noStickers') })} />}
    {picker && !['decorations', 'colors'].includes(picker) && <Sheet className="creationSheet" eyebrow="MON ENVIE DU JOUR" title={picker === 'constraints' ? 'Tes limites du jour' : selections[picker].title} onClose={() => setPicker(null)}>
      {picker === 'polishCount' && <p className="creationPickerHelp">Choisis un nombre exact de vernis colorés par proposition. Les stickers, bases et top coats ne sont pas comptés.</p>}
      {picker==='technique' && <><div className="techniqueFamilies" aria-label="Familles de techniques">{[...techniqueGroups,'Toutes'].map(group=><button aria-pressed={techniqueCategory===group&&!pickerQuery} key={group} onClick={()=>{setTechniqueCategory(group);setPickerQuery('');}}>{group}</button>)}</div>{(options.techniques||[]).length>0&&<div className="selectedTechniques"><b>Sélection actuelle</b>{options.techniques.map(value=><button key={value} onClick={()=>toggleTechnique(value)} aria-label={'Retirer '+techniqueLabel(value)}>{techniqueLabel(value)} ×</button>)}</div>}</>}
      {selections[picker]?.searchable && <label className="creationPickerSearch"><Search /><input autoFocus aria-label={'Rechercher ' + selections[picker].label.toLocaleLowerCase('fr')} value={pickerQuery} onChange={event => setPickerQuery(event.target.value)} placeholder={selections[picker].placeholder} /></label>}
      <div className={'creationOptions ' + (selections[picker]?.searchable ? 'creationTagOptions' : '')}>
        {picker === 'constraints' && limits.map(([key, label, detail]) => <button key={key} aria-pressed={options.constraints.includes(key)} className={options.constraints.includes(key) ? 'on' : ''} onClick={() => change({ constraints: options.constraints.includes(key) ? options.constraints.filter(value => value !== key) : [...options.constraints, key] })}><span><b>{label}</b><small>{detail}</small></span>{options.constraints.includes(key) && <Check />}</button>)}
        {picker === 'technique' && <><p className="creationPickerHelp">Choisis jusqu’à 4 techniques : la visualisation répartit réellement les effets sur la pose.</p>{pickerValues.map(value => <button key={value} className={value !== 'Libre' && (options.techniques || []).includes(value) ? 'on' : ''} aria-pressed={value !== 'Libre' && (options.techniques || []).includes(value)} onClick={() => toggleTechnique(value)}><MoodGlyph value={value} /><span>{techniqueLabel(value)}</span>{value !== 'Libre' && (options.techniques || []).includes(value) && <Check />}</button>)}<button className="creationGenerate" onClick={() => setPicker(null)}><Check />Garder ces techniques</button></>}
        {picker !== 'constraints' && picker !== 'technique' && pickerValues.map(value => <button key={value} className={options[picker] === value ? 'on' : ''} aria-pressed={options[picker] === value} onClick={() => { change({ [picker]: value }); setPicker(null); }}>{['mood', 'style'].includes(picker) && <MoodGlyph value={value} />}<span>{selections[picker].format ? selections[picker].format(value) : value}{picker === 'polishCount' && <small>{polishCountHints[value]}</small>}</span>{options[picker] === value && <Check />}</button>)}
        {picker !== 'constraints' && selections[picker]?.searchable && !pickerValues.length && <p className="creationNoResults">Aucun tag correspondant.</p>}
      </div>
      {picker === 'constraints' && <button className="creationGenerate" onClick={() => setPicker(null)}><Check />Garder ces choix</button>}
    </Sheet>}
  </div>;
}
