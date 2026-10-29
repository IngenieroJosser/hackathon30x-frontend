import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinVigía — Inteligencia con control',
    short_name: 'FinVigía',
    description: 'Prototipo académico de seguridad y decisiones financieras auditables.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09231a',
    theme_color: '#09231a',
    lang: 'es-CO',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
