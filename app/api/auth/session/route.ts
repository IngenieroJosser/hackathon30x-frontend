import { readJsonBounded } from '@/server/security/request-body';
import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate,currentUser,currentIdentity,isSameOrigin,revokeSession,sessionCookie,LEGACY_AUTH_COOKIE } from '@/server/security/auth';
import {mfaChallengeCookie,pendingChallenge} from '@/server/security/mfa-service';
import { consumeLoginAttempt } from '@/server/security/login-throttle';
import { WorkflowError } from '@/server/workflows/common';
const noStore={'Cache-Control':'no-store'};
const schema=z.object({email:z.email().max(255),password:z.string().min(1).max(256)}).strict();
export async function GET(request:NextRequest){
 try{const identity=await currentIdentity(request);return NextResponse.json({user:await currentUser(request),mfaSetupRequired:Boolean(identity&&!identity.mfaEnabled),mfaChallengeRequired:await pendingChallenge(request)},{headers:noStore});}
 catch{return NextResponse.json({error:'No se pudo consultar la sesión.'},{status:503,headers:noStore});}
}
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return NextResponse.json({error:'Origen no permitido.'},{status:403,headers:noStore});
 if(Number(request.headers.get('content-length')||0)>1600)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413,headers:noStore});
 try{
  const body=schema.safeParse(await readJsonBounded(request,1600));
  if(!body.success)return NextResponse.json({error:'Credenciales inválidas.'},{status:400,headers:noStore});
  // El contador persistente se incrementa ANTES de verificar scrypt.
  if(!await consumeLoginAttempt(request,body.data.email))
   return NextResponse.json({error:'Demasiados intentos. Intenta nuevamente más tarde.'},{status:429,headers:{...noStore,'Retry-After':'900'}});
  const result=await authenticate(body.data.email,body.data.password);
  if(!result)return NextResponse.json({error:'Credenciales incorrectas o cuenta temporalmente bloqueada.'},{status:401,headers:noStore});
  const response=NextResponse.json({user:result.user,requiresMfa:result.requiresMfa,mfaSetupRequired:result.setupRequired},{headers:noStore});
  const cookie=result.requiresMfa?mfaChallengeCookie(result.token,5*60):sessionCookie(result.token,8*60*60);response.cookies.set(cookie.name,cookie.value,cookie.options);
  return response;
 }catch(e){
  if(e instanceof WorkflowError)return NextResponse.json({error:e.message},{status:e.status,headers:noStore});
  return NextResponse.json({error:'No se pudo iniciar la sesión.'},{status:503,headers:noStore});
 }
}
export async function DELETE(request:NextRequest){
 if(!isSameOrigin(request))return NextResponse.json({error:'Origen no permitido.'},{status:403,headers:noStore});
 try{await revokeSession(request);}catch{return NextResponse.json({error:'No se pudo cerrar la sesión.'},{status:503,headers:noStore});}
 const response=NextResponse.json({user:null},{headers:noStore});
 const cookie=sessionCookie('',0);response.cookies.set(cookie.name,cookie.value,cookie.options);const pending=mfaChallengeCookie('',0);response.cookies.set(pending.name,pending.value,pending.options);
 // Delete the legacy cookie too; an old browser session must not survive logout.
 response.cookies.set(LEGACY_AUTH_COOKIE,'',{...cookie.options,maxAge:0});
 return response;
}
