import {createHmac,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
/** RFC 6238, SHA-1 requerido por amplio soporte de aplicaciones TOTP. */
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret():string{
 const bytes=randomBytes(20);let output='',bits=0,value=0;
 for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){output+=alphabet[(value>>>(bits-5))&31];bits-=5;}}
 if(bits>0)output+=alphabet[(value<<(5-bits))&31];
 return output;
}
export function decodeBase32(secret:string):Buffer{
 let value=0,bits=0;const out:number[]=[];
 for(const char of secret.replace(/=+$/,'').toUpperCase()){
  const index=alphabet.indexOf(char);if(index<0)throw new Error('Secreto TOTP inválido.');
  value=(value<<5)|index;bits+=5;
  if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}
 }
 return Buffer.from(out);
}
export function totpCode(secret:string,step:number):string{
 if(!Number.isSafeInteger(step)||step<0)throw new Error('Paso TOTP inválido.');
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));
 const digest=createHmac('sha1',decodeBase32(secret)).update(counter).digest();
 const offset=digest[digest.length-1]&15;
 const num=(digest.readUInt32BE(offset)&0x7fffffff)%1_000_000;
 return String(num).padStart(6,'0');
}
export function matchTotpStep(secret:string,code:string,now=Date.now(),lastStep=-1):number|null{
 if(!/^\d{6}$/.test(code))return null;
 const timeStep=Math.floor(now/30_000);
 for(const step of [timeStep-1,timeStep,timeStep+1]){
  if(step<=lastStep||step<0)continue;
  const expected=Buffer.from(totpCode(secret,step));
  if(timingSafeEqual(expected,Buffer.from(code)))return step;
 }
 return null;
}
export function recoveryDigest(code:string){return createHash('sha256').update(code.replace(/[-\s]/g,'').toUpperCase()).digest('hex');}
export function newRecoveryCode():string{const chars=randomBytes(12).toString('hex').toUpperCase();return `${chars.slice(0,8)}-${chars.slice(8,16)}-${chars.slice(16)}`;}
