import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site-seo';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

/** El panel principal es privado: la portada de acceso no se indexa. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL ?? 'http://localhost:3000'),
  applicationName: SITE_NAME,
  title: { default: 'Acceso seguro | FinVigía', template: '%s | FinVigía' },
  description: SITE_DESCRIPTION,
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es-CO"><body className={inter.variable}>{children}</body></html>;
}
