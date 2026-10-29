import 'server-only';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { getPrisma } from '@/server/db/prisma';
import { projectEnv } from '@/lib/project-env';
export const slug=()=>projectEnv('DEMO_ORGANIZATION_SLUG') || 'atlas-global-demo';
export async function organization() {
  const found=await getPrisma().organization.findUnique({where:{slug:slug()}});
  if(!found)throw new WorkflowError('Organización no encontrada. Ejecuta yarn db:seed.',404);
  return found;
}
export class WorkflowError extends Error{constructor(message:string,public status=400){super(message);this.name='WorkflowError';}}
export const asCents=(value:string|number|null|undefined)=>{
  if(value===null||value===undefined)return 0;
  const s=String(value);
  if(!/^\d{1,12}(?:\.\d{1,2})?$/.test(s))throw new WorkflowError('Importe decimal inválido.');
  const [a,b='']=s.split('.');
  const n=Number(a)*100+Number(b.padEnd(2,'0'));
  if(!Number.isSafeInteger(n))throw new WorkflowError('Importe fuera del rango seguro.');
  return n;
};
export const toMoney=(cents:number)=> (cents/100).toFixed(2);
export const norm=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
export const normInvoice=(value:string)=>value.normalize('NFKD').toUpperCase().replace(/[^A-Z0-9]/g,'');
export function apiFailure(error:unknown){
  if(error instanceof WorkflowError)return {status:error.status,message:error.message};
  if(error && typeof error==='object' && 'code' in error && error.code==='P2034')return {status:409,message:'Conflicto de concurrencia. Reintenta la operación.'};
  if(error && typeof error==='object' && 'code' in error && error.code==='P2002')return {status:409,message:'El registro ya existe o fue modificado por otra operación.'};
  console.error('[finvigia-workflow]',error instanceof Error?error.name:'Unknown');
  return {status:503,message:'Operación no disponible. Verifica Neon y la configuración.'};
}
export async function serializable<T>(handler:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
  const prisma=getPrisma();
  for(let attempt=0;attempt<3;attempt++) {
    try{return await prisma.$transaction(handler,{isolationLevel:'Serializable',maxWait:7000,timeout:15000});}
    catch(e){if(e && typeof e==='object' && 'code' in e && e.code==='P2034' && attempt<2)continue;throw e;}
  }
  throw new WorkflowError('No fue posible serializar la operación.',409);
}
export type DbTx=Prisma.TransactionClient;
export type Db=PrismaClient;
