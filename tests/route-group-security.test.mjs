import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
const text = path => readFileSync(path, 'utf8');
test('la pagina publica es independiente de AccessGate y la ruta dinamica prerenderiza con Suspense', () => {
  assert.ok(existsSync('app/proyecto/page.tsx'));
  assert.doesNotMatch(text('app/layout.tsx'), /<AccessGate>/);
  assert.doesNotMatch(text('src/components/workspace/access-gate.tsx'), /usePathname\(/);
  assert.match(text('app/(privado)/layout.tsx'), /<AccessGate>\{children\}<\/AccessGate>/);
  assert.match(text('app/(privado)/facturas/[id]/page.tsx'), /<Suspense/);
});
test('todas las vistas operativas comparten el control de acceso de la ruta privada', () => {
  for (const path of [
    'page.tsx','facturas/page.tsx','facturas/[id]/page.tsx',
    'beneficiarios/page.tsx','aprobaciones/page.tsx','auditoria/page.tsx','politicas/page.tsx',
  ]) assert.ok(existsSync(`app/(privado)/${path}`), path);
});
