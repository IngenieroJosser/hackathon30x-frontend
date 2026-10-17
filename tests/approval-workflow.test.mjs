import test from 'node:test';
import assert from 'node:assert/strict';
import {assessHumanApproval,validateReviewNote} from '../src/lib/approval-workflow.ts';
import {DEMO_BENEFICIARIES,REGISTRY_KEY} from '../src/lib/beneficiary-registry.ts';
import {DEMO_POLICY,INITIAL_INVOICES} from '../src/lib/mock-data.ts';
import {getInvoices,resolveInvoice,getInvoiceEvents,INVOICE_STORE_KEY,INVOICE_EVENT_KEY} from '../src/lib/invoice-registry.ts';

const data=new Map();
const storage={getItem(key){return data.get(key)??null;},setItem(key,value){data.set(key,String(value));},removeItem(key){data.delete(key);}};
globalThis.localStorage=storage;
globalThis.window={localStorage:storage,dispatchEvent() {}};
globalThis.CustomEvent=class CustomEvent{constructor(type){this.type=type;}};
const seeded=()=>INITIAL_INVOICES.map(x=>({...x}));
const inspect=(items=seeded(),policy=DEMO_POLICY,beneficiaries=DEMO_BENEFICIARIES)=>assessHumanApproval(items.find(x=>x.id==='inv-02'),items,policy,beneficiaries);

test('una factura elegible se escala: el motor no la autoriza por sí solo',()=>{
  const result=inspect();
  assert.equal(result.eligible,true);
  assert.equal(result.candidate.ruleCode,'APPROVAL_REQUIRED');
  assert.equal(result.candidate.status,'pending');
});
test('las justificaciones humanas requieren 12 a 500 caracteres',()=>{
  assert.match(validateReviewNote('No cumple'),/12 caracteres/);
  assert.equal(validateReviewNote('Revisé presupuesto y acuerdo vigente.'),null);
  assert.match(validateReviewNote('x'.repeat(501)),/500 caracteres/);
});
test('el cambio de límite absoluto impide una autorización humana',()=>{
  const result=inspect(seeded(),{...DEMO_POLICY,hardLimit:2100});
  assert.equal(result.eligible,false);
  assert.equal(result.candidate.ruleCode,'HARD_LIMIT_EXCEEDED');
});
test('el bloqueo de un beneficiario revoca la elegibilidad',()=>{
  const beneficiaries=DEMO_BENEFICIARIES.map(b=>b.id==='ben-02'?{...b,status:'blocked'}:b);
  const result=inspect(seeded(),DEMO_POLICY,beneficiaries);
  assert.equal(result.eligible,false);
  assert.equal(result.candidate.ruleCode,'VENDOR_NOT_ALLOWED');
});
test('el consumo adicional del presupuesto impide autorización',()=>{
  const items=[...seeded(),{...seeded()[1],id:'fiction-extra',number:'EX-222',amount:19800,status:'authorized',ruleCode:'ALL_POLICIES_PASSED'}];
  const result=inspect(items);
  assert.equal(result.eligible,false);
  assert.equal(result.candidate.ruleCode,'BUDGET_INSUFFICIENT');
});
test('un duplicado con otro identificador de documento bloquea aprobación',()=>{
  const source=seeded()[1];
  const items=[...seeded(),{...source,id:'fake-clone',status:'authorized'}];
  assert.equal(inspect(items).candidate.ruleCode,'DUPLICATE_INVOICE');
  assert.equal(inspect(items).eligible,false);
});
test('la revisión documental incompleta no permite aprobación manual',()=>{
  const items=seeded().map(item=>item.id==='inv-02'?{...item,document:{fileName:'test.pdf'},verified:false}:item);
  assert.equal(inspect(items).eligible,false);
  assert.match(inspect(items).reasons.join(' '),/verificación humana/);
});
test('revela modificaciones de políticas sin alterar la decisión original',()=>{
  const result=inspect(seeded(),{...DEMO_POLICY,version:'POL-2026.10 · v1.4'});
  assert.equal(result.policyChanged,true);
  assert.equal(result.eligible,true);
});
test('rechaza una aprobación sin justificación y no escribe eventos',()=>{
  data.clear();
  assert.throws(()=>resolveInvoice('inv-02',true,''),/12 caracteres/);
  assert.equal(getInvoiceEvents().length,0);
  assert.equal(getInvoices().find(x=>x.id==='inv-02').status,'pending');
});
test('la aprobación se registra una vez, con motivo, actor y snapshots',()=>{
  data.clear();
  const value=resolveInvoice('inv-02',true,'Confirmo que el importe coincide con el contrato firmado.');
  assert.equal(value.status,'authorized');
  assert.equal(value.ruleCode,'HUMAN_APPROVAL_GRANTED');
  assert.match(value.reviewNote,/contrato firmado/);
  assert.ok(value.reviewedAt);
  const audit=getInvoiceEvents().find(e=>e.invoiceId==='inv-02'&&e.action==='approved');
  assert.ok(audit);
  assert.equal(audit.reviewNote,value.reviewNote);
  assert.equal(audit.policySnapshot.version,DEMO_POLICY.version);
  assert.equal(audit.beneficiarySnapshot.id,'ben-02');
  assert.throws(()=>resolveInvoice('inv-02',true,'Otra vez confirmo que lo autorizo.'),/ya no está pendiente/);
});
test('el rechazo conserva motivo y hace imposible una aprobación posterior',()=>{
  data.clear();
  const value=resolveInvoice('inv-03',false,'No aceptamos el cobro por diferencia contractual.');
  assert.equal(value.status,'blocked');
  assert.equal(value.ruleCode,'HUMAN_APPROVAL_REJECTED');
  assert.match(value.reason,/diferencia contractual/);
  assert.throws(()=>resolveInvoice('inv-03',true,'Intento autorizarla posteriormente.'),/ya no está pendiente/);
});
test('las políticas vigentes pueden revocar elegibilidad entre vista y clic',()=>{
  data.clear();
  assert.equal(inspect().eligible,true);
  storage.setItem(REGISTRY_KEY,JSON.stringify(DEMO_BENEFICIARIES.map(b=>b.id==='ben-02'?{...b,status:'blocked'}:b)));
  assert.throws(()=>resolveInvoice('inv-02',true,'Revisé el expediente y el contrato vigente.'),/No se puede aprobar/);
  assert.equal(getInvoices().find(x=>x.id==='inv-02').status,'pending');
  assert.equal(getInvoiceEvents().length,0);
});
test('si falta presupuesto al confirmar, la acción no se persiste',()=>{
  data.clear();
  const excess={...seeded()[0],id:'budget-consumer',number:'XX-9001',amount:19900,status:'authorized'};
  storage.setItem(INVOICE_STORE_KEY,JSON.stringify([...seeded(),excess]));
  assert.throws(()=>resolveInvoice('inv-02',true,'Confirmo manualmente el servicio prestado.'),/No se puede aprobar/);
  assert.equal(getInvoiceEvents().length,0);
});
