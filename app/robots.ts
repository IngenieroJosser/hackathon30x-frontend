import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-seo';

export default function robots(): MetadataRoute.Robots {
  if (!SITE_URL) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: [{
      userAgent: '*',
      allow: ['/proyecto', '/seo/', '/brand/', '/icons/'],
      disallow: ['/api/', '/facturas', '/beneficiarios', '/aprobaciones', '/auditoria', '/politicas'],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
