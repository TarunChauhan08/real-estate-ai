import { type INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/database/prisma.service';

/** Empties every table. Only ever runs against the test database. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  const name = rows[0]?.name ?? '';
  if (!name.includes('test')) throw new Error(`Refusing to reset non-test database "${name}"`);
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE site_visits, whatsapp_accounts, messages, conversations, leads, properties, audit_logs, refresh_sessions, invitations, memberships, tenant_settings, business_profiles, users, tenants RESTART IDENTITY CASCADE',
  );
}

export function prismaOf(app: INestApplication): PrismaService {
  return app.get(PrismaService);
}
