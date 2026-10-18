import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/server/db/prisma';
import { requirePermission } from '@/server/security/auth';
import { parseUTCDate, registerInvoiceSchema } from '@/server/modules-invoice-input';

const noStore = { 'Cache-Control': 'no-store' };
const organizationSlug = () => process.env.BLINKA_DEMO_ORGANIZATION_SLUG || 'atlas-global-demo';

/** GET: datos recuperados de Neon, sin estado de navegador. */
export async function GET(request: NextRequest) {
  const {denied} = await requirePermission(request, 'read');
  if (denied) return denied;
  try {
    const organization = await getPrisma().organization.findUnique({ where: { slug: organizationSlug() }, select: { id: true } });
    if (!organization) return NextResponse.json({ error: 'Organización no creada. Ejecuta yarn db:seed.' }, { status: 404 });
    const invoices = await getPrisma().invoice.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id:true, externalNumber:true, vendorName:true, amount:true, currency:true, issueDate:true, dueDate:true, status:true, source:true, createdAt:true },
    });
    return NextResponse.json({ source: 'neon_postgresql', invoices: invoices.map(i=>({ ...i, amount: i.amount?.toString() ?? null })) }, { headers: noStore });
  } catch (error) {
    console.error('[invoices:get] Error controlado:', error instanceof Error ? error.name : 'Unknown');
    return NextResponse.json({ error: 'No fue posible consultar Neon. Revisa variables y migraciones.' }, { status: 503 });
  }
}

/** POST: registra borrador y evento atómicamente; NO evalúa ni autoriza pagos. */
export async function POST(request: NextRequest) {
  const {actor,denied} = await requirePermission(request, 'ingest');
  if (denied) return denied;
  if (Number(request.headers.get('content-length')||0)>10_000)
    return NextResponse.json({ error:'JSON demasiado grande.' }, { status:413 });
  try {
    const json: unknown = await request.json();
    const input = registerInvoiceSchema.safeParse(json);
    if (!input.success) return NextResponse.json({ error:'Datos inválidos.', issues: input.error.flatten() }, { status:400 });
    const body = input.data;
    const issueDate = parseUTCDate(body.issueDate);
    const dueDate = parseUTCDate(body.dueDate);
    const prisma = getPrisma();
    const organization = await prisma.organization.findUnique({ where: { slug: organizationSlug() }, select: { id:true } });
    if (!organization) return NextResponse.json({ error:'Organización no creada. Ejecuta yarn db:seed.' }, { status:404 });
    if (body.idempotencyKey) {
      const prior = await prisma.invoice.findUnique({
        where: { organizationId_idempotencyKey: { organizationId: organization.id, idempotencyKey: body.idempotencyKey } },
        select: { id: true },
      });
      if (prior) return NextResponse.json({ invoiceId:prior.id, persisted:true, reused:true }, { headers:noStore });
    }
    const invoice = await prisma.$transaction(async tx => {
      const record = await tx.invoice.create({ data: {
        organizationId:organization.id, externalNumber:body.externalNumber,
        vendorName:body.vendorName, amount:body.amount ?? null,
        currency:body.currency, issueDate, dueDate, description:body.description,
        source:body.source, status:'RECEIVED', idempotencyKey:body.idempotencyKey,
      },select:{id:true,externalNumber:true,vendorName:true,status:true,createdAt:true} });
      await tx.auditEvent.create({ data: {
        organizationId: organization.id,actorId:actor.id,invoiceId:record.id,
        entityType:'Invoice',entityId:record.id,action:'INVOICE_RECEIVED',
        data: { source:body.source, number:body.externalNumber??null, paymentExecuted:false },
      }});
      return record;
    });
    return NextResponse.json({ persisted:true, paymentExecuted:false, invoice }, { status:201,headers:noStore });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message.startsWith('Fecha inexistente')))
      return NextResponse.json({ error:'JSON o fecha inválidos.' }, { status:400 });
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
      return NextResponse.json({ error:'Conflicto de idempotencia. Reintenta consultando la lista.' }, { status:409 });
    console.error('[invoices:post] Error controlado:', error instanceof Error ? error.name : 'Unknown');
    return NextResponse.json({ error:'No fue posible persistir el expediente en Neon.' }, { status:503 });
  }
}
