import { randomBytes, scrypt as nativeScrypt, timingSafeEqual } from 'node:crypto';
const COST=16384, BLOCK=8, PARALLEL=1, LENGTH=64;

// Do not promisify nativeScrypt: the automatic overload omits the options
// argument in TypeScript. Keep the async API and explicit KDF parameters.
function deriveKey(password:string,salt:Buffer):Promise<Buffer> {
  return new Promise((resolve,reject)=>{
    nativeScrypt(password,salt,LENGTH,{N:COST,r:BLOCK,p:PARALLEL},(error,key)=>{
      if(error)reject(error);
      else resolve(key as Buffer);
    });
  });
}

export function passwordIsStrong(value:string):boolean {
  return value.length>=14 && value.length<=256 && Buffer.byteLength(value,'utf8')<=512;
}
export async function hashPassword(value:string):Promise<string> {
  if(!passwordIsStrong(value))throw new Error('La contraseña requiere 14-256 caracteres.');
  const salt=randomBytes(32).toString('hex');
  const bytes=await deriveKey(value,Buffer.from(salt,'hex'));
  return `scrypt$${COST}$${salt}$${bytes.toString('hex')}`;
}
export async function verifyPassword(value:string,encoded:string):Promise<boolean> {
  const parts=encoded.split('$');
  if(parts.length!==4||parts[0]!=='scrypt'||parts[1]!==String(COST)||! /^[a-f0-9]{64}$/.test(parts[2])||! /^[a-f0-9]{128}$/.test(parts[3]))return false;
  const candidate=await deriveKey(value,Buffer.from(parts[2],'hex'));
  return timingSafeEqual(candidate,Buffer.from(parts[3],'hex'));
}
