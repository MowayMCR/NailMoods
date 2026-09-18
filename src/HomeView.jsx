import { browserStorage } from './storage';
import React, { useEffect, useMemo, useState } from 'react';
import { UserRound, Library, Palette, Heart, ArrowRight, ChevronRight, BookHeart, ListChecks, Play, BookmarkCheck, Sparkles, RotateCcw, Clock3, Check, Leaf } from 'lucide-react';
import NailPreview from './NailPreview';
import { DecorationPhoto } from './DecorationPicker';
import { isDecoration } from './decorations';
import { productColor } from './colorAnalysis';
import { readCreationState } from './creationState';
import { buildHome, homeSeed } from './home';
import { difficultyLabels } from './inspirations';
import { journalDate } from './journal';
import { formatCountdown, timerFinished, timerRemaining } from './tutorial';
import { personalRecipeKey } from './personalization';
import { PersonalizationSummary } from './PersonalizationView';
import './creation.css';
import './inspiration.css';
import './home.css';

function ResumeProgress({ session }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = session.timer.status === 'running' ? setInterval(refresh, 1000) : null;
    document.addEventListener('visibilitychange', refresh);
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [session.timer]);
  return <div className="homeProgress">
    <div><span>{session.status === 'ready' ? 'À commencer' : session.status === 'paused' ? 'En pause' : 'En cours'}</span><span>{session.completed.length} / {session.steps.length} étapes</span></div>
    <progress value={session.completed.length} max={session.steps.length} aria-label="Progression de ma pose" />
    {session.status !== 'ready' && <p>{session.steps[session.current]?.title}</p>}
    {session.timer.status === 'running' && <p className="homeTimer"><Clock3 />{timerFinished(session.timer, now) ? 'Temps écoulé · retrouve ta pose pour continuer.' : <span role="timer" aria-label="Temps restant du minuteur">{formatCountdown(timerRemaining(session.timer, now))} · minuteur en cours</span>}</p>}
    {session.timer.status === 'paused' && <p className="homeTimer"><Clock3 />Minuteur en pause · à relancer quand tu es prête.</p>}
  </div>;
}

