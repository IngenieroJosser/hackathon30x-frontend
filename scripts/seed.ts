import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { DEMO_BENEFICIARIES } from '../src/lib/beneficiary-registry';

const url = process.env.DIRECT_URL;
if (!url) throw new Error('DIRECT_URL no configurada.');
const adapter = new PrismaPg({ connectionString: url, max: 2 });
const prisma = new PrismaClient({ adapter });
const slug = process.env.BLINKA_DEMO_ORGANIZATION_SLUG ?? 'atlas-global-demo';

async function main() {
  const organization = await prisma.organization.upsert({
    where:{slug},
    update:{},
    create:{slug,name:'Atlas Global Inc. — Sandbox 30X',baseCurrency:'USD'},
  });
  for (const sample of DEMO_BENEFICIARIES) {
    const normalizedName=sample.name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
    const vendor=await prisma.vendor.upsert({
      where:{organizationId_normalizedName:{organizationId:organization.id,normalizedName}},
      update:{},
      create:{organizationId:organization.id,name:sample.name,normalizedName,country:sample.country,category:sample.category,status:sample.status.toUpperCase() as 'AUTHORIZED'|'REVIEW'|'BLOCKED'},
    });
    await prisma.vendorAgreement.upsert({
      where:{organizationId_reference_version:{organizationId:organization.id,reference:sample.agreementReference,version:1}},
      update:{},
      create:{organizationId:organization.id,vendorId:vendor.id,reference:sample.agreementReference,amountLimit:String(sample.agreementLimit),currency:'USD',version:1},
    });
  }
  await prisma.paymentPolicy.upsert({
    where:{organizationId_version:{organizationId:organization.id,version:1}},
    update:{},
    create:{organizationId:organization.id,version:1,isActive:true,autonomousLimit:'1000',hardLimit:'5000',monthlyBudget:'10000',currency:'USD',rules:{duplicateBlock:true,unknownVendorBlock:true,unverifiedDocumentEscalation:true}},
  });
  console.log(`Sandbox '${slug}' listo en Neon; ${DEMO_BENEFICIARIES.length} beneficiarios de prueba.`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>prisma.$disconnect());
