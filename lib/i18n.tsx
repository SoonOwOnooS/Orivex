'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translate, type Locale } from './messages';

type Translator = (message: string, ...values: (string | number)[]) => string;
const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
} | null>(null);

// Share the current language with every screen without clearing form inputs.
export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    document.title = locale === 'en' ? 'Orivex · Game Creator Archives' : 'Orivex · 游戏创作档案';
  }, [locale]);
  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        // Remember the language for later visits and server error messages.
        document.cookie = `orivex-locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
        document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
        updateLocale(next);
      },
      t: (message: string, ...values: (string | number)[]) => translate(message, locale, ...values),
    }),
    [locale],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Components call this hook to get the language and translation function.
export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('LanguageProvider is required');
  }
  return context;
}

export function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div
      className="language-switch"
      role="group"
      aria-label={locale === 'en' ? 'Interface language' : '界面语言'}
    >
      <button
        type="button"
        lang="en"
        aria-pressed={locale === 'en'}
        onClick={() => setLocale('en')}
      >
        English
      </button>
      <button
        type="button"
        lang="zh-CN"
        aria-pressed={locale === 'zh'}
        onClick={() => setLocale('zh')}
      >
        中文
      </button>
    </div>
  );
}
