import {salonEnabled,salonService,contributionLabel} from './professional/salonService';
import AtelierArt from './design/AtelierArt';
import AdaptCollection from './engagement/AdaptCollection.jsx';
import JournalTracking from './poseCycle/JournalTracking';
import {poseDestinations} from './poseDestinations';
import {messageId} from './social/messageState';
import PublicationTags from './social/PublicationTags';
import {cleanTags,suggestTags,internalTags} from './social/tags';
import { MessengerTile,useSocial } from './social/SocialContext';
import { StorageHint, useStorage } from './StorageContext';
import RecipeSummary from './RecipeSummary';
import JournalVariants from './JournalVariants';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookHeart, Camera, Check, ChevronRight, Heart, Package, PenLine, Plus, Search, Send, Trash2, X } from 'lucide-react';
import NailPreview from './NailPreview';
import ProductPhoto from './ProductPhoto';
import Sheet from './Sheet';
import { normalize } from './creationEngine';
import { productColor } from './colorAnalysis';
import { easeLabels, feelingLabels, filterJournal, journalDate, journalProducts, journalValidation, localDate, newJournalEntry, newJournalEntryFromIdea, pendingJournalPoses } from './journal';
import './journal.css';

export function JournalVisual({ entry, compact = false, media = null }) {
  const [resolved, setResolved] = useState(() => typeof entry.photo === 'string' && !entry.photo.startsWith('data:') && !entry.mediaPath ? entry.photo : '');
  useEffect(() => {
    let active = true;
    if (!entry.mediaPath || !media) { setResolved(entry.photo || ''); return () => { active = false; }; }
    const promise = media.signedUrl(entry.mediaPath);
    promise.then(url => { if (active) setResolved(url); }).catch(() => { if (active) setResolved(''); });
    return () => { active = false; };
  }, [entry.photo, entry.mediaPath, entry.publicMediaPath, entry.visibility, media]);
  const photo = resolved || (typeof entry.photo === 'string' && entry.photo.startsWith('data:') ? entry.photo : '');
  return <div className={'journalVisual' + (compact ? ' compact' : '')}>
    {photo && entry.idea && !compact && <NailPreview idea={entry.idea} compact />}
    {photo ? <img src={photo} alt={'Résultat de la pose « ' + entry.title + ' »'} loading="lazy" /> : entry.idea ? <><NailPreview idea={entry.idea} /><small>Inspiration · aperçu schématique</small></> : <div className="journalNoPhoto"><Camera /><span>Un souvenir à compléter</span></div>}
  </div>;
}

function ProductPicker({ products, items, onApply, onClose }) {
  const [selected, setSelected] = useState(products);
  const [query, setQuery] = useState('');
  const options = new Map(items.map(item => [String(item.id), item]));
  for (const item of products) options.set(String(item.id), item);
  const filtered = [...options.values()].filter(item => normalize([item.name, item.brand, item.equipmentCategory].join(' ')).includes(normalize(query).trim()));
  return <Sheet title="Les produits utilisés" eyebrow="MA POSE RÉALISÉE" onClose={onClose} className="journalProductPicker">
    <p className="journalMuted">Les références déjà choisies restent celles enregistrées avec ta pose.</p>
    <label className="journalSearch"><Search /><input aria-label="Rechercher un produit pour la pose" value={query} onChange={event => setQuery(event.target.value)} placeholder="Un vernis, une marque…" /></label>
    <div className="journalProductChoices">{filtered.map(item => {
      const chosen = selected.some(value => String(value.id) === String(item.id));
      return <button key={item.id} aria-pressed={chosen} onClick={() => setSelected(current => chosen ? current.filter(value => String(value.id) !== String(item.id)) : [...current, ...journalProducts([item])])}>
        {item.type === 'Matériel' ? <Package /> : <i style={{ background: productColor(item) }} />}<span><b>{item.name}</b><small>{[item.brand, item.type === 'Matériel' ? item.equipmentCategory || item.type : item.type].filter(Boolean).join(' · ')}</small></span>{chosen ? <Check /> : <Plus />}
      </button>;
    })}</div>
    {!filtered.length && <p className="journalMuted">{query ? 'Aucun produit avec cette recherche.' : 'Ta collection est encore vide. Tu peux enregistrer ta pose et ajouter les produits plus tard.'}</p>}
    <button className="journalPrimary journalPickerSave" onClick={() => onApply(selected)}><Check />Garder ces produits ({selected.length})</button>
  </Sheet>;
}

