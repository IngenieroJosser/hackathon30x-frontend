import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = filename => readFileSync(filename,'utf8');
test('schema: recursos mínimos, importes Decimal y duplicados auditables',()=>{
  const s=read('prisma/schema.prisma');
  for(const name of ['Organization','Invoice','Vendor','VendorAgreement','PaymentPolicy','BudgetPeriod','BudgetEntry','InvoiceExtraction','PaymentDecision','ApprovalRequest','AuditEvent'])
    assert.match(s,new RegExp('model '+name+'\\s*\\{'));
  assert.match(s,/amount\s+Decimal\?/);
  assert.match(s,/@@index\(\[organizationId, vendorName, externalNumber\]\)/);
  assert.doesNotMatch(s,/@@unique\(\[organizationId, vendorName, externalNumber\]\)/);
});
test('API Neon: requiere identidad ADMIN, transacción y no autoriza automáticamente',()=>{
  const route=read('app/api/invoices/route.ts');
  assert.match(route,/requirePermission\(request, 'ingest'\)/);
  assert.match(route,/\$transaction/);
  assert.match(route,/status:'RECEIVED'/);
  assert.match(route,/INVOICE_RECEIVED/);
  assert.doesNotMatch(route,/localStorage/);
});
