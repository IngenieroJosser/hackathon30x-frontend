'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {AppShell} from '@/components/layout/app-shell';
import {Icon} from '@/components/ui/icon';
import {StatusPill} from '@/components/ui/status-pill';
import {money,shortDate} from '@/lib/format';
import {getInvoices,hasDemoBatch,INVOICE_UPDATED_EVENT,runDemoBatch} from '@/lib/invoice-registry';
import type {Invoice,DecisionStatus} from '@/types/payments';
import {InvoiceHero} from './invoice-hero';
import {InvoiceImport} from './invoice-import';
import {InvoiceSamples} from './invoice-samples';

type Filter='all'|DecisionStatus;
const filters:{value:Filter;label:string}[]=[{value:'all',label:'Todas'},{value:'unprocessed',label:'Sin evaluar'},{value:'authorized',label:'Autorizadas'},{value:'pending',label:'Por aprobar'},{value:'blocked',label:'Bloqueadas'}];

export function InvoicesPage(){
  const router=useRouter();
  const [items,setItems]=useState<Invoice[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [filter,setFilter]=useState<Filter>('all');
  const [query,setQuery]=useState('');
  const [notice,setNotice]=useState('');
  const [demoUsed,setDemoUsed]=useState(false);
  const searchRef=useRef<HTMLInputElement>(null);
  const importRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const refresh=()=>{setItems(getInvoices());setDemoUsed(hasDemoBatch());setLoaded(true);};
    refresh();window.addEventListener(INVOICE_UPDATED_EVENT,refresh);window.addEventListener('storage',refresh);
    return()=>{window.removeEventListener(INVOICE_UPDATED_EVENT,refresh);window.removeEventListener('storage',refresh);};
  },[]);
  const counts=useMemo(()=>({all:items.length,unprocessed:items.filter(x=>x.status==='unprocessed').length,authorized:items.filter(x=>x.status==='authorized').length,pending:items.filter(x=>x.status==='pending').length,blocked:items.filter(x=>x.status==='blocked').length}),[items]);
  const filtered=useMemo(()=>items.filter(x=>(filter==='all'||x.status===filter)&&`${x.number} ${x.vendor} ${x.country} ${x.ruleCode}`.toLowerCase().includes(query.toLowerCase().trim())),[filter,items,query]);
  const totalUSD=items.filter(x=>x.status==='authorized'&&x.currency==='USD').reduce((sum,x)=>sum+x.amount,0);
  const scrollImport=()=>importRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
  const onDemo=()=>{try{const result=runDemoBatch();setNotice(`${result.length} facturas sintéticas evaluadas con las políticas vigentes.`);}catch(err){setNotice(err instanceof Error?err.message:'No fue posible ejecutar el lote.');}};
  return <AppShell currentPage="invoices" alerts={counts.pending} onPendingClick={()=>router.push('/aprobaciones')} onSearchClick={()=>{document.getElementById('iv-records')?.scrollIntoView({behavior:'smooth'});searchRef.current?.focus();}}>
    <div className="iv-page"><InvoiceHero onImport={scrollImport}/>
      <div className="iv-container">
        <div className="iv-title-row"><div><span className="iv-kicker">01 / INTELLIGENT DOCUMENT OPERATIONS</span><h2>El ciclo de cada factura<span>.</span></h2><p>De la captura a la decisión, con evidencia en cada transición.</p></div><span className="iv-workspace-badge"><span/> DOCUMENT WORKSPACE · SANDBOX</span></div>
        <div className="iv-steps"><div><span>01</span><Icon name="file" size={17}/><strong>Recibir</strong><small>PDF / imagen / texto</small></div><div><span>02</span><Icon name="sparkles" size={17}/><strong>Interpretar</strong><small>Extracción estructurada</small></div><div><span>03</span><Icon name="eye" size={17}/><strong>Verificar</strong><small>Confirmación humana</small></div><div><span>04</span><Icon name="shield" size={17}/><strong>Evaluar</strong><small>Reglas y auditoría</small></div></div>
        <section className="iv-metrics" aria-label="Resumen de facturas"><div className="iv-metric iv-metric-bright"><span>DOCUMENTOS REGISTRADOS <Icon name="receipt" size={15}/></span><strong>{loaded?counts.all:'—'}</strong><small>Dataset de demostración</small></div><div className="iv-metric"><span>DECISIONES AUTORIZADAS <Icon name="check" size={15}/></span><strong>{loaded?counts.authorized:'—'}</strong><small>{money(totalUSD)} autorizados en simulación</small></div><div className="iv-metric iv-metric-warn"><span>REVISIÓN / APROBACIÓN <Icon name="clock" size={15}/></span><strong>{loaded?counts.pending+counts.unprocessed:'—'}</strong><small>Atención humana necesaria</small></div><div className="iv-metric iv-metric-red"><span>OPERACIONES BLOQUEADAS <Icon name="lock" size={15}/></span><strong>{loaded?counts.blocked:'—'}</strong><small>Restricciones o rechazos</small></div></section>
        <div className="iv-main-grid"><div ref={importRef} className="iv-import-anchor"><InvoiceImport onComplete={(id,count)=>{setNotice(`${count} documento(s) importado(s). Revisa los campos y confirma la evaluación.`);router.push(`/facturas/${encodeURIComponent(id)}`);}}/></div><aside className="iv-protocol"><div className="iv-protocol-top"><span className="iv-kicker">THE CONTROL PROTOCOL</span><Icon name="shield" size={20}/></div><div className="iv-protocol-art"><div className="iv-protocol-ring"/><Icon name="bolt" size={37}/></div><h2>La IA entiende.<br/><em>La política decide.</em></h2><p>La extracción nunca genera una autorización. Los importes, la moneda y el beneficiario se confirman antes de aplicar la política activa.</p><div className="iv-protocol-points"><span><Icon name="check" size={14}/> Prioridad a bloqueos</span><span><Icon name="check" size={14}/> Duplicados identificables</span><span><Icon name="check" size={14}/> Monedas sin FX: revisión</span></div><Link href="/politicas">Explorar controles <Icon name="arrowUp" size={15}/></Link></aside></div>
        <InvoiceSamples/>
        <section className="iv-records" id="iv-records"><div className="iv-records-top"><div><span className="iv-kicker">03 / EVIDENCE LEDGER</span><h2>Documentos y decisiones<span>.</span></h2><p>Una vista operativa para conocer su estado y abrir cada expediente.</p></div><button className="iv-button iv-button-outline" type="button" onClick={onDemo} disabled={demoUsed}><Icon name={demoUsed?'check':'play'} size={15}/>{demoUsed?'Lote demo procesado':'Procesar lote sintético'}</button></div>
          {notice&&<div className="iv-notice" role="status"><Icon name="info" size={15}/>{notice}<button type="button" aria-label="Cerrar aviso" onClick={()=>setNotice('')}><Icon name="close" size={14}/></button></div>}
          <div className="iv-record-tools"><label className="iv-search"><Icon name="search" size={17}/><input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} aria-label="Buscar facturas" placeholder="Buscar factura, empresa o regla…"/></label><span className="iv-total-label">{filtered.length} / {counts.all} registros</span></div>
          <div className="iv-filter-row">{filters.map(f=><button type="button" key={f.value} className={filter===f.value?'is-active':''} aria-pressed={filter===f.value} onClick={()=>setFilter(f.value)}>{f.label}<span>{counts[f.value]}</span></button>)}</div>
          <div className="iv-table-wrap"><table className="iv-table"><thead><tr><th>DOCUMENTO / BENEFICIARIO</th><th>IMPORTE</th><th>VENCIMIENTO</th><th>ORIGEN</th><th>RESULTADO</th><th aria-label="Acciones"/></tr></thead><tbody>{filtered.map(inv=><tr key={inv.id}><td><Link className="iv-invoice-title" href={`/facturas/${encodeURIComponent(inv.id)}`}><span className="iv-row-icon"><Icon name="file" size={18}/></span><span><strong>{inv.number}</strong><small>{inv.vendor}</small></span></Link></td><td><span className="iv-money">{inv.amount>0?money(inv.amount):'Por verificar'}</span><small className="iv-currency">{inv.currency}</small></td><td><span className="iv-date">{inv.dueDate?shortDate(inv.dueDate):'Pendiente'}</span></td><td><span className="iv-origin"><Icon name="receipt" size={14}/>{inv.source}</span></td><td><StatusPill status={inv.status}/></td><td><Link aria-label={`Abrir expediente de ${inv.number}`} className="iv-open" href={`/facturas/${encodeURIComponent(inv.id)}`}><Icon name="arrowUp" size={16}/></Link></td></tr>)}</tbody></table>{filtered.length===0&&<div className="iv-empty"><Icon name="search" size={26}/><strong>No encontramos documentos</strong><p>Ajusta los filtros o importa una factura ficticia.</p><button type="button" className="iv-button iv-button-outline" onClick={()=>{setQuery('');setFilter('all');}}>Limpiar búsqueda</button></div>}</div>
          <div className="iv-record-footer"><span>Datos de prueba · decisiones sin ejecución de dinero</span><span>POLICY-DRIVEN · READABLE AUDIT</span></div>
        </section><footer className="site-footer iv-footer"><span>© 2026 BLINKA DECISION ENGINE / DOCUMENT PROCESSING</span><span>ZYRA · SANDBOX · NO REAL PAYMENTS</span></footer>
      </div>
    </div>
  </AppShell>;
}
