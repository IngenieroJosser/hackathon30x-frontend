import type { Metadata } from 'next';
import { NotFoundExperience } from '@/components/errors/not-found-experience';

export const metadata: Metadata = {
  title: 'Página no encontrada (404)',
  description:
    'No encontramos esta dirección de FinVigía. Vuelve al centro de decisiones o continúa a uno de los módulos disponibles.',
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
      noimageindex: true,
      nosnippet: true,
    },
  },
};

/**
 * Global unmatched-route boundary. This is intentionally a Server Component:
 * no clocks, browser globals, random IDs, or stateful authorization logic.
 * Next.js supplies the 404 status for unmatched routes.
 */
export default function NotFound() {
  return <NotFoundExperience />;
}
