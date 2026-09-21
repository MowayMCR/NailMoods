import {messageId} from './social/messageState';
import {useStorage} from './StorageContext';
import {ReferenceImage} from './PhotoReferences';
import taxonomy from './social/taxonomy.json';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookHeart, Check, ExternalLink, FolderHeart, Image as ImageIcon, Images, LoaderCircle, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { preparePhoto } from './ProductPhoto';
import { imageCanvas } from './recognition';
import { analysePhotoPixels, combinePhotoAnalyses, compactPhotoAnalysis, compatiblePhotoTechniques, generatePhotoIdeas, photoFileKey, validatePhotoImportFiles } from './photoInspiration';
import { trackPhotoEvent } from './photoAnalytics';
import NailPreview from './NailPreview';
import { productColor } from './colorAnalysis';
import { loadCatalog } from './catalog';
import { preciseProductUrl } from './productLinks';
import './photo-inspiration.css';

const difficultyLabels = ['Simple', 'Intermédiaire', 'Pro'];
const levelIds = ['simple', 'intermediate', 'pro'];
const newId = () => 'photo-' + messageId();

function ProductMatch({ entry, label }) {
  const item = entry.item || entry;
  const shoppingUrl = preciseProductUrl(item);
  const precision = entry.matchKind === 'family' ? 'Famille colorimétrique proche' : entry.distance <= .08 ? 'Très proche' : entry.distance <= .16 ? 'Proche' : label;
  return <li><i style={{ background: entry.targetColor || productColor(item) }} /><span><small>{precision}</small><b>{item.name}</b>{(item.brand || item.reference) && <em>{[item.brand, item.reference && 'réf. ' + item.reference].filter(Boolean).join(' · ')}</em>}{label === 'À explorer' && (shoppingUrl ? <a href={shoppingUrl} target="_blank" rel="noopener noreferrer">Voir cette teinte<ExternalLink /></a> : <em>Lien précis à vérifier</em>)}</span></li>;
}

