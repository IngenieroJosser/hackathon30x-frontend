import 'server-only';
import { createHash } from 'node:crypto';
import type { InvoiceDraft } from '@/types/invoice-workflow';
import { getPrisma } from '@/server/db/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { organization, WorkflowError, serializable } from './common';
import { parseUTCDate } from '@/server/modules-invoice-input';
import { validateDraftForReview, sanitizeDraft } from '@/lib/invoice-processing';

export type IntakeInput={draft:InvoiceDraft;source:'PDF'|'IMAGE'|'EMAIL'|'TEXT';file?:{name:string;type:string;bytes:Buffer};rawText?:string};
export async function registerIntake({draft,source,file,rawText}:IntakeInput,actorId:string){
 const org=await organization();
 const safe=sanitizeDraft(draft);
 // The extracted fields are unverified until a person confirms them.
 const stored=await getPrisma().$transaction(async tx=>{
  const invoice=await tx.invoice.create({data:{organizationId:org.id,externalNumber:safe.number||null,vendorName:safe.vendor||null,amount:safe.amount?.toFixed(2)??null,currency:safe.currency||null,issueDate:parseUTCDate(safe.issueDate),dueDate:parseUTCDate(safe.dueDate),description:safe.description,source,status:'NEEDS_VERIFICATION'}});
  if(file){await tx.invoiceDocument.create({data:{invoiceId:invoice.id,fileName:file.name,mimeType:file.type,bytes:file.bytes.length,sha256:createHash('sha256').update(file.bytes).digest('hex')}});}
  await tx.invoiceExtraction.create({data:{invoiceId:invoice.id,provider:safe.method==='ai_multimodal'?'openai':'local',modelName:safe.method==='ai_multimodal'?process.env.OPENAI_EXTRACTION_MODEL||'gpt-4.1-mini':null,method:safe.method,status:'COMPLETED',payload:safe as unknown as Prisma.InputJsonValue,evidence:safe.evidence as Prisma.InputJsonValue,warnings:safe.warnings}});
  await tx.auditEvent.create({data:{organizationId:org.id,actorId,invoiceId:invoice.id,entityType:'Invoice',entityId:invoice.id,action:'INVOICE_INGESTED',data:{source,number:safe.number,method:safe.method,documentHash:file?createHash('sha256').update(file.bytes).digest('hex'):null,textEvidence:rawText?rawText.slice(0,150):null,paymentExecuted:false}}});
  return invoice;
 });
 return {id:stored.id,number:stored.externalNumber,verified:false,persisted:true};
}
export async function verifyInvoice(id:string,fields:{number:string;vendor:string;amount:string;currency:string;dueDate:string;issueDate?:string;description?:string},actorId:string, certification?:{fixtureId:string;sha256:string}){
 const errors=validateDraftForReview(sanitizeDraft({number:fields.number,vendor:fields.vendor,amount:Number(fields.amount),currency:fields.currency,dueDate:fields.dueDate,issueDate:fields.issueDate??'',description:fields.description??'',method:'manual'}));
 if(errors.length)throw new WorkflowError(errors.join(' '),422);
 const org=await organization();
 return serializable(async tx=>{
  const invoice=await tx.invoice.findFirst({where:{id,organizationId:org.id}});
  if(!invoice)throw new WorkflowError('Factura no encontrada.',404);
  if(invoice.status!=='NEEDS_VERIFICATION'&&invoice.status!=='RECEIVED')throw new WorkflowError('Una decisión existente no puede alterarse. Registra otra factura.',409);
  if(certification){
    const recorded=await tx.invoiceDocument.findUnique({where:{invoiceId:id}});
    if(!recorded || recorded.sha256!==certification.sha256)throw new WorkflowError('No coincide la huella del documento certificado.',409);
  }
  const updated=await tx.invoice.update({where:{id},data:{externalNumber:fields.number.trim(),vendorName:fields.vendor.trim(),amount:fields.amount,currency:fields.currency.trim().toUpperCase(),dueDate:parseUTCDate(fields.dueDate),issueDate:parseUTCDate(fields.issueDate),description:fields.description?.trim()??null,verifiedAt:new Date(),status:'READY'}});
  await tx.auditEvent.create({data:{organizationId:org.id,actorId,invoiceId:id,entityType:'Invoice',entityId:id,action:'DOCUMENT_VERIFIED',data:{number:updated.externalNumber,beneficiary:updated.vendorName,amount:updated.amount?.toString(),currency:updated.currency,source:certification?'certified_fixture_sha256':'human_confirmation',fixtureId:certification?.fixtureId??null,sha256:certification?.sha256??null,paymentExecuted:false}}});
  return {id,status:updated.status};
 });
}
