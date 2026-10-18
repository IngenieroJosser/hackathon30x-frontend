import { NextRequest,NextResponse } from 'next/server';
import { requirePermission } from '@/server/security/auth';
import { organization, serializable, WorkflowError, apiFailure } from '@/server/workflows/common';
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {actor,denied}=await requirePermission(request,'reopen');if(denied)return denied;
 try{
  const {id}=await params;const org=await organization();
  const result=await serializable(async tx=>{
   const invoice=await tx.invoice.findFirst({where:{id,organizationId:org.id}});
   if(!invoice)throw new WorkflowError('Factura no encontrada.',404);
   if(!['BLOCKED','ESCALATED','REJECTED'].includes(invoice.status))throw new WorkflowError('Solo se pueden corregir expedientes no autorizados.',409);
   await tx.approvalRequest.updateMany({where:{invoiceId:id,status:'PENDING'},data:{status:'EXPIRED',resolvedAt:new Date(),justification:'Solicitud invalidada por reapertura del expediente.'}});
   await tx.invoice.update({where:{id},data:{status:'NEEDS_VERIFICATION',verifiedAt:null}});
   await tx.auditEvent.create({data:{organizationId:org.id,actorId:actor.id,invoiceId:id,entityType:'Invoice',entityId:id,action:'INVOICE_REOPENED',data:{previousStatus:invoice.status,oldDecisionPreserved:true,paymentExecuted:false}}});
   return {id,status:'NEEDS_VERIFICATION'};
  });
  return NextResponse.json({result});
 }catch(e){const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status});}
}
