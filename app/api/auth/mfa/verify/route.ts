import {NextRequest,NextResponse} from 'next/server';
import {isSameOrigin} from '@/server/security/auth';
import {finishLogin,mfaChallengeCookie} from '@/server/security/mfa-service';
import {readJsonBounded} from '@/server/security/request-body';
import {apiFailure} from '@/server/workflows/common';
import {z} from 'zod';
export async function POST(req:NextRequest){
 const headers={'Cache-Control':'no-store'};
 if(!isSameOrigin(req))return NextResponse.json({error:'Origen inválido.'},{status:403,headers});
 try{
  const {code}=z.object({code:z.string().min(6).max(32)}).strict().parse(await readJsonBounded(req,500));
  const result=await finishLogin(req,code);
  const response=NextResponse.json({user:result.user},{headers});
  response.cookies.set(result.cookie.name,result.cookie.value,result.cookie.options);
  const pending=mfaChallengeCookie('',0);response.cookies.set(pending.name,pending.value,pending.options);
  return response;
 }catch(e){const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status,headers});}
}
