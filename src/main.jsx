import Desk from './desk/Desk.jsx';
import {DESK_KEY,initialDesk,progressFor,earnedDecorations} from './desk/model.js';
import Shelf,{ViewSwitch,ShelfToneFilter} from './shelf/Shelf.jsx';
import ProductFocus,{selectBottle} from './shelf/ProductFocus.jsx';
import {ProShelfDirectory} from './shelf/ProShelf.jsx';
import {withUsage,sortShelf,toneOf,sameReference} from './shelf/model.js';
import {useSocial} from './social/SocialContext.jsx';
import useUndoNotice from './engagement/useUndoNotice';
import {restoreFavorite,restoreProduct} from './engagement/undo.js';
import {catalogCandidate,catalogSelectionPatch} from './catalog.js';
import ProductKnowledge from './productKnowledge/ProductKnowledge';
import TutorialTimerRuntime from './poseCycle/TutorialTimerRuntime';
import PlanningRuntime from './poseCycle/PlanningRuntime';
import {profileMood,moodFor,themeStyle,applyMood} from './design/themes';
import {needsOnboarding} from './design/onboarding.js';
import Onboarding from './design/Onboarding.jsx';
import CoachTour from './design/CoachTour';
import EquipmentLibrary from './EquipmentLibrary.jsx';
import {equipmentSeed} from './equipmentSeed.js';
import {setEquipmentOwned,duplicateCustomEquipment} from './equipmentLibrary.js';
import {productKind,productKinds,productNeedsColor} from './productKinds.js';
import { isNative } from './platform/state.js';
const MobileStatus = import.meta.env.VITE_NATIVE_BUILD ? React.lazy(()=>import('./platform/MobileStatus.jsx')) : null;
import Discovery from './social/Discovery';
import {messageId} from './social/messageState';
import Sheet from './Sheet';
import RenderBoundary from './RenderBoundary';
import { SocialGlobal } from './social/SocialHub';
import { NotificationButton } from './social/SocialContext';
import { track } from './analytics/analytics';
import { isDecoration } from './decorations';
import { auxiliary } from './creationEngine';
import { profileDefaults } from './creationEngine';
import CollectionFilters from './CollectionFilters';
import { collectionResults, emptyFilters, duplicateCandidates, provenanceOf, mergeScannedProducts } from './collection';
import ContextHelp from './ContextHelp';
import SupportPanel from './support/SupportPanel';
import {setDiagnosticsStorage,recordRuntimeEvent} from './support/diagnostics';
import { useStorage } from './StorageContext';
import AccountRoot from './cloud/AccountRoot';
import {tierCapabilities} from './cloud/betaTier';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { SlidersHorizontal, Home, Palette, Library, BookHeart, UserRound, Compass, ChevronRight, X, Check, Search, Plus, Camera, Trash2, Heart, Link, ScanLine, Image, PenLine, WandSparkles, Package } from 'lucide-react';
import { equipmentInfo, EquipmentVisual, EquipmentCategory, EquipmentFields } from './equipment';
import ProductPhoto from './ProductPhoto';
import ProductImport from './ProductImport.jsx';
import PhotoColor from './PhotoColor';
import { colorFamilies, colorFamilyChange, productColor } from './colorAnalysis';
import CreateView from './CreateView';
import './style.css';
import ProfileView from './ProfileView';
import { defaultProfile } from './profileOptions';
import HomeView from './HomeView';
import ScanGenerate from './ScanGenerate.jsx';
import JournalView,{JournalVisual} from './JournalView';
import PersonalPoseBook from './poseBook/PersonalPoseBook.jsx';
import { JOURNAL_KEY, putJournalEntry, readJournal, removeJournalEntry } from './journal';
import TutorialView, { TutorialBanner, TutorialsList } from './TutorialView';
import { TUTORIAL_KEY, readTutorials, newTutorial, addTutorial, actOnTutorial, markIdeaDone } from './tutorial';
import { INSPIRATIONS_KEY, readInspirations, rememberIdea, snapshotIdea, toggleFavorite, saveInspiration, saveProject as saveIdeaProject, renameInspiration } from './inspirations';
import PersonalizationPanel from './PersonalizationView';
import './design-system.css';
import './finish.css';
import './ux-polish.css';
import './creative-sources.css';
import './profile-sheet.css';
import './illustrated-icons.css';
import './design/da06.css';
import './design/common-ux.css';
import './design/atelier.css';
import { PERSONALIZATION_KEY, readPersonalization, buildPersonalModel } from './personalization';
const colors=colorFamilies;const defaults={name:'',brand:'',url:'',type:'Semi-permanent',finish:'Brillant',family:'Rose',color:'#db7897',depth:'Moyen',undertone:'Neutre',effect:'Aucun',usage:'Couleur seule',fav:false};const starter=[];

function Brand() {
  return <div className="brandFinal officialBrand"><img className="brandWordmark" src={import.meta.env.BASE_URL + 'nailmoods-official.png'} alt="NailMoods — Explore. Crée. Ressens." /><img className="brandSymbol" src={import.meta.env.BASE_URL + 'nailmoods-symbol.png'} alt="NailMoods" /></div>;
}

