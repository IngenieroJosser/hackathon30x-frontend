import type { NextConfig } from "next";

const production = process.env.NODE_ENV === 'production';
// CSP de compatibilidad con caché y streaming de Next.js. No es estricta por
// el uso de scripts inline de hidratación; migrar a nonce/hash en fase posterior.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  ...(production ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: [
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
      {key:'Cross-Origin-Resource-Policy',value:'same-origin'},
      {key:'Content-Security-Policy',value:contentSecurityPolicy},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=()'},
      ...(production ? [{key:'Strict-Transport-Security',value:'max-age=31536000'}] : []),
    ]}];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
