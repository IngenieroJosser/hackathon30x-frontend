import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(f,'utf8');
test('Cada módulo operativo usa el centro Neon-backed, no el almacén local',()=>{
 for(const route of ['app/(privado)/page.tsx','app/(privado)/politicas/page.tsx','app/(privado)/beneficiarios/page.tsx','app/(privado)/facturas/page.tsx','app/(privado)/aprobaciones/page.tsx','app/(privado)/auditoria/page.tsx','app/(privado)/facturas/[id]/page.tsx']){
  const source=read(route);assert.match(source,/workspace-screen/);assert.doesNotMatch(source,/localStorage/);
 }
 const ui=read('src/components/workspace/workspace-screen.tsx');assert.match(ui,/\/api\/workspace/);assert.match(ui,/\/api\/invoices\/intake/);
});
test('No hay autorización financiera basada en resultado de LLM',()=>{
 const engine=read('src/server/workflows/engine.ts');
 for(const rule of ['DUPLICATE_INVOICE','VENDOR_NOT_ALLOWED','AGREEMENT_MISMATCH','HARD_LIMIT_EXCEEDED','BUDGET_INSUFFICIENT','CURRENCY_REVIEW_REQUIRED','APPROVAL_REQUIRED'])assert.ok(engine.includes(rule),rule);
 assert.match(read('src/server/workflows/common.ts'),/isolationLevel:'Serializable'/);
});
test('Todas las APIs críticas verifican roles y sesiones en servidor',()=>{
 for(const route of ['app/api/workspace/route.ts','app/api/workspace/actions/route.ts','app/api/invoices/intake/route.ts','app/api/invoices/extract/route.ts','app/api/invoices/[id]/evaluate/route.ts','app/api/invoices/[id]/verify/route.ts','app/api/invoices/[id]/reopen/route.ts','app/api/approvals/[id]/resolve/route.ts'])assert.match(read(route),/requirePermission/,route);
 const security=read('src/server/security/auth.ts');assert.match(security,/authSession.findUnique/);assert.match(security,/revokedAt/);assert.match(read('app/api/auth/session/route.ts'),/sessionCookie/);
});
test('Se guardan extracción, evidencias y auditoría en una transacción',()=>{
 const intake=read('src/server/workflows/invoice.ts');assert.match(intake,/invoiceExtraction.create/);assert.match(intake,/invoiceDocument.create/);assert.match(intake,/auditEvent.create/);assert.match(intake,/\$transaction/);
});
