import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/server/security/auth';
import { verifyInvoice } from '@/server/workflows/invoice';
import { apiFailure } from '@/server/workflows/common';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema=z.object({number:z.string().trim().min(3).max(80),vendor:z.string().trim().min(3).max(160),amount:z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/).refine(x=>Number(x)>0),currency:z.string().trim().length(3),dueDate:date,issueDate:z.union([date,z.literal('')]).optional(),description:z.string().max(500).optional()}).strict();
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {actor,denied}=await requirePermission(request,'verify');if(denied)return denied;
 try{const {id}=await params;const body=schema.parse(await request.json());return NextResponse.json({result:await verifyInvoice(id,body,actor.id)});}
 catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:'Verifica los campos del documento.',issues:e.issues},{status:400});const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status});}
}
