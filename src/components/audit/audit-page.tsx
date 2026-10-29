'use client';
import Link from 'next/link';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Icon } from '@/components/ui/icon';
import { getInvoiceEvents, getInvoices, INVOICE_UPDATED_EVENT } from '@/lib/invoice-registry';
import { getDemoPolicy, getDemoPolicyHistory, POLICY_UPDATED_EVENT } from '@/lib/policy-store';
import { getRegistryEvents, REGISTRY_EVENT } from '@/lib/beneficiary-registry';
import { buildAuditTimeline, auditCoverage, searchAuditEntries, exportAuditPayload, type AuditEntry, type AuditCategory } from '@/lib/audit-timeline';
import { INITIAL_INVOICES, DEMO_POLICY } from '@/lib/mock-data';
import { money } from '@/lib/format';
import type { Invoice, PaymentPolicy } from '@/types/payments';
import type { InvoiceAuditEvent } from '@/types/invoice-workflow';
import type { PolicyHistoryEvent } from '@/lib/policy-store';
import type { RegistryEvent } from '@/lib/beneficiary-registry';

const categories:{value:AuditCategory|'all';label:string}[]=[
  {value:'all',label:'Todos los registros'},
  {value:'invoice',label:'Facturas y evaluaciones'},
  {value:'approval',label:'Aprobaciones humanas'},
  {value:'policy',label:'Versiones de políticas'},
  {value:'beneficiary',label:'Beneficiarios'},
  {value:'baseline',label:'Sin historial'},
];
const categoryLabels:Record<AuditCategory,string>={invoice:'EVALUACIÓN',approval:'HUMAN REVIEW',policy:'POLICY CHANGE',beneficiary:'TRUST REGISTRY',baseline:'SIN EVIDENCIA'};
const categoryIcons:Record<AuditCategory,'file'|'users'|'shield'|'wallet'|'alert'>={invoice:'file',approval:'users',policy:'shield',beneficiary:'wallet',baseline:'alert'};
const policyLabels:Record<string,string>={autonomousLimit:'Umbral autónomo',hardLimit:'Límite absoluto',monthlyBudget:'Presupuesto mensual'};

