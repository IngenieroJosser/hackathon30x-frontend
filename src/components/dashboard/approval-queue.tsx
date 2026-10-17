import type { Invoice } from '@/types/payments';
import { Icon } from '@/components/ui/icon';
import { money, shortDate } from '@/lib/format';

export function ApprovalQueue({invoices,onSelect,onViewAll}:{invoices:Invoice[];onSelect:(invoice:Invoice)=>void;onViewAll:()=>void}) {
  const pending = invoices.filter(item=>item.status==='pending');
  return <section className="card approval-card" id="aprobaciones" aria-labelledby="approval-title">
    <div className="approval-top"><div className="approval-title-block"><span className="queue-alert-icon"><Icon name="clock" size={18}/></span><div><h2 id="approval-title">Requieren tu atención</h2><p>Solicitudes de aprobación humana</p></div></div><span className="pending-counter">{pending.length}</span></div>
    <div className="approval-list">{pending.slice(0,3).map(invoice=><button type="button" key={invoice.id} className="approval-item" onClick={()=>onSelect(invoice)}>
      <span className="approval-vendor-avatar">{invoice.vendorInitials}</span><span className="approval-item-details"><strong>{invoice.vendor}</strong><small>{invoice.number} · Vence {shortDate(invoice.dueDate)}</small></span><span className="approval-item-amount"><strong>{money(invoice.amount)}</strong><small>USD <Icon name="chevron" size={12}/></small></span>
    </button>)}{pending.length===0&&<div className="approval-empty"><Icon name="check" size={22}/><strong>Todo al día</strong><span>No hay aprobaciones pendientes.</span></div>}</div>
    <button type="button" className="approval-footer-button" onClick={onViewAll}>Ver todas las aprobaciones <Icon name="arrow" size={16}/></button>
  </section>;
}
