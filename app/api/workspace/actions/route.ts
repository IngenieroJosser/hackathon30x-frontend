import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/server/security/auth';
import { publishPolicy, saveVendor, changeVendorStatus } from '@/server/workflows/workspace';
import { apiFailure } from '@/server/workflows/common';
const money=z.number().finite().positive().max(1e8);
const vendor=z.object({name:z.string().trim().min(3).max(160),country:z.string().min(2).max(80),category:z.string().max(100),contactEmail:z.union([z.email(),z.literal('')]).optional(),agreementReference:z.string().trim().min(3).max(80),agreementLimit:money});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('publish_policy'),payload:z.object({autonomousLimit:money,hardLimit:money,monthlyBudget:money,expectedVersion:z.number().int().positive()})}),
 z.object({action:z.literal('save_vendor'),payload:vendor,id:z.uuid().optional()}),
 z.object({action:z.literal('vendor_status'),id:z.uuid(),status:z.enum(['AUTHORIZED','REVIEW','BLOCKED'])}),
]);
export async function POST(request:NextRequest){
 const {actor,denied}=await requirePermission(request,'manage_policy');if(denied)return denied;
 try{const data=schema.parse(await request.json());let result;
  switch(data.action){case 'publish_policy':result=await publishPolicy(data.payload,actor!.id);break;
   case 'save_vendor':result=await saveVendor(data.payload,actor!.id,data.id);break;
   case 'vendor_status':result=await changeVendorStatus(data.id,data.status,actor!.id);break;}
  return NextResponse.json({result,paymentExecuted:false},{headers:{'Cache-Control':'no-store'}});
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:'Datos inválidos.',issues:e.issues},{status:400});const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status});}
}
