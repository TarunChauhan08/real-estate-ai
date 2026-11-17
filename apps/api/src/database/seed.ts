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
import { type Prisma, PrismaClient } from '../generated/prisma/client';
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
  properties?: Array<Omit<Prisma.PropertyUncheckedCreateInput, 'tenantId'>>;
  leads?: Array<Omit<Prisma.LeadUncheckedCreateInput, 'tenantId'>>;
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
    properties: [
      {
        title: '3 BHK with park view, Sector 150',
        projectName: 'Greenwood Residences',
        propertyType: 'APARTMENT',
        bedrooms: 3,
        bathrooms: 3,
        carpetAreaSqft: 1450,
        price: 9_200_000n,
        locality: 'Sector 150',
        city: 'Noida',
        state: 'Uttar Pradesh',
        possessionStatus: 'READY_TO_MOVE',
        reraNumber: 'UPRERAPRJ000000 (demo)',
        amenities: ['Clubhouse', 'Swimming pool', 'Power backup', '24x7 security'],
      },
      {
        title: '2 BHK near metro, Sector 137',
        projectName: 'Metro Heights',
        propertyType: 'APARTMENT',
        bedrooms: 2,
        bathrooms: 2,
        carpetAreaSqft: 980,
        price: 6_300_000n,
        locality: 'Sector 137',
        city: 'Noida',
        state: 'Uttar Pradesh',
        possessionStatus: 'UNDER_CONSTRUCTION',
        possessionDate: new Date('2027-06-30'),
        amenities: ['Gym', 'Kids play area'],
      },
      {
        title: '4 BHK penthouse, Sector 128',
        projectName: 'Skyline Towers',
        propertyType: 'APARTMENT',
        bedrooms: 4,
        bathrooms: 4,
        carpetAreaSqft: 2800,
        price: 32_500_000n,
        locality: 'Sector 128',
        city: 'Noida',
        state: 'Uttar Pradesh',
        possessionStatus: 'READY_TO_MOVE',
        amenities: ['Private terrace', 'Golf course view', 'Concierge'],
      },
      {
        title: 'Furnished 2 BHK for rent, Sector 76',
        propertyType: 'APARTMENT',
        listingType: 'RENT',
        bedrooms: 2,
        bathrooms: 2,
        carpetAreaSqft: 1050,
        price: 28_000n,
        locality: 'Sector 76',
        city: 'Noida',
        state: 'Uttar Pradesh',
        possessionStatus: 'READY_TO_MOVE',
      },
    ],
    leads: [
      {
        name: 'Rahul Sharma',
        phone: '+919876500001',
        source: 'WHATSAPP',
        status: 'QUALIFIED',
        temperature: 'HOT',
        budgetMax: 9_500_000n,
        preferredCity: 'Noida',
        preferredLocalities: ['Sector 150'],
        preferredBedrooms: [3],
        purpose: 'SELF_USE',
        timeline: 'ONE_TO_THREE_MONTHS',
        preferredLanguage: 'hinglish',
      },
      {
        name: 'Sneha Iyer',
        phone: '+919876500002',
        source: 'PORTAL',
        status: 'CONTACTED',
        temperature: 'WARM',
        budgetMin: 5_000_000n,
        budgetMax: 7_000_000n,
        preferredCity: 'Noida',
        preferredBedrooms: [2],
        needsHomeLoan: true,
        preferredLanguage: 'en',
      },
      { name: 'Mohit Jain', phone: '+919876500003', source: 'WEBSITE' },
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

        // Inventory and leads are only added once, so re-running the seed never duplicates them.
        if (
          business.properties &&
          (await tx.property.count({ where: { tenantId: tenant.id } })) === 0
        ) {
          await tx.property.createMany({
            data: business.properties.map((p) => ({ ...p, tenantId: tenant.id })),
          });
        }
        for (const lead of business.leads ?? []) {
          await tx.lead.upsert({
            where: { tenantId_phone: { tenantId: tenant.id, phone: lead.phone } },
            update: {},
            create: { ...lead, tenantId: tenant.id },
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
