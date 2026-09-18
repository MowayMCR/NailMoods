import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, ArrowLeft, ArrowRight, Check, Sparkles, RotateCcw, Pipette, X } from 'lucide-react';
import { preparePhoto } from './ProductPhoto';
import { Sampler } from './PhotoColor';
import { imageCanvas, readPhotoText } from './recognition';
import { photoPalette, generationFamily, validHex } from './colorAnalysis';
import { loadCatalog, matchCatalog, catalogCandidate, catalogueProvenance, catalogText } from './catalog';
import { browserStorage } from './storage';
import { snapshotIdea } from './inspirations';
import NailPreview from './NailPreview';
import RecipeSummary from './RecipeSummary';
import Sheet from './Sheet';
import { confirmedScanProduct, generateScannedIdeas, scanEffects, toggleScanEffect, trackScan } from './scanGenerate';
import './scanGenerate.css';

export function ScanBottles() {
  return <span className="scanBottles" aria-hidden="true">{['#813c60','#dba5aa'].map((color,i)=><svg key={color} viewBox="0 0 44 76" style={{ transform: `rotate(${i ? 8 : -8}deg)` }}><rect x="14" y="3" width="16" height="26" rx="3" fill="var(--b)"/><path d="M14 29h16v5c0 3 8 4 8 12v22a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5V46c0-8 8-9 8-12Z" fill={color} stroke="var(--a)" strokeWidth="1.4"/><path d="M12 48v15" stroke="#fff" strokeWidth="3" opacity=".55" strokeLinecap="round"/><rect x="17" y="48" width="13" height="10" rx="2" fill="#fff" opacity=".65"/></svg>)}</span>;
}

