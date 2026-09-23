import {recordRuntimeEvent} from './support/diagnostics';
import { loadCatalog, catalogCandidate, catalogueProvenance } from './catalog';
import React, { useEffect, useRef, useState } from 'react';
import { Link, ScanLine, Camera, Image as ImageIcon, Check, X } from 'lucide-react';
import { fetchProduct, lookupBarcode, lookupPublicBarcode, shopifyCandidate, inferTraits, normalizeText } from './productImport';
import { readProductPhoto, readBarcodeDetails } from './recognition';
import { imageCanvas } from './recognition';
import { preparePhoto } from './ProductPhoto';
import { barcodeObservation, mergeRecognitionEvidence } from './productIdentity';
import { recognizeEvidence, recognitionPatch, pendingBarcodeReport, interruptedRecognition } from './recognitionReport';
import RecognitionStatus from './RecognitionStatus';
import { photoPalette, generationFamily, preciseShade, colorFamilyChange } from './colorAnalysis';
import './product-import.css';

const fieldNames = { ean13: 'EAN-13', gtin: 'GTIN', shadeCode: 'Numéro de teinte', sku: 'SKU', collection: 'Gamme', finishDetail: 'Détail de finition', catalogColor: 'Teinte catalogue validée', name: 'Nom', brand: 'Marque', type: 'Nature', equipmentCategory: 'Matériel', reference: 'Référence', barcode: 'Code-barres', family: 'Famille de couleur', finish: 'Finition', effect: 'Effet', usage: 'Utilisation', photo: 'Photo de la boutique' };

function Review({ candidate, existing, onUse, onDismiss }) {
  const [current, setCurrent] = useState(candidate);
  const [selected, setSelected] = useState(() => Object.keys(candidate.fields).filter(key => candidate.fields[key] && (key !== 'photo' || !existing.photo)));
  const toggle = key => setSelected(values => values.includes(key) ? values.filter(value => value !== key) : [...values, key]);
  function variant(id) {
    const next = shopifyCandidate(candidate.raw, candidate.source, id);
    setCurrent(next);
    setSelected(Object.keys(next.fields).filter(key => next.fields[key] && (key !== 'photo' || !existing.photo)));
  }
  return <section className="importReview" aria-label="Informations à vérifier">
    <div className="importReviewTitle"><div><small>À VÉRIFIER</small><h3>{candidate.method === 'text' ? 'Depuis le texte lu' : 'Produit retrouvé'}</h3></div><button type="button" className="smallClose" aria-label="Écarter les informations" onClick={onDismiss}><X /></button></div>
    {candidate.source && <p className="fieldHelp">Source : <a href={candidate.source} target="_blank" rel="noreferrer">{new URL(candidate.source).hostname}</a></p>}
    {current.needsVariant && <label>Variante du produit<select value={current.variantId} onChange={event => variant(event.target.value)}><option value="" disabled>Choisis la référence exacte</option>{current.variants.map(value => <option key={value.id} value={value.id}>{value.title === 'Default Title' ? 'Référence unique' : value.title}</option>)}</select></label>}
    {current.images.length > 0 && <><p className="fieldHelp">Choisis la photo à garder.</p><div className="importImages">{current.images.map((source, index) => <button key={source} type="button" aria-label={`Photo produit ${index + 1}`} aria-pressed={current.fields.photo === source} onClick={() => setCurrent(value => ({ ...value, fields: { ...value.fields, photo: source } }))}><img src={source} alt="" loading="lazy" referrerPolicy="no-referrer" />{current.fields.photo === source && <Check />}</button>)}</div></>}
    {candidate.confidence && <p className="fieldHelp">Correspondance {candidate.confidence} · score {candidate.score}/100. {candidate.reason}. Confirme la référence et la teinte.</p>}{candidate.evidence && <details className="recognitionEvidence"><summary>Détail de la correspondance</summary><p>Indices de rapprochement, pas des probabilités. Une couleur seule ne confirme jamais une référence.</p><dl>{Object.entries({brand:'Marque',collection:'Gamme',reference:'Référence / SKU',barcode:'Code-barres',shadeCode:'Numéro de teinte',name:'Nom de teinte',color:'Couleur'}).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{candidate.evidence[key] == null ? 'Non évalué' : candidate.evidence[key] + '/100'}</dd></div>)}</dl></details>}<p className="fieldHelp">Coche les informations à reprendre. Tu pourras ensuite tout corriger.</p>
    <div className="importFields">{Object.entries(current.fields).filter(([key, value]) => value && fieldNames[key]).map(([key, value]) => <label key={key}><input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} /><span><small>{fieldNames[key]}</small><b>{key === 'photo' ? existing.photo ? 'Remplacer ma photo actuelle' : 'Ajouter la photo sélectionnée' : value}</b>{key !== 'photo' && existing.id && existing[key] && existing[key] !== value && <small>Actuellement : {existing[key]}</small>}</span></label>)}</div>
    {candidate.catalogId && !current.fields.catalogColor && <p className="fieldHelp">La référence est connue, mais sa teinte exacte n’est pas renseignée dans le catalogue. Confirme ta couleur dans la fiche, par photo ou avec le sélecteur.</p>}
    {current.fields.family && <p className="fieldHelp">La famille de couleur ne donne pas la teinte exacte. Prélève-la dans la photo après l’import.</p>}
    <button type="button" className="importPrimary" disabled={!selected.length || (current.needsVariant && !current.variantId)} onClick={() => onUse(Object.fromEntries(selected.filter(key => current.fields[key]).map(key => [key, current.fields[key]])), current)}><Check />Utiliser ces informations</button>
  </section>;
}

