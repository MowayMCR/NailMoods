import { isDecoration } from './decorations';
import { auxiliary } from './creationEngine';
import { profileDefaults } from './creationEngine';
import CollectionFilters from './CollectionFilters';
import { collectionResults, emptyFilters, duplicateCandidates, provenanceOf } from './collection';
import ContextHelp from './ContextHelp';
import Feedback from './Feedback';
import { useStorage } from './StorageContext';
import AccountRoot from './cloud/AccountRoot';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, Palette, Library, BookHeart, UserRound, ChevronRight, X, Check, Search, Plus, Camera, Trash2, Heart, Link, ScanLine, Image, PenLine, WandSparkles, Package } from 'lucide-react';
import { equipmentInfo, EquipmentVisual, EquipmentCategory, EquipmentFields } from './equipment';
import ProductPhoto from './ProductPhoto';
import ProductImport from './ProductImport';
import PhotoColor from './PhotoColor';
import { colorFamilies, colorFamilyChange, productColor } from './colorAnalysis';
import CreateView from './CreateView';
import './style.css';
import ProfileView from './ProfileView';
import { defaultProfile } from './profileOptions';
import HomeView from './HomeView';
import ScanGenerate from './ScanGenerate';
import JournalView from './JournalView';
import { JOURNAL_KEY, putJournalEntry, readJournal, removeJournalEntry } from './journal';
import TutorialView, { TutorialBanner, TutorialsList } from './TutorialView';
import { TUTORIAL_KEY, readTutorials, newTutorial, addTutorial, actOnTutorial, markIdeaDone } from './tutorial';
import { INSPIRATIONS_KEY, readInspirations, rememberIdea, snapshotIdea, toggleFavorite, saveInspiration, renameInspiration } from './inspirations';
import PersonalizationPanel from './PersonalizationView';
import './design-system.css';
import './finish.css';
import { PERSONALIZATION_KEY, readPersonalization, buildPersonalModel } from './personalization';
const colors=colorFamilies;const defaults={name:'',brand:'',url:'',type:'Semi-permanent',finish:'Brillant',family:'Rose',color:'#db7897',depth:'Moyen',undertone:'Neutre',effect:'Aucun',usage:'Couleur seule',fav:false};const starter=[];const themes={nailmoods:['#b44d76','#733451','#f8e9ee','#fdfaf7'],witchy:['#8d5576','#241625','#eee4ed','#faf6f9'],girly:['#e05f8c','#b84970','#fde8ef','#fff9fb'],goth:['#a52d4e','#211a1e','#eee5e8','#faf8f8'],celestial:['#6674b5','#293567','#e9ecf8','#fafbff'],coquette:['#c84768','#8e2944','#fae7eb','#fffafb'],clean:['#7d8067','#555947','#eeeee7','#fbfbf8'],y2k:['#d850b6','#8753d1','#f2e7ff','#fdf9ff']};

function Brand() {
  return <div className="brandFinal officialBrand"><img className="brandWordmark" src={import.meta.env.BASE_URL + 'nailmoods-official.png'} alt="NailMoods — Explore. Crée. Ressens." /><img className="brandSymbol" src={import.meta.env.BASE_URL + 'nailmoods-symbol.png'} alt="NailMoods" /></div>;
}

