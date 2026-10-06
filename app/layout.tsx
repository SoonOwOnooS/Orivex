import type { Metadata } from "next";
import "./globals.css";
import {LanguageProvider} from '../lib/i18n';
import {requestedLocale} from '../lib/locale-server';

export const metadata: Metadata = {
  title: "Orivex · Game Evidence Registry",
  description: "Record game announcements and release dates, compare ideas and promotional videos, and review verifiable evidence together.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await requestedLocale();
  return (
    <html lang={locale === 'en' ? 'en' : 'zh-CN'}>
      <body className="antialiased"><LanguageProvider initialLocale={locale}>{children}</LanguageProvider></body>
    </html>
  );
}
