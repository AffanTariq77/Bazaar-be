import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/create-test-app.js';
import {
  createTestCategory,
  createTestCustomer,
  createTestProduct,
  createTestSeller,
  prisma,
  TEST_PASSWORD,
} from './utils/fixtures.js';

describe('Cart + Inventory (e2e)', () => {
  let app: INestApplication<App>;
  let category: Awaited<ReturnType<typeof createTestCategory>>;
  let seller: Awaited<ReturnType<typeof createTestSeller>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;
  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    category = await createTestCategory();
    seller = await createTestSeller();
    customer = await createTestCustomer();
    product = await createTestProduct(category.id, seller.seller.id, { price: 500, stock: 3 });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: customer.email, password: TEST_PASSWORD });
    token = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.seller.delete({ where: { id: seller.seller.id } });
    await prisma.user.deleteMany({ where: { id: { in: [seller.user.id, customer.id] } } });
    await app.close();
  });

  const auth = () => `Bearer ${token}`;

  it('starts with an empty cart', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/cart')
      .set('Authorization', auth())
      .expect(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.subtotal).toBe(0);
  });

  it('adds an item and computes the subtotal', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', auth())
      .send({ productId: product.id, quantity: 2 })
      .expect(201);
    expect(res.body.data.subtotal).toBe(1000);
    expect(res.body.data.itemCount).toBe(2);
  });

  it('merges a repeat add-to-cart into the existing line, not a duplicate', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', auth())
      .send({ productId: product.id, quantity: 1 })
      .expect(201);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].quantity).toBe(3);
  });

  it('rejects adding more than the available stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', auth())
      .send({ productId: product.id, quantity: 1 })
      .expect(400);
    expect(res.body.message).toMatch(/available/i);
  });

  it('rejects updating a line beyond the available stock', async () => {
    const cart = await request(app.getHttpServer()).get('/api/cart').set('Authorization', auth());
    const itemId = cart.body.data.items[0].id;

    await request(app.getHttpServer())
      .patch(`/api/cart/items/${itemId}`)
      .set('Authorization', auth())
      .send({ quantity: 999 })
      .expect(400);
  });

  it('removes an item', async () => {
    const cart = await request(app.getHttpServer()).get('/api/cart').set('Authorization', auth());
    const itemId = cart.body.data.items[0].id;

    const res = await request(app.getHttpServer())
      .delete(`/api/cart/items/${itemId}`)
      .set('Authorization', auth())
      .expect(200);
    expect(res.body.data.items).toEqual([]);
  });
});