function JournalEditor({ entry, session, draftEntry, items, onSave, onNavigate, onSubmitted }) {
  const storage=useStorage();
  const draftKey='nm-journal-draft:'+ (entry?.id || session?.id || draftEntry?.idea?.key || 'new');
  const social=useSocial(),canPublish=['plus','pro'].includes(social?.tier);
  const [draft, setDraft] = useState(() => {try{const saved=JSON.parse(storage.getItem(draftKey));if(saved?.id)return saved;}catch{}return entry ? JSON.parse(JSON.stringify(entry)) : draftEntry ? JSON.parse(JSON.stringify(draftEntry)) : newJournalEntry('journal-' + messageId(), session);});
  const [photoUrl,setPhotoUrl]=useState('');
  const [salons,setSalons]=useState([]),[salonId,setSalonId]=useState(''),[saving,setSaving]=useState(false);
  useEffect(()=>{let alive=true;if(salonEnabled()&&social?.client)salonService(social.client).state().then(s=>{if(alive)setSalons(s.spaces.filter(w=>w.operational&&w.canPublish!==false));}).catch(()=>{});return()=>{alive=false;};},[social?.client]);
  useEffect(()=>{let active=true;setPhotoUrl('');if(draft.mediaPath&&storage.media)storage.media.signedUrl(draft.mediaPath).then(url=>{if(active)setPhotoUrl(url);}).catch(()=>{});return()=>{active=false;};},[draft.mediaPath,storage]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(()=>{try{storage.setItem(draftKey,JSON.stringify(draft));}catch{setError('Ce brouillon reste visible mais ne peut pas être conservé.');}},[]);
  const draftRef=useRef(draft);
  const change = patch => {
    const next={...draftRef.current,...patch};draftRef.current=next;setDraft(next);
    try{storage.setItem(draftKey,JSON.stringify(next));setError('');}
    catch{setError('Le brouillon n’a pas pu être conservé. Reste sur cet écran et réessaie.');}
  };
  async function save(event) {
    event.preventDefault();
    if (photoBusy||saving) return;
    const invalid = journalValidation(draft);
    if (invalid) { setError(invalid); return; }
    const publicTags=cleanTags(draft.publicTags??suggestTags(draft));
    const result = onSave({...draft,publicTags,searchTags:internalTags(Object.values(publicTags).flat().join(' '))});
    if (result.ok) {
      if(salonId){setSaving(true);try{const id=await storage.remoteContentId('journal_entries',result.id);const submitted=await salonService(social.client).action(salonId,'submit',{kind:'journal',id});onSubmitted?.({id:result.id,text:contributionLabel(submitted.status)});}
      catch{setError('Ta pose est enregistrée. L’envoi au salon n’a pas abouti : réessaie depuis Mon salon après synchronisation.');setSaving(false);return;}setSaving(false);}
      try{storage.setItem(draftKey,'null');}catch{}onNavigate(result.id);
    }
    else setError(result.error);
  }
  return <div className="journalPage journalEditPage">
    <div className="journalToolbar"><button onClick={() => onNavigate(entry?.id || '')}><ArrowLeft />Annuler</button></div>
    <section className="journalHeading"><small>{entry ? 'MON SOUVENIR' : 'UNE POSE À GARDER'}</small><h1 ref={heading} tabIndex={-1}>{entry ? 'Modifier ma pose' : 'Je l’ai faite'}</h1><p>Un nom, une date, une photo si tu veux. Les autres détails peuvent attendre.</p></section>
    <form className="journalForm" onSubmit={save} noValidate>
      <section className="journalFormCard">
        <ProductPhoto value={draft.mediaPath ? photoUrl : draft.photo} onChange={photo => change({ photo, mediaPath: null, publicMediaPath: null })} onBusy={setPhotoBusy} alt="Photo du résultat de ma pose" cameraLabel="Photographier ma pose" />
        {salons.length>0&&<label>Ajouter aussi à la vitrine du salon<select value={salonId} onChange={e=>{setSalonId(e.target.value);if(e.target.value)change({visibility:'public'});}}><option value="">Uniquement ma galerie</option>{salons.map(w=><option value={w.id} key={w.id}>{w.name}{w.moderation?' · validation préalable':''}</option>)}</select>{salonId&&<small>La pose reste dans ta galerie. Sa publication respecte la vérification de l’image et la validation du salon.</small>}</label>}
        <label htmlFor="journal-title">Un nom pour cette pose<input id="journal-title" maxLength={120} value={draft.title} onChange={event => change({ title: event.target.value })} placeholder={'Ma pose du ' + journalDate(draft.date)} /></label>
        <label htmlFor="journal-date">Date de la pose<input id="journal-date" type="date" max={localDate()} value={draft.date} onChange={event => change({ date: event.target.value })} /></label>
      </section>
      <details className="nmDisclosure" open={entry?true:undefined}><summary>Compléter ma pose · facultatif</summary>
      <section className="journalFormCard">
        <fieldset className="journalFeedback"><legend>Ton ressenti <small>facultatif</small></legend><div>{Object.entries(feelingLabels).map(([value, label]) => <button key={value} type="button" aria-pressed={draft.feeling === value} onClick={() => change({ feeling: draft.feeling === value ? '' : value })}>{label}</button>)}</div></fieldset>
        <fieldset className="journalFeedback"><legend>Visibilité</legend><div><button type="button" aria-pressed={draft.visibility !== 'public'} onClick={() => change({ visibility: 'private', publicMediaPath: null })}>🔒 Privé</button><button type="button" disabled={!canPublish} aria-pressed={draft.visibility === 'public'} onClick={() => change({ visibility: 'public', publicMediaPath: draft.visibility === 'public' ? draft.publicMediaPath : null })}>🌍 Publier{!canPublish?' · Plus / Pro':''}</button></div><small className="journalMuted">Privé par défaut. Public : la photo et les tags peuvent apparaître dans Découvrir et sur ton profil visible. Tes notes restent privées.</small></fieldset>{draft.visibility==='public'&&<PublicationTags source={draft} value={draft.publicTags} onChange={publicTags=>change({publicTags})}/>}
        <button type="button" className="journalRepeatToggle" aria-pressed={draft.repeat} onClick={() => change({ repeat: !draft.repeat })}><Heart fill={draft.repeat ? 'currentColor' : 'none'} />Une pose à refaire{draft.repeat && <Check />}</button>
        <label htmlFor="journal-notes">Tes notes <small>facultatif</small><textarea id="journal-notes" rows={3} maxLength={4000} value={draft.notes} onChange={event => change({ notes: event.target.value })} placeholder="Ce que tu as aimé, ce que tu changerais…" /></label>
        <details className="journalMore"><summary>Un peu plus de détails<ChevronRight /></summary>
          <fieldset className="journalFeedback"><legend>Comment s’est passée la réalisation ?</legend><div>{Object.entries(easeLabels).map(([value, label]) => <button key={value} type="button" aria-pressed={draft.ease === value} onClick={() => change({ ease: draft.ease === value ? '' : value })}>{label}</button>)}</div></fieldset>
          <label htmlFor="journal-wear">Tenue observée, en jours <small>à compléter plus tard</small><input id="journal-wear" type="number" inputMode="numeric" min="0" max="365" step="1" value={draft.wearDays} onChange={event => change({ wearDays: event.target.value })} placeholder="Pas encore renseignée" /></label>
        </details>
      </section>
      <section className="journalFormCard">
        <div className="journalSectionTitle"><h2>Produits utilisés</h2><span>{draft.products.length}</span></div>
        <p className="journalMuted">{draft.idea ? 'Préremplis depuis ton inspiration. Ajuste-les si tu as utilisé autre chose.' : 'Ajoute les vernis et le matériel dont tu te souviens.'}</p>
        {draft.products.length > 0 && <div className="journalProductPills">{draft.products.map(item => <span key={item.id}>{item.type !== 'Matériel' && <i style={{ background: item.color || 'var(--soft)' }} />}<b>{item.name}</b><button type="button" aria-label={'Retirer ' + item.name + ' des produits utilisés'} onClick={() => change({ products: draft.products.filter(value => String(value.id) !== String(item.id)) })}><X /></button></span>)}</div>}
        <button type="button" className="journalSecondary" onClick={() => setProductsOpen(true)}><Package />{draft.products.length ? 'Modifier les produits' : 'Choisir dans ma collection'}</button>
      </section>
      </details>
      <div className="journalFormActions">{error && <p className="formError" role="alert">{error}</p>}<button type="submit" className="journalPrimary" disabled={photoBusy||saving}><Check />{saving ? 'Envoi au salon…' : photoBusy ? 'Préparation de la photo…' : entry ? 'Enregistrer les modifications' : 'Enregistrer'}</button><small><StorageHint guest="Conservée dans ce navigateur, sur cet appareil." account="Conservée dans ton compte après synchronisation."/></small></div>
    </form>
    {productsOpen && <ProductPicker products={draft.products} items={items} onApply={products => { change({ products }); setProductsOpen(false); }} onClose={() => setProductsOpen(false)} />}
  </div>;
}

function JournalDetail({ entry, profile, items, media, onNavigate, onSave, onDelete, onIdea, onCollection, onShareToPro, salonNotice }) {
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [entry.id]);
  return <div className="journalPage journalDetailPage">
    <div className="journalToolbar"><button onClick={() => onNavigate('')}><ArrowLeft />Mon journal</button><button onClick={() => onNavigate(entry.id + '/modifier')}><PenLine />Modifier</button></div>
    <section className="journalHeading"><small>{journalDate(entry.date)}</small><h1 ref={heading} tabIndex={-1}>{entry.title}</h1></section>
    {salonNotice?.id===entry.id&&<p role="status">{salonNotice.text}</p>}<JournalVisual entry={entry} media={media} /><div className="journalToolbar"><button onClick={() => setVariantsOpen(true)}>Créer une variante<ArrowRight /></button></div>
    {entry.idea&&<AdaptCollection idea={entry.idea} items={items} onOpen={onIdea} onCollection={onCollection}/>}
    <JournalTracking entry={entry}/><RecipeSummary idea={entry.idea} /><section className="journalDetailBody">
      {error && <p className="formError" role="alert">{error}</p>}
      <div className="journalBadges"><span>{entry.visibility === 'public' ? '🌍 Public' : '🔒 Privé'}</span>{entry.feeling && <span>{feelingLabels[entry.feeling]}</span>}{entry.ease && <span>Réalisation : {easeLabels[entry.ease].toLocaleLowerCase('fr')}</span>}{entry.wearDays !== '' && <span>Tenue observée : {entry.wearDays} jour{entry.wearDays > 1 ? 's' : ''}</span>}</div>
      <button className="journalRepeatToggle" aria-pressed={entry.repeat} onClick={() => { const result = onSave({ ...entry, repeat: !entry.repeat }); setError(result.ok ? '' : result.error); }}><Heart fill={entry.repeat ? 'currentColor' : 'none'} />{entry.repeat ? 'Dans mes poses à refaire' : 'Garder dans mes poses à refaire'}</button>
      {entry.notes ? <section className="journalNotes"><h2>Mes notes</h2><p>{entry.notes}</p></section> : <p className="journalMuted">Tu peux compléter ce souvenir avec tes impressions ou la tenue de ta pose.</p>}
      <section className="journalUsed"><div className="journalSectionTitle"><h2>Produits utilisés</h2><span>{entry.products.length}</span></div>
        {entry.products.length ? <ul>{entry.products.map(item => {
          const current = items.find(value => String(value.id) === String(item.id));
          return <li key={item.id}>{item.type === 'Matériel' ? <Package /> : <i style={{ background: item.color || 'var(--soft)' }} />}<div><b>{item.name}</b><span>{[item.brand, item.type === 'Matériel' ? item.equipmentCategory || item.type : item.type].filter(Boolean).join(' · ')}</span>{!current && <small>Référence conservée dans ton journal</small>}</div>{current && <button aria-label={'Ouvrir la fiche actuelle de ' + item.name} onClick={() => onCollection(current.id)}><ChevronRight /></button>}</li>;
        })}</ul> : <p className="journalMuted">Aucun produit renseigné pour cette pose.</p>}
      </section>
      {entry.idea && <section className="journalSource"><h2>L’inspiration d’origine</h2><p>{entry.idea.title}</p><button className="journalSecondary" onClick={() => onIdea(entry.idea)}>Retrouver l’inspiration<ArrowRight /></button></section>}
      {onShareToPro && entry.idea && <button className="journalSecondary journalSharePo" onClick={() => onShareToPro({ source: entry, type: 'journal' })}><Send />Envoyer cette pose à ma PO</button>}
      <button className="journalSecondary" onClick={() => onNavigate(entry.id + '/modifier')}><PenLine />Modifier cette pose</button>
      <button className="journalDelete" onClick={() => { setError(''); setConfirmDelete(true); }}><Trash2 />Supprimer du journal</button>
    </section>
    {variantsOpen && <JournalVariants entry={entry} profile={profile} items={items} onClose={() => setVariantsOpen(false)} onOpen={idea=>{setVariantsOpen(false);onIdea(idea);}} />}
    {confirmDelete && <Sheet title="Supprimer ce souvenir ?" eyebrow="MON JOURNAL" onClose={() => setConfirmDelete(false)} className="journalDeleteDialog"><p>La photo et les notes de « {entry.title} » seront retirées du journal. Ta collection et ton tutoriel sont conservés.</p>{error && <p className="formError" role="alert">{error}</p>}<button className="journalPrimary" onClick={() => { const result = onDelete(entry.id); if (result.ok) onNavigate(''); else setError(result.error); }}>Supprimer ce souvenir</button><button className="journalSecondary" onClick={() => setConfirmDelete(false)}>Garder cette pose</button></Sheet>}
  </div>;
}

