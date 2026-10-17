import { DEMO_POLICY } from '@/lib/mock-data';
import { money } from '@/lib/format';
import type { Invoice } from '@/types/payments';
import { Icon } from '@/components/ui/icon';
export function BudgetCard({invoices}:{invoices:Invoice[]}) {
  const used = invoices.filter(x=>x.status==='authorized').reduce((s,x)=>s+x.amount,0);
  const remaining = Math.max(0,DEMO_POLICY.monthlyBudget-used);
  const percentage = Math.min(100,used/DEMO_POLICY.monthlyBudget*100);
  return <section className="card budget-card"><div className="card-heading budget-heading"><div><h2>Control de presupuesto</h2><p>Octubre 2026 · USD</p></div><span className="budget-wallet"><Icon name="wallet" size={19}/></span></div><div className="budget-label">Disponible para autorizar</div><div className="budget-amount">{money(remaining)}</div><div className="budget-progress"><div style={{width:`${percentage}%`}}/></div><div className="budget-caption"><span><i className="budget-legend-dot"/> Comprometido {money(used)}</span><span>{Math.round(percentage)}%</span></div><div className="budget-separator"/><div className="budget-policy"><div><Icon name="shield" size={16}/><span>Políticas activas</span></div><strong>6 reglas</strong></div><div className="budget-policy"><div><Icon name="bolt" size={16}/><span>Autonomía por factura</span></div><strong>{money(DEMO_POLICY.autonomousLimit)}</strong></div><p className="budget-disclaimer">Presupuesto y autorizaciones exclusivamente simulados.</p></section>;
}
