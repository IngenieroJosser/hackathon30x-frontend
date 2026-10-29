import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-seo';

/** Solo publicar páginas realmente públicas. Nunca exponer rutas financieras. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_URL) return [];
  return [{ url: `${SITE_URL}/proyecto`, changeFrequency: 'monthly', priority: 1 }];
}
