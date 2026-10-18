/** CLI ONLY: provision sandbox users after `yarn db:deploy` + `yarn db:seed`.
 * Supply private email/password values through local environment; NEVER deploy these bootstrap secrets.
 * Passwords must have at least 14 characters. No defaults or public signup.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword, passwordIsStrong } from '../src/server/security/password';
const url=process.env.DIRECT_URL;
if(!url)throw new Error('DIRECT_URL no configurada.');
const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:url,max:2})});
async function main(){
 const slug=process.env.BLINKA_DEMO_ORGANIZATION_SLUG||'atlas-global-demo';
 const org=await prisma.organization.findUnique({where:{slug}});
 if(!org)throw new Error('Organización no encontrada. Ejecuta yarn db:seed.');
 const entries=[
  {role:'ADMIN' as const,label:'Administrador',prefix:'BLINKA_ADMIN'},
  {role:'APPROVER' as const,label:'Aprobador',prefix:'BLINKA_APPROVER'},
  {role:'AUDITOR' as const,label:'Auditor',prefix:'BLINKA_AUDITOR'},
 ];
 const all=entries.map(e=>({...e,email:process.env[e.prefix+'_EMAIL']?.trim().toLowerCase(),password:process.env[e.prefix+'_PASSWORD']}));
 for(const u of all){
  if(!u.email || !u.password || !passwordIsStrong(u.password))throw new Error(`Configura ${u.prefix}_EMAIL y ${u.prefix}_PASSWORD (14-256 caracteres).`);
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u.email))throw new Error(`Email inválido: ${u.prefix}`);
 }
 if(new Set(all.map(u=>u.email)).size!==all.length)throw new Error('Cada rol requiere una dirección de email distinta.');
 for(const u of all){
  const hash=await hashPassword(u.password!);
  const saved=await prisma.appUser.upsert({
   where:{organizationId_email:{organizationId:org.id,email:u.email!}},
   create:{organizationId:org.id,email:u.email!,displayName:u.label,role:u.role,passwordHash:hash,isActive:true},
   update:{displayName:u.label,role:u.role,passwordHash:hash,isActive:true,failedAttempts:0,lockedUntil:null},
  });
  await prisma.authSession.updateMany({where:{userId:saved.id,revokedAt:null},data:{revokedAt:new Date()}});
  await prisma.auditEvent.create({data:{organizationId:org.id,actorId:saved.id,entityType:'AppUser',entityId:saved.id,action:'AUTH_ROLE_PROVISIONED',data:{role:u.role,method:'local_bootstrap',sessionsRevoked:true}}});
  console.log(`✓ Usuario ${u.role} creado o actualizado (credenciales no mostradas).`);
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Fallo en bootstrap');process.exitCode=1;}).finally(async()=>prisma.$disconnect());
