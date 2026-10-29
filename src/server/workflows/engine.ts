import 'server-only';
import {bankStatusAcceptable,syntheticAuthorizationsEnabled} from './banking';
import type { Prisma } from '@/generated/prisma/client';
import { organization, WorkflowError, asCents, toMoney, norm, normInvoice, serializable, type DbTx } from './common';

const currency='USD';
type Outcome='AUTHORIZED'|'BLOCKED'|'ESCALATED';
export type Evaluation={outcome:Outcome;ruleCode:string;reason:string;checks:string[];vendorId?:string;agreementId?:string;vendorSnapshot?:Prisma.InputJsonObject;policySnapshot:Prisma.InputJsonObject;remainingCents:number};

async function context(tx:DbTx,invoiceId:string,orgId:string) {
  const invoice=await tx.invoice.findFirst({where:{id:invoiceId,organizationId:orgId}});
  if(!invoice)throw new WorkflowError('Factura no encontrada.',404);
  const policy=await tx.paymentPolicy.findFirst({where:{organizationId:orgId,isActive:true},orderBy:{version:'desc'}});
  if(!policy)throw new WorkflowError('No existe una política activa.',409);
  const vendor=invoice.vendorName?await tx.vendor.findUnique({where:{organizationId_normalizedName:{organizationId:orgId,normalizedName:norm(invoice.vendorName)}},include:{agreements:{orderBy:{version:'desc'},take:1},bankAccount:true}}):null;
  const month=new Date();const start=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),1));
  const next=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1));
  const budget=await tx.budgetPeriod.upsert({
    where:{organizationId_periodStart_currency:{organizationId:orgId,periodStart:start,currency}},
    update:{},create:{organizationId:orgId,periodStart:start,periodEnd:new Date(next.getTime()-86400000),currency,allocation:policy.monthlyBudget},
  });
  return {invoice,policy,vendor,budget};
}

