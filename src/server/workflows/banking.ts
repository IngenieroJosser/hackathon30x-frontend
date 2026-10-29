import 'server-only';
import {syntheticBankProvider,bankStatusAcceptable,type BankAccountKind} from '@/lib/banking/verification';
import {keyedFingerprint,seal,unseal} from '@/server/security/secret-box';
import {organization,serializable,WorkflowError} from './common';
import {projectEnv} from '@/lib/project-env';

const SANDBOX_BANK_MODE='synthetic';
export const syntheticAuthorizationsEnabled=()=>projectEnv('BANK_MODE')===SANDBOX_BANK_MODE && projectEnv('ALLOW_SYNTHETIC_DECISIONS')==='true';
export {bankStatusAcceptable};
export type BankInput={institutionCode:string;accountReference:string;accountKind:BankAccountKind;holderReference:string};
export async function registerBankAccount(vendorId:string,input:BankInput,actorId:string){
 if(projectEnv('BANK_MODE')!==SANDBOX_BANK_MODE)throw new WorkflowError('El registro de cuentas de demostración solo está disponible en modo synthetic.',409);
 // Sin claves de cifrado, falla de manera cerrada.
 const accountCiphertext=seal(input.accountReference,'FINVIGIA_BANK_DATA_KEY');
 const holderCiphertext=seal(input.holderReference,'FINVIGIA_BANK_DATA_KEY');
 const fingerprint=keyedFingerprint(`${input.institutionCode}:${input.accountReference}:${input.holderReference}:${input.accountKind}`,'FINVIGIA_BANK_DATA_KEY');
 const maskedAccount=`TEST-…${input.accountReference.slice(-4)}`;
 const org=await organization();
 return serializable(async tx=>{
  const vendor=await tx.vendor.findFirst({where:{id:vendorId,organizationId:org.id}});
  if(!vendor)throw new WorkflowError('Beneficiario inexistente.',404);
  const previous=await tx.vendorBankAccount.findUnique({where:{vendorId}});
  const account=await tx.vendorBankAccount.upsert({where:{vendorId},
   create:{vendorId,organizationId:org.id,institutionCode:input.institutionCode,accountKind:input.accountKind,accountCiphertext,holderCiphertext,fingerprint,maskedAccount,enteredById:actorId,revision:1,status:'PENDING'},
   update:{institutionCode:input.institutionCode,accountKind:input.accountKind,accountCiphertext,holderCiphertext,fingerprint,maskedAccount,enteredById:actorId,revision:{increment:1},status:'PENDING',verifiedAt:null,verifiedById:null,verifiedVendorRevision:null,realBankConfirmed:false}});
  await tx.vendor.update({where:{id:vendorId},data:{status:'REVIEW',revision:{increment:1}}});
  await tx.auditEvent.create({data:{organizationId:org.id,actorId,entityType:'VendorBankAccount',entityId:account.id,action:'BANK_DETAILS_REPLACED',data:{vendorId,revision:account.revision,previousRevision:previous?.revision??null,source:'synthetic',realBankConfirmed:false}}});
  return {id:account.id,maskedAccount:account.maskedAccount,status:'PENDING',revision:account.revision};
 });
}
export async function verifyRegisteredBankAccount(vendorId:string,actorId:string){
 if(projectEnv('BANK_MODE')!==SANDBOX_BANK_MODE)throw new WorkflowError('El proveedor de validación bancaria no está configurado.',503);
 const org=await organization();
 return serializable(async tx=>{
  const vendor=await tx.vendor.findFirst({where:{id:vendorId,organizationId:org.id},include:{bankAccount:true}});
  const account=vendor?.bankAccount;
  if(!vendor||!account)throw new WorkflowError('Primero registra la cuenta ficticia.',404);
  if(account.enteredById===actorId)throw new WorkflowError('La cuenta debe revisarla una persona distinta a quien la registró.',403);
  const result=await syntheticBankProvider.verify({institutionCode:account.institutionCode,accountReference:unseal(account.accountCiphertext,'FINVIGIA_BANK_DATA_KEY'),holderReference:unseal(account.holderCiphertext,'FINVIGIA_BANK_DATA_KEY'),accountKind:account.accountKind as BankAccountKind});
  const updated=await tx.vendorBankAccount.update({where:{id:account.id},data:{status:result.status,realBankConfirmed:false,verifiedById:actorId,verifiedVendorRevision:result.status==='SYNTHETIC_MATCH'?vendor.revision:null,verifiedAt:new Date()}});
  await tx.auditEvent.create({data:{organizationId:org.id,actorId,entityType:'VendorBankAccount',entityId:account.id,action:'BANK_SYNTHETIC_CHECK',data:{vendorId,status:result.status,accountKindConfirmed:result.accountKindConfirmed,holderConfirmed:result.holderConfirmed,realBankConfirmed:false,revision:updated.revision}}});
  return {status:updated.status,realBankConfirmed:false,maskedAccount:updated.maskedAccount};
 });
}
