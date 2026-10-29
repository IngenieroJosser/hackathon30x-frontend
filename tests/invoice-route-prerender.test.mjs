import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../app/(privado)/facturas/[id]/page.tsx', import.meta.url), 'utf8');

// Prueba estructural: protege la decisión arquitectónica. La validación real
// del prerender se hace adicionalmente mediante `yarn build`.
test('los params de factura se esperan en el componente asíncrono, no en Page', () => {
  const secondary = page.indexOf('async function InvoiceCaseContent(');
  const route = page.indexOf('export default function Page(');
  assert.ok(secondary >= 0 && route > secondary);
  assert.match(page.slice(secondary, route), /const\s*\{\s*id\s*\}\s*=\s*await params/);
  assert.doesNotMatch(page.slice(route), /await params/);
});

test('los params se pasan a una hija dentro de Suspense con fallback visible', () => {
  assert.match(page, /<Suspense\s+fallback=\{<InvoiceCaseFallback\s*\/>\}>/);
  assert.match(page, /<InvoiceCaseContent\s+params=\{params\}\s*\/>/);
  assert.match(page, /aria-busy="true"/);
});

test('la ruta no desactiva Cache Components ni fuerza render bloqueante', () => {
  assert.doesNotMatch(page, /export const (?:dynamic|instant|runtime)\s*=/);
  assert.doesNotMatch(page, /export\s+(?:async\s+)?function\s+generateStaticParams\s*\(/);
});
