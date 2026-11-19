import React from 'react';
import useLocale from './useLocale.js';
import { LOCALES, setLocale, t } from './locale.js';

// Preview-only until all user journeys, legal texts and store metadata are translated.
export default function LanguageSelector() {
  const locale = useLocale();
  return <section className="card profileAccountCard nmLanguagePreview">
    <label className="nmField">
      {t('settings.language', locale)}
      <select value={locale} onChange={event => setLocale(event.target.value)}>
        {LOCALES.map(({ code, nativeName }) => <option key={code} value={code}>{nativeName}</option>)}
      </select>
    </label>
    <p className="nmCaption">{t('settings.language.note', locale)}</p>
    <p className="nmCaption">{t('settings.language.local', locale)}</p>
  </section>;
}
