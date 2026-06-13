import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { I18nContext, type I18nContextValue } from './context';
import { messages, type Locale } from './messages';

const STORAGE_KEY = 'nazoauth.locale';

function resolveInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'en';
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'zh-CN') {
    return stored;
  }
  const language = window.navigator.language.toLowerCase();
  return language.startsWith('zh') ? 'zh-CN' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale());

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const translate: I18nContextValue['t'] = (key, replacements) => {
      let value: string = messages[locale][key] ?? messages.en[key] ?? key;
      if (!replacements) {
        return value;
      }
      Object.entries(replacements).forEach(([name, replacement]) => {
        value = value.replaceAll(`{${name}}`, String(replacement));
      });
      return value;
    };

    return {
      locale,
      setLocale,
      toggleLocale: () => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN'),
      t: translate,
    };
  }, [locale, setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