function readStored(browserStorage, key, fallback) {
  try { return JSON.parse(browserStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

const materialDefaults = { equipmentCategory: 'Autre matériel', quantity: 1, reference: '', materialStyle: '', notes: '', photo: '' };
const tabRoutes = { scan: 'scan', home: 'accueil', feed:'fil', create: 'creer', collection: 'collection', journal: 'journal', profile: 'profil', favorites: 'favoris', projects: 'projets', tutorials: 'tutoriel' };
const tabFromHash = () => window.location.hash.startsWith('#profil/') ? 'profile' : window.location.hash.startsWith('#journal/') ? 'journal' : window.location.hash.startsWith('#partage/') || window.location.hash.startsWith('#creer/') || window.location.hash.startsWith('#inspiration/') || window.location.hash.startsWith('#tutoriel') || ['#favoris', '#projets'].includes(window.location.hash) ? 'create' : Object.keys(tabRoutes).find(tab => '#' + tabRoutes[tab] === window.location.hash) || 'home';
const themeBackupKey = storage => `nm-theme-v1:${storage.userId || 'guest'}:${storage.workspaceId || 'personal'}`;
const readThemeBackup = storage => { try { return window.localStorage.getItem(themeBackupKey(storage)) || ''; } catch { return ''; } };
const saveThemeBackup = (storage, theme) => { try { window.localStorage.setItem(themeBackupKey(storage), theme); } catch { /* The account profile remains the source of truth. */ } };

function App({ onThemeChange, accountAccess, appearanceExtras, identityExtras, syncNotice, profileExtras, media, onShareToPro }) {
  const browserStorage=useStorage();
  const social=useSocial();
  const [collectionView,setCollectionView]=useState(()=>readStored(browserStorage,'nm-collection-view','shelf'));
  const [deskState,setDeskState]=useState(()=>initialDesk(readStored(browserStorage,DESK_KEY,null)));
  const [deskError,setDeskError]=useState('');
  function saveDesk(next){try{browserStorage.setItem(DESK_KEY,JSON.stringify(next));setDeskState(next);setDeskError('');return true;}catch{setDeskError('Le bureau ne peut pas être enregistré. Réessaie avant de quitter.');return false;}}
  const [shelfSelection,setShelfSelection]=useState(null);
  const [proShelvesOpen,setProShelvesOpen]=useState(false);
  const [shelfTone,setShelfTone]=useState('');
  const [collectionFiltersOpen,setCollectionFiltersOpen]=useState(false);
  const undoNotice=useUndoNotice(browserStorage);
  const limited=import.meta.env.VITE_BETA_ACCOUNT_TIERS==='true' && browserStorage.accountScoped && !tierCapabilities(browserStorage.accountTier).personal;
  const [tab, setTab] = useState(tabFromHash);
  const [creationEntry, setCreationEntry] = useState(null);
  const [ideaAction,setIdeaAction]=useState(null);
  const routeScroll=useRef(new Map());
  const ideaOrigins=useRef(readStored(browserStorage,'nm-idea-origins-v1',{}));
  const [route, setRoute] = useState(() => window.location.hash);
  const journalAllowed=!browserStorage.accountScoped||tierCapabilities(browserStorage.accountTier).journal;
  const locked=(!journalAllowed&&tab==='journal')||(limited && (tab==='collection'||['#favoris','#projets'].includes(route)||route.startsWith('#tutoriel')));
  const [profile, setProfile] = useState(() => {
    const stored = readStored(browserStorage, 'nm-profile', {});
    const retainedTheme = readThemeBackup(browserStorage);
    return { ...defaultProfile, ...stored, visualMood: moodFor(stored?.visualMood || retainedTheme || stored?.theme).id, styles: Array.isArray(stored?.styles) ? stored.styles : defaultProfile.styles };
  });
  const [onboarding,setOnboarding]=useState(()=>needsOnboarding(readStored(browserStorage,'nm-profile',{}),browserStorage.accountScoped));
  const [tour,setTour]=useState(()=>Boolean(profile.guide_pending&&!profile.guide_completed));
  useEffect(()=>{const replay=()=>setTour(true);window.addEventListener('nm-tour-replay',replay);return()=>window.removeEventListener('nm-tour-replay',replay);},[]);
  const [library, setLibrary] = useState(() => readInspirations(browserStorage));
  const [appError, setAppError] = useState('');
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  useEffect(()=>{setDiagnosticsStorage(browserStorage);const offline=()=>recordRuntimeEvent('network','error','offline');const fault=()=>recordRuntimeEvent('ui','error','unhandled');window.addEventListener('offline',offline);window.addEventListener('error',fault);window.addEventListener('unhandledrejection',fault);return()=>{setDiagnosticsStorage(null);window.removeEventListener('offline',offline);window.removeEventListener('error',fault);window.removeEventListener('unhandledrejection',fault);};},[browserStorage]);
  const [tutorials, setTutorials] = useState(() => readTutorials(browserStorage));
  const [journal, setJournal] = useState(() => readJournal(browserStorage));
  useEffect(()=>{const refresh=e=>{if(e.detail.userId===browserStorage.userId&&e.detail.workspaceId===browserStorage.workspaceId)setJournal(readJournal(browserStorage));};window.addEventListener('nm-journal-realized',refresh);return()=>window.removeEventListener('nm-journal-realized',refresh);},[browserStorage]);
  const [journalDraftIdea, setJournalDraftIdea] = useState(null);
  const [personalSettings, setPersonalSettings] = useState(() => readPersonalization(browserStorage));
  const [personalOpen, setPersonalOpen] = useState(false);
  const [personalError, setPersonalError] = useState('');
  const tutorialSession = route.startsWith('#tutoriel/') ? tutorials.sessions.find(session => session.id === route.slice('#tutoriel/'.length)) : null;
  const activeTutorial = tutorials.sessions.find(session => session.id === tutorials.activeId);
  const [items, setItems] = useState(() => {
    const stored = readStored(browserStorage, 'nm-collection-v2', starter);
    return Array.isArray(stored) ? stored : starter;
  });
  useEffect(()=>{const progress=progressFor(items,journal.entries,library),unlocked=earnedDecorations(progress,deskState),highWater=Math.max(deskState.highWater,progress.count);if(highWater!==deskState.highWater||JSON.stringify(unlocked)!==JSON.stringify(deskState.unlocked))saveDesk({...deskState,unlocked,highWater});},[items,journal.entries,library,deskState]);
  const [search, setSearch] = useState('');
  const personalModel = useMemo(() => buildPersonalModel({ items, favorites: library.favorites, sessions: tutorials.sessions, entries: journal.entries }), [items, library.favorites, tutorials.sessions, journal.entries]);
  const [filter, setFilter] = useState('Tous');
  const [collectionFilters, setCollectionFilters] = useState({ ...emptyFilters, sort:'color' });
  const [shelfStyle,setShelfStyle]=useState(()=>readStored(browserStorage,'nm-shelf-style-v2','open')==='botanical'?'botanical':'open');
  const [compactCollection, setCompactCollection] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  useEffect(() => { track('screen_viewed', {}, { screen: tab }); if(tab==='collection')track('collection_opened',{}, {screen:tab}); if(tab==='create')track('create_opened',{}, {screen:tab}); if(tab==='journal')track('journal_opened',{}, {screen:tab}); }, []);
  useEffect(() => setVisibleCount(40), [search, filter, collectionFilters, shelfTone]);
  const [edit, setEdit] = useState(null);
  const [productDraft,setProductDraft]=useState(()=>readStored(browserStorage,'nm-product-draft-v1',null));
  useEffect(()=>{if(!edit)return;setProductDraft(edit);try{browserStorage.setItem('nm-product-draft-v1',JSON.stringify(edit));}catch{setSaveError('Le brouillon ne peut pas être conservé. Garde cette fiche ouverte.');}},[edit]);
  const productName = useRef(null), productCamera = useRef(null), productColorArea = useRef(null);
  const [importer, setImporter] = useState(false);
  const [equipmentOpen,setEquipmentOpen]=useState(false);
  const [addCategory,setAddCategory]=useState('product');
  const [saveError, setSaveError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [shadeValid, setShadeValid] = useState(true);
  const mood=profileMood(profile);
  useEffect(()=>{const style=applyMood(mood);onThemeChange?.(style);},[mood,onThemeChange]);
  const material = edit?.type === 'Matériel';

  function navigate(next) {
    if (next === 'equipment') { setCollectionView('desk'); setFilter('Matériel'); setSearch(''); setCollectionFilters({ ...emptyFilters }); next = 'collection'; }
    setTab(['favorites', 'projects', 'tutorials'].includes(next) ? 'create' : next);
    setRoute('#' + tabRoutes[next]);
    window.location.hash = tabRoutes[next];
    window.scrollTo({ top: 0, behavior: 'instant' });
    track('screen_viewed', {}, { screen: next });
  }
  useEffect(() => {
    let current=window.location.hash;
    const rememberScroll=()=>{if(window.location.hash===current)routeScroll.current.set(current,window.scrollY);};
    const followRoute = () => { current=window.location.hash;setTab(tabFromHash());setRoute(current);const top=routeScroll.current.get(current)||0;requestAnimationFrame(()=>window.scrollTo({top,behavior:'instant'})); };
    window.addEventListener('hashchange', followRoute);window.addEventListener('scroll',rememberScroll,{passive:true});
    return () => {window.removeEventListener('hashchange', followRoute);window.removeEventListener('scroll',rememberScroll);};
  }, []);

  useEffect(()=>{const changed=()=>setLibrary(readInspirations(browserStorage));window.addEventListener('nm-library-updated',changed);return()=>window.removeEventListener('nm-library-updated',changed);},[browserStorage]);
  function changeProfile(next) {
    try { browserStorage.setItem('nm-profile', JSON.stringify(next)); saveThemeBackup(browserStorage, profileMood(next).id); setProfile(next); setAppError(''); return true; }
    catch { setAppError('Ton profil n’a pas pu être sauvegardé. Libère un peu de stockage sur cet appareil puis réessaie.'); return false; }
  }
  function changePersonalization(next) {
    try { browserStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(next)); setPersonalSettings(next); setPersonalError(''); }
    catch { setPersonalError('Ce réglage n’a pas pu être enregistré. Le choix précédent est conservé. Libère un peu de stockage sur cet appareil puis réessaie.'); }
  }
  function saveLibrary(next, allowMemory = false) {
    if(limited){if(allowMemory){setLibrary(next);return true;}setAppError('La sauvegarde des inspirations est disponible avec Plus. Tu peux continuer à créer des idées.');return false;}
    try { browserStorage.setItem(INSPIRATIONS_KEY, JSON.stringify(next)); setLibrary(next); setAppError(''); return true; }
    catch { if (allowMemory) setLibrary(next); setAppError('Cette inspiration reste visible, mais la sauvegarde n’a pas abouti sur cet appareil. Les favoris déjà enregistrés sont conservés. Libère un peu de stockage puis réessaie.'); return false; }
  }
  function openIdea(idea, options, action) {
    const saved = snapshotIdea(idea, { ...(options || idea.options), ...(idea.intent ? { intent: idea.intent } : {}) });
    setIdeaAction({key:saved.key,action});
    const origin=window.location.hash||'#accueil';
    if(origin!=='#inspiration/'+saved.key){ideaOrigins.current={...ideaOrigins.current,[saved.key]:origin};try{browserStorage.setItem('nm-idea-origins-v1',JSON.stringify(Object.fromEntries(Object.entries(ideaOrigins.current).slice(-100))));}catch{}}
    if(browserStorage.accountScoped&&browserStorage.accountTier==='free'&&saved.intent==='photos')setLibrary(rememberIdea(library,saved));else saveLibrary(rememberIdea(library, saved), true);
    setTab('create');
    setRoute('#inspiration/' + saved.key);
    window.location.hash = 'inspiration/' + saved.key;
  }
  function returnFromIdea(idea){const origin=ideaOrigins.current[idea.key];window.location.hash=typeof origin==='string'&&/^#(accueil|creer|scan|journal|favoris|projets|inspiration)(\/|$)/.test(origin)?origin:idea.intent==='scan'?'scan':'creer';}
  function publishIdea(idea,patch) { const next={...idea,...patch};const replace=item=>item?.key===idea.key?next:item;return saveLibrary({...library,recent:library.recent.map(replace),favorites:(library.favorites.some(i=>i.key===idea.key)?library.favorites:[idea,...library.favorites]).map(replace),projects:(library.projects||[]).map(replace),selected:replace(library.selected)}); }
  function renameIdea(key, title) { return saveLibrary(renameInspiration(library, key, title)); }
  function saveIdea(idea) { const saved=saveLibrary(saveInspiration(library, idea));if(saved)track('generation_saved',{technique:idea?.technique||'mixed',render_mode:'illustrated',used_collection:Boolean(idea?.options?.intent==='collection')},{screen:'create'});return saved; }
  function saveProjectIdea(idea) { const ok=saveLibrary(saveIdeaProject(library, idea));if(ok)track('project_created',{});return ok; }
  function favoriteIdea(idea) {
    const snapshot=snapshotIdea(idea),previous=library.favorites.find(row=>row.key===snapshot.key);
    const ok=saveLibrary(toggleFavorite(library,snapshot));
    if(ok)undoNotice.show(previous?'Inspiration retirée des favoris':'Inspiration enregistrée',previous?()=>saveLibrary(restoreFavorite(readInspirations(browserStorage),previous)):null);
    return ok;
  }
  function selectIdea(idea, clear = false) { return saveLibrary({ ...rememberIdea(library, idea), selected: clear ? null : idea }); }
  function saveTutorials(next) {
    if(limited){setAppError('Les poses guidées sauvegardées sont disponibles avec Plus.');return false;}
    try { browserStorage.setItem(TUTORIAL_KEY, JSON.stringify(next)); setTutorials(next); setAppError(''); return true; }
    catch { setAppError('Cette modification de ta pose n’a pas pu être enregistrée. La progression précédente est conservée. Libère un peu de stockage puis réessaie.'); return false; }
  }
  function openTutorial(id) {
    setTab('create'); setRoute('#tutoriel/' + id); window.location.hash = 'tutoriel/' + id;
  }
  function resumeFromHome(id) {
    const session = tutorials.sessions.find(value => value.id === id);
    if (!session || session.status === 'completed') { navigate('tutorials'); return; }
    if (session.status === 'paused' && !saveTutorials(actOnTutorial(tutorials, id, { type: 'resume' }))) return;
    openTutorial(id);
  }
  function startTutorial(idea, newPose = false, {open=true,projectId=null,sessionId=null} = {}) {
    const existing = !newPose && tutorials.sessions.find(session => session.status !== 'completed' && ((session.idea.key === idea.key && (session.poseProjectId||null)===projectId)||(projectId&&session.id===sessionId&&!session.poseProjectId)));
    if (existing) {
      if(projectId&&!existing.poseProjectId&&!saveTutorials({...tutorials,sessions:tutorials.sessions.map(s=>s.id===existing.id?{...s,poseProjectId:projectId}:s)}))return;
      if (existing.status === 'paused' && !saveTutorials(actOnTutorial({...tutorials,sessions:tutorials.sessions.map(s=>s.id===existing.id&&projectId?{...s,poseProjectId:projectId}:s)}, existing.id, { type: 'resume' }))) return;
      if(open)openTutorial(existing.id); return existing.id;
    }
    const session = {...newTutorial(idea, 'pose-' + messageId()),...(projectId?{poseProjectId:projectId}:{})};
    if (saveTutorials(addTutorial(tutorials, session))) {if(open)openTutorial(session.id); return session.id;}
  }
  function finishIdea(idea) {
    const result = markIdeaDone(tutorials, idea, 'pose-' + messageId());
    if (result.store === tutorials || saveTutorials(result.store)) {if(import.meta.env.VITE_POSE_CYCLE_ENABLED==='true'&&browserStorage.accountScoped)openTutorial(result.session.id);else journalForSession(result.session);}
  }
  function tutorialAction(action) {
    if (!tutorialSession) return false;
    const next = actOnTutorial(tutorials, tutorialSession.id, action);
    return next === tutorials ? false : saveTutorials(next);
  }
  function openJournal(path = '') {
    const next = 'journal' + (path ? '/' + path : '');
    setTab('journal'); setRoute('#' + next); window.location.hash = next;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function journalForSession(session) {
    if (session.status !== 'completed') return;
    const existing = journal.entries.find(entry => entry.sessionId === session.id);
    openJournal(existing ? existing.id : 'pose/' + session.id);
  }
  function journalForIdea(idea) {
    const saved=snapshotIdea(idea,idea.options);
    setJournalDraftIdea(saved);
    saveLibrary(rememberIdea(library,saved),true);
    openJournal('idee/'+saved.key);
  }
  function saveJournal(next) {
    if(!journalAllowed){const error='Reconnecte-toi pour enregistrer ta pose personnelle.';setAppError(error);return {ok:false,error};}
    try { browserStorage.setItem(JOURNAL_KEY, JSON.stringify(next)); setJournal(next); setAppError(''); return { ok: true }; }
    catch {
      const error = 'Le journal n’a pas pu être sauvegardé. Tes souvenirs déjà enregistrés sont conservés. Libère un peu de stockage sur cet appareil puis réessaie.';
      setAppError(error); return { ok: false, error };
    }
  }
  function saveJournalEntry(draft) {
    try {
      const result = putJournalEntry(journal, draft);
      const saved = saveJournal(result.store);
      if(saved.ok)track('journal_entry_saved',{type:draft.type||'pose',visibility:draft.visibility||'private',source:draft.source||'manual'},{screen:'journal'});
      if(saved.ok&&draft.idea?.isProject&&!journal.entries.some(e=>e.id===draft.id))track('project_converted_to_pose',{});
      if (saved.ok) setJournalDraftIdea(null);
      return saved.ok ? { ok: true, id: result.entry.id } : saved;
    } catch (error) { return { ok: false, error: error.message }; }
  }
  function deleteJournalEntry(id) { return saveJournal(removeJournalEntry(journal, id)); }
  function dismissJournalPose(id) { return saveJournal({ ...journal, hiddenSessions: [...new Set([...journal.hiddenSessions, id])] }); }
  function openCollection(id) {
    navigate('collection');
    const product = items.find(item => item.id === id);
    if (product) { setSaveError(''); setEdit({ ...defaults, ...materialDefaults, ...product }); }
  }


  useEffect(()=>{const open=e=>{if(!e.detail?.catalogId||limited)return;setSaveError('');setEdit({...defaults,...catalogSelectionPatch(catalogCandidate({product:e.detail,score:100,confidence:'élevée',reason:'Référence catalogue exacte'})),source:'catalog'});track('pro_catalog_added',{source:'showcase'});};window.addEventListener('nm-pro-catalog',open);return()=>window.removeEventListener('nm-pro-catalog',open);},[limited]);
  function start(source, type = addCategory!=='product' ? 'Matériel' : defaults.type) {
    setImporter(false);
    setSaveError('');
    setEdit({ ...defaults, ...materialDefaults, type, source, ...(addCategory==='decor'?{equipmentCategory:'Stickers / décalcomanies'}:{}) });
    track('product_add_started',{source,category:type},{screen:'collection'});
  }

  function setOwned(row,owned){const next=setEquipmentOwned(items,row,owned,messageId);return next===items || persist(next);}
  function addOwnedEquipment(category) {
    const row=equipmentSeed.find(r=>r.legacyCategory===category);if(row)setOwned(row,true);
  }

  function change(values) {
    setSaveError('');
    setEdit(current => current ? { ...current, ...values } : null);
  }

  function persist(next) {
    try {
      browserStorage.setItem('nm-collection-v2', JSON.stringify(next));
      setItems(next);
      try{browserStorage.setItem('nm-product-draft-v1','null');}catch{}setProductDraft(null);
      setEdit(null);
      return true;
    } catch {
      setSaveError('La collection n’a pas pu être enregistrée sur cet appareil. Si le stockage est plein, retire la photo de cette fiche puis réessaie. Tes produits déjà enregistrés sont conservés.');
      return false;
    }
  }

  function addScannedProducts(products) {
    if(limited)return false;
    const next=mergeScannedProducts(items,products);
    return next===items || persist(next);
  }

  function save(forCreation = false) {
    if (!edit.name.trim() || photoBusy || importBusy) return;
    if (!material && productNeedsColor(edit) && !shadeValid) {
      setSaveError('Complète le code de ta teinte, par exemple #703650, avant d’enregistrer.');
      return;
    }
    const quantity = Number(edit.quantity ?? 1);
    if (material && (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999)) {
      setSaveError('Indique une quantité entière entre 1 et 9999.');
      return;
    }
    const product = { ...edit, createdAt:edit.createdAt||(edit.id?undefined:Date.now()), provenance: provenanceOf(edit), id: edit.id ?? messageId(), name: edit.name.trim(), brand: edit.brand.trim(), url: edit.url.trim() };
    if (material) {
      product.quantity = quantity;
      if(duplicateCustomEquipment(items,product)){setSaveError('Ce matériel existe déjà dans ta collection. Modifie la fiche existante.');return;}
    }
    const saved = persist(edit.id ? items.map(item => item.id === edit.id ? product : item) : [...items, product]);
    track(saved?'product_added':'product_add_failed',{source:edit.source||'manual',category:edit.type},{screen:'collection',success:saved});
    if (saved && forCreation) {
      setCreationEntry(isDecoration(product) ? { decorations: 'with', decorationId: String(product.id), constraints: [], duration: 90, requiredColorIds: [], intent: items.some(i => ['Vernis', 'Semi-permanent', 'Gel'].includes(i.type)) ? 'collection' : 'inspire' } : { intent: 'collection', requiredColorIds: [String(product.id)], polishCount: 'auto', constraints: [], decorations: 'auto', decorationId: '' });
      navigate('create');
    }
    if (saved && !edit.id) { setCollectionFilters({ ...emptyFilters }); setSearch(''); setFilter(material ? 'Matériel' : 'Tous'); }
  }

  const categoryItems=filter==='Produits'?items.filter(i=>i.type!=='Matériel'):filter==='Stickers & accessoires'?items.filter(isDecoration):filter==='Matériel'?items.filter(i=>!isDecoration(i)):items;
  const usedItems=useMemo(()=>withUsage(items,journal.entries),[items,journal.entries]);
  const usedById=new Map(usedItems.map(p=>[String(p.id),p]));
  const baseResults=collectionResults(categoryItems, search, ['Produits','Stickers & accessoires'].includes(filter)?'Tous':filter, {...collectionFilters,sort:'source'}).map(p=>usedById.get(String(p.id))||p);
  const filtered=sortShelf(baseResults.filter(p=>!shelfTone||p.type==='Matériel'||toneOf(p)===shelfTone),collectionFilters.sort);
  function createWith(p){setCreationEntry({intent:'collection',requiredColorIds:[String(p.id)],polishCount:'auto',constraints:[],decorations:'auto',decorationId:''});navigate('create');}
  useEffect(()=>{const open=e=>{const target=e.detail;if(!target)return;setProShelvesOpen(false);const owned=items.find(p=>sameReference(target,p));if(owned){createWith(owned);}else{const {id,createdAt,shelfUsage,...safe}=target;setSaveError('');setEdit({...defaults,...safe,color:safe.color||'',shade:safe.colorSource==='palette'?'':safe.color||'',family:safe.family||'',finish:safe.finish||'',source:'pro',provenance:target.catalogId?{kind:'personal',catalogId:target.catalogId}:undefined});}};window.addEventListener('nm-shelf-create',open);return()=>window.removeEventListener('nm-shelf-create',open);},[items]);
  const duplicates = edit ? duplicateCandidates(edit, items) : [];

  if(onboarding)return <Onboarding profile={profile} onChange={changeProfile} identityExtras={identityExtras} appearanceExtras={appearanceExtras} onDone={()=>{setOnboarding(false);setTour(true);navigate('home');}}/>;
  return <div className="app phase2" data-page={tab} data-mood={mood.id} style={themeStyle(mood)}>
    <header><Brand /><NotificationButton /><ContextHelp onNavigate={navigate} key={(route || tab) + (tab === 'collection' && filter === 'Matériel' ? 'equipment' : '')} screen={tab==='feed'?'home':route.startsWith('#tutoriel') ? 'tutorial' : route.startsWith('#inspiration/') || route === '#favoris' ? 'moodboard' : tab === 'create' ? 'generator' : tab === 'collection' && filter === 'Matériel' ? 'equipment' : tab} step={route.startsWith('#inspiration/') ? 'detail' : route.startsWith('#journal/') ? 'entry' : 'overview'} /><button className="round" data-tour="profile" aria-label="Profil" onClick={() => navigate('profile')}><UserRound /></button></header>
    {import.meta.env.VITE_DEPLOYMENT_ENV==='recette' && <aside role="status" style={{textAlign:'center',background:'var(--surfaceSecondary)',color:'var(--textSecondary)',fontSize:'11px',padding:'6px 10px'}}>NailMoods-Recette · environnement de test séparé</aside>}
    <SocialGlobal /><Discovery onAccount={()=>{window.location.hash='profil/'+(browserStorage.accountScoped?'offer':'account');}} />
    <main>
      {tab !== 'profile' && syncNotice}
      <div id="context-help-slot" />
      {appError && <p className="formError appStorageError" role="alert">{appError}</p>}
      {tab !== 'home' && tab !== 'scan' && tab !== 'collection' && !route.startsWith('#tutoriel') && <TutorialBanner session={activeTutorial} onOpen={openTutorial} />}
      {locked ? <section className="creationEmpty"><h1>Disponible avec Plus</h1><p>Ta collection et tes poses restent conservées dans ton compte.</p><button onClick={()=>navigate('profile')}>Mon compte</button><button onClick={()=>navigate('create')}>Trouver une inspiration</button></section> : tab === 'feed' ? <Discovery embedded profile={profile} onAccount={()=>{window.location.hash='profil/'+(browserStorage.accountScoped?'offer':'account');}}/> : tab === 'scan' ? <ScanGenerate profile={profile} items={items} onOpen={openIdea} onBack={() => navigate('create')} capabilities={{addScannedProducts:!limited}} onAddProducts={addScannedProducts} /> : route.startsWith('#tutoriel') ? tutorialSession ? <TutorialView key={tutorialSession.id} session={tutorialSession} items={items} onAction={tutorialAction} onOpenIdea={openIdea} onCollection={openCollection} onNew={idea => startTutorial(idea, true)} onList={() => navigate('tutorials')} onJournal={() => journalForSession(tutorialSession)} journaled={journal.entries.some(entry => entry.sessionId === tutorialSession.id)} /> : route === '#tutoriel' ? <TutorialsList sessions={tutorials.sessions} onOpen={openTutorial} onCreate={() => navigate('create')} /> : <section className="creationEmpty"><h1>Ce tutoriel n’est pas disponible</h1><button onClick={() => navigate('tutorials')}>Mes poses guidées</button></section> : tab === 'create' ? <CreateView onProfileChange={changeProfile} onMoodChange={id=>changeProfile({...profile,visualMood:id})} ideaAction={ideaAction} onIdeaBack={returnFromIdea} onPublish={publishIdea} onShareToPro={onShareToPro} onSaveIdea={saveIdea} onSaveProject={saveProjectIdea} onJournalIdea={journalForIdea} entryOptions={creationEntry} onEntryConsumed={() => setCreationEntry(null)} onRename={renameIdea} onEquipment={addOwnedEquipment} personalModel={personalModel} personalSettings={personalSettings} onPersonalization={() => { setPersonalError(''); setPersonalOpen(true); }} items={items} profile={profile} onCollection={openCollection} route={route} library={library} onOpen={openIdea} onFavorite={favoriteIdea} onSelect={selectIdea} onRoute={navigate} onTutorial={startTutorial} onDone={finishIdea} tutorials={tutorials.sessions} /> : tab === 'collection' ? <section className="collectionExperience">
        <div className="nmCollectionHeading"><h1>{collectionView==='book'?'Mon livre de poses':collectionView==='desk'?'Mon bureau':filter==='Matériel'?'Mon matériel':'Collection'}</h1><span>{collectionView==='book'?journal.entries.length:collectionView==='desk'?items.filter(p=>p.type==='Matériel').length:filtered.length} {collectionView==='book'?'pose':'fiche'}{(collectionView==='book'?journal.entries.length:collectionView==='desk'?items.filter(p=>p.type==='Matériel').length:filtered.length)>1?'s':''}</span></div>
        <div className="nmCollectionActions">
          <div className="nmCollectionModes">
            <ViewSwitch value={collectionView} onChange={v=>{setCollectionView(v);if(v==='desk'){setFilter('Matériel');setSearch('');setShelfTone('');setCollectionFilters({...emptyFilters});}else if(filter==='Matériel')setFilter('Tous');try{browserStorage.setItem('nm-collection-view',JSON.stringify(v));}catch{}}}/>
            {collectionView!=='book'&&<button className="nmCollectionFilterButton" aria-label="Réglages de la collection" title="Rechercher, filtrer et trier" aria-haspopup="dialog" onClick={()=>setCollectionFiltersOpen(true)}><SlidersHorizontal size={22} aria-hidden="true"/>{(search||filter!=='Tous'||collectionFilters.sort!=='color'||collectionFilters.brand||collectionFilters.family||collectionFilters.finish||collectionFilters.productKind||collectionFilters.favorites)&&<i aria-label="Recherche ou filtres actifs"/>}</button>}
          </div>
          {collectionView!=='book'&&<button className="addProduct" onClick={() => {if(collectionView==='desk'||filter==='Matériel'){setEquipmentOpen(true);return;}setAddCategory(filter==='Stickers & accessoires'?'decor':'product');setImporter(true);}} aria-label="Ajouter un produit" title="Ajouter un produit"><Plus /><span className="nmVisuallyHidden">Ajouter</span></button>}
        </div>
        {!['desk','book'].includes(collectionView)&&<ShelfToneFilter items={baseResults} value={shelfTone} onChange={setShelfTone}/>}
        {collectionView==='book'&&<PersonalPoseBook entries={journal.entries} renderVisual={entry=><JournalVisual entry={entry} media={media} compact/>} onNavigate={openJournal} onSave={saveJournalEntry}/>}
        {collectionView==='desk'&&<Desk items={items} state={deskState} onChange={saveDesk} entries={journal.entries} library={library} media={media} onAdd={()=>setEquipmentOpen(true)} onEdit={item=>{setSaveError('');setEdit({...defaults,...materialDefaults,...item});}} onCreate={()=>navigate('create')} onTutorials={()=>navigate('tutorials')} error={deskError}/>}
        {collectionView==='shelf'&&<Shelf variant={shelfStyle} items={filtered.slice(0,visibleCount).filter(p=>p.type!=='Matériel')} sort={collectionFilters.sort} selectedId={shelfSelection?.product.id} onSelect={(...args)=>setShelfSelection(selectBottle(...args))}/>}
        {!['desk','book'].includes(collectionView)&&<section className={'collectionGrid ' + (compactCollection ? 'collectionCompact' : '')}>
          {filtered.slice(0, visibleCount).filter(item=>collectionView==='photos'||item.type==='Matériel').map(item => <button key={item.id} className="productCard" style={{ '--product-accent': item.type === 'Matériel' ? 'var(--a)' : productColor(item) }} onClick={() => {
            setSaveError('');
            setEdit({ ...defaults, ...materialDefaults, ...item });
          }}>
            {item.photo ? <div className="productPhoto"><img src={item.photo} alt={item.name} loading="lazy" /></div> :
              item.type === 'Matériel' ? <EquipmentVisual item={item} /> :
                <div className="bottle" aria-hidden="true"><i style={{ background: productColor(item) }} /><span style={{ background: productColor(item) }} /></div>}
            <div className="productInfo">
              <small>{item.type === 'Matériel' ? equipmentInfo(item).name : [item.type, item.family, item.depth].filter(Boolean).join(' · ')}</small>
              <b>{item.name}</b>
              {item.brand && <span>{item.brand}</span>}{item.reference && <span>Réf. {item.reference}</span>}<span>{item.type === 'Matériel'
                ? [item.materialStyle, 'Qté : ' + (item.quantity ?? 1)].filter(Boolean).join(' · ')
                : [item.finish, item.effect !== 'Aucun' && item.effect].filter(Boolean).join(' · ')}</span>
            </div>
            {item.fav && <Heart className="fav" fill="currentColor" aria-label="Favori" />}
          </button>)}
        </section>}
        {social?.client&&!['desk','book'].includes(collectionView)&&<button className="nmProShelfShortcut" onClick={()=>setProShelvesOpen(true)}><Library size={16}/><span>L’étagère des PO</span></button>}
        {!['desk','book'].includes(collectionView)&&filtered.length > visibleCount && <button className="collectionMore" onClick={() => setVisibleCount(value => value + 40)}>Afficher la suite ({filtered.length - visibleCount})</button>}
        {!['desk','book'].includes(collectionView)&&filtered.length === 0 && <section className="emptyCollection">
          <Package aria-hidden="true" />
          <h2>{items.length ? 'Aucun résultat' : filter === 'Matériel' ? 'Ta boîte à matériel' : 'Aucun produit pour le moment'}</h2>
          <p>{items.length ? 'Essaie un autre nom ou efface les filtres.' : filter === 'Matériel' ? 'Lampes, stickers, pinceaux, limes… Rassemble ici ce que tu possèdes.' : 'Ta collection personnalise tes idées. Tu peux aussi créer sans ajouter de produit.'}</p>
          {!items.length?<><button onClick={()=>setImporter(true)}><Plus/>Ajouter mon premier produit</button><button className="nmQuiet" onClick={()=>navigate('create')}>Créer sans collection</button></>:<button onClick={()=>{setSearch('');setFilter('Tous');setShelfTone('');setCollectionFilters({...emptyFilters});}}>Réinitialiser les filtres</button>}
        </section>}
      </section> : tab === 'profile' ? <ProfileView onExplore={() => { setCreationEntry({...profileDefaults(profile),intent:items.length?'collection':'inspire',mode:'change',escapeBubble:true}); navigate('create'); }} media={media} journal={journal} library={library} onJournal={openJournal} onOpen={openIdea} onRestartOnboarding={()=>{if(changeProfile({...profile,onboarding_step:0,onboarding_completed:false}))setOnboarding(true);}} route={route} onHelp={()=>setFeedbackOpen(true)} accountAccess={accountAccess} identityExtras={identityExtras} extras={profileExtras} appearanceExtras={appearanceExtras} onCreate={() => { setCreationEntry(profileDefaults(profile)); navigate('create'); }} onEquipment={() => navigate('equipment')} onFavorites={() => navigate('favorites')} personalModel={personalModel} personalSettings={personalSettings} onPersonalization={() => { setPersonalError(''); setPersonalOpen(true); }} profile={profile} items={items} onChange={changeProfile} onCollection={() => navigate('collection')} /> : tab === 'home' ? <HomeView onScan={() => navigate('scan')} onCreate={() => { setCreationEntry({ intent: 'inspire' }); navigate('create'); }} profile={profile} items={items} library={library} journal={journal} tutorials={tutorials} personalModel={personalModel} personalSettings={personalSettings} onNavigate={navigate} onOpen={openIdea} onResume={resumeFromHome} onJournal={openJournal} onJournalSession={journalForSession} onCollection={openCollection} onPersonalization={() => { setPersonalError(''); setPersonalOpen(true); }} /> : <JournalView onShareToPro={onShareToPro} media={media} onFavorites={() => navigate('favorites')} library={library} profile={profile} journal={journal} sessions={tutorials.sessions} items={items} route={route} draftIdea={journalDraftIdea} onNavigate={openJournal} onSave={saveJournalEntry} onDelete={deleteJournalEntry} onDismiss={dismissJournalPose} onIdea={openIdea} onCollection={openCollection} onCreate={() => navigate('create')} />}
    <button className="betaFeedbackLink" onClick={()=>setTour(true)}>Visiter NailMoods</button>
    <button className="betaFeedbackLink" onClick={()=>setFeedbackOpen(true)}>Aide & Support</button>
    </main>
    {feedbackOpen&&<SupportPanel screen={tab} onClose={()=>setFeedbackOpen(false)}/>}
    {collectionFiltersOpen&&<Sheet title="Réglages de la collection" className="nmCollectionSettings" onClose={()=>setCollectionFiltersOpen(false)}>
      <div className="nmDeskSettingsLinks"><button className="detailSecondary" onClick={()=>{setCollectionView('desk');setFilter('Matériel');setSearch('');try{browserStorage.setItem('nm-collection-view',JSON.stringify('desk'));}catch{setDeskError('Le choix de vue ne peut pas être enregistré.');}setCollectionFiltersOpen(false);}}>Ouvrir mon bureau</button><button className="detailSecondary" onClick={()=>{setCollectionView('photos');try{browserStorage.setItem('nm-collection-view',JSON.stringify('photos'));}catch{setDeskError('Le choix de vue ne peut pas être enregistré.');}setCollectionFiltersOpen(false);}}>Vue photo de ma collection</button><button className="detailSecondary" onClick={()=>{setCollectionFiltersOpen(false);setEquipmentOpen(true);}}>Bibliothèque du matériel</button></div>
      <fieldset className="nmShelfStyleChoice"><legend>Mon étagère</legend>{[['open','Étagères ouvertes'],['botanical','Cadre botanique']].map(([value,label])=><button type="button" key={value} aria-pressed={shelfStyle===value} onClick={()=>{setShelfStyle(value);try{browserStorage.setItem('nm-shelf-style-v2',JSON.stringify(value));}catch{setSaveError('Le style ne peut pas être enregistré.');}}}><img src={import.meta.env.BASE_URL+'atelier/collection-v2/'+(value==='open'?'plank':'frame')+'.webp'} alt=""/><span>{label}</span></button>)}</fieldset>
      <div className="collectionSearch"><Search aria-hidden="true"/><input aria-label="Rechercher dans la collection" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nom, marque, référence…"/></div>
      <div className="filterRow" role="group" aria-label="Catégories de la collection">{['Tous','Produits','Stickers & accessoires','Matériel'].map(value=><button key={value} className={filter===value?'on':''} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value==='Stickers & accessoires'?'Stickers':value}</button>)}</div>
      <CollectionFilters expanded type={filter} onType={setFilter} items={categoryItems} filters={collectionFilters} onChange={setCollectionFilters} count={filtered.length} onReset={()=>{setSearch('');setFilter('Tous');setShelfTone('');setCollectionFilters({...emptyFilters,sort:'color'});}}/>
      {collectionView==='photos'&&<div className="collectionViewBar"><button aria-pressed={compactCollection} onClick={()=>setCompactCollection(value=>!value)}>Vue compacte</button><button className="collectionCreateAction" onClick={()=>{setCollectionFiltersOpen(false);navigate('create');}}>Créer une idée <Palette size={15}/></button></div>}
      <button className="detailPrimary" onClick={()=>setCollectionFiltersOpen(false)}>Voir {filtered.length} résultat{filtered.length>1?'s':''}</button>
    </Sheet>}

    {shelfSelection&&<ProductFocus selection={shelfSelection} product={usedById.get(String(shelfSelection.product.id))||shelfSelection.product} onClose={()=>setShelfSelection(null)} onFile={()=>{setSaveError('');setEdit({...defaults,...materialDefaults,...items.find(p=>String(p.id)===String(shelfSelection.product.id))});}} onCreate={()=>createWith(shelfSelection.product)} onFavorite={()=>persist(items.map(p=>String(p.id)===String(shelfSelection.product.id)?{...p,fav:!p.fav}:p))} onPose={p=>openJournal(p.id)}/>}{proShelvesOpen&&<Sheet title="L’étagère des PO" onClose={()=>setProShelvesOpen(false)}><ProShelfDirectory client={social?.client}/></Sheet>}
    <nav>{[['home', Home, 'Accueil'], ['feed', Compass, 'Fil'], ['create', Plus, 'Créer'], ['collection', Library, 'Collection'], ['journal', BookHeart, 'Mes poses']].map(([id, Icon, label]) =>
      <button data-tour={id} key={id} className={tab === id || tab === 'scan' && id === 'create' ? 'on' : ''} aria-current={tab === id || tab === 'scan' && id === 'create' ? 'page' : undefined} onClick={() => navigate(id)}><Icon /><span>{label}{limited && id==='collection' ? ' · Plus' : ''}</span></button>
    )}</nav>

    <TutorialTimerRuntime tutorials={tutorials} onOpen={openTutorial}/>{import.meta.env.VITE_POSE_CYCLE_ENABLED==='true'&&<PlanningRuntime preferences={profile.planningNotifications}/>}
    {tour&&<CoachTour onNavigate={navigate} onFinish={()=>{if(changeProfile({...profile,guide_completed:true,guide_pending:false}))setTour(false);}}/>}
    {undoNotice.element}
    {personalOpen && <PersonalizationPanel model={personalModel} settings={personalSettings} onChange={changePersonalization} onClose={() => setPersonalOpen(false)} error={personalError} onJournal={() => { setPersonalOpen(false); navigate('journal'); }} onFavorites={() => { setPersonalOpen(false); navigate('favorites'); }} />}

    {equipmentOpen&&<EquipmentLibrary items={items} onSetOwned={setOwned} onCustom={()=>{setEquipmentOpen(false);setAddCategory('material');start('manual','Matériel');}} onClose={()=>setEquipmentOpen(false)}/>}
    {importer && <Sheet title="Comment veux-tu l’ajouter ?" eyebrow="AJOUTER À MA COLLECTION" className="importSheet" onClose={() => setImporter(false)}>
        {productDraft&&<button className="detailSecondary" onClick={()=>{setImporter(false);setEdit(productDraft);}}>Reprendre mon brouillon · {productDraft.name||'Sans nom'}</button>}
        <div className="poseTabs" aria-label="Catégorie à ajouter">{[['product','Produit'],['decor','Sticker / accessoire'],['material','Matériel']].map(([key,label])=><button key={key} aria-pressed={addCategory===key} onClick={()=>{setAddCategory(key);if(key==='material'){setImporter(false);setEquipmentOpen(true);}}}>{label}</button>)}</div><p className="fieldHelp">Produit par défaut. La catégorie reste modifiable dans la fiche.</p><div className="importChoices importChoicesPrimary">
          <button onClick={() => start('camera')}>
            <span className="importIcon"><Camera /></span><span className="importCopy"><b>Scanner / prendre en photo</b><small>Photographie le produit ou son étiquette</small></span><ChevronRight className="importArrow" />
          </button>
          <button onClick={() => start('catalog')}>
            <span className="importIcon"><Search /></span><span className="importCopy"><b>Rechercher dans NailMoods</b><small>2 631 références actives · confirmation avant ajout</small></span><ChevronRight className="importArrow" />
          </button>
          <button onClick={() => start('manual')}>
            <span className="importIcon"><PenLine /></span><span className="importCopy"><b>Ajouter manuellement</b><small>Ajoute seulement ce que tu connais</small></span><ChevronRight className="importArrow" />
          </button>
          <details className="importMore"><summary>Autres façons d’ajouter</summary><div>
            <button onClick={() => start('image')}><Image /><span><b>Importer depuis la galerie</b><small>Utilise une capture ou une image existante</small></span></button>
            <button onClick={() => start('url')}><Link /><span><b>Coller une URL</b><small>Retrouve les photos et les informations</small></span></button>
            <button onClick={() => start('barcode')}><ScanLine /><span><b>Scanner le code-barres</b><small>Photo du code ou saisie des chiffres</small></span></button>
            <button onClick={() => {setImporter(false);setEquipmentOpen(true);}}><Package /><span><b>Matériel & accessoires</b><small>Lampe, stickers, pinceaux, limes…</small></span></button>
          </div></details>
        </div>

    </Sheet>}

    {edit && <Sheet title={material ? 'Fiche matériel' : 'Fiche produit'} eyebrow={edit.id ? 'MODIFIER' : 'AJOUTER'} className="productEditorPage" onClose={() => setEdit(null)}>
        <p className="fieldHelp">{provenanceOf(edit).kind === 'nailmoods' ? 'Référence issue du catalogue NailMoods · couleur à confirmer.' : provenanceOf(edit).kind === 'verified_creator' ? 'Référence liée à un catalogue de marque.' : 'Produit personnel / non vérifié · utilisable dans tes inspirations.'}</p>
        {edit.id && (isDecoration(edit) || !auxiliary(edit) && ['Vernis', 'Semi-permanent', 'Gel'].includes(edit.type)) && <><button className="detailPrimary" disabled={photoBusy || importBusy} onClick={() => save(true)}><Palette />{isDecoration(edit) ? 'Créer avec ce sticker' : 'Créer avec cette teinte'}</button><p className="fieldHelp">Enregistre tes modifications et ouvre Créer avec ce produit.</p></>}

        {!material&&!edit.photo&&['camera','image'].includes(edit.source)&&<div className="photoActions"><button onClick={()=>productCamera.current?.click()}><Camera/>Photographier le produit ou l’étiquette</button><p className="fieldHelp">L’analyse démarre après la photo. Tu confirmes la fiche avant ajout.</p></div>}
        <label>Type<select value={edit.type} onChange={event => change({ type: event.target.value })}>
          {['Semi-permanent', 'Vernis', 'Gel', 'Effet', 'Matériel'].map(value => <option key={value}>{value}</option>)}
        </select></label>
        {material && <EquipmentCategory item={edit} onChange={change} />}
        <label>{material ? 'Nom du matériel' : 'Nom'}<input ref={productName} value={edit.name} onChange={event => change({ name: event.target.value })} placeholder={material ? equipmentInfo(edit).example : 'Nom du produit'} required /></label>
        {material&&!isDecoration(edit)&&<label>Remarque (facultative)<textarea rows="2" value={edit.notes||''} onChange={event=>change({notes:event.target.value})}/></label>}
        {!material&&<label>Marque (facultatif)<input value={edit.brand} onChange={event => change({ brand: event.target.value })} /></label>}
        {duplicates.length > 0 && <div className="duplicateNotice" role="status"><b>Peut-être déjà dans ta collection</b>{duplicates.slice(0, 3).map(({item, reason}) => <p key={item.id}>{item.name} · {reason}</p>)}<small>Tu peux conserver les deux fiches. Rien ne sera fusionné.</small></div>}
        {!material && <>
          <label>Catégorie de produit<select aria-label="Catégorie de produit" value={productKind(edit)} onChange={e=>change({productKind:e.target.value,...(e.target.value==='Top Coat mat'?{finish:'Mat'}:e.target.value==='Top Coat brillant'?{finish:'Brillant'}:{})})}>{productKinds.map(k=><option key={k}>{k}</option>)}</select></label>
          <div ref={productColorArea}><PhotoColor items={items} item={edit} onChange={change} onValidityChange={setShadeValid} /></div>
          <label>Finition<select value={edit.finish} onChange={event => change({ finish: event.target.value })}>
            {['Brillant', 'Crème', 'Jelly', 'Pailleté', 'Nacré', 'Métallique', 'Chrome', 'Cat-eye', 'Mat', 'Autre'].map(value => <option key={value}>{value}</option>)}
          </select></label>
        </>}
        <details className="nmDisclosure" open={!['manual',undefined].includes(edit.source)?true:undefined}><summary>{material?'Détails du matériel · facultatifs':'Détails du produit · facultatifs'}</summary>
        {!material&&<ProductImport onManual={() => productName.current?.focus()} onPhoto={() => productCamera.current?.click()} onColor={() => { productColorArea.current?.scrollIntoView({ block: 'center' }); productColorArea.current?.querySelector('input')?.focus(); }} item={edit} onChange={change} onBusy={setImportBusy} photoBusy={photoBusy} />}
        {!material && <label>Référence (facultatif)<input value={edit.reference || ''} onChange={event => change({ reference: event.target.value })} /></label>}
        {!material && <><div className="form2"><label>Collection de marque<input value={edit.collection || ''} onChange={event => change({ collection: event.target.value })} /></label><label>SKU<input value={edit.sku || ''} onChange={event => change({ sku: event.target.value })} /></label></div><label>Notes personnelles<textarea rows="2" value={edit.notes || ''} onChange={event => change({ notes: event.target.value })} /></label></>}
        {material && <EquipmentFields item={edit} onChange={change} hideNotes={!isDecoration(edit)} />}
        <ProductPhoto cameraInputRef={productCamera} value={edit.photo} onChange={photo => change({ photo })} onBusy={setPhotoBusy} maxSize={2400} />
        {!material && <>
          <div className="fieldHead"><b>Famille de couleur</b><small>modifiable</small></div>
          <div className="colorChips">{colors.map(([name, color]) =>
            <button key={name} className={edit.family === name ? 'on' : ''} aria-pressed={edit.family === name} onClick={() => change(colorFamilyChange(edit, name))}><i style={{ background: color }} /><span>{name}</span>{edit.family === name && <Check />}</button>
          )}</div>
          <div className="form2">
            <label>Profondeur<select value={edit.depth} onChange={event => change({ depth: event.target.value })}>{['Clair', 'Moyen', 'Foncé'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Sous-ton<select value={edit.undertone} onChange={event => change({ undertone: event.target.value })}>{['Chaud', 'Neutre', 'Froid'].map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
          <div className="form2">
            <label>Effet<select value={edit.effect} onChange={event => change({ effect: event.target.value })}>{['Aucun', 'Pailleté', 'Irisé', 'Holographique', 'Multichrome', 'Magnétique', 'Autre'].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Utilisation<select value={edit.usage} onChange={event => change({ usage: event.target.value })}>{['Couleur seule', 'Sur une couleur de base', 'Avec aimant', 'Avec top coat', 'Autre'].map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
        </>}
        </details>
        {!material&&<ProductKnowledge key={edit.id||'new'} product={edit} items={items} profile={profile} onChange={change} onProfile={()=>{setEdit(null);window.location.hash='profil/lifestyle';}}/>}
        <button className={'favoriteToggle ' + (edit.fav ? 'on' : '')} onClick={() => change({ fav: !edit.fav })}><Heart fill={edit.fav ? 'currentColor' : 'none'} /> {edit.fav ? 'Dans mes favoris' : 'Ajouter aux favoris'}</button>
        <div className="sheetActions">
          {saveError && <p className="formError" role="alert">{saveError}</p>}
          <button className="saveProduct" disabled={!edit.name.trim() || photoBusy || importBusy} onClick={() => save()}><Check />{photoBusy ? 'Préparation de la photo…' : importBusy ? 'Recherche en cours…' : 'Enregistrer'}</button>
          {!edit.name.trim() && <p className="fieldHelp">Renseigne un nom pour enregistrer.</p>}
        </div>
        {edit.id && <button className="deleteProduct" onClick={() => {const removed=items.find(item=>item.id===edit.id),category=edit.type;
          if(removed&&persist(items.filter(item=>item.id!==removed.id))){track('product_deleted',{category},{screen:'collection'});undoNotice.show('Produit retiré de la collection',()=>{try{return persist(restoreProduct(JSON.parse(browserStorage.getItem('nm-collection-v2')||'[]'),removed));}catch(e){setAppError(e.message);return false;}});}}}><Trash2 /> Supprimer</button>}
    </Sheet>}
  </div>;
}

createRoot(document.getElementById('root')).render(<RenderBoundary><AccountRoot App={App} />{isNative()&&MobileStatus&&<React.Suspense fallback={null}><MobileStatus/></React.Suspense>}</RenderBoundary>);

// Keep the selected visual theme available before account synchronisation completes.
