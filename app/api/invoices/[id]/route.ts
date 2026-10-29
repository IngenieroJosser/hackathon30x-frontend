import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/server/db/prisma';
import { requirePermission } from '@/server/security/auth';

type Params = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: Params) {
  const {denied} = await requirePermission(request, 'read');
  if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error:'Identificador inválido.' },{status:400});
  try {
    const org = await getPrisma().organization.findUnique({where:{slug:process.env.BLINKA_DEMO_ORGANIZATION_SLUG||'atlas-global-demo'}, select:{id:true}});
    if (!org) return NextResponse.json({ error:'Organización no encontrada.' },{status:404});
    const invoice = await getPrisma().invoice.findFirst({
      where:{id,organizationId:org.id},
      include:{document:true,extractions:{orderBy:{createdAt:'desc'}},decisions:{orderBy:{evaluatedAt:'desc'}},approvals:true,auditEvents:{orderBy:{occurredAt:'asc'}}},
    });
    if (!invoice) return NextResponse.json({ error:'Factura no encontrada.' },{status:404});
    // Decimal se serializa a string; nunca se utiliza JSON numérico IEEE754 para cálculos.
    return NextResponse.json({source:'neon_postgresql',invoice:JSON.parse(JSON.stringify(invoice))},{headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    console.error('[invoice:detail] Error controlado:',error instanceof Error?error.name:'Unknown');
    return NextResponse.json({error:'Error consultando Neon.'},{status:503});
  }
}
