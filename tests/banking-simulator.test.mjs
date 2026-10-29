import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syntheticBankProvider } from '../src/lib/banking/verification.ts';
const valid={institutionCode:'BANK-DEMO-A',accountReference:'TEST-ACCOUNT-0001',accountKind:'PAYROLL',holderReference:'PERSON-DEMO-0001'};
test('Cuenta sintética de nómina: coincidencia y ausencia de certificación real',async()=>{
 const r=await syntheticBankProvider.verify(valid);
 assert.equal(r.status,'SYNTHETIC_MATCH');
 assert.equal(r.realBankConfirmed,false);
 assert.equal(r.accountKindConfirmed,true);
 assert.equal(r.holderConfirmed,true);
});
test('Identidad equivocada no permite coincidencia sintética',async()=>{
 const r=await syntheticBankProvider.verify({...valid,holderReference:'PERSON-DEMO-9999'});
 assert.equal(r.status,'SYNTHETIC_MISMATCH');assert.equal(r.holderConfirmed,false);
});
test('Cuenta inexistente en el dataset retorna UNKNOWN (no cuenta inválida)',async()=>{
 const r=await syntheticBankProvider.verify({...valid,accountReference:'TEST-ACCOUNT-404'});
 assert.equal(r.status,'UNKNOWN');assert.equal(r.realBankConfirmed,false);
});
test('Tipo de cuenta errado no aprueba la verificación de nómina',async()=>{
 const r=await syntheticBankProvider.verify({...valid,accountKind:'SAVINGS'});
 assert.equal(r.status,'SYNTHETIC_MISMATCH');assert.equal(r.accountKindConfirmed,false);
});
