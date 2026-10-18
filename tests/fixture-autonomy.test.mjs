import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkCertifiedFixture } from '../src/server/workflows/fixture-autonomy.ts';
import { isSandboxDisclaimer } from '../src/lib/document-notices.ts';

const bytes = readFileSync('public/demo/facturas/01-factura-valida.pdf');
const draft = {
  number:'NX-2026-001',vendor:'Nexa Software',amount:620,currency:'USD',
  dueDate:'2026-10-28',issueDate:'2026-10-14',description:'Desarrollo y mantenimiento',
  method:'ai_multimodal',
  warnings:[
    'Factura ficticia y no válida para cobro.',
    'Sin validez fiscal, legal ni bancaria.',
    'No autoriza ni debe ejecutarse ningún pago.',
  ],
  evidence:{number:'NX-2026-001',vendor:'Nexa Software',amount:'USD 620.00',currency:'USD',dueDate:'2026-10-28'},
};
const check=(update={},data=bytes,mime='application/pdf')=>checkCertifiedFixture(data,mime,{...draft,...update});

test('El PDF exacto que compartió el usuario se reconoce como A01',()=>{
  const match=check();
  assert.deepEqual(match,{trusted:true,id:'A01',sha256:'28fa4b86a77af41472be8a2731916b6271506025c7bec44d02bad0ad6a01f04f'});
});
test('Las leyendas fiscales de un PDF sintético no cuentan como fallo documental',()=>{
  assert.ok(draft.warnings.every(isSandboxDisclaimer));
  assert.equal(isSandboxDisclaimer('El importe no es legible; falta confirmación'),false);
});
test('Un PDF alterado no recibe certificación automática aunque se extraigan los mismos campos',()=>{
  assert.equal(check({},Buffer.concat([bytes,Buffer.from(' ')] )).trusted,false);
});
test('No admite una extracción con importe o moneda manipulados',()=>{
  assert.equal(check({amount:6200}).trusted,false);
  assert.equal(check({currency:'EUR'}).trusted,false);
  assert.equal(check({vendor:'Otra empresa'}).trusted,false);
});
test('Un dato crítico incompleto obliga revisión humana',()=>{
  assert.equal(check({dueDate:''}).trusted,false);
  assert.equal(check({amount:null}).trusted,false);
});
test('Advertencias materiales e IA no utilizada impiden autonomía',()=>{
  assert.equal(check({warnings:['Importe contradictorio en el PDF']}).trusted,false);
  assert.equal(check({method:'manual'}).trusted,false);
});
test('Documento certificado distinto A02 también se compara con los datos',()=>{
  const a02=readFileSync('public/demo/facturas/02-aprobacion-humana.pdf');
  assert.equal(check({},a02).trusted,false);
});
test('Ausencia de campos en el propio dataset no permite saltar la revisión',()=>{
  const a09=readFileSync('public/demo/facturas/09-fecha-ausente.pdf');
  assert.equal(check({number:'SA-2026-045',vendor:'Sierra Analytics',amount:480,dueDate:''},a09).trusted,false);
});
test('EUR certificado puede pasar a reglas que ESCALAN, sin autorizar conversión FX',()=>{
  const file=readFileSync('public/demo/facturas/08-moneda-externa.pdf');
  const result=check({
    number:'OL-2026-210',vendor:'Orbita Labs',amount:700,currency:'EUR',dueDate:'2026-11-05',
    warnings:['La moneda no es USD: requiere revisión; no hay tasa de cambio configurada.'],
  },file);
  assert.equal(result.trusted,true);
  assert.equal(result.id,'A08');
});