export default function HomeView({ profile, items, library, journal, tutorials, personalModel, personalSettings, onNavigate, onOpen, onResume, onJournal, onJournalSession, onCollection, onPersonalization, onCreate }) {
  const [options] = useState(() => readCreationState(browserStorage, profile).options);
  const liveLearning = personalSettings.enabled ? personalModel.ranking : null;
  const liveStamp = personalSettings.enabled ? personalModel.stamp : 'off';
  const [run, setRun] = useState(() => ({ seed: homeSeed(), learning: liveLearning, stamp: liveStamp, exclude: '' }));
  const home = useMemo(() => buildHome({ profile, items, library, journal, tutorials, options, ...run }), [profile, items, library, journal, tutorials, options, run]);
  const { resume, retained, inspiration, readiness } = home;
  const pendingLearning = run.stamp !== liveStamp && (run.learning || liveLearning);
  const discover = personalSettings.enabled ? personalModel.unexplored[0] : null;
  const modeLabel = { usual: 'Comme d’habitude', change: 'Envie de changement', surprise: 'Surprends-moi' }[options.mode];
  const regenerate = () => setRun(previous => ({ seed: previous.seed + 1, learning: liveLearning, stamp: liveStamp, exclude: personalRecipeKey(inspiration) }));
  const create = () => onCreate();
  const nextTitle = home.priority === 'resume' ? resume.idea.title : home.priority === 'retained' ? retained.title : readiness ? readiness.title : 'On crée ta prochaine pose ?';

  return <div className="homePage smartHome">
    <section className="homeGreeting"><small>{profile.name ? 'BONJOUR, ' + profile.name.toLocaleUpperCase('fr') : 'TON NAILMOODS, À TON RYTHME'}</small><h1>Inspire-moi</h1><p>Des idées de manucure selon ton mood, tes envies et tes couleurs. Avec ou sans collection.</p>
      <button className="homePrimary" onClick={create}><Sparkles />Créer une idée<ArrowRight /></button>
      <div className="homeStats"><button onClick={() => onNavigate('collection')}><b>{home.report.inventoryColors}</b><span>couleurs</span></button><button onClick={() => onNavigate('journal')}><b>{journal.entries.length}</b><span>souvenirs</span></button><button onClick={() => onNavigate('favorites')}><b>{library.favorites.length}</b><span>idées favorites</span></button></div>
    </section>

    {!items.length && <section className="homeCollectionInvite"><Library /><div><b>Ta collection, à ton rythme</b><p>Ajoute tes produits pour personnaliser tes idées.</p><button className="homeTextButton" onClick={() => onNavigate('collection')}>Ajouter mes premiers produits<ChevronRight /></button><button className="homeTextButton" onClick={create}>Continuer sans collection<ArrowRight /></button></div></section>}

    {(resume || retained) && <section className="homeNext" aria-labelledby="home-next-title">
      <small>{home.priority === 'resume' ? 'ON REPREND ?' : home.priority === 'retained' ? 'MON IDÉE RETENUE' : readiness ? 'POUR COMMENCER' : 'MON PROCHAIN MOMENT'}</small><h2 id="home-next-title">{nextTitle}</h2>
      {home.priority === 'resume' ? <><NailPreview idea={resume.idea} compact /><ResumeProgress session={resume} /><button className="homePrimary" onClick={() => onResume(resume.id)}><Play />{resume.status === 'ready' ? 'Préparer ma pose' : resume.status === 'paused' ? 'Reprendre ma pose' : 'Continuer ma pose'}<ArrowRight /></button><button className="homeTextButton" onClick={create}>Créer une autre inspiration<ChevronRight /></button></>
        : home.priority === 'retained' ? <><NailPreview idea={retained} /><p>{retained.palette.map(item => item.name).join(' · ')}</p>{home.retainedChanges.length > 0 && <p className="homeNotice">Ta collection a changé : vérifie les références dans la fiche avant de commencer.</p>}<button className="homePrimary" onClick={() => onOpen(retained)}><BookmarkCheck />Retrouver mon idée<ArrowRight /></button><button className="homeTextButton" onClick={create}>Explorer d’autres idées<ChevronRight /></button></>
          : readiness ? <><p>{readiness.text}</p><button className="homePrimary" onClick={() => onNavigate(readiness.route)}><Library />{readiness.action}<ArrowRight /></button></>
            : <><p>Retrouve ton envie, ton nombre de vernis et tes décorations. Tu peux tout adapter au moment de créer.</p><button className="homePrimary" onClick={create}><Palette />Créer ma prochaine pose<ArrowRight /></button></>}
    </section>}

    {home.pending ? <section className="homeMemory" aria-labelledby="home-memory-title"><BookHeart /><div><small>UN SOUVENIR, SI TU EN AS ENVIE</small><h2 id="home-memory-title">Comment était ta pose ?</h2><p>{home.pending.idea.title}</p><NailPreview idea={home.pending.idea} compact /><small>Photo et ressenti restent facultatifs.</small><button className="homeTextButton" onClick={() => onJournalSession(home.pending)}>Ajouter au journal<ArrowRight /></button></div></section>
      : home.latest && <section className="homeMemory" aria-labelledby="home-memory-title">{home.latest.photo ? <img src={home.latest.photo} alt={'Photo de ta pose « ' + home.latest.title + ' »'} loading="lazy" /> : <BookHeart />}<div><small>MON DERNIER SOUVENIR · {journalDate(home.latest.date)}</small><h2 id="home-memory-title">{home.latest.title}</h2>{!home.latest.photo && home.latest.idea && <NailPreview idea={home.latest.idea} compact />}<button className="homeTextButton" onClick={() => onJournal(home.latest.id)}>Revoir mon souvenir<ArrowRight /></button></div></section>}

    {inspiration && <section className="homeInspiration" aria-labelledby="home-inspiration-title"><div className="homeSectionTitle"><div><small>MON INSPIRATION DU JOUR</small><h2 id="home-inspiration-title">Une inspiration pour toi</h2></div>{(home.alternativeCount > 1 || pendingLearning) && <button onClick={regenerate} aria-label={pendingLearning ? 'Actualiser mon inspiration' : 'Proposer une autre inspiration'}><RotateCcw /></button>}</div>
      <p className="homeHint">{modeLabel} · {options.duration} min max · {difficultyLabels[options.level]}. Avec tes derniers choix dans Créer.</p>
      {pendingLearning && <p className="homeNotice">Tes nouveaux retours seront utilisés pour la prochaine inspiration.</p>}
      <article className="homeIdea"><NailPreview idea={inspiration} /><div className="homeIdeaBody"><div className="homeIdeaMeta"><span><Clock3 />≈ {inspiration.minutes} min</span><span>{inspiration.palette.length} vernis</span><span>{difficultyLabels[inspiration.rank]}</span></div><h3>{inspiration.title}</h3><div className="homePalette">{inspiration.palette.map(item => <span key={item.id}><i style={{ background: item.color }} />{item.name}</span>)}</div>
        {inspiration.resources.filter(isDecoration).map(item => <div className="homeDecoration" key={item.id}><DecorationPhoto item={item} /><span><small>MA DÉCORATION</small><b>{item.name}</b></span></div>)}
        <ul className="homeReasons">{inspiration.reasons.map(reason => <li key={reason}><Check />{reason}</li>)}</ul><button className="homePrimary" onClick={() => onOpen(inspiration, options)}>Découvrir cette idée<ArrowRight /></button><p className="homeHint">{inspiration.intent === 'inspire' ? 'Couleurs de style, à adapter avec tes produits.' : 'Tes teintes enregistrées, avec des reflets et motifs schématiques.'} Temps hors préparation, dépose et séchage.</p></div></article>
    </section>}
    {resume && retained && <button className="homeKept" onClick={() => onOpen(retained)}><BookmarkCheck /><span><small>MON IDÉE RETENUE POUR PLUS TARD</small><b>{retained.title}</b><NailPreview idea={retained} compact />{home.retainedChanges.length > 0 && <small>Collection modifiée · références à vérifier</small>}</span><ChevronRight /></button>}
    {readiness && ['resume', 'retained'].includes(home.priority) && <section className="homeReadiness"><h2>{readiness.title}</h2><p>{readiness.text}</p><button className="homeTextButton" onClick={() => onNavigate(readiness.route)}>{readiness.action}<ArrowRight /></button></section>}
    {discover && <button className="homeDiscovery" onClick={() => onCollection(discover.id)}><i style={{ background: productColor(discover) }} /><span><small><Leaf />UNE COULEUR À EXPLORER</small><b>{discover.name}</b><small>Pas encore dans tes poses enregistrées</small></span><ChevronRight /></button>}

    <PersonalizationSummary model={personalModel} settings={personalSettings} onOpen={onPersonalization} />
    <section className="homeExplore" aria-labelledby="home-explore-title"><div className="homeSectionTitle"><h2 id="home-explore-title">Tout mon NailMoods</h2><Sparkles /></div><div className="homeShortcuts">{[
      ['collection', Library, 'Ma collection', items.length + ' produits et accessoires'],
      ['create', Palette, 'Créer une inspiration', 'Mes envies et mes idées'],
      ['tutorials', ListChecks, 'Mes poses', home.unfinishedCount ? home.unfinishedCount + ' à retrouver' : 'Mes tutoriels et ma progression'],
      ['journal', BookHeart, 'Mon journal', journal.entries.length ? journal.entries.length + ' souvenir' + (journal.entries.length > 1 ? 's' : '') : 'Mes photos et mes retours'],
      ['favorites', Heart, 'Mes inspirations favorites', library.favorites.length + ' idée' + (library.favorites.length > 1 ? 's' : '') + ' conservée' + (library.favorites.length > 1 ? 's' : '')],
      ['profile', UserRound, 'Mon profil', 'Mes habitudes et mon univers'],
    ].map(([route, Icon, title, subtitle]) => <button key={route} data-content={route} onClick={() => route === 'create' ? create() : onNavigate(route)}><Icon /><b>{title}</b><small>{subtitle}</small>{route === 'collection' && home.report.inventoryColors > 0 && <span className="tileSwatches" aria-label="Quelques couleurs de ma collection">{items.filter(item => ['Vernis', 'Semi-permanent', 'Gel'].includes(item.type)).slice(0, 5).map(item => <i key={item.id} style={{ background: productColor(item) }} />)}</span>}<ChevronRight /></button>)}</div></section>
  </div>;
}
