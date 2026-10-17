'use client';
import { useState, type RefObject } from 'react';
import type { Invoice, DecisionFilter } from '@/types/payments';
import { shortDate, money } from '@/lib/format';
import { Icon } from '@/components/ui/icon';
import { StatusPill } from '@/components/ui/status-pill';

const filters: { id:DecisionFilter; label:string }[] = [
  { id:'all',label:'Todas' },{id:'authorized',label:'Autorizadas'},{id:'pending',label:'Por aprobar'},{id:'blocked',label:'Bloqueadas'},
];
export function RecentInvoices({invoices,filter,onFilterChange,onSelect,tableRef,searchRef}:{
  invoices:Invoice[];filter:DecisionFilter;onFilterChange:(filter:DecisionFilter)=>void;onSelect:(invoice:Invoice)=>void;tableRef:RefObject<HTMLElement|null>;searchRef:RefObject<HTMLInputElement|null>
}) {
  const [query,setQuery] = useState('');
  const filtered = invoices.filter((invoice)=>(filter==='all'||invoice.status===filter)&&`${invoice.number} ${invoice.vendor} ${invoice.category} ${invoice.country}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section ref={tableRef} className="card invoice-table-section" id="facturas"><div className="table-heading"><div><h2>Facturas recientes</h2><p>Consulta las decisiones y el motivo detrás de cada una.</p></div><div className="table-count"><span className="table-count-dot"/>{invoices.length} registros de prueba</div></div>
    <div className="table-toolbar"><div role="group" aria-label="Filtrar facturas por decisión" className="filter-tabs">{filters.map(tab=><button key={tab.id} type="button" aria-pressed={filter===tab.id} onClick={()=>onFilterChange(tab.id)} className={`filter-tab ${filter===tab.id?'filter-tab-active':''}`}>{tab.label}</button>)}</div><label className="invoice-search"><Icon name="search" size={17}/><span className="sr-only">Buscar facturas</span><input ref={searchRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar factura o proveedor…"/></label></div>
    <div className="table-overflow"><table className="invoice-table"><thead><tr><th>FACTURA / PROVEEDOR</th><th>IMPORTE</th><th>VENCIMIENTO</th><th>DECISIÓN</th><th aria-label="Ver detalle"/></tr></thead><tbody>{filtered.map(invoice=><tr key={invoice.id}><td><button className="invoice-identity" type="button" onClick={()=>onSelect(invoice)}><span className={`vendor-avatar vendor-${invoice.vendorInitials.toLowerCase().slice(0,1)}`}>{invoice.vendorInitials}</span><span><strong>{invoice.vendor}</strong><small>{invoice.number} · {invoice.countryCode}</small></span></button></td><td><span className="amount-cell">{money(invoice.amount)}</span><small className="currency-cell">USD</small></td><td><span className="due-cell">{shortDate(invoice.dueDate)}</span></td><td><StatusPill status={invoice.status}/></td><td><button type="button" onClick={()=>onSelect(invoice)} className="row-more" aria-label={`Ver decisión de ${invoice.number}`}><Icon name="chevron" size={18}/></button></td></tr>)}</tbody></table>{filtered.length===0&&<div className="empty-table"><Icon name="search" size={25}/><strong>Sin resultados</strong><p>No encontramos facturas que coincidan con la búsqueda o el filtro.</p><button type="button" className="button button-secondary" onClick={()=>{setQuery('');onFilterChange('all');}}>Limpiar filtros</button></div>}</div>
    <div className="table-footer"><span>Mostrando {filtered.length} de {invoices.length} facturas</span><span><Icon name="shield" size={14}/> Cada registro incluye una explicación auditable.</span></div>
  </section>;
}
