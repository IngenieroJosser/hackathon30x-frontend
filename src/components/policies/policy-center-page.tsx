'use client';
import Link from 'next/link';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Icon } from '@/components/ui/icon';
import { PolicyEyebrow, PolicyMoneyField, PolicyPanel, PolicyPanelHeading, PolicyRule } from './policy-primitives';
import { getDemoPolicy, getDemoPolicyHistory, POLICY_FIELD_LABEL, publishDemoPolicy, validateDemoPolicy, type PolicyAmountKey, type PolicyHistoryEvent, type PolicyValues } from '@/lib/policy-store';
import { DEMO_POLICY, INITIAL_INVOICES } from '@/lib/mock-data';
import { getInvoices, INVOICE_UPDATED_EVENT } from '@/lib/invoice-registry';
import { evaluateDemoInvoice } from '@/lib/decision-engine';
import { money } from '@/lib/format';
import type { Invoice, PaymentPolicy } from '@/types/payments';

const labels:PolicyAmountKey[]=['autonomousLimit','hardLimit','monthlyBudget'];
const budgetCommitted = INITIAL_INVOICES.filter(x=>x.status==='authorized').reduce((sum,x)=>sum+x.amount,0);
const defaults:Record<PolicyAmountKey,string>={
  autonomousLimit:String(DEMO_POLICY.autonomousLimit),hardLimit:String(DEMO_POLICY.hardLimit),monthlyBudget:String(DEMO_POLICY.monthlyBudget),
};
const toFields=(policy:PaymentPolicy):Record<PolicyAmountKey,string>=>({
  autonomousLimit:String(policy.autonomousLimit),hardLimit:String(policy.hardLimit),monthlyBudget:String(policy.monthlyBudget),
});
const toValues=(fields:Record<PolicyAmountKey,string>):PolicyValues=>({
  autonomousLimit:Number(fields.autonomousLimit),hardLimit:Number(fields.hardLimit),monthlyBudget:Number(fields.monthlyBudget),
});

type Scenario = 'nominal'|'large'|'duplicate'|'unknown'|'contract'|'uncertain'|'budget';
const scenarios: {key:Scenario;name:string;meta:string}[] = [
  {key:'nominal',name:'Factura estándar',meta:'Elegible'},
  {key:'large',name:'Importe alto',meta:'Revisión'},
  {key:'duplicate',name:'Cobro duplicado',meta:'Bloqueo'},
  {key:'unknown',name:'Beneficiario nuevo',meta:'Bloqueo'},
  {key:'contract',name:'Fuera de acuerdo',meta:'Bloqueo'},
  {key:'uncertain',name:'Documento ambiguo',meta:'Revisión'},
  {key:'budget',name:'Sin presupuesto',meta:'Bloqueo'},
];
const fixture = INITIAL_INVOICES[0];
const scenarioInvoice=(scenario:Scenario,amount:number):Invoice=>({
  ...fixture,id:`sandbox-${scenario}`,number:`TEST-${scenario.toUpperCase()}`,vendor:'Nexa Software',vendorInitials:'NX',
  category:'Servicios profesionales',amount,currency:'USD',approvedVendor:scenario!=='unknown',
  duplicateOf:scenario==='duplicate'?'INV-2026-1042':undefined,
  confidence:scenario==='uncertain'?'needs_review':'high',agreementLimit:scenario==='contract'?Math.max(1,amount-200):50_000,
  status:'unprocessed',ruleCode:'',reason:'Sin evaluar',checks:[],
});

function OutcomeBadge({status}:{status:'authorized'|'blocked'|'pending'}){
 const title={authorized:'AUTORIZACIÓN SIMULADA',blocked:'BLOQUEADO',pending:'REVISIÓN HUMANA'}[status];
 const icon={authorized:'check',blocked:'cross',pending:'clock'}[status] as 'check'|'cross'|'clock';
 return <span className={`policy-outcome policy-outcome-${status}`}><Icon name={icon} size={15}/>{title}</span>;
}