// Paid actions require explicit capabilities supplied by a real entitlement adapter.
// No plan is inferred from localStorage, the profile or a query parameter.
export default function ScanGenerate({ profile = {}, items = [], onBack, capabilities = {}, onAddProducts, onSaveJournal }) {
  const [stage,setStage] = useState('capture'), [products,setProducts] = useState([]), [draft,setDraft] = useState(null);
  const [effects,setEffects] = useState([]), [ideas,setIdeas] = useState([]), [detail,setDetail] = useState(null);
  const [error,setError] = useState(''), [busy,setBusy] = useState(false), [reading,setReading] = useState(false), [readStatus,setReadStatus] = useState('');
  const [candidates,setCandidates] = useState([]), [query,setQuery] = useState(''), [lookupStatus,setLookupStatus] = useState('');
  const [correct,setCorrect] = useState(false), [sampling,setSampling] = useState(false), [camera,setCamera] = useState(false), [cameraPending,setCameraPending] = useState(false);
  const [added,setAdded] = useState(false), [saved,setSaved] = useState([]), [saving,setSaving] = useState('');
  const video = useRef(null), fileInput = useRef(null), stream = useRef(null), cameraRequest = useRef(0), task = useRef(null), seed = useRef(1), heading = useRef(null), mounted = useRef(true);
  const track = (event,data) => trackScan(browserStorage,event,data);
  const stopCamera = () => { cameraRequest.current++; stream.current?.getTracks().forEach(t=>t.stop()); stream.current=null; setCamera(false); setCameraPending(false); };
  useEffect(()=>{ mounted.current=true; track('scan_generate_opened'); return ()=>{ mounted.current=false; task.current?.abort(); cameraRequest.current++; stream.current?.getTracks().forEach(t=>t.stop()); }; },[]);
  useEffect(()=>{ if(camera && video.current) video.current.srcObject=stream.current; },[camera]);
  useEffect(()=>{ heading.current?.focus(); },[stage]);
  useEffect(()=>{
    if (stage !== 'confirm' || query.trim().length<2) { setLookupStatus(''); return; }
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      try { setLookupStatus('Recherche dans le catalogue…'); const catalogue=await loadCatalog(controller.signal); if(controller.signal.aborted)return; const matches=matchCatalog(catalogue,query); setCandidates(matches); setLookupStatus(matches.length?'Choisis la référence à confirmer.':'Je ne trouve pas encore cette référence. Ta couleur suffit pour continuer.'); }
      catch { if(!controller.signal.aborted)setLookupStatus('Catalogue indisponible. Ta couleur suffit pour continuer.'); }
    },250);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[query,stage]);
  async function openCamera() {
    setError(''); const request=++cameraRequest.current; setCameraPending(true);
    try {
      if(!navigator.mediaDevices?.getUserMedia) throw new Error('La caméra directe n’est pas disponible ici. Choisis une photo ou une couleur.');
      const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
      if(!mounted.current || request!==cameraRequest.current){media.getTracks().forEach(t=>t.stop());return;}
      stream.current=media;setCamera(true);setCameraPending(false);track('camera_permission_granted');
    } catch(err) {
      if(!mounted.current || request!==cameraRequest.current)return;
      setCameraPending(false);
      if(err.name==='NotAllowedError' || err.name==='PermissionDeniedError') {track('camera_permission_refused');setError('L’accès à la caméra n’a pas été accordé. Tu peux choisir une photo ou une couleur.');}
      else setError(err.message || 'Caméra indisponible. Choisis une photo ou une couleur.');
    }
  }
  function resetCapture(resetProducts=false) {
    task.current?.abort();stopCamera();setDraft(null);setQuery('');setCandidates([]);setReading(false);setReadStatus('');setBusy(false);setCorrect(false);setSampling(false);setError('');setStage('capture');
    if(resetProducts){setProducts([]);setIdeas([]);setDetail(null);setAdded(false);setSaved([]);}
  }
  async function analyze(file) {
    if(!file)return;
    task.current?.abort();const controller=new AbortController();task.current=controller;
    stopCamera();setBusy(true);setError('');
    try {
      const photo=await preparePhoto(file,1200);if(controller.signal.aborted)return;
      const canvas=await imageCanvas(photo,controller.signal,700);if(controller.signal.aborted)return;
      const palette=photoPalette(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height));
      setDraft({photo,color:palette[0] || '',name:'',brand:'',reference:'',finish:'',type:'Vernis'});setCorrect(!palette.length);setStage('confirm');setBusy(false);
      if(!products.length)track('first_product_scanned');
      setReading(true);setReadStatus('Lecture de l’étiquette… Tu peux déjà confirmer la couleur.');
      try {
        const [catalogue,text]=await Promise.all([loadCatalog(controller.signal),readPhotoText(photo,controller.signal,progress=>{if(!controller.signal.aborted)setReadStatus('Lecture de l’étiquette : '+progress+' % · confirmation déjà possible.');})]);
        if(controller.signal.aborted)return;
        const matches=matchCatalog(catalogue,text,{ocr:true});setCandidates(matches);
        if (!matches.length) { const normalized=' '+catalogText(text)+' '; const brand=[...new Set(catalogue.map(p=>p.brand).filter(Boolean))].sort((a,b)=>b.length-a.length).find(b=>normalized.includes(' '+catalogText(b)+' ')); if(brand)setDraft(d=>({...d,brand})); }
        setReadStatus(matches.length?'Références possibles : à confirmer ci-dessous.':'Je ne connais pas encore cette référence. Confirme la couleur estimée pour continuer.');
      } catch { if(!controller.signal.aborted){setReadStatus('L’étiquette n’a pas pu être identifiée. Confirme la couleur pour continuer.');setReading(false);controller.abort();} }
      finally { if(!controller.signal.aborted)setReading(false); }
    } catch(err) {if(!controller.signal.aborted){setError(err.message);setBusy(false);}}
  }
  async function capture() {
    if(!video.current?.videoWidth){setError('La caméra se prépare. Réessaie dans un instant.');return;}
    setBusy(true);const canvas=document.createElement('canvas');canvas.width=video.current.videoWidth;canvas.height=video.current.videoHeight;canvas.getContext('2d').drawImage(video.current,0,0);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));
    if(blob && mounted.current)analyze(new File([blob],'vernis.jpg',{type:'image/jpeg'}));else if(mounted.current){setBusy(false);setError('La photo n’a pas pu être capturée. Réessaie ou choisis une photo.');}
  }
  function chooseCandidate(match) {
    task.current?.abort();setReading(false);setReadStatus('Vérifie la référence et la couleur avant de confirmer.');
    const candidate=catalogCandidate(match);
    setDraft(d=>({...d,...candidate.fields,provenance:catalogueProvenance(candidate)}));
  }
  function changeDraft(key,value) {
    task.current?.abort();setReading(false);
    setDraft(d=>({...d,[key]:value,...(['name','brand','reference'].includes(key)?{provenance:undefined}: {})}));
  }
  function confirm() {
    try {
      if(products.length>=2)return;
      const product=confirmedScanProduct(draft,'scan-'+Date.now()+'-'+products.length);
      task.current?.abort();setReading(false);setProducts(previous=>[...previous,product]);setAdded(false);
      if(!products.length)track(product.provenance.kind==='nailmoods'?'first_product_recognized':'first_product_unrecognized');
      else track('second_product_added');
      setStage(products.length ? 'effects' : 'second');setError('');
    } catch(err){setError(err.message);}
  }
  function generate() {
    try { const result=generateScannedIdeas(products,effects,profile,items,seed.current++);if(!result.length)throw new Error('Corrige une couleur pour réessayer.');setIdeas(result);setStage('results');setDetail(null);setError('');track('scan_generate_completed',{count:result.length}); }
    catch(err){setError(err.message);}
  }
  async function save(kind,idea) {
    if(saving)return;
    if(kind==='products' && !(capabilities.addScannedProducts && onAddProducts) || kind==='journal' && !(capabilities.saveScannedIdeas && onSaveJournal))return;
    setSaving(kind);setError('');
    try {
      const ok=await (kind==='products'?onAddProducts(products):onSaveJournal(snapshotIdea(idea)));
      if(ok===false)throw new Error('L’enregistrement n’a pas abouti. Réessaie.');
      if(!mounted.current)return;
      if(kind==='products'){setAdded(true);track('product_added_to_collection',{count:products.length});}
      else {setSaved(previous=>[...previous,idea.id]);track('generated_idea_saved');}
    }catch(err){if(mounted.current)setError(err.message || 'Enregistrement impossible. Réessaie.');}
    finally {if(mounted.current)setSaving('');}
  }
  const step=stage==='effects'?2:stage==='results'?3:1;
  const swatches=<div className="scanSelected">{products.map((p,i)=><span key={p.id}><i style={{background:p.color}}/><span>{p.name}<small>{[p.brand,p.reference].filter(Boolean).join(' · ') || 'Couleur confirmée'}</small></span>{stage==='effects' && <button aria-label={'Retirer '+p.name} onClick={()=>{const next=products.filter((_,index)=>index!==i);setProducts(next);if(!next.length)resetCapture();}}><X size={16}/></button>}</span>)}</div>;
  return <section className="scanPage">
    <button className="scanBack" onClick={onBack}><ArrowLeft size={18}/>Accueil</button>
    <h1 ref={heading} tabIndex={-1}>Scan &amp; Génère</h1><p className="scanSubtitle">Montre-moi tes couleurs, je te propose une pose.</p>
    <ol className="scanProgress" aria-label="Progression">{['Couleurs','Effet','Idées'].map((label,i)=><li key={label} aria-current={step===i+1?'step':undefined}><span>{step>i+1?<Check size={14}/>:i+1}</span>{label}</li>)}</ol>
    {error && <p className="formError" role="alert">{error}</p>}
    {stage==='capture' && <div className="scanPanel">
      <ScanBottles/><h2>{products.length?'Une deuxième couleur ?':'On regarde ce que tu as sous la main ?'}</h2><p>Cadre un seul vernis, sa couleur et son étiquette, à la lumière du jour.</p>
      {camera ? <><video ref={video} autoPlay playsInline muted className="scanCamera" aria-label="Aperçu de la caméra"/><button className="scanPrimary" disabled={busy} onClick={capture}><Camera/>Photographier ce vernis</button><button className="scanSecondary" onClick={stopCamera}>Fermer la caméra</button></> : <><button className="scanPrimary" onClick={openCamera} disabled={busy || cameraPending}><Camera/>{cameraPending?'Autorisation caméra en attente…':'Activer la caméra'}</button>{cameraPending && <button className="scanSecondary" onClick={stopCamera}>Continuer sans caméra</button>}</>}
      <button className="scanSecondary" disabled={busy} onClick={()=>{stopCamera();fileInput.current.click();}}><ImagePlus/>Choisir une photo</button>
      <input ref={fileInput} type="file" accept="image/*" hidden aria-label="Photo du vernis" onChange={event=>{const file=event.target.files?.[0];event.target.value='';analyze(file);}}/>
      <button className="scanText" disabled={busy} onClick={()=>{stopCamera();setDraft({color:'',name:'',brand:'',reference:'',type:'Vernis'});setCorrect(true);setStage('confirm');}}>Choisir une couleur sans photo</button>
      {busy && <p role="status">Préparation de ta photo…</p>}{products.length>0 && <button className="scanText" disabled={busy} onClick={()=>{stopCamera();setStage('effects');}}>Continuer avec ma première couleur</button>}
      <small>Sans collection ni profil complet. Les photos restent sur cet appareil.</small>
    </div>}
    {stage==='confirm' && draft && <div className="scanPanel">
      <h2>{draft.provenance?'Produit à confirmer':draft.photo?'Couleur estimée':'Ta couleur'}</h2>
      <div className="scanDetected">{draft.photo && <img src={draft.photo} alt="Ton vernis photographié"/>}<i style={{background:draft.color || 'transparent'}}/><div><strong>{draft.name || (validHex(draft.color)?generationFamily({color:draft.color}):'Choisis une couleur')}</strong><span>{[draft.brand,draft.reference].filter(Boolean).join(' · ')}</span><small>{draft.color}</small></div></div>
      <p className="scanHint">La lumière et les reflets influencent la teinte. Vérifie-la avant de continuer.</p>
      {readStatus && <p role="status" className="scanHint">{readStatus}</p>}
      {candidates.length>0 && <div className="scanCandidates" aria-label="Références possibles">{candidates.map(match=><button key={match.product.catalogId} aria-pressed={draft.provenance?.catalogId===match.product.catalogId} onClick={()=>chooseCandidate(match)}><b>{match.product.brand} · {match.product.reference || match.product.name}</b><small>{match.product.name} · {match.reason}</small></button>)}</div>}
      <button className="scanPrimary" disabled={!validHex(draft.color)} onClick={confirm}><Check/>C’est bien ça</button>
      {reading && <small>La lecture de l’étiquette est facultative : tu peux continuer maintenant.</small>}
      <button className="scanSecondary" onClick={()=>{task.current?.abort();setReading(false);setCorrect(v=>!v);}}><Pipette/>{correct?'Fermer la correction':'Corriger'}</button>
      {correct && <div className="scanCorrection">
        {!validHex(draft.color) && <div className="photoPalette" aria-label="Couleurs de départ">{['#813c60','#356a59','#dba5aa','#e9c6b5','#553366','#225577'].map(color=><button key={color} aria-label={'Choisir '+color} style={{background:color}} onClick={()=>changeDraft('color',color)}/>)}</div>}
        <label>Couleur<input type="color" value={validHex(draft.color)?draft.color:'#813c60'} onChange={e=>changeDraft('color',e.target.value)}/></label>
        <label>Code couleur<input value={draft.color} placeholder="#813c60" maxLength={7} onChange={e=>changeDraft('color',e.target.value)} autoComplete="off"/></label>
        {draft.photo && <button className="scanSecondary" onClick={()=>setSampling(v=>!v)}><Pipette/>Prélever sur la photo</button>}
        {sampling && <Sampler source={draft.photo} onSelect={color=>changeDraft('color',color)} onDone={()=>setSampling(false)}/>}
        <label>Référence ou nom à rechercher<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex. CANNI 9058"/></label><small role="status">{lookupStatus}</small>
        <label>Nom (facultatif)<input value={draft.name || ''} maxLength={100} onChange={e=>changeDraft('name',e.target.value)}/></label>
        <div className="scanFields"><label>Marque<input value={draft.brand || ''} maxLength={80} onChange={e=>changeDraft('brand',e.target.value)}/></label><label>Référence<input value={draft.reference || ''} maxLength={80} onChange={e=>changeDraft('reference',e.target.value)}/></label></div>
        <label>Type de produit<select value={draft.type || 'Vernis'} onChange={e=>changeDraft('type',e.target.value)}><option>Vernis</option><option>Semi-permanent</option><option>Gel</option></select></label>
        <label>Finition observée<select value={draft.finish || ''} onChange={e=>changeDraft('finish',e.target.value)}><option value="">Je ne sais pas</option>{['Brillant','Mat','Crème','Jelly','Pailleté','Métallique','Cat-eye','Autre'].map(v=><option key={v}>{v}</option>)}</select></label>
        <button className="scanPrimary" disabled={!validHex(draft.color)} onClick={confirm}>Confirmer cette couleur<ArrowRight/></button>
      </div>}
      <button className="scanText" onClick={()=>resetCapture()}>Reprendre la photo</button>
    </div>}
    {stage==='second' && <div className="scanPanel">{swatches}<h2>Tu veux ajouter un deuxième produit ?</h2><p>Deux couleurs maximum, pour une idée en quelques instants.</p><button className="scanPrimary" onClick={()=>resetCapture()}><Camera/>Oui, scanner une autre couleur</button><button className="scanSecondary" onClick={()=>setStage('effects')}>Non, continuer<ArrowRight/></button></div>}
    {stage==='effects' && <div className="scanPanel">{swatches}<h2>Tu veux un effet particulier ?</h2><p>Jusqu’à deux choix compatibles. Mat et brillant se remplacent, comme classique et French.</p><div className="scanEffectGrid">{scanEffects.map(effect=><button key={effect} aria-pressed={effects.includes(effect)} onClick={()=>{setEffects(previous=>toggleScanEffect(previous,effect));track('effect_selected');}}><span className={'scanEffectNail '+effect.toLowerCase()} aria-hidden="true" style={{'--scan-color':products[0]?.color}}/><b>{effect}</b>{effects.includes(effect)&&<Check size={16}/>}</button>)}</div><button className="scanSecondary" aria-pressed={!effects.length} onClick={()=>{setEffects([]);track('effect_selected');}}>Pas de préférence</button><button className="scanPrimary" onClick={generate}><Sparkles/>Créer mes idées</button>{products.length<2 && <button className="scanText" onClick={()=>resetCapture()}>Ajouter une deuxième couleur</button>}</div>}
    {stage==='results' && <><div className="scanResultsIntro"><h2>Tes couleurs, tes idées</h2>{swatches}<p>Aperçus schématiques de tes couleurs confirmées. Vérifie le protocole de tes produits avant la pose.</p></div><div className="scanIdeas">{ideas.map(idea=><article className="scanIdea" key={idea.id}><NailPreview idea={idea}/><h3>{idea.title}</h3><p>{idea.description}</p><small>{idea.scanEffects.join(' · ')}</small>{idea.scanNote && <p className="scanHint">{idea.scanNote}</p>}<button className="scanSecondary" onClick={()=>setDetail(idea)}>Voir la pose<ArrowRight/></button></article>)}</div><div className="scanPanel scanResultActions"><button className="scanPrimary" onClick={generate}><RotateCcw/>Refaire une idée</button><button className="scanSecondary" onClick={()=>{setStage('effects');setError('');}}>Changer l’effet</button><button className="scanSecondary" onClick={()=>resetCapture(true)}><Camera/>Scanner une autre couleur</button>{capabilities.addScannedProducts && typeof onAddProducts==='function' && <button className="scanPrimary" disabled={added || Boolean(saving)} onClick={()=>save('products')}>{added?'Produits ajoutés à ma collection':'Ajouter ces produits à ma collection'}</button>}<small>Ce parcours ne modifie pas automatiquement ta collection.</small></div></>}
    {detail && <Sheet title={detail.title} eyebrow="SCAN & GÉNÈRE" onClose={()=>setDetail(null)}><div className="scanDetail"><NailPreview idea={detail}/><p>{detail.description}</p><p><b>Effet :</b> {detail.scanEffects.join(' · ')}</p><h3>Couleurs utilisées</h3><ul>{detail.palette.map(p=><li key={p.id}><i style={{background:p.color}}/>{[p.brand,p.name,p.reference].filter(Boolean).join(' · ')}</li>)}</ul>{detail.scanNote&&<p>{detail.scanNote}</p>}{detail.requirements.length>0 && <><h3>Pour reproduire cette pose</h3><ul>{detail.requirements.map(r=><li key={r.name}>{r.name}</li>)}</ul></>}<RecipeSummary idea={detail} standalone/>{detail.pattern==='french' && <button className="scanSecondary" onClick={()=>{setDetail(null);setEffects(previous=>toggleScanEffect(previous,'Classique'));setStage('effects');}}>Variante sans pinceau</button>}{capabilities.saveScannedIdeas && typeof onSaveJournal==='function' && <button className="scanPrimary" disabled={saved.includes(detail.id)||Boolean(saving)} onClick={()=>save('journal',detail)}>{saved.includes(detail.id)?'Idée enregistrée':'Enregistrer dans mon journal'}</button>}</div></Sheet>}
  </section>;
}