async function calculate(tx:DbTx,orgId:string,invoiceId:string):Promise<{ evaluation:Evaluation; context:Awaited<ReturnType<typeof context>> }>{
  const ctx=await context(tx,invoiceId,orgId);
  const {invoice,policy,vendor,budget}=ctx;
  const remaining=asCents(budget.allocation.toString())-asCents(budget.reserved.toString())-asCents(budget.consumed.toString());
  const snapshot={id:policy.id,version:policy.version,autonomousLimit:policy.autonomousLimit.toString(),hardLimit:policy.hardLimit.toString(),monthlyBudget:policy.monthlyBudget.toString(),currency:policy.currency};
  const agreement=vendor?.agreements[0];
  const vendorSnapshot=vendor?{id:vendor.id,name:vendor.name,status:vendor.status,revision:vendor.revision,agreementId:agreement?.id??null,agreementReference:agreement?.reference??null,agreementLimit:agreement?.amountLimit.toString()??null,agreementCurrency:agreement?.currency??null,bankStatus:vendor.bankAccount?.status??'NOT_CONFIGURED',realBankConfirmed:vendor.bankAccount?.realBankConfirmed??false,bankRevision:vendor.bankAccount?.revision??null}:undefined;
  const result=(outcome:Outcome,ruleCode:string,reason:string,checks:string[]):Evaluation=>({outcome,ruleCode,reason,checks,vendorId:vendor?.id,agreementId:agreement?.id,vendorSnapshot,policySnapshot:snapshot,remainingCents:remaining});
  if(!invoice.externalNumber || !invoice.vendorName || !invoice.amount || !invoice.currency || !invoice.dueDate || !invoice.verifiedAt)
    return {evaluation:result('ESCALATED','UNVERIFIED_DOCUMENT','Faltan campos críticos o confirmación documental.',['Documento no confirmado']),context:ctx};
  // Scan in bounded batches but NEVER silently stop at a limit (fail-open would authorize duplicates).
  let duplicate: { externalNumber: string | null } | undefined;
  let cursor: string | undefined;
  for (;;) {
    const batch=await tx.invoice.findMany({
      where:{organizationId:orgId,id:{not:invoice.id},vendorName:{not:null},externalNumber:{not:null},createdAt:{lte:invoice.createdAt}},
      select:{id:true,externalNumber:true,vendorName:true},orderBy:{id:'asc'},take:250,
      ...(cursor?{cursor:{id:cursor},skip:1}:{}),
    });
    duplicate=batch.find(other=>norm(other.vendorName??'')===norm(invoice.vendorName??'') && normInvoice(other.externalNumber??'')===normInvoice(invoice.externalNumber??''));
    if(duplicate||batch.length<250)break;
    cursor=batch[batch.length-1].id;
  }
  if(duplicate) return {evaluation:result('BLOCKED','DUPLICATE_INVOICE',`La factura coincide con otro expediente (${duplicate.externalNumber}).`,['Identidad de cobro duplicada']),context:ctx};
  if(!vendor || vendor.status!=='AUTHORIZED')return {evaluation:result('BLOCKED','VENDOR_NOT_ALLOWED','El beneficiario no está autorizado.',[vendor?'Beneficiario en revisión o bloqueado':'Beneficiario desconocido']),context:ctx};
  if(!bankStatusAcceptable(vendor.bankAccount,vendor.revision,syntheticAuthorizationsEnabled()))
    return {evaluation:result('BLOCKED','BANK_ACCOUNT_NOT_VERIFIED','La cuenta bancaria del beneficiario no tiene verificación vigente para esta versión. No se permite autorizar.',['Cuenta ausente, modificada, no verificada o sin habilitación explícita del sandbox']),context:ctx};
  if(invoice.currency!==currency)return {evaluation:result('ESCALATED','CURRENCY_REVIEW_REQUIRED','Moneda sin conversión verificable. No se autoriza.', ['Requiere política FX verificable']),context:ctx};
  if(!agreement || agreement.currency!==currency)return {evaluation:result('BLOCKED','AGREEMENT_MISSING','Falta un acuerdo comercial vigente en USD.', ['Acuerdo no disponible']),context:ctx};
  const cents=asCents(invoice.amount.toString());
  if(cents>asCents(agreement.amountLimit.toString()))return {evaluation:result('BLOCKED','AGREEMENT_MISMATCH','Importe mayor que el acuerdo del beneficiario.', ['Límite contractual incumplido']),context:ctx};
  if(cents>asCents(policy.hardLimit.toString()))return {evaluation:result('BLOCKED','HARD_LIMIT_EXCEEDED','Importe mayor que el límite absoluto.', ['No admite aprobación ordinaria']),context:ctx};
  if(cents>remaining)return {evaluation:result('BLOCKED','BUDGET_INSUFFICIENT',`Presupuesto insuficiente. Disponible US$${toMoney(Math.max(0,remaining))}.`,['No hay saldo libre suficiente']),context:ctx};
  if(cents>asCents(policy.autonomousLimit.toString()))return {evaluation:result('ESCALATED','APPROVAL_REQUIRED','El importe supera el umbral autónomo. Espera autorización humana.', ['Dentro del límite absoluto','Beneficiario autorizado','Presupuesto suficiente']),context:ctx};
  return {evaluation:result('AUTHORIZED','ALL_POLICIES_PASSED','Cumple todas las políticas. Autorización simulada, sin transferencia.', ['Beneficiario permitido','Sin duplicados','Acuerdo vigente','Presupuesto reservado','Umbral autónomo respetado']),context:ctx};
}

