import type { Invoice } from '@/types/payments';
import { Icon } from '@/components/ui/icon';

export function DecisionChart({invoices}:{invoices:Invoice[]}) {
  const counts = ['2026-10-11','2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17'].map(date=>{
    const day = invoices.filter(x=>x.receivedAt===date);
    return {day:Number(date.slice(-2)),authorized:day.filter(x=>x.status==='authorized').length,blocked:day.filter(x=>x.status==='blocked').length,pending:day.filter(x=>x.status==='pending').length};
  });
  const max = Math.max(3,...counts.map(x=>x.authorized+x.blocked+x.pending));
  return <section className="card decision-chart-card"><div className="card-heading"><div><h2>Actividad de decisiones</h2><p>Facturas evaluadas por día</p></div><span className="subtle-badge"><Icon name="calendar" size={14}/> Últimos 7 días</span></div>
    <div className="chart-legend"><span><i className="legend-authorized"/>Autorizadas</span><span><i className="legend-pending"/>Por aprobar</span><span><i className="legend-blocked"/>Bloqueadas</span></div>
    <div className="chart-area"><div className="chart-scale"><span>{max}</span><span>{Math.round(max/2)}</span><span>0</span></div><div className="bar-chart"><div className="chart-line line-top"/><div className="chart-line line-middle"/><div className="chart-line line-bottom"/>{counts.map(item=><div key={item.day} className="chart-column"><div className="bar-stack" title={`${item.day} oct: ${item.authorized} autorizadas, ${item.pending} pendientes, ${item.blocked} bloqueadas`}><span style={{height:`${(item.authorized/max)*100}%`}} className="bar-authorized"/><span style={{height:`${(item.pending/max)*100}%`}} className="bar-pending"/><span style={{height:`${(item.blocked/max)*100}%`}} className="bar-blocked"/></div><span className="day-label">{item.day} oct</span></div>)}</div></div>
    <p className="chart-note"><Icon name="info" size={14}/> Datos de prueba agrupados por fecha de recepción.</p>
  </section>;
}
