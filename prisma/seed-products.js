require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Products map theo TÊN brand/category (không hardcode ID) → robust nếu DB reset.
 * Idempotent theo slug: đã tồn tại thì skip.
 * createdById lấy từ admin user (Product.createdById là required).
 */
const PRODUCTS = [
  {
    name: 'iPhone 15 Pro',
    slug: 'iphone-15-pro',
    basePrice: 999,
    virtualPrice: 1099,
    stock: 50,
    brand: 'Apple',
    categories: ['Mobile Phones'],
    images: [
      'https://example.com/products/iphone-15-pro-1.jpg',
      'https://example.com/products/iphone-15-pro-2.jpg',
    ],
    variants: [
      { sku: 'IP15P-128-NT', name: '128GB Natural Titanium', price: 999, stock: 20, isDefault: true, attributes: { storage: '128GB', color: 'Natural Titanium' } },
      { sku: 'IP15P-256-NT', name: '256GB Natural Titanium', price: 1099, stock: 15, attributes: { storage: '256GB', color: 'Natural Titanium' } },
      { sku: 'IP15P-256-BT', name: '256GB Blue Titanium', price: 1099, stock: 15, attributes: { storage: '256GB', color: 'Blue Titanium' } },
    ],
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    slug: 'samsung-galaxy-s24-ultra',
    basePrice: 1199,
    virtualPrice: 1299,
    stock: 40,
    brand: 'Samsung',
    categories: ['Mobile Phones'],
    images: ['https://example.com/products/galaxy-s24-ultra.jpg'],
    variants: [
      { sku: 'SGS24U-256-BK', name: '256GB Titanium Black', price: 1199, stock: 25, isDefault: true, attributes: { storage: '256GB', color: 'Titanium Black' } },
      { sku: 'SGS24U-512-GY', name: '512GB Titanium Gray', price: 1399, stock: 15, attributes: { storage: '512GB', color: 'Titanium Gray' } },
    ],
  },
  {
    name: 'MacBook Pro 14 M3',
    slug: 'macbook-pro-14-m3',
    basePrice: 1599,
    virtualPrice: 1799,
    stock: 30,
    brand: 'Apple',
    categories: ['Laptops'],
    images: ['https://example.com/products/macbook-pro-14.jpg'],
    variants: [
      { sku: 'MBP14-M3-512', name: 'M3 / 16GB / 512GB', price: 1599, stock: 18, isDefault: true, attributes: { chip: 'M3', ram: '16GB', ssd: '512GB' } },
      { sku: 'MBP14-M3-1TB', name: 'M3 / 16GB / 1TB', price: 1799, stock: 12, attributes: { chip: 'M3', ram: '16GB', ssd: '1TB' } },
    ],
  },
  {
    name: 'Dell XPS 15',
    slug: 'dell-xps-15',
    basePrice: 1499,
    virtualPrice: 1699,
    stock: 25,
    brand: 'Dell',
    categories: ['Laptops'],
    images: ['https://example.com/products/dell-xps-15.jpg'],
    variants: [
      { sku: 'XPS15-I7-512', name: 'i7 / 16GB / 512GB', price: 1499, stock: 15, isDefault: true, attributes: { cpu: 'i7', ram: '16GB', ssd: '512GB' } },
      { sku: 'XPS15-I9-1TB', name: 'i9 / 32GB / 1TB', price: 2099, stock: 10, attributes: { cpu: 'i9', ram: '32GB', ssd: '1TB' } },
    ],
  },
  {
    name: 'Sony WH-1000XM5',
    slug: 'sony-wh-1000xm5',
    basePrice: 349,
    virtualPrice: 399,
    stock: 80,
    brand: 'Sony',
    categories: ['Headphones'],
    images: ['https://example.com/products/sony-wh1000xm5.jpg'],
    variants: [
      { sku: 'WH1000XM5-BK', name: 'Black', price: 349, stock: 50, isDefault: true, attributes: { color: 'Black' } },
      { sku: 'WH1000XM5-SV', name: 'Silver', price: 349, stock: 30, attributes: { color: 'Silver' } },
    ],
  },
  {
    name: 'LG OLED C3 55"',
    slug: 'lg-oled-c3-55',
    basePrice: 1399,
    virtualPrice: 1599,
    stock: 20,
    brand: 'LG',
    categories: ['Televisions'],
    images: ['https://example.com/products/lg-oled-c3.jpg'],
    variants: [
      { sku: 'LGC3-55', name: '55 inch', price: 1399, stock: 12, isDefault: true, attributes: { size: '55"' } },
      { sku: 'LGC3-65', name: '65 inch', price: 1899, stock: 8, attributes: { size: '65"' } },
    ],
  },
  {
    name: 'Xiaomi Smart Speaker',
    slug: 'xiaomi-smart-speaker',
    basePrice: 59,
    virtualPrice: 79,
    stock: 100,
    brand: 'Xiaomi',
    categories: ['Speakers'],
    images: ['https://example.com/products/xiaomi-speaker.jpg'],
    variants: [
      { sku: 'XM-SPK-WH', name: 'White', price: 59, stock: 100, isDefault: true, attributes: { color: 'White' } },
    ],
  },
];

async function main() {
  // 1. Lấy createdById từ admin (fallback user bất kỳ)
  const creator =
    (await prisma.user.findFirst({
      where: { role: { name: 'ADMIN' }, deletedAt: null },
      select: { id: true },
    })) ||
    (await prisma.user.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    }));

  if (!creator) {
    throw new Error('No user found to set as createdById. Seed a user first.');
  }
  console.log('Using createdById:', creator.id);

  // 2. Build map tên → id cho brand + category
  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const brandMap = new Map(brands.map((b) => [b.name, b.id]));
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  // 3. Seed products
  for (const p of PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { slug: p.slug },
      select: { id: true },
    });
    if (existing) {
      console.log(`Product "${p.name}" (slug=${p.slug}) already exists, skipping.`);
      continue;
    }

    const brandId = brandMap.get(p.brand);
    if (!brandId) {
      console.warn(`  ! Brand "${p.brand}" not found, skipping product "${p.name}".`);
      continue;
    }

    const categoryIds = p.categories
      .map((name) => categoryMap.get(name))
      .filter((id) => id !== undefined);

    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        basePrice: p.basePrice,
        virtualPrice: p.virtualPrice,
        stock: p.stock,
        isActive: true,
        publishedAt: new Date(),
        images: p.images,
        brand: { connect: { id: brandId } },
        createdBy: { connect: { id: creator.id } },
        categories: categoryIds.length
          ? { connect: categoryIds.map((id) => ({ id })) }
          : undefined,
        variants: {
          create: p.variants.map((v) => ({
            sku: v.sku,
            name: v.name ?? null,
            price: v.price,
            stock: v.stock,
            isDefault: v.isDefault ?? false,
            isActive: true,
            attributes: v.attributes ?? undefined,
          })),
        },
      },
    });
    console.log(
      `Product "${p.name}" created (brand=${p.brand}, ${p.variants.length} variants, ${categoryIds.length} categories).`,
    );
  }

  const total = await prisma.product.count({ where: { deletedAt: null } });
  const variantTotal = await prisma.productVariant.count({
    where: { deletedAt: null },
  });
  console.log(`\nDone. Total products: ${total}, variants: ${variantTotal}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
