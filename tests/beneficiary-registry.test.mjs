import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_BENEFICIARIES, normalName, validateBeneficiary, invoiceWithBeneficiary } from '../src/lib/beneficiary-registry.ts';
import { evaluateDemoInvoice } from '../src/lib/decision-engine.ts';
const input={name:'Nueva Agencia',country:'Colombia',category:'Tecnología',agreementReference:'AGR-NEW-01',agreementLimit:800,contactEmail:'',notes:''};
const policy={version:'test',autonomousLimit:1000,hardLimit:5000,monthlyBudget:20000,currency:'USD'};
const invoice={id:'sample',number:'INV-TEST-001',vendor:'Nexa Software',vendorInitials:'NX',country:'Colombia',countryCode:'CO',category:'Software',amount:620,currency:'USD',dueDate:'2026-10-20',receivedAt:'2026-10-17',status:'unprocessed',reason:'',ruleCode:'',checks:[],source:'PDF',confidence:'high',approvedVendor:false};
test('semilla sintética con estados diferenciados',()=>{
  assert.ok(DEMO_BENEFICIARIES.some(b=>b.status==='authorized'));
  assert.ok(DEMO_BENEFICIARIES.some(b=>b.status==='review'));
  assert.ok(DEMO_BENEFICIARIES.some(b=>b.status==='blocked'));
});
test('normaliza acentos, espacios y capitalización',()=>{
  assert.equal(normalName('  Soluciones  Río '),'soluciones rio');
});
test('rechaza beneficiarios duplicados incluso con cambio de mayúsculas',()=>{
  assert.ok(validateBeneficiary({...input,name:'  northstar   STUDIO '},DEMO_BENEFICIARIES).name);
});
test('rechaza acuerdos con importes inválidos',()=>{
  assert.ok(validateBeneficiary({...input,agreementLimit:0},DEMO_BENEFICIARIES).agreementLimit);
  assert.ok(validateBeneficiary({...input,agreementLimit:Infinity},DEMO_BENEFICIARIES).agreementLimit);
  assert.ok(validateBeneficiary({...input,agreementLimit:12.5},DEMO_BENEFICIARIES).agreementLimit);
});
test('acepta formulario limpio',()=>{
  assert.deepEqual(validateBeneficiary(input,DEMO_BENEFICIARIES),{});
});
test('una factura con proveedor autorizado conserva límite del acuerdo del directorio',()=>{
  const enriched=invoiceWithBeneficiary(invoice,DEMO_BENEFICIARIES);
  assert.equal(enriched.approvedVendor,true);
  assert.equal(enriched.agreementLimit,850);
  assert.equal(evaluateDemoInvoice(enriched,policy,20000).status,'authorized');
});
test('un beneficiario en revisión no puede recibir autorización autónoma',()=>{
  const enriched=invoiceWithBeneficiary({...invoice,vendor:'Estudio Aurora'},DEMO_BENEFICIARIES);
  assert.equal(evaluateDemoInvoice(enriched,policy,20000).ruleCode,'VENDOR_NOT_ALLOWED');
});
test('un beneficiario bloqueado no puede recibir autorización autónoma',()=>{
  const enriched=invoiceWithBeneficiary({...invoice,vendor:'Delta Networks'},DEMO_BENEFICIARIES);
  assert.equal(evaluateDemoInvoice(enriched,policy,20000).status,'blocked');
});
test('un cambio de estado en memoria altera la decisión de la siguiente factura',()=>{
  const blocked=DEMO_BENEFICIARIES.map(b=>b.name==='Nexa Software'?{...b,status:'blocked'}:b);
  const checked=invoiceWithBeneficiary(invoice,blocked);
  assert.equal(evaluateDemoInvoice(checked,policy,20000).ruleCode,'VENDOR_NOT_ALLOWED');
});
test('un aumento de factura fuera del acuerdo provoca bloqueo aunque el proveedor esté autorizado',()=>{
  const checked=invoiceWithBeneficiary({...invoice,amount:1000},DEMO_BENEFICIARIES);
  assert.equal(evaluateDemoInvoice(checked,policy,20000).ruleCode,'AGREEMENT_MISMATCH');
});

test('ciclo de alta, aprobación y revalidación obligatoria tras modificar el acuerdo',async()=>{
  const memory=new Map();
  globalThis.window={localStorage:{getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,v)},dispatchEvent:()=>{}};
  globalThis.CustomEvent=class CustomEvent{constructor(type){this.type=type;}};
  const {saveDemoBeneficiary,setDemoBeneficiaryStatus,getDemoBeneficiaries,getRegistryEvents}=await import('../src/lib/beneficiary-registry.ts');
  const created=saveDemoBeneficiary(input);
  assert.equal(created.status,'review');
  assert.equal(getDemoBeneficiaries().find(b=>b.id===created.id).status,'review');
  const approved=setDemoBeneficiaryStatus(created.id,'authorized');
  assert.equal(approved.status,'authorized');
  const updated=saveDemoBeneficiary({...input,agreementLimit:900},created.id);
  assert.equal(updated.status,'review');
  assert.equal(updated.revision,3);
  assert.equal(getRegistryEvents().length,3);
  assert.equal(getRegistryEvents()[0].action,'updated');
  delete globalThis.window;
  delete globalThis.CustomEvent;
});

test('una edición de notas sin cambiar términos no revoca autorización',async()=>{
  const memory=new Map();
  globalThis.window={localStorage:{getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,v)},dispatchEvent:()=>{}};
  globalThis.CustomEvent=class CustomEvent{constructor(type){this.type=type;}};
  const {saveDemoBeneficiary,setDemoBeneficiaryStatus}=await import('../src/lib/beneficiary-registry.ts');
  const created=saveDemoBeneficiary(input);
  setDemoBeneficiaryStatus(created.id,'authorized');
  const updated=saveDemoBeneficiary({...input,notes:'Aclaración interna'},created.id);
  assert.equal(updated.status,'authorized');
  delete globalThis.window;
  delete globalThis.CustomEvent;
});
