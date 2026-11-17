import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// The monorepo shares one `.env` at the repository root; an app-local `.env` may override it.
loadEnv({ path: path.resolve(__dirname, '.env'), quiet: true });
loadEnv({ path: path.resolve(__dirname, '../../.env'), quiet: true });

export default defineConfig({
  schema: path.resolve(__dirname, '../../prisma/schema.prisma'),
  migrations: {
    path: path.resolve(__dirname, '../../prisma/migrations'),
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
