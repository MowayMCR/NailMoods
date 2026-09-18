import { StorageHint } from './StorageContext';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookHeart, Check, CheckCircle2, ChevronRight, Clock3, ListChecks, Pause, Play, RotateCcw, Sparkles, Timer } from 'lucide-react';
import NailPreview from './NailPreview';
import Sheet from './Sheet';
import { fingers, ideaAvailability } from './inspirations';
import { canComplete, completionLabel, firstIncomplete, formatCountdown, handLabels, timerFinished, timerRemaining } from './tutorial';
import './tutorial.css';

const statusLabels = { ready: 'À commencer', active: 'En cours', paused: 'En pause', completed: 'Terminée' };
function useClock(running) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const interval = running ? setInterval(refresh, 250) : null;
    document.addEventListener('visibilitychange', refresh);
    return () => { if (interval) clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, [running]);
  return now;
}

export function TutorialBanner({ session, onOpen }) {
  const now = useClock(session?.timer.status === 'running');
  if (!session || session.status === 'completed') return null;
  const running = session.timer.status === 'running';
  return <button className="tutorialBanner" onClick={() => onOpen(session.id)}><span className="tutorialBannerIcon">{running ? <Timer /> : <Play />}</span><span><b>{session.status === 'ready' ? 'Ton tutoriel est prêt' : session.status === 'paused' ? 'Ta pose est en pause' : 'Ta pose en cours'}</b><small>{session.idea.title}</small></span><em>{running ? timerFinished(session.timer, now) ? 'Temps écoulé' : formatCountdown(timerRemaining(session.timer, now)) : session.completed.length + ' / ' + session.steps.length}</em><ChevronRight /></button>;
}

function StepTimer({ session, step, onAction, now, locked }) {
  const savedDuration = Number(session.durations[step.id]);
  const [minutes, setMinutes] = useState(Number.isInteger(savedDuration) && savedDuration > 0 ? String(Math.floor(savedDuration / 60)) : '');
  const [seconds, setSeconds] = useState(Number.isInteger(savedDuration) && savedDuration > 0 ? String(savedDuration % 60) : '');
  const timer = session.timer;
  const otherTimer = timer.status !== 'idle' && timer.stepId !== step.id;
  const ours = !otherTimer && timer.status !== 'idle';
  const remaining = ours ? timerRemaining(timer, now) : 0;
  const elapsed = ours && timerFinished(timer, now);
  const total = Number(minutes || 0) * 60 + Number(seconds || 0);
  const validDuration = /^\d*$/.test(minutes) && /^\d*$/.test(seconds) && Number(seconds || 0) < 60 && total >= 1 && total <= 3600;
  const stopped = session.status !== 'active' || locked;
  const running = ours && timer.status === 'running' && !elapsed;
  const paused = ours && timer.status === 'paused' && !elapsed;
  return <section className={'stepTimer ' + (elapsed ? 'elapsed' : '')} aria-label="Minuteur de cette étape">
    <div className="timerTitle"><Timer /><div><b>{step.timer === 'lamp' ? 'Ton temps sous lampe' : 'Ton temps de séchage'}</b><small>Minuteur facultatif</small></div></div>
    <p>{step.timer === 'lamp' ? 'Renseigne la durée indiquée pour ce produit et ta lampe. Tu peux aussi utiliser directement le minuteur de ta lampe.' : 'Renseigne le temps indiqué pour cette couche ou cette finition. Le minuteur ne vérifie pas si le vernis est sec.'}</p>
    {otherTimer ? <div className="otherTimer"><p>Un minuteur est déjà associé à une autre étape.</p><button onClick={() => onAction({ type: 'go', index: session.steps.findIndex(value => value.id === timer.stepId) })}>Retrouver ce minuteur<ArrowRight /></button></div> : <>
      {ours && <div className="timerDisplay"><span role="timer" aria-label={'Temps restant : ' + formatCountdown(remaining)}>{formatCountdown(remaining)}</span><small role="status">{elapsed ? 'Temps écoulé · valide quand tu es prête' : paused ? 'Minuteur en pause' : 'Minuteur en cours'}</small></div>}
      {!running && !paused && <div className="timerInputs"><label>Minutes<input aria-label="Minutes du minuteur" type="number" inputMode="numeric" min="0" max="60" step="1" value={minutes} placeholder="0" disabled={stopped} onChange={event => setMinutes(event.target.value)} /></label><span>:</span><label>Secondes<input aria-label="Secondes du minuteur" type="number" inputMode="numeric" min="0" max="59" step="1" value={seconds} placeholder="00" disabled={stopped} onChange={event => setSeconds(event.target.value)} /></label></div>}
      <div className="timerActions">
        {running ? <button disabled={stopped} onClick={() => onAction({ type: 'timerPause' })}><Pause />Pause minuteur</button> : paused ? <button disabled={stopped} onClick={() => onAction({ type: 'timerResume' })}><Play />Reprendre le minuteur</button> : <button disabled={stopped || !validDuration} onClick={() => onAction({ type: 'timerStart', seconds: total })}><Play />{elapsed ? 'Relancer le minuteur' : 'Démarrer le minuteur'}</button>}
        {ours && <button disabled={stopped} onClick={() => onAction({ type: 'timerReset' })}><RotateCcw />Remettre à zéro</button>}
      </div>
      {!running && !paused && !validDuration && (minutes || seconds) && <p className="timerHelp">Choisis une durée entre 1 seconde et 60 minutes, avec moins de 60 dans le champ secondes.</p>}
    </>}
    <p className="timerFootnote">Tu peux le relancer à chaque couche ou ongle selon ta notice. La fin est signalée à l’écran, sans son. Si tu verrouilles l’écran, le temps écoulé sera retrouvé à ton retour.</p>
  </section>;
}

