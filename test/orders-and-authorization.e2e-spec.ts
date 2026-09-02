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

describe('Orders + Authorization (e2e)', () => {
  let app: INestApplication<App>;
  let category: Awaited<ReturnType<typeof createTestCategory>>;
  let seller: Awaited<ReturnType<typeof createTestSeller>>;
  let customerA: Awaited<ReturnType<typeof createTestCustomer>>;
  let customerB: Awaited<ReturnType<typeof createTestCustomer>>;
  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let tokenA: string;
  let tokenB: string;
  let addressId: string;
  let orderId: string;

  beforeAll(async () => {
    app = await createTestApp();
    category = await createTestCategory();
    seller = await createTestSeller();
    customerA = await createTestCustomer();
    customerB = await createTestCustomer();
    product = await createTestProduct(category.id, seller.seller.id, { price: 1000, stock: 2 });

    const loginA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: customerA.email, password: TEST_PASSWORD });
    tokenA = loginA.body.data.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: customerB.email, password: TEST_PASSWORD });
    tokenB = loginB.body.data.accessToken;

    const address = await request(app.getHttpServer())
      .post('/api/addresses')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        fullName: 'Order Test Buyer',
        phone: '+923001112222',
        line1: 'Test Street 1',
        city: 'Lahore',
        province: 'Punjab',
        postalCode: '54000',
      });
    addressId = address.body.data.id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { order: { userId: customerA.id } } });
    await prisma.orderItem.deleteMany({ where: { productId: product.id } });
    await prisma.order.deleteMany({ where: { userId: customerA.id } });
    await prisma.address.deleteMany({ where: { userId: customerA.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.seller.delete({ where: { id: seller.seller.id } });
    await prisma.user.deleteMany({ where: { id: { in: [seller.user.id, customerA.id, customerB.id] } } });
    await app.close();
  });

  it('places an order that decrements inventory inside a transaction', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: product.id, quantity: 2 })
      .expect(201);

    const order = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ addressId, deliveryMethod: 'STANDARD', paymentMethod: 'COD' })
      .expect(201);

    orderId = order.body.data.id;
    expect(Number(order.body.data.total)).toBe(2000);
    expect(order.body.data.status).toBe('PENDING');

    const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inventory?.stockQuantity).toBe(0);

    const cart = await request(app.getHttpServer()).get('/api/cart').set('Authorization', `Bearer ${tokenA}`);
    expect(cart.body.data.items).toEqual([]);
  });

  it('never allows stock to go negative: a now-out-of-stock product is rejected', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ productId: product.id, quantity: 1 })
      .expect(400);
    expect(res.body.message).toMatch(/available/i);

    const inventory = await prisma.inventory.findUnique({ where: { productId: product.id } });
    expect(inventory?.stockQuantity).toBe(0);
  });

  it('lets the owning customer view their order', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.data.id).toBe(orderId);
  });

  it("does not let a different customer view someone else's order (404, not 403, to avoid leaking existence)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
    expect(res.body.success).toBe(false);
  });

  it('rejects order access with no auth token at all', async () => {
    await request(app.getHttpServer()).get(`/api/orders/${orderId}`).expect(401);
  });
});
