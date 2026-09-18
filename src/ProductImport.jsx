import React, { useEffect, useRef, useState } from 'react';
import { Link, ScanLine, Camera, Image as ImageIcon, Check, X } from 'lucide-react';
import { fetchProduct, lookupBarcode, shopifyCandidate, miniMacaronCatalog, textMatches, inferTraits, normalizeText } from './productImport';
import { readPhotoText, readBarcodePhoto } from './recognition';
import { colorFamilyChange } from './colorAnalysis';
import './product-import.css';

const fieldNames = { name: 'Nom', brand: 'Marque', type: 'Nature', equipmentCategory: 'Matériel', reference: 'Référence', barcode: 'Code-barres', family: 'Famille de couleur', finish: 'Finition', effect: 'Effet', usage: 'Utilisation', photo: 'Photo de la boutique' };

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
    <p className="fieldHelp">Coche les informations à reprendre. Tu pourras ensuite tout corriger.</p>
    <div className="importFields">{Object.entries(current.fields).filter(([key, value]) => value && fieldNames[key]).map(([key, value]) => <label key={key}><input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} /><span><small>{fieldNames[key]}</small><b>{key === 'photo' ? existing.photo ? 'Remplacer ma photo actuelle' : 'Ajouter la photo sélectionnée' : value}</b>{key !== 'photo' && existing.id && existing[key] && existing[key] !== value && <small>Actuellement : {existing[key]}</small>}</span></label>)}</div>
    {current.fields.family && <p className="fieldHelp">La famille de couleur ne donne pas la teinte exacte. Prélève-la dans la photo après l’import.</p>}
    <button type="button" className="importPrimary" disabled={!selected.length || (current.needsVariant && !current.variantId)} onClick={() => onUse(Object.fromEntries(selected.filter(key => current.fields[key]).map(key => [key, current.fields[key]])), current)}><Check />Utiliser ces informations</button>
  </section>;
}