export default function JournalView({ onFavorites, library, profile, journal, sessions, items, media, route, draftIdea, onNavigate, onSave, onDelete, onDismiss, onIdea, onCollection, onCreate, onShareToPro }) {
  const storage=useStorage();
  const [salonNotice,setSalonNotice]=useState(null);
  const hasDraft=Boolean(storage.getItem('nm-journal-draft:new') && storage.getItem('nm-journal-draft:new')!=='null');
  const [query, setQuery] = useState('');
  const [repeatOnly, setRepeatOnly] = useState(false);
  const pending = pendingJournalPoses(journal, sessions);
  const filtered = filterJournal(journal.entries, query, repeatOnly);
  const rawPath = route === '#journal' ? '' : route.slice('#journal/'.length);
  const listSection=['a-essayer','en-cours','realisees'].includes(rawPath)?rawPath:rawPath?'':'a-essayer';
  const path=listSection?'':rawPath;
  const destinations=poseDestinations(library,sessions);
  const incoming=path.startsWith('idee/')? [...(library.recent||[]),...(library.favorites||[]),...(library.projects||[]),...(draftIdea?[draftIdea]:[])].find(i=>i.key===path.slice(5)):draftIdea;
  if (path === 'nouveau') return <JournalEditor key="new" items={items} onSave={onSave} onNavigate={onNavigate} onSubmitted={setSalonNotice} />;
  if ((path === 'projet'||path.startsWith('idee/')) && incoming) return <JournalEditor key={incoming.key} draftEntry={newJournalEntryFromIdea('journal-' + messageId(), incoming)} items={items} onSave={onSave} onNavigate={onNavigate} onSubmitted={setSalonNotice} />;
  if (path.startsWith('pose/')) {
    const id = path.slice(5), session = sessions.find(value => value.id === id && value.status === 'completed');
    const existing = journal.entries.find(entry => entry.sessionId === id);
    if (existing) return <JournalDetail salonNotice={salonNotice} profile={profile} key={existing.id} entry={existing} items={items} media={media} onNavigate={onNavigate} onSave={onSave} onDelete={onDelete} onIdea={onIdea} onCollection={onCollection} onShareToPro={onShareToPro} />;
    if (session) return <JournalEditor key={id} session={session} items={items} onSave={onSave} onNavigate={onNavigate} onSubmitted={setSalonNotice} />;
  } else if (path) {
    const editing = path.endsWith('/modifier');
    const id = editing ? path.slice(0, -9) : path;
    const entry = journal.entries.find(value => value.id === id);
    if (entry) return editing ? <JournalEditor key={id + '/edit'} entry={entry} items={items} onSave={onSave} onNavigate={onNavigate} onSubmitted={setSalonNotice} /> : <JournalDetail salonNotice={salonNotice} profile={profile} key={id} entry={entry} items={items} media={media} onNavigate={onNavigate} onSave={onSave} onDelete={onDelete} onIdea={onIdea} onCollection={onCollection} onShareToPro={onShareToPro} />;
  }
  if (path) return <div className="journalPage"><section className="journalEmpty"><BookHeart /><h1>Cette pose n’est pas disponible</h1><button className="journalPrimary" onClick={() => onNavigate('')}>Retrouver mon journal</button></section></div>;
  return <div className="journalPage nmPoseLanding">
    <section className="journalHero"><h1>Mes poses</h1><p>Mes idées et mes souvenirs.</p><div className="poseTabs" aria-label="Rangement de mes poses">{[['a-essayer','À essayer'],['en-cours','En cours'],['realisees','Réalisées']].map(([key,label])=><button key={key} aria-pressed={listSection===key} onClick={()=>onNavigate(key)}>{label}</button>)}</div></section>
    <div className="nmPoseQuickGrid" aria-label="Mes échanges et mon planning">
      {import.meta.env.VITE_POSE_CYCLE_ENABLED==='true'&&<button className="nmIllustratedTile" onClick={()=>{window.location.hash='creer/planning';}}><AtelierArt source="planning"/><b>Mon calendrier</b><small>Mes dates et mes projets</small></button>}
      <MessengerTile illustrated/>
    </div>
    {import.meta.env.VITE_POSE_CYCLE_ENABLED==='true'&&<button className="nmPoseProjects" onClick={()=>{window.location.hash='creer/projets-pose';}}><AtelierArt source="projects"/><span><b>Mes projets de pose</b><small>Mes idées et leur préparation</small></span><ChevronRight aria-hidden="true"/></button>}
    <div className="nmPoseSectionTitle"><h2>{listSection==='realisees'?'Mes poses réalisées':listSection==='en-cours'?'Mes poses en cours':'À essayer'}</h2><span>{listSection==='realisees'?journal.entries.length:listSection==='en-cours'?destinations.sessions.length+destinations.projects.length:destinations.toTry.length}</span></div>
    {listSection==='a-essayer'&&<section className="poseSavedList">{destinations.toTry.length?destinations.toTry.map(idea=><button className="poseSavedCard" key={idea.key} onClick={()=>onIdea(idea)}><NailPreview idea={idea} compact/><span><b>{idea.title}</b><small>Idée enregistrée · ouvrir la fiche</small></span><ChevronRight/></button>):<div className="journalEmpty"><h2>Ta prochaine idée t’attend</h2><p>Enregistre une idée depuis Créer pour la retrouver ici.</p><button className="journalPrimary" onClick={onCreate}>Créer une idée</button></div>}</section>}
    {listSection==='en-cours'&&<section className="poseSavedList">{destinations.sessions.map(session=><button className="poseSavedCard" key={session.id} onClick={()=>{window.location.hash='tutoriel/'+session.id;}}><NailPreview idea={session.idea} compact/><span><b>{session.idea.title}</b><small>Tutoriel · {session.completed.length}/{session.steps.length} étapes</small></span><ChevronRight/></button>)}{destinations.projects.map(idea=><button className="poseSavedCard" key={idea.key} onClick={()=>onIdea(idea)}><NailPreview idea={idea} compact/><span><b>{idea.title}</b><small>{idea.isProject?'Projet':'Idée en préparation'}</small></span><ChevronRight/></button>)}{!destinations.projects.length&&!destinations.sessions.length&&<div className="journalEmpty"><h2>Aucun projet en cours</h2><p>Compose une pose ou démarre le tutoriel d’une idée.</p><button className="journalPrimary" onClick={onCreate}>Créer une idée</button></div>}</section>}
    {listSection==='realisees'&&<>
    <JournalTracking/>
    {pending.length > 0 && !query && !repeatOnly && <section className="journalPending"><div className="journalSectionTitle"><h2>À raconter</h2><span>{pending.length}</span></div><p>Tes poses terminées, prêtes à rejoindre ton journal.</p>{pending.map(session => <article key={session.id}><div><small>{journalDate(localDate(session.completedAt || session.updatedAt))}</small><h3>{session.idea.title}</h3><NailPreview idea={session.idea} compact /><button onClick={() => onNavigate('pose/' + session.id)}>Ajouter au journal<ArrowRight /></button></div><button className="journalDismiss" aria-label={'Masquer la suggestion ' + session.idea.title} onClick={() => onDismiss(session.id)}><X /></button></article>)}</section>}
    {journal.entries.length > 0 && <section className="journalControls"><label className="journalSearch"><Search /><input aria-label="Rechercher dans mon journal" value={query} onChange={event => setQuery(event.target.value)} placeholder="Une pose, un produit, une note…" /></label><div className="journalFilters"><button aria-pressed={!repeatOnly} onClick={() => setRepeatOnly(false)}>Toutes</button><button aria-pressed={repeatOnly} onClick={() => setRepeatOnly(true)}><Heart />À refaire</button></div></section>}
    {filtered.length ? <div className="journalList">{filtered.map(entry => <article key={entry.id}><button className="journalEntryCard" onClick={() => onNavigate(entry.id)}><JournalVisual entry={entry} media={media} compact /><div className="journalEntryCopy"><small>{journalDate(entry.date)}</small><h2>{entry.title}</h2><p>{entry.products.slice(0, 3).map(item => item.name).join(' · ') || 'Un souvenir de ta pose'}</p><div><span>{entry.visibility === 'public' ? '🌍 Public' : '🔒 Privé'}</span>{entry.feeling && <span>{feelingLabels[entry.feeling]}</span>}{entry.repeat && <span><Heart fill="currentColor" />À refaire</span>}<ChevronRight /></div></div></button></article>)}</div>
      : journal.entries.length ? <section className="journalEmpty"><Search /><h2>Aucune pose trouvée</h2><p>{repeatOnly ? 'Les poses marquées « à refaire » apparaîtront ici.' : 'Essaie un autre nom, produit ou mot de tes notes.'}</p><button className="journalSecondary" onClick={() => { setQuery(''); setRepeatOnly(false); }}>Voir toutes mes poses</button></section>
        : <section className="journalEmpty"><BookHeart /><h2>Tes prochaines poses apparaîtront ici</h2><p>Ajoute une pose déjà réalisée, avec ou sans photo. Tes idées enregistrées sont dans À essayer.</p><button className="journalSecondary" onClick={onCreate}>Créer ma première idée<ArrowRight /></button></section>}
    <button className="journalSecondary nmAddRealized" onClick={()=>onNavigate('nouveau')}><Plus/>{hasDraft?'Reprendre mon brouillon':'Ajouter une pose réalisée'}</button>
    </>}
    <p className="journalLocal"><StorageHint guest="Ton journal est conservé dans ce navigateur, sur cet appareil." account="Ton journal est lié à ton compte. L’état de synchronisation est indiqué en haut de la page."/></p>
  </div>;
}
