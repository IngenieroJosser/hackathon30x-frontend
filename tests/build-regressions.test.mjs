import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('React: el botón de reapertura tiene un solo disabled', () => {
  const screen = read('src/components/workspace/workspace-screen.tsx');
  assert.doesNotMatch(screen, /disabled=\{busy\}\s+disabled=/);
  assert.match(screen, /Reabrir y corregir/);
  assert.match(screen, /disabled=\{!isAdmin\|\|busy\}/);
});

test('Auth: guard muestra el segmento en prerender pero no consulta Neon sin sesión', () => {
  const gate = read('src/components/workspace/access-gate.tsx');
  const screen = read('src/components/workspace/workspace-screen.tsx');
  assert.match(gate, /<div hidden=\{checking\|\|!user\}/);
  assert.match(screen, /useEffect\(\(\)=>\{if\(!actor\)return;void reload/);
});

test('Passwords: opciones scrypt definidas en wrapper async', () => {
  const source = read('src/server/security/password.ts');
  assert.match(source, /nativeScrypt\(password,salt,LENGTH,\{N:COST,r:BLOCK,p:PARALLEL\}/);
  assert.doesNotMatch(source, /promisify\(nativeScrypt\)/);
});

test('Prisma: snapshots financieros usan objetos JSON tipados', () => {
  const source = read('src/server/workflows/engine.ts');
  assert.match(source, /policySnapshot:Prisma.InputJsonObject/);
  assert.match(source, /vendorSnapshot\?:Prisma.InputJsonObject/);
});
