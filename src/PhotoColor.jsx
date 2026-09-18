import React, { useEffect, useRef, useState } from 'react';
import { Pipette, Check } from 'lucide-react';
import { colorFamilies, describeColor, photoPalette, preciseShade, productColor, sampleColor, validHex } from './colorAnalysis';
import { imageCanvas } from './recognition';

export function Sampler({ source, onSelect, onDone }) {
  const canvas = useRef(null), pixels = useRef(null);
  const [palette, setPalette] = useState([]), [point, setPoint] = useState(null), [color, setColor] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const image = await imageCanvas(source, controller.signal, 900);
        const data = image.getContext('2d').getImageData(0, 0, image.width, image.height);
        if (controller.signal.aborted) return;
        pixels.current = data;
        canvas.current.width = image.width; canvas.current.height = image.height;
        canvas.current.getContext('2d').drawImage(image, 0, 0);
        setPalette(photoPalette(data)); setLoading(false);
      } catch (err) { if (!controller.signal.aborted) { setError(err.message); setLoading(false); } }
    })();
    return () => controller.abort();
  }, [source]);
  function choose(color, position = null) {
    setColor(color); setPoint(position); onSelect(color);
  }
  function pick(x, y) {
    if (!pixels.current) return;
    const position = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    try { choose(sampleColor(pixels.current, position.x * (pixels.current.width - 1), position.y * (pixels.current.height - 1)), position); }
    catch (err) { setError(err.message); }
  }
  function keyboard(event) {
    const steps = { ArrowLeft: [-.02, 0], ArrowRight: [.02, 0], ArrowUp: [0, -.02], ArrowDown: [0, .02] };
    if (steps[event.key]) { event.preventDefault(); const [x, y] = steps[event.key]; pick((point?.x ?? .5) + x, (point?.y ?? .5) + y); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(point?.x ?? .5, point?.y ?? .5); }
  }
  return <div className="photoSampler">
    <p>Touche la couleur du vernis sur la photo, en évitant les reflets et le fond. Tu peux aussi choisir une des teintes extraites.</p>
    {loading && <p role="status">Chargement de la photo…</p>}
    {error && <p className="formError" role="alert">{error}</p>}
    <div className="samplingImage" hidden={loading || Boolean(error)}>
      <canvas ref={canvas} role="button" tabIndex="0" aria-label="Prélever une couleur dans la photo" onKeyDown={keyboard} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); pick((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height); }} />
      {point && <span className="sampleTarget" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />}
    </div>
    {palette.length > 0 && <div className="photoPalette" aria-label="Teintes extraites de la photo">{palette.map(value => <button key={value} type="button" aria-label={`Choisir la teinte ${value}`} aria-pressed={color === value} style={{ background: value }} onClick={() => choose(value)}>{color === value && <Check />}</button>)}</div>}
    {color && <div className="sampleResult"><span className="exactSwatch" style={{ background: color }} /><div><b>{color.toUpperCase()}</b><small>Famille proposée : {describeColor(color).family}</small></div><button type="button" onClick={onDone}><Check />Terminer le prélèvement</button></div>}
    <p className="fieldHelp">La lumière, les reflets et l’écran influencent la couleur. La finition et les effets restent à vérifier.</p>
  </div>;
}

export default function PhotoColor({ item, onChange, onValidityChange }) {
  const effectiveColor = productColor(item);
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(effectiveColor), [saved, setSaved] = useState(false);
  useEffect(() => { setDraft(effectiveColor); }, [effectiveColor]);
  useEffect(() => { onValidityChange(validHex(draft)); }, [draft, onValidityChange]);
  useEffect(() => { setOpen(false); setSaved(false); }, [item.photo]);
  function useColor(color, source) {
    const { color: shade, family, depth } = describeColor(color);
    onChange({ shade, ...(source === 'manual' ? { confirmedColor: shade } : {}), family, depth, color: colorFamilies.find(([name]) => name === family)[1], colorSource: source, colorUpdatedAt: new Date().toISOString() });
    setDraft(shade); setSaved(true);
  }
  function editColor(value) {
    setDraft(value); setSaved(false);
    if (validHex(value)) useColor(value, 'manual');
  }
  function useFamilyColor() {
    const color = colorFamilies.find(([name]) => name === item.family)?.[1] || '#db7897';
    onChange({ shade: '', confirmedColor: '', color, colorSource: 'palette', colorUpdatedAt: new Date().toISOString() });
    setDraft(color); setSaved(false); setOpen(false);
  }
  const measured = Boolean(preciseShade(item));
  return <section className="preciseColor">
    <div className="fieldHead"><b>Ma teinte</b><small>{item.catalogColorValidated ? 'Teinte catalogue validée' : measured ? item.colorSource === 'photo' ? 'Prélevée dans une photo' : 'Personnalisée' : 'Teinte de la famille'}</small></div>
    <div className="hexColor"><input type="color" aria-label="Choisir ma teinte" value={validHex(draft) ? draft : effectiveColor} onChange={event => editColor(event.target.value)} /><label>Code couleur<input aria-label="Code couleur" aria-invalid={!validHex(draft)} aria-describedby={!validHex(draft) ? 'shade-error' : undefined} value={draft || ''} maxLength="7" spellCheck="false" onChange={event => editColor(event.target.value)} /></label></div>
    {!validHex(draft) && <p id="shade-error" className="fieldHelp">Complète ce code, par exemple #703650, avant d’enregistrer.</p>}
    {item.photo && <button type="button" className="importSecondary" aria-expanded={open} onClick={() => { setOpen(value => !value); setSaved(false); }}><Pipette />{open ? 'Fermer le prélèvement' : 'Prélever une teinte dans la photo'}</button>}
    {open && item.photo && <Sampler key={item.photo} source={item.photo} onSelect={color => useColor(color, 'photo')} onDone={() => setOpen(false)} />}
    {item.catalogColorValidated && <p className="fieldHelp">La couleur validée du catalogue reste prioritaire dans les inspirations.</p>}
    {saved && <p className="importSuccess" role="status"><Check />Teinte retenue pour tes prochains aperçus. Enregistre la fiche pour la conserver.</p>}
    <p className="fieldHelp">{measured ? 'Tes nouvelles idées utilisent cette teinte en priorité. La famille ci-dessous sert à classer ton vernis.' : 'Sans teinte précise, tes idées utilisent la couleur de la famille. Prélève une teinte dans une photo ou ajuste-la ici.'}</p>
    {measured && !item.catalogColorValidated && <button type="button" className="importSecondary" onClick={useFamilyColor}>Utiliser la couleur de la famille</button>}
  </section>;
}
