require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Brand đồ điện tử
const BRANDS = [
  { name: 'Apple', logo: 'https://logo.clearbit.com/apple.com' },
  { name: 'Samsung', logo: 'https://logo.clearbit.com/samsung.com' },
  { name: 'Sony', logo: 'https://logo.clearbit.com/sony.com' },
  { name: 'LG', logo: 'https://logo.clearbit.com/lg.com' },
  { name: 'Xiaomi', logo: 'https://logo.clearbit.com/mi.com' },
  { name: 'Dell', logo: 'https://logo.clearbit.com/dell.com' },
  { name: 'Asus', logo: 'https://logo.clearbit.com/asus.com' },
];

// Category tree: parent → children
const CATEGORY_TREE = [
  {
    name: 'Phones & Accessories',
    logo: null,
    children: [
      { name: 'Mobile Phones', logo: null },
      { name: 'Cases & Covers', logo: null },
      { name: 'Chargers & Cables', logo: null },
    ],
  },
  {
    name: 'Computers & Laptops',
    logo: null,
    children: [
      { name: 'Laptops', logo: null },
      { name: 'Desktops', logo: null },
      { name: 'PC Components', logo: null },
    ],
  },
  {
    name: 'Audio Devices',
    logo: null,
    children: [
      { name: 'Headphones', logo: null },
      { name: 'Speakers', logo: null },
    ],
  },
  {
    name: 'TV & Home Appliances',
    logo: null,
    children: [
      { name: 'Televisions', logo: null },
      { name: 'Air Conditioners', logo: null },
    ],
  },
];

async function seedBrands() {
  for (const brand of BRANDS) {
    const existing = await prisma.brand.findFirst({
      where: { name: brand.name, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      console.log(`Brand "${brand.name}" already exists, skipping.`);
      continue;
    }
    await prisma.brand.create({ data: brand });
    console.log(`Brand "${brand.name}" created.`);
  }
}

async function findOrCreateCategory(name, logo, parentCategoryId) {
  const existing = await prisma.category.findFirst({
    where: { name, parentCategoryId: parentCategoryId ?? null, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    console.log(`Category "${name}" already exists, skipping.`);
    return existing.id;
  }
  const created = await prisma.category.create({
    data: { name, logo: logo ?? null, parentCategoryId: parentCategoryId ?? null },
    select: { id: true },
  });
  console.log(
    `Category "${name}" created${parentCategoryId ? ` (parent=${parentCategoryId})` : ' (root)'}.`,
  );
  return created.id;
}

async function seedCategories() {
  for (const parent of CATEGORY_TREE) {
    const parentId = await findOrCreateCategory(parent.name, parent.logo, null);
    for (const child of parent.children) {
      await findOrCreateCategory(child.name, child.logo, parentId);
    }
  }
}

async function main() {
  console.log('Seeding electronics brands...');
  await seedBrands();

  console.log('\nSeeding electronics categories...');
  await seedCategories();

  const [brandCount, categoryCount] = await Promise.all([
    prisma.brand.count({ where: { deletedAt: null } }),
    prisma.category.count({ where: { deletedAt: null } }),
  ]);
  console.log(`\nDone. Total brands: ${brandCount}, categories: ${categoryCount}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
