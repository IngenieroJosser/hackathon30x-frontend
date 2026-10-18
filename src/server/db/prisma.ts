import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

type PrismaHolder = { instance?: PrismaClient };
const globalPrisma = globalThis as typeof globalThis & { __blinkaPrisma?: PrismaHolder };

/** Instanciación diferida para que `next build` no necesite acceso a Neon. */
export function getPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no configurada.');
  if (!globalPrisma.__blinkaPrisma) globalPrisma.__blinkaPrisma = {};
  if (!globalPrisma.__blinkaPrisma.instance) {
    const adapter = new PrismaPg({ connectionString: url, max: 5 });
    globalPrisma.__blinkaPrisma.instance = new PrismaClient({ adapter });
  }
  return globalPrisma.__blinkaPrisma.instance;
}
