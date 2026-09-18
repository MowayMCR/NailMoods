import { browserStorage } from './storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Shuffle, Sparkles, Sun, Palette, CalendarDays, Clock3, Brush, SlidersHorizontal, ChevronRight, Check, ArrowRight, RotateCcw, Package, BookmarkCheck, Sticker } from 'lucide-react';
import { createSuggestions, inventoryStamp } from './creationEngine';
import NailPreview from './NailPreview';
import './creation.css';
import Sheet from './Sheet';
import InspirationView, { FavoritesView } from './InspirationView';
import { findIdea, snapshotIdea } from './inspirations';
import { decorationChoice, isDecoration } from './decorations';
import DecorationPicker, { DecorationPhoto } from './DecorationPicker';
import { PersonalizationSummary } from './PersonalizationView';
import { CREATION_KEY as KEY, readCreationState } from './creationState';

const modes = [
  { id: 'usual', title: 'Comme d’habitude', subtitle: 'Mes favoris, mon univers', icon: Heart },
  { id: 'change', title: 'Envie de changement', subtitle: 'Redécouvrir ma collection', icon: Shuffle },
  { id: 'surprise', title: 'Surprends-moi', subtitle: 'Une association inattendue', icon: Sparkles },
];
const levels = ['Très simple', 'Un peu de détail', 'À l’aise'];
const limits = [['noDrawing', 'Sans dessin', 'Pas de French, de lignes ou de pois dessinés.'], ['noLamp', 'Sans lampe', 'Uniquement les vernis classiques.'], ['favorites', 'Vernis favoris uniquement', 'Les couleurs marquées d’un cœur.']];
const durationLabel = value => value === 90 ? '90 min max' : value + ' min max';
const polishCountLabel = value => value === 'auto' ? 'Automatique' : value + ' vernis';
const polishCountHints = { auto: 'Des associations de 1 à 5 vernis, selon ta collection.', 1: 'Un seul vernis coloré.', 2: 'Duos, accents et détails.', 3: 'Un trio à répartir sur les ongles.', 4: 'Quatre vernis dans une même composition.', 5: 'Un vernis différent sur chaque ongle.' };

