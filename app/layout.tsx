import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../lib/i18n';
import { requestedLocale } from '../lib/locale-server';

export const metadata: Metadata = {
  title: 'Orivex · Game Creator Archives',
  description:
    'Discover game creators through their stories, public source timelines, fan works, and links to support their games.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

// Set the page language before the browser loads the app.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await requestedLocale();
  return (
    <html lang={locale === 'en' ? 'en' : 'zh-CN'}>
      <body className="antialiased">
        <LanguageProvider initialLocale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
