import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/server/db/prisma';
import { can, type Permission, type UserRole } from './roles';
import { verifyPassword } from './password';
import { projectEnv } from '@/lib/project-env';

export const AUTH_COOKIE='finvigia_auth_session';
export const LEGACY_AUTH_COOKIE='blinka_auth_session';
export function sessionToken(request:NextRequest){return request.cookies.get(AUTH_COOKIE)?.value || request.cookies.get(LEGACY_AUTH_COOKIE)?.value;}
const TTL_MS=8*60*60*1000;
const noStore={'Cache-Control':'no-store'};
export type AuthUser={id:string;organizationId:string;email:string;displayName:string;role:UserRole};
export type AuthIdentity={user:AuthUser;sessionId:string;mfaEnabled:boolean;mfaVerified:boolean};
export function tokenHash(raw:string){return createHash('sha256').update(raw).digest('hex');}
export function isSameOrigin(request:NextRequest):boolean {
  const origin=request.headers.get('origin');
  return Boolean(origin && origin===new URL(request.url).origin);
}
export function sessionCookie(value:string,maxAge:number){
  return {name:AUTH_COOKIE,value,options:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge,priority:'high' as const}};
}
export async function currentIdentity(request:NextRequest):Promise<AuthIdentity|null> {
  const token=sessionToken(request);
  if(!token || !/^[a-f0-9]{64}$/.test(token))return null;
  const session=await getPrisma().authSession.findUnique({where:{tokenHash:tokenHash(token)},include:{user:{include:{organization:true}}}});
  if(!session || session.revokedAt || session.expiresAt.getTime()<=Date.now() || !session.user.isActive || !session.user.passwordHash)return null;
  const user=session.user;
  if(user.organization.slug!==(projectEnv('DEMO_ORGANIZATION_SLUG')||'atlas-global-demo'))return null;
  return {sessionId:session.id,mfaEnabled:user.mfaEnabled,mfaVerified:session.mfaVerified,user:{id:user.id,organizationId:user.organizationId,email:user.email,displayName:user.displayName,role:user.role}};
}
export async function currentUser(request:NextRequest):Promise<AuthUser|null> {
  const identity=await currentIdentity(request);
  return identity?.mfaEnabled&&identity.mfaVerified?identity.user:null;
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
export async function authenticate(email:string,password:string):Promise<{user:AuthUser|null;token:string;requiresMfa:boolean;setupRequired:boolean}|null> {
  const prisma=getPrisma();
  const org=await prisma.organization.findUnique({where:{slug:projectEnv('DEMO_ORGANIZATION_SLUG')||'atlas-global-demo'}});
  if(!org)return null;
  const user=await prisma.appUser.findUnique({where:{organizationId_email:{organizationId:org.id,email:email.trim().toLowerCase()}}});
  const fake='scrypt$16384$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef$'+ '00'.repeat(64);
  const matched=await verifyPassword(password,user?.passwordHash??fake);
  if(!user || !user.isActive || !user.passwordHash || (user.lockedUntil && user.lockedUntil>new Date()) || !matched){
    if(user && user.isActive && (!user.lockedUntil || user.lockedUntil<=new Date())){
      await prisma.$transaction(async tx=>{
        const updated=await tx.appUser.update({where:{id:user.id},data:{failedAttempts:{increment:1}}});
        if(updated.failedAttempts>=5)await tx.appUser.update({where:{id:user.id},data:{failedAttempts:0,lockedUntil:new Date(Date.now()+15*60*1000)}});
        await tx.auditEvent.create({data:{organizationId:org.id,entityType:'AuthSession',entityId:user.id,action:updated.failedAttempts>=5?'AUTH_ACCOUNT_LOCKED':'AUTH_LOGIN_FAILED',data:{accountKnown:true,temporaryLock:updated.failedAttempts>=5}}});
      });
    }
    return null;
  }
  const token=randomBytes(32).toString('hex');
  await prisma.$transaction(async tx=>{
    await tx.appUser.update({where:{id:user.id},data:{failedAttempts:0,lockedUntil:null}});
    if(user.mfaEnabled){
      await tx.mfaLoginChallenge.create({data:{userId:user.id,tokenHash:tokenHash(token),expiresAt:new Date(Date.now()+5*60*1000)}});
      await tx.auditEvent.create({data:{organizationId:org.id,actorId:user.id,entityType:'AuthSession',entityId:user.id,action:'AUTH_MFA_CHALLENGE_CREATED',data:{method:'password'}}});
    }else{
      const session=await tx.authSession.create({data:{userId:user.id,tokenHash:tokenHash(token),mfaVerified:false,expiresAt:new Date(Date.now()+8*60*60*1000)}});
      await tx.auditEvent.create({data:{organizationId:org.id,actorId:user.id,entityType:'AuthSession',entityId:session.id,action:'AUTH_MFA_ENROLLMENT_REQUIRED',data:{method:'password'}}});
    }
  });
  return {user:null,token,requiresMfa:user.mfaEnabled,setupRequired:!user.mfaEnabled};
}
export async function revokeSession(request:NextRequest):Promise<void>{
  const token=sessionToken(request);
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