function readStored(browserStorage, key, fallback) {
  try { return JSON.parse(browserStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

const materialDefaults = { equipmentCategory: 'Autre matériel', quantity: 1, reference: '', materialStyle: '', notes: '', photo: '' };
const tabRoutes = { scan: 'scan', home: 'accueil', create: 'creer', collection: 'collection', journal: 'journal', profile: 'profil', favorites: 'favoris', tutorials: 'tutoriel' };
const tabFromHash = () => window.location.hash.startsWith('#journal/') ? 'journal' : window.location.hash.startsWith('#inspiration/') || window.location.hash.startsWith('#tutoriel') || window.location.hash === '#favoris' ? 'create' : Object.keys(tabRoutes).find(tab => '#' + tabRoutes[tab] === window.location.hash) || 'home';

function App({ accountAccess }) {
  const browserStorage=useStorage();
  const [tab, setTab] = useState(tabFromHash);
  const [creationEntry, setCreationEntry] = useState(null);
  const [route, setRoute] = useState(() => window.location.hash);
  const [profile, setProfile] = useState(() => {
    const stored = readStored(browserStorage, 'nm-profile', {});
    return { ...defaultProfile, ...stored, styles: Array.isArray(stored?.styles) ? stored.styles : defaultProfile.styles };
  });
  const [library, setLibrary] = useState(() => readInspirations(browserStorage));
  const [appError, setAppError] = useState('');
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  const [tutorials, setTutorials] = useState(() => readTutorials(browserStorage));
  const [journal, setJournal] = useState(() => readJournal(browserStorage));
  const [personalSettings, setPersonalSettings] = useState(() => readPersonalization(browserStorage));
  const [personalOpen, setPersonalOpen] = useState(false);
  const [personalError, setPersonalError] = useState('');
  const tutorialSession = route.startsWith('#tutoriel/') ? tutorials.sessions.find(session => session.id === route.slice('#tutoriel/'.length)) : null;
  const activeTutorial = tutorials.sessions.find(session => session.id === tutorials.activeId);
  const [items, setItems] = useState(() => {
    const stored = readStored(browserStorage, 'nm-collection-v2', starter);
    return Array.isArray(stored) ? stored : starter;
  });
  const [search, setSearch] = useState('');
  const personalModel = useMemo(() => buildPersonalModel({ items, favorites: library.favorites, sessions: tutorials.sessions, entries: journal.entries }), [items, library.favorites, tutorials.sessions, journal.entries]);
  const [filter, setFilter] = useState('Tous');
  const [collectionFilters, setCollectionFilters] = useState({ ...emptyFilters });
  const [compactCollection, setCompactCollection] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  useEffect(() => setVisibleCount(40), [search, filter, collectionFilters]);
  const [edit, setEdit] = useState(null);
  const productName = useRef(null), productCamera = useRef(null), productColorArea = useRef(null);
  const [importer, setImporter] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [shadeValid, setShadeValid] = useState(true);
  const th = themes[profile.theme] || themes.nailmoods;
  const material = edit?.type === 'Matériel';

  function navigate(next) {
    if (next === 'equipment') { setFilter('Matériel'); setSearch(''); setCollectionFilters({ ...emptyFilters }); next = 'collection'; }
    setTab(['favorites', 'tutorials'].includes(next) ? 'create' : next);
    setRoute('#' + tabRoutes[next]);
    window.location.hash = tabRoutes[next];
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  useEffect(() => {
    const followRoute = () => { setTab(tabFromHash()); setRoute(window.location.hash); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('hashchange', followRoute);
    return () => window.removeEventListener('hashchange', followRoute);
  }, []);

  function changeProfile(next) {
    try { browserStorage.setItem('nm-profile', JSON.stringify(next)); setProfile(next); setAppError(''); return true; }
    catch { setAppError('Ton profil n’a pas pu être sauvegardé. Libère un peu de stockage sur cet appareil puis réessaie.'); return false; }
  }
  function changePersonalization(next) {
    try { browserStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(next)); setPersonalSettings(next); setPersonalError(''); }
    catch { setPersonalError('Ce réglage n’a pas pu être enregistré. Le choix précédent est conservé. Libère un peu de stockage sur cet appareil puis réessaie.'); }
  }
  function saveLibrary(next, allowMemory = false) {
    try { browserStorage.setItem(INSPIRATIONS_KEY, JSON.stringify(next)); setLibrary(next); setAppError(''); return true; }
    catch { if (allowMemory) setLibrary(next); setAppError('Cette inspiration reste visible, mais la sauvegarde n’a pas abouti sur cet appareil. Les favoris déjà enregistrés sont conservés. Libère un peu de stockage puis réessaie.'); return false; }
  }
  function openIdea(idea, options) {
    const saved = snapshotIdea(idea, { ...(options || idea.options), ...(idea.intent ? { intent: idea.intent } : {}) });
    saveLibrary(rememberIdea(library, saved), true);
    setTab('create');
    setRoute('#inspiration/' + saved.key);
    window.location.hash = 'inspiration/' + saved.key;
  }
  function renameIdea(key, title) { return saveLibrary(renameInspiration(library, key, title)); }
  function saveIdea(idea) { return saveLibrary(saveInspiration(library, idea)); }
  function favoriteIdea(idea) { return saveLibrary(toggleFavorite(library, snapshotIdea(idea))); }
  function selectIdea(idea, clear = false) { return saveLibrary({ ...rememberIdea(library, idea), selected: clear ? null : idea }); }
  function saveTutorials(next) {
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
  function startTutorial(idea, newPose = false) {
    const existing = !newPose && tutorials.sessions.find(session => session.idea.key === idea.key && session.status !== 'completed');
    if (existing) {
      if (existing.status === 'paused' && !saveTutorials(actOnTutorial(tutorials, existing.id, { type: 'resume' }))) return;
      openTutorial(existing.id); return;
    }
    const session = newTutorial(idea, 'pose-' + crypto.randomUUID());
    if (saveTutorials(addTutorial(tutorials, session))) openTutorial(session.id);
  }
  function finishIdea(idea) {
    const result = markIdeaDone(tutorials, idea, 'pose-' + crypto.randomUUID());
    if (result.store === tutorials || saveTutorials(result.store)) openTutorial(result.session.id);
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
  function saveJournal(next) {
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

  useEffect(() => {
    if (!edit && !importer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = event => {
      if (event.key === 'Escape') { setEdit(null); setImporter(false); }
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', escape);
    };
  }, [Boolean(edit), importer]);

  function start(source, type = filter === 'Matériel' ? 'Matériel' : defaults.type) {
    setImporter(false);
    setSaveError('');
    setEdit({ ...defaults, ...materialDefaults, type, source });
  }

  function addOwnedEquipment(category) {
    if (!['Lampe UV / LED', 'Aimant cat-eye'].includes(category)) return;
    const next = [...items, { ...materialDefaults, id: crypto.randomUUID(), type: 'Matériel', name: category, equipmentCategory: category, source: 'manual' }];
    if (!persist(next)) setAppError('Le matériel n’a pas pu être sauvegardé. Libère du stockage puis réessaie.');
    else setAppError('');
  }

  function change(values) {
    setSaveError('');
    setEdit(current => current ? { ...current, ...values } : null);
  }

  function persist(next) {
    try {
      browserStorage.setItem('nm-collection-v2', JSON.stringify(next));
      setItems(next);
      setEdit(null);
      return true;
    } catch {
      setSaveError('La collection n’a pas pu être enregistrée sur cet appareil. Si le stockage est plein, retire la photo de cette fiche puis réessaie. Tes produits déjà enregistrés sont conservés.');
      return false;
    }
  }

  function save(forCreation = false) {
    if (!edit.name.trim() || photoBusy || importBusy) return;
    if (!material && !shadeValid) {
      setSaveError('Complète le code de ta teinte, par exemple #703650, avant d’enregistrer.');
      return;
    }
    const quantity = Number(edit.quantity ?? 1);
    if (material && (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999)) {
      setSaveError('Indique une quantité entière entre 1 et 9999.');
      return;
    }
    const product = { ...edit, provenance: provenanceOf(edit), id: edit.id ?? crypto.randomUUID(), name: edit.name.trim(), brand: edit.brand.trim(), url: edit.url.trim() };
    if (material) product.quantity = quantity;
    const saved = persist(edit.id ? items.map(item => item.id === edit.id ? product : item) : [...items, product]);
    if (saved && forCreation) {
      setCreationEntry(isDecoration(product) ? { decorations: 'with', decorationId: String(product.id), constraints: [], duration: 90, requiredColorIds: [], intent: items.some(i => ['Vernis', 'Semi-permanent', 'Gel'].includes(i.type)) ? 'collection' : 'inspire' } : { intent: 'collection', requiredColorIds: [String(product.id)], polishCount: 'auto', constraints: [], decorations: 'auto', decorationId: '' });
      navigate('create');
    }
    if (saved && !edit.id) { setCollectionFilters({ ...emptyFilters }); setSearch(''); setFilter(material ? 'Matériel' : 'Tous'); }
  }

  const filtered = collectionResults(items, search, filter, collectionFilters);
  const duplicates = edit ? duplicateCandidates(edit, items) : [];
  const colorCount = new Set(items.filter(item => item.type !== 'Matériel' && item.family).map(item => item.family)).size;

  return <div className="app phase2" style={{ '--a': th[0], '--b': th[1], '--soft': th[2], '--paper': th[3] }}>
    <header><Brand /><ContextHelp onNavigate={navigate} key={(route || tab) + (tab === 'collection' && filter === 'Matériel' ? 'equipment' : '')} screen={route.startsWith('#tutoriel') ? 'tutorial' : route.startsWith('#inspiration/') || route === '#favoris' ? 'moodboard' : tab === 'create' ? 'generator' : tab === 'collection' && filter === 'Matériel' ? 'equipment' : tab} step={route.startsWith('#inspiration/') ? 'detail' : route.startsWith('#journal/') ? 'entry' : 'overview'} /><button className="round" aria-label="Profil" onClick={() => navigate('profile')}><UserRound /></button></header>
    <main>
      <div id="context-help-slot" />
      {appError && <p className="formError appStorageError" role="alert">{appError}</p>}
      {tab !== 'home' && tab !== 'scan' && !route.startsWith('#tutoriel') && <TutorialBanner session={activeTutorial} onOpen={openTutorial} />}
      {tab === 'scan' ? <ScanGenerate profile={profile} items={items} onBack={() => navigate('home')} /> : route.startsWith('#tutoriel') ? tutorialSession ? <TutorialView key={tutorialSession.id} session={tutorialSession} items={items} onAction={tutorialAction} onOpenIdea={openIdea} onCollection={openCollection} onNew={idea => startTutorial(idea, true)} onList={() => navigate('tutorials')} onJournal={() => journalForSession(tutorialSession)} journaled={journal.entries.some(entry => entry.sessionId === tutorialSession.id)} /> : route === '#tutoriel' ? <TutorialsList sessions={tutorials.sessions} onOpen={openTutorial} onCreate={() => navigate('create')} /> : <section className="creationEmpty"><h1>Ce tutoriel n’est pas disponible</h1><button onClick={() => navigate('tutorials')}>Mes poses guidées</button></section> : tab === 'create' ? <CreateView onSaveIdea={saveIdea} entryOptions={creationEntry} onEntryConsumed={() => setCreationEntry(null)} onRename={renameIdea} onEquipment={addOwnedEquipment} personalModel={personalModel} personalSettings={personalSettings} onPersonalization={() => { setPersonalError(''); setPersonalOpen(true); }} items={items} profile={profile} onCollection={openCollection} route={route} library={library} onOpen={openIdea} onFavorite={favoriteIdea} onSelect={selectIdea} onRoute={navigate} onTutorial={startTutorial} onDone={finishIdea} tutorials={tutorials.sessions} /> : tab === 'collection' ? <>
        <section className="collectionHero">
          <small>MES PRODUITS</small><h1>Ma collection</h1>
          <p>Tes couleurs, tes effets et tout ton matériel de manucure.</p>
          <div className="collectionStats">
            <div><b>{items.length}</b><span>Produits</span></div>
            <div><b>{colorCount}</b><span>Couleurs</span></div>
            <div><b>{items.filter(item => item.fav).length}</b><span>Favoris</span></div>
          </div>
        </section>
        <section className="collectionTools">
          <div className="collectionSearch"><Search /><input aria-label="Rechercher dans la collection" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher…" /></div>
          <button className="addProduct" onClick={() => filter === 'Matériel' ? start('manual', 'Matériel') : setImporter(true)}><Plus /> Ajouter</button>
        </section>
        <div className="filterRow">
          {['Tous', 'Semi-permanent', 'Vernis', 'Gel', 'Effet', 'Matériel'].map(value =>
            <button key={value} className={filter === value ? 'on' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>
          )}
        </div>
        <CollectionFilters items={items.filter(item => filter === 'Tous' || item.type === filter)} filters={collectionFilters} onChange={setCollectionFilters} count={filtered.length} />
        <div className="collectionViewBar"><span>{filtered.length} fiche{filtered.length > 1 ? 's' : ''}</span><button aria-pressed={compactCollection} onClick={() => setCompactCollection(value => !value)}>Vue compacte</button><button className="collectionCreateAction" onClick={() => navigate('create')}>Créer une idée <Palette size={15} /></button></div>
        <section className={'collectionGrid ' + (compactCollection ? 'collectionCompact' : '')}>
          {filtered.slice(0, visibleCount).map(item => <button key={item.id} className="productCard" style={{ '--product-accent': item.type === 'Matériel' ? 'var(--a)' : productColor(item) }} onClick={() => {
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
        </section>
        {filtered.length > visibleCount && <button className="collectionMore" onClick={() => setVisibleCount(value => value + 40)}>Afficher la suite ({filtered.length - visibleCount})</button>}
        {filtered.length === 0 && <section className="emptyCollection">
          <Package aria-hidden="true" />
          <h2>{items.length ? 'Aucun résultat' : filter === 'Matériel' ? 'Ta boîte à matériel' : 'Aucun produit pour le moment'}</h2>
          <p>{items.length ? 'Essaie un autre nom ou efface les filtres.' : filter === 'Matériel' ? 'Lampes, stickers, pinceaux, limes… Rassemble ici ce que tu possèdes.' : 'Ta collection personnalise tes idées. Tu peux aussi créer sans ajouter de produit.'}</p>
          {!search && <button onClick={() => filter === 'Matériel' ? start('manual', 'Matériel') : setImporter(true)}><Plus />{filter === 'Matériel' ? 'Ajouter du matériel' : 'Ajouter un produit'}</button>}
        </section>}
        <section className="phase3Preview">
          <small>MES ENVIES</small><h2>Et si on créait avec tout ça ?</h2>

          <button className="moreIdeas" onClick={() => navigate('create')}><Palette />Générer une idée</button>
        </section>
      </> : tab === 'profile' ? <ProfileView accountAccess={accountAccess} onCreate={() => { setCreationEntry(profileDefaults(profile)); navigate('create'); }} onEquipment={() => navigate('equipment')} onFavorites={() => navigate('favorites')} personalModel={personalModel} personalSettings={personalSettings} onPersonalization={() => { setPersonalError(''); setPersonalOpen(true); }} profile={profile} items={items} onChange={changeProfile} onCollection={() => navigate('collection')} /> : tab === 'home' ? <HomeView onScan={() => navigate('scan')} onCreate={() => { setCreationEntry({ intent: 'inspire' }); navigate('create'); }} profile={profile} items={items} library={library} journal={journal} tutorials={tutorials} personalModel={personalModel} personalSettings={personalSettings} onNavigate={navigate} onOpen={openIdea} onResume={resumeFromHome} onJournal={openJournal} onJournalSession={journalForSession} onCollection={openCollection} onPersonalization={() => { setPersonalError(''); setPersonalOpen(true); }} /> : <JournalView onFavorites={() => navigate('favorites')} library={library} profile={profile} journal={journal} sessions={tutorials.sessions} items={items} route={route} onNavigate={openJournal} onSave={saveJournalEntry} onDelete={deleteJournalEntry} onDismiss={dismissJournalPose} onIdea={openIdea} onCollection={openCollection} onCreate={() => navigate('create')} />}
    <button className="betaFeedbackLink" onClick={()=>setFeedbackOpen(true)}>Donner mon avis sur NailMoods</button>
    </main>
    {feedbackOpen&&<Feedback screen={tab} onClose={()=>setFeedbackOpen(false)}/>}
    <nav>{[['home', Home, 'Accueil'], ['create', Palette, 'Créer'], ['collection', Library, 'Collection'], ['journal', BookHeart, 'Journal'], ['profile', UserRound, 'Profil']].map(([id, Icon, label]) =>
      <button key={id} className={tab === id || tab === 'scan' && id === 'home' ? 'on' : ''} aria-current={tab === id || tab === 'scan' && id === 'home' ? 'page' : undefined} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>
    )}</nav>

    {personalOpen && <PersonalizationPanel model={personalModel} settings={personalSettings} onChange={changePersonalization} onClose={() => setPersonalOpen(false)} error={personalError} onJournal={() => { setPersonalOpen(false); navigate('journal'); }} onFavorites={() => { setPersonalOpen(false); navigate('favorites'); }} />}

    {importer && <div className="overlay" onClick={() => setImporter(false)}>
      <section className="productSheet importSheet" role="dialog" aria-modal="true" aria-labelledby="import-title" onClick={event => event.stopPropagation()}>
        <div className="grab" />
        <div className="sheetTitle"><div><small>NOUVEAU PRODUIT</small><h2 id="import-title">Comment veux-tu l’ajouter ?</h2></div><button aria-label="Fermer" onClick={() => setImporter(false)}><X /></button></div>
        <div className="importChoices">
          <button onClick={() => start('manual', 'Matériel')}>
            <span className="importIcon"><Package /></span><span className="importCopy"><b>Matériel & accessoires</b><small>Lampe, stickers, pinceaux, limes…</small></span><ChevronRight className="importArrow" />
          </button>
          {[
            [Search, 'Rechercher dans NailMoods', '1 801 références · confirmation avant ajout', 'catalog'],
            [Camera, 'Prendre une photo', 'Photographie le produit', 'camera'],
            [Image, 'Importer une photo', 'Capture ou image de ta galerie', 'image'],
            [Link, 'Coller une URL', 'Retrouve les photos et les informations', 'url'],
            [PenLine, 'Saisie manuelle', 'Ajoute seulement ce que tu connais', 'manual'],
          ].map(([Icon, title, subtitle, source]) => <button key={source} onClick={() => start(source)}>
            <span className="importIcon"><Icon /></span><span className="importCopy"><b>{title}</b><small>{subtitle}</small></span><ChevronRight className="importArrow" />
          </button>)}
          <button onClick={() => start('barcode')}><span className="importIcon"><ScanLine /></span><span className="importCopy"><b>Scanner le produit</b><small>Photo du code-barres ou saisie des chiffres</small></span><ChevronRight className="importArrow" /></button>
        </div>

      </section>
    </div>}

    {edit && <div className="overlay" onClick={() => setEdit(null)}>
      <section className="productSheet" role="dialog" aria-modal="true" aria-labelledby="product-title" onClick={event => event.stopPropagation()}>
        <div className="grab" />
        <div className="sheetTitle"><div><small>{edit.id ? 'MODIFIER' : 'AJOUTER'}</small><h2 id="product-title">{material ? 'Fiche matériel' : 'Fiche produit'}</h2></div><button aria-label="Fermer" onClick={() => setEdit(null)}><X /></button></div>
        <p className="fieldHelp">{provenanceOf(edit).kind === 'nailmoods' ? 'Référence issue du catalogue NailMoods · couleur à confirmer.' : provenanceOf(edit).kind === 'verified_creator' ? 'Référence liée à un catalogue de marque.' : 'Produit personnel / non vérifié · utilisable dans tes inspirations.'}</p>
        {edit.id && (isDecoration(edit) || !auxiliary(edit) && ['Vernis', 'Semi-permanent', 'Gel'].includes(edit.type)) && <><button className="detailPrimary" disabled={photoBusy || importBusy} onClick={() => save(true)}><Palette />{isDecoration(edit) ? 'Créer avec ce sticker' : 'Créer avec cette teinte'}</button><p className="fieldHelp">Enregistre tes modifications et ouvre Créer avec ce produit.</p></>}
        <ProductImport onManual={() => productName.current?.focus()} onPhoto={() => productCamera.current?.click()} onColor={() => { productColorArea.current?.scrollIntoView({ block: 'center' }); productColorArea.current?.querySelector('input')?.focus(); }} item={edit} onChange={change} onBusy={setImportBusy} photoBusy={photoBusy} />
        <label>Nature<select value={edit.type} onChange={event => change({ type: event.target.value })}>
          {['Semi-permanent', 'Vernis', 'Gel', 'Effet', 'Matériel'].map(value => <option key={value}>{value}</option>)}
        </select></label>
        {material && <EquipmentCategory item={edit} onChange={change} />}
        <label>{material ? 'Nom du matériel' : 'Nom'}<input ref={productName} value={edit.name} onChange={event => change({ name: event.target.value })} placeholder={material ? equipmentInfo(edit).example : 'Nom du produit'} required /></label>
        <label>Marque (facultatif)<input value={edit.brand} onChange={event => change({ brand: event.target.value })} /></label>
        {!material && <label>Référence (facultatif)<input value={edit.reference || ''} onChange={event => change({ reference: event.target.value })} /></label>}
        {!material && <><div className="form2"><label>Collection de marque<input value={edit.collection || ''} onChange={event => change({ collection: event.target.value })} /></label><label>SKU<input value={edit.sku || ''} onChange={event => change({ sku: event.target.value })} /></label></div><label>Notes personnelles<textarea rows="2" value={edit.notes || ''} onChange={event => change({ notes: event.target.value })} /></label></>}
        {duplicates.length > 0 && <div className="duplicateNotice" role="status"><b>Peut-être déjà dans ta collection</b>{duplicates.slice(0, 3).map(({item, reason}) => <p key={item.id}>{item.name} · {reason}</p>)}<small>Tu peux conserver les deux fiches. Rien ne sera fusionné.</small></div>}
        {material && <EquipmentFields item={edit} onChange={change} />}
        <ProductPhoto cameraInputRef={productCamera} value={edit.photo} onChange={photo => change({ photo })} onBusy={setPhotoBusy} maxSize={1200} />
        {!material && <>
          <div ref={productColorArea}><PhotoColor items={items} item={edit} onChange={change} onValidityChange={setShadeValid} /></div>
          <label>Finition<select value={edit.finish} onChange={event => change({ finish: event.target.value })}>
            {['Brillant', 'Crème', 'Jelly', 'Pailleté', 'Nacré', 'Métallique', 'Chrome', 'Cat-eye', 'Mat', 'Autre'].map(value => <option key={value}>{value}</option>)}
          </select></label>
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
        <button className={'favoriteToggle ' + (edit.fav ? 'on' : '')} onClick={() => change({ fav: !edit.fav })}><Heart fill={edit.fav ? 'currentColor' : 'none'} /> {edit.fav ? 'Dans mes favoris' : 'Ajouter aux favoris'}</button>
        <div className="sheetActions">
          {saveError && <p className="formError" role="alert">{saveError}</p>}
          <button className="saveProduct" disabled={!edit.name.trim() || photoBusy || importBusy} onClick={() => save()}><Check />{photoBusy ? 'Préparation de la photo…' : importBusy ? 'Recherche en cours…' : 'Enregistrer'}</button>
          {!edit.name.trim() && <p className="fieldHelp">Renseigne un nom pour enregistrer.</p>}
        </div>
        {edit.id && <button className="deleteProduct" onClick={() => persist(items.filter(item => item.id !== edit.id))}><Trash2 /> Supprimer</button>}
      </section>
    </div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<AccountRoot App={App} />);
