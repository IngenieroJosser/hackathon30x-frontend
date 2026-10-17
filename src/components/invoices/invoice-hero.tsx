import {Icon} from '@/components/ui/icon';

export function InvoiceHero({onImport,mode='list'}:{onImport?:()=>void;mode?:'list'|'detail'}){
  return <section className={`iv-hero iv-hero-${mode}`} aria-label="Introducción a procesamiento documental">
    <video className="iv-hero-video" src="/metal-human.mp4" poster="/metal-human.jpg" autoPlay muted loop playsInline preload="metadata" aria-hidden="true"/>
    <div className="iv-hero-shade"/><div className="iv-hero-grain"/><div className="iv-hero-orbit iv-hero-orbit-a"/><div className="iv-hero-orbit iv-hero-orbit-b"/>
    <div className="iv-hero-inner">
      <div className="iv-hero-label"><span className="iv-live-dot"/> INTELLIGENT PAYABLES <span className="iv-slash">/</span> DOCUMENT STUDIO 004</div>
      <h1>De un documento.<br/><em>A una decisión.</em></h1>
      <p>Recibe cada factura, interpreta sus datos, contrástalos con los acuerdos y deja que las políticas decidan. Tú conservas el control.</p>
      <div className="iv-hero-actions">
        {onImport?<button className="iv-button iv-button-primary" type="button" onClick={onImport}><Icon name="plus" size={17}/> Nueva factura <Icon name="arrowUp" size={15}/></button>:<a className="iv-button iv-button-primary" href="/facturas"><Icon name="arrow" size={16}/> Volver al centro de facturas</a>}
        <a className="iv-button iv-button-ghost" href="/politicas"><Icon name="shield" size={16}/> Ver políticas</a>
      </div>
      <div className="iv-hero-foot"><span>01 / CAPTURE</span><i/><span>02 / EXTRACT</span><i/><span>03 / VERIFY</span><i/><span>04 / DECIDE</span></div>
    </div>
    <div className="iv-hero-tag"><Icon name="bolt" size={16}/><span><strong>AGENT CORE</strong><small>Controlado por políticas · Sandbox</small></span><span className="iv-tag-pulse"/></div>
    <div className="iv-bottom-line">BLINKA INTELLIGENCE <span>NO REAL MONEY MOVEMENT · SANDBOX</span></div>
  </section>;
}
