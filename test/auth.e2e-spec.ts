import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, uniqueSuffix } from './utils/create-test-app.js';
import { prisma } from './utils/fixtures.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const email = `auth-${uniqueSuffix()}@test.local`;
  const password = 'Password123!';

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers a new user and never leaks the password hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Auth Test User', email, password })
      .expect(201);

    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Auth Test User', email, password })
      .expect(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects an invalid payload with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'X', email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('rejects an incorrect password with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects /auth/me without a token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('returns the current user for /auth/me with a valid token', async () => {
    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    const token = login.body.data.accessToken as string;

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.email).toBe(email);
  });
});
