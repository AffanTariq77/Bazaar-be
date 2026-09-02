import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, uniqueSuffix } from './utils/create-test-app.js';
import {
  createTestCategory,
  createTestCustomer,
  createTestProduct,
  createTestSeller,
  prisma,
  TEST_PASSWORD,
} from './utils/fixtures.js';

describe('Coupons (e2e)', () => {
  let app: INestApplication<App>;
  let category: Awaited<ReturnType<typeof createTestCategory>>;
  let seller: Awaited<ReturnType<typeof createTestSeller>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;
  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let token: string;
  let validCouponCode: string;
  let expiredCouponCode: string;

  beforeAll(async () => {
    app = await createTestApp();
    category = await createTestCategory();
    seller = await createTestSeller();
    customer = await createTestCustomer();
    product = await createTestProduct(category.id, seller.seller.id, { price: 8000, stock: 10 });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: customer.email, password: TEST_PASSWORD });
    token = login.body.data.accessToken;

    validCouponCode = `TESTVALID${uniqueSuffix()}`.toUpperCase();
    expiredCouponCode = `TESTEXPIRED${uniqueSuffix()}`.toUpperCase();

    await prisma.coupon.create({
      data: {
        code: validCouponCode,
        discountPercent: 10,
        minOrderAmount: 5000,
        maxDiscount: 500,
        usageLimit: 100,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.coupon.create({
      data: {
        code: expiredCouponCode,
        discountPercent: 10,
        minOrderAmount: 0,
        maxDiscount: 500,
        usageLimit: 100,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.couponUsage.deleteMany({ where: { userId: customer.id } });
    await prisma.coupon.deleteMany({ where: { code: { in: [validCouponCode, expiredCouponCode] } } });
    await prisma.cartItem.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.seller.delete({ where: { id: seller.seller.id } });
    await prisma.user.deleteMany({ where: { id: { in: [seller.user.id, customer.id] } } });
    await app.close();
  });

  it('rejects an unknown coupon code', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'DOES-NOT-EXIST' })
      .expect(400);
    expect(res.body.message).toMatch(/invalid coupon/i);
  });

  it('rejects a valid coupon when the cart is below its minimum order amount', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: validCouponCode })
      .expect(400);
    expect(res.body.message).toMatch(/minimum order amount/i);
  });

  it('rejects an expired coupon', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: expiredCouponCode })
      .expect(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('applies a valid coupon and caps the discount at maxDiscount', async () => {
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: 1 })
      .expect(201);

    // 10% of 8000 = 800, but maxDiscount is 500 — the cap should win.
    const res = await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: validCouponCode.toLowerCase() })
      .expect(201);
    expect(res.body.data.discount).toBe(500);
  });
});
