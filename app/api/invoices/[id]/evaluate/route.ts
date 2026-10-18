import { NextRequest,NextResponse } from 'next/server';
import { requirePermission } from '@/server/security/auth';
import { evaluateInvoice } from '@/server/workflows/engine';
import { apiFailure } from '@/server/workflows/common';
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {actor,denied}=await requirePermission(request,'evaluate');if(denied)return denied;
 try{const {id}=await params;return NextResponse.json({result:await evaluateInvoice(id,actor.id),paymentExecuted:false});}
 catch(e){const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status});}
}