async function appendDecision(tx:DbTx,orgId:string,invoiceId:string,e:Evaluation,verifiedAt:string|null,revision:number){
  const {invoice,policy}=await context(tx,invoiceId,orgId);
  return tx.paymentDecision.create({data:{invoiceId,policyId:policy.id,revision,outcome:e.outcome,ruleCode:e.ruleCode,reason:e.reason,checks:e.checks,policySnapshot:e.policySnapshot as Prisma.InputJsonValue,beneficiarySnapshot:(e.vendorSnapshot??{}) as Prisma.InputJsonValue,inputSnapshot:{number:invoice.externalNumber,beneficiary:invoice.vendorName,amount:invoice.amount?.toString(),currency:invoice.currency,dueDate:invoice.dueDate?.toISOString(),verifiedAt},evaluatedAt:new Date()}});
}
export async function evaluateInvoice(invoiceId:string,actorId:string) {
  const org=await organization();
  return serializable(async tx=>{
    const {evaluation:e,context:ctx}=await calculate(tx,org.id,invoiceId);
    if(ctx.invoice.status!=='READY')throw new WorkflowError('Solo se puede evaluar una factura confirmada y lista.',409);
    if(e.ruleCode==='UNVERIFIED_DOCUMENT')throw new WorkflowError('Verifica todos los campos antes de evaluar.',422);
    const revision=await tx.paymentDecision.count({where:{invoiceId}})+1;
    const decision=await appendDecision(tx,org.id,invoiceId,e,ctx.invoice.verifiedAt?.toISOString()??null,revision);
    if(e.outcome==='AUTHORIZED'){
      const amount=asCents(ctx.invoice.amount!.toString());
      await tx.budgetPeriod.update({where:{id:ctx.budget.id},data:{reserved:toMoney(asCents(ctx.budget.reserved.toString())+amount),version:{increment:1}}});
      await tx.budgetEntry.create({data:{budgetPeriodId:ctx.budget.id,invoiceId,type:'RESERVE',amount:toMoney(amount),reason:'Autorización autónoma simulada'}});
    }
    if(e.ruleCode==='APPROVAL_REQUIRED')await tx.approvalRequest.create({data:{invoiceId,decisionId:decision.id,status:'PENDING'}});
    await tx.invoice.update({where:{id:invoiceId},data:{status:e.outcome, vendorId:e.vendorId,agreementId:e.agreementId}});
    await tx.auditEvent.create({data:{organizationId:org.id,actorId,invoiceId,entityType:'PaymentDecision',entityId:decision.id,action:'DECISION_RECORDED',data:{ruleCode:e.ruleCode,outcome:e.outcome,checks:e.checks,policy:e.policySnapshot,beneficiary:e.vendorSnapshot??null,paymentExecuted:false}}});
    return {decisionId:decision.id,outcome:e.outcome,ruleCode:e.ruleCode,reason:e.reason};
  });
}

export async function resolveApproval(approvalId:string,action:'APPROVED'|'REJECTED',justification:string,actorId:string){
  if(justification.trim().length<12||justification.length>500)throw new WorkflowError('La justificación debe tener entre 12 y 500 caracteres.');
  const org=await organization();
  return serializable(async tx=>{
    const approval=await tx.approvalRequest.findFirst({where:{id:approvalId,invoice:{organizationId:org.id}},include:{invoice:true}});
    if(!approval)throw new WorkflowError('Solicitud no encontrada.',404);
    if(approval.status!=='PENDING'||approval.invoice.status!=='ESCALATED')throw new WorkflowError('Solicitud resuelta o desactualizada.',409);
    let checked:Evaluation|null=null;let budgetId:string|null=null;let cents=0;
    if(action==='APPROVED'){
      const result=await calculate(tx,org.id,approval.invoiceId);
      checked=result.evaluation;budgetId=result.context.budget.id;
      if(checked.ruleCode!=='APPROVAL_REQUIRED')throw new WorkflowError(`No es aprobable con las reglas actuales: ${checked.reason}`,409);
      cents=asCents(approval.invoice.amount!.toString());
      await tx.budgetPeriod.update({where:{id:budgetId},data:{reserved:toMoney(asCents(result.context.budget.reserved.toString())+cents),version:{increment:1}}});
      await tx.budgetEntry.create({data:{budgetPeriodId:budgetId,invoiceId:approval.invoiceId,type:'RESERVE',amount:toMoney(cents),reason:'Autorización humana simulada'}});
    }
    await tx.approvalRequest.update({where:{id:approvalId},data:{status:action,reviewerId:actorId,justification:justification.trim(),resolvedAt:new Date()}});
    await tx.invoice.update({where:{id:approval.invoiceId},data:{status:action==='APPROVED'?'AUTHORIZED':'REJECTED'}});
    await tx.auditEvent.create({data:{organizationId:org.id,actorId,invoiceId:approval.invoiceId,entityType:'ApprovalRequest',entityId:approvalId,action:action==='APPROVED'?'HUMAN_APPROVED':'HUMAN_REJECTED',data:{justification:justification.trim(),policy:checked?.policySnapshot??null,ruleCode:checked?.ruleCode??null,paymentExecuted:false}}});
    return {status:action,invoiceId:approval.invoiceId};
  });
}
