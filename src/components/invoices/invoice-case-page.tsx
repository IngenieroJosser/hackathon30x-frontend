'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {AppShell} from '@/components/layout/app-shell';
import {Icon} from '@/components/ui/icon';
import {StatusPill} from '@/components/ui/status-pill';
import {getDemoPolicy} from '@/lib/policy-store';
import {getDemoBeneficiaries} from '@/lib/beneficiary-registry';
import {getInvoices,getInvoiceEvents,INVOICE_UPDATED_EVENT,verifyAndEvaluate} from '@/lib/invoice-registry';
import {normalizeDate,parseAmount,sanitizeDraft,validateDraftForReview} from '@/lib/invoice-processing';
import {money,shortDate} from '@/lib/format';
import type {Invoice} from '@/types/payments';
import type {InvoiceAuditEvent,InvoiceDraft} from '@/types/invoice-workflow';
import {InvoiceHero} from './invoice-hero';

const emptyEvidence:InvoiceDraft['evidence']={number:'',vendor:'',amount:'',currency:'',dueDate:''};
const verdictText={authorized:'Autorizada en simulación',blocked:'Bloqueada por política',pending:'Requiere intervención humana',unprocessed:'Pendiente de verificación'};
const stages=['Captura','Extracción','Verificación','Decisión'];
function draftFrom(invoice:Invoice):InvoiceDraft{return {
  number:invoice.number==='PENDIENTE'?'':invoice.number,vendor:invoice.vendor==='SIN IDENTIFICAR'?'':invoice.vendor,
  amount:invoice.amount>0?invoice.amount:null,currency:invoice.currency==='N/D'?'':invoice.currency,dueDate:invoice.dueDate,issueDate:invoice.issuedAt??'',description:invoice.description??'',method:invoice.document?.extractionMethod??'demo',warnings:invoice.document?.warnings??[],evidence:invoice.document?.evidence??emptyEvidence,
};}
function downloadJSON(invoice:Invoice,events:InvoiceAuditEvent[]){
  const content=JSON.stringify({environment:'SANDBOX',paymentExecution:false,generatedAt:new Date().toISOString(),invoice,audit:events},null,2);
  const href=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=href;a.download=`${invoice.number.replace(/[^a-z0-9-_]/gi,'_')}-audit.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),100);
}

export function InvoiceCasePage({invoiceId}:{invoiceId:string}){
  const router=useRouter();
  const [invoice,setInvoice]=useState<Invoice|null>(null);
  const [events,setEvents]=useState<InvoiceAuditEvent[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [draft,setDraft]=useState<InvoiceDraft|null>(null);
  const [amountText,setAmountText]=useState('');
  const [notice,setNotice]=useState('');
  const [errors,setErrors]=useState<string[]>([]);
  const [working,setWorking]=useState(false);
  useEffect(()=>{
    const reload=()=>{const current=getInvoices().find(x=>x.id===invoiceId)??null;setInvoice(current);if(current){setDraft(draftFrom(current));setAmountText(current.amount>0?String(current.amount):'');}setEvents(getInvoiceEvents().filter(e=>e.invoiceId===invoiceId));setLoaded(true);};
    const frame=requestAnimationFrame(reload);window.addEventListener(INVOICE_UPDATED_EVENT,reload);window.addEventListener('storage',reload);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener(INVOICE_UPDATED_EVENT,reload);window.removeEventListener('storage',reload);};
  },[invoiceId]);
  const activePolicy=getDemoPolicy();
  const beneficiary=useMemo(()=>invoice?getDemoBeneficiaries().find(x=>x.name.normalize('NFKD').toLowerCase()===invoice.vendor.normalize('NFKD').toLowerCase()):undefined,[invoice]);
  const editable=invoice?.status==='unprocessed';
  const setValue=(field:keyof Pick<InvoiceDraft,'number'|'vendor'|'amount'|'currency'|'dueDate'|'issueDate'|'description'>,value:string)=>{
    if(!draft)return;
    if(field==='amount')setAmountText(value);
    setDraft({...draft,[field]:field==='amount'?parseAmount(value):value});setErrors([]);
  };
  const process=()=>{
    if(!invoice||!draft||working)return;
    const cleaned=sanitizeDraft({...draft,warnings:draft.warnings.filter(x=>!x.toLowerCase().includes('falta'))});
    const found=validateDraftForReview(cleaned);setErrors(found);if(found.length)return;
    setWorking(true);
    try{const outcome=verifyAndEvaluate(invoice.id,cleaned,{policy:activePolicy,beneficiaries:getDemoBeneficiaries()});setInvoice(outcome);setDraft(draftFrom(outcome));setAmountText(String(outcome.amount));setNotice(`Evaluación completada: ${verdictText[outcome.status]}.`);}
    catch(error){setNotice(error instanceof Error?error.message:'No se pudo evaluar la factura.');}
    finally{setWorking(false);}
  };
  if(!loaded)return <AppShell currentPage="invoice-detail" alerts={0} onPendingClick={()=>router.push('/aprobaciones')} onSearchClick={()=>router.push('/facturas')}><div className="iv-loading">Abriendo expediente…</div></AppShell>;
  if(!invoice)return <AppShell currentPage="invoice-detail" alerts={0} onPendingClick={()=>router.push('/aprobaciones')} onSearchClick={()=>router.push('/facturas')}><div className="iv-not-found"><Icon name="file" size={38}/><span className="iv-kicker">404 / INVOICE NOT FOUND</span><h1>Este expediente no existe.</h1><p>Comprueba el identificador o regresa al centro documental.</p><Link className="iv-button iv-button-primary" href="/facturas">Volver a facturas <Icon name="arrow" size={16}/></Link></div></AppShell>;
  return <AppShell currentPage="invoice-detail" alerts={getInvoices().filter(x=>x.status==='pending').length} onPendingClick={()=>router.push('/aprobaciones')} onSearchClick={()=>router.push('/facturas')}>
    <div className="iv-page"><InvoiceHero mode="detail"/>
      <div className="iv-container iv-case-wrap"><div className="iv-case-breadcrumb"><Link href="/facturas">Facturas</Link><Icon name="chevron" size={13}/><span>{invoice.number}</span><span className="iv-case-breadcrumb-id">CASE / {invoice.id.slice(0,11)}</span></div>
        <div className="iv-case-header"><div><span className="iv-kicker">EXPEDIENTE FINANCIERO / SANDBOX</span><h2>{invoice.number}<span>.</span></h2><p>{invoice.vendor} · {invoice.document?.fileName??'Dataset sintético'} · {invoice.source}</p></div><div className="iv-case-header-actions"><StatusPill status={invoice.status}/><button type="button" className="iv-button iv-button-outline" onClick={()=>downloadJSON(invoice,events)}><Icon name="download" size={15}/> Evidencia JSON</button></div></div>
        <div className="iv-case-progress" aria-label="Etapas del expediente">{stages.map((stage,i)=><div key={stage} className={i<2||invoice.status!=='unprocessed'?'is-complete':i===2?'is-current':''}><span>{i<2||invoice.status!=='unprocessed'?<Icon name="check" size={13}/>:String(i+1).padStart(2,'0')}</span><div><strong>{stage}</strong><small>{i===0?'Documento recibido':i===1?'Datos estructurados':i===2?'Confirmación humana':'Reglas y resultado'}</small></div></div>)}</div>
        {notice&&<div className="iv-notice" role="status"><Icon name="info" size={16}/>{notice}<button type="button" onClick={()=>setNotice('')} aria-label="Cerrar aviso"><Icon name="close" size={15}/></button></div>}
        <div className="iv-case-grid"><section className="iv-case-document"><div className="iv-case-panel-head"><span className="iv-kicker">01 / SOURCE DOCUMENT</span><Icon name="file" size={18}/></div><div className="iv-paper"><div className="iv-paper-head"><div className="iv-paper-logo">B<span>.</span></div><span>DOCUMENT INTELLIGENCE / 30X</span></div><div className="iv-paper-line"/><span className="iv-paper-super">INVOICE EXTRACT</span><h3>{invoice.number}</h3><div className="iv-paper-table"><div><span>BENEFICIARIO</span><strong>{invoice.vendor}</strong></div><div><span>MONEDA</span><strong>{invoice.currency}</strong></div><div><span>FECHA LÍMITE</span><strong>{invoice.dueDate?shortDate(invoice.dueDate):'Sin verificar'}</strong></div><div><span>DOCUMENTO</span><strong>{invoice.document?.fileName??'Fixture sintético'}</strong></div></div><div className="iv-paper-total"><span>IMPORTE DETECTADO</span><strong>{invoice.amount>0?money(invoice.amount):'—'} <small>{invoice.currency}</small></strong></div><div className="iv-paper-bottom">VISTA ESTRUCTURADA DE DATOS<br/>NO ES LA FACTURA ORIGINAL</div></div><div className="iv-document-notice"><Icon name="lock" size={15}/><span>{invoice.document?'El archivo original no se almacena ni se reproduce después de la extracción. Se conservan metadatos y evidencias breves.':'Este expediente se originó en el dataset ficticio inicial.'}</span></div>
          <div className="iv-document-facts"><div><span>ORIGEN</span><strong>{invoice.source}</strong></div><div><span>EXTRACCIÓN</span><strong>{invoice.document?.extractionMethod??'Dataset demo'}</strong></div><div><span>INTEGRIDAD SHA-256</span><strong title={invoice.document?.fingerprint??'No disponible'}>{invoice.document?`${invoice.document.fingerprint.slice(0,16)}…`:'—'}</strong></div><div><span>REGISTRADO</span><strong>{new Date(invoice.receivedAt).toLocaleDateString('es-CO')}</strong></div></div></section>
          <section className="iv-case-verification"><div className="iv-case-panel-head"><span className="iv-kicker">02 / DATA VERIFICATION</span><span className={`iv-verification-tag ${editable?'iv-verification-pending':''}`}><i/>{editable?'REQUIERE CONFIRMACIÓN':'CAMPOS REGISTRADOS'}</span></div><h3>Datos bajo <em>control.</em></h3><p className="iv-panel-intro">{editable?'Revisa y corrige la información antes de pedirle al motor que evalúe el pago.':'Datos utilizados para la decisión. Cambios posteriores requieren un nuevo flujo de revisión.'}</p>
            {draft&&<div className="iv-case-form"><div className="iv-case-field"><label htmlFor="case-number">Número de factura *</label><input id="case-number" value={draft.number} disabled={!editable} onChange={e=>setValue('number',e.target.value)} placeholder="INV-2026-XXXX"/>{editable&&draft.evidence.number&&<small>Fuente: {draft.evidence.number}</small>}</div><div className="iv-case-field"><label htmlFor="case-vendor">Beneficiario *</label><input id="case-vendor" list="iv-beneficiaries" value={draft.vendor} disabled={!editable} onChange={e=>setValue('vendor',e.target.value)} placeholder="Empresa o contratista"/><datalist id="iv-beneficiaries">{getDemoBeneficiaries().map(b=><option key={b.id} value={b.name}/>)}</datalist>{editable&&draft.evidence.vendor&&<small>Fuente: {draft.evidence.vendor}</small>}</div><div className="iv-case-row"><div className="iv-case-field"><label htmlFor="case-amount">Importe *</label><input id="case-amount" type="number" inputMode="decimal" step="0.01" min="0.01" value={editable?amountText:(draft.amount??'')} disabled={!editable} onChange={e=>setValue('amount',e.target.value)} placeholder="0.00"/></div><div className="iv-case-field"><label htmlFor="case-currency">Moneda ISO *</label><select id="case-currency" value={draft.currency} disabled={!editable} onChange={e=>setValue('currency',e.target.value)}><option value="">Seleccionar</option>{['USD','COP','MXN','EUR','BRL','ARS','CLP','PEN'].map(cur=><option key={cur} value={cur}>{cur}</option>)}</select></div></div><div className="iv-case-row"><div className="iv-case-field"><label htmlFor="case-due">Vencimiento *</label><input id="case-due" type="date" value={normalizeDate(draft.dueDate)} disabled={!editable} onChange={e=>setValue('dueDate',e.target.value)}/></div><div className="iv-case-field"><label htmlFor="case-issued">Emisión</label><input id="case-issued" type="date" value={normalizeDate(draft.issueDate)} disabled={!editable} onChange={e=>setValue('issueDate',e.target.value)}/></div></div><div className="iv-case-field"><label htmlFor="case-desc">Concepto / descripción</label><textarea id="case-desc" rows={3} maxLength={350} value={draft.description} disabled={!editable} onChange={e=>setValue('description',e.target.value)} placeholder="Concepto de cobro (opcional)"/></div></div>}
            {!!errors.length&&<div className="iv-case-errors" role="alert">{errors.map((error,i)=><p key={i}><Icon name="alert" size={14}/>{error}</p>)}</div>}
            {editable?<div className="iv-verify-footer"><div><Icon name="alert" size={16}/><span>La IA no tiene autoridad para aprobar pagos. Confirma los datos del documento antes de la evaluación.</span></div><button type="button" className="iv-button iv-button-primary" onClick={process} disabled={working}><Icon name="shield" size={16}/>{working?'Evaluando…':'Confirmar y evaluar'}<Icon name="arrow" size={15}/></button></div>:<div className="iv-verified-note"><Icon name="check" size={17}/><span>Expediente evaluado · {invoice.policyVersion??'Política de prueba'}</span></div>}
          </section>
          <aside className="iv-case-decision"><div className="iv-case-panel-head"><span className="iv-kicker">03 / AUTONOMOUS REASONING</span><Icon name="bolt" size={18}/></div><div className={`iv-verdict iv-verdict-${invoice.status}`}><span>RESULTADO DE LA EVALUACIÓN</span><div><Icon name={invoice.status==='authorized'?'check':invoice.status==='blocked'?'lock':'clock'} size={25}/></div><h3>{verdictText[invoice.status]}</h3><p>{invoice.reason}</p></div><div className="iv-decision-section"><span className="iv-kicker">RULE / POLICY SNAPSHOT</span><dl><div><dt>Regla principal</dt><dd>{invoice.ruleCode||'SIN EVALUAR'}</dd></div><div><dt>Política asociada</dt><dd>{invoice.policyVersion??'Pendiente'}</dd></div><div><dt>Beneficiario</dt><dd>{beneficiary?.status??'No registrado'}</dd></div><div><dt>Límite autónomo actual</dt><dd>{money(activePolicy.autonomousLimit)}</dd></div></dl></div><div className="iv-decision-section"><span className="iv-kicker">EVALUATION EVIDENCE</span><div className="iv-check-list">{invoice.checks.map((check,i)=><div key={`${check}-${i}`}><Icon name={invoice.status==='blocked'&&i===0?'alert':'check'} size={14}/><span>{check}</span></div>)}</div></div>
            {invoice.status==='pending'&&<div className="iv-human-actions"><span className="iv-kicker">HUMAN IN THE LOOP</span><p>Las aprobaciones se resuelven en el centro de supervisión, con motivo escrito y una nueva evaluación de seguridad.</p><Link className="iv-button iv-button-primary" href={`/aprobaciones?invoice=${encodeURIComponent(invoice.id)}`}><Icon name="users" size={15}/> Abrir centro de aprobaciones</Link></div>}
          </aside></div>
        <section className="iv-case-audit"><div className="iv-case-audit-top"><div><span className="iv-kicker">04 / DECISION CHAIN</span><h2>Cada paso deja <em>evidencia.</em></h2></div><span>{events.length} eventos locales</span></div><div className="iv-case-audit-events">{events.length?events.slice().reverse().map((entry,i)=><div className="iv-case-event" key={entry.id}><span className="iv-case-event-num">{String(i+1).padStart(2,'0')}</span><div><strong>{entry.description}</strong><p>{entry.action.toUpperCase()} · {entry.actor} · {entry.ruleCode??'SIN REGLA'}</p><time dateTime={entry.timestamp}>{new Date(entry.timestamp).toLocaleString('es-CO')}</time>{entry.policySnapshot&&<small>Política {entry.policySnapshot.version} · Autonomía {money(entry.policySnapshot.autonomousLimit)} · Máximo {money(entry.policySnapshot.hardLimit)}</small>}{entry.beneficiarySnapshot&&<small>Beneficiario {entry.beneficiarySnapshot.id} / r{entry.beneficiarySnapshot.revision} · {entry.beneficiarySnapshot.status}</small>}</div></div>):<div className="iv-case-audit-empty"><Icon name="info" size={17}/> Fixture anterior a la persistencia de eventos. El resultado sigue visible en el expediente.</div>}</div></section>
        <footer className="site-footer iv-footer"><span>FINVIGIA / FINANCIAL CONTROL · NO REAL PAYMENTS</span><span>DOCUMENT AI · POLICY ENGINE · HUMAN OVERSIGHT</span></footer>
      </div>
    </div>
  </AppShell>;
}
