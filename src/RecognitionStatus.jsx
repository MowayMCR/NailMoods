import React, { useState } from 'react';
import { diagnosticText } from './recognitionReport';
import './recognition-status.css';
export default function RecognitionStatus({ report, onSecondView, busy = false }) {
  const [copyStatus,setCopyStatus]=useState('');
  if(!report)return null;
  return <section className="recognitionStatus" aria-label="Résultat de reconnaissance">
    <h3>{report.title}</h3><p role="status">{report.message}</p>
    <dl>{report.parsed?.brand && <><dt>Marque lue</dt><dd>{report.parsed.brand}</dd></>}{report.parsed?.collection && <><dt>Gamme lue</dt><dd>{report.parsed.collection}</dd></>}{report.parsed?.shadeCodes?.length>0 && <><dt>Teinte détectée</dt><dd>{report.parsed.shadeCodes.join(' / ')} · à confirmer</dd></>}{report.barcodes?.map((b,i)=><React.Fragment key={b.rawBarcode+'-'+i}><dt>{b.barcodeSource==='scanner'?'Code lu':b.barcodeSource==='ocr'?'Chiffres lus par OCR':'Code saisi'}</dt><dd>{b.rawBarcode}<small>{({UNKNOWN:'Format non déterminé',OCR_DIGITS:'Chiffres de l’étiquette'})[b.barcodeFormat] || b.barcodeFormat}{b.barcodeSource==='ocr'?' · à vérifier sur l’étiquette':''}</small></dd></React.Fragment>)}</dl>
    {report.needsSecondView && onSecondView && <><p>Photographie maintenant l’étiquette dessous ou au dos.</p><button type="button" className="importSecondary" disabled={busy} onClick={onSecondView}>Photographier dessous / dos</button></>}
    <details className="recognitionDiagnostic"><summary>Diagnostic de reconnaissance</summary><p>Informations locales pour comprendre ce qui a été lu. Aucun envoi automatique.</p><pre>{diagnosticText(report)}</pre><button type="button" className="importSecondary" onClick={async()=>{try{await navigator.clipboard.writeText(diagnosticText(report));setCopyStatus('Diagnostic copié.');}catch{setCopyStatus('Copie indisponible : sélectionne le texte du diagnostic.');}}}>Copier le diagnostic</button>{copyStatus&&<p role="status">{copyStatus}</p>}</details>
  </section>;
}
