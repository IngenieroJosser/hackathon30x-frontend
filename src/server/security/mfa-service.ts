import 'server-only';
import {randomBytes} from 'node:crypto';
import {getPrisma} from '@/server/db/prisma';
import {tokenHash,sessionCookie,AUTH_COOKIE} from './auth';
import {seal,unseal} from './secret-box';
import {matchTotpStep,newTotpSecret,newRecoveryCode,recoveryDigest} from './mfa-totp';
import type {NextRequest} from 'next/server';
import {WorkflowError} from '@/server/workflows/common';

const CHALLENGE_COOKIE='finvigia_mfa_pending';
export const mfaChallengeCookie=(value:string,maxAge:number)=>({name:CHALLENGE_COOKIE,value,options:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/',maxAge,priority:'high' as const}});
export function newToken(){return randomBytes(32).toString('hex');}
export function readMfaChallenge(request:NextRequest){const raw=request.cookies.get(CHALLENGE_COOKIE)?.value;return raw && /^[a-f0-9]{64}$/.test(raw)?raw:null;}
export async function pendingChallenge(request:NextRequest){
 const raw=readMfaChallenge(request);if(!raw)return false;
 const challenge=await getPrisma().mfaLoginChallenge.findUnique({where:{tokenHash:tokenHash(raw)}});
 return Boolean(challenge && !challenge.consumedAt && challenge.expiresAt>new Date() && challenge.attempts<5);
}
export async function beginEnrollment(userId:string){
 const db=getPrisma();const user=await db.appUser.findUnique({where:{id:userId}});
 if(!user||user.mfaEnabled)throw new WorkflowError('La cuenta ya tiene MFA o no está disponible.',409);
 const secret=user.mfaPendingSecret?unseal(user.mfaPendingSecret,'FINVIGIA_MFA_KEY'):newTotpSecret();
 if(!user.mfaPendingSecret)await db.appUser.update({where:{id:userId},data:{mfaPendingSecret:seal(secret,'FINVIGIA_MFA_KEY')}});
 const label=encodeURIComponent(`FinVigía:${user.email}`);
 const uri=`otpauth://totp/${label}?secret=${secret}&issuer=FinVigía&algorithm=SHA1&digits=6&period=30`;
 return {secret,uri,issuer:'FinVigía',account:user.email};
}
export async function finishEnrollment(userId:string,sessionId:string,code:string){
 const db=getPrisma();
 return db.$transaction(async tx=>{
  const user=await tx.appUser.findUnique({where:{id:userId}});
  const session=await tx.authSession.findUnique({where:{id:sessionId}});
  if(!user || user.mfaEnabled || !user.mfaPendingSecret || !session || session.userId!==user.id || session.revokedAt || session.expiresAt<=new Date())throw new WorkflowError('Configuración MFA no disponible.',409);
  const secret=unseal(user.mfaPendingSecret,'FINVIGIA_MFA_KEY');
  const step=matchTotpStep(secret,code,Date.now(),Number(user.mfaLastStep));
  if(step===null)throw new WorkflowError('Código MFA incorrecto o ya utilizado.',401);
  const changed=await tx.appUser.updateMany({where:{id:user.id,mfaEnabled:false,mfaPendingSecret:user.mfaPendingSecret},data:{mfaEnabled:true,mfaSecret:user.mfaPendingSecret,mfaPendingSecret:null,mfaLastStep:BigInt(step)}});
  if(changed.count!==1)throw new WorkflowError('La configuración MFA cambió. Reintenta.',409);
  const codes=Array.from({length:8},()=>newRecoveryCode());
  await tx.mfaRecoveryCode.createMany({data:codes.map(c=>({userId:user.id,digest:recoveryDigest(c)}))});
  await tx.authSession.updateMany({where:{userId:user.id,id:{not:session.id},revokedAt:null},data:{revokedAt:new Date()}});
  await tx.authSession.update({where:{id:session.id},data:{mfaVerified:true}});
  await tx.auditEvent.create({data:{organizationId:user.organizationId,actorId:user.id,entityType:'AuthSession',entityId:session.id,action:'MFA_ENROLLED',data:{method:'totp',recoveryCodesIssued:codes.length}}});
  return {recoveryCodes:codes};
 });
}
export async function finishLogin(request:NextRequest,code:string){
 const raw=readMfaChallenge(request);if(!raw)throw new WorkflowError('Desafío MFA inexistente.',401);
 const db=getPrisma();const challenge=await db.mfaLoginChallenge.findUnique({where:{tokenHash:tokenHash(raw)},include:{user:true}});
 // Preserve the validated encrypted secret in a local constant: Prisma models it as nullable.
 // Never fall back to an empty value or bypass the second factor.
 const encryptedSecret=challenge?.user.mfaSecret;
 if(!challenge||challenge.consumedAt||challenge.expiresAt<=new Date()||challenge.attempts>=5||!challenge.user.isActive||!challenge.user.mfaEnabled||!encryptedSecret)throw new WorkflowError('Desafío MFA inválido o caducado.',401);
 const claimed=await db.mfaLoginChallenge.updateMany({where:{id:challenge.id,consumedAt:null,attempts:{lt:5},expiresAt:{gt:new Date()}},data:{attempts:{increment:1}}});
 if(claimed.count!==1)throw new WorkflowError('Desafío MFA agotado.',401);
 const user=challenge.user;
 const isTotp=/^\d{6}$/.test(code);
 const totpStep=isTotp?matchTotpStep(unseal(encryptedSecret,'FINVIGIA_MFA_KEY'),code,Date.now(),Number(user.mfaLastStep)):null;
 const digest= !isTotp && /^[A-Fa-f\d\-]{24,30}$/.test(code)?recoveryDigest(code):null;
 return db.$transaction(async tx=>{
  let accepted=false;
  if(totpStep!==null){
   const update=await tx.appUser.updateMany({where:{id:user.id,mfaLastStep:{lt:BigInt(totpStep)}},data:{mfaLastStep:BigInt(totpStep)}});
   accepted=update.count===1;
  } else if(digest){
   const used=await tx.mfaRecoveryCode.deleteMany({where:{userId:user.id,digest}});
   accepted=used.count===1;
  }
  if(!accepted)throw new WorkflowError('Código incorrecto, reutilizado o caducado.',401);
  const consumed=await tx.mfaLoginChallenge.updateMany({where:{id:challenge.id,consumedAt:null},data:{consumedAt:new Date()}});
  if(consumed.count!==1)throw new WorkflowError('Desafío ya utilizado.',401);
  const token=newToken();
  const session=await tx.authSession.create({data:{userId:user.id,tokenHash:tokenHash(token),mfaVerified:true,expiresAt:new Date(Date.now()+8*60*60*1000)}});
  await tx.auditEvent.create({data:{organizationId:user.organizationId,actorId:user.id,entityType:'AuthSession',entityId:session.id,action:'AUTH_LOGIN_MFA',data:{method:totpStep===null?'recovery_code':'totp'}}});
  return {token,user:{id:user.id,organizationId:user.organizationId,email:user.email,displayName:user.displayName,role:user.role},cookie:sessionCookie(token,8*60*60)};
 });
}
export {AUTH_COOKIE};
