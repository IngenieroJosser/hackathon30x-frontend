import {NextRequest,NextResponse} from 'next/server';
import {currentIdentity,isSameOrigin} from '@/server/security/auth';
import {beginEnrollment,finishEnrollment} from '@/server/security/mfa-service';
import {readJsonBounded} from '@/server/security/request-body';
import {z} from 'zod';
import {apiFailure} from '@/server/workflows/common';
import {consumeLoginAttempt} from '@/server/security/login-throttle';
const headers={'Cache-Control':'no-store'};
export async function POST(req:NextRequest){
 if(!isSameOrigin(req))return NextResponse.json({error:'Origen inválido.'},{status:403,headers});
 try{
  const identity=await currentIdentity(req);
  if(!identity)return NextResponse.json({error:'Inicia sesión para configurar MFA.'},{status:401,headers});
  const data=z.discriminatedUnion('action',[z.object({action:z.literal('start')}).strict(),z.object({action:z.literal('confirm'),code:z.string().regex(/^\d{6}$/)}).strict()]).parse(await readJsonBounded(req,1000));
  if(identity.mfaEnabled)return NextResponse.json({error:'MFA ya está activado.'},{status:409,headers});
  if(!await consumeLoginAttempt(req,`enrollment:${identity.user.id}`))return NextResponse.json({error:'Demasiados intentos de configuración MFA.'},{status:429,headers:{...headers,'Retry-After':'900'}});
  const result=data.action==='start'?await beginEnrollment(identity.user.id):await finishEnrollment(identity.user.id,identity.sessionId,data.code);
  return NextResponse.json(result,{headers});
 }catch(e){const {status,message}=apiFailure(e);return NextResponse.json({error:message},{status,headers});}
}
