import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDemoPolicy } from '../src/lib/policy-validation.ts';

const policy = { currency:'USD', autonomousLimit:1000, hardLimit:5000, monthlyBudget:20000 };
const verify = overrides => validateDemoPolicy({...policy,...overrides});

test('política de demostración válida',()=>assert.deepEqual(verify({}),[]));
test('no acepta límite autónomo mayor que absoluto',()=>assert.match(verify({autonomousLimit:5500}).join(' '),/no puede superar/i));
test('no acepta un límite absoluto mayor que presupuesto',()=>assert.match(verify({hardLimit:25000}).join(' '),/no puede superar/i));
test('no acepta valor monetario negativo ni cero',()=>assert.equal(verify({autonomousLimit:0}).length,1));
test('no acepta cantidades decimales ni infinitas',()=>{
  assert.ok(verify({monthlyBudget:12.5}).length);
  assert.ok(verify({hardLimit:Infinity}).length);
});
test('rechaza cadenas numéricas (evita coerción silenciosa)',()=>assert.ok(verify({hardLimit:'5000'}).length));
test('rechaza moneda no soportada',()=>assert.ok(verify({currency:'COP'}).length));
test('rechaza cantidades fuera de la cota permitida',()=>assert.ok(verify({monthlyBudget:200_000_000}).length));
