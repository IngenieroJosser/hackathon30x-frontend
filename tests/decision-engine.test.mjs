import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDemoInvoice } from '../src/lib/decision-engine.ts';

const policy={version:'test',autonomousLimit:1000,hardLimit:5000,monthlyBudget:10000,currency:'USD'};
const invoice={id:'test',number:'INV-1',vendor:'Demo Vendor',vendorInitials:'DV',country:'Colombia',countryCode:'CO',category:'Consulting',amount:500,currency:'USD',dueDate:'2026-10-31',receivedAt:'2026-10-17',status:'unprocessed',reason:'',ruleCode:'',checks:[],source:'PDF',confidence:'high',approvedVendor:true,agreementLimit:3000};
const evalCase=(overrides={},remaining=10000)=>evaluateDemoInvoice({...invoice,...overrides},policy,remaining);

test('autoriza una factura válida dentro del umbral autónomo',()=>{
  assert.equal(evalCase().status,'authorized');
});
test('escala el importe superior al umbral autónomo',()=>{
  assert.equal(evalCase({amount:1250}).status,'pending');
});
test('bloquea duplicado incluso cuando el importe requiere aprobación',()=>{
  assert.equal(evalCase({amount:1250,duplicateOf:'INV-0'}).ruleCode,'DUPLICATE_INVOICE');
});
test('no autoriza un beneficiario desconocido',()=>{
  assert.equal(evalCase({approvedVendor:false}).status,'blocked');
});
test('no autoriza un importe fuera de acuerdo',()=>{
  assert.equal(evalCase({amount:3200}).ruleCode,'AGREEMENT_MISMATCH');
});
test('no supera el límite absoluto incluso con aprobación humana',()=>{
  assert.equal(evalCase({amount:5100,agreementLimit:7000}).ruleCode,'HARD_LIMIT_EXCEEDED');
});
test('bloquea saldo insuficiente',()=>{
  assert.equal(evalCase({amount:500},400).ruleCode,'BUDGET_INSUFFICIENT');
});
test('escala un documento con datos ambiguos',()=>{
  assert.equal(evalCase({confidence:'needs_review'}).ruleCode,'LOW_CONFIDENCE');
});