export default function PhotoInspirationFlow({ items, profile, onSaveProject, onJournalIdea, onOpen, onProjects, onShareToPro }) {
  const storage=useStorage();
  const [draft]=useState(()=>{try{return JSON.parse(storage.getItem('nm-photo-draft-v1')||'{}');}catch{return {};}});
  const [overrides,setOverrides]=useState(draft.overrides||{});
  const addInput = useRef(null);
  const mounted = useRef(true);
  const [photos, setPhotos] = useState(draft.photos||[]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nailArt, setNailArt] = useState(draft.nailArt??null);
  const [level, setLevel] = useState(draft.level||null);
  const [sourceMode, setSourceMode] = useState(draft.sourceMode||'collection');
  const [technique, setTechnique] = useState('');
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(new Set());
  const [catalogItems, setCatalogItems] = useState([]);
  useEffect(() => {mounted.current=true;return () => { mounted.current = false; };}, []);
  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal).then(products => { if (mounted.current) setCatalogItems(products); }).catch(() => {});
    return () => controller.abort();
  }, []);
  const detected = useMemo(() => combinePhotoAnalyses(photos.map(photo => photo.analysis).filter(Boolean)), [photos]);
  const analysis=useMemo(()=>detected?{...detected,...overrides}:null,[detected,overrides]);
  useEffect(()=>{if(busy||photos.some(p=>p.status))return;try{storage.setItem('nm-photo-draft-v1',JSON.stringify({photos:photos.map(({id,src,projectSrc,fileKey,analysis})=>({id,src:projectSrc||src,fileKey,analysis})),overrides,nailArt,level,sourceMode}));}catch{setError('Le brouillon n’a pas pu être conservé. Réessaie.');}},[photos,overrides,nailArt,level,sourceMode,busy]);
  const compatibleTechniques = useMemo(() => nailArt === null ? [] : compatiblePhotoTechniques({ nailArt, level: level || 'simple', items, suggestedIds: analysis?.probableTechniques?.map(item => item.id) || [] }), [analysis, items, nailArt, level]);
  useEffect(() => {
    if (!compatibleTechniques.length) { setTechnique(''); return; }
    if (!compatibleTechniques.some(choice => choice.id === technique)) setTechnique(compatibleTechniques[0].id);
  }, [compatibleTechniques, technique]);
  useEffect(() => setResult(null), [nailArt, level, sourceMode, technique, photos.length]);

  async function prepareEntry(file, id, previous=null) {
    const temporary = URL.createObjectURL(file);
    setPhotos(current => current.map(photo => photo.id === id ? { ...photo, src: temporary, temporary: true, name: file.name, status: 'Préparation…' } : photo));
    try {
      const src = await preparePhoto(file, 1400);
      URL.revokeObjectURL(temporary);
      if (!mounted.current) return;
      setPhotos(current => current.map(photo => photo.id === id ? { ...photo, src, temporary: false, status: 'Analyse…' } : photo));
      const canvas = await imageCanvas(src, undefined, 900);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Cette photo ne peut pas être analysée sur cet appareil.');
      trackPhotoEvent('inspiration_analysis_started', { image_count: photos.length || 1 });
      const photoAnalysis = analysePhotoPixels(context.getImageData(0, 0, canvas.width, canvas.height));
      const projectCanvas = await imageCanvas(src, undefined, 420);
      const projectSrc = projectCanvas.toDataURL('image/jpeg', .72);
      if (mounted.current) {
        setPhotos(current => current.map(photo => photo.id === id ? { ...photo, analysis: photoAnalysis, projectSrc, status: '' } : photo));
        trackPhotoEvent('inspiration_image_added', { image_count: Math.min(4, photos.length || 1) });
        trackPhotoEvent('inspiration_analysis_succeeded', { image_count: Math.min(4, photos.length || 1) });
      }
    } catch (reason) {
      URL.revokeObjectURL(temporary);
      if (mounted.current) {
        setPhotos(current => previous?current.map(photo=>photo.id===id?previous:photo):current.filter(photo => photo.id !== id));
        setError(reason.message);
        trackPhotoEvent('inspiration_analysis_failed', { image_count: photos.length });
      }
    }
  }

  async function addFiles(files) {
    setError('');
    const validation = validatePhotoImportFiles(files, photos.map(photo => photo.fileKey).filter(Boolean), 4 - photos.length);
    const selected = validation.accepted;
    if (validation.rejected.length) {
      const reasons = new Set(validation.rejected.map(entry => entry.reason));
      setError(reasons.has('duplicate') ? 'Cette image est déjà importée.' : reasons.has('too_large') ? 'Une image dépasse 20 Mo.' : reasons.has('format') ? 'Choisis uniquement des images JPEG, PNG ou WebP.' : 'Tu peux importer jusqu’à 4 images.');
    }
    if (!selected.length) return;
    trackPhotoEvent('inspiration_import_started', { image_count: selected.length });
    setBusy(true);
    const entries = selected.map(file => ({ id: newId(), src: '', name: file.name, fileKey: photoFileKey(file), status: 'Préparation…', analysis: null }));
    setPhotos(current => [...current, ...entries].slice(0, 4));
    await Promise.all(selected.map((file, index) => prepareEntry(file, entries[index].id)));
    if (mounted.current) { setBusy(false); trackPhotoEvent('inspiration_import_completed', { image_count: Math.min(4, photos.length + selected.length) }); }
  }

  async function replaceFile(id, file) {
    if (!file) return;
    const validation = validatePhotoImportFiles([file], photos.filter(photo => photo.id !== id).map(photo => photo.fileKey).filter(Boolean), 1);
    if (!validation.accepted.length) { setError(validation.rejected[0]?.reason === 'duplicate' ? 'Cette image est déjà importée.' : validation.rejected[0]?.reason === 'too_large' ? 'Cette image dépasse 20 Mo.' : 'Choisis une image JPEG, PNG ou WebP.'); return; }
    const existing = photos.find(photo => photo.id === id);
    if (existing?.temporary) URL.revokeObjectURL(existing.src);
    setError(''); setBusy(true); setResult(null);
    setPhotos(current => current.map(photo => photo.id === id ? { ...photo, fileKey: photoFileKey(file) } : photo));
    await prepareEntry(file, id, existing);
    if (mounted.current) setBusy(false);
  }

  function removePhoto(id) {
    const existing = photos.find(photo => photo.id === id);
    if (existing?.temporary) URL.revokeObjectURL(existing.src);
    setPhotos(current => current.filter(photo => photo.id !== id));
    setResult(null);
    trackPhotoEvent('inspiration_image_removed', { image_count: Math.max(0, photos.length - 1) });
  }

  function chooseNailArt(value) {
    setNailArt(value); setLevel(value ? (level || 'simple') : null); setResult(null);
    trackPhotoEvent('nail_art_choice', { nail_art: value, image_count: photos.length, mode: sourceMode === 'collection' ? 'collection_only' : 'open_possibilities' });
  }

  function chooseLevel(value) {
    setLevel(value); setResult(null);
    trackPhotoEvent('nail_art_level_selected', { nail_art: true, level: value, image_count: photos.length, mode: sourceMode === 'collection' ? 'collection_only' : 'open_possibilities' });
  }

  function generate() {
    try {
      if (nailArt === null) throw new Error('Indique d’abord si tu veux du nail art.');
      if (nailArt && !level) throw new Error('Choisis le niveau que tu veux réaliser.');
      const difficulty = nailArt ? levelIds.indexOf(level) : 0;
      const metadata = { nail_art: nailArt, ...(nailArt ? { level } : {}), image_count: photos.length, mode: sourceMode === 'collection' ? 'collection_only' : 'open_possibilities' };
      trackPhotoEvent('generation_started', metadata);
      const generated = generatePhotoIdeas({ analysis, items, catalogItems, profile, sourceMode, difficulty, technique, nailArt, nailArtLevel: level || 'simple', sourceImages: photos.map(photo => ({ name: photo.name, src: photo.projectSrc||photo.src })).filter(source => source.src), seed });
      generated.ideas=generated.ideas.map(i=>({...i,options:{...i.options,mood:overrides.mood||i.options?.mood},photoAnalysis:compactPhotoAnalysis(analysis)}));
      setResult(generated); setSeed(value => value + 1); setError('');
      trackPhotoEvent('generation_succeeded', metadata);
      requestAnimationFrame(() => document.querySelector('.photoResults')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (reason) { setError(reason.message); trackPhotoEvent('generation_failed', { nail_art: nailArt === true, ...(level ? { level } : {}), image_count: photos.length, mode: sourceMode === 'collection' ? 'collection_only' : 'open_possibilities' }); }
  }

  function saveProject(idea) {
    if (onSaveProject(idea)) {
      setSaved(current => new Set([...current, idea.id]));
      trackPhotoEvent('inspiration_project_created', { nail_art: nailArt === true, ...(level ? { level } : {}), image_count: photos.length, mode: sourceMode === 'collection' ? 'collection_only' : 'open_possibilities' });
    }
  }

  return <div className="photoFlow">
    <section className="photoIntro">
      <div><span>01</span><h2>Ajoute tes inspirations</h2></div>
      <p>Importe de 1 à 4 photos. Elles servent à repérer une palette et des indices visuels, puis à composer une idée différente.</p>
      <input ref={addInput} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { addFiles(event.target.files); event.target.value = ''; }} />
      <button className="photoPrimary" disabled={busy || photos.length >= 4} onClick={() => addInput.current?.click()}><Images />{photos.length ? 'Ajouter une photo' : 'Importer mes photos'}<span>{photos.length}/4</span></button>
      <small>Analyse locale indicative. Le brouillon et les références allégées sont enregistrés dans ton compte après synchronisation.</small>
    </section>

    {photos.length > 0 && <section className="photoThumbs" aria-label="Photos d’inspiration importées">
      {photos.map((photo, index) => <article key={photo.id}>
        {photo.src ? <ReferenceImage src={photo.src} alt={'Inspiration ' + (index + 1)}/> : <div className="photoLoading"><LoaderCircle /><span>Préparation…</span></div>}
        {photo.status && <span className="photoStatus">{photo.status}</span>}
        <div><button disabled={busy||index===0} aria-label={'Avancer l’inspiration '+(index+1)} onClick={()=>setPhotos(current=>{const next=[...current];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})}>←</button><label>Remplacer<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { replaceFile(photo.id, event.target.files?.[0]); event.target.value = ''; }} /></label><button aria-label={'Supprimer l’inspiration ' + (index + 1)} onClick={() => removePhoto(photo.id)}><Trash2 /></button></div>
      </article>)}
    </section>}
    {error && <p className="formError photoError" role="alert">{error}</p>}

    {analysis && <section className="photoAnalysis">
      <div className="photoSectionTitle"><span>02</span><div><small>LECTURE INDICATIVE · À CONFIRMER</small><h2>Ce que je repère</h2></div></div>
      <div className="photoPalette">{analysis.colors.map((color,index) => <label key={index}>Couleur {index+1}<input type="color" value={color} onChange={e=>setOverrides(current=>({...current,colors:analysis.colors.map((c,i)=>i===index?e.target.value:c)}))}/></label>)}</div><label>Mood confirmé<select value={overrides.mood||''} onChange={e=>setOverrides(current=>({...current,mood:e.target.value}))}><option value="">À choisir</option>{taxonomy.moods.map(m=><option key={m}>{m}</option>)}</select></label>
      <dl>
        <div><dt>Formes</dt><dd>{analysis.shapes}</dd></div>
        <div><dt>Motifs</dt><dd>{analysis.patterns}</dd></div>
        <div><dt>French</dt><dd>{analysis.french}</dd></div>
        <div><dt>Matières</dt><dd>{analysis.materials}</dd></div>
        <div><dt>Effets</dt><dd><input aria-label="Effets confirmés" maxLength={120} value={analysis.effects.join(' · ')} onChange={e=>setOverrides(current=>({...current,effects:e.target.value.split(' · ').slice(0,5)}))}/></dd></div>
        <div><dt>Décorations</dt><dd>{analysis.decorations}</dd></div>
      </dl>
      <div className="photoDetectedTechniques"><b>Effets repérés · à confirmer</b><div>{analysis.probableTechniques.map(choice => <span key={choice.id}>{choice.label}</span>)}</div><small>Ces pistes décrivent l’image. Elles ne décident pas ce que tu vas réaliser.</small></div>
    </section>}

    {analysis && <section className="photoCompose">
      <ol className="photoProgress" aria-label="Progression"><li className="done">Inspirations</li><li className="done">Analyse</li><li className={nailArt === null ? 'current' : 'done'}>Nail art</li><li className={nailArt !== null ? 'current' : ''}>Composition</li></ol>
      <div className="photoSectionTitle"><span>03</span><h2>Tu veux du nail art ?</h2></div>
      <fieldset className="photoBinary"><legend>Choisis explicitement</legend><div><button aria-pressed={nailArt === false} onClick={() => chooseNailArt(false)}>Non</button><button aria-pressed={nailArt === true} onClick={() => chooseNailArt(true)}>Oui</button></div></fieldset>
      {nailArt === false && <p className="photoDecision"><Check />Je garde les couleurs, la finition et l’ambiance de tes inspirations, sans nail art complexe.</p>}
      {nailArt === true && <fieldset><legend>Quel niveau veux-tu réaliser ?</legend><div>{difficultyLabels.map((label, index) => <button key={label} aria-pressed={level === levelIds[index]} onClick={() => chooseLevel(levelIds[index])}>{label}</button>)}</div></fieldset>}
      {nailArt !== null && (!nailArt || level) && <>
        <label className="photoTechnique">Techniques compatibles<select value={technique} onChange={event => setTechnique(event.target.value)}>{compatibleTechniques.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select><small>La sélection reste modifiable. Les techniques qui demandent du matériel absent sont écartées.</small></label>
        {compatibleTechniques.length === 0 && <p className="formError">Aucune technique de ce niveau n’est compatible avec le matériel enregistré. Ajoute le matériel nécessaire ou choisis un autre niveau.</p>}
        <fieldset><legend>Produits à explorer</legend><div><button aria-pressed={sourceMode === 'collection'} onClick={() => { setSourceMode('collection'); trackPhotoEvent('create_mode_selected', { nail_art: nailArt, ...(level ? { level } : {}), image_count: photos.length, mode: 'collection_only' }); }}>Ma collection en priorité</button><button aria-pressed={sourceMode === 'open'} onClick={() => { setSourceMode('open'); trackPhotoEvent('create_mode_selected', { nail_art: nailArt, ...(level ? { level } : {}), image_count: photos.length, mode: 'open_possibilities' }); }}>Ouvrir les possibilités</button></div></fieldset>
      </>}
      <p><Sparkles />La répartition sur les cinq ongles est recomposée : les références guident l’ambiance, jamais une copie exacte.</p>
      <button className="photoPrimary photoGenerate" disabled={busy || nailArt === null || (nailArt && !level) || !compatibleTechniques.length} onClick={generate}><Sparkles />{result ? 'Générer une autre composition' : 'Générer ma composition'}<ArrowRight /></button>
    </section>}

    {result && <section className="photoResults">
      <div className="photoSectionTitle"><span>04</span><div><small>CRÉÉE À PARTIR DE TES INSPIRATIONS</small><h2>Ta composition</h2></div></div>
      <div className="photoResultPalette"><b>Palette détectée</b><div>{analysis.colors.map(color => <i key={color} style={{ background: color }} title={color.toUpperCase()} />)}</div><span>{result.usedCollection ? 'Adaptée avec les teintes les plus proches de ta collection.' : 'Une harmonie nouvelle créée depuis tes couleurs.'}</span></div>
      {result.collectionFallback && <p className="photoDecision"><Check />Aucune teinte assez proche dans ta collection : la composition a tout de même été créée avec la palette détectée.</p>}
      <div className="photoProductGuide">
        <div><h3>Dans ma collection</h3>{result.guidance.owned.length ? <ul>{result.guidance.owned.map(entry => <ProductMatch key={entry.item.id} entry={entry} label="Teinte utilisable" />)}</ul> : <p>Aucune teinte enregistrée n’est assez proche pour le moment.</p>}</div>
        <div><h3>Alternatives proches</h3>{result.guidance.alternatives.length ? <ul>{result.guidance.alternatives.map(entry => <ProductMatch key={entry.item.id} entry={entry} label="Alternative" />)}</ul> : <p>Pas d’alternative distincte dans ta collection.</p>}</div>
        <div><h3>Références proches à acheter</h3>{result.guidance.toBuy.length ? <ul>{result.guidance.toBuy.map(entry => <ProductMatch key={entry.item.id} entry={entry} label="À explorer" />)}</ul> : <p>Aucune référence documentée assez fiable dans le catalogue pour ces teintes.</p>}</div>
      </div>
      <div className="photoIdeaList">{result.ideas.map(idea => <article key={idea.id} className="photoIdea">
        <NailPreview idea={idea} controls />
        <div className="photoIdeaBody"><div className="photoIdeaBadges"><span>{idea.nailArt ? difficultyLabels[idea.rank] : 'Sans nail art complexe'}</span><span>{idea.rendering.label}</span><span>{idea.realismRequired === 'required' ? 'Réaliste prioritaire' : idea.realismRequired === 'recommended' ? 'Réaliste recommandé' : 'Illustré accepté'}</span></div>
          <h3>{idea.title}</h3><p>{idea.description}</p>
          <dl><div><dt>Technique</dt><dd>{idea.rendering.label}</dd></div><div><dt>Finition</dt><dd>{idea.finish}</dd></div><div><dt>Relief</dt><dd>{idea.relief}</dd></div><div><dt>Niveau de réalisme requis</dt><dd>{idea.realismRequired === 'required' ? 'Prioritaire / obligatoire' : idea.realismRequired === 'recommended' ? 'Recommandé' : 'Illustré acceptable'}</dd></div></dl>
          <div className="photoReference"><b>Repères visuels attendus</b><p>{idea.rendering.cues.join(' · ')}</p>{idea.rendering.references.map(reference => <a key={reference.url} href={reference.url} target="_blank" rel="noopener noreferrer">{reference.label}<ExternalLink /></a>)}</div>
          {idea.requirements?.length > 0 && <p className="photoRequirements"><b>À prévoir :</b> {idea.requirements.map(entry => entry.name).join(' · ')}</p>}
          <div className="photoActions"><button className="photoPrimary" disabled={saved.has(idea.id)} onClick={() => saveProject(idea)}><FolderHeart />{saved.has(idea.id) ? 'Enregistré dans Mes projets' : 'Enregistrer dans Mes projets'}</button><button className="photoSecondary" onClick={() => onJournalIdea(idea)}><BookHeart />J’ai fait cette pose</button><button className="photoSecondary" onClick={() => onOpen(idea)}>Voir la fiche<ArrowRight /></button>{onShareToPro && <button className="photoSecondary photoPoPath" onClick={() => onShareToPro({ source: idea, type: 'inspiration' })}>Envoyer à ma PO</button>}</div>
        </div>
      </article>)}</div>
      <button className="photoProjectsLink" onClick={onProjects}><FolderHeart />Voir Mes projets<ArrowRight /></button>
      <button className="photoRegenerate" onClick={generate}><RefreshCw />Recomposer sans copier</button>
      <details className="photoData"><summary>Données de l’analyse enregistrables</summary><pre>{JSON.stringify(compactPhotoAnalysis(analysis), null, 2)}</pre></details>
    </section>}
  </div>;
}
