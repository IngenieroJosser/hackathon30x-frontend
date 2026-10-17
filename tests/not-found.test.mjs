import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('ruta global not-found usa un componente de servidor y no consulta el reloj', () => {
  const route = read('app/not-found.tsx');
  const component = read('src/components/errors/not-found-experience.tsx');
  assert.match(route, /export default function NotFound\(/);
  assert.doesNotMatch(route + component, /['"]use client['"]|new Date\s*\(|Date\.now\s*\(|Math\.random\s*\(/);
  assert.match(component, /aria-labelledby="nf-heading"/);
  assert.match(component, /<h1 id="nf-heading">/);
});

test('404 ofrece salidas seguras y explicita el entorno de demostración', () => {
  const component = read('src/components/errors/not-found-experience.tsx');
  for (const href of ['/', '/facturas', '/aprobaciones', '/auditoria']) {
    assert.ok(component.includes(`href: '${href}'`) || component.includes(`href="${href}"`), `${href} debe estar accesible`);
  }
  assert.match(component, /SIN PAGOS REALES/);
});

test('el poster original y el video local tienen respaldo y respetan reduced motion', () => {
  const component = read('src/components/errors/not-found-experience.tsx');
  const styles = read('src/styles/not-found.css');
  assert.ok(existsSync(new URL('public/metal-human.mp4', root)));
  assert.ok(existsSync(new URL('public/metal-human.jpg', root)));
  assert.match(component, /poster="\/metal-human.jpg"/);
  assert.match(component, /src="\/metal-human.mp4"/);
  assert.match(component, /muted\s+playsInline/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(read('app/globals.css'), /not-found.css/);
});
