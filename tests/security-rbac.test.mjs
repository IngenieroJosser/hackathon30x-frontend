import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {can,ROLE_PERMISSIONS} from '../src/server/security/roles.ts';
import {hashPassword,verifyPassword,passwordIsStrong} from '../src/server/security/password.ts';
const read=f=>readFileSync(f,'utf8');
test('RBAC: APPROVER y AUDITOR no pueden publicar políticas ni administrar beneficiarios',()=>{
 for(const role of ['APPROVER','AUDITOR']){
  assert.equal(can(role,'manage_policy'),false);
  assert.equal(can(role,'manage_vendor'),false);
  assert.equal(can(role,'ingest'),false);
  assert.equal(can(role,'evaluate'),false);
 }
 assert.equal(can('ADMIN','manage_policy'),true);
 assert.equal(can('ADMIN','manage_vendor'),true);
 assert.equal(can('ADMIN','ingest'),true);
});
test('RBAC: solo APPROVER puede aprobar/rechazar facturas',()=>{
 assert.equal(can('ADMIN','resolve_approval'),false);
 assert.equal(can('AUDITOR','resolve_approval'),false);
 assert.equal(can('APPROVER','resolve_approval'),true);
 for(const role of Object.keys(ROLE_PERMISSIONS))assert.equal(can(role,'read'),true);
});
test('Password: scrypt salted, verifica contraseña y rechaza contraseña corta',async()=>{
 assert.equal(passwordIsStrong('short'),false);
 assert.equal(passwordIsStrong('A very long unique test password!'),true);
 const password='This is a long test password 2026!';
 const first=await hashPassword(password);const second=await hashPassword(password);
 assert.notEqual(first,second);
 assert.match(first,/^scrypt\$16384\$/);
 assert.equal(await verifyPassword(password,first),true);
 assert.equal(await verifyPassword('incorrect password',first),false);
 assert.equal(await verifyPassword(password,'invalid'),false);
});
test('Endpoints: permisos explícitos antes de acceder a las funciones financieras',()=>{
 const guarded={
  'app/api/workspace/route.ts':'read',
  'app/api/workspace/actions/route.ts':'manage_policy',
  'app/api/invoices/intake/route.ts':'ingest',
  'app/api/invoices/extract/route.ts':'ingest',
  'app/api/invoices/route.ts':'ingest',
  'app/api/invoices/[id]/evaluate/route.ts':'evaluate',
  'app/api/invoices/[id]/verify/route.ts':'verify',
  'app/api/invoices/[id]/reopen/route.ts':'reopen',
  'app/api/approvals/[id]/resolve/route.ts':'resolve_approval',
 };
 for(const [path,permission] of Object.entries(guarded)){
  const source=read(path);
  assert.match(source,/requirePermission/);
  assert.match(source,new RegExp(`['"]${permission}['"]`),path);
 }
 assert.equal(read('src/server/security/auth.ts').includes('BLINKA_DEMO_API_TOKEN'),false);
 assert.equal(read('app/api/auth/session/route.ts').includes('sessionCookie('),true);
 assert.equal(read('prisma/schema.prisma').includes('model AuthSession'),true);
 assert.equal(read('src/server/workflows/engine.ts').includes('reviewerId:actorId'),true);
});
test('Auditoría vinculada al usuario en mutaciones',()=>{
 for(const file of ['src/server/workflows/engine.ts','src/server/workflows/workspace.ts','src/server/workflows/invoice.ts']){
  assert.match(read(file),/actorId/);
 }
});
