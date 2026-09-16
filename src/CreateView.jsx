import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Shuffle, Sparkles, Sun, Palette, CalendarDays, Clock3, Brush, SlidersHorizontal, ChevronRight, X, Check, ArrowRight, RotateCcw, Package, BookmarkCheck } from 'lucide-react';
import { createSuggestions, inventoryStamp, profileDefaults } from './creationEngine';
import NailPreview from './NailPreview';
import './creation.css';

const KEY = 'nm-creation-v1';
const modes = [
  { id: 'usual', title: 'Comme d’habitude', subtitle: 'Mes favoris, mon univers', icon: Heart },
  { id: 'change', title: 'Envie de changement', subtitle: 'Redécouvrir ma collection', icon: Shuffle },
  { id: 'surprise', title: 'Surprends-moi', subtitle: 'Une association inattendue', icon: Sparkles },
];
const levels = ['Très simple', 'Un peu de détail', 'À l’aise'];
const limits = [['noDrawing', 'Sans dessin', 'Pas de French, de lignes ou de pois dessinés.'], ['noStickers', 'Sans stickers', 'Seulement les couleurs et leurs finitions.'], ['noLamp', 'Sans lampe', 'Uniquement les vernis classiques.'], ['favorites', 'Vernis favoris uniquement', 'Les couleurs marquées d’un cœur.']];
const durationLabel = value => value === 90 ? '90 min max' : value + ' min max';

function initialState(profile) {
  const fallback = { options: profileDefaults(profile), generated: false, seed: 0, inventory: '', selected: null };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || typeof saved.options !== 'object' || !saved.options) return fallback;
    const options = { ...fallback.options, ...saved.options };
    if (!modes.some(mode => mode.id === options.mode)) options.mode = 'usual';
    if (!Array.isArray(options.constraints)) options.constraints = [];
    if (![0, 1, 2].includes(options.level)) options.level = fallback.options.level;
    if (![15, 30, 45, 60, 90].includes(options.duration)) options.duration = fallback.options.duration;
    return { ...fallback, ...saved, options };
  } catch { return fallback; }
}

function PickerSheet({ title, children, onClose }) {
  const panel = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current.querySelector('button')?.focus();
    function onKey(event) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const buttons = [...panel.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
  }, []);
  return <div className="overlay" onClick={onClose}>
    <section className="productSheet creationSheet" ref={panel} role="dialog" aria-modal="true" aria-labelledby="creation-picker-title" onClick={event => event.stopPropagation()}>
      <div className="grab" /><div className="sheetTitle"><div><small>MON ENVIE DU JOUR</small><h2 id="creation-picker-title">{title}</h2></div><button aria-label="Fermer" onClick={onClose}><X /></button></div>
      {children}
    </section>
  </div>;
}

