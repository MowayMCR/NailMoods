import useLocale from './useLocale.js';
import {t} from './locale.js';

// Keep the production experience French until every essential journey is reviewed.
export default function useTranslation() {
  const selected = useLocale();
  const locale = import.meta.env.VITE_I18N_BETA_ENABLED === 'true' ? selected : 'fr';
  return {locale, t: (key, values) => t(key, locale, values)};
}
