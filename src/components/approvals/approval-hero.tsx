'use client';
import Link from 'next/link';

import { Icon } from '@/components/ui/icon';

export function ApprovalHero({ pending, eligible, onExplore }: {
  pending: number; eligible: number; onExplore: () => void;
}) {
  return <section className="ap-hero" aria-labelledby="ap-hero-title">
    <video className="ap-hero-video" autoPlay loop muted playsInline preload="metadata" poster="/metal-human.jpg" aria-hidden="true">
      <source src="/metal-human.mp4" type="video/mp4" />
    </video>
    <div className="ap-hero-veil"/><div className="ap-hero-orbits" aria-hidden="true"/><div className="ap-hero-grain" aria-hidden="true"/>
    <div className="ap-hero-content">
      <nav className="ap-crumb" aria-label="Ruta de navegación"><Link href="/">WORKSPACE</Link><Icon name="chevron" size={12}/><span>APROBACIONES</span></nav>
      <div className="ap-hero-tag"><span className="ap-live-dot"/> 05 / HUMAN OVERSIGHT <i/> AUTORIZACIÓN CONTROLADA</div>
      <h1 id="ap-hero-title">La autonomía<br/>tiene un <em>límite.</em><br/><span>El criterio, una persona.</span></h1>
      <p>Cuando una decisión supera la autoridad del agente, entra en juego el juicio humano. Sin atajos, sin excepciones invisibles.</p>
      <div className="ap-hero-buttons">
        <button type="button" className="ap-primary" onClick={onExplore}>Abrir bandeja de revisión <Icon name="arrow" size={17}/></button>
        <Link className="ap-ghost" href="/politicas">Consultar políticas <Icon name="arrowUp" size={15}/></Link>
      </div>
    </div>
    <div className="ap-hero-callout" aria-label="Solicitudes pendientes">
      <span>HUMAN CONTROL / ACTIVE</span><div><strong>{String(pending).padStart(2,'0')}</strong><span>solicitudes<br/>pendientes</span></div>
      <small><i/>{eligible} elegibles tras reevaluación</small>
    </div>
    <div className="ap-hero-footer"><span>FINVIGIA / DECISION INTELLIGENCE</span><span>HUMAN IN THE LOOP — SANDBOX</span></div>
  </section>;
}
