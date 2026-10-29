import 'server-only';
import { createHmac } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getPrisma } from '@/server/db/prisma';

/** Ventana compartida por todas las instancias en PostgreSQL, sin Redis ni servicio pago. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_NETWORK = 80;
const MAX_PER_ACCOUNT_AND_NETWORK = 8;

function secret(): string {
  const value = process.env.AUTH_THROTTLE_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_THROTTLE_SECRET obligatorio en producción.');
  return 'development-only-throttle-secret-never-use-in-production';
}
export function pseudonym(value: string, key: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}
function networkIdentifier(request: NextRequest): string {
  // La cabecera sólo es aceptable cuando Vercel la controla en su infraestructura.
  // Fuera de Vercel se usa un bucket global (más restrictivo, nunca fail-open).
  const ip = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : null;
  return ip && /^[\da-fA-F:.]{2,64}$/.test(ip) ? ip : 'unidentified-network';
}
export async function consumeLoginAttempt(request: NextRequest, email: string): Promise<boolean> {
  const pepper = secret();
  const network = networkIdentifier(request);
  const keys: Array<[string, number]> = [
    [pseudonym(`network:${network}`, pepper), MAX_PER_NETWORK],
    [pseudonym(`account-network:${network}:${email.toLowerCase().trim()}`, pepper), MAX_PER_ACCOUNT_AND_NETWORK],
  ];
  const now = new Date();
  const threshold = new Date(now.getTime() - WINDOW_MS);
  const expires = new Date(now.getTime() + WINDOW_MS * 2);
  const prisma = getPrisma();
  // Upsert atómico: previene que varios procesos evadan el contador con lecturas concurrentes.
  return prisma.$transaction(async tx => {
    let denied = false;
    for (const [key, limit] of keys) {
      const rows = await tx.$queryRaw<Array<{ attempts: number }>>`
        INSERT INTO "AuthThrottle" ("key", "attempts", "windowStart", "expiresAt")
        VALUES (${key}, 1, ${now}, ${expires})
        ON CONFLICT ("key") DO UPDATE SET
          "attempts" = CASE WHEN "AuthThrottle"."windowStart" <= ${threshold}
            THEN 1 ELSE "AuthThrottle"."attempts" + 1 END,
          "windowStart" = CASE WHEN "AuthThrottle"."windowStart" <= ${threshold}
            THEN ${now} ELSE "AuthThrottle"."windowStart" END,
          "expiresAt" = ${expires}
        RETURNING "attempts";
      `;
      if (!rows[0] || rows[0].attempts > limit) denied = true;
    }
    return !denied;
  });
}
