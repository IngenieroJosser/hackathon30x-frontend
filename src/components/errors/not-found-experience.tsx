import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

const destinations = [
  {
    href: '/facturas',
    index: '01',
    label: 'Procesar facturas',
    detail: 'Revisar documentos y decisiones',
    icon: 'file',
  },
  {
    href: '/aprobaciones',
    index: '02',
    label: 'Supervisión humana',
    detail: 'Gestionar excepciones pendientes',
    icon: 'shield',
  },
  {
    href: '/auditoria',
    index: '03',
    label: 'Explorar auditoría',
    detail: 'Seguir el rastro de cada decisión',
    icon: 'audit',
  },
] as const;

/**
 * Presentation-only, shareable empty state.
 * Does not mount AppShell or read the current route: safe during prerender.
 * All exits are navigable even if JavaScript is disabled.
 */
export function NotFoundExperience() {
  return (
    <main className="nf" id="contenido-principal">
      <div className="nf-visual" aria-hidden="true">
        <div className="nf-visual-backdrop" />
        <video
          className="nf-video"
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          poster="/metal-human.jpg"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/metal-human.mp4" type="video/mp4" />
        </video>
        <div className="nf-image" />
        <div className="nf-video-mask" />
        <div className="nf-halo" />
        <div className="nf-grid" />
        <div className="nf-crosshair nf-crosshair-first" />
        <div className="nf-crosshair nf-crosshair-second" />
      </div>

      <header className="nf-header">
        <Link href="/" className="brand-logo nf-brand" aria-label="Blinka Decision Engine — volver al inicio">
          <span className="brand-mark" aria-hidden="true"><span /><span /></span>
          <span className="brand-wordmark">blinka<span className="brand-dot">.</span></span>
          <span className="brand-divider" />
          <span className="brand-product">DECISION ENGINE</span>
        </Link>
        <div className="nf-header-status" aria-label="Entorno de demostración, navegación interrumpida">
          <span className="nf-pulse" aria-hidden="true" />
          <span>ENTORNO DEMO</span>
          <span className="nf-separator" aria-hidden="true">/</span>
          <span>RUTA NO DISPONIBLE</span>
        </div>
      </header>

      <section className="nf-main" aria-labelledby="nf-heading">
        <div className="nf-copy">
          <div className="nf-eyebrow"><span className="nf-dash" />EXCEPTION / NAVIGATION_404 <span className="nf-eyebrow-id">{"// 001"}</span></div>
          <div className="nf-number" aria-label="Error 404">4<span>0</span>4<span className="nf-number-cursor" aria-hidden="true">_</span></div>
          <p className="nf-kicker">ERROR DE NAVEGACIÓN <span>—</span> 404</p>
          <h1 id="nf-heading">Esta ruta no existe.<br /><em>El control permanece.</em></h1>
          <p className="nf-description">
            No encontramos la dirección que buscas. Tu espacio de operaciones sigue disponible;
            vuelve al centro de decisiones o continúa desde uno de los módulos.
          </p>
          <div className="nf-actions">
            <Link href="/" className="nf-primary">
              Volver al dashboard
              <Icon name="arrowUp" size={18} aria-hidden="true" />
            </Link>
            <Link href="/facturas" className="nf-secondary">
              <span className="nf-secondary-icon"><Icon name="file" size={17} aria-hidden="true" /></span>
              Ir a facturas
              <Icon name="arrow" size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="nf-ambient-label" aria-hidden="true">
          <span>DECISION ENGINE</span>
          <span className="nf-ambient-line" />
          <span>404 / UNDEFINED ROUTE</span>
        </div>
      </section>

      <nav className="nf-destinations" aria-label="Accesos rápidos a los módulos">
        <div className="nf-destinations-lead">
          <span className="nf-small-label">CONTINUAR EXPLORANDO</span>
          <p>Tu siguiente movimiento.</p>
        </div>
        <div className="nf-destination-links">
          {destinations.map((destination) => (
            <Link href={destination.href} className="nf-destination" key={destination.href}>
              <span className="nf-destination-index">{destination.index}</span>
              <span className="nf-destination-icon"><Icon name={destination.icon} size={19} aria-hidden="true" /></span>
              <span className="nf-destination-content">
                <strong>{destination.label}</strong>
                <small>{destination.detail}</small>
              </span>
              <Icon name="arrowUp" className="nf-destination-arrow" size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </nav>

      <footer className="nf-footer">
        <span>BLINKA / AUTONOMOUS PAYABLES</span>
        <span className="nf-footer-middle">Diseñado para decisiones explicables.</span>
        <span>404 · SANDBOX / SIN PAGOS REALES</span>
      </footer>
    </main>
  );
}