export default function ProductImport({ item, onChange, onBusy, photoBusy }) {
  const [candidate, setCandidate] = useState(null), [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [text, setText] = useState(''), [matches, setMatches] = useState([]);
  const task = useRef(null), revision = useRef(0), barcodePhoto = useRef(null), barcodeCamera = useRef(null);
  function cancel() { revision.current++; task.current?.abort(); task.current = null; setBusy(''); onBusy(false); }
  useEffect(() => () => { revision.current++; task.current?.abort(); onBusy(false); }, [onBusy]);
  // A late response must never replace another URL/photo or a reopened product.
  useEffect(() => { cancel(); setCandidate(null); setMatches([]); setText(''); setError(''); }, [item.url, item.photo]);

  async function run(label, action, timeoutMs = 35000) {
    cancel(); const version = revision.current, controller = new AbortController(); task.current = controller;
    setBusy(label); onBusy(true); setError(''); setMessage(''); setCandidate(null); setMatches([]);
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
    try {
      const result = await action(controller.signal, progress => { if (version === revision.current) setBusy(`Lecture de l’étiquette… ${progress} %`); });
      if (version !== revision.current || controller.signal.aborted) return;
      if (result?.fields) setCandidate(result);
      else if (result?.text !== undefined) { setText(result.text); if (!result.text) setError('Aucun texte lisible. Essaie une photo plus nette et rapprochée de l’étiquette.'); }
      else if (Array.isArray(result)) { setMatches(result); if (!result.length) setError('Aucune correspondance certaine. Utilise une ligne du texte comme nom ou complète la fiche.'); }
    } catch (err) {
      if (version === revision.current) setError(controller.signal.aborted ? 'La recherche a pris trop de temps. Vérifie ta connexion et réessaie.' : err?.name === 'TypeError' ? 'Ce site est indisponible ou ne permet pas la lecture directe. Tu peux importer une capture de sa fiche ou remplir le produit.' : err.message);
    } finally { clearTimeout(timeout); if (version === revision.current) { setBusy(''); onBusy(false); task.current = null; } }
  }

  function useCandidate(fields, source) {
    onChange({ ...fields, ...(fields.family ? colorFamilyChange(item, fields.family) : {}), ...(source.source ? { url: source.source } : {}), importInfo: { method: source.method, source: source.source || '', at: new Date().toISOString() } });
    setCandidate(null); setMessage('Informations reprises. Vérifie la fiche puis enregistre-la.');
  }
  function useLine(line) {
    cancel();
    const brand = /le mini macaron/.test(normalizeText(text)) ? 'Le Mini Macaron' : '';
    setCandidate({ fields: { name: line.slice(0, 200), ...(brand ? { brand } : {}), ...inferTraits(line) }, images: [], variants: [], method: 'text', source: '' });
  }
  async function barcodeFile(event) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    await run('Lecture du code-barres…', async signal => {
      const code = await readBarcodePhoto(file, signal);
      if (signal.aborted) return;
      onChange({ barcode: code });
      setBusy('Recherche du produit…');
      return lookupBarcode(code, signal);
    }, 60000);
  }

  return <div className="productImport">
    <label>Lien du produit (facultatif)<input type="url" value={item.url} onChange={event => onChange({ url: event.target.value })} placeholder="https://…" /></label>
    <button type="button" className="importPrimary" disabled={Boolean(busy) || photoBusy || !item.url.trim()} onClick={() => run('Lecture de la fiche produit…', signal => fetchProduct(item.url, signal))}><Link />Récupérer depuis le lien</button>
    <p className="fieldHelp">Le Mini Macaron et les boutiques autorisant la lecture de leurs fiches. Si un site bloque l’import, utilise une photo ou une capture.</p>
    <details className="barcodeImport" open={item.source === 'barcode' ? true : undefined}>
      <summary><ScanLine />Code-barres</summary>
      <p className="fieldHelp">Recherche dans le catalogue Le Mini Macaron Europe. Les références absentes peuvent être ajoutées avec leur lien ou leur nom.</p>
      <label>Chiffres du code-barres<input inputMode="numeric" value={item.barcode || ''} onChange={event => { cancel(); setCandidate(null); onChange({ barcode: event.target.value }); }} placeholder="Ex. 3760297541507" /></label>
      <button type="button" className="importSecondary" disabled={Boolean(busy) || !item.barcode} onClick={() => run('Recherche dans le catalogue…', signal => lookupBarcode(item.barcode, signal), 60000)}>Rechercher ce code</button>
      <input ref={barcodeCamera} hidden type="file" accept="image/*" capture="environment" aria-label="Photographier un code-barres" onChange={barcodeFile} />
      <input ref={barcodePhoto} hidden type="file" accept="image/*" aria-label="Importer un code-barres" onChange={barcodeFile} />
      <div className="photoActions"><button type="button" disabled={Boolean(busy)} onClick={() => barcodeCamera.current.click()}><Camera />Photographier le code</button><button type="button" disabled={Boolean(busy)} onClick={() => barcodePhoto.current.click()}><ImageIcon />Photo du code</button></div>
      <p className="fieldHelp">Cadre le code entier, bien à plat, sans reflet.</p>
    </details>
    {item.photo && <div className="labelImport">
      <button type="button" className="importSecondary" disabled={Boolean(busy) || photoBusy} onClick={() => run('Préparation de la lecture…', async (signal, progress) => ({ text: await readPhotoText(item.photo, signal, progress) }), 110000)}><ScanLine />Lire l’étiquette ou la capture</button>
      <p className="fieldHelp">Le texte est lu sur ton appareil. Une photo nette du nom et de la marque aide à retrouver le produit.</p>
      {text && <div className="readLabelResult"><label>Texte lu — tu peux le corriger<textarea rows="4" value={text} onChange={event => { setText(event.target.value); setMatches([]); setCandidate(null); }} /></label><p className="fieldHelp">Choisis la ligne contenant le nom.</p><div className="labelLines">{[...new Set(text.split('\n').map(line => line.trim()).filter(line => line.length > 2))].slice(0, 18).map((line, index) => <button key={index} type="button" onClick={() => useLine(line)}>{line}</button>)}</div><button type="button" className="importSecondary" disabled={Boolean(busy)} onClick={() => run('Recherche des noms lus…', async signal => textMatches(await miniMacaronCatalog(signal), text), 60000)}>Chercher chez Le Mini Macaron</button></div>}
    </div>}
    {busy && <div className="importProgress" role="status"><span>{busy}</span><button type="button" onClick={cancel}>Annuler</button></div>}
    {error && <div className="formError" role="alert"><p>{error}</p><p>Tu peux continuer avec le nom et la teinte, ou ajouter une photo ou une URL.</p><a href={'https://www.google.com/search?q=' + encodeURIComponent([item.brand, item.name, item.reference, item.barcode, 'vernis'].filter(Boolean).join(' '))} target="_blank" rel="noopener noreferrer">Rechercher la référence sur le web</a></div>}
    {matches.length > 0 && <div className="catalogMatches"><p>Est-ce ton produit ?</p>{matches.map(product => <button key={product.id} type="button" onClick={() => run('Lecture du produit…', signal => fetchProduct(`https://leminimacaron.eu/products/${encodeURIComponent(product.handle)}`, signal))}>{product.title}</button>)}</div>}
    {candidate && <Review key={candidate.source + candidate.fields.name + candidate.method} candidate={candidate} existing={item} onUse={useCandidate} onDismiss={() => setCandidate(null)} />}
    {message && <p className="importSuccess" role="status"><Check />{message}</p>}
  </div>;
}
