import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectEnv} from '../src/lib/project-env.ts';
import {seal,unseal} from '../src/server/security/secret-box.ts';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('Marca FinVigía en metadatos, autenticador, navegación y README',()=>{
 for(const path of ['app/layout.tsx','src/components/layout/app-shell.tsx','src/components/workspace/access-gate.tsx','README.md']){
  assert.match(read(path),/FinVigía|FINVIGIA|finvigia/i,path);
  assert.doesNotMatch(read(path),/blinka/i,`${path} debe carecer de marca previa visible`);
 }
 assert.match(read('src/server/security/mfa-service.ts'),/issuer:'FinVigía'/);
 assert.match(read('package.json'),/"name": "finvigia-frontend"/);
 assert.match(read('yarn.lock'),/finvigia-frontend@workspace:\./);
});

test('Variables anteriores no invalidan los datos cifrados con la misma clave',()=>{
 const current=process.env.FINVIGIA_MFA_KEY,legacy=process.env.BLINKA_MFA_KEY;
 try{
  delete process.env.FINVIGIA_MFA_KEY;
  process.env.BLINKA_MFA_KEY='ab'.repeat(32);
  const ciphertext=seal('TEST_MFA_SECRET','FINVIGIA_MFA_KEY');
  assert.equal(unseal(ciphertext,'FINVIGIA_MFA_KEY'),'TEST_MFA_SECRET');
  process.env.FINVIGIA_MFA_KEY='ab'.repeat(32);
  assert.equal(projectEnv('MFA_KEY'),'ab'.repeat(32));
  process.env.FINVIGIA_MFA_KEY='cd'.repeat(32);
  assert.throws(()=>unseal(ciphertext,'FINVIGIA_MFA_KEY'),/diferentes/);
 }finally{
  if(current===undefined)delete process.env.FINVIGIA_MFA_KEY;else process.env.FINVIGIA_MFA_KEY=current;
  if(legacy===undefined)delete process.env.BLINKA_MFA_KEY;else process.env.BLINKA_MFA_KEY=legacy;
 }
});

test('La sesión anterior tiene lectura temporal y logout la elimina',()=>{
 const auth=read('src/server/security/auth.ts');
 const session=read('app/api/auth/session/route.ts');
 assert.match(auth,/LEGACY_AUTH_COOKIE/);
 assert.match(auth,/sessionToken\(request\)/);
 assert.match(session,/response\.cookies\.set\(LEGACY_AUTH_COOKIE/);
});
