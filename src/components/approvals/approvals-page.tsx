'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Icon } from '@/components/ui/icon';
import { StatusPill } from '@/components/ui/status-pill';
import { money, shortDate } from '@/lib/format';
import { getInvoices, getInvoiceEvents, INVOICE_UPDATED_EVENT, resolveInvoice } from '@/lib/invoice-registry';
import { assessHumanApproval } from '@/lib/approval-workflow';
import { getDemoPolicy, POLICY_UPDATED_EVENT } from '@/lib/policy-store';
import { getDemoBeneficiaries, REGISTRY_EVENT, normalName, type Beneficiary } from '@/lib/beneficiary-registry';
import { INITIAL_INVOICES, DEMO_POLICY } from '@/lib/mock-data';
import type { Invoice, PaymentPolicy } from '@/types/payments';
import type { InvoiceAuditEvent } from '@/types/invoice-workflow';
import { ApprovalHero } from './approval-hero';
import { ApprovalConfirmation } from './approval-confirmation';

type ApprovalTab = 'pending' | 'ready' | 'blocked' | 'resolved';
type ApprovalRow = {
  invoice: Invoice;
  eligible: boolean;
  reasons: string[];
  currentRule: string;
  policyChanged: boolean;
  vendorChanged: boolean;
};
const tabs: {value:ApprovalTab;label:string}[] = [
  {value:'pending',label:'Todas las pendientes'},
  {value:'ready',label:'Aprobables'},
  {value:'blocked',label:'Requieren corrección'},
  {value:'resolved',label:'Resueltas'},
];
const prettyDate = (s?:string)=>{ if(!s)return 'No registrada';const date=new Date(s);return Number.isFinite(date.getTime())?date.toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'}):'Fecha no disponible'; };
function downloadReview(invoice:Invoice, events:InvoiceAuditEvent[],policy:PaymentPolicy){
  const payload={environment:'SANDBOX',realPaymentExecuted:false,exportedAt:new Date().toISOString(),invoice,invoiceEvents:events.filter(e=>e.invoiceId===invoice.id),currentPolicyForReference:policy};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`review-${invoice.number.replace(/[^a-z0-9-]/gi,'-')}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),300);
}
function SummaryTile({label,value,caption,icon,tone}:{label:string;value:string|number;caption:string;icon:'clock'|'check'|'shield'|'audit';tone?:string}){
  return <div className={`ap-stat ${tone??''}`}><div className="ap-stat-top"><span>{label}</span><Icon name={icon} size={17}/></div><strong>{value}</strong><small>{caption}</small></div>;
}
function DecisionRow({row,selected,onSelect}:{row:ApprovalRow;selected:boolean;onSelect:()=>void}){
  const {invoice,eligible}=row;
  const resolved=invoice.status!=='pending';
  return <button type="button" className={`ap-request ${selected?'ap-request-selected':''}`} aria-pressed={selected} onClick={onSelect}>
    <span className="ap-request-avatar" aria-hidden="true">{invoice.vendorInitials||invoice.vendor.slice(0,2).toUpperCase()}</span>
    <span className="ap-request-main"><strong>{invoice.vendor}</strong><small>{invoice.number} <span>·</span> {invoice.country}</small><span className="ap-request-rule"><i className={resolved?(invoice.status==='authorized'?'ap-green':'ap-red'):eligible?'ap-green':'ap-amber'}/>{resolved?invoice.ruleCode==='HUMAN_APPROVAL_GRANTED'?'Aprobada por una persona':'Rechazada por una persona':eligible?'Lista para decisión':'Requiere corrección previa'}</span></span>
    <span className="ap-request-side"><strong>{invoice.currency==='USD'?money(invoice.amount):`${invoice.amount.toLocaleString('en-US')} ${invoice.currency}`}</strong><small>Vence {invoice.dueDate?shortDate(invoice.dueDate):'por verificar'}</small><Icon name="chevron" size={15}/></span>
  </button>;
}

export function ApprovalsPage(){
  const [invoices,setInvoices]=useState<Invoice[]>(INITIAL_INVOICES);
  const [events,setEvents]=useState<InvoiceAuditEvent[]>([]);
  const [policy,setPolicy]=useState<PaymentPolicy>(DEMO_POLICY);
  const [beneficiaries,setBeneficiaries]=useState<Beneficiary[]>([]);
  const [hydrated,setHydrated]=useState(false);
  const [tab,setTab]=useState<ApprovalTab>('pending');
  const [search,setSearch]=useState('');
  const [selectedId,setSelectedId]=useState('inv-02');
  const [dialog,setDialog]=useState<'approve'|'reject'|null>(null);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState<{text:string;type:'success'|'error'}|null>(null);
  const listRef=useRef<HTMLDivElement>(null);
  const detailRef=useRef<HTMLElement>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  const closeDialog=useCallback(()=>setDialog(null),[]);
  const reload=useCallback(()=>{
    setInvoices(getInvoices());setEvents(getInvoiceEvents());setPolicy(getDemoPolicy());setBeneficiaries(getDemoBeneficiaries());setHydrated(true);
  },[]);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      reload();
      const params=new URLSearchParams(window.location.search);
      const requested=params.get('invoice');
      if(requested && getInvoices().some(item=>item.id===requested)){
        setSelectedId(requested);
        if(getInvoices().find(item=>item.id===requested)?.reviewedBy)setTab('resolved');
      }
    });
    window.addEventListener(INVOICE_UPDATED_EVENT,reload);
    window.addEventListener(POLICY_UPDATED_EVENT,reload);
    window.addEventListener(REGISTRY_EVENT,reload);
    window.addEventListener('storage',reload);
    return()=>{
      cancelAnimationFrame(frame);
      window.removeEventListener(INVOICE_UPDATED_EVENT,reload);window.removeEventListener(POLICY_UPDATED_EVENT,reload);window.removeEventListener(REGISTRY_EVENT,reload);window.removeEventListener('storage',reload);
    };
  },[reload]);
  const rows=useMemo<ApprovalRow[]>(()=>invoices.filter(invoice=>invoice.status==='pending'||Boolean(invoice.reviewedBy)).map(invoice=>{
    if(invoice.status!=='pending')return {invoice,eligible:false,reasons:[],currentRule:invoice.ruleCode,policyChanged:false,vendorChanged:false};
    const result=assessHumanApproval(invoice,invoices,policy,beneficiaries);
    return {invoice,eligible:result.eligible,reasons:result.reasons,currentRule:result.candidate.ruleCode,policyChanged:result.policyChanged,vendorChanged:result.vendorChanged};
  }),[invoices,policy,beneficiaries]);
  const pending=rows.filter(r=>r.invoice.status==='pending');
  const ready=pending.filter(r=>r.eligible);
  const needWork=pending.filter(r=>!r.eligible);
  const resolved=rows.filter(r=>r.invoice.status!=='pending');
  const totalPendingUSD=pending.filter(r=>r.invoice.currency==='USD').reduce((acc,r)=>acc+r.invoice.amount,0);
  const counts={pending:pending.length,ready:ready.length,blocked:needWork.length,resolved:resolved.length};
  const sorted=useMemo(()=>{
    const byTab=rows.filter(r=>tab==='pending'?r.invoice.status==='pending':tab==='ready'?r.invoice.status==='pending'&&r.eligible:tab==='blocked'?r.invoice.status==='pending'&&!r.eligible:r.invoice.status!=='pending');
    const term=search.trim().toLowerCase();
    return byTab.filter(r=>`${r.invoice.number} ${r.invoice.vendor} ${r.invoice.country} ${r.invoice.ruleCode} ${r.currentRule}`.toLowerCase().includes(term)).sort((a,b)=>tab==='resolved'?(b.invoice.reviewedAt??'').localeCompare(a.invoice.reviewedAt??''):(a.invoice.dueDate||'9999').localeCompare(b.invoice.dueDate||'9999'));
  },[rows,search,tab]);
  const displayedId=hydrated && !sorted.some(row=>row.invoice.id===selectedId)?sorted[0]?.invoice.id??'':selectedId;
  const selected=rows.find(r=>r.invoice.id===displayedId)??null;
  const beneficiary=selected?beneficiaries.find(b=>normalName(b.name)===normalName(selected.invoice.vendor)):undefined;
  const selectedEvents=selected?events.filter(e=>e.invoiceId===selected.invoice.id):[];
  const select=(id:string)=>{setSelectedId(id);if(window.innerWidth<=990)detailRef.current?.scrollIntoView({behavior:'smooth',block:'start'});};
  const finalize=(note:string)=>{
    if(!selected||!dialog||saving)return;
    setSaving(true);
    try{
      resolveInvoice(selected.invoice.id,dialog==='approve',note);
      setNotice({text:dialog==='approve'?'Autorización humana simulada registrada con justificación. No se realizó un pago.':'Solicitud rechazada y justificación registrada en el historial.',type:'success'});
      setDialog(null);setTab('resolved');reload();
    }catch(error){setDialog(null);reload();setNotice({text:error instanceof Error?error.message:'No fue posible guardar la decisión.',type:'error'});}
    finally{setSaving(false);}
  };
  const scrollQueue=()=>listRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
  return <AppShell currentPage="approvals" alerts={counts.pending} onPendingClick={scrollQueue} onSearchClick={()=>{scrollQueue();searchRef.current?.focus();}}>
    <div className="ap-page">
      <ApprovalHero pending={counts.pending} eligible={counts.ready} onExplore={scrollQueue}/>
      <div className="ap-container">
        <div className="ap-heading"><div><span className="ap-eyebrow"><i/> 01 / APPROVAL OPERATIONS</span><h2>La última palabra<span>.</span></h2><p>Solicitudes escaladas por el agente. Cada autorización exige un responsable y una justificación.</p></div><span className="ap-workspace-flag"><i/> ENTORNO FICTICIO · SIN PAGOS REALES</span></div>
        <div className="ap-stats">
          <SummaryTile label="POR RESOLVER" value={hydrated?counts.pending:'—'} caption={`${money(totalPendingUSD)} USD en revisión`} icon="clock" tone="ap-stat-highlight"/>
          <SummaryTile label="APROBABLES" value={hydrated?counts.ready:'—'} caption="Cumplen las demás reglas" icon="check"/>
          <SummaryTile label="REQUIEREN CORRECCIÓN" value={hydrated?counts.blocked:'—'} caption="No se permite autorizar" icon="shield" tone="ap-stat-attention"/>
          <SummaryTile label="DECISIONES HUMANAS" value={hydrated?counts.resolved:'—'} caption="Resoluciones registradas" icon="audit"/>
        </div>
        <div className="ap-alertline"><Icon name="shield" size={19}/><div><strong>La aprobación humana no es una excepción a las políticas.</strong><span>Antes de aceptar, el agente vuelve a validar límite absoluto, acuerdos, presupuesto, duplicados, moneda y beneficiario.</span></div><Link href="/politicas">Ver reglas <Icon name="arrowUp" size={14}/></Link></div>
        {notice&&<div role="status" className={`ap-notice ap-notice-${notice.type}`}><Icon name={notice.type==='error'?'alert':'check'} size={17}/><span>{notice.text}</span><button type="button" onClick={()=>setNotice(null)} aria-label="Cerrar aviso"><Icon name="close" size={16}/></button></div>}
        <div className="ap-section-heading" ref={listRef} id="bandeja"><div><span className="ap-eyebrow">02 / REVIEW QUEUE</span><h2>Bandeja de control</h2></div><span className="ap-section-total">{counts.pending} casos abiertos <i/> {policy.version}</span></div>
        <div className="ap-workspace">
          <section className="ap-inbox" aria-labelledby="ap-inbox-title">
            <div className="ap-inbox-header"><div><span className="ap-small-label">INBOX / TRANSACTION REVIEW</span><h3 id="ap-inbox-title">Solicitudes <span>{counts.pending}</span></h3></div><Icon name="panel" size={21}/></div>
            <div className="ap-toolbar"><div className="ap-tabs" role="group" aria-label="Filtrar solicitudes">{tabs.map(t=><button type="button" key={t.value} className={tab===t.value?'ap-tab-active':''} onClick={()=>setTab(t.value)} aria-pressed={tab===t.value}>{t.label}<small>{counts[t.value]}</small></button>)}</div><label className="ap-search"><Icon name="search" size={17}/><input ref={searchRef} aria-label="Buscar solicitud por proveedor o factura" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar proveedor, número o regla…"/></label></div>
            <div className="ap-request-list">{sorted.map(r=><DecisionRow key={r.invoice.id} row={r} selected={selectedId===r.invoice.id} onSelect={()=>select(r.invoice.id)}/>)}{sorted.length===0&&<div className="ap-empty"><Icon name="check" size={26}/><strong>Sin resultados en esta vista.</strong><span>Cambia el filtro o busca otra factura.</span></div>}</div>
            <div className="ap-inbox-bottom"><span><i/> Datos sintéticos, sincronizados con el dashboard.</span><Link href="/facturas">Ver todas las facturas <Icon name="arrow" size={14}/></Link></div>
          </section>
          <section className="ap-inspector" ref={detailRef} aria-labelledby="ap-inspector-title">{selected?
            <>
              <div className="ap-inspector-head"><div><span className="ap-small-label">03 / HUMAN DECISION</span><h3 id="ap-inspector-title">Expediente <em>{selected.invoice.number}</em></h3></div><StatusPill status={selected.invoice.status}/></div>
              <div className="ap-inspector-total"><span>IMPORTE SOLICITADO</span><strong>{selected.invoice.currency==='USD'?money(selected.invoice.amount):selected.invoice.amount.toLocaleString('en-US')}<small> {selected.invoice.currency}</small></strong><p>Vencimiento {selected.invoice.dueDate?shortDate(selected.invoice.dueDate):'por verificar'} <span>·</span> {selected.invoice.source}</p></div>
              <div className="ap-inspector-block"><div className="ap-inspector-block-heading"><span>01</span><h4>Beneficiario y acuerdo</h4><Link href="/beneficiarios"><Icon name="external" size={14}/></Link></div><dl className="ap-facts"><div><dt>Beneficiario</dt><dd>{selected.invoice.vendor}</dd></div><div><dt>Estado vigente</dt><dd className={beneficiary?.status==='authorized'?'ap-fact-good':'ap-fact-warn'}>{beneficiary?.status==='authorized'?'Autorizado':beneficiary?.status==='review'?'En revisión':beneficiary?.status==='blocked'?'Bloqueado':'No registrado'}</dd></div><div><dt>Acuerdo</dt><dd>{beneficiary?.agreementReference??'Sin referencia'}</dd></div><div><dt>Tope acordado</dt><dd>{beneficiary?money(beneficiary.agreementLimit):'No configurado'}</dd></div></dl></div>
              <div className="ap-inspector-block"><div className="ap-inspector-block-heading"><span>02</span><h4>Política y control</h4><Link href="/politicas"><Icon name="external" size={14}/></Link></div><dl className="ap-facts"><div><dt>Umbral autónomo</dt><dd>{money(policy.autonomousLimit)}</dd></div><div><dt>Límite absoluto</dt><dd>{money(policy.hardLimit)}</dd></div><div><dt>Política vigente</dt><dd>{policy.version}</dd></div><div><dt>Resultado original</dt><dd>{selected.invoice.ruleCode}</dd></div>{selected.invoice.status==='pending'&&<div><dt>Control actual</dt><dd>{selected.currentRule}</dd></div>}</dl>
                {(selected.policyChanged||selected.vendorChanged)&&selected.invoice.status==='pending'&&<div className="ap-change-warning"><Icon name="alert" size={15}/><span>{selected.policyChanged?'La política se actualizó desde la decisión inicial. ':''}{selected.vendorChanged?'El beneficiario cambió desde la decisión inicial. ':''}Se utiliza la configuración vigente al resolver.</span></div>}
              </div>
              <div className="ap-inspector-block"><div className="ap-inspector-block-heading"><span>03</span><h4>Evaluación de seguridad</h4><Icon name="shield" size={16}/></div>
                {selected.invoice.status==='pending'?<div className={`ap-readiness ${selected.eligible?'ap-readiness-good':'ap-readiness-warn'}`}><div className="ap-readiness-title"><Icon name={selected.eligible?'check':'alert'} size={17}/><strong>{selected.eligible?'Elegible para aprobación humana':'No autorizable actualmente'}</strong></div><p>{selected.eligible?'La reevaluación cumple todos los controles obligatorios. La decisión final requiere revisión explícita.':selected.reasons.join(' ')}</p></div>:<div className={`ap-readiness ${selected.invoice.status==='authorized'?'ap-readiness-good':'ap-readiness-warn'}`}><div className="ap-readiness-title"><Icon name={selected.invoice.status==='authorized'?'check':'cross'} size={16}/><strong>{selected.invoice.status==='authorized'?'Autorización registrada':'Rechazo registrado'}</strong></div><p>{selected.invoice.reviewNote??selected.invoice.reason}</p></div>}
                <div className="ap-checks">{selected.invoice.checks.map((check,i)=><div key={`${check}-${i}`}><Icon name="check" size={14}/>{check}</div>)}</div>
              </div>
              {selected.invoice.reviewedBy&&<div className="ap-inspector-block ap-resolution"><div className="ap-inspector-block-heading"><span>04</span><h4>Responsable y evidencia</h4></div><dl className="ap-facts"><div><dt>Revisó</dt><dd>{selected.invoice.reviewedBy}</dd></div><div><dt>Fecha</dt><dd>{prettyDate(selected.invoice.reviewedAt)}</dd></div><div><dt>Justificación</dt><dd>{selected.invoice.reviewNote??'No registrada en fixture inicial'}</dd></div></dl></div>}
              <div className="ap-inspector-actions"><Link className="ap-case-link" href={`/facturas/${encodeURIComponent(selected.invoice.id)}`}>Abrir expediente completo <Icon name="arrowUp" size={15}/></Link><button type="button" className="ap-export" onClick={()=>downloadReview(selected.invoice,selectedEvents,policy)}><Icon name="download" size={16}/> Exportar evidencia JSON</button>
                {selected.invoice.status==='pending'&&<div className="ap-action-buttons"><button type="button" className="ap-reject" onClick={()=>setDialog('reject')}><Icon name="cross" size={17}/> Rechazar</button><button type="button" className="ap-primary" disabled={!selected.eligible} onClick={()=>setDialog('approve')} title={!selected.eligible?selected.reasons.join(' '):'Autorizar solo en simulación'}><Icon name="check" size={17}/> Aprobar en sandbox</button></div>}
                {selected.invoice.status==='pending'&&!selected.eligible&&<p className="ap-action-help"><Icon name="lock" size={14}/> Corrige primero la causa desde el expediente, el beneficiario o las políticas. Rechazar siempre está disponible.</p>}
                <small>Revisor ficticio: Admin Finance · Sandbox. No hay autenticación real.</small>
              </div>
            </>:
            <div className="ap-no-selection"><Icon name="receipt" size={33}/><h3>Selecciona una solicitud.</h3><p>Consulta los controles antes de tomar una decisión.</p></div>}
          </section>
        </div>
        <section className="ap-history" aria-labelledby="ap-history-title"><div className="ap-section-heading"><div><span className="ap-eyebrow">04 / ACCOUNTABILITY</span><h2 id="ap-history-title">Decisiones con responsable.</h2></div><Link className="ap-history-link" href="/facturas">Consultar expedientes <Icon name="arrowUp" size={15}/></Link></div><div className="ap-history-grid">{resolved.slice(0,4).map(item=><button type="button" key={item.invoice.id} onClick={()=>{setSelectedId(item.invoice.id);setTab('resolved');scrollQueue();}} className="ap-history-entry"><span className={`ap-history-icon ${item.invoice.status==='authorized'?'ap-success':'ap-danger-tone'}`}><Icon name={item.invoice.status==='authorized'?'check':'cross'} size={18}/></span><div><strong>{item.invoice.vendor}</strong><span>{item.invoice.number} · {item.invoice.reviewedBy}</span><small>{item.invoice.reviewNote??'Motivo no disponible'}</small></div><time>{prettyDate(item.invoice.reviewedAt)}</time></button>)}{resolved.length===0&&<div className="ap-history-empty"><Icon name="clock" size={23}/><div><strong>Aún no hay resoluciones humanas.</strong><span>Cuando apruebes o rechaces una solicitud, aparecerá aquí con su responsable y motivo.</span></div></div>}</div></section>
        <footer className="ap-footer"><span>BLINKA DECISION ENGINE <i/> BY ZYRA</span><span>HUMAN OVERSIGHT / DEMO ONLY — NO REAL PAYMENTS</span></footer>
      </div>
      {dialog&&selected&&<ApprovalConfirmation key={`${selected.invoice.id}-${dialog}`} invoice={selected.invoice} intent={dialog} eligible={selected.eligible} onClose={closeDialog} onConfirm={finalize} busy={saving}/>} 
    </div>
  </AppShell>;
}
