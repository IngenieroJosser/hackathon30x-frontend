import { readJsonBounded } from '@/server/security/request-body';
import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/server/security/auth';
import { resolveApproval } from '@/server/workflows/engine';
import { apiFailure } from '@/server/workflows/common';
const schema=z.object({action:z.enum(['APPROVED','REJECTED']),justification:z.string().trim().min(12).max(500)});
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {actor,denied}=await requirePermission(request,'resolve_approval');if(denied)return denied;
 try{const {id}=await params;const body=schema.parse(await readJsonBounded(request,2048));return NextResponse.json({result:await resolveApproval(id,body.action,body.justification,actor.id),paymentExecuted:false});}
 catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:'Se requiere una justificación de al menos 12 caracteres.'},{status:400});const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status});}
}
