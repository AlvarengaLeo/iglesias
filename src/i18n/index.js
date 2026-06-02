// i18n mínimo y sin librería. Bilingüe es/en según churches.locale.
// Uso: const t = useT(); t('nav.teams'); t('notif.chat_message', { channel: 'Alabanza' });
import { useChurch } from '../hooks/useChurch.js';
import { es } from './es.js';
import { en } from './en.js';

const CATALOGS = { es, en };

export function translate(locale, key, vars) {
  const cat = CATALOGS[locale] || CATALOGS.es;
  let str = cat[key];
  if (str == null) str = CATALOGS.es[key];   // fallback es
  if (str == null) str = key;                 // último recurso: la propia clave
  if (vars) {
    for (const k of Object.keys(vars)) {
      str = str.split(`{${k}}`).join(String(vars[k]));
    }
  }
  return str;
}

// Hook reactivo: re-renderiza al cambiar de iglesia/locale.
export function useT() {
  const { church } = useChurch();
  const locale = church?.locale === 'en' ? 'en' : 'es';
  return (key, vars) => translate(locale, key, vars);
}
