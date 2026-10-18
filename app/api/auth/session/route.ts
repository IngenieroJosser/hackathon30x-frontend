import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticate,currentUser,isSameOrigin,revokeSession,sessionCookie } from '@/server/security/auth';
const noStore={'Cache-Control':'no-store'};
const schema=z.object({email:z.email().max(255),password:z.string().min(1).max(256)}).strict();
export async function GET(request:NextRequest){
 try{return NextResponse.json({user:await currentUser(request)},{headers:noStore});}
 catch{return NextResponse.json({error:'No se pudo consultar la sesión.'},{status:503,headers:noStore});}
}
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return NextResponse.json({error:'Origen no permitido.'},{status:403,headers:noStore});
 if(Number(request.headers.get('content-length')||0)>1600)return NextResponse.json({error:'Solicitud demasiado grande.'},{status:413,headers:noStore});
 try{
  const body=schema.safeParse(await request.json());
  if(!body.success)return NextResponse.json({error:'Credenciales inválidas.'},{status:400,headers:noStore});
  const result=await authenticate(body.data.email,body.data.password);
  if(!result)return NextResponse.json({error:'Credenciales incorrectas o cuenta temporalmente bloqueada.'},{status:401,headers:noStore});
  const response=NextResponse.json({user:result.user},{headers:noStore});
  const cookie=sessionCookie(result.token,8*60*60);response.cookies.set(cookie.name,cookie.value,cookie.options);
  return response;
 }catch{return NextResponse.json({error:'No se pudo iniciar la sesión.'},{status:503,headers:noStore});}
}
export async function DELETE(request:NextRequest){
 if(!isSameOrigin(request))return NextResponse.json({error:'Origen no permitido.'},{status:403,headers:noStore});
 try{await revokeSession(request);}catch{return NextResponse.json({error:'No se pudo cerrar la sesión.'},{status:503,headers:noStore});}
 const response=NextResponse.json({user:null},{headers:noStore});
 const cookie=sessionCookie('',0);response.cookies.set(cookie.name,cookie.value,cookie.options);
 return response;
}