export function PolicyCenterPage(){
  const [pendingCount,setPendingCount]=useState(INITIAL_INVOICES.filter(x=>x.status==='pending').length);
  useEffect(()=>{const refresh=()=>setPendingCount(getInvoices().filter(x=>x.status==='pending').length);refresh();window.addEventListener(INVOICE_UPDATED_EVENT,refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener(INVOICE_UPDATED_EVENT,refresh);window.removeEventListener('storage',refresh);};},[]);
  const [active,setActive]=useState<PaymentPolicy>(DEMO_POLICY);
  const [form,setForm]=useState<Record<PolicyAmountKey,string>>(defaults);
  const [history,setHistory]=useState<PolicyHistoryEvent[]>([]);
  const [selectedScenario,setSelectedScenario]=useState<Scenario>('large');
  const [simulatedAmount,setSimulatedAmount]=useState('2400');
  const [confirmOpen,setConfirmOpen]=useState(false);
  const dialogRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!confirmOpen)return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    dialogRef.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){setConfirmOpen(false);return;}
      if(event.key!=='Tab')return;
      const focusable=dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled])');
      if(!focusable?.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKeyDown);
    return ()=>{document.removeEventListener('keydown',onKeyDown);previous?.focus();};
  },[confirmOpen]);
  const [toast,setToast]=useState<string|null>(null);

  useEffect(()=>{
    const id=requestAnimationFrame(()=>{
      const policy=getDemoPolicy();setActive(policy);setForm(toFields(policy));setHistory(getDemoPolicyHistory());
    });
    return ()=>cancelAnimationFrame(id);
  },[]);

  const draft=toValues(form);
  const policyErrors=validateDemoPolicy({...draft,currency:'USD'});
  if(!policyErrors.length && draft.monthlyBudget < budgetCommitted){
    policyErrors.push(`El presupuesto no puede ser inferior a ${money(budgetCommitted)} ya comprometidos en los registros de demostración.`);
  }
  const dirty=labels.some(field=>draft[field]!==active[field]);
  const canPublish=dirty&&policyErrors.length===0;
  const draftForPreview:PaymentPolicy={...draft,version:'BORRADOR',currency:'USD'};
  const amount=Number(simulatedAmount);
  const validTestAmount=Number.isSafeInteger(amount)&&amount>0&&amount<=100_000_000;
  const currentInvoice=useMemo(()=>scenarioInvoice(selectedScenario,validTestAmount?amount:2400),[selectedScenario,validTestAmount,amount]);
  const testAvailable=selectedScenario==='budget'?Math.max(0,amount-1):Math.max(0,draft.monthlyBudget-budgetCommitted);
  const activeAvailable=selectedScenario==='budget'?Math.max(0,amount-1):Math.max(0,active.monthlyBudget-budgetCommitted);
  const activeDecision=evaluateDemoInvoice(currentInvoice,active,activeAvailable);
  const draftDecision=policyErrors.length===0&&validTestAmount?evaluateDemoInvoice(currentInvoice,draftForPreview,testAvailable):null;
  const budgetPct=Math.min(100,(budgetCommitted/Math.max(1,draft.monthlyBudget))*100);
  const newVersion=`v1.${Number(active.version.match(/v1\.(\d+)/)?.[1]??'3')+1}`;

  const updateField=(field:PolicyAmountKey,value:string)=>{
    setForm(current=>({...current,[field]:value}));
    setToast(null);
  };
  const pickScenario=(value:Scenario)=>{
    setSelectedScenario(value);
    setSimulatedAmount(({nominal:'620',large:'2400',duplicate:'845',unknown:'680',contract:'1200',uncertain:'840',budget:'650'})[value]);
  };
  const publish=()=>{
    if(!canPublish)return;
    try{
      const saved=publishDemoPolicy(draft);
      setActive(saved.policy);setForm(toFields(saved.policy));setHistory(getDemoPolicyHistory());
      setConfirmOpen(false);setToast(`${saved.policy.version} publicada en el sandbox del navegador. No se ejecutaron pagos.`);
    }catch(error){setConfirmOpen(false);setToast(error instanceof Error?error.message:'No fue posible guardar la política.');}
  };
  const download=()=>{
    const payload={environment:'sandbox',disclaimer:'Datos locales de demostración; no usar para aprobar pagos reales',exportedAt:new Date().toISOString(),activePolicy:active,events:history,mandatoryControls:['DUPLICATE_INVOICE','VENDOR_NOT_ALLOWED','AGREEMENT_MISMATCH','HARD_LIMIT_EXCEEDED','BUDGET_INSUFFICIENT','LOW_CONFIDENCE']};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const href=URL.createObjectURL(blob);
    const link=document.createElement('a');link.href=href;link.download='finvigia-politicas-sandbox.json';document.body.append(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(href),1000);
    setToast('Configuración y eventos exportados a JSON.');
  };

  return <AppShell alerts={pendingCount} onPendingClick={()=>window.location.assign('/aprobaciones')} onSearchClick={()=>window.location.assign('/facturas')} currentPage="policies">
    <div className="policies-page">
      <section className="policies-hero" aria-labelledby="policy-page-title">
        <video autoPlay muted loop playsInline preload="none" aria-hidden="true" poster="/metal-human.jpg" className="policies-hero-video"><source src="/metal-human.mp4" type="video/mp4"/></video>
        <div className="policies-hero-overlay"/><div className="policies-hero-noise"/><div className="policies-hero-arc arc-one"/><div className="policies-hero-arc arc-two"/>
        <div className="policies-hero-body">
          <div className="policies-breadcrumb"><Link href="/">WORKSPACE</Link><span>/</span>GOVERNANCE<span>/</span><strong>POLICY CENTER</strong></div>
          <div className="policies-hero-kicker"><span className="policy-live-dot"/>AGENT GOVERNANCE <span>—</span> 01 / 04</div>
          <h1 id="policy-page-title">El agente decide.<br/><em>Tu empresa establece<br/>los límites.</em></h1>
          <p>Autonomía con reglas claras, supervisión humana y control financiero en cada decisión.</p>
          <div className="policies-hero-actions"><Link href="#configuracion" className="policy-hero-primary">Configurar políticas <Icon name="arrowDown" size={16}/></Link><Link href="#simulador" className="policy-hero-link">Probar una decisión <Icon name="arrowUp" size={15}/></Link></div>
        </div>
        <div className="policies-hero-index"><span>GOVERNANCE SYSTEM</span><strong>01<span>/</span>04</strong></div>
        <div className="policies-hero-watermark">RULES BEFORE AUTONOMY</div>
      </section>

      <div className="policies-workspace" id="configuracion">
        <div className="policy-subnav" aria-label="Secciones de políticas"><div className="policy-subnav-title"><span className="policy-live-dot"/>POLICY CONTROL ROOM</div><nav><Link href="#limites">01 / LÍMITES</Link><Link href="#controles">02 / CONTROLES</Link><Link href="#simulador">03 / SIMULACIÓN</Link><Link href="#historial">04 / HISTORIAL</Link></nav><span className="policy-subnav-version">{active.version}</span></div>
        <div className="policy-page-header"><div><PolicyEyebrow number="01">CONFIGURACIÓN EMPRESARIAL</PolicyEyebrow><h2>Control de <span>políticas.</span></h2><p>Define qué puede autorizar el agente, qué debe detener y cuándo necesita a una persona.</p></div><div className="policy-page-header-actions"><span className="policy-active-state"><span className="policy-live-dot"/> POLÍTICA ACTIVA</span><button type="button" className="policy-button policy-button-ghost" onClick={download}><Icon name="download" size={15}/> Exportar</button></div></div>
        <div className="policy-sandbox-alert"><Icon name="info" size={17}/><p><strong>ENTORNO DE SIMULACIÓN.</strong> Los cambios se guardan en este navegador y pueden influir en las nuevas evaluaciones del dashboard. No constituyen un control de autorización en un sistema de pagos real.</p><span>NO REAL PAYMENTS</span></div>

        <div className="policy-summary-grid" aria-label="Resumen de política actual">
          <div className="policy-summary-item"><div><span>01</span><p>Autonomía por factura</p></div><strong>{money(active.autonomousLimit)}</strong><small>Hasta este importe, si pasa todos los controles</small></div>
          <div className="policy-summary-item"><div><span>02</span><p>Límite absoluto</p></div><strong>{money(active.hardLimit)}</strong><small>Restricción que ninguna aprobación ordinaria supera</small></div>
          <div className="policy-summary-item"><div><span>03</span><p>Presupuesto mensual</p></div><strong>{money(active.monthlyBudget)}</strong><small>Límite total de compromisos del periodo</small></div>
          <div className="policy-summary-item policy-summary-security"><span className="policy-shield-round"><Icon name="shield" size={21}/></span><div><p>6 controles esenciales</p><strong>Siempre activos</strong><small>Protecciones obligatorias</small></div></div>
        </div>

        <div className="policy-main-grid">
          <div className="policy-main-left">
            <PolicyPanel id="limites" className="policy-limit-panel">
              <div className="policy-panel-inner"><PolicyPanelHeading tag="01 / FINANCIAL GUARDRAILS" title="Límites & presupuesto" description="Determina los importes que gobiernan cada decisión del agente." icon="wallet"/>
                <div className="policy-edit-intro"><span><Icon name="settings" size={16}/> EDITAR POLÍTICA</span><span>{dirty?'CAMBIOS SIN PUBLICAR':'SIN CAMBIOS PENDIENTES'}</span></div>
                <div className="policy-fields-grid">
                  <PolicyMoneyField id="policy-auto" field="autonomousLimit" label="Límite de autonomía" helper="El agente podrá autorizar hasta este monto si todas las reglas pasan." value={form.autonomousLimit} onChange={value=>updateField('autonomousLimit',value)} invalid={Number(form.autonomousLimit)<=0||Number(form.autonomousLimit)>Number(form.hardLimit)}/>
                  <PolicyMoneyField id="policy-hard" field="hardLimit" label="Límite absoluto por pago" helper="Una aprobación humana ordinaria no puede superar este techo." value={form.hardLimit} onChange={value=>updateField('hardLimit',value)} invalid={Number(form.hardLimit)<Number(form.autonomousLimit)||Number(form.hardLimit)>Number(form.monthlyBudget)}/>
                </div>
                <div className="policy-threshold-visual" aria-label="Relación entre límites configurados"><div className="policy-threshold-labels"><span>DECISIÓN AUTÓNOMA</span><span>REVISIÓN HUMANA</span><span>BLOQUEO</span></div><div className="policy-threshold-track"><span className="policy-threshold-autonomy" style={{width:`${Math.max(0,Math.min(100,draft.autonomousLimit/Math.max(1,draft.hardLimit)*100))}%`}}/></div><div className="policy-threshold-values"><span>US$0</span><span>{Number.isFinite(draft.autonomousLimit)?money(Math.max(0,draft.autonomousLimit)):'—'}</span><span>{Number.isFinite(draft.hardLimit)?money(Math.max(0,draft.hardLimit)):'—'}</span></div></div>
                <div className="policy-budget-edit"><div className="policy-budget-header"><div><label htmlFor="policy-budget">Presupuesto mensual</label><p>Máximo comprometido por el agente durante el periodo.</p></div><span className="policy-period">OCT / 2026 <Icon name="calendar" size={14}/></span></div><div className="policy-budget-input"><span>USD</span><input id="policy-budget" type="number" inputMode="numeric" min={1} max={100000000} step={1} aria-invalid={draft.monthlyBudget<budgetCommitted} value={form.monthlyBudget} onChange={e=>updateField('monthlyBudget',e.target.value)}/></div><div className="policy-budget-progress"><span style={{width:`${budgetPct}%`}}/></div><div className="policy-budget-legends"><span><i/> Comprometido en demo: {money(budgetCommitted)}</span><span>{money(Math.max(0,draft.monthlyBudget-budgetCommitted))} disponible</span></div></div>
                {policyErrors.length>0&&<div className="policy-errors" role="alert"><Icon name="alert" size={16}/><div>{policyErrors.map(error=><p key={error}>{error}</p>)}</div></div>}
                <div className="policy-form-actions"><div><Icon name="info" size={17}/><span>Las modificaciones requieren publicación para entrar en vigor.</span></div><div className="policy-form-buttons"><button type="button" className="policy-button policy-button-ghost" disabled={!dirty} onClick={()=>setForm(toFields(active))}>Descartar</button><button type="button" className="policy-button policy-button-primary" disabled={!canPublish} onClick={()=>setConfirmOpen(true)}>Revisar cambios <Icon name="arrow" size={16}/></button></div></div>
              </div>
            </PolicyPanel>
            <PolicyPanel id="controles" className="policy-controls-panel"><div className="policy-panel-inner"><PolicyPanelHeading tag="02 / MANDATORY SAFEGUARDS" title="Controles esenciales" description="Condiciones que el agente nunca puede omitir para autorizar una factura." icon="shield"/><div className="policy-rule-list">
              <PolicyRule number="01" title="Detección de duplicados" description="Un mismo cobro no puede obtener dos autorizaciones." code="DUPLICATE_INVOICE" critical/>
              <PolicyRule number="02" title="Beneficiarios permitidos" description="Solo proveedores que estén en la lista autorizada." code="VENDOR_NOT_ALLOWED" critical/>
              <PolicyRule number="03" title="Coherencia contractual" description="El importe facturado debe respetar el acuerdo registrado." code="AGREEMENT_MISMATCH" critical/>
              <PolicyRule number="04" title="Límite absoluto" description="Un pago fuera del máximo se bloquea antes de solicitar aprobación." code="HARD_LIMIT_EXCEEDED" critical/>
              <PolicyRule number="05" title="Disponibilidad de presupuesto" description="No se autoriza si el periodo no tiene saldo disponible." code="BUDGET_INSUFFICIENT" critical/>
              <PolicyRule number="06" title="Calidad de la información" description="Ante un documento ambiguo, siempre se solicita revisión humana." code="LOW_CONFIDENCE" critical/>
            </div><div className="policy-controls-footer"><Icon name="lock" size={16}/><span>Protecciones no desactivables en el MVP de el semillero.</span></div></div></PolicyPanel>
          </div>
          <aside className="policy-right-col">
            <section className="policy-agent-card" aria-labelledby="policy-agent-title"><div className="policy-agent-orbit orbit-out"/><div className="policy-agent-orbit orbit-in"/><div className="policy-agent-core"><Icon name="shield" size={24}/></div><div className="policy-agent-top"><span><i/> GOVERNANCE STATUS</span><Icon name="more" size={19}/></div><div className="policy-agent-main"><small>PROTECTED BY DESIGN</small><h2 id="policy-agent-title">Libertad para operar.<br/><em>Límites para proteger.</em></h2><p>Cada decisión pasa por las políticas. La IA interpreta; las reglas autorizan.</p></div><div className="policy-agent-bottom"><span><Icon name="check" size={14}/> 6 SAFEGUARDS ENABLED</span><span>{active.version}</span></div></section>
            <div className="policy-logic-panel"><div className="policy-side-eyebrow">DECISION HIERARCHY / 03</div><h3>Una decisión.<br/><em>Tres salidas.</em></h3><div className="policy-flow-list"><div><span className="policy-flow-dot policy-flow-red"/><span><strong>01 / BLOQUEAR</strong><small>Si incumple una regla estricta</small></span><Icon name="lock" size={16}/></div><div><span className="policy-flow-dot policy-flow-amber"/><span><strong>02 / ESCALAR</strong><small>Si requiere revisión humana</small></span><Icon name="users" size={16}/></div><div><span className="policy-flow-dot policy-flow-green"/><span><strong>03 / AUTORIZAR</strong><small>Solo si todos los controles pasan</small></span><Icon name="check" size={16}/></div></div><p><Icon name="info" size={14}/> Las prohibiciones tienen prioridad sobre las aprobaciones.</p></div>
            <div className="policy-snapshot-card"><div className="policy-side-eyebrow">ACTIVE SNAPSHOT</div><div className="policy-snapshot-title"><span>Política publicada</span><Icon name="external" size={15}/></div><strong>{active.version}</strong><p>Los cambios publicados quedan registrados en el historial local.</p><Link href="#historial">Ver historial <Icon name="arrow" size={15}/></Link></div>
          </aside>
        </div>

        <section className="policy-test-section" id="simulador"><div className="policy-test-head"><div><PolicyEyebrow number="03">POLICY PLAYGROUND</PolicyEyebrow><h2>Prueba la regla.<br/><em>Antes de aplicarla.</em></h2><p>Comprueba cómo respondería el motor ante distintos escenarios de facturas sintéticas.</p></div><span className="policy-simulation-badge"><Icon name="bolt" size={14}/> LIVE DRAFT PREVIEW</span></div>
          <div className="policy-simulator-grid"><div className="policy-simulator-controls"><label htmlFor="policy-test-scenario">Escenario de prueba</label><select id="policy-test-scenario" value={selectedScenario} onChange={e=>pickScenario(e.target.value as Scenario)}>{scenarios.map(s=><option key={s.key} value={s.key}>{s.name} · {s.meta}</option>)}</select><label htmlFor="policy-test-amount">Importe ficticio a evaluar</label><div className="policy-sim-amount"><span>USD</span><input id="policy-test-amount" type="number" min="1" step="1" max="100000000" value={simulatedAmount} onChange={e=>setSimulatedAmount(e.target.value)}/></div><div className="policy-sim-context"><span>Beneficiario</span><strong>{currentInvoice.vendor}</strong><span>Moneda</span><strong>USD</strong><span>Origen</span><strong>PDF simulado</strong></div><p className="policy-sim-disclaimer">La vista previa es determinista y local. No procesa documentos ni ejecuta pagos.</p></div>
          <div className="policy-simulator-outcome"><div className="policy-sim-results-head"><span>RESULTADO DE LA EVALUACIÓN</span><span>RULE ENGINE / SANDBOX</span></div>{draftDecision?<><OutcomeBadge status={draftDecision.status}/><h3>{draftDecision.status==='authorized'?'Todos los controles se cumplen.':draftDecision.status==='blocked'?'Operación detenida por política.':'Se necesita una revisión humana.'}</h3><p>{draftDecision.reason}</p><div className="policy-sim-code"><span>CÓDIGO DE REGLA</span><strong>{draftDecision.ruleCode}</strong></div><div className="policy-sim-evidences">{draftDecision.checks.map(check=><span key={check}><Icon name="check" size={13}/>{check}</span>)}</div></>:<div className="policy-sim-invalid"><Icon name="alert" size={19}/> Corrige los valores de la política y de la factura para simular una decisión.</div>}<div className="policy-sim-compare"><div><span>POLÍTICA ACTIVA</span><strong>{activeDecision.status==='authorized'?'Autorizar':activeDecision.status==='blocked'?'Bloquear':'Escalar'}</strong></div><Icon name="arrow" size={16}/><div><span>BORRADOR</span><strong>{draftDecision?(draftDecision.status==='authorized'?'Autorizar':draftDecision.status==='blocked'?'Bloquear':'Escalar'):'—'}</strong></div></div></div></div>
        </section>

        <section className="policy-history-section" id="historial"><div className="policy-history-head"><div><PolicyEyebrow number="04">CHANGE TRACEABILITY</PolicyEyebrow><h2>Una política.<br/><em>Cada versión, registrada.</em></h2><p>Rastro visible de las modificaciones que se realizan en este entorno de demostración.</p></div><button type="button" className="policy-button policy-button-ghost" onClick={download}><Icon name="download" size={16}/> Descargar JSON</button></div>
          <div className="policy-history-card">{history.length===0?<div className="policy-history-empty"><span className="policy-history-icon"><Icon name="audit" size={21}/></span><div><strong>Versión inicial activa: {active.version}</strong><p>Aún no hay modificaciones guardadas desde este navegador. Publica un cambio para registrar su versión y campos actualizados.</p></div><span>BASELINE</span></div>:history.map((event,index)=><div className="policy-history-entry" key={event.id}><div className="policy-history-marker"><span/></div><div><div className="policy-history-entry-head"><strong>{event.version}</strong><span>{index===0?'VERSIÓN MÁS RECIENTE':'VERSIÓN ANTERIOR'}</span></div><p>{event.changes.map(change=>`${POLICY_FIELD_LABEL[change.field]}: ${money(change.previous)} → ${money(change.next)}`).join('  ·  ')}</p><small>{event.actor} · {new Date(event.at).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'})}</small></div><Icon name="check" size={17}/></div>)}</div>
        </section>
        <footer className="site-footer policy-footer"><span>© 2026 FINVIGIA DECISION ENGINE / POLICY GOVERNANCE</span><span>UN PRODUCTO CONCEPTUAL POR ZYRA <span className="footer-divider">·</span> SANDBOX / NO REAL PAYMENTS</span></footer>
      </div>
    </div>
    {confirmOpen&&<div className="policy-confirm-overlay" role="presentation"><div ref={dialogRef} tabIndex={-1} className="policy-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="policy-confirm-title"><button type="button" className="policy-confirm-close" aria-label="Cerrar revisión" onClick={()=>setConfirmOpen(false)}><Icon name="close" size={18}/></button><span className="policy-confirm-kicker"><Icon name="shield" size={17}/> POLICY CHANGE REVIEW</span><h2 id="policy-confirm-title">Confirma los límites<br/><em>antes de publicarlos.</em></h2><p>La nueva versión <strong>{newVersion}</strong> actualizará las reglas del sandbox para futuras evaluaciones. Las decisiones existentes conservarán sus resultados.</p><div className="policy-confirm-diff">{labels.filter(field=>draft[field]!==active[field]).map(field=><div key={field}><span>{POLICY_FIELD_LABEL[field]}</span><small>{money(active[field])}</small><Icon name="arrow" size={14}/><strong>{money(draft[field])}</strong></div>)}</div><div className="policy-confirm-notice"><Icon name="info" size={17}/> Solo se guardará en este navegador. No hay conexión a cuentas ni pagos reales.</div><div className="policy-confirm-actions"><button type="button" className="policy-button policy-button-ghost" onClick={()=>setConfirmOpen(false)}>Volver a editar</button><button type="button" className="policy-button policy-button-primary" onClick={publish}>Publicar versión <Icon name="check" size={16}/></button></div></div></div>}
    {toast&&<div className="toast" role="status"><Icon name="check" size={17}/><span>{toast}</span><button type="button" onClick={()=>setToast(null)} aria-label="Cerrar mensaje"><Icon name="close" size={15}/></button></div>}
  </AppShell>;
}
