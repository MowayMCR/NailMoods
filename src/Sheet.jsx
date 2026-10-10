import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const dialogs = [];
const marker = 'nmDialog';
let originalOverflow = '', originalInert = false;
const controls = panel => [...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]')].filter(el => el.getClientRects().length);
function revealTop() {
  const top = dialogs.at(-1);
  dialogs.forEach(item => { item.host.hidden = item !== top && !top?.keepBehind; item.host.inert = item !== top; });
}
export default function Sheet({ title, eyebrow = 'MON NAILMOODS', children, onClose, className = '', keepBehind = false, scrollBody = false }) {
  const panel = useRef(null), host = useRef(null), close = useRef(onClose), titleId = useId();
  close.current = onClose;
  if (!host.current) { host.current = document.createElement('div'); host.current.className = 'app nmDialogHost'; }
  useEffect(() => {
    const previousFocus = document.activeElement, root = document.getElementById('root'), url = location.href;
    const theme = getComputedStyle(root?.querySelector('.app') || document.documentElement);
    for (const name of theme) if (name.startsWith('--')) host.current.style.setProperty(name, theme.getPropertyValue(name));
    host.current.dataset.mood=document.documentElement.dataset.mood||'soft-glam';
    document.body.appendChild(host.current);
    const id = titleId, item = { id, host: host.current, keepBehind };
    // Replacing a chooser with an editor keeps the same history level.
    const replacing = history.state?.[marker] && !dialogs.some(d => d.id === history.state[marker]);
    history[replacing ? 'replaceState' : 'pushState']({ ...history.state, [marker]: id }, '', url);
    if (!dialogs.length) { originalOverflow = document.body.style.overflow; originalInert = Boolean(root?.inert); }
    dialogs.push(item); revealTop();
    document.body.style.overflow = 'hidden'; if (root) root.inert = true;
    controls(panel.current)[0]?.focus();
    const onKey = event => {
      if (dialogs.at(-1) !== item) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const elements = controls(panel.current), first = elements[0], last = elements.at(-1);
      if (!elements.length) { event.preventDefault(); panel.current.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const onBack = event => { if (dialogs.at(-1) === item && event.state?.[marker] !== id) close.current(); };
    const onFocus = event => { if (dialogs.at(-1) === item && !panel.current.contains(event.target)) (controls(panel.current)[0] || panel.current).focus(); };
    document.addEventListener('keydown', onKey, true); document.addEventListener('focusin', onFocus); window.addEventListener('popstate', onBack);
    return () => {
      document.removeEventListener('keydown', onKey, true); document.removeEventListener('focusin', onFocus); window.removeEventListener('popstate', onBack);
      dialogs.splice(dialogs.indexOf(item), 1); host.current.remove(); revealTop();
      if (!dialogs.length) { document.body.style.overflow = originalOverflow; if (root) root.inert = originalInert; }
      queueMicrotask(() => {
        if (history.state?.[marker] === id && location.href === url) history.back();
        if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus();
        else if (dialogs.length) dialogs.at(-1).host.querySelector('button')?.focus();
      });
    };
  }, [titleId]);
  return createPortal(<div className="overlay" onClick={() => close.current()}><section className={'productSheet ' + className} ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event => event.stopPropagation()}><div className="grab" /><div className="sheetTitle"><div><small>{eyebrow}</small><h2 id={titleId}>{title}</h2></div><button aria-label="Fermer" onClick={() => close.current()}><X /></button></div>{scrollBody?<div className="nmAIScroll">{children}</div>:children}</section></div>, host.current);
}