export default function CreateView({ onEquipment, items, profile, onCollection, route, library, onOpen, onFavorite, onSelect, onRoute, onTutorial, onDone, tutorials, personalModel, personalSettings, onPersonalization }) {
  const [state, setState] = useState(() => readCreationState(browserStorage, profile));
  const [picker, setPicker] = useState(null);
  const [storageError, setStorageError] = useState(false);
  const resultAnchor = useRef(null);
  const options = state.options;
  const stamp = useMemo(() => inventoryStamp(items), [items]);
  const activeRun = state.generated && state.inventory === stamp;
  const liveLearning = personalSettings.enabled ? personalModel.ranking : null;
  const liveStamp = personalSettings.enabled ? personalModel.stamp : 'off';
  const learning = activeRun ? state.learning : liveLearning;
  const report = useMemo(() => createSuggestions(items, profile, options, state.seed || 1, 4, learning), [items, profile, options, state.seed, learning]);
  const pendingLearning = activeRun && state.learningStamp !== liveStamp && (state.learning || liveLearning);
  const chosen = activeRun && report.results.find(idea => idea.id === state.selected);
  const decorations = decorationChoice(options);
  const missingLamp = report.blocked.some(entry => entry.reason === 'Lampe UV / LED à renseigner dans le matériel.');
  const missingMagnet = report.blocked.some(entry => entry.reason === 'Aimant cat-eye à renseigner dans le matériel.');
  const selectedDecoration = report.tools.stickers.find(item => String(item.id) === decorations.id);
  const decorationLabel = decorations.mode === 'without' ? 'Sans décorations' : decorations.mode === 'with' ? decorations.id ? selectedDecoration?.name || 'À choisir' : 'Avec mes décorations' : 'Automatique';
  useEffect(() => {
    try { browserStorage.setItem(KEY, JSON.stringify(state)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [state]);

  const selections = {
    mood: { title: 'Quelle humeur ?', icon: Sun, label: 'Humeur', values: ['Douce', 'Mystérieuse', 'Chic', 'Joyeuse', 'Audacieuse', 'Au calme'] },
    style: { title: 'Quel univers ?', icon: Palette, label: 'Univers', values: [...new Set(['Libre', ...(Array.isArray(profile.styles) ? profile.styles : []), 'Witchy', 'Minimal', 'Girly', 'Celestial', 'Coquette', 'Goth', 'Alternative', 'Romantique', 'Floral', 'Nature', 'Y2K'])] },
    occasion: { title: 'Pour quelle occasion ?', icon: CalendarDays, label: 'Occasion', values: ['Tous les jours', 'Travail', 'Soirée', 'Événement', 'Week-end'] },
    duration: { title: 'Combien de temps ?', icon: Clock3, label: 'Temps', values: [15, 30, 45, 60, 90], format: durationLabel },
    polishCount: { title: 'Combien de vernis ?', icon: Palette, label: 'Nombre de vernis', values: ['auto', 1, 2, 3, 4, 5], format: polishCountLabel },
    level: { title: 'Quel niveau de détail ?', icon: Brush, label: 'Difficulté', values: [0, 1, 2], format: value => levels[value] },
  };

  function change(patch) {
    setState(previous => ({ ...previous, options: { ...previous.options, ...patch }, generated: false, selected: null }));
  }
  function generate() {
    setState(previous => ({ ...previous, generated: true, inventory: stamp, seed: (Number(previous.seed) || 0) + 1, selected: null, learning: liveLearning, learningStamp: liveStamp }));
    requestAnimationFrame(() => resultAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const completedKeys = new Set(tutorials.filter(session => session.status === 'completed').map(session => session.idea.key));
  const openedKey = route.startsWith('#inspiration/') ? route.slice('#inspiration/'.length) : null;
  const opened = openedKey && findIdea(library, openedKey);
  if (route === '#favoris') return <FavoritesView completedKeys={completedKeys} favorites={library.favorites} items={items} onOpen={onOpen} onFavorite={onFavorite} onBack={() => onRoute('create')} />;
  if (opened) return <InspirationView learning={liveLearning} key={opened.key} idea={opened} items={items} profile={profile} favorite={library.favorites.some(idea => idea.key === opened.key)} selected={library.selected?.key === opened.key} onFavorite={() => onFavorite(opened)} onSelect={() => { const clear = library.selected?.key === opened.key; if (onSelect(opened, clear)) setState(previous => ({ ...previous, selected: clear ? null : opened.id })); }} onOpen={onOpen} onBack={() => onRoute('create')} onFavorites={() => onRoute('favorites')} onCollection={onCollection} onTutorial={() => onTutorial(opened)} onDone={() => onDone(opened)} completed={completedKeys.has(opened.key)} tutorialExists={tutorials.some(session => session.idea.key === opened.key && session.status !== 'completed')} />;
  if (openedKey) return <section className="creationEmpty"><h1>Cette fiche n’est plus disponible</h1><p>Retrouve tes favoris ou compose une nouvelle inspiration.</p><button onClick={() => onRoute('favorites')}>Mes favoris</button><button onClick={() => onRoute('create')}>Créer une inspiration</button></section>;

  return <div className="creationPage">
    <section className="creationHero">
      <span className="creationEyebrow"><Sparkles /> L’ENVIE DU JOUR</span>
      <h1>Et si on créait<br /><em>ta prochaine pose ?</em></h1>
      <p>Une envie, tes couleurs, ton petit détail.</p>
      <div className="creationProfile">{[profile.shape, profile.length, profile.level].filter(Boolean).map(value => <span key={value}>{value}</span>)}</div>
    </section>

    <button className="creationSaved" onClick={() => onRoute('favorites')}><span><Heart />Mes inspirations favorites</span><small>{library.favorites.length} idée{library.favorites.length > 1 ? 's' : ''}</small><ChevronRight /></button>
    <PersonalizationSummary model={personalModel} settings={personalSettings} onOpen={onPersonalization} />
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
        <button className="creationDecorationsTile" onClick={() => setPicker('decorations')}><Sticker /><small>Décorations</small><b>{decorationLabel}</b><ChevronRight className="tileArrow" /></button>
        <button className="creationLimitsTile" onClick={() => setPicker('constraints')}><SlidersHorizontal /><small>Mes limites</small><b>{options.constraints.length ? options.constraints.length + ' choix' : 'Tout mon matériel'}</b><ChevronRight className="tileArrow" /></button>
      </div>
      {options.constraints.length > 0 && <div className="creationLimits">{limits.filter(([key]) => options.constraints.includes(key)).map(([key, label]) => <span key={key}>{label}</span>)}</div>}

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
    {pendingLearning && <p className="creationNotice" role="status">Tes retours ou tes réglages ont changé. Recompose tes idées pour les prendre en compte.</p>}
    {report.results.length === 0 ? <section className="creationEmpty" role="status">
      <Palette /><h2>{missingLamp ? 'As-tu une lampe UV / LED ?' : missingMagnet ? 'As-tu un aimant cat-eye ?' : 'Préparons ta première idée'}</h2>
      {missingLamp && <><p>Tes semi-permanents ou gels nécessitent une lampe. Ajoute celle que tu possèdes pour les utiliser dans tes idées.</p><button onClick={() => onEquipment('Lampe UV / LED')}>J’ai une lampe UV / LED</button></>}
      {missingMagnet && <><p>Ces couleurs nécessitent un aimant cat-eye.</p><button onClick={() => onEquipment('Aimant cat-eye')}>J’ai un aimant cat-eye</button></>}
      <p hidden={missingLamp || missingMagnet}>{report.decorationUnavailable ? decorations.id ? 'La décoration choisie n’est plus disponible dans ta collection. Choisis-en une autre ou repasse en automatique.' : 'Ajoute des stickers ou des strass dans ta collection, ou choisis des idées sans décorations.' : report.availableColors && report.countUnavailable ? 'Tu as choisi ' + report.requestedPolishCount + ' vernis. Avec ta collection, le type de pose et tes limites actuelles, ' + report.maxPolishCount + ' au maximum peuvent être associés. Ajuste ce nombre, tes limites ou ta collection.' : report.availableColors ? 'Aucune idée ne tient dans le temps choisi. Essaie un peu plus de temps.' : report.inventoryColors ? 'Tes couleurs ne sont pas utilisables avec les limites ou le matériel actuellement renseignés. Consulte les produits non retenus ci-dessus.' : 'Ajoute au moins une couleur de vernis dans ta collection pour composer tes premières idées.'}</p>
      <button onClick={report.decorationUnavailable ? () => setPicker('decorations') : report.availableColors ? () => setPicker(report.countUnavailable ? 'polishCount' : 'duration') : onCollection}>{report.decorationUnavailable ? 'Choisir mes décorations' : report.availableColors ? report.countUnavailable ? 'Ajuster le nombre de vernis' : 'Ajuster mon temps' : 'Ouvrir ma collection'}<ArrowRight /></button>
    </section> : <button className="creationGenerate" onClick={generate}><Sparkles />{activeRun ? 'Recomposer mes idées' : 'Générer une idée'}<ArrowRight /></button>}
    <p className="creationTimeNote">Temps indicatifs pour la couleur et la décoration, hors préparation, dépose et séchage.</p>
    {storageError && <p className="formError" role="alert">Tes choix restent disponibles ici, mais n’ont pas pu être sauvegardés sur cet appareil.</p>}

    {activeRun && <section className="creationResults" ref={resultAnchor} aria-labelledby="ideas-title">
      <div className="creationSectionTitle"><span>03</span><div><small>COMPOSÉES AVEC CE QUE TU POSSÈDES</small><h2 id="ideas-title">{report.results.length} idée{report.results.length > 1 ? 's' : ''} pour toi</h2></div></div>
      {report.results.length < 4 && <p className="creationNotice">Ta collection et tes choix permettent {report.results.length} proposition{report.results.length > 1 ? 's' : ''} distincte{report.results.length > 1 ? 's' : ''} pour le moment. Aucun produit supplémentaire n’a été ajouté aux idées.</p>}
      <p className="creationHint">Aperçus schématiques avec tes teintes enregistrées. Les reflets et motifs restent illustratifs. Vérifie la compatibilité des produits et de la lampe sur leurs notices.</p>
      {chosen && <button className="chosenIdea" onClick={() => onOpen(chosen, options)}><BookmarkCheck /><span><b>Ton idée retenue</b><small>{chosen.title} · {chosen.palette.map(item => item.name).join(' + ')}</small></span><ChevronRight /></button>}
      <div className="ideaList">{report.results.map((idea, index) => <article className={'ideaCard ' + (chosen?.id === idea.id ? 'chosen' : '')} key={idea.id}>
        <div className="ideaTopline"><span>ENVIE {String(index + 1).padStart(2, '0')}</span><span><Clock3 />≈ {idea.minutes} min</span></div>
        <NailPreview idea={idea} />
        <div className="ideaBody">{completedKeys.has(snapshotIdea(idea, options).key) && <span className="ideaDoneBadge"><Check />Déjà réalisée</span>}<div className="ideaBadges"><span className="ideaDifficulty">{levels[idea.rank]}</span><span className="ideaPolishCount">{polishCountLabel(idea.polishCount)}</span></div><h3>{idea.title}</h3><p>{idea.description}</p>
          <div className="ideaProducts">{idea.palette.map(item => <span key={item.id}><i style={{ background: item.color }} />{item.name}</span>)}</div>
          {idea.resources.filter(isDecoration).map(item => <div className="ideaDecoration" key={item.id}><DecorationPhoto item={item} /><div><small>MA DÉCORATION</small><b>{item.name}</b><span>Motif schématique sur les ongles</span></div></div>)}
          {idea.resources.some(item => !isDecoration(item)) && <div className="ideaEquipment"><small>AVEC MON MATÉRIEL</small><p>{idea.resources.filter(item => !isDecoration(item)).map(item => item.name).join(' · ')}</p></div>}
          <ul className="ideaReasons">{idea.reasons.map(reason => <li key={reason}><Check />{reason}</li>)}</ul>
          <button className="chooseIdea" aria-pressed={chosen?.id === idea.id} onClick={() => { const saved = snapshotIdea(idea, options); const clear = chosen?.id === idea.id; if (onSelect(saved, clear)) setState(previous => ({ ...previous, selected: clear ? null : idea.id })); }}>{chosen?.id === idea.id ? <Check /> : <BookmarkCheck />}{chosen?.id === idea.id ? 'Idée retenue' : 'Je choisis cette idée'}</button>
          <div className="ideaCardActions"><button className="detailPrimary" onClick={() => onOpen(idea, options)}>Voir la fiche<ArrowRight /></button><button className="ideaHeart" aria-label={(library.favorites.some(saved => saved.key === snapshotIdea(idea, options).key) ? 'Retirer des favoris : ' : 'Ajouter aux favoris : ') + idea.title} aria-pressed={library.favorites.some(saved => saved.key === snapshotIdea(idea, options).key)} onClick={() => onFavorite(snapshotIdea(idea, options))}><Heart fill={library.favorites.some(saved => saved.key === snapshotIdea(idea, options).key) ? 'currentColor' : 'none'} /></button></div>
        </div>
      </article>)}</div>
      {report.total > report.results.length && <button className="moreIdeas" onClick={generate}><RotateCcw />Proposer d’autres associations</button>}
    </section>}

    {picker === 'decorations' && <DecorationPicker decorations={report.tools.stickers} choice={decorations} onClose={() => setPicker(null)} onCollection={() => { setPicker(null); onCollection(); }} onChange={(mode, id = '') => change({ decorations: mode, decorationId: id, constraints: options.constraints.filter(value => value !== 'noStickers') })} />}
    {picker && picker !== 'decorations' && <Sheet className="creationSheet" eyebrow="MON ENVIE DU JOUR" title={picker === 'constraints' ? 'Tes limites du jour' : selections[picker].title} onClose={() => setPicker(null)}>
      {picker === 'polishCount' && <p className="creationPickerHelp">Choisis un nombre exact de vernis colorés par proposition. Les stickers, bases et top coats ne sont pas comptés.</p>}
      <div className="creationOptions">{picker === 'constraints' ? limits.map(([key, label, detail]) => <button key={key} aria-pressed={options.constraints.includes(key)} className={options.constraints.includes(key) ? 'on' : ''} onClick={() => change({ constraints: options.constraints.includes(key) ? options.constraints.filter(value => value !== key) : [...options.constraints, key] })}><span><b>{label}</b><small>{detail}</small></span>{options.constraints.includes(key) && <Check />}</button>) : selections[picker].values.map(value => <button key={value} className={options[picker] === value ? 'on' : ''} aria-pressed={options[picker] === value} onClick={() => { change({ [picker]: value }); setPicker(null); }}><span>{selections[picker].format ? selections[picker].format(value) : value}{picker === 'polishCount' && <small>{polishCountHints[value]}</small>}</span>{options[picker] === value && <Check />}</button>)}</div>
      {picker === 'constraints' && <button className="creationGenerate" onClick={() => setPicker(null)}><Check />Garder ces choix</button>}
    </Sheet>}
  </div>;
}
