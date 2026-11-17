import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';
import { bearer, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

const listing = (overrides: object = {}) => ({
  title: '3 BHK in Sector 150',
  propertyType: 'APARTMENT',
  price: 8_500_000,
  city: 'Noida',
  ...overrides,
});

describe('Properties (e2e)', () => {
  let app: INestApplication;
  let a: TestSession;
  let b: TestSession;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    a = await registerBusiness(app, { businessName: 'A Realty' });
    b = await registerBusiness(app, { businessName: 'B Realty' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, reads and lists a property with audit trail', async () => {
    const created = await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send(
        listing({
          bedrooms: 3,
          amenities: ['Gym', ' gym ', 'Pool', ''],
          possessionDate: '2027-03-31',
        }),
      )
      .expect(201);
    const id = created.body.data.id as string;
    expect(created.body.data.price).toBe(8_500_000);
    expect(created.body.data.amenities).toEqual(['Gym', 'Pool']);
    expect(created.body.data.possessionDate).toBe('2027-03-31');
    expect(created.body.data.status).toBe('AVAILABLE');

    await http().get(`/api/v1/properties/${id}`).set(bearer(a)).expect(200);
    const list = await http().get('/api/v1/properties?q=sector').set(bearer(a)).expect(200);
    expect(list.body.meta.total).toBe(1);

    const audit = await prismaOf(app).auditLog.findMany({
      where: { entityId: id, action: 'property.created' },
    });
    expect(audit).toHaveLength(1);
  });

  it('rejects invalid input', async () => {
    await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send(listing({ price: 0 }))
      .expect(400);
    await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send(listing({ pincode: '12' }))
      .expect(400);
    await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send(listing({ possessionDate: '2026-02-31' }))
      .expect(400);
    await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send(listing({ tenantId: b.activeTenant!.id }))
      .expect(400);
  });

  it('PATCH never nulls required fields, but clears optional ones', async () => {
    const { body } = await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send(listing({ locality: 'Sector 150' }))
      .expect(201);
    const res = await http()
      .patch(`/api/v1/properties/${body.data.id}`)
      .set(bearer(a))
      .send({ title: null, price: null, locality: null })
      .expect(200);
    expect(res.body.data.title).toBe('3 BHK in Sector 150');
    expect(res.body.data.price).toBe(8_500_000);
    expect(res.body.data.locality).toBeNull();
  });

  it('archived properties are hidden unless requested, and status changes are audited', async () => {
    const { body } = await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send(listing({ title: 'Archive me please' }))
      .expect(201);
    await http()
      .patch(`/api/v1/properties/${body.data.id}`)
      .set(bearer(a))
      .send({ status: 'ARCHIVED' })
      .expect(200);
    const hidden = await http().get('/api/v1/properties?q=archive me').set(bearer(a)).expect(200);
    expect(hidden.body.meta.total).toBe(0);
    const shown = await http()
      .get('/api/v1/properties?q=archive me&status=ARCHIVED')
      .set(bearer(a))
      .expect(200);
    expect(shown.body.meta.total).toBe(1);
    const audit = await prismaOf(app).auditLog.findMany({
      where: { entityId: body.data.id, action: 'property.status_changed' },
    });
    expect(audit).toHaveLength(1);
  });

  it('filters by price range and sorts by price', async () => {
    await http()
      .post('/api/v1/properties')
      .set(bearer(b))
      .send(listing({ title: 'Cheap flat', price: 2_000_000 }))
      .expect(201);
    await http()
      .post('/api/v1/properties')
      .set(bearer(b))
      .send(listing({ title: 'Pricey flat', price: 9_000_000 }))
      .expect(201);
    const res = await http()
      .get('/api/v1/properties?minPrice=1000000&sort=price_desc')
      .set(bearer(b))
      .expect(200);
    expect(res.body.data.map((p: { title: string }) => p.title)).toEqual([
      'Pricey flat',
      'Cheap flat',
    ]);
  });

  it("another business cannot see or change a tenant's property", async () => {
    const { body } = await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send(listing())
      .expect(201);
    await http().get(`/api/v1/properties/${body.data.id}`).set(bearer(b)).expect(404);
    await http()
      .patch(`/api/v1/properties/${body.data.id}`)
      .set(bearer(b))
      .send({ title: 'Hijack' })
      .expect(404);
    await http().get('/api/v1/properties/not-a-uuid').set(bearer(a)).expect(404);
    const list = await http().get('/api/v1/properties?pageSize=100').set(bearer(b)).expect(200);
    expect(list.body.data.some((p: { id: string }) => p.id === body.data.id)).toBe(false);
  });
});
