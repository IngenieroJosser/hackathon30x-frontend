import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const file of [
 'app/api/auth/session/route.ts',
 'app/api/workspace/actions/route.ts',
 'app/api/invoices/route.ts',
 'app/api/invoices/[id]/verify/route.ts',
 'app/api/approvals/[id]/resolve/route.ts',
]){
 test(`El endpoint JSON ${file} usa límite de cuerpo real`,()=>{
  assert.match(readFileSync(file,'utf8'),/readJsonBounded\(request,\d+\)/);
 });
}
test('El lector limita datos efectivos no solo Content-Length',()=>{
 const source=readFileSync('src/server/security/request-body.ts','utf8');
 assert.match(source,/received > maxBytes/);
 assert.match(source,/advertised > maxBytes/);
 assert.match(source,/application\\\/json/);
});
