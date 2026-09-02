import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, uniqueSuffix } from './utils/create-test-app.js';
import { createTestCategory, createTestCustomer, createTestSeller, prisma, TEST_PASSWORD } from './utils/fixtures.js';

describe('Products (e2e)', () => {
  let app: INestApplication<App>;
  let category: Awaited<ReturnType<typeof createTestCategory>>;
  let seller: Awaited<ReturnType<typeof createTestSeller>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;
  let sellerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    category = await createTestCategory();
    seller = await createTestSeller();
    customer = await createTestCustomer();

    const sellerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: seller.user.email, password: TEST_PASSWORD });
    sellerToken = sellerLogin.body.data.accessToken;

    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: customer.email, password: TEST_PASSWORD });
    customerToken = customerLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { sellerId: seller.seller.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.seller.delete({ where: { id: seller.seller.id } });
    await prisma.user.deleteMany({ where: { id: { in: [seller.user.id, customer.id] } } });
    await app.close();
  });

  const uniqueName = `Findable Widget ${uniqueSuffix()}`;

  it('lets a seller create a product', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: uniqueName,
        description: 'A widget created for the product-creation test.',
        price: 2500,
        sku: `TEST-SKU-${uniqueSuffix()}`,
        brand: 'TestBrand',
        categoryId: category.id,
        stockQuantity: 20,
      })
      .expect(201);

    expect(res.body.data.name).toBe(uniqueName);
    expect(res.body.data.inventory.stockQuantity).toBe(20);
  });

  it('rejects a non-seller trying to create a product', async () => {
    await request(app.getHttpServer())
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Should not be created',
        description: 'This request should be forbidden.',
        price: 100,
        sku: `TEST-SKU-${uniqueSuffix()}`,
        brand: 'TestBrand',
        categoryId: category.id,
        stockQuantity: 5,
      })
      .expect(403);
  });

  it('finds the product via the public search endpoint', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products')
      .query({ search: uniqueName.split(' ')[0] })
      .expect(200);

    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items.some((p: { name: string }) => p.name === uniqueName)).toBe(true);
  });

  it('returns an empty result for a search with no matches', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products')
      .query({ search: `nonexistent-${uniqueSuffix()}` })
      .expect(200);

    expect(res.body.data.total).toBe(0);
    expect(res.body.data.items).toEqual([]);
  });
});