export default function CreateView({ items, profile, onCollection }) {
  const [state, setState] = useState(() => initialState(profile));
  const [picker, setPicker] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const resultAnchor = useRef(null);
  const options = state.options;
  const stamp = useMemo(() => inventoryStamp(items), [items]);
  const report = useMemo(() => createSuggestions(items, profile, options, state.seed || 1), [items, profile, options, state.seed]);
  const activeRun = state.generated && state.inventory === stamp;
  const chosen = activeRun && report.results.find(idea => idea.id === state.selected);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);

  const selections = {
    mood: { title: 'Quelle humeur ?', icon: Sun, label: 'Humeur', values: ['Douce', 'Mystérieuse', 'Chic', 'Joyeuse', 'Audacieuse', 'Au calme'] },
    style: { title: 'Quel univers ?', icon: Palette, label: 'Univers', values: [...new Set(['Libre', ...(Array.isArray(profile.styles) ? profile.styles : []), 'Witchy', 'Minimal', 'Girly', 'Celestial', 'Coquette', 'Goth', 'Alternative', 'Romantique', 'Floral', 'Nature', 'Y2K'])] },
    occasion: { title: 'Pour quelle occasion ?', icon: CalendarDays, label: 'Occasion', values: ['Tous les jours', 'Travail', 'Soirée', 'Événement', 'Week-end'] },
    duration: { title: 'Combien de temps ?', icon: Clock3, label: 'Temps', values: [15, 30, 45, 60, 90], format: durationLabel },
    level: { title: 'Quel niveau de détail ?', icon: Brush, label: 'Difficulté', values: [0, 1, 2], format: value => levels[value] },
  };

  function change(patch) {
    setState(previous => ({ ...previous, options: { ...previous.options, ...patch }, generated: false, selected: null }));
  }
  function generate() {
    setState(previous => ({ ...previous, generated: true, inventory: stamp, seed: (Number(previous.seed) || 0) + 1, selected: null }));
    requestAnimationFrame(() => resultAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return <div className="creationPage">
    <section className="creationHero">
      <span className="creationEyebrow"><Sparkles /> L’ENVIE DU JOUR</span>
      <h1>Et si on créait<br /><em>ta prochaine pose ?</em></h1>
      <p>Une envie, tes couleurs, ton petit détail.</p>
      <div className="creationProfile">{[profile.shape, profile.length, profile.level].filter(Boolean).map(value => <span key={value}>{value}</span>)}</div>
    </section>

    <section className="creationSection">
      <div className="creationSectionTitle"><span>01</span><h2>De quoi as-tu envie ?</h2></div>
      <div className="creationModes">{modes.map(({ id, title, subtitle, icon: Icon }) => <button key={id} className={options.mode === id ? 'selected' : ''} aria-pressed={options.mode === id} onClick={() => change({ mode: id })}>
        <Icon /><span><b>{title}</b><small>{subtitle}</small></span>{options.mode === id ? <Check className="modeCheck" /> : <ChevronRight className="modeCheck" />}
      </button>)}</div>
      {options.mode === 'surprise' && <div className="surpriseChoices" aria-label="Degré de surprise">
        {[['Safe', 'Un petit pas'], ['Creative', 'Plus de fantaisie'], ['Chaos', 'J’ose les contrastes']].map(([value, label]) => <button key={value} aria-pressed={options.surprise === value} className={options.surprise === value ? 'on' : ''} onClick={() => change({ surprise: value })}><b>{value}</b><small>{label}</small></button>)}
        <p>La surprise respecte toujours ton temps, ton niveau et ton matériel.</p>
      </div>}
    </section>

    <section className="creationSection">
      <div className="creationSectionTitle"><span>02</span><h2>Ajoute ta touche</h2></div>
      <div className="creationTiles">{Object.entries(selections).map(([key, choice]) => <button key={key} onClick={() => setPicker(key)}>
        <choice.icon /><small>{choice.label}</small><b>{choice.format ? choice.format(options[key]) : options[key]}</b><ChevronRight className="tileArrow" />
      </button>)}
        <button onClick={() => setPicker('constraints')}><SlidersHorizontal /><small>Mes limites</small><b>{options.constraints.length ? options.constraints.length + ' choix' : 'Tout mon matériel'}</b><ChevronRight className="tileArrow" /></button>
      </div>
      {options.constraints.length > 0 && <div className="creationLimits">{limits.filter(([key]) => options.constraints.includes(key)).map(([key, label]) => <span key={key}>{label}</span>)}</div>}
      <p className="creationHint">Les premiers choix viennent de ton profil. Tu peux les adapter à cette envie sans modifier tes habitudes.</p>
    </section>

    <section className="creationInventory">
      <Package /><div><b>À partir de ta collection</b><p>{report.inventoryColors} couleur{report.inventoryColors > 1 ? 's' : ''} · {report.tools.equipment.length} matériel{report.tools.equipment.length > 1 ? 's' : ''} & accessoires</p></div><button onClick={onCollection} aria-label="Ouvrir ma collection"><ChevronRight /></button>
    </section>
    {(report.blocked.length > 0 || report.effects.length > 0) && <details className="creationReadiness">
      <summary>{report.blocked.length + report.effects.length} produit{report.blocked.length + report.effects.length > 1 ? 's' : ''} non retenu{report.blocked.length + report.effects.length > 1 ? 's' : ''} pour cette envie</summary>
      <ul>{report.blocked.map(({ item, reason }) => <li key={item.id}><b>{item.name}</b><span>{reason}</span></li>)}{report.effects.map(item => <li key={item.id}><b>{item.name}</b><span>Effet à appliquer sur une base : sa compatibilité et ses accessoires restent à préciser. Il n’est pas utilisé comme couleur seule.</span></li>)}</ul>
      <button onClick={onCollection}>Voir mes fiches produits <ArrowRight /></button>
    </details>}
    {state.generated && !activeRun && <p className="creationNotice" role="status">Ta collection a changé. Relance les idées pour utiliser son contenu actuel.</p>}
    {report.results.length === 0 ? <section className="creationEmpty" role="status">
      <Palette /><h2>On ajuste un petit détail ?</h2>
      <p>{report.availableColors ? 'Aucune idée ne tient dans le temps choisi. Essaie un peu plus de temps.' : report.inventoryColors ? 'Tes couleurs ne sont pas utilisables avec les limites ou le matériel actuellement renseignés. Consulte les produits non retenus ci-dessus.' : 'Ajoute au moins une couleur de vernis dans ta collection pour composer tes premières idées.'}</p>
      <button onClick={report.availableColors ? () => setPicker('duration') : onCollection}>{report.availableColors ? 'Ajuster mon temps' : 'Ouvrir ma collection'}<ArrowRight /></button>
    </section> : <button className="creationGenerate" onClick={generate}><Sparkles />{activeRun ? 'Recomposer mes idées' : 'Trouver mes idées'}<ArrowRight /></button>}
    <p className="creationTimeNote">Temps indicatifs pour la couleur et la décoration, hors préparation, dépose et séchage.</p>
    {storageError && <p className="formError" role="alert">Tes choix restent disponibles ici, mais n’ont pas pu être sauvegardés sur cet appareil.</p>}

    {activeRun && <section className="creationResults" ref={resultAnchor} aria-labelledby="ideas-title">
      <div className="creationSectionTitle"><span>03</span><div><small>COMPOSÉES AVEC CE QUE TU POSSÈDES</small><h2 id="ideas-title">{report.results.length} idée{report.results.length > 1 ? 's' : ''} pour toi</h2></div></div>
      {report.results.length < 4 && <p className="creationNotice">Ta collection et tes choix permettent {report.results.length} proposition{report.results.length > 1 ? 's' : ''} distincte{report.results.length > 1 ? 's' : ''} pour le moment. Aucun produit supplémentaire n’a été ajouté aux idées.</p>}
      <p className="creationHint">Aperçus schématiques : les teintes et les motifs sont indicatifs. Vérifie la compatibilité des produits et de la lampe sur leurs notices.</p>
      {chosen && <div className="chosenIdea" role="status"><BookmarkCheck /><span><b>Ton idée retenue</b><small>{chosen.title} · {chosen.palette.map(item => item.name).join(' + ')}</small></span></div>}
      <div className="ideaList">{report.results.map((idea, index) => <article className={'ideaCard ' + (chosen?.id === idea.id ? 'chosen' : '')} key={idea.id}>
        <div className="ideaTopline"><span>ENVIE {String(index + 1).padStart(2, '0')}</span><span><Clock3 />≈ {idea.minutes} min</span></div>
        <NailPreview idea={idea} />
        <div className="ideaBody"><span className="ideaDifficulty">{levels[idea.rank]}</span><h3>{idea.title}</h3><p>{idea.description}</p>
          <div className="ideaProducts">{idea.palette.map(item => <span key={item.id}><i style={{ background: item.color }} />{item.name}</span>)}</div>
          {idea.resources.length > 0 && <div className="ideaEquipment"><small>AVEC MON MATÉRIEL</small><p>{idea.resources.map(item => item.name).join(' · ')}</p></div>}
          <ul className="ideaReasons">{idea.reasons.map(reason => <li key={reason}><Check />{reason}</li>)}</ul>
          <button className="chooseIdea" aria-pressed={chosen?.id === idea.id} onClick={() => setState(previous => ({ ...previous, selected: previous.selected === idea.id ? null : idea.id }))}>{chosen?.id === idea.id ? <Check /> : <Heart />}{chosen?.id === idea.id ? 'Idée retenue' : 'Je choisis cette idée'}</button>
        </div>
      </article>)}</div>
      {report.total > report.results.length && <button className="moreIdeas" onClick={generate}><RotateCcw />Proposer d’autres associations</button>}
    </section>}

    {picker && <PickerSheet title={picker === 'constraints' ? 'Tes limites du jour' : selections[picker].title} onClose={() => setPicker(null)}>
      <div className="creationOptions">{picker === 'constraints' ? limits.map(([key, label, detail]) => <button key={key} aria-pressed={options.constraints.includes(key)} className={options.constraints.includes(key) ? 'on' : ''} onClick={() => change({ constraints: options.constraints.includes(key) ? options.constraints.filter(value => value !== key) : [...options.constraints, key] })}><span><b>{label}</b><small>{detail}</small></span>{options.constraints.includes(key) && <Check />}</button>) : selections[picker].values.map(value => <button key={value} className={options[picker] === value ? 'on' : ''} aria-pressed={options[picker] === value} onClick={() => { change({ [picker]: value }); setPicker(null); }}><span>{selections[picker].format ? selections[picker].format(value) : value}</span>{options[picker] === value && <Check />}</button>)}</div>
      {picker === 'constraints' && <button className="creationGenerate" onClick={() => setPicker(null)}><Check />Garder ces choix</button>}
    </PickerSheet>}
  </div>;
}
