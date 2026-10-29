import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {requirePermission} from '@/server/security/auth';
import {readJsonBounded} from '@/server/security/request-body';
import {apiFailure} from '@/server/workflows/common';
import {registerBankAccount,verifyRegisteredBankAccount} from '@/server/workflows/banking';
const body=z.discriminatedUnion('action',[
 z.object({action:z.literal('register'),vendorId:z.uuid(),institutionCode:z.enum(['BANK-DEMO-A','BANK-DEMO-B']),accountReference:z.string().regex(/^TEST-ACCOUNT-\d{4}$/),accountKind:z.enum(['SAVINGS','CHECKING','PAYROLL']),holderReference:z.string().regex(/^PERSON-DEMO-\d{4}$/)}).strict(),
 z.object({action:z.literal('verify'),vendorId:z.uuid()}).strict()
]);
export async function POST(req:NextRequest){
 const headers={'Cache-Control':'no-store'};
 try{
  const input=body.parse(await readJsonBounded(req,4096));
  const {actor,denied}=await requirePermission(req,input.action==='register'?'manage_vendor':'verify_bank');if(denied)return denied;
  const result=input.action==='register'?await registerBankAccount(input.vendorId,{institutionCode:input.institutionCode,accountReference:input.accountReference,accountKind:input.accountKind,holderReference:input.holderReference},actor!.id):await verifyRegisteredBankAccount(input.vendorId,actor!.id);
  return NextResponse.json({result,realBankConfirmed:false,paymentExecuted:false},{headers});
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:'Datos ficticios incorrectos.',issues:e.issues},{status:400,headers});const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status,headers});}
}
