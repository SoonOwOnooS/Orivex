import { headers } from 'next/headers';
import type { Locale } from './messages';

// Prefer the saved language; otherwise use the browser's first language.
export async function requestedLocale(): Promise<Locale> {
  const h = await headers();
  const saved = h.get('cookie')?.match(/(?:^|;\s*)orivex-locale=(en|zh)(?:;|$)/)?.[1];
  if (saved === 'en' || saved === 'zh') {
    return saved;
  }
  const preferred = h.get('accept-language')?.split(',')[0].trim().toLowerCase();
  return preferred?.startsWith('zh') ? 'zh' : 'en';
}