export default function ProductImport({ item, onChange, onBusy, photoBusy, onManual, onPhoto, onColor }) {
  const [candidate, setCandidate] = useState(null), [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [report,setReport] = useState(item.recognitionInfo || null);
  const secondView = useRef(null);
  const [localMatches, setLocalMatches] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [text, setText] = useState(''), [matches, setMatches] = useState([]);
  const task = useRef(null), revision = useRef(0), barcodePhoto = useRef(null), barcodeCamera = useRef(null);
  function cancel(interrupted = false) { if(interrupted && report?.barcodeState==='read_pending'){const retained=interruptedRecognition(report);setReport(retained);onChange(recognitionPatch(retained));} revision.current++; task.current?.abort(); task.current = null; setBusy(''); onBusy(false); }
  useEffect(() => () => { revision.current++; task.current?.abort(); onBusy(false); }, [onBusy]);
  // A late response must never replace another URL/photo or a reopened product.
  useEffect(() => { cancel(); setCandidate(null); setMatches([]); setLocalMatches([]); setText(''); setError(''); }, [item.url, item.photo]);

  async function run(label, action, timeoutMs = 35000) {
    cancel(); const version = revision.current, controller = new AbortController(); task.current = controller;
    setBusy(label); onBusy(true); setError(''); setMessage(''); setCandidate(null); setMatches([]); setLocalMatches([]);
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
    try {
      const result = await action(controller.signal, progress => { if (version === revision.current) setBusy(`Lecture de l’étiquette… ${progress} %`); });
      if (version !== revision.current || controller.signal.aborted) return;
      if (result?.recognition) { setReport(result.recognition); setLocalMatches(result.recognition.matches); setText(result.recognition.rawText || ''); }
      else if (result?.fields) setCandidate(result);
      else if (result?.catalogMatches) { setLocalMatches(result.catalogMatches); if (!result.catalogMatches.length) setError('Je ne trouve pas encore cette référence dans mon catalogue.'); }
      else if (result?.text !== undefined) { setText(result.text); if (!result.text) setError('Aucun texte lisible. Essaie une photo plus nette et rapprochée de l’étiquette.'); }
      else if (Array.isArray(result)) { setMatches(result); if (!result.length) setError('Cette référence n’est pas encore dans NailMoods, ou aucun résultat suffisamment proche n’a été trouvé. Tu peux compléter la fiche manuellement.'); }
      recordRuntimeEvent('import','ok');
    } catch (err) {
      recordRuntimeEvent('import','error');
      if (version === revision.current) setError(controller.signal.aborted ? 'La recherche a pris trop de temps. Vérifie ta connexion et réessaie.' : err?.name === 'TypeError' ? 'Ce site est indisponible ou ne permet pas la lecture directe. Tu peux importer une capture de sa fiche ou remplir le produit.' : err.message);
    } finally { clearTimeout(timeout); if (version === revision.current) { setBusy(''); onBusy(false); task.current = null; } }
  }

  function useCandidate(fields, source) {
    onChange({ ...fields, ...(fields.family ? colorFamilyChange(item, fields.family) : {}), ...(source.source ? { url: source.source } : {}), ...(source.catalogId ? { provenance: catalogueProvenance(source), catalogColor: fields.catalogColor || '', catalogColorValidated: Boolean(fields.catalogColor), shade: item.shade || '', colorSource: item.colorSource || 'palette' } : { provenance: { kind: 'discovered', verified: false, importMethod: source.method, source: source.source || '' } }), importInfo: { method: source.method, source: source.source || '', at: new Date().toISOString() } });
    setCandidate(null); setMessage('Informations reprises. Vérifie la fiche puis enregistre-la.');
  }
  function useLine(line) {
    cancel();
    const brand = report?.parsed?.brand || (/le mini macaron/.test(normalizeText(text)) ? 'Le Mini Macaron' : '');
    setCandidate({ fields: { name: line.slice(0, 200), ...(brand ? { brand } : {}), ...inferTraits(line) }, images: [], variants: [], method: 'text', source: '' });
  }
  async function analyzeEvidence(input, signal, hasColor = Boolean(preciseShade(item))) {
    let products=[],catalogAvailable=true;
    try { products=await loadCatalog(signal); } catch(err) {if(signal.aborted)throw err;catalogAvailable=false;}
    if(signal.aborted)return;
    const result=recognizeEvidence(products,input,{brand:item.brand,collection:item.collection,hasColor,catalogAvailable,ocr:input.ocr !== false});
    onChange(recognitionPatch(result));setReport(result);
    return {recognition:result};
  }
  async function lookupCode(code, signal, observation = barcodeObservation(code,'UNKNOWN','manual')) {
    onChange({...observation,barcode:observation.rawBarcode});
    const local = await analyzeEvidence({rawText:text || report?.rawText || '',ocrViews:report?.ocrViews || [],barcodes:[observation],barcodeAttempted:observation.barcodeSource==='scanner',ocr:false},signal);
    if (signal.aborted || local?.recognition?.matches?.length) return local;
    try {
      return await lookupPublicBarcode(observation.rawBarcode, signal);
    } catch {
      return local;
    }
  }
  async function barcodeFile(event) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    await run('Lecture du code-barres…',async signal=>{
      try {
        const observation=await readBarcodeDetails(file,signal);
        if(signal.aborted)return;
        return lookupCode(observation.rawBarcode,signal,observation);
      } catch(err) {
        if(signal.aborted)throw err;
        return analyzeEvidence({rawText:text || report?.rawText || '',ocrViews:report?.ocrViews || [],barcodes:report?.barcodes || [],barcodeAttempted:true,barcodeError:err.code || 'BARCODE_UNAVAILABLE'},signal);
      }
    },60000);
  }
  async function readLabel(source, signal, progress, isSecond = false) {
    const first=report || {barcodes:item.rawBarcode?[{rawBarcode:item.rawBarcode,barcodeFormat:item.barcodeFormat,barcodeSource:item.barcodeSource,barcodeConfidence:item.barcodeConfidence}]:[]};
    const evidence=await readProductPhoto(source,signal,progress,observation=>{const pending=pendingBarcodeReport(first,observation);setReport(pending);onChange(recognitionPatch(pending));});
    let color=preciseShade(item);
    if(!isSecond && !color){
      try {const canvas=await imageCanvas(source,signal,700);const shades=photoPalette(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height));if(shades[0]){color=shades[0];if(!signal.aborted)onChange({shade:color,color,colorSource:'photo',family:generationFamily({color})});}} catch(err){if(signal.aborted)throw err;}
    }
    const merged=mergeRecognitionEvidence(first,evidence);
    return analyzeEvidence(merged,signal,Boolean(color));
  }
  async function secondViewFile(event) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    await run('Lecture du dessous / dos…',async(signal,progress)=>{
      const photo=await preparePhoto(file,1800);if(signal.aborted)return;
      // Keep the first color photograph; the label must not replace its shade.
      return readLabel(photo,signal,progress,true);
    },115000);
  }

  return <div className="productImport">
    <input ref={secondView} hidden type="file" accept="image/*" capture="environment" aria-label="Deuxième vue du produit" onChange={secondViewFile}/>
    <details className="catalogSearch" open={item.source === 'catalog' ? true : undefined}><summary>Rechercher dans le catalogue</summary><p className="fieldHelp">Catalogue NailMoods V2 · V1 conservée et enrichie pour le scan. Tu confirmes toujours le produit avant de l’ajouter.</p><label>Nom ou référence<input value={catalogQuery} onChange={event => setCatalogQuery(event.target.value)} placeholder="Nom de teinte, SKU, référence…" /></label><button type="button" className="importSecondary" disabled={Boolean(busy) || catalogQuery.trim().length < 2} onClick={() => run('Recherche dans le catalogue…', signal => analyzeEvidence({rawText:catalogQuery,barcodes:report?.barcodes || [],ocrViews:report?.ocrViews || [],barcodeAttempted:report?.barcodeAttempted,ocr:false},signal), 60000)}>Rechercher la référence</button></details>
    <label>Lien du produit (facultatif)<input type="url" value={item.url} onChange={event => onChange({ url: event.target.value })} placeholder="https://…" /></label>
    <button type="button" className="importPrimary" disabled={Boolean(busy) || photoBusy || !item.url.trim()} onClick={() => run('Lecture de la fiche produit…', signal => fetchProduct(item.url, signal))}><Link />Récupérer depuis le lien</button>
    <p className="fieldHelp">Le Mini Macaron et les boutiques autorisant la lecture de leurs fiches. Si un site bloque l’import, utilise une photo ou une capture.</p>
    <details className="barcodeImport" open={item.source === 'barcode' ? true : undefined}>
      <summary><ScanLine />Code-barres</summary>
      <p className="fieldHelp">Recherche d’abord dans NailMoods. Si le code est inconnu, NailMoods tente une recherche publique par code-barres uniquement, puis te demande toujours confirmation.</p>
      <label>Chiffres du code-barres<input inputMode="numeric" value={item.barcode || ''} onChange={event => { cancel(); setCandidate(null); setReport(null); onChange({ barcode: event.target.value, ...barcodeObservation(event.target.value,'UNKNOWN','manual') }); }} placeholder="Ex. 3760297541507" /></label>
      <button type="button" className="importSecondary" disabled={Boolean(busy) || !item.barcode} onClick={() => run('Recherche dans le catalogue…', signal => lookupCode(item.barcode, signal), 60000)}>Rechercher ce code</button>
      <input ref={barcodeCamera} hidden type="file" accept="image/*" capture="environment" aria-label="Photographier un code-barres" onChange={barcodeFile} />
      <input ref={barcodePhoto} hidden type="file" accept="image/*" aria-label="Importer un code-barres" onChange={barcodeFile} />
      <div className="photoActions"><button type="button" disabled={Boolean(busy)} onClick={() => barcodeCamera.current.click()}><Camera />Photographier le code</button><button type="button" disabled={Boolean(busy)} onClick={() => barcodePhoto.current.click()}><ImageIcon />Photo du code</button></div>
      <button type="button" className="importSecondary" disabled={Boolean(busy) || !item.barcode} onClick={()=>run('Recherche dans Le Mini Macaron…',signal=>lookupBarcode(item.barcode,signal),60000)}>Chercher aussi dans Le Mini Macaron</button>
      <p className="fieldHelp">Cadre le code entier, bien à plat, sans reflet.</p>
    </details>
    {item.photo && <div className="labelImport">
      <button type="button" className="importSecondary" disabled={Boolean(busy) || photoBusy} onClick={() => run('Préparation de la lecture…', (signal, progress) => readLabel(item.photo, signal, progress), 110000)}><ScanLine />Lire l’étiquette ou la capture</button>
      <p className="fieldHelp">Le texte est lu sur ton appareil. Une photo nette du nom et de la marque aide à retrouver le produit.</p>
      {text && <div className="readLabelResult"><label>Texte lu — tu peux le corriger<textarea rows="4" value={text} onChange={event => { setText(event.target.value); setMatches([]); setLocalMatches([]); setCandidate(null); }} /></label><p className="fieldHelp">Choisis la ligne contenant le nom.</p><div className="labelLines">{[...new Set(text.split('\n').map(line => line.trim()).filter(line => line.length > 2))].slice(0, 18).map((line, index) => <button key={index} type="button" onClick={() => useLine(line)}>{line}</button>)}</div><button type="button" className="importSecondary" disabled={Boolean(busy)} onClick={() => run('Recherche des noms lus…', signal => analyzeEvidence({rawText:text,ocrViews:report?.ocrViews || [],barcodes:report?.barcodes || [],barcodeAttempted:report?.barcodeAttempted,ocr:true},signal), 60000)}>Chercher dans NailMoods</button></div>}
    </div>}
    {busy && <div className="importProgress" role="status"><span>{busy}</span><button type="button" onClick={()=>cancel(true)}>Annuler</button></div>}
    <RecognitionStatus report={report} busy={Boolean(busy)} onSecondView={()=>secondView.current.click()}/>
    {(error || report && !report.matches?.length) && <div className="formError" role="alert"><p>{error || report.message}</p><p>Continue avec les champs ci-dessous : nom et couleur suffisent. Tu peux aussi photographier l’étiquette ou ajouter une URL.</p><a href={'https://www.google.com/search?q=' + encodeURIComponent([catalogQuery || text, item.brand, item.name, item.reference, item.barcode, 'vernis'].filter(Boolean).join(' '))} target="_blank" rel="noopener noreferrer">Rechercher la référence sur le web</a><div className="photoActions"><button type="button" onClick={onPhoto}>Photographier l’étiquette</button><button type="button" onClick={onColor}>Ajouter avec cette couleur</button><button type="button" onClick={onManual}>Saisir manuellement</button></div><p>Si tu trouves le produit sur le web, colle son URL ci-dessus pour vérifier les informations.</p></div>}
    {localMatches.length > 0 && <div className="catalogMatches"><p>Correspondances à confirmer · le score mesure la proximité des informations, pas une certitude.</p>{localMatches.map(match => <button type="button" key={match.product.catalogId} onClick={() => setCandidate(catalogCandidate(match))}><span>{match.product.brand} — {match.product.name}<small>{match.product.collection}{match.product.reference ? ' · Réf. ' + match.product.reference : ''}</small><small>Correspondance {match.confidence} · score {match.score}/100 · {match.reason}</small></span></button>)}</div>}
    {matches.length > 0 && <div className="catalogMatches"><p>Références possibles · à confirmer</p>{matches.slice(0, 3).map(product => <button key={product.id} type="button" onClick={() => run('Lecture du produit…', signal => fetchProduct(`https://leminimacaron.eu/products/${encodeURIComponent(product.handle)}`, signal))}>{product.title}</button>)}</div>}
    {candidate && <Review key={candidate.source + candidate.fields.name + candidate.method} candidate={candidate} existing={item} onUse={useCandidate} onDismiss={() => setCandidate(null)} />}
    {message && <p className="importSuccess" role="status"><Check />{message}</p>}
  </div>;
}
