import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, Palette, Package, Lightbulb, Sparkles, Heart, Sticker, BookHeart, X, ArrowRight } from 'lucide-react';
import { guides, helpSeen, markHelpSeen, trackHelp } from './help';
import './help.css';

const icons = { palette: Palette, package: Package, lamp: Lightbulb, sparkles: Sparkles, heart: Heart, sticker: Sticker, book: BookHeart };
const actions = { home: ['Ajouter mes produits', 'collection'], profile: ['Explorer mes couleurs', 'collection'], collection: ['Créer avec mes couleurs', 'create'], equipment: ['Créer avec mon matériel', 'create'], generator: ['Voir mon matériel', 'equipment'], moodboard: ['Créer une autre idée', 'create'], journal: ['Voir mes inspirations', 'favorites'] };
export default function ContextHelp({ screen, step, onNavigate }) {
  const guide = guides[screen];
  const [offer, setOffer] = useState(() => !helpSeen(screen));
  const [opened, setOpened] = useState(false);
  const [slide, setSlide] = useState(0);
  const [slot, setSlot] = useState(null);
  const source = useRef('button'), currentSlide = useRef(0), touch = useRef(null), trigger = useRef(null), heading = useRef(null);
  useEffect(() => { setSlot(document.getElementById('context-help-slot')); }, []);
  useEffect(() => {
    if (!opened) return;
    heading.current?.focus({ preventScroll: true });
    const escape = e => { if (e.key === 'Escape') finish(true); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [opened]);
  if (!guide) return null;
  const event = name => trackHelp(name, { screen, source: source.current, slide: currentSlide.current + 1, step });
  function open(origin) {
    source.current = origin; currentSlide.current = 0; setSlide(0); setOpened(true); setOffer(false); event('help_opened');
    slot?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function finish(skipped = false) {
    markHelpSeen(screen); event(skipped ? 'help_skipped' : 'help_completed'); setOpened(false); setOffer(false); trigger.current?.focus({ preventScroll: true });
  }
  function move(index) { const next = Math.max(0, Math.min(guide.slides.length - 1, index)); currentSlide.current = next; setSlide(next); }
  const [icon, title, copy] = guide.slides[slide];
  const Icon = icons[icon];
  return <div className="contextHelp">
    <button ref={trigger} className="round" aria-label={'Aide : ' + guide.title} aria-expanded={opened} aria-controls={opened ? 'context-coach' : undefined} onClick={() => opened ? finish(true) : open('button')}><CircleHelp /></button>
    {slot && createPortal(<>
      {offer && !opened && <aside className="coachInvite" aria-label={'Découvrir ' + guide.title}><button onClick={() => open('first_visit')}><span className="coachDot" /><span>Découvrir {guide.title.toLocaleLowerCase('fr')}<small>{guide.slides.length} étapes · à ton rythme</small></span><ArrowRight /></button><button aria-label="Passer cette aide" onClick={() => { source.current = 'first_visit'; finish(true); }}><X /></button></aside>}
      {opened && <section id="context-coach" className="contextCoach" aria-label={'Aide : ' + guide.title}>
        <div className="coachTop"><span>{guide.title}</span><span>{slide + 1} / {guide.slides.length}</span><button aria-label="Fermer cette aide" onClick={() => finish(true)}><X /></button></div>
        <div className="coachSlide" onTouchStart={e => { touch.current = [e.touches[0].clientX, e.touches[0].clientY]; }} onTouchEnd={e => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current[0], dy = e.changedTouches[0].clientY - touch.current[1];
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(currentSlide.current + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}><div className="coachIllustration" aria-hidden="true"><Icon strokeWidth={1.3} /><i /><i /></div><div aria-live="polite"><h2 ref={heading} tabIndex={-1}>{title}</h2><p>{copy}</p></div></div>
        <div className="coachActions"><button onClick={() => finish(true)}>Passer</button>{slide > 0 && <button onClick={() => move(slide - 1)}>Précédent</button>}<button className="coachNext" onClick={() => slide === guide.slides.length - 1 ? finish() : move(slide + 1)}>{slide === guide.slides.length - 1 ? 'Terminer' : 'Suivant'}<ArrowRight /></button></div>
        {slide === guide.slides.length - 1 && actions[screen] && onNavigate && <button className="coachLink" onClick={() => { finish(); onNavigate(actions[screen][1]); }}>{actions[screen][0]}<ArrowRight /></button>}
      </section>}
    </>, slot)}
  </div>;
}