function dateLabel(value:string){
  const parsed=new Date(value);
  return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(parsed):'Fecha desconocida';
}
function timestampLabel(value:string){
  const parsed=new Date(value);
  return Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'}).format(parsed)+' UTC':'Fecha desconocida';
}
function download(blob:Blob,name:string){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
function csvCell(value:unknown){
  const raw=String(value??'').replace(/\r?\n/g,' ');
  // Excel/Sheets formula injection: valores controlados por una factura nunca deben ejecutar fórmulas.
  const safe=/^[\s]*[=+@\-\t\r]/.test(raw)?`'${raw}`:raw;
  return `"${safe.replace(/"/g,'""')}"`;
}
function exportCsv(entries:AuditEntry[]){
  const columns=['fecha_utc','categoria','accion','referencia','actor','codigo_regla','explicacion','evidencia'];
  const rows=entries.map(e=>[e.timestamp,e.category,e.action,e.reference,e.actor,e.ruleCode??'',e.description,e.evidence]);
  const content='\uFEFF'+[columns.join(','),...rows.map(r=>r.map(csvCell).join(','))].join('\r\n');
  download(new Blob([content],{type:'text/csv;charset=utf-8'}),'blinka-auditoria-sandbox.csv');
}

function AuditHero({events,unverified,onExplore}:{events:number;unverified:number;onExplore:()=>void}){
  return <section className="au-hero" aria-labelledby="au-hero-title">
    <video className="au-hero-video" autoPlay muted playsInline loop preload="metadata" poster="/metal-human.jpg" aria-hidden="true"><source src="/metal-human.mp4" type="video/mp4"/></video>
    <div className="au-hero-shade"/><div className="au-hero-mesh" aria-hidden="true"/><div className="au-hero-ring" aria-hidden="true"/>
    <div className="au-hero-inner">
      <nav className="au-breadcrumb" aria-label="Ruta de navegación"><Link href="/">WORKSPACE</Link><Icon name="chevron" size={12}/><span>AUDITORÍA</span></nav>
      <div className="au-overline"><span className="au-live"/> 06 / DECISION TRACEABILITY <i/> CONTROL Y EXPLICABILIDAD</div>
      <h1 id="au-hero-title">Nada se decide<br/><em>sin dejar una razón.</em></h1>
      <p>Explora las decisiones del agente, reconstruye los controles aplicados y descubre quién intervino, cuándo y bajo qué versión de política.</p>
      <div className="au-hero-ctas"><button className="au-button-primary" type="button" onClick={onExplore}>Explorar trazabilidad <Icon name="arrow" size={17}/></button><Link href="/facturas" className="au-button-plain">Ir al centro documental <Icon name="arrowUp" size={15}/></Link></div>
    </div>
    <div className="au-hero-diagnostic"><div className="au-diagnostic-top"><span>TRACE / SANDBOX</span><Icon name="audit" size={17}/></div><strong>{String(events).padStart(2,'0')}<small>EVENTOS</small></strong><div className="au-diagnostic-bottom"><span className="au-pulse"/> {unverified} expediente(s) de fixture sin historial</div></div>
    <div className="au-hero-bottom"><span>BLINKA / FINANCIAL DECISION INTELLIGENCE</span><span>LOCAL EVIDENCE — DEMO ONLY</span></div>
  </section>;
}

function AuditStat({label,value,note,icon,accent}:{label:string;value:string|number;note:string;icon:'audit'|'shield'|'users'|'alert';accent?:boolean}){
  return <div className={`au-stat ${accent?'au-stat-accent':''}`}><div className="au-stat-heading"><span>{label}</span><Icon name={icon} size={17}/></div><strong>{value}</strong><small>{note}</small></div>;
}

function EvidenceDetail({entry,activeVersion}:{entry:AuditEntry;activeVersion:string}){
  const inv=entry.invoice;
  return <div className="au-evidence-body" key={entry.id}>
    <div className="au-evidence-header"><span className={`au-tag au-tag-${entry.category}`}>{categoryLabels[entry.category]}</span><span className="au-evidence-reference">REF · {entry.reference}</span></div>
    <h3>{entry.title}</h3><p className="au-explanation">{entry.description}</p>
    {entry.evidence==='not-recorded'&&<div className="au-gap-warning"><Icon name="alert" size={18}/><div><strong>Historial previo no disponible</strong><p>Este fixture refleja un estado precargado; no hay eventos verificables de extracción, evaluación ni aprobación. No es correcto reconstruir decisiones que nunca se guardaron.</p></div></div>}
    <div className="au-fact-rows"><div><span>Momento registrado</span><strong>{timestampLabel(entry.timestamp)}</strong></div><div><span>Responsable</span><strong>{entry.actor}</strong></div><div><span>Origen</span><strong>{entry.evidence==='recorded'?'Evento local del navegador':'Estado inicial / fixture'}</strong></div><div><span>Acción</span><strong>{entry.action.toUpperCase()}</strong></div>{entry.ruleCode&&<div><span>Regla aplicada</span><strong className="au-mono">{entry.ruleCode}</strong></div>}</div>
    {entry.invoiceEvent&&<>
      <div className="au-detail-heading"><span>01</span><h4>Contexto evaluado</h4></div>
      <div className="au-fact-rows"><div><span>Política aplicada</span><strong>{entry.invoiceEvent.policySnapshot?.version??'Sin snapshot para este evento'}</strong></div>{entry.invoiceEvent.policySnapshot&&<><div><span>Umbral autónomo</span><strong>{money(entry.invoiceEvent.policySnapshot.autonomousLimit)}</strong></div><div><span>Límite absoluto</span><strong>{money(entry.invoiceEvent.policySnapshot.hardLimit)}</strong></div><div><span>Presupuesto definido</span><strong>{money(entry.invoiceEvent.policySnapshot.monthlyBudget)}</strong></div></>}{entry.invoiceEvent.beneficiarySnapshot&&<><div><span>Beneficiario en el momento</span><strong>{entry.invoiceEvent.beneficiarySnapshot.id} / rev. {entry.invoiceEvent.beneficiarySnapshot.revision}</strong></div><div><span>Estado del beneficiario</span><strong>{entry.invoiceEvent.beneficiarySnapshot.status}</strong></div><div><span>Tope de acuerdo</span><strong>{money(entry.invoiceEvent.beneficiarySnapshot.agreementLimit)}</strong></div></>}</div>
      {entry.invoiceEvent.reviewNote&&<div className="au-review-note"><span>JUSTIFICACIÓN HUMANA</span><p>“{entry.invoiceEvent.reviewNote}”</p></div>}
      {!entry.invoiceEvent.policySnapshot&&<p className="au-context-note"><Icon name="info" size={15}/> Este evento no conserva una copia de la política. No debe inferirse que utilizó la versión vigente ({activeVersion}).</p>}
    </>}
    {entry.policyEvent&&<><div className="au-detail-heading"><span>01</span><h4>Antes y después</h4></div><div className="au-policy-changes">{entry.policyEvent.changes.map(change=><div key={change.field}><span>{policyLabels[change.field]??change.field}</span><div><s>{money(change.previous)}</s><Icon name="arrow" size={15}/><strong>{money(change.next)}</strong></div></div>)}</div><p className="au-context-note"><Icon name="info" size={15}/> Los cambios se consultan desde el historial de políticas publicado en este navegador.</p></>}
    {entry.registryEvent&&<><div className="au-detail-heading"><span>01</span><h4>Control del beneficiario</h4></div><div className="au-fact-rows"><div><span>ID del registro</span><strong>{entry.registryEvent.beneficiaryId}</strong></div><div><span>Revisión</span><strong>r{entry.registryEvent.revision}</strong></div><div><span>Estado anterior</span><strong>{entry.registryEvent.previousStatus??'No informado'}</strong></div><div><span>Estado posterior</span><strong>{entry.registryEvent.nextStatus??'No informado'}</strong></div></div></>}
    {inv&&<><div className="au-detail-heading"><span>02</span><h4>Factura asociada</h4></div><div className="au-fact-rows"><div><span>Beneficiario</span><strong>{inv.vendor}</strong></div><div><span>Importe</span><strong>{inv.currency==='USD'?money(inv.amount):`${inv.amount.toLocaleString('en-US')} ${inv.currency}`}</strong></div><div><span>Estado actual</span><strong>{inv.status}</strong></div><div><span>Vence</span><strong>{inv.dueDate||'Sin fecha'}</strong></div></div><p className="au-context-note"><Icon name="info" size={15}/> Los datos de esta sección reflejan el expediente actual; el snapshot anterior, si existe, conserva el contexto de la decisión histórica.</p><Link className="au-detail-link" href={`/facturas/${encodeURIComponent(inv.id)}`}>Abrir expediente <Icon name="arrowUp" size={16}/></Link></>}
    <div className="au-evidence-disclaimer"><Icon name="lock" size={16}/><span>Entorno de simulación. Evidencia local editable; no existe firma digital ni almacenamiento inmutable.</span></div>
  </div>;
}

export function AuditPage(){
  const [invoices,setInvoices]=useState<Invoice[]>(INITIAL_INVOICES);
  const [invoiceEvents,setInvoiceEvents]=useState<InvoiceAuditEvent[]>([]);
  const [policyEvents,setPolicyEvents]=useState<PolicyHistoryEvent[]>([]);
  const [registryEvents,setRegistryEvents]=useState<RegistryEvent[]>([]);
  const [policy,setPolicy]=useState<PaymentPolicy>(DEMO_POLICY);
  const [category,setCategory]=useState<AuditCategory|'all'>('all');
  const [search,setSearch]=useState('');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [visibleCount,setVisibleCount]=useState(12);
  const timelineRef=useRef<HTMLDivElement>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  const inspectorRef=useRef<HTMLElement>(null);
  const reload=useCallback(()=>{
    setInvoices(getInvoices());setInvoiceEvents(getInvoiceEvents());setPolicyEvents(getDemoPolicyHistory());setRegistryEvents(getRegistryEvents());setPolicy(getDemoPolicy());
  },[]);
  useEffect(()=>{
    const frame=requestAnimationFrame(reload);
    window.addEventListener(INVOICE_UPDATED_EVENT,reload);
    window.addEventListener(POLICY_UPDATED_EVENT,reload);
    window.addEventListener(REGISTRY_EVENT,reload);
    window.addEventListener('storage',reload);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener(INVOICE_UPDATED_EVENT,reload);window.removeEventListener(POLICY_UPDATED_EVENT,reload);window.removeEventListener(REGISTRY_EVENT,reload);window.removeEventListener('storage',reload);};
  },[reload]);
  const entries=useMemo(()=>buildAuditTimeline(invoices,invoiceEvents,policyEvents,registryEvents),[invoices,invoiceEvents,policyEvents,registryEvents]);
  const coverage=useMemo(()=>auditCoverage(invoices,invoiceEvents),[invoices,invoiceEvents]);
  const filtered=useMemo(()=>searchAuditEntries(entries,search,category),[entries,search,category]);
  const shown=filtered.slice(0,visibleCount);
  const selected=filtered.find(entry=>entry.id===selectedId)??filtered[0]??null;
  const loggedCount=entries.filter(e=>e.evidence==='recorded').length;
  const reviewCount=entries.filter(e=>e.category==='approval'&&e.evidence==='recorded').length;
  const policyCount=entries.filter(e=>e.category==='policy').length;
  const pendingCount=invoices.filter(x=>x.status==='pending').length;
  const scrollTimeline=()=>timelineRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
  const onChangeCategory=(next:AuditCategory|'all')=>{setCategory(next);setSelectedId(null);setVisibleCount(12);};
  const onChangeSearch=(next:string)=>{setSearch(next);setSelectedId(null);setVisibleCount(12);};
  const onSelectEntry=(id:string)=>{setSelectedId(id);if(window.innerWidth<1000)inspectorRef.current?.scrollIntoView({behavior:'smooth',block:'start'});};
  const jsonExport=()=>{
    const payload=exportAuditPayload(filtered,coverage,policy.version);
    download(new Blob([JSON.stringify({...payload,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),'blinka-auditoria-sandbox.json');
  };
  return <AppShell currentPage="audit" alerts={pendingCount} onPendingClick={()=>window.location.assign('/aprobaciones')} onSearchClick={()=>{scrollTimeline();searchRef.current?.focus();}}>
    <div className="au-page">
      <AuditHero events={loggedCount} unverified={coverage.missing} onExplore={scrollTimeline}/>
      <div className="au-container">
        <div className="au-section-intro"><div><span className="au-eyebrow"><i/> 01 / DECISION OBSERVABILITY</span><h2>La historia detrás <em>de cada decisión.</em></h2><p>No basta con saber qué decidió el agente. Es indispensable poder explicar qué regla se aplicó, qué información se utilizó y qué persona intervino.</p></div><span className="au-demo-flag"><i/> SIMULACIÓN · NO HAY PAGOS REALES</span></div>
        <div className="au-stat-grid"><AuditStat label="EVENTOS REGISTRADOS" value={loggedCount} note="Cambios guardados en este navegador" icon="audit" accent/><AuditStat label="RESOLUCIONES HUMANAS" value={reviewCount} note="Aprobaciones y rechazos" icon="users"/><AuditStat label="VERSIONES PUBLICADAS" value={policyCount} note="Cambios explícitos de políticas" icon="shield"/><AuditStat label="COBERTURA DOCUMENTAL" value={`${coverage.percent}%`} note={`${coverage.covered} de ${coverage.total} con eventos`} icon="alert"/></div>
        <div className="au-quality-banner"><Icon name="info" size={20}/><div><strong>Transparencia de evidencia</strong><p>{coverage.missing>0?`${coverage.missing} facturas precargadas no conservan un historial de eventos. Se presentan como estados iniciales, no como decisiones verificadas.`:'Todos los expedientes actuales cuentan con al menos un evento local.'} El navegador no proporciona almacenamiento antifraude ni inmutabilidad.</p></div><Link href="/facturas">Procesar facturas <Icon name="arrowUp" size={15}/></Link></div>
        <section className="au-workspace" id="au-timeline" ref={timelineRef} aria-labelledby="au-workspace-heading">
          <div className="au-workspace-top"><div><span className="au-eyebrow">02 / EVENT STREAM</span><h2 id="au-workspace-heading">Bitácora de <em>decisiones.</em></h2><p>Eventos de facturación, aprobación, política y beneficiarios, reunidos por orden temporal.</p></div><div className="au-workspace-actions"><button type="button" onClick={()=>exportCsv(filtered)} className="au-export-plain"><Icon name="file" size={16}/> CSV</button><button type="button" onClick={jsonExport} className="au-export-main"><Icon name="download" size={16}/> Exportar JSON</button></div></div>
          <div className="au-tools"><div className="au-search"><Icon name="search" size={17}/><input ref={searchRef} aria-label="Buscar eventos de auditoría" value={search} onChange={e=>onChangeSearch(e.target.value)} placeholder="Buscar factura, proveedor, regla, actor…"/></div><div className="au-select-wrap"><Icon name="filter" size={16}/><select aria-label="Filtrar eventos" value={category} onChange={e=>onChangeCategory(e.target.value as AuditCategory|'all')}>{categories.map(c=><option value={c.value} key={c.value}>{c.label}</option>)}</select><Icon name="chevron" size={13}/></div></div>
          <div className="au-workspace-grid">
            <div className="au-feed"><div className="au-feed-header"><span>HISTORIAL / {filtered.length} RESULTADOS</span><span>MÁS RECIENTE PRIMERO</span></div><div className="au-feed-list">
              {shown.map(entry=><button key={entry.id} type="button" className={`au-feed-row ${selected?.id===entry.id?'au-feed-selected':''}`} aria-pressed={selected?.id===entry.id} onClick={()=>onSelectEntry(entry.id)}><span className={`au-feed-glyph au-glyph-${entry.category}`}><Icon name={categoryIcons[entry.category]} size={18}/></span><span className="au-feed-main"><span className="au-feed-label">{categoryLabels[entry.category]} <i/> {entry.reference}</span><strong>{entry.title}</strong><span className="au-feed-description">{entry.description}</span><span className="au-feed-meta">{dateLabel(entry.timestamp)} · {entry.actor}</span></span><span className="au-feed-trailing"><Icon name="chevron" size={18}/></span></button>)}
              {filtered.length===0&&<div className="au-empty"><Icon name="search" size={29}/><strong>No encontramos eventos.</strong><p>Prueba otro criterio o procesa una factura para registrar nuevas decisiones.</p><button type="button" onClick={()=>{onChangeSearch('');onChangeCategory('all');}}>Restablecer filtros</button></div>}
            </div>{filtered.length>visibleCount&&<button className="au-show-more" type="button" onClick={()=>setVisibleCount(n=>n+12)}>Mostrar más eventos ({filtered.length-visibleCount} restantes) <Icon name="arrowDown" size={16}/></button>}</div>
            <aside className="au-inspector" ref={inspectorRef} aria-label="Inspector de evidencias"><div className="au-inspector-top"><span><Icon name="eye" size={17}/> INSPECTOR DE EVIDENCIA</span><span>READ ONLY</span></div>{selected?<EvidenceDetail entry={selected} activeVersion={policy.version}/>:<div className="au-inspector-empty"><Icon name="audit" size={29}/><strong>Selecciona un evento</strong><p>Sus reglas, responsables y referencias aparecerán aquí.</p></div>}</aside>
          </div>
        </section>
        <section className="au-principles"><div><span className="au-eyebrow">03 / TRUST BY DESIGN</span><h2>La explicabilidad no es <em>una promesa.</em><br/>Es un registro.</h2></div><div className="au-principle-grid"><div><Icon name="shield" size={21}/><strong>Reglas visibles</strong><p>Cada evaluación registrada puede conservar su código de regla y la versión de política aplicada.</p></div><div><Icon name="users" size={21}/><strong>Decisiones atribuibles</strong><p>Las autorizaciones y rechazos almacenan un responsable ficticio y una justificación.</p></div><div><Icon name="lock" size={21}/><strong>Límites explícitos</strong><p>Este prototipo funciona en el navegador. Producción exige identidad real, autorización del servidor y registros inmutables.</p></div></div></section>
        <footer className="au-footer"><span>BLINKA DECISION ENGINE <i/> BY ZYRA</span><span>EXPLAINABILITY / SYNTHETIC ENVIRONMENT</span></footer>
      </div>
    </div>
  </AppShell>;
}
