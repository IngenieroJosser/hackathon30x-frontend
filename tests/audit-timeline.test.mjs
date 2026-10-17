import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAuditTimeline,auditCoverage,searchAuditEntries,exportAuditPayload} from '../src/lib/audit-timeline.ts';
import {assessHumanApproval} from '../src/lib/approval-workflow.ts';
import {previewInvoiceDecision,evaluateInvoiceSafely} from '../src/lib/invoice-processing.ts';
import {INITIAL_INVOICES,DEMO_POLICY} from '../src/lib/mock-data.ts';
import {DEMO_BENEFICIARIES} from '../src/lib/beneficiary-registry.ts';

const invoice=INITIAL_INVOICES[1];
const events=[
  {id:'e2',invoiceId:'inv-02',timestamp:'2026-10-17T13:30:00.000Z',action:'approved',actor:'Admin Finance · Sandbox',description:'Aprobado con revisión humana',ruleCode:'HUMAN_APPROVAL_GRANTED',reviewNote:'Contrato validado tras comprobar acuerdo.',policySnapshot:{...DEMO_POLICY}},
  {id:'e1',invoiceId:'inv-02',timestamp:'2026-10-17T13:20:00.000Z',action:'evaluated',actor:'Admin Finance · Sandbox',description:'Escalado por umbral',ruleCode:'APPROVAL_REQUIRED',policySnapshot:{...DEMO_POLICY}},
];
const policyEvents=[{id:'p1',at:'2026-10-17T13:15:00.000Z',actor:'Administrador financiero · Demo',version:'POL-2026.10 · v1.4',changes:[{field:'autonomousLimit',previous:1000,next:1200}]}];
const registryEvents=[{id:'b1',beneficiaryId:'ben-02',name:'Andes Cloud',action:'blocked',occurredAt:'2026-10-17T13:12:00.000Z',actor:'Admin Finance · Sandbox',previousStatus:'authorized',nextStatus:'blocked',revision:2}];
const all=()=>buildAuditTimeline(INITIAL_INVOICES,events,policyEvents,registryEvents);

test('timeline incorpora 4 fuentes sin fabricar eventos de las facturas precargadas',()=>{
  const timeline=all();
  assert.equal(timeline.length,2+1+1+(INITIAL_INVOICES.length-1));
  assert.equal(timeline.filter(e=>e.evidence==='recorded').length,4);
  assert.equal(timeline.filter(e=>e.evidence==='not-recorded').length,INITIAL_INVOICES.length-1);
  assert.equal(timeline[0].category,'approval');
  assert.equal(timeline[0].invoiceEvent.reviewNote,'Contrato validado tras comprobar acuerdo.');
});
test('timeline retiene snapshot histórico aunque cambie la política actual',()=>{
  const entry=all().find(e=>e.id==='invoice:e1');
  assert.equal(entry.invoiceEvent.policySnapshot.autonomousLimit,1000);
  assert.equal(policyEvents[0].changes[0].next,1200);
});
test('el buscador consulta regla, actor y beneficiario y filtra categorías',()=>{
  assert.equal(searchAuditEntries(all(),'APPROVAL_REQUIRED','invoice').length,1);
  assert.equal(searchAuditEntries(all(),'Andes Cloud','approval').length,1);
  assert.equal(searchAuditEntries(all(),'beneficiario','beneficiary').length,1);
  assert.equal(searchAuditEntries(all(),'bloqueado','beneficiary').length,1);
});
test('la cobertura usa únicamente eventos verdaderamente registrados',()=>{
  const coverage=auditCoverage(INITIAL_INVOICES,events);
  assert.equal(coverage.covered,1);
  assert.equal(coverage.missing,INITIAL_INVOICES.length-1);
  assert.equal(coverage.percent,8);
});
test('exportación identifica claramente que el registro es local y editable',()=>{
  const payload=exportAuditPayload(all(),auditCoverage(INITIAL_INVOICES,events),DEMO_POLICY.version);
  assert.equal(payload.realPaymentsExecuted,false);
  assert.equal(payload.tamperProof,false);
  assert.equal(payload.historicalCompleteness,false);
  assert.equal(payload.records.length,all().length);
});
test('previsualizar una autorización no lee el reloj durante render',()=>{
  const BaseDate=Date;
  class GuardedDate extends BaseDate {
    constructor(...args){if(args.length===0)throw new Error('new Date() invocado durante render');super(...args);}
  }
  globalThis.Date=GuardedDate;
  try{
    const result=assessHumanApproval(invoice,INITIAL_INVOICES,DEMO_POLICY,DEMO_BENEFICIARIES);
    assert.equal(result.eligible,true);
    assert.equal(result.candidate.ruleCode,'APPROVAL_REQUIRED');
    assert.equal(result.candidate.evaluatedAt,undefined);
  }finally{globalThis.Date=BaseDate;}
});
test('registrar una evaluación explícita mantiene una fecha auditable',()=>{
  const stamp='2026-10-17T10:00:00.000Z';
  const result=evaluateInvoiceSafely(invoice,INITIAL_INVOICES.filter(x=>x.id!==invoice.id),DEMO_POLICY,DEMO_BENEFICIARIES,stamp);
  assert.equal(result.evaluatedAt,stamp);
  assert.equal(previewInvoiceDecision(invoice,INITIAL_INVOICES.filter(x=>x.id!==invoice.id),DEMO_POLICY,DEMO_BENEFICIARIES).evaluatedAt,undefined);
});
test('la compilación del timeline no cambia la entrada ni requiere acceso al navegador',()=>{
  const copy=structuredClone(INITIAL_INVOICES);
  const a=all().map(x=>x.id), b=all().map(x=>x.id);
  assert.deepEqual(a,b);assert.deepEqual(INITIAL_INVOICES,copy);
});
