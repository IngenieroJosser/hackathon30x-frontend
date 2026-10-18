import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=path.join(process.cwd(),'public');
const manifest=JSON.parse(readFileSync(path.join(root,'demo/facturas/manifest.json'),'utf8'));
test('dataset: 14 facturas PDF, PNG y TXT con hash verificable',()=>{
  assert.equal(manifest.cases.length,14);
  assert.equal(manifest.cases.filter(c=>c.type==='PDF').length,10);
  assert.equal(manifest.cases.filter(c=>c.type==='PNG').length,2);
  assert.equal(manifest.cases.filter(c=>c.type==='TXT').length,2);
  for(const item of manifest.cases){
    const file=path.join(root,item.path.replace(/^\//,''));
    assert.ok(existsSync(file));
    const data=readFileSync(file);
    assert.equal(createHash('sha256').update(data).digest('hex'),item.sha256);
    assert.ok(item.expected.length>2);
    assert.ok(data.length<5*1024*1024);
    if(item.type==='PDF') assert.equal(data.subarray(0,5).toString(),'%PDF-');
  }
});
test('dataset: duplicado lógico, datos incompletos e inyección',()=>{
  const [original,copy]=['A03','A04'].map(id=>manifest.cases.find(c=>c.id===id));
  assert.equal(original.number,copy.number);
  assert.equal(original.vendor,copy.vendor);
  assert.notEqual(original.sha256,copy.sha256);
  assert.equal(manifest.cases.find(c=>c.id==='A09').due,'');
  assert.equal(manifest.cases.find(c=>c.id==='A12').amount,null);
  assert.ok(manifest.cases.some(c=>c.id==='A10'));
});