export default function TutorialView({ session, items, onAction, onOpenIdea, onCollection, onNew, onList, onJournal, journaled }) {
  const [planOpen, setPlanOpen] = useState(false);
  const heading = useRef(null);
  const now = useClock(session.timer.status === 'running');
  const step = session.steps[session.current];
  const earliest = firstIncomplete(session);
  const locked = session.current > earliest;
  const active = session.status === 'active';
  const outdated = ideaAvailability(session.idea, items).filter(row => row.state !== 'available');
  const progress = Math.round(session.completed.length / session.steps.length * 100);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); heading.current?.focus({ preventScroll: true }); }, [session.id, session.current, session.status]);
  const toolbar = <div className="detailToolbar"><button onClick={() => onOpenIdea(session.idea)}><ArrowLeft />L’inspiration</button><button onClick={onList}><ListChecks />Mes poses</button></div>;
  const collectionNotice = outdated.length > 0 && <div className="detailNotice" role="status"><b>Vérifie ta collection</b><p>{outdated.map(row => row.item.name).join(', ')} : fiche modifiée ou produit absent. Le tutoriel conserve la composition d’origine.</p><button className="detailSecondary" onClick={() => onCollection()}>Voir ma collection<ArrowRight /></button></div>;

  if (session.status === 'ready') return <div className="tutorialPage">{toolbar}<section className="tutorialHero"><small>TA POSE, PAS À PAS</small><h1 ref={heading} tabIndex={-1}>On prend le temps<br /><em>de créer ?</em></h1><p>{session.idea.title}</p><NailPreview idea={session.idea} /><div className="tutorialFacts"><span>{session.idea.palette.length} vernis</span><span>Deux mains</span><span>{session.steps.length} étapes</span></div></section>
    <section className="tutorialIntro"><h2>Par quelle main commencer ?</h2><div className="handChoices">{Object.entries(handLabels).map(([id, label]) => <button key={id} aria-pressed={session.firstHand === id} onClick={() => onAction({ type: 'hand', hand: id })}>{label}{session.firstHand === id && <Check />}</button>)}</div><p>Le guide suit tes couleurs et tes décors. Une seule touche par couleur ou étape suffit pour continuer. Le minuteur est facultatif.</p><p>La préparation, le nombre de couches et les temps d’application restent ceux des notices de tes produits.</p><div className="tutorialSaveHint"><CheckCircle2 /><span><StorageHint guest="Ta progression est conservée sur cet appareil. Tu peux faire une pause et reprendre plus tard." account="Ta progression est liée à ton compte. Tu peux faire une pause ; vérifie la synchronisation avant de changer d’appareil."/></span></div></section>{collectionNotice}
    <div className="tutorialStart"><button className="detailPrimary" onClick={() => onAction({ type: 'start' })}><Play />Commencer ma pose<ArrowRight /></button><small>≈ {session.idea.minutes} min pour la couleur et la décoration, hors préparation, dépose et séchage.</small></div>
  </div>;

  if (session.status === 'completed') return <div className="tutorialPage">{toolbar}<section className="tutorialHero tutorialSuccess"><CheckCircle2 /><small>À TON RYTHME, JUSQU’AU BOUT</small><h1 ref={heading} tabIndex={-1}>Ta pose est<br /><em>terminée</em></h1><p>{session.idea.title}</p><NailPreview idea={session.idea} /><span>{session.completionMode === 'unguided' ? 'Pose marquée comme faite · tutoriel passé' : session.steps.length + ' étapes validées · les deux mains'}</span></section><section className="tutorialIntro"><p>Garde une photo du résultat et tes impressions dans ton journal. Tu pourras le compléter à ton rythme.</p><button className="detailPrimary" onClick={onJournal}><BookHeart />{journaled ? 'Voir dans mon journal' : 'Ajouter au journal'}<ArrowRight /></button><button className="detailSecondary" onClick={() => onOpenIdea(session.idea)}>Revoir l’inspiration<ArrowRight /></button><button className="detailSecondary" onClick={() => onNew(session.idea)}><RotateCcw />Refaire cette pose</button><button className="detailSecondary" onClick={onList}><ListChecks />Mes poses</button></section></div>;

  return <div className="tutorialPage">{toolbar}<section className="tutorialProgress"><div><span>{session.completed.length} / {session.steps.length} étapes validées</span><button onClick={() => setPlanOpen(true)}>Voir les étapes<ListChecks /></button></div><progress max="100" value={progress} aria-label="Progression de la pose" /><small>{session.idea.title}</small></section>
    {session.status === 'paused' && <section className="tutorialPaused" role="status"><Pause /><div><b>Ta pose est en pause</b><p>Tout est conservé. Le minuteur reste en pause jusqu’à ce que tu le relances.</p></div><button onClick={() => onAction({ type: 'resume' })}><Play />Reprendre ma pose</button></section>}
    <section className="tutorialStep"><div className="tutorialStepHeading"><small>{step.section} · ÉTAPE {session.current + 1}</small><h1 ref={heading} tabIndex={-1}>{step.title}</h1>{session.completed.includes(step.id) && <span className="stepAlreadyDone"><Check />Étape validée</span>}</div>
      {step.targets.length > 0 && <div className="tutorialNails"><NailPreview idea={session.idea} highlightedIndices={step.targets} /><small>{step.hand ? handLabels[step.hand] + ' · ' : ''}Repère de la pose finale, du pouce à l’auriculaire</small></div>}
      <p className="stepBody">{step.body}</p>{step.hint && <p className="stepHint">{step.hint}</p>}
      {step.products.length > 0 && <div className="stepProducts">{step.products.map(item => <button key={item.id} onClick={() => onCollection(item.id)}>{item.type !== 'Matériel' && <i style={{ background: item.color }} />}<span>{item.name}</span><ChevronRight /></button>)}</div>}
      {locked && <p className="stepHint" role="status">Tu peux lire cette étape. Reviens à l’étape en cours pour continuer la pose.</p>}
      {step.targets.length > 0 && <p className="tutorialTargets"><b>Ongles concernés</b>{step.targets.map(index => fingers[index]).join(' · ')}</p>}
      {step.timer && <details key={step.id} className="tutorialTimerOptions" open={session.timer.stepId === step.id && session.timer.status !== 'idle'}><summary><Clock3 /><span>Minuteur facultatif</span><ChevronRight /></summary><StepTimer session={session} step={step} onAction={onAction} now={now} locked={locked} /></details>}
    </section>
    {collectionNotice}
    <div className="tutorialStepActions">{locked ? <button className="detailPrimary" onClick={() => onAction({ type: 'go', index: earliest })}><ArrowLeft />Revenir à l’étape en cours</button> : <><button className="detailPrimary" disabled={!canComplete(session, now)} onClick={() => onAction({ type: 'complete' })}><Check />{completionLabel(session)}<ArrowRight /></button>{active && !canComplete(session, now) && <p>Le minuteur tourne encore. Attends la fin ou mets-le en pause avant de valider.</p>}</>}
      <div>{session.current > 0 && <button onClick={() => onAction({ type: 'go', index: session.current - 1 })}><ArrowLeft />Étape précédente</button>}{active && <button onClick={() => onAction({ type: 'pause' })}><Pause />Mettre la pose en pause</button>}</div>
    </div>
    {planOpen && <Sheet title="Le fil de ta pose" eyebrow="À TON RYTHME" onClose={() => setPlanOpen(false)} className="tutorialPlan"><div>{session.steps.map((value, index) => <button key={value.id} aria-current={index === session.current ? 'step' : undefined} onClick={() => { onAction({ type: 'go', index }); setPlanOpen(false); }}><i>{session.completed.includes(value.id) ? <Check /> : index + 1}</i><span><small>{value.section}</small><b>{value.title}</b></span><ChevronRight /></button>)}</div></Sheet>}
  </div>;
}

export function TutorialsList({ sessions, onOpen, onCreate }) {
  return <div className="tutorialPage"><section className="detailHero"><small>À MON RYTHME</small><h1>Mes poses</h1><p>Reprends une pose ou retrouve celles que tu as terminées.</p></section>{sessions.length ? <div className="tutorialSessionList">{sessions.map(session => <button key={session.id} onClick={() => onOpen(session.id)}><span className={'sessionStatus ' + session.status}>{session.status === 'completed' ? <CheckCircle2 /> : <Play />}{statusLabels[session.status]}</span><b>{session.idea.title}</b><NailPreview idea={session.idea} compact /><small>{session.completionMode === 'unguided' ? 'Tutoriel passé' : session.completed.length + ' / ' + session.steps.length + ' étapes'} · {session.idea.palette.length} vernis</small><ChevronRight /></button>)}</div> : <section className="creationEmpty"><Sparkles /><h2>Ta première pose guidée</h2><p>Choisis une inspiration puis touche « Démarrer le tutoriel » sur sa fiche.</p><button onClick={onCreate}>Trouver une inspiration<ArrowRight /></button></section>}</div>;
}
