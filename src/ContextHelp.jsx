import React, { useRef, useState } from 'react';
import { CircleHelp, Palette, Package, Lightbulb, Sparkles, Heart, Sticker, BookHeart, X } from 'lucide-react';
import Sheet from './Sheet';
import { guides, helpSeen, markHelpSeen, trackHelp } from './help';
import './help.css';

const icons = { palette: Palette, package: Package, lamp: Lightbulb, sparkles: Sparkles, heart: Heart, sticker: Sticker, book: BookHeart };
export default function ContextHelp({ screen, step }) {
  const guide = guides[screen];
  const [offer, setOffer] = useState(() => !helpSeen(screen));
  const [opened, setOpened] = useState(false);
  const [slide, setSlide] = useState(0);
  const source = useRef('button');
  const currentSlide = useRef(0);
  const touch = useRef(null);
  if (!guide) return null;
  const event = name => trackHelp(name, { screen, source: source.current, slide: currentSlide.current + 1, step });
  function open(origin) {
    source.current = origin; currentSlide.current = 0; setSlide(0); setOpened(true); setOffer(false); event('help_opened');
  }
  function finish(skipped = false) {
    markHelpSeen(screen); event(skipped ? 'help_skipped' : 'help_completed'); setOpened(false); setOffer(false);
  }
  function move(index) { const next = Math.max(0, Math.min(guide.slides.length - 1, index)); currentSlide.current = next; setSlide(next); }
  const [icon, title, copy] = guide.slides[slide];
  const Icon = icons[icon];
  return <div className="contextHelp">
    <button className="round" aria-label={'Aide : ' + guide.title} onClick={() => open('button')}><CircleHelp /></button>
    {offer && <aside className="helpOffer" aria-label={'Découvrir ' + guide.title}>
      <button onClick={() => open('first_visit')}>Découvrir {guide.title.toLocaleLowerCase('fr')} · {guide.slides.length} étapes</button>
      <button aria-label="Passer cette aide" onClick={() => { source.current = 'first_visit'; finish(true); }}><X /></button>
    </aside>}
    {opened && <Sheet title={guide.title} eyebrow="UN PETIT COUP DE POUCE" className="helpSheet" onClose={() => finish(true)}>
      <div className="helpSlide" aria-live="polite" onTouchStart={e => { touch.current = [e.touches[0].clientX, e.touches[0].clientY]; }} onTouchEnd={e => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current[0], dy = e.changedTouches[0].clientY - touch.current[1];
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(currentSlide.current + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}>
        <Icon aria-hidden="true" /><small>{slide + 1} / {guide.slides.length}</small><h3>{title}</h3><p>{copy}</p>
      </div>
      <div className="helpDots">{guide.slides.map((_, i) => <button key={i} aria-label={'Étape ' + (i + 1)} aria-current={i === slide ? 'step' : undefined} onClick={() => move(i)}><span /></button>)}</div>
      <div className="helpActions"><button onClick={() => finish(true)}>Passer</button>{slide > 0 && <button onClick={() => move(slide - 1)}>Précédent</button>}<button className="helpNext" onClick={() => slide === guide.slides.length - 1 ? finish() : move(slide + 1)}>{slide === guide.slides.length - 1 ? 'Terminer' : 'Suivant'}</button></div>
    </Sheet>}
  </div>;
}
