/* eslint-disable no-console -- CLI script output */
/**
 * Development seed: two independent demo businesses for exploring the dashboard and
 * verifying tenant isolation by hand. Refuses to run in production.
 *
 *   pnpm db:seed
 *
 * Password for every seeded account: SEED_PASSWORD from the environment, or the
 * development default printed at the end.
 */
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../generated/prisma/client';
import { type BusinessType, type MembershipRole } from '../generated/prisma/enums';

loadEnv({ path: path.resolve(__dirname, '../../.env'), quiet: true });
loadEnv({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

const DEV_DEFAULT_PASSWORD = 'DemoPassw0rd!';

interface SeedBusiness {
  name: string;
  slug: string;
  businessType: BusinessType;
  city: string;
  members: Array<{ name: string; email: string; role: MembershipRole }>;
}

const BUSINESSES: SeedBusiness[] = [
  {
    name: 'Noida Homes Brokerage (Demo)',
    slug: 'noida-homes-demo',
    businessType: 'BROKERAGE',
    city: 'Noida',
    members: [
      { name: 'Asha Verma', email: 'owner@noidahomes.demo', role: 'OWNER' },
      { name: 'Vikram Singh', email: 'admin@noidahomes.demo', role: 'ADMIN' },
      { name: 'Neha Gupta', email: 'manager@noidahomes.demo', role: 'MANAGER' },
      { name: 'Arjun Mehta', email: 'agent@noidahomes.demo', role: 'SALES_AGENT' },
      { name: 'Priya Nair', email: 'viewer@noidahomes.demo', role: 'VIEWER' },
    ],
  },
  {
    name: 'ABC Developers (Demo)',
    slug: 'abc-developers-demo',
    businessType: 'DEVELOPER',
    city: 'Gurugram',
    members: [{ name: 'Rohan Kapoor', email: 'owner@abcdevelopers.demo', role: 'OWNER' }],
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Refusing to seed a production database.');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const password = process.env.SEED_PASSWORD ?? DEV_DEFAULT_PASSWORD;
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
  });

  try {
    for (const business of BUSINESSES) {
      await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.upsert({
          where: { slug: business.slug },
          update: {},
          create: { name: business.name, slug: business.slug, status: 'ACTIVE' },
        });
        await tx.businessProfile.upsert({
          where: { tenantId: tenant.id },
          update: {},
          create: {
            tenantId: tenant.id,
            businessType: business.businessType,
            city: business.city,
            state: 'Uttar Pradesh',
          },
        });
        await tx.tenantSettings.upsert({
          where: { tenantId: tenant.id },
          update: {},
          create: { tenantId: tenant.id },
        });

        for (const member of business.members) {
          const user = await tx.user.upsert({
            where: { email: member.email },
            update: {},
            create: { name: member.name, email: member.email, passwordHash },
          });
          await tx.membership.upsert({
            where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
            update: {},
            create: { tenantId: tenant.id, userId: user.id, role: member.role },
          });
        }
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('Seeded demo businesses:');
  for (const business of BUSINESSES) {
    console.log(`  ${business.name}`);
    for (const member of business.members)
      console.log(`    ${member.role.padEnd(11)} ${member.email}`);
  }
  console.log(
    process.env.SEED_PASSWORD
      ? 'Password: value of SEED_PASSWORD'
      : `Password (development only): ${DEV_DEFAULT_PASSWORD}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
