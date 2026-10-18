import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/server/db/prisma';
import { can, type Permission, type UserRole } from './roles';
import { verifyPassword } from './password';

export const AUTH_COOKIE='blinka_auth_session';
const TTL_MS=8*60*60*1000;
const noStore={'Cache-Control':'no-store'};
export type AuthUser={id:string;organizationId:string;email:string;displayName:string;role:UserRole};
export function tokenHash(raw:string){return createHash('sha256').update(raw).digest('hex');}
export function isSameOrigin(request:NextRequest):boolean {
  const origin=request.headers.get('origin');
  return Boolean(origin && origin===new URL(request.url).origin);
}
export function sessionCookie(value:string,maxAge:number){
  return {name:AUTH_COOKIE,value,options:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge,priority:'high' as const}};
}
export async function currentUser(request:NextRequest):Promise<AuthUser|null> {
  const token=request.cookies.get(AUTH_COOKIE)?.value;
  if(!token || !/^[a-f0-9]{64}$/.test(token))return null;
  const session=await getPrisma().authSession.findUnique({where:{tokenHash:tokenHash(token)},include:{user:{include:{organization:true}}}});
  if(!session || session.revokedAt || session.expiresAt.getTime()<=Date.now() || !session.user.isActive || !session.user.passwordHash)return null;
  const user=session.user;
  if(user.organization.slug!==(process.env.BLINKA_DEMO_ORGANIZATION_SLUG||'atlas-global-demo'))return null;
  return {id:user.id,organizationId:user.organizationId,email:user.email,displayName:user.displayName,role:user.role};
}
export async function requirePermission(request:NextRequest,permission:Permission):Promise<{actor:AuthUser;denied:null}|{actor:null;denied:NextResponse}> {
  // Session validation and RBAC happen on the server on EVERY protected route.
  try {
    const actor=await currentUser(request);
    if(!actor)return {actor:null,denied:NextResponse.json({error:'Autenticación requerida.'},{status:401,headers:noStore})};
    if(!can(actor.role,permission))return {actor:null,denied:NextResponse.json({error:'No tienes permisos para esta operación.'},{status:403,headers:noStore})};
    if(!['GET','HEAD','OPTIONS'].includes(request.method)&&!isSameOrigin(request))
      return {actor:null,denied:NextResponse.json({error:'Origen de solicitud no permitido.'},{status:403,headers:noStore})};
    return {actor,denied:null};
  } catch {
    return {actor:null,denied:NextResponse.json({error:'No se pudo comprobar tu sesión.'},{status:503,headers:noStore})};
  }
}
export async function authenticate(email:string,password:string):Promise<{user:AuthUser;token:string}|null> {
  const prisma=getPrisma();
  const org=await prisma.organization.findUnique({where:{slug:process.env.BLINKA_DEMO_ORGANIZATION_SLUG||'atlas-global-demo'}});
  if(!org)return null;
  const user=await prisma.appUser.findUnique({where:{organizationId_email:{organizationId:org.id,email:email.trim().toLowerCase()}}});
  // Compute an expensive dummy password verification for unknown accounts to reduce enumeration timing leaks.
  const fake='scrypt$16384$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef$'+ '00'.repeat(64);
  const matched=await verifyPassword(password,user?.passwordHash??fake);
  if(!user || !user.isActive || !user.passwordHash || (user.lockedUntil && user.lockedUntil>new Date()) || !matched){
    if(user && user.isActive && (!user.lockedUntil || user.lockedUntil<=new Date())){
      const attempts=user.failedAttempts+1;
      await prisma.$transaction(async tx=>{
        await tx.appUser.update({where:{id:user.id},data:{failedAttempts:attempts>=5?0:attempts,lockedUntil:attempts>=5?new Date(Date.now()+15*60*1000):null}});
        await tx.auditEvent.create({data:{organizationId:org.id,entityType:'AuthSession',entityId:user.id,action:attempts>=5?'AUTH_ACCOUNT_LOCKED':'AUTH_LOGIN_FAILED',data:{accountKnown:true,failedAttempts:attempts,temporaryLock:attempts>=5}}});
      });
    }
    return null;
  }
  const token=randomBytes(32).toString('hex');
  const expiresAt=new Date(Date.now()+TTL_MS);
  await prisma.$transaction(async tx=>{
    await tx.appUser.update({where:{id:user.id},data:{failedAttempts:0,lockedUntil:null}});
    await tx.authSession.create({data:{userId:user.id,tokenHash:tokenHash(token),expiresAt}});
    await tx.auditEvent.create({data:{organizationId:org.id,actorId:user.id,entityType:'AuthSession',entityId:user.id,action:'AUTH_LOGIN',data:{role:user.role,method:'password',paymentExecuted:false}}});
  });
  return {user:{id:user.id,organizationId:org.id,email:user.email,displayName:user.displayName,role:user.role},token};
}
export async function revokeSession(request:NextRequest):Promise<void>{
  const token=request.cookies.get(AUTH_COOKIE)?.value;
  if(!token || !/^[a-f0-9]{64}$/.test(token))return;
  const hash=tokenHash(token);
  const prisma=getPrisma();
  const session=await prisma.authSession.findUnique({where:{tokenHash:hash},include:{user:true}});
  if(!session || session.revokedAt)return;
  await prisma.$transaction(async tx=>{
    await tx.authSession.update({where:{id:session.id},data:{revokedAt:new Date()}});
    await tx.auditEvent.create({data:{organizationId:session.user.organizationId,actorId:session.userId,entityType:'AuthSession',entityId:session.id,action:'AUTH_LOGOUT',data:{paymentExecuted:false}}});
  });
}
