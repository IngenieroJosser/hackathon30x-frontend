'use client';
import { useEffect } from 'react';
import type { Invoice } from '@/types/payments';
import { money, shortDate } from '@/lib/format';
import { Icon } from '@/components/ui/icon';
import { StatusPill } from '@/components/ui/status-pill';
import { DEMO_POLICY } from '@/lib/mock-data';

export function InvoiceDetail({ invoice, onClose, onApprove, onReject }: {
  invoice: Invoice | null;
  onClose: () => void;
  onApprove: (id:string) => void;
  onReject: (id:string) => void;
}) {
  useEffect(()=>{
    if(!invoice) return;
    const onKeyDown = (event:KeyboardEvent) => { if(event.key==='Escape') onClose(); };
    document.addEventListener('keydown',onKeyDown);
    return ()=>document.removeEventListener('keydown',onKeyDown);
  },[invoice,onClose]);
  if (!invoice) return null;
  const isPending = invoice.status === 'pending';
  return <div className="drawer-overlay" role="presentation" onMouseDown={(event)=>{ if(event.target===event.currentTarget) onClose(); }}>
    <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="drawer-top"><span className="drawer-overline"><Icon name="receipt" size={17}/> DETALLE DE FACTURA</span><button type="button" className="icon-button" aria-label="Cerrar detalle" onClick={onClose}><Icon name="close" size={20}/></button></div>
      <div className="drawer-body">
        <div className="drawer-title-group"><h2 id="detail-title">{invoice.number}</h2><StatusPill status={invoice.status}/></div>
        <p className="drawer-lead">Resultado de evaluación · Entorno de simulación</p>
        <div className="detail-total"><span>Importe de la factura</span><strong>{money(invoice.amount)}</strong><small>No se ha realizado ninguna transferencia de dinero.</small></div>
        <div className="detail-section"><h3>Información de la factura</h3><dl className="detail-data"><div><dt>Beneficiario</dt><dd>{invoice.vendor}</dd></div><div><dt>País</dt><dd>{invoice.country}</dd></div><div><dt>Vencimiento</dt><dd>{shortDate(invoice.dueDate)}</dd></div><div><dt>Origen</dt><dd>{invoice.source} simulado</dd></div><div><dt>Política aplicada</dt><dd>{DEMO_POLICY.version}</dd></div></dl></div>
        <div className="detail-section"><h3>Decisión y fundamento</h3><div className={`decision-explanation explanation-${invoice.status}`}><span className="explanation-icon"><Icon name={invoice.status==='authorized'?'check':invoice.status==='blocked'?'cross':'clock'} size={17}/></span><div><strong>{invoice.ruleCode.replaceAll('_',' ')}</strong><p>{invoice.reason}</p></div></div></div>
        <div className="detail-section"><h3>Controles verificados</h3><div className="audit-steps">{invoice.checks.map((check,index)=><div className="audit-step" key={`${check}-${index}`}><span className="audit-step-icon"><Icon name={check.toLowerCase().includes('pendiente')?'clock':'check'} size={14}/></span><span>{check}</span></div>)}</div></div>
        <div className="detail-section"><h3>Registro de auditoría</h3><div className="audit-event"><div className="audit-event-dot"/><div><strong>Decisión registrada</strong><p>Regla: {invoice.ruleCode} · {invoice.receivedAt}</p><small>Fuente: dataset ficticio · Política {DEMO_POLICY.version}</small>{invoice.reviewedBy&&<small> · Revisado por {invoice.reviewedBy}</small>}</div></div></div>
      </div>
      <div className="drawer-footer"><div className="drawer-note"><Icon name="shield" size={16}/> Las aprobaciones de esta vista son simuladas.</div>
        {isPending?<div className="drawer-actions"><button type="button" className="button button-secondary" onClick={()=>onReject(invoice.id)}><Icon name="cross" size={16}/> Rechazar</button><button type="button" className="button button-dark" onClick={()=>onApprove(invoice.id)}><Icon name="check" size={16}/> Aprobar en demo</button></div>:<button className="button button-secondary drawer-full-button" type="button" onClick={onClose}>Volver al panel <Icon name="arrow" size={16}/></button>}
      </div>
    </aside>
  </div>;
}
