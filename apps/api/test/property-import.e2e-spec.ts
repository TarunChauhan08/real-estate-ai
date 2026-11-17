import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';
import { addMemberAndLogin, bearer, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

const HEADER = 'Title,Property type,Listing type,Price,City,Locality,BHK,Carpet area,Amenities';

describe('Property import & sample listings (e2e)', () => {
  let app: INestApplication;
  let a: TestSession;
  let b: TestSession;
  let viewer: TestSession;
  const http = () => request(app.getHttpServer());
  const count = (s: TestSession) =>
    prismaOf(app).property.count({ where: { tenantId: s.activeTenant!.id } });

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    a = await registerBusiness(app, { businessName: 'A Realty' });
    b = await registerBusiness(app, { businessName: 'B Realty' });
    viewer = await addMemberAndLogin(app, a.activeTenant!.id, 'VIEWER');
  });

  afterAll(async () => {
    await app.close();
  });

  it('dry run reports per-row errors by spreadsheet row and creates nothing', async () => {
    const csv = [
      HEADER + ',Notes',
      '2 BHK in Sector 62,Flat,Sale,62 lakh,Noida,Sector 62,2,980,Gym; Lift,x',
      ',Apartment,Sale,50 lakh,Noida,,,,,',
      'Castle,Castle,Sale,1 cr,Noida,,,,,',
    ].join('\n');
    const res = await http()
      .post('/api/v1/properties/import')
      .set(bearer(a))
      .send({ csv, dryRun: true })
      .expect(200);
    expect(res.body.data).toMatchObject({
      total: 3,
      valid: 1,
      created: 0,
      ignoredColumns: ['Notes'],
    });
    const rows = res.body.data.errors.map(
      (e: { row: number; field: string }) => `${e.row}:${e.field}`,
    );
    expect(rows).toEqual(expect.arrayContaining(['3:title', '4:propertyType']));
    expect(await count(a)).toBe(0);
  });

  it('does not import anything when a row is invalid (all-or-nothing)', async () => {
    const csv = [
      HEADER,
      'Good,Apartment,Sale,50 lakh,Noida,,,,',
      'Bad,Apartment,Sale,abc,Noida,,,,',
    ].join('\n');
    const res = await http()
      .post('/api/v1/properties/import')
      .set(bearer(a))
      .send({ csv })
      .expect(200);
    expect(res.body.data.created).toBe(0);
    expect(res.body.data.errors[0]).toMatchObject({ row: 3, field: 'price' });
    expect(await count(a)).toBe(0);
  });

  it('imports a valid sheet into the caller’s business only, with an audit entry', async () => {
    const csv = [
      HEADER,
      '2 BHK in Sector 62,Flat,Sale,62 lakh,Noida,Sector 62,2,980,Gym; Lift',
      '"Villa, with garden",Villa,Rent,"85,000",Gurugram,DLF Phase 2,4,3000,',
    ].join('\r\n');
    const res = await http()
      .post('/api/v1/properties/import')
      .set(bearer(a))
      .send({ csv })
      .expect(200);
    expect(res.body.data).toMatchObject({ total: 2, valid: 2, created: 2, errors: [] });

    const list = await http().get('/api/v1/properties?pageSize=50').set(bearer(a)).expect(200);
    const villa = list.body.data.find((p: { title: string }) => p.title === 'Villa, with garden');
    expect(villa).toMatchObject({
      propertyType: 'VILLA',
      listingType: 'RENT',
      price: 85_000,
      bedrooms: 4,
    });
    const flat = list.body.data.find((p: { title: string }) => p.title === '2 BHK in Sector 62');
    expect(flat).toMatchObject({ price: 6_200_000, amenities: ['Gym', 'Lift'] });
    expect(await count(b)).toBe(0);

    const audit = await prismaOf(app).auditLog.findMany({
      where: { tenantId: a.activeTenant!.id, action: 'property.imported' },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.metadata).toMatchObject({ count: 2 });
  });

  it('rejects files without the required columns, empty files, and viewers', async () => {
    const missing = await http()
      .post('/api/v1/properties/import')
      .set(bearer(a))
      .send({ csv: 'Title,City\nA,Noida' })
      .expect(400);
    expect(missing.body.error.code).toBe('IMPORT_MISSING_COLUMNS');
    expect(missing.body.error.message).toContain('Property type');

    const empty = await http()
      .post('/api/v1/properties/import')
      .set(bearer(a))
      .send({ csv: HEADER })
      .expect(400);
    expect(empty.body.error.code).toBe('IMPORT_EMPTY');

    await http()
      .post('/api/v1/properties/import')
      .set(bearer(viewer))
      .send({ csv: HEADER + '\nA,Apartment,Sale,1,Noida,,,,' })
      .expect(403);
  });

  it('adds six sample listings once, in the business city', async () => {
    await http().post('/api/v1/properties/samples').set(bearer(viewer)).expect(403);
    const res = await http().post('/api/v1/properties/samples').set(bearer(b)).expect(201);
    expect(res.body.data).toEqual({ created: 6 });
    const list = await http().get('/api/v1/properties?pageSize=50').set(bearer(b)).expect(200);
    expect(list.body.data).toHaveLength(6);
    for (const p of list.body.data) expect(p.title.startsWith('Sample · ')).toBe(true);

    const again = await http().post('/api/v1/properties/samples').set(bearer(b)).expect(409);
    expect(again.body.error.code).toBe('SAMPLES_EXIST');
  });
});
