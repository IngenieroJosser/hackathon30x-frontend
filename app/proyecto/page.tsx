import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site-seo';
import styles from './proyecto.module.css';

const publicUrl = SITE_URL ? `${SITE_URL}/proyecto` : undefined;

export const metadata: Metadata = {
  title: 'Proyecto de investigación en seguridad financiera e IA',
  description: SITE_DESCRIPTION,
  keywords: [
    'FinVigía', 'seguridad financiera', 'decisiones financieras auditables',
    'autenticación multifactor', 'verificación bancaria sintética',
    'inteligencia artificial responsable', 'detección de prompt injection',
    'semillero de investigación', 'fraude financiero',
  ],
  alternates: publicUrl ? { canonical: publicUrl } : undefined,
  robots: { index: Boolean(publicUrl), follow: Boolean(publicUrl) },
  openGraph: {
    type: 'website', locale: 'es_CO', siteName: 'FinVigía',
    title: 'FinVigía | Seguridad y decisiones financieras auditables',
    description: SITE_DESCRIPTION, url: publicUrl,
    images: [{ url: '/seo/finvigia-open-graph.png', width: 1200, height: 630, alt: 'FinVigía: seguridad y decisiones financieras con inteligencia y control' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinVigía | Seguridad financiera e IA responsable',
    description: SITE_DESCRIPTION,
    images: ['/seo/finvigia-open-graph.png'],
  },
};

export default function ProyectoPage() {
  const schema = publicUrl ? {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', name: 'FinVigía — Proyecto de investigación', url: publicUrl,
        inLanguage: 'es-CO', description: SITE_DESCRIPTION },
      { '@type': 'SoftwareApplication', name: 'FinVigía', url: publicUrl,
        applicationCategory: 'FinanceApplication', operatingSystem: 'Web',
        description: SITE_DESCRIPTION, image: `${SITE_URL}/seo/finvigia-open-graph.png` },
    ],
  } : null;
  return <main className={styles.page}>
    {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />}
    <header className={styles.header}>
      <Link href="/proyecto" className={styles.brand} aria-label="FinVigía, inicio del proyecto">
        <Image src="/brand/finvigia-simbolo.svg" width={44} height={44} alt="" />
        <span>Fin<span className={styles.accent}>Vigía</span></span>
      </Link>
      <Link className={styles.link} href="/">Acceso a la plataforma <span aria-hidden="true">↗</span></Link>
    </header>
    <section className={styles.hero}>
      <p className={styles.eyebrow}>PROYECTO ACADÉMICO · SEGURIDAD FINANCIERA E IA</p>
      <h1>Inteligencia financiera <em>con control.</em></h1>
      <p className={styles.lead}>FinVigía investiga cómo combinar autenticación multifactor, verificación bancaria sintética, políticas deterministas y detección de amenazas contra IA para construir decisiones financieras más seguras y auditables.</p>
      <div className={styles.pills}><span>MFA TOTP</span><span>Reglas financieras</span><span>Auditoría</span><span>Datos sintéticos</span></div>
    </section>
    <section className={styles.section} aria-labelledby="cap-title">
      <p className={styles.eyebrow}>CAPACIDADES DEL PROTOTIPO</p>
      <h2 id="cap-title">Seguridad verificable, no promesas.</h2>
      <div className={styles.grid}>
        <article><h3>Identidad y acceso</h3><p>MFA mediante códigos TOTP, sesiones controladas y autorización por roles de usuario.</p></article>
        <article><h3>Verificación de beneficiarios</h3><p>Simulación de comprobaciones bancarias con aprobación separada. No certifica cuentas reales.</p></article>
        <article><h3>Motor de decisiones</h3><p>Políticas configurables, aprobación humana y bloqueo de operaciones que incumplen controles.</p></article>
        <article><h3>Seguridad de IA</h3><p>Controles preventivos ante instrucciones adversariales; detector avanzado y evaluación experimental en desarrollo.</p></article>
      </div>
    </section>
    <section className={styles.note}><h2>Investigación con límites explícitos</h2><p>FinVigía es un prototipo académico. Utiliza datos sintéticos en las pruebas bancarias, no ejecuta transferencias de dinero y no reemplaza la validación efectuada por instituciones financieras autorizadas.</p></section>
    <footer className={styles.footer}><span>© FinVigía · Proyecto de investigación</span><span>Seguridad · Trazabilidad · IA responsable</span></footer>
  </main>;
}
