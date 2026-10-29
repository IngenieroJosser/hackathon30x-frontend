# FinVigía — Manual de marca y SEO técnico

## 1. Principio de indexación

El dashboard requiere inicio de sesión con MFA y NO debe aparecer en buscadores. Se creó `/proyecto`, una página pública que explica el prototipo académico y sus límites. Solo se publica en sitemap esta ruta.

Por seguridad, sin `NEXT_PUBLIC_SITE_URL` configurada la página pública también devuelve `noindex` y robots.txt deniega rastreo. **Configura la variable antes de pedir indexación.**

## 2. Variables de entorno

```.env
NEXT_PUBLIC_SITE_URL="https://TU-DOMINIO-REAL"
# GOOGLE_SITE_VERIFICATION="VALOR-SI-LO-USAS"
```

No incluyas barras de ruta finales ni entornos preview: usa el origen HTTPS definitivo. No metas secretos MFA en el repositorio.

## 3. Archivos SEO incorporados

- `app/layout.tsx`: metadatos base, `noindex` global para aplicación privada, iconos y manifest.
- `app/proyecto/page.tsx`: título, descripción, canonical, keywords, OG/Twitter, JSON-LD y contenido público con H1/H2/H3.
- `app/proyecto/proyecto.module.css`: diseño responsive público.
- `app/robots.ts`: acceso rastreo solo cuando hay dominio validado, bloquea rutas privadas.
- `app/sitemap.ts`: incluye solo `/proyecto` y únicamente con dominio configurado.
- `app/manifest.ts`: metadatos e iconos de instalación. No promete modo offline.
- `app/favicon.ico`, `app/icon.svg`, `app/apple-icon.png`: compatibilidad con navegadores y dispositivos.
- `public/icons/`: 192 y 512.
- `public/brand/`: logo vectorial y variaciones.
- `public/seo/finvigia-open-graph.png`: vista previa 1200×630 para redes.

## 4. SEO editorial

**Título recomendado:** FinVigía | Seguridad financiera e IA responsable

**Descripción recomendada:** FinVigía es un prototipo académico que investiga la seguridad de decisiones financieras mediante MFA, verificación bancaria sintética, reglas auditables y detección preventiva de amenazas.

**Intención de búsqueda:** proyecto de investigación en seguridad financiera, autenticación multifactor, auditoría, prevención de prompt injection y verificación bancaria sintética.

**H1 de la landing:** Inteligencia financiera con control.

NO afirmar que existe una validación bancaria real ni que la plataforma ejecuta transferencias. El detector avanzado continúa en desarrollo. No afirmar garantías de seguridad del 100%.

## 5. Publicación y comprobaciones

1. Copia el proyecto y conserva las claves existentes de MFA.
2. Configura `NEXT_PUBLIC_SITE_URL` con la URL HTTPS REAL en Vercel y en `.env.local` de desarrollo si necesitas comprobar la metadata indexable.
3. Ejecuta `yarn install --immutable`, `yarn test:rules`, `yarn typecheck`, `yarn lint`, `yarn build`.
4. Visita `/proyecto`, revisa título y `meta robots` para ver `index,follow` (solo si hay dominio).
5. Verifica `robots.txt` y `sitemap.xml`: nunca deben listar `/`, `/api`, `/facturas`, `/beneficiarios`, `/aprobaciones`, `/auditoria`, ni `/politicas`.
6. Comprueba el preview con herramientas de Open Graph y redes sociales sobre la URL pública definitiva.
7. Valida datos estructurados en Rich Results Test. El JSON-LD cumple Schema.org pero NO promete un resultado enriquecido; Google exige campos adicionales, entre ellos reseñas verificables, para el rich result de software. **No inventar valoraciones.**
8. Añade el dominio a Google Search Console, verifica propiedad y envía el sitemap; indexación no es instantánea ni garantizada.
9. Revisa que ningún token, cookie, sesión ni dato bancario aparezca en HTML público o recursos indexables.

## 6. Paleta e identidad

- Verde profundo: `#09231A`
- Verde lima: `#C6FF91`
- Verde secundario: `#19A27D`
- Blanco cálido: `#F1F8ED`
- Tipografía: Inter (servida por Next.js, sin subir fuentes manualmente).
- Símbolo: escudo + gráfico ascendente + trayectoria protectora.

## 7. Alcance legal de la marca

Los archivos son una propuesta original para FinVigía, no un registro de marca. Antes de registrar dominios o explotación comercial, comprobar denominaciones y marcas existentes ante SIC y en registros de dominios. No se presupone titularidad de `finvigia.co`.
