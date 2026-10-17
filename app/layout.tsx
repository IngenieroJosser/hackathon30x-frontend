import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

/** One font for the entire app. next/font self-hosts its output at build time. */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Centro de decisiones | Blinka',
  description: 'Agente de cuentas por pagar con políticas configurables, aprobación humana y trazabilidad. Prototipo con datos sintéticos.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body className={inter.variable}>{children}</body></html>;
}
