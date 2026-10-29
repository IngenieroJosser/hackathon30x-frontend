import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.cwd();
const file=(path)=>readFileSync(resolve(root,path),'utf8');
test('marca: símbolo SVG e iconos existen',()=>{
 for(const path of ['app/icon.svg','app/favicon.ico','app/apple-icon.png','public/icons/icon-192.png','public/icons/icon-512.png','public/brand/finvigia-simbolo.svg']) assert.ok(existsSync(resolve(root,path)),path);
});
test('marca: favicon y escudo SVG tienen tamaños correctos',()=>{
 assert.match(file('app/icon.svg'),/viewBox="0 0 512 512"/);
 assert.match(file('app/icon.svg'),/path/);
});
test('marca: Open Graph PNG tiene 1200 × 630 px',()=>{
 const b=readFileSync(resolve(root,'public/seo/finvigia-open-graph.png'));
 assert.equal(b.readUInt32BE(16),1200);assert.equal(b.readUInt32BE(20),630);
});
test('SEO: panel privado mantiene noindex',()=>{
 assert.match(file('app/layout.tsx'),/index: false, follow: false/);
});
test('SEO: no indexar ruta pública sin dominio HTTPS configurado',()=>{
 assert.match(file('src/lib/site-seo.ts'),/parsed.protocol !== 'https:'/);
 assert.match(file('app/proyecto/page.tsx'),/Boolean\(publicUrl\)/);
});
test('SEO: sitemap solo lista /proyecto',()=>{
 const s=file('app/sitemap.ts');assert.match(s,/\$\{SITE_URL\}\/proyecto/);assert.ok(!s.includes('facturas'));
});
test('SEO: robots restringe APIs y carpetas privadas',()=>{
 const s=file('app/robots.ts');for (const path of ['/api/','/facturas','/beneficiarios','/aprobaciones','/auditoria','/politicas'])assert.ok(s.includes(path));
});
test('SEO: datos estructurados sin reseñas inventadas',()=>{
 const s=file('app/proyecto/page.tsx');assert.match(s,/SoftwareApplication/);assert.ok(!s.includes('aggregateRating'));assert.ok(!s.includes('offers:'));
});
test('SEO: acceso público no abre las rutas privadas',()=>{
 const s=file('src/components/workspace/access-gate.tsx');assert.match(s,/pathname==='\/proyecto'/);assert.match(s,/if\(isPublicProjectPage\)return <>{children}<\/>/);
});
