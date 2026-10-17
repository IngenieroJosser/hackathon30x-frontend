'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Icon } from '@/components/ui/icon';
import { MetricCard } from './metric-card';
import { AgentStage } from '@/components/experience/agent-stage';
import { DecisionChart } from './decision-chart';
import { BudgetCard } from './budget-card';
import { ApprovalQueue } from './approval-queue';
import { RecentInvoices } from './recent-invoices';
import { InvoiceDetail } from './invoice-detail';
import { DEMO_BATCH, DEMO_POLICY, INITIAL_INVOICES } from '@/lib/mock-data';
import { evaluateDemoInvoice } from '@/lib/decision-engine';
import { integer, money } from '@/lib/format';
import type { DecisionFilter, Invoice } from '@/types/payments';

const pendingValue = (items:Invoice[]) => items.filter(x=>x.status==='pending').reduce((sum,x)=>sum+x.amount,0);

export function DashboardPage() {
  const [invoices,setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [filter,setFilter] = useState<DecisionFilter>('all');
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [demoRun,setDemoRun] = useState(false);
  const [toast,setToast] = useState<string|null>(null);
  const tableRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = invoices.find(item=>item.id===selectedId)??null;

  const counts = useMemo(()=>({
    total:invoices.length,
    authorized:invoices.filter(x=>x.status==='authorized').length,
    blocked:invoices.filter(x=>x.status==='blocked').length,
    pending:invoices.filter(x=>x.status==='pending').length,
  }),[invoices]);
  const resolved = counts.total===0 ? 0 : Math.round(((counts.authorized+counts.blocked)/counts.total)*100);

  const scrollToInvoices = useCallback((nextFilter:DecisionFilter='all')=>{
    setFilter(nextFilter);
    tableRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
  },[]);
  const focusSearch = useCallback(()=>{
    scrollToInvoices();
    window.setTimeout(()=>searchRef.current?.focus(),250);
  },[scrollToInvoices]);

  useEffect(() => {
    const onSearchShortcut = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      event.preventDefault();
      focusSearch();
    };
    document.addEventListener('keydown', onSearchShortcut);
    return () => document.removeEventListener('keydown', onSearchShortcut);
  }, [focusSearch]);

  const runBatch = () => {
    if(demoRun) return;
    let available = DEMO_POLICY.monthlyBudget-invoices.filter(x=>x.status==='authorized').reduce((sum,x)=>sum+x.amount,0);
    const evaluated = DEMO_BATCH.map(item=>{
      const result=evaluateDemoInvoice(item,DEMO_POLICY,available);
      if(result.status==='authorized') available-=item.amount;
      return {...item,...result};
    });
    setInvoices(current=>[...evaluated,...current]);
    setDemoRun(true);
    setToast('Lote procesado: 3 decisiones registradas con datos de prueba.');
  };

  const onApprove = (id:string) => {
    const row=invoices.find(item=>item.id===id);
    if(!row || row.status!=='pending') return;
    const remaining=DEMO_POLICY.monthlyBudget-invoices.filter(x=>x.status==='authorized').reduce((sum,x)=>sum+x.amount,0);
    const revalidated=evaluateDemoInvoice(row,DEMO_POLICY,remaining);
    // An ordinary approval cannot bypass any hard policy in this local demo.
    if(revalidated.ruleCode!=='APPROVAL_REQUIRED') {
      setToast('No se autorizó: la solicitud ya no cumple las políticas.');
      return;
    }
    setInvoices(current=>current.map(item=>item.id===id?{
      ...item,status:'authorized' as const,ruleCode:'HUMAN_APPROVAL_GRANTED',
      reason:'Un administrador autorizó la factura en la simulación tras volver a verificar las reglas.',
      checks:[...revalidated.checks.filter(x=>!x.toLowerCase().includes('pendiente')),'Aprobación humana simulada por Admin Finance'],
      reviewedBy:'Admin Finance · Demo',
    }:item));
    setSelectedId(null);
    setToast('Autorización simulada registrada. No se realizó ningún pago.');
  };
  const onReject = (id:string) => {
    setInvoices(current=>current.map(item=>item.id===id&&item.status==='pending'?{
      ...item,status:'blocked' as const,ruleCode:'HUMAN_APPROVAL_REJECTED',
      reason:'La persona revisora rechazó esta solicitud en el entorno de demostración.',
      checks:[...item.checks,'Rechazo humano registrado'],reviewedBy:'Admin Finance · Demo',
    }:item));
    setSelectedId(null);
    setToast('Rechazo registrado en el entorno demo.');
  };
  const downloadAudit = () => {
    const payload={generatedAt:new Date().toISOString(),environment:'synthetic-demo',paymentExecution:false,policy:DEMO_POLICY,decisions:invoices.map(({id,number,vendor,amount,currency,status,ruleCode,reason,checks,reviewedBy})=>({id,number,vendor,amount,currency,status,ruleCode,reason,checks,reviewedBy:reviewedBy??null}))};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=url;link.download='blinka-auditoria-demo.json';document.body.append(link);link.click();link.remove();
    URL.revokeObjectURL(url);
    setToast('Archivo JSON de auditoría descargado.');
  };

  const goToOperations = () => document.getElementById('operaciones')?.scrollIntoView({behavior:'smooth',block:'start'});
  return <AppShell alerts={counts.pending} onPendingClick={()=>scrollToInvoices('pending')} onSearchClick={focusSearch}>
    <AgentStage resolved={resolved} total={counts.total} pending={counts.pending} onEnter={goToOperations} onPending={()=>scrollToInvoices('pending')}/>
    <div className="dashboard-content" id="operaciones">
      <section className="operations-intro" aria-labelledby="operations-title">
        <div className="operations-title-block">
          <div className="section-kicker"><i/> LIVE OPERATIONS <span>/</span> OVERVIEW 001</div>
          <div className="operations-title-row"><h2 id="operations-title">Centro de <em>control.</em></h2><div className="operations-date"><Icon name="calendar" size={15}/> OCTUBRE / 2026</div></div>
          <p>Un solo lugar para entender qué decidió tu agente y por qué.</p>
        </div>
        <div className="page-actions"><button className="button button-secondary" onClick={downloadAudit} type="button"><Icon name="download" size={16}/> Exportar auditoría</button><button className="button button-dark" onClick={runBatch} disabled={demoRun} type="button"><Icon name={demoRun?'check':'plus'} size={17}/>{demoRun?'Lote procesado':'Procesar lote demo'}</button></div>
      </section>
      <div className="environment-banner"><span className="environment-icon"><Icon name="shield" size={16}/></span><span><strong>Sandbox de Blinka.</strong> Todos los datos son sintéticos; las autorizaciones no ejecutan pagos reales.</span><span className="banner-version">{DEMO_POLICY.version}</span></div>
      <section className="metrics-section" aria-label="Indicadores de facturas"><div className="metrics-grid">
        <MetricCard eyebrow="Facturas evaluadas" value={integer(counts.total)} sub="Registros analizados" icon="receipt"/>
        <MetricCard eyebrow="Autorizadas" value={integer(counts.authorized)} sub="Sin intervención humana" icon="check" tone="success"/>
        <MetricCard eyebrow="Bloqueadas" value={integer(counts.blocked)} sub="Riesgos operativos evitados" icon="cross" tone="danger"/>
        <MetricCard eyebrow="Por aprobar" value={integer(counts.pending)} sub={`${money(pendingValue(invoices))} en revisión`} icon="clock" tone="warning"/>
      </div></section>
      <div className="primary-grid">
        <section className="hero-insight" aria-label="Resumen del motor de decisiones">
          <div className="insight-halo"/><div className="insight-grid"/>
          <div className="hero-left"><div className="hero-eyebrow"><i className="hero-online-dot"/> AUTONOMY ENGINE <span className="hero-eyebrow-sep">/</span> V1.3</div>
            <h2>El poder de decidir.<br/><em>La certeza de controlar.</em></h2>
            <p>Tu agente aplica las políticas de pago antes de cada autorización. Sin atajos. Sin cajas negras.</p>
            <button className="hero-button" onClick={()=>scrollToInvoices('pending')} type="button">Revisar solicitudes <Icon name="arrowUp" size={17}/></button>
            <div className="hero-policies"><span><Icon name="shield" size={14}/> {DEMO_POLICY.version}</span><span><Icon name="lock" size={14}/> Modo simulación</span></div>
          </div>
          <div className="hero-right"><div className="hero-ring" style={{background:`conic-gradient(from -90deg, var(--accent) 0 ${resolved}%, rgba(244,250,241,.09) ${resolved}% 100%)`}}><div className="ring-content"><span className="ring-legend">AUTONOMÍA</span><strong>{resolved}<span>%</span></strong><small>resueltas sin<br/>intervención</small></div></div><div className="hero-right-foot"><i/>{counts.authorized+counts.blocked} de {counts.total} decisiones</div></div>
        </section>
        <ApprovalQueue invoices={invoices} onSelect={invoice=>setSelectedId(invoice.id)} onViewAll={()=>scrollToInvoices('pending')}/>
      </div>
      <div className="section-heading"><div><div className="section-kicker"><i/> INTELLIGENCE <span>/</span> INSIGHTS 002</div><h2>Rendimiento y límites</h2><p>Actividad del agente y supervisión presupuestaria.</p></div><span className="period-tag"><Icon name="calendar" size={16}/> Últimos 7 días</span></div>
      <div className="analytics-grid"><DecisionChart invoices={invoices}/><BudgetCard invoices={invoices}/></div>
      <div className="section-heading table-section-intro"><div><div className="section-kicker"><i/> TRACEABILITY <span>/</span> RECORDS 003</div><h2>Cada decisión. Una evidencia.</h2><p>Consulta todos los resultados, reglas y justificaciones sin salir de tu operación.</p></div><button className="button button-secondary" type="button" onClick={downloadAudit}><Icon name="download" size={15}/> JSON</button></div>
      <RecentInvoices invoices={invoices} filter={filter} onFilterChange={setFilter} onSelect={invoice=>setSelectedId(invoice.id)} tableRef={tableRef} searchRef={searchRef}/>
      <footer className="site-footer"><span>© 2026 BLINKA DECISION ENGINE / SANDBOX</span><span>CONCEPTO DE PRODUCTO POR ZYRA <span className="footer-divider">·</span> NO REAL PAYMENTS</span></footer>
    </div>
    <InvoiceDetail invoice={selected} onClose={()=>setSelectedId(null)} onApprove={onApprove} onReject={onReject}/>
    {toast&&<div className="toast" role="status"><Icon name="check" size={17}/><span>{toast}</span><button type="button" aria-label="Cerrar mensaje" onClick={()=>setToast(null)}><Icon name="close" size={15}/></button></div>}
  </AppShell>;
}
