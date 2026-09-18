import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookHeart, Camera, Check, ChevronRight, Heart, Package, PenLine, Plus, Search, Trash2, X } from 'lucide-react';
import NailPreview from './NailPreview';
import ProductPhoto from './ProductPhoto';
import Sheet from './Sheet';
import { normalize } from './creationEngine';
import { productColor } from './colorAnalysis';
import { easeLabels, feelingLabels, filterJournal, journalDate, journalProducts, journalValidation, localDate, newJournalEntry, pendingJournalPoses } from './journal';
import './journal.css';

function JournalVisual({ entry, compact = false }) {
  return <div className={'journalVisual' + (compact ? ' compact' : '')}>
    {entry.photo ? <img src={entry.photo} alt={'Résultat de la pose « ' + entry.title + ' »'} loading="lazy" /> : entry.idea ? <><NailPreview idea={entry.idea} /><small>Inspiration · aperçu schématique</small></> : <div className="journalNoPhoto"><Camera /><span>Un souvenir à compléter</span></div>}
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

function JournalEditor({ entry, session, items, onSave, onNavigate }) {
  const [draft, setDraft] = useState(() => entry ? JSON.parse(JSON.stringify(entry)) : newJournalEntry('journal-' + crypto.randomUUID(), session));
  const [photoBusy, setPhotoBusy] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const change = patch => { setDraft(current => ({ ...current, ...patch })); setError(''); };
  function save(event) {
    event.preventDefault();
    if (photoBusy) return;
    const invalid = journalValidation(draft);
    if (invalid) { setError(invalid); return; }
    const result = onSave(draft);
    if (result.ok) onNavigate(result.id);
    else setError(result.error);
  }
  return <div className="journalPage journalEditPage">
    <div className="journalToolbar"><button onClick={() => onNavigate(entry?.id || '')}><ArrowLeft />Annuler</button></div>
    <section className="journalHeading"><small>{entry ? 'MON SOUVENIR' : 'UNE POSE À GARDER'}</small><h1 ref={heading} tabIndex={-1}>{entry ? 'Modifier ma pose' : 'Raconte ta pose'}</h1><p>Une photo, quelques mots… Tu peux aussi enregistrer maintenant et compléter plus tard.</p></section>
    <form className="journalForm" onSubmit={save} noValidate>
      <section className="journalFormCard">
        <ProductPhoto value={draft.photo} onChange={photo => change({ photo })} onBusy={setPhotoBusy} alt="Photo du résultat de ma pose" cameraLabel="Photographier ma pose" />
        <label htmlFor="journal-title">Un nom pour cette pose<input id="journal-title" maxLength={120} value={draft.title} onChange={event => change({ title: event.target.value })} placeholder={'Ma pose du ' + journalDate(draft.date)} /></label>
        <label htmlFor="journal-date">Date de la pose<input id="journal-date" type="date" max={localDate()} value={draft.date} onChange={event => change({ date: event.target.value })} /></label>
      </section>
      <section className="journalFormCard">
        <fieldset className="journalFeedback"><legend>Ton ressenti <small>facultatif</small></legend><div>{Object.entries(feelingLabels).map(([value, label]) => <button key={value} type="button" aria-pressed={draft.feeling === value} onClick={() => change({ feeling: draft.feeling === value ? '' : value })}>{label}</button>)}</div></fieldset>
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
      <div className="journalFormActions">{error && <p className="formError" role="alert">{error}</p>}<button type="submit" className="journalPrimary" disabled={photoBusy}><Check />{photoBusy ? 'Préparation de la photo…' : entry ? 'Enregistrer les modifications' : 'Enregistrer ma pose'}</button><small>Conservée dans ce navigateur, sur cet appareil.</small></div>
    </form>
    {productsOpen && <ProductPicker products={draft.products} items={items} onApply={products => { change({ products }); setProductsOpen(false); }} onClose={() => setProductsOpen(false)} />}
  </div>;
}

function JournalDetail({ entry, items, onNavigate, onSave, onDelete, onIdea, onCollection }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [entry.id]);
  return <div className="journalPage journalDetailPage">
    <div className="journalToolbar"><button onClick={() => onNavigate('')}><ArrowLeft />Mon journal</button><button onClick={() => onNavigate(entry.id + '/modifier')}><PenLine />Modifier</button></div>
    <section className="journalHeading"><small>{journalDate(entry.date)}</small><h1 ref={heading} tabIndex={-1}>{entry.title}</h1></section>
    <JournalVisual entry={entry} />
    <section className="journalDetailBody">
      {error && <p className="formError" role="alert">{error}</p>}
      <div className="journalBadges">{entry.feeling && <span>{feelingLabels[entry.feeling]}</span>}{entry.ease && <span>Réalisation : {easeLabels[entry.ease].toLocaleLowerCase('fr')}</span>}{entry.wearDays !== '' && <span>Tenue observée : {entry.wearDays} jour{entry.wearDays > 1 ? 's' : ''}</span>}</div>
      <button className="journalRepeatToggle" aria-pressed={entry.repeat} onClick={() => { const result = onSave({ ...entry, repeat: !entry.repeat }); setError(result.ok ? '' : result.error); }}><Heart fill={entry.repeat ? 'currentColor' : 'none'} />{entry.repeat ? 'Dans mes poses à refaire' : 'Garder dans mes poses à refaire'}</button>
      {entry.notes ? <section className="journalNotes"><h2>Mes notes</h2><p>{entry.notes}</p></section> : <p className="journalMuted">Tu peux compléter ce souvenir avec tes impressions ou la tenue de ta pose.</p>}
      <section className="journalUsed"><div className="journalSectionTitle"><h2>Produits utilisés</h2><span>{entry.products.length}</span></div>
        {entry.products.length ? <ul>{entry.products.map(item => {
          const current = items.find(value => String(value.id) === String(item.id));
          return <li key={item.id}>{item.type === 'Matériel' ? <Package /> : <i style={{ background: item.color || 'var(--soft)' }} />}<div><b>{item.name}</b><span>{[item.brand, item.type === 'Matériel' ? item.equipmentCategory || item.type : item.type].filter(Boolean).join(' · ')}</span>{!current && <small>Référence conservée dans ton journal</small>}</div>{current && <button aria-label={'Ouvrir la fiche actuelle de ' + item.name} onClick={() => onCollection(current.id)}><ChevronRight /></button>}</li>;
        })}</ul> : <p className="journalMuted">Aucun produit renseigné pour cette pose.</p>}
      </section>
      {entry.idea && <section className="journalSource"><h2>L’inspiration d’origine</h2><p>{entry.idea.title}</p><button className="journalSecondary" onClick={() => onIdea(entry.idea)}>Retrouver l’inspiration<ArrowRight /></button></section>}
      <button className="journalSecondary" onClick={() => onNavigate(entry.id + '/modifier')}><PenLine />Modifier cette pose</button>
      <button className="journalDelete" onClick={() => { setError(''); setConfirmDelete(true); }}><Trash2 />Supprimer du journal</button>
    </section>
    {confirmDelete && <Sheet title="Supprimer ce souvenir ?" eyebrow="MON JOURNAL" onClose={() => setConfirmDelete(false)} className="journalDeleteDialog"><p>La photo et les notes de « {entry.title} » seront retirées du journal. Ta collection et ton tutoriel sont conservés.</p>{error && <p className="formError" role="alert">{error}</p>}<button className="journalPrimary" onClick={() => { const result = onDelete(entry.id); if (result.ok) onNavigate(''); else setError(result.error); }}>Supprimer ce souvenir</button><button className="journalSecondary" onClick={() => setConfirmDelete(false)}>Garder cette pose</button></Sheet>}
  </div>;
}

