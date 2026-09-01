import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

interface CategorySeed {
  name: string;
  slug: string;
  children?: { name: string; slug: string }[];
}

const CATEGORY_TREE: CategorySeed[] = [
  {
    name: 'Electronics',
    slug: 'electronics',
    children: [
      { name: 'Phones & Tablets', slug: 'phones-tablets' },
      { name: 'Computers & Laptops', slug: 'computers-laptops' },
      { name: 'Gaming', slug: 'gaming' },
    ],
  },
  { name: "Men's Fashion", slug: 'mens-fashion' },
  { name: "Women's Fashion", slug: 'womens-fashion' },
  { name: 'Shoes', slug: 'shoes' },
  { name: 'Watches', slug: 'watches' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Home & Lifestyle', slug: 'home-lifestyle' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Automotive', slug: 'automotive' },
  { name: 'Groceries', slug: 'groceries' },
  { name: 'Accessories', slug: 'accessories' },
];

const SELLERS = [
  { storeName: 'TechBazaar Store', slug: 'techbazaar-store', email: 'seller@bazaar.test' },
  { storeName: 'Fashion Hub PK', slug: 'fashion-hub-pk', email: 'seller2@bazaar.test' },
  { storeName: 'HomeEssentials.pk', slug: 'homeessentials-pk', email: 'seller3@bazaar.test' },
  { storeName: 'SportsGear Pakistan', slug: 'sportsgear-pakistan', email: 'seller4@bazaar.test' },
  { storeName: 'Beauty Corner', slug: 'beauty-corner', email: 'seller5@bazaar.test' },
];

interface ProductSeed {
  name: string;
  brand: string;
  price: number;
  category: string;
}

