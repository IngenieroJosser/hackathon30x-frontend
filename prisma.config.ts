import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// CLI y migraciones: conexión DIRECTA Neon, nunca el pooler.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx scripts/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