export default function JournalView({ journal, sessions, items, route, onNavigate, onSave, onDelete, onDismiss, onIdea, onCollection, onCreate }) {
  const [query, setQuery] = useState('');
  const [repeatOnly, setRepeatOnly] = useState(false);
  const pending = pendingJournalPoses(journal, sessions);
  const filtered = filterJournal(journal.entries, query, repeatOnly);
  const path = route === '#journal' ? '' : route.slice('#journal/'.length);
  if (path === 'nouveau') return <JournalEditor key="new" items={items} onSave={onSave} onNavigate={onNavigate} />;
  if (path.startsWith('pose/')) {
    const id = path.slice(5), session = sessions.find(value => value.id === id && value.status === 'completed');
    const existing = journal.entries.find(entry => entry.sessionId === id);
    if (existing) return <JournalDetail key={existing.id} entry={existing} items={items} onNavigate={onNavigate} onSave={onSave} onDelete={onDelete} onIdea={onIdea} onCollection={onCollection} />;
    if (session) return <JournalEditor key={id} session={session} items={items} onSave={onSave} onNavigate={onNavigate} />;
  } else if (path) {
    const editing = path.endsWith('/modifier');
    const id = editing ? path.slice(0, -9) : path;
    const entry = journal.entries.find(value => value.id === id);
    if (entry) return editing ? <JournalEditor key={id + '/edit'} entry={entry} items={items} onSave={onSave} onNavigate={onNavigate} /> : <JournalDetail key={id} entry={entry} items={items} onNavigate={onNavigate} onSave={onSave} onDelete={onDelete} onIdea={onIdea} onCollection={onCollection} />;
  }
  if (path) return <div className="journalPage"><section className="journalEmpty"><BookHeart /><h1>Cette pose n’est pas disponible</h1><button className="journalPrimary" onClick={() => onNavigate('')}>Retrouver mon journal</button></section></div>;
  return <div className="journalPage">
    <section className="journalHero"><small>LES COULEURS DE MES JOURS</small><h1>Mon journal</h1><p>Mes poses, mes petits essais,<br />et celles que j’ai envie de refaire.</p><div><span><b>{journal.entries.length}</b> pose{journal.entries.length > 1 ? 's' : ''}</span><span><b>{journal.entries.filter(entry => entry.repeat).length}</b> à refaire</span></div><button className="journalPrimary" onClick={() => onNavigate('nouveau')}><Plus />Ajouter une pose</button></section>
    {pending.length > 0 && !query && !repeatOnly && <section className="journalPending"><div className="journalSectionTitle"><h2>À raconter</h2><span>{pending.length}</span></div><p>Tes poses terminées, prêtes à rejoindre ton journal.</p>{pending.map(session => <article key={session.id}><div><small>{journalDate(localDate(session.completedAt || session.updatedAt))}</small><h3>{session.idea.title}</h3><NailPreview idea={session.idea} compact /><button onClick={() => onNavigate('pose/' + session.id)}>Ajouter au journal<ArrowRight /></button></div><button className="journalDismiss" aria-label={'Masquer la suggestion ' + session.idea.title} onClick={() => onDismiss(session.id)}><X /></button></article>)}</section>}
    {journal.entries.length > 0 && <section className="journalControls"><label className="journalSearch"><Search /><input aria-label="Rechercher dans mon journal" value={query} onChange={event => setQuery(event.target.value)} placeholder="Une pose, un produit, une note…" /></label><div className="journalFilters"><button aria-pressed={!repeatOnly} onClick={() => setRepeatOnly(false)}>Toutes</button><button aria-pressed={repeatOnly} onClick={() => setRepeatOnly(true)}><Heart />À refaire</button></div></section>}
    {filtered.length ? <div className="journalList">{filtered.map(entry => <article key={entry.id}><button className="journalEntryCard" onClick={() => onNavigate(entry.id)}><JournalVisual entry={entry} compact /><div className="journalEntryCopy"><small>{journalDate(entry.date)}</small><h2>{entry.title}</h2><p>{entry.products.slice(0, 3).map(item => item.name).join(' · ') || 'Un souvenir de ta pose'}</p><div>{entry.feeling && <span>{feelingLabels[entry.feeling]}</span>}{entry.repeat && <span><Heart fill="currentColor" />À refaire</span>}<ChevronRight /></div></div></button></article>)}</div>
      : journal.entries.length ? <section className="journalEmpty"><Search /><h2>Aucune pose trouvée</h2><p>{repeatOnly ? 'Les poses marquées « à refaire » apparaîtront ici.' : 'Essaie un autre nom, produit ou mot de tes notes.'}</p><button className="journalSecondary" onClick={() => { setQuery(''); setRepeatOnly(false); }}>Voir toutes mes poses</button></section>
        : <section className="journalEmpty"><BookHeart /><h2>Ton premier souvenir</h2><p>Ajoute une pose déjà réalisée, avec ou sans photo. Tes inspirations favorites restent dans Créer.</p><button className="journalSecondary" onClick={onCreate}>Trouver une nouvelle inspiration<ArrowRight /></button></section>}
    <p className="journalLocal">Ton journal est conservé dans ce navigateur, sur cet appareil.</p>
  </div>;
}