const PRODUCTS: ProductSeed[] = [
  // Phones & Tablets
  { name: 'iPhone 15', brand: 'Apple', price: 349999, category: 'phones-tablets' },
  { name: 'iPhone 14', brand: 'Apple', price: 289999, category: 'phones-tablets' },
  { name: 'Samsung Galaxy S24', brand: 'Samsung', price: 299999, category: 'phones-tablets' },
  { name: 'Samsung Galaxy A54', brand: 'Samsung', price: 89999, category: 'phones-tablets' },
  { name: 'Xiaomi Redmi Note 13', brand: 'Xiaomi', price: 54999, category: 'phones-tablets' },
  { name: 'Infinix Note 30', brand: 'Infinix', price: 42999, category: 'phones-tablets' },
  { name: 'Vivo Y28', brand: 'Vivo', price: 39999, category: 'phones-tablets' },
  { name: 'Oppo A78', brand: 'Oppo', price: 47999, category: 'phones-tablets' },
  { name: 'Apple iPad 10th Gen', brand: 'Apple', price: 129999, category: 'phones-tablets' },
  { name: 'Samsung Galaxy Tab A9', brand: 'Samsung', price: 54999, category: 'phones-tablets' },
  // Computers & Laptops
  { name: 'Dell Inspiron 15', brand: 'Dell', price: 159999, category: 'computers-laptops' },
  { name: 'Dell XPS 13', brand: 'Dell', price: 289999, category: 'computers-laptops' },
  { name: 'HP Pavilion 15', brand: 'HP', price: 149999, category: 'computers-laptops' },
  { name: 'HP Envy x360', brand: 'HP', price: 219999, category: 'computers-laptops' },
  { name: 'Lenovo IdeaPad Slim 3', brand: 'Lenovo', price: 119999, category: 'computers-laptops' },
  { name: 'Lenovo ThinkPad E14', brand: 'Lenovo', price: 189999, category: 'computers-laptops' },
  { name: 'Apple MacBook Air M2', brand: 'Apple', price: 349999, category: 'computers-laptops' },
  { name: 'Asus VivoBook 15', brand: 'Asus', price: 129999, category: 'computers-laptops' },
  { name: 'Acer Aspire 5', brand: 'Acer', price: 109999, category: 'computers-laptops' },
  { name: 'HP LaserJet Pro Printer', brand: 'HP', price: 34999, category: 'computers-laptops' },
  // Gaming
  { name: 'Logitech G502 Gaming Mouse', brand: 'Logitech', price: 12999, category: 'gaming' },
  { name: 'Razer BlackWidow Mechanical Keyboard', brand: 'Razer', price: 24999, category: 'gaming' },
  { name: 'HyperX Cloud II Gaming Headset', brand: 'HyperX', price: 15999, category: 'gaming' },
  { name: 'PlayStation 5 Console', brand: 'Sony', price: 219999, category: 'gaming' },
  { name: 'Xbox Series S', brand: 'Microsoft', price: 129999, category: 'gaming' },
  { name: 'ProGamer Racing Chair', brand: 'ProGamer', price: 44999, category: 'gaming' },
  { name: 'Redragon Mechanical Keyboard', brand: 'Redragon', price: 8999, category: 'gaming' },
  { name: 'SteelSeries Arctis 5 Headset', brand: 'SteelSeries', price: 18999, category: 'gaming' },
  { name: 'Nintendo Switch OLED', brand: 'Nintendo', price: 99999, category: 'gaming' },
  { name: 'Razer Gaming Mousepad XXL', brand: 'Razer', price: 3999, category: 'gaming' },
  // Men's Fashion
  { name: "Men's Casual Cotton Shirt", brand: 'Outfitters', price: 2499, category: 'mens-fashion' },
  { name: "Men's Slim Fit Denim Jeans", brand: "Levi's", price: 5999, category: 'mens-fashion' },
  { name: "Men's Polo T-Shirt", brand: "Diner's", price: 1999, category: 'mens-fashion' },
  { name: "Men's Embroidered Kurta Shalwar", brand: 'Junaid Jamshed', price: 4499, category: 'mens-fashion' },
  { name: "Men's Leather Jacket", brand: 'Bonanza', price: 8999, category: 'mens-fashion' },
  { name: "Men's Formal Blazer", brand: 'Amir Adnan', price: 12999, category: 'mens-fashion' },
  // Women's Fashion
  { name: "Women's Unstitched Lawn Suit", brand: 'Gul Ahmed', price: 3499, category: 'womens-fashion' },
  { name: "Women's Embroidered Abaya", brand: 'Sapphire', price: 6999, category: 'womens-fashion' },
  { name: "Women's Chiffon Party Dress", brand: 'Khaadi', price: 7999, category: 'womens-fashion' },
  { name: "Women's Leather Handbag", brand: 'Al-Karam', price: 3999, category: 'womens-fashion' },
  { name: "Women's Printed Kurti", brand: 'Bonanza Satrangi', price: 2299, category: 'womens-fashion' },
  { name: "Women's Embellished Saree", brand: 'Zainab Chottani', price: 9999, category: 'womens-fashion' },
  // Shoes
  { name: 'Nike Air Max 270', brand: 'Nike', price: 18999, category: 'shoes' },
  { name: 'Adidas Ultraboost 22', brand: 'Adidas', price: 21999, category: 'shoes' },
  { name: "Servis Men's Formal Loafers", brand: 'Servis', price: 4499, category: 'shoes' },
  { name: 'Bata Casual Sneakers', brand: 'Bata', price: 3999, category: 'shoes' },
  { name: "Women's Block Heel Sandals", brand: 'Stylo', price: 3499, category: 'shoes' },
  { name: 'Kids Sports Shoes', brand: 'Servis', price: 2999, category: 'shoes' },
  // Watches
  { name: 'Casio Digital Watch', brand: 'Casio', price: 5999, category: 'watches' },
  { name: 'Fossil Chronograph Watch', brand: 'Fossil', price: 24999, category: 'watches' },
  { name: 'Q&Q Analog Watch', brand: 'Q&Q', price: 3499, category: 'watches' },
  { name: 'Smart Watch Series 8', brand: 'Bazaar Tech', price: 12999, category: 'watches' },
  { name: "Women's Bracelet Watch", brand: 'Guess', price: 15999, category: 'watches' },
  // Beauty
  { name: "L'Oreal Paris Shampoo 650ml", brand: "L'Oreal", price: 1899, category: 'beauty' },
  { name: 'Ponds Bright Beauty Face Cream', brand: 'Ponds', price: 599, category: 'beauty' },
  { name: 'Sunsilk Conditioner 350ml', brand: 'Sunsilk', price: 799, category: 'beauty' },
  { name: 'Maybelline Matte Lipstick', brand: 'Maybelline', price: 1299, category: 'beauty' },
  { name: 'Nivea Body Lotion 400ml', brand: 'Nivea', price: 899, category: 'beauty' },
  // Home & Lifestyle
  { name: 'Dawlance 12 Cu Ft Refrigerator', brand: 'Dawlance', price: 89999, category: 'home-lifestyle' },
  { name: 'Haier Automatic Washing Machine', brand: 'Haier', price: 64999, category: 'home-lifestyle' },
  { name: 'Philips Air Fryer HD9200', brand: 'Philips', price: 24999, category: 'home-lifestyle' },
  { name: 'Nonstick Cookware Set 6pc', brand: 'Prestige', price: 8999, category: 'home-lifestyle' },
  { name: 'King Size Bed Sheet Set', brand: 'Bonita', price: 3499, category: 'home-lifestyle' },
  // Sports
  { name: 'MRF Cricket Bat', brand: 'MRF', price: 7999, category: 'sports' },
  { name: 'Football Size 5', brand: 'Nike', price: 2999, category: 'sports' },
  { name: 'Yoga Mat Premium', brand: 'Decathlon', price: 1999, category: 'sports' },
  { name: 'Adjustable Dumbbell Set 10kg', brand: 'PowerMax', price: 6999, category: 'sports' },
  { name: 'Badminton Racket Set', brand: 'Yonex', price: 4999, category: 'sports' },
  // Automotive
  { name: 'Universal Car Phone Holder', brand: 'AutoGear', price: 1299, category: 'automotive' },
  { name: 'Portable Car Vacuum Cleaner', brand: 'AutoGear', price: 3499, category: 'automotive' },
  { name: 'Car Seat Cover Set', brand: 'AutoStyle', price: 6999, category: 'automotive' },
  { name: 'Motorbike Full-Face Helmet', brand: 'Studds', price: 4999, category: 'automotive' },
  { name: 'Car Air Freshener Pack of 3', brand: 'Ambipur', price: 899, category: 'automotive' },
  // Groceries
  { name: 'Basmati Rice 5kg', brand: 'Guard', price: 2199, category: 'groceries' },
  { name: 'National Ghee 1kg', brand: 'National', price: 899, category: 'groceries' },
  { name: 'Lipton Yellow Label Tea 400g', brand: 'Lipton', price: 899, category: 'groceries' },
  { name: 'Olpers Milk 1L Pack of 6', brand: 'Olpers', price: 1499, category: 'groceries' },
  { name: 'Shan Masala Variety Pack', brand: 'Shan', price: 599, category: 'groceries' },
  // Accessories
  { name: 'Genuine Leather Wallet', brand: 'Charmza', price: 1999, category: 'accessories' },
  { name: 'UV Protection Sunglasses', brand: 'RayVision', price: 1499, category: 'accessories' },
  { name: 'Travel Backpack 30L', brand: 'Wildcraft', price: 4999, category: 'accessories' },
  { name: 'Power Bank 20000mAh', brand: 'Anker', price: 6999, category: 'accessories' },
  { name: 'Wireless Bluetooth Earbuds', brand: 'QCY', price: 3999, category: 'accessories' },
];

