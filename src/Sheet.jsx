import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function Sheet({ title, eyebrow = 'MON NAILMOODS', children, onClose, className = '' }) {
  const panel = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current.querySelector('button')?.focus();
    const onKey = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = [...panel.current.querySelectorAll('button:not(:disabled), input, select, textarea, a[href]')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return <div className="overlay" onClick={onClose}>
    <section className={'productSheet ' + className} ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event => event.stopPropagation()}>
      <div className="grab" /><div className="sheetTitle"><div><small>{eyebrow}</small><h2 id={titleId}>{title}</h2></div><button aria-label="Fermer" onClick={onClose}><X /></button></div>
      {children}
    </section>
  </div>;
}
