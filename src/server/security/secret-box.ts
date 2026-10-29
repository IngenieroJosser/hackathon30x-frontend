import {createCipheriv,createDecipheriv,createHmac,randomBytes} from 'node:crypto';
/** En producción las claves deben ser aleatorias, persistentes y nunca almacenarse en Git. */
export function loadKey(name:string):Buffer{
 const raw=process.env[name];
 if(!raw || !/^[0-9a-fA-F]{64}$/.test(raw))throw new Error(`${name} debe ser una clave hexadecimal de 32 bytes.`);
 return Buffer.from(raw,'hex');
}
export function seal(plain:string,envName:string):string{
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',loadKey(envName),iv);
 const encrypted=Buffer.concat([cipher.update(plain,'utf8'),cipher.final()]);
 return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}
export function unseal(value:string,envName:string):string{
 const [version,ivHex,tagHex,textHex,...extra]=value.split(':');
 if(version!=='v1'||!ivHex||!tagHex||!textHex||extra.length||ivHex.length!==24||tagHex.length!==32)throw new Error('Formato cifrado incorrecto.');
 const dec=createDecipheriv('aes-256-gcm',loadKey(envName),Buffer.from(ivHex,'hex'));
 dec.setAuthTag(Buffer.from(tagHex,'hex'));
 return Buffer.concat([dec.update(Buffer.from(textHex,'hex')),dec.final()]).toString('utf8');
}
export function keyedFingerprint(value:string,envName:string):string{
 return createHmac('sha256',loadKey(envName)).update(value).digest('hex');
}
