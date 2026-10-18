import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/server/db/prisma';
import { organization, norm, WorkflowError, serializable } from './common';
import { validateDemoPolicy } from '@/lib/policy-validation';

export async function workspaceSnapshot(){
 const org=await organization();
 // One repeatable-read snapshot prevents inconsistent cross-module reads while mutations commit.
 return getPrisma().$transaction(async tx=>{
  const [policy,vendors,invoices,approvals,audit,budget]=await Promise.all([
   tx.paymentPolicy.findFirst({where:{organizationId:org.id,isActive:true},orderBy:{version:'desc'}}),
   tx.vendor.findMany({where:{organizationId:org.id},include:{agreements:{orderBy:{version:'desc'}}},orderBy:{name:'asc'},take:300}),
   tx.invoice.findMany({where:{organizationId:org.id},include:{document:true,extractions:{orderBy:{createdAt:'desc'},take:1},decisions:{orderBy:{revision:'desc'},take:1}},orderBy:{createdAt:'desc'},take:250}),
   tx.approvalRequest.findMany({where:{invoice:{organizationId:org.id}},include:{invoice:true,decision:true},orderBy:{requestedAt:'desc'},take:100}),
   tx.auditEvent.findMany({where:{organizationId:org.id},include:{actor:{select:{id:true,displayName:true,email:true,role:true}}},orderBy:{occurredAt:'desc'},take:400}),
   tx.budgetPeriod.findMany({where:{organizationId:org.id},orderBy:{periodStart:'desc'},take:3}),
  ]);
  return JSON.parse(JSON.stringify({organization:{id:org.id,name:org.name,slug:org.slug},policy,vendors,invoices,approvals,audit,budget,source:'neon_postgresql',paymentExecuted:false}));
 },{isolationLevel:'RepeatableRead',maxWait:7000,timeout:15000});
}
export async function publishPolicy(input:{autonomousLimit:number;hardLimit:number;monthlyBudget:number;expectedVersion:number},actorId:string){
 const issues=validateDemoPolicy({...input,currency:'USD'});if(issues.length)throw new WorkflowError(issues.join(' '));
 const org=await organization();
 return serializable(async tx=>{
  const current=await tx.paymentPolicy.findFirst({where:{organizationId:org.id,isActive:true},orderBy:{version:'desc'}});
  if(!current || current.version!==input.expectedVersion)throw new WorkflowError('La política cambió desde que abriste esta pantalla. Actualiza y reintenta.',409);
  const date=new Date(); const start=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1));
  const budget=await tx.budgetPeriod.findUnique({where:{organizationId_periodStart_currency:{organizationId:org.id,periodStart:start,currency:'USD'}}});
  if(budget && Number(budget.reserved)+Number(budget.consumed)>input.monthlyBudget)throw new WorkflowError('El nuevo presupuesto no puede ser menor que el saldo reservado o consumido.',409);
  await tx.paymentPolicy.updateMany({where:{organizationId:org.id,isActive:true},data:{isActive:false}});
  const published=await tx.paymentPolicy.create({data:{organizationId:org.id,version:current.version+1,isActive:true,autonomousLimit:input.autonomousLimit.toFixed(2),hardLimit:input.hardLimit.toFixed(2),monthlyBudget:input.monthlyBudget.toFixed(2),rules:current.rules as Prisma.InputJsonValue,currency:'USD'}});
  if(budget)await tx.budgetPeriod.update({where:{id:budget.id},data:{allocation:input.monthlyBudget.toFixed(2),version:{increment:1}}});
  await tx.auditEvent.create({data:{organizationId:org.id,actorId,entityType:'PaymentPolicy',entityId:published.id,action:'POLICY_PUBLISHED',data:{previousVersion:current.version,newVersion:published.version,autonomousLimit:input.autonomousLimit,hardLimit:input.hardLimit,monthlyBudget:input.monthlyBudget}}});
  return {version:published.version};
 });
}
export type VendorInput={name:string;country:string;category:string;contactEmail?:string;agreementReference:string;agreementLimit:number};
export async function saveVendor(input:VendorInput,actorId:string,id?:string){
 const org=await organization();
 return serializable(async tx=>{
  let vendor;
  const normalizedName=norm(input.name);
  if(id){
    const previous=await tx.vendor.findFirst({where:{id,organizationId:org.id},include:{agreements:{orderBy:{version:'desc'},take:1}}});
    if(!previous)throw new WorkflowError('Beneficiario no encontrado.',404);
    const changed=norm(previous.name)!==normalizedName || previous.country!==input.country || previous.agreements[0]?.reference!==input.agreementReference || Number(previous.agreements[0]?.amountLimit??0)!==input.agreementLimit;
    vendor=await tx.vendor.update({where:{id},data:{name:input.name,normalizedName,country:input.country,category:input.category,contactEmail:input.contactEmail||null,status:changed?'REVIEW':previous.status,revision:{increment:1}}});
    if(changed){
      const latest=await tx.vendorAgreement.findFirst({where:{vendorId:id},orderBy:{version:'desc'}});
      await tx.vendorAgreement.create({data:{organizationId:org.id,vendorId:id,reference:input.agreementReference,amountLimit:input.agreementLimit.toFixed(2),version:(latest?.version??0)+1,currency:'USD'}});
    }
  }else{
    vendor=await tx.vendor.create({data:{organizationId:org.id,name:input.name,normalizedName,country:input.country,category:input.category,contactEmail:input.contactEmail||null,status:'REVIEW'}});
    await tx.vendorAgreement.create({data:{organizationId:org.id,vendorId:vendor.id,reference:input.agreementReference,amountLimit:input.agreementLimit.toFixed(2),currency:'USD',version:1}});
  }
  await tx.auditEvent.create({data:{organizationId:org.id,actorId,entityType:'Vendor',entityId:vendor.id,action:id?'VENDOR_UPDATED':'VENDOR_CREATED',data:{name:vendor.name,status:vendor.status,revision:vendor.revision,agreementReference:input.agreementReference,agreementLimit:input.agreementLimit}}});
  return {id:vendor.id,status:vendor.status,revision:vendor.revision};
 });
}
export async function changeVendorStatus(id:string,status:'AUTHORIZED'|'REVIEW'|'BLOCKED',actorId:string){
 const org=await organization();
 return serializable(async tx=>{
  const vendor=await tx.vendor.findFirst({where:{id,organizationId:org.id}});
  if(!vendor)throw new WorkflowError('Beneficiario no encontrado.',404);
  const update=await tx.vendor.update({where:{id},data:{status,revision:{increment:1}}});
  await tx.auditEvent.create({data:{organizationId:org.id,actorId,entityType:'Vendor',entityId:id,action:'VENDOR_STATUS_CHANGED',data:{previous:vendor.status,status,revision:update.revision}}});
  return {id,status:update.status};
 });
}
