import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type FakeMailer, MAILER } from '../src/modules/mail/mailer';
import { createTestApp } from './app.factory';
import { prismaOf, resetDatabase } from './utils/db';

describe('Public contact form (e2e)', () => {
  let app: INestApplication;
  let mail: FakeMailer;
  const http = () => request(app.getHttpServer());
  const valid = {
    name: 'Rahul Sharma',
    email: 'Rahul@NoidaHomes.in',
    phone: '98765 43210',
    company: 'Noida <Homes>',
    city: 'Noida',
    message: 'We get about 300 WhatsApp enquiries a month. Can we see a demo?',
    source: '/contact',
  };

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    mail = app.get<FakeMailer>(MAILER);
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores the request and emails the sales inbox, without needing an account', async () => {
    await http().post('/api/v1/public/contact').send(valid).expect(202);
    const saved = await prismaOf(app).contactRequest.findFirstOrThrow();
    expect(saved).toMatchObject({
      name: 'Rahul Sharma',
      email: 'rahul@noidahomes.in',
      phone: '+919876543210',
      source: '/contact',
    });
    const email = mail.lastTo('sales@vendor.example');
    expect(email?.subject).toBe('Demo request: Rahul Sharma (Noida <Homes>)');
    expect(email?.html).toContain('Noida &lt;Homes&gt;');
    expect(email?.html).not.toContain('<Homes>');
  });

  it('validates what a person typed', async () => {
    const res = await http()
      .post('/api/v1/public/contact')
      .send({ name: 'R', email: 'nope', message: 'hi' })
      .expect(400);
    const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'message']));
  });

  it('quietly drops bot submissions (honeypot filled)', async () => {
    const before = await prismaOf(app).contactRequest.count();
    await http()
      .post('/api/v1/public/contact')
      .send({ ...valid, website: 'http://spam.example' })
      .expect(202);
    expect(await prismaOf(app).contactRequest.count()).toBe(before);
  });
});
