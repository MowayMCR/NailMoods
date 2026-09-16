import React, { useEffect, useRef, useState } from 'react';
import { Pipette, Check } from 'lucide-react';
import { describeColor, photoPalette, sampleColor, validHex } from './colorAnalysis';
import { imageCanvas } from './recognition';

function Sampler({ source, onUse }) {
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
  function pick(x, y) {
    if (!pixels.current) return;
    const position = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    try { setColor(sampleColor(pixels.current, position.x * (pixels.current.width - 1), position.y * (pixels.current.height - 1))); setPoint(position); }
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
    {palette.length > 0 && <div className="photoPalette" aria-label="Teintes extraites de la photo">{palette.map(value => <button key={value} type="button" aria-label={`Choisir la teinte ${value}`} aria-pressed={color === value} style={{ background: value }} onClick={() => { setColor(value); setPoint(null); }}>{color === value && <Check />}</button>)}</div>}
    {color && <div className="sampleResult"><span className="exactSwatch" style={{ background: color }} /><div><b>{color.toUpperCase()}</b><small>Famille proposée : {describeColor(color).family}</small></div><button type="button" onClick={() => onUse(color)}><Check />Garder cette teinte</button></div>}
    <p className="fieldHelp">La lumière, les reflets et l’écran influencent la couleur. La finition et les effets restent à vérifier.</p>
  </div>;
}

export default function PhotoColor({ item, onChange }) {
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(item.color), [saved, setSaved] = useState(false);
  useEffect(() => { setDraft(item.color); }, [item.color]);
  useEffect(() => { setOpen(false); setSaved(false); }, [item.photo]);
  function useColor(color, source) {
    onChange({ ...describeColor(color), colorSource: source, colorUpdatedAt: new Date().toISOString() });
    setSaved(true); setOpen(false);
  }
  const measured = ['photo', 'manual'].includes(item.colorSource);
  return <section className="preciseColor">
    <div className="fieldHead"><b>Ma teinte</b><small>{item.colorSource === 'photo' ? 'Prélevée dans une photo' : measured ? 'Personnalisée' : 'Teinte de la famille'}</small></div>
    <div className="hexColor"><input type="color" aria-label="Choisir ma teinte" value={validHex(draft) ? draft : '#db7897'} onChange={event => { setDraft(event.target.value); setSaved(false); }} /><label>Code couleur<input aria-label="Code couleur" value={draft || ''} maxLength="7" spellCheck="false" onChange={event => { setDraft(event.target.value); setSaved(false); }} /></label><button type="button" disabled={!validHex(draft)} onClick={() => useColor(draft, 'manual')}>Appliquer</button></div>
    {!validHex(draft) && <p className="fieldHelp">Utilise un code comme #703650.</p>}
    {item.photo && <button type="button" className="importSecondary" aria-expanded={open} onClick={() => { setOpen(value => !value); setSaved(false); }}><Pipette />{open ? 'Fermer le prélèvement' : 'Prélever une teinte dans la photo'}</button>}
    {open && item.photo && <Sampler key={item.photo} source={item.photo} onUse={color => useColor(color, 'photo')} />}
    {saved && <p className="importSuccess" role="status"><Check />Teinte retenue pour tes prochains aperçus. Enregistre la fiche pour la conserver.</p>}
    <p className="fieldHelp">{measured ? 'Cette teinte précise est utilisée dans tes nouvelles idées. Modifier sa famille ci-dessous ne la remplace pas.' : 'La couleur actuelle est indicative. Prélève une teinte dans une photo ou ajuste-la ici pour tes prochains aperçus.'}</p>
  </section>;
}
