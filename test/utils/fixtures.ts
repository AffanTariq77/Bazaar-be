import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { uniqueSuffix } from './create-test-app.js';

export const prisma = new PrismaClient();
export const TEST_PASSWORD = 'Password123!';

export async function createTestCustomer() {
  const suffix = uniqueSuffix();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  return prisma.user.create({
    data: {
      name: `Test Customer ${suffix}`,
      email: `customer-${suffix}@test.local`,
      passwordHash,
      role: Role.CUSTOMER,
    },
  });
}

export async function createTestSeller() {
  const suffix = uniqueSuffix();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const user = await prisma.user.create({
    data: { name: `Test Seller ${suffix}`, email: `seller-${suffix}@test.local`, passwordHash, role: Role.SELLER },
  });
  const seller = await prisma.seller.create({
    data: { userId: user.id, storeName: `Test Store ${suffix}`, slug: `test-store-${suffix}` },
  });
  return { user, seller };
}

export async function createTestCategory() {
  const suffix = uniqueSuffix();
  return prisma.category.create({ data: { name: `Test Category ${suffix}`, slug: `test-category-${suffix}` } });
}

export async function createTestProduct(
  categoryId: string,
  sellerId: string,
  opts: { price?: number; stock?: number } = {},
) {
  const suffix = uniqueSuffix();
  return prisma.product.create({
    data: {
      name: `Test Product ${suffix}`,
      slug: `test-product-${suffix}`,
      description: 'A product created for an automated test.',
      price: opts.price ?? 1000,
      sku: `TEST-SKU-${suffix}`,
      brand: 'TestBrand',
      categoryId,
      sellerId,
      inventory: { create: { stockQuantity: opts.stock ?? 10, lowStockThreshold: 2 } },
    },
    include: { inventory: true },
  });
}