function slugify(name: string, suffix: number) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}-${suffix}`;
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
  return items[rand(0, items.length - 1)];
}

async function main() {
  console.log('Resetting catalog + user tables...');
  await prisma.productImage.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log('Creating users...');
  await prisma.user.create({
    data: { name: 'Bazaar Admin', email: 'admin@bazaar.test', passwordHash, role: Role.ADMIN, phone: '+923001112222' },
  });

  const sellers = [];
  for (const [i, s] of SELLERS.entries()) {
    const user = await prisma.user.create({
      data: {
        name: `${s.storeName} Owner`,
        email: s.email,
        passwordHash,
        role: Role.SELLER,
        phone: `+9230012${(30000 + i).toString().slice(-5)}`,
      },
    });
    const seller = await prisma.seller.create({
      data: {
        userId: user.id,
        storeName: s.storeName,
        slug: s.slug,
        description: `${s.storeName} — a trusted seller on BAZAAR.`,
      },
    });
    sellers.push(seller);
  }

  for (let i = 1; i <= 20; i++) {
    await prisma.user.create({
      data: {
        name: `Customer ${i}`,
        email: i === 1 ? 'customer@bazaar.test' : `customer${i}@bazaar.test`,
        passwordHash,
        role: Role.CUSTOMER,
        phone: `+9233${(10000000 + i).toString().slice(-8)}`,
      },
    });
  }

  console.log('Creating categories...');
  const categoryIdBySlug = new Map<string, string>();
  for (const cat of CATEGORY_TREE) {
    const parent = await prisma.category.create({ data: { name: cat.name, slug: cat.slug } });
    categoryIdBySlug.set(cat.slug, parent.id);
    for (const child of cat.children ?? []) {
      const created = await prisma.category.create({ data: { name: child.name, slug: child.slug, parentId: parent.id } });
      categoryIdBySlug.set(child.slug, created.id);
    }
  }

  console.log(`Creating ${PRODUCTS.length} products...`);
  let index = 0;
  for (const p of PRODUCTS) {
    index += 1;
    const slug = slugify(p.name, index);
    const categoryId = categoryIdBySlug.get(p.category);
    if (!categoryId) throw new Error(`Unknown category slug: ${p.category}`);

    const stock = index % 15 === 0 ? 0 : index % 8 === 0 ? rand(1, 4) : rand(20, 200);

    await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: `${p.name} by ${p.brand}. A top pick on BAZAAR, offering great value and quality for everyday use.`,
        price: p.price,
        discount: pick([0, 0, 5, 10, 15, 20, 25]),
        sku: `SKU-${p.category.slice(0, 3).toUpperCase()}-${index}`,
        brand: p.brand,
        freeShipping: rand(0, 9) > 1,
        rating: (rand(35, 50) / 10).toFixed(1),
        reviewCount: rand(0, 480),
        categoryId,
        sellerId: pick(sellers).id,
        images: {
          create: [0, 1, 2].map((i) => ({ url: `https://picsum.photos/seed/${slug}-${i}/600/600`, position: i })),
        },
        inventory: { create: { stockQuantity: stock, lowStockThreshold: 5 } },
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Demo accounts (password: ${DEMO_PASSWORD}):`);
  console.log('  admin@bazaar.test (ADMIN)');
  console.log('  seller@bazaar.test (SELLER — TechBazaar Store)');
  console.log('  customer@bazaar.test (CUSTOMER)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
