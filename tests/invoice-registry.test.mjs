import test from 'node:test';
import assert from 'node:assert/strict';
import {saveExtractedDocument,getInvoices,getInvoiceEvents,verifyAndEvaluate,resolveInvoice,hasDemoBatch,runDemoBatch,INVOICE_STORE_KEY,INVOICE_EVENT_KEY} from '../src/lib/invoice-registry.ts';
import {sanitizeDraft} from '../src/lib/invoice-processing.ts';

const data=new Map();
const storage={getItem(key){return data.has(key)?data.get(key):null;},setItem(key,value){data.set(key,String(value));},removeItem(key){data.delete(key);}};
globalThis.window={localStorage:storage,dispatchEvent(){}};
globalThis.localStorage=storage;
globalThis.CustomEvent=class CustomEvent{constructor(type){this.type=type;}};
const makeDoc=(name,stamp)=>({fileName:name,mimeType:'text/plain',bytes:240,fingerprint:stamp,source:'Correo',extractionMethod:'manual',extractedAt:'2026-10-17T16:10:00.000Z',warnings:[],evidence:{number:'',vendor:'',amount:'',currency:'',dueDate:''}});
const makeDraft=(number,vendor='Nexa Software',amount=620,currency='USD')=>sanitizeDraft({number,vendor,amount,currency,dueDate:'2026-10-30',issueDate:'2026-10-14',description:'Prueba ficticia',method:'manual'});

test('almacena borrador incompleto sin que se pierda al volver a leer',()=>{
  data.clear();
  const empty=sanitizeDraft({number:'',vendor:'',amount:null,currency:'USD',dueDate:'',method:'manual'});
  const doc=saveExtractedDocument(empty,makeDoc('sin-lectura.pdf','hash-a'));
  assert.equal(doc.status,'unprocessed');
  assert.equal(doc.amount,0);
  assert.equal(getInvoices()[0].id,doc.id);
  assert.equal(getInvoices()[0].ruleCode,'UNVERIFIED_EXTRACTION');
});
test('registra evaluación segura y versiones en auditoría al confirmar los campos',()=>{
  data.clear();
  const input=makeDraft('SYN-007');
  const doc=saveExtractedDocument(input,makeDoc('nexa.pdf','hash-b'));
  const checked=verifyAndEvaluate(doc.id,input);
  assert.equal(checked.status,'authorized');
  assert.equal(checked.ruleCode,'ALL_POLICIES_PASSED');
  assert.equal(checked.document?.verifiedBy,'Admin Finance · Sandbox');
  const audit=getInvoiceEvents().filter(x=>x.invoiceId===doc.id);
  assert.equal(audit.length,4);
  assert.ok(audit.find(x=>x.policySnapshot?.version && x.beneficiarySnapshot?.id==='ben-12'));
});
test('duplicados se bloquean al confirmar factura con mismo proveedor y número',()=>{
  data.clear();
  const first=makeDraft('SYN-DUP-13');
  const a=saveExtractedDocument(first,makeDoc('a.pdf','hash-1'));
  verifyAndEvaluate(a.id,first);
  const b=saveExtractedDocument(first,makeDoc('b.pdf','hash-2'));
  const result=verifyAndEvaluate(b.id,first);
  assert.equal(result.ruleCode,'DUPLICATE_INVOICE');
});
test('la aprobación humana reevalúa seguridad y no sirve para moneda ajena',()=>{
  data.clear();
  const pendingDraft=makeDraft('SYN-APP-58','Atlas Research',1700);
  const d=saveExtractedDocument(pendingDraft,makeDoc('approved.txt','hash-3'));
  const evaluated=verifyAndEvaluate(d.id,pendingDraft);
  assert.equal(evaluated.ruleCode,'APPROVAL_REQUIRED');
  const authorized=resolveInvoice(d.id,true,'Contrato verificado con la política vigente');
  assert.equal(authorized.status,'authorized');
  assert.equal(authorized.ruleCode,'HUMAN_APPROVAL_GRANTED');
  const currencyDraft=makeDraft('SYN-COP-1','Nexa Software',500,'COP');
  const other=saveExtractedDocument(currencyDraft,makeDoc('cop.txt','hash-4'));
  const currency=verifyAndEvaluate(other.id,currencyDraft);
  assert.equal(currency.ruleCode,'CURRENCY_REVIEW_REQUIRED');
  assert.throws(()=>resolveInvoice(other.id,true,'Confirmo que revisé este importe extranjero'),/No se puede aprobar/);
});
test('procesar lote sintético es idempotente en este navegador',()=>{
  data.clear();
  assert.equal(hasDemoBatch(),false);
  assert.equal(runDemoBatch().length,3);
  assert.equal(hasDemoBatch(),true);
  assert.equal(runDemoBatch().length,3);
  assert.equal(getInvoices().filter(x=>x.id.startsWith('batch-')).length,3);
});
