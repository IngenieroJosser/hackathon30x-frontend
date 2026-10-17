import test from 'node:test';
import assert from 'node:assert/strict';
import {heuristicTextExtraction,parseAmount,findDuplicate,normalizeDate,sanitizeDraft,validateDraftForReview,validateUpload,evaluateInvoiceSafely} from '../src/lib/invoice-processing.ts';
import {DEMO_POLICY,INITIAL_INVOICES} from '../src/lib/mock-data.ts';
import {DEMO_BENEFICIARIES} from '../src/lib/beneficiary-registry.ts';

const text=`Factura: SYN-2026-991\nProveedor: Nexa Software\nFecha de vencimiento: 28/10/2026\nMoneda: USD\nTotal: 620.00`;
const base={...INITIAL_INVOICES[0],id:'new-fixture',number:'TEST-99',vendor:'Nexa Software',amount:620,currency:'USD',status:'unprocessed',duplicateOf:undefined,confidence:'high'};
test('interpreta texto sintético y exige verificación',()=>{
  const d=heuristicTextExtraction(text);
  assert.equal(d.number,'SYN-2026-991');assert.equal(d.vendor,'Nexa Software');assert.equal(d.amount,620);assert.equal(d.dueDate,'2026-10-28');assert.equal(d.currency,'USD');assert.ok(d.warnings.length);
});
test('normaliza fechas y no permite rollover de febrero',()=>{
  assert.equal(normalizeDate('2026-02-29'),'');assert.equal(normalizeDate('29/02/2028'),'2028-02-29');assert.equal(normalizeDate('13/10/2026'),'2026-10-13');
});
test('importe admite hasta 2 decimales y separadores coherentes',()=>{
  assert.equal(parseAmount('US$ 1,234.50'),1234.5);assert.equal(parseAmount('1.234,50'),1234.5);assert.equal(parseAmount(0.29),.29);assert.equal(parseAmount('1,23,4'),null);assert.equal(parseAmount('-50'),null);
});
test('rechaza PDF demasiado grande y archivos ajenos',()=>{
  assert.ok(validateUpload({name:'invoice.pdf',type:'application/pdf',size:6*1024*1024}));
  assert.ok(validateUpload({name:'attack.svg',type:'image/svg+xml',size:200}));
  assert.equal(validateUpload({name:'invoice.png',type:'image/png',size:1800}),null);
});
test('no inventa campos obligatorios ausentes',()=>{
  const d=sanitizeDraft({vendor:'',number:'',amount:null,currency:'',dueDate:'',method:'manual'});
  assert.ok(validateDraftForReview(d).length>=4);
});
test('detecta duplicado por proveedor y número normalizados',()=>{
  const duplicate=findDuplicate({id:'new',vendor:'NORTHSTAR STUDIO',number:'inv 2026 1042'},INITIAL_INVOICES);
  assert.equal(duplicate?.id,'inv-01');
});
test('autoriza factura válida con beneficiario autorizado y política',()=>{
  const checked=evaluateInvoiceSafely(base,INITIAL_INVOICES,DEMO_POLICY,DEMO_BENEFICIARIES);
  assert.equal(checked.status,'authorized');assert.equal(checked.beneficiaryRevision,'ben-12/r1');
});
test('no autoriza beneficiario no aprobado',()=>{
  const checked=evaluateInvoiceSafely({...base,vendor:'Estudio Aurora'},INITIAL_INVOICES,DEMO_POLICY,DEMO_BENEFICIARIES);
  assert.equal(checked.ruleCode,'VENDOR_NOT_ALLOWED');
});
test('moneda fuera USD se escala, nunca se compara directamente como dólares',()=>{
  const checked=evaluateInvoiceSafely({...base,currency:'COP'},INITIAL_INVOICES,DEMO_POLICY,DEMO_BENEFICIARIES);
  assert.equal(checked.ruleCode,'CURRENCY_REVIEW_REQUIRED');assert.equal(checked.status,'pending');
});
test('duplicado bloqueado tiene prioridad sobre aprobación humana',()=>{
  const checked=evaluateInvoiceSafely({...base,number:'INV-2026-1042',vendor:'Northstar Studio',amount:1800},INITIAL_INVOICES,DEMO_POLICY,DEMO_BENEFICIARIES);
  assert.equal(checked.ruleCode,'DUPLICATE_INVOICE');
});
test('documento ambiguo no se autoriza',()=>{
  const checked=evaluateInvoiceSafely({...base,confidence:'needs_review'},INITIAL_INVOICES,DEMO_POLICY,DEMO_BENEFICIARIES);
  assert.equal(checked.ruleCode,'LOW_CONFIDENCE');
});
